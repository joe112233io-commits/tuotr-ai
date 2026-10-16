import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Strict SSRF Guard for Custom Base URLs
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

  // AI Streaming Generation Proxy (SSE) with thought/reasoning & text support
  app.post("/api/ai/generate-stream", async (req, res) => {
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

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");

    const sendEvent = (event: { type: "thought" | "text" | "done" | "error"; text?: string; error?: string }) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    const tempVal = typeof temperature === "number" ? Math.max(0, Math.min(2, temperature)) : 0.2;

    // 1. Custom Provider Stream
    if (customBaseUrl) {
      const urlCheck = validateCustomUrl(String(customBaseUrl).trim());
      if (!urlCheck.ok) {
        sendEvent({ type: "error", error: `SSRF Policy Violation: ${urlCheck.reason}` });
        res.end();
        return;
      }

      try {
        let cleanBase = String(customBaseUrl).trim().replace(/\/+$/, "");
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
              stream: true,
            }),
          });

          if (!resp.ok) {
            const rawErr = await resp.text();
            sendEvent({ type: "error", error: `Anthropic HTTP ${resp.status}: ${rawErr.slice(0, 150)}` });
            res.end();
            return;
          }

          if (resp.body) {
            const reader = resp.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith("data: ")) {
                  const dataStr = trimmed.slice(6);
                  if (dataStr === "[DONE]") continue;
                  try {
                    const parsed = JSON.parse(dataStr);
                    if (parsed.type === "content_block_delta") {
                      if (parsed.delta?.type === "thinking_delta" && parsed.delta?.thinking) {
                        sendEvent({ type: "thought", text: parsed.delta.thinking });
                      } else if (parsed.delta?.text) {
                        sendEvent({ type: "text", text: parsed.delta.text });
                      }
                    }
                  } catch (e) {}
                }
              }
            }
          }
          sendEvent({ type: "done" });
          res.end();
          return;
        } else {
          // OpenAI / DeepSeek / Groq / OpenRouter
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
              stream: true,
            }),
          });

          if (!resp.ok) {
            const rawErr = await resp.text();
            sendEvent({ type: "error", error: `Provider HTTP ${resp.status}: ${rawErr.slice(0, 150)}` });
            res.end();
            return;
          }

          if (resp.body) {
            const reader = resp.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith("data: ")) {
                  const dataStr = trimmed.slice(6);
                  if (dataStr === "[DONE]") continue;
                  try {
                    const parsed = JSON.parse(dataStr);
                    const delta = parsed.choices?.[0]?.delta;
                    if (delta) {
                      const reasoning = delta.reasoning_content || delta.reasoning || delta.thought;
                      if (reasoning) {
                        sendEvent({ type: "thought", text: reasoning });
                      }
                      if (delta.content) {
                        sendEvent({ type: "text", text: delta.content });
                      }
                    }
                  } catch (e) {}
                }
              }
            }
          }
          sendEvent({ type: "done" });
          res.end();
          return;
        }
      } catch (err: any) {
        sendEvent({ type: "error", error: err.message || String(err) });
        res.end();
        return;
      }
    }

    // 2. Server-side Gemini Streaming
    if (process.env.GEMINI_API_KEY) {
      try {
        if (!aiClient) {
          aiClient = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY,
            httpOptions: { headers: { "User-Agent": "aistudio-build" } },
          });
        }

        const candidateModels = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-3.8-flash"];
        let lastErr = "";

        for (const candidate of candidateModels) {
          try {
            const stream = await aiClient.models.generateContentStream({
              model: candidate,
              contents: instruction,
              config: { temperature: tempVal },
            });

            for await (const chunk of stream) {
              const parts = chunk.candidates?.[0]?.content?.parts;
              if (parts && parts.length > 0) {
                for (const p of parts) {
                  if ((p as any).thought || (p as any).reasoning) {
                    sendEvent({ type: "thought", text: (p as any).thought || (p as any).reasoning });
                  }
                  if (p.text) {
                    sendEvent({ type: "text", text: p.text });
                  }
                }
              } else if (chunk.text) {
                sendEvent({ type: "text", text: chunk.text });
              }
            }
            sendEvent({ type: "done" });
            res.end();
            return;
          } catch (mErr: any) {
            lastErr = mErr.message || String(mErr);
          }
        }
        sendEvent({ type: "error", error: `Gemini failed: ${lastErr}` });
        res.end();
        return;
      } catch (gErr: any) {
        sendEvent({ type: "error", error: gErr.message || String(gErr) });
        res.end();
        return;
      }
    }

    sendEvent({ type: "error", error: "No AI provider configured." });
    res.end();
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
