import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Strict Allowlist and SSRF Guard
function validateCustomUrl(rawUrl: string): { ok: boolean; reason?: string } {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:") {
      return { ok: false, reason: "Insecure protocol. Only https:// endpoints are permitted." };
    }

    const host = parsed.hostname.toLowerCase();

    // Block private, link-local, loopback, and metadata ranges
    if (
      host === "localhost" ||
      host.endsWith(".localhost") ||
      host === "127.0.0.1" ||
      host.startsWith("127.") ||
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      host.startsWith("169.254.") ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host) ||
      host.endsWith(".internal") ||
      host.endsWith(".local")
    ) {
      return { ok: false, reason: `Access to private or local network host (${host}) is strictly prohibited.` };
    }

    // Whitelist approved AI endpoints
    const ALLOWED_DOMAINS = [
      "openrouter.ai",
      "api.opencode.ai",
      "api.groq.com",
      "api.deepseek.com",
      "generativelanguage.googleapis.com",
      "api.openai.com",
      "api.anthropic.com",
      "api.together.xyz",
      "api.mistral.ai",
    ];

    const isWhitelisted = ALLOWED_DOMAINS.some(
      (d) => host === d || host.endsWith(`.${d}`)
    );

    if (!isWhitelisted) {
      return { ok: false, reason: `Target host "${host}" is not on the verified provider allowlist.` };
    }

    return { ok: true };
  } catch (e: any) {
    return { ok: false, reason: "Malformed URL format." };
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "10mb" }));

  // Initialize Gemini client according to gemini-api skill standards
  let aiClient: GoogleGenAI | null = null;
  if (process.env.GEMINI_API_KEY) {
    try {
      aiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    } catch (e: any) {
      console.warn("[Server] Gemini client initialization error:", e.message);
    }
  }

  // Healthcheck endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });

  // AI Generation proxy endpoint with strict error propagation & SSRF guards
  app.post("/api/ai/generate", async (req, res) => {
    const {
      instruction,
      model,
      customApiKey,
      customBaseUrl,
      providerType,
      stopSequences,
      temperature,
    } = req.body;

    if (!instruction || typeof instruction !== "string") {
      res.status(400).json({ error: "Instruction string is required" });
      return;
    }

    const tempVal = typeof temperature === "number" ? Math.max(0, Math.min(2, temperature)) : 0.2;

    // 1. If custom provider base URL is specified by user
    if (customBaseUrl) {
      const urlCheck = validateCustomUrl(String(customBaseUrl).trim());
      if (!urlCheck.ok) {
        res.status(403).json({ error: `SSRF Policy Violation: ${urlCheck.reason}` });
        return;
      }

      try {
        let cleanBase = String(customBaseUrl).trim().replace(/\/+$/, "");

        // Auto-fix if user appended '/chat/completions' or '/messages' to Base URL
        cleanBase = cleanBase.replace(/\/chat\/completions$/, "").replace(/\/messages$/, "");

        if (providerType === "anthropic") {
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true",
          };
          if (customApiKey) headers["x-api-key"] = customApiKey;

          const resp = await fetch(`${cleanBase}/messages`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              model: model || "claude-3-5-sonnet-20241022",
              max_tokens: 4000,
              temperature: tempVal,
              messages: [{ role: "user", content: instruction }],
              stop_sequences: stopSequences || undefined,
            }),
          });

          const rawText = await resp.text();
          let data: any = {};
          try {
            data = JSON.parse(rawText);
          } catch (pErr) {
            res.status(resp.status || 502).json({
              error: `Provider returned non-JSON response (HTTP ${resp.status}). Ensure your Base URL is correct: ${rawText.slice(0, 100)}`
            });
            return;
          }

          if (!resp.ok) {
            res.status(resp.status || 502).json({ error: data.error?.message || `Anthropic HTTP ${resp.status}` });
            return;
          }
          const text = data?.content?.[0]?.text || "";
          res.json({ text });
          return;
        } else {
          // OpenAI compatible (OpenRouter, OpenCode, Groq, DeepSeek, OpenAI)
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
            "HTTP-Referer": "https://tutorai.me",
            "X-Title": "TutorAI",
          };
          if (customApiKey) headers["Authorization"] = `Bearer ${customApiKey}`;

          const resp = await fetch(`${cleanBase}/chat/completions`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              model: model || "gpt-4o-mini",
              temperature: tempVal,
              messages: [{ role: "user", content: instruction }],
              stop: stopSequences || undefined,
            }),
          });

          const rawText = await resp.text();
          let data: any = {};
          try {
            data = JSON.parse(rawText);
          } catch (pErr) {
            res.status(resp.status || 502).json({
              error: `Provider returned non-JSON response (HTTP ${resp.status}). Ensure Base URL ends at /v1 without appending /chat/completions: ${rawText.slice(0, 100)}`
            });
            return;
          }

          if (!resp.ok) {
            res.status(resp.status || 502).json({ error: data.error?.message || data.message || `Provider HTTP ${resp.status}` });
            return;
          }
          const text = data?.choices?.[0]?.message?.content || "";
          res.json({ text });
          return;
        }
      } catch (err: any) {
        console.error("[Server] Custom provider error:", err.message);
        res.status(502).json({ error: `Provider request failed: ${err.message}` });
        return;
      }
    }

    // 2. Server-side Gemini generation
    if (process.env.GEMINI_API_KEY) {
      try {
        if (!aiClient) {
          aiClient = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY,
            httpOptions: {
              headers: { "User-Agent": "aistudio-build" },
            },
          });
        }

        // Try standard Gemini models in order of stability
        const candidateModels = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-3.8-flash"];
        let lastGeminiErr = "";

        for (const candidate of candidateModels) {
          try {
            const response = await aiClient.models.generateContent({
              model: candidate,
              contents: instruction,
              config: {
                temperature: tempVal,
              },
            });
            const text = response.text || "";
            if (text) {
              res.json({ text });
              return;
            }
          } catch (mErr: any) {
            lastGeminiErr = mErr.message || String(mErr);
            // If model not found or rate limit, try next candidate
          }
        }

        res.status(502).json({ error: `Gemini generation failed: ${lastGeminiErr}` });
        return;
      } catch (geminiErr: any) {
        console.error("[Server] Gemini error:", geminiErr.message);
        res.status(502).json({ error: `Gemini service error: ${geminiErr.message}` });
        return;
      }
    }

    // 3. No provider available
    res.status(500).json({
      error: "No AI provider configured. Please provide a valid API key or configure an active provider in Settings.",
    });
  });

  // Endpoint to fetch available models from custom AI provider
  app.post("/api/ai/models", async (req, res) => {
    const { customBaseUrl, customApiKey, providerType } = req.body;

    if (!customBaseUrl) {
      res.status(400).json({ error: "Base URL is required to fetch models." });
      return;
    }

    const urlCheck = validateCustomUrl(String(customBaseUrl).trim());
    if (!urlCheck.ok) {
      res.status(403).json({ error: `SSRF Policy Violation: ${urlCheck.reason}` });
      return;
    }

    try {
      let cleanBase = String(customBaseUrl).trim().replace(/\/+$/, "");
      cleanBase = cleanBase.replace(/\/chat\/completions$/, "").replace(/\/messages$/, "");

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "HTTP-Referer": "https://tutorai.me",
        "X-Title": "TutorAI",
      };

      if (providerType === "anthropic") {
        res.json({
          models: [
            "claude-3-5-sonnet-20241022",
            "claude-3-5-haiku-20241022",
            "claude-3-opus-20240229",
          ],
        });
        return;
      }

      if (customApiKey) {
        headers["Authorization"] = `Bearer ${customApiKey}`;
      }

      const resp = await fetch(`${cleanBase}/models`, {
        method: "GET",
        headers,
      });

      const rawText = await resp.text();
      let data: any = {};
      try {
        data = JSON.parse(rawText);
      } catch (e) {
        res.status(502).json({
          error: `Provider returned non-JSON response from /models (HTTP ${resp.status}): ${rawText.slice(0, 100)}`,
        });
        return;
      }

      if (!resp.ok) {
        res.status(resp.status || 502).json({
          error: data.error?.message || data.message || `Provider /models HTTP ${resp.status}`,
        });
        return;
      }

      let models: string[] = [];
      if (Array.isArray(data.data)) {
        models = data.data.map((m: any) => m.id || m.name || String(m)).filter(Boolean);
      } else if (Array.isArray(data.models)) {
        models = data.models.map((m: any) => m.id || m.name || String(m)).filter(Boolean);
      } else if (Array.isArray(data)) {
        models = data.map((m: any) => m.id || m.name || String(m)).filter(Boolean);
      }

      // Sort free models first if present, then alphabetical
      models.sort((a, b) => {
        const aFree = a.includes(":free") || a.includes("free");
        const bFree = b.includes(":free") || b.includes("free");
        if (aFree && !bFree) return -1;
        if (!aFree && bFree) return 1;
        return a.localeCompare(b);
      });

      res.json({ models });
    } catch (err: any) {
      console.error("[Server] Fetch models error:", err.message);
      res.status(502).json({ error: `Failed to fetch models: ${err.message}` });
    }
  });

  // Vite middleware in development
  const isProd = process.env.NODE_ENV === "production";
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(__dirname, "dist/index.html"));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[TutorAI] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
