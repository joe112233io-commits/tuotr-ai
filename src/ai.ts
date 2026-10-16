import { Store } from "./store";
import { AISettings, CourseOutline, Course } from "./types";
import { GoogleGenAI } from "@google/genai";
import {
  setTransport,
  designOutline,
  writeLesson,
  buildQuiz,
  buildCards,
  renderLesson,
  getBrain,
  rehydrate,
  CourseBrain,
  LessonDoc,
  Term,
  QuizItem,
  Card,
  HarnessError,
  cleanJson,
  buildConceptGraph,
  updateMasterSummary,
} from "./harness";

export interface PresetProvider {
  name: string;
  nameAr: string;
  type: "openai" | "anthropic";
  category: "free" | "cloud" | "coding" | "local";
  tag: string;
  tagAr: string;
  badge?: string;
  badgeAr?: string;
  desc: string;
  descAr: string;
  baseUrl: string;
  keyRequired: boolean;
  keyUrl?: string;
  keyHint?: string;
  keyHintAr?: string;
  models: string[];
}

const PRESETS: Record<string, PresetProvider> = {
  openrouter: {
    name: "OpenRouter",
    nameAr: "أوبن راوتر (OpenRouter)",
    type: "openai",
    category: "free",
    tag: "Free & Pro Models",
    tagAr: "نماذج مجانية واحترافية",
    badge: "Recommended",
    badgeAr: "موصى به",
    desc: "Unified gateway to 100+ models. Includes powerful 100% free models like DeepSeek R1, Llama 3.3, and Qwen 2.5.",
    descAr: "بوابة موحدة لأكثر من 100 نموذج ذكاء اصطناعي. تتضمن نماذج مجانية خارقة الذكاء مثل DeepSeek R1 و Llama 3.3 بدون رصيد.",
    baseUrl: "https://openrouter.ai/api/v1",
    keyRequired: true,
    keyUrl: "https://openrouter.ai/keys",
    keyHint: "Free API keys available at openrouter.ai/keys (Free tier models require $0 balance)",
    keyHintAr: "احصل على مفتاح مجاني من openrouter.ai/keys (النماذج المتبوعة بـ :free مجانية تماماً)",
    models: [
      "deepseek/deepseek-r1:free",
      "meta-llama/llama-3.3-70b-instruct:free",
      "deepseek/deepseek-chat:free",
      "qwen/qwen-2.5-72b-instruct:free",
      "openai/gpt-4o-mini",
      "anthropic/claude-3.5-haiku",
    ],
  },
  opencode: {
    name: "OpenCode AI",
    nameAr: "أوبن كود (OpenCode)",
    type: "openai",
    category: "coding",
    tag: "Open Source & Code",
    tagAr: "برمجة ونماذج مفتوحة",
    badge: "Coding Specialist",
    badgeAr: "متخصص برمجة",
    desc: "Specialized open-source code & logic models (DeepSeek Coder, Qwen Coder, StarCoder) for deep technical courses.",
    descAr: "مزود متخصص في هندسة البرمجيات والأكواد والخوارزميات (DeepSeek Coder, Qwen Coder, StarCoder) للدورات التقنية.",
    baseUrl: "https://api.opencode.ai/v1",
    keyRequired: false,
    keyUrl: "https://opencode.ai",
    keyHint: "Compatible with OpenCode endpoints or HuggingFace Code Inference",
    keyHintAr: "متوافق مع واجهات OpenCode وخوادم استدلال الأكواد المفتوحة",
    models: [
      "deepseek-ai/DeepSeek-Coder-V2-Instruct",
      "Qwen/Qwen2.5-Coder-32B-Instruct",
      "bigcode/starcoder2-15b",
    ],
  },
  groq: {
    name: "Groq Cloud (LPU)",
    nameAr: "جروك كلاود (Groq LPU)",
    type: "openai",
    category: "free",
    tag: "Ultra Fast · Free Tier",
    tagAr: "سرعة فائقة · رصيد مجاني",
    badge: "500+ Tokens/sec",
    badgeAr: "سرعة البرق",
    desc: "The world's fastest inference platform powered by LPU chips. Generous free tier with instantaneous response times.",
    descAr: "أسرع منصة استدلال ذكاء اصطناعي في العالم عبر رقائق LPU. تتضمن طبقة مجانية سخية واستجابة فورية.",
    baseUrl: "https://api.groq.com/openai/v1",
    keyRequired: true,
    keyUrl: "https://console.groq.com/keys",
    keyHint: "Get a free instant key at console.groq.com/keys",
    keyHintAr: "احصل على مفتاح مجاني سريع من console.groq.com/keys",
    models: [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "gemma2-9b-it",
    ],
  },
  deepseek: {
    name: "DeepSeek Official",
    nameAr: "ديب سيك الرسمي (DeepSeek)",
    type: "openai",
    category: "cloud",
    tag: "Deep Reasoning & V3",
    tagAr: "تفكير عميق وأداء رائد",
    badge: "DeepSeek R1 & V3",
    badgeAr: "نماذج R1 و V3",
    desc: "Official API for DeepSeek V3 and DeepSeek R1 reasoning models with unmatched logic at accessible pricing.",
    descAr: "الواجهة الرسمية لنماذج DeepSeek V3 ونموذج التفكير R1 المشهود له بالتفوق المنطقي والأكاديمي.",
    baseUrl: "https://api.deepseek.com/v1",
    keyRequired: true,
    keyUrl: "https://platform.deepseek.com",
    keyHint: "Generate key at platform.deepseek.com",
    keyHintAr: "أنشئ مفتاحك من platform.deepseek.com",
    models: [
      "deepseek-chat",
      "deepseek-reasoner",
    ],
  },
  gemini: {
    name: "Google Gemini",
    nameAr: "جوجل جيميني (Gemini)",
    type: "openai",
    category: "cloud",
    tag: "Google Official",
    tagAr: "واجهة جوجل الرسمية",
    desc: "Direct Google AI Studio API with multimodal intelligence and huge context windows.",
    descAr: "الواجهة الرسمية لنماذج جيميني من جوجل مع سرعة استجابة وسياق واسع للتعلم.",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    keyRequired: true,
    keyUrl: "https://aistudio.google.com/app/apikey",
    keyHint: "Free tier keys available at aistudio.google.com",
    keyHintAr: "مفاتيح مجانية متاحة عبر aistudio.google.com",
    models: [
      "gemini-2.5-flash",
      "gemini-2.5-pro",
      "gemini-2.0-flash",
      "gemini-1.5-flash",
    ],
  },
  openai: {
    name: "OpenAI",
    nameAr: "أوبن إيه آي (OpenAI)",
    type: "openai",
    category: "cloud",
    tag: "ChatGPT Models",
    tagAr: "نماذج ChatGPT القياسية",
    desc: "Official OpenAI GPT-4o, GPT-4o-mini, and o3-mini models.",
    descAr: "نماذج OpenAI الرسمية بما فيها GPT-4o و GPT-4o-mini و o3-mini.",
    baseUrl: "https://api.openai.com/v1",
    keyRequired: true,
    keyUrl: "https://platform.openai.com/api-keys",
    keyHint: "Manage keys at platform.openai.com/api-keys",
    keyHintAr: "إدارة المفاتيح عبر platform.openai.com/api-keys",
    models: [
      "gpt-4o-mini",
      "gpt-4o",
      "o3-mini",
    ],
  },
  anthropic: {
    name: "Anthropic Claude",
    nameAr: "كلود (Anthropic)",
    type: "anthropic",
    category: "cloud",
    tag: "Nuanced Writing",
    tagAr: "كتابة أكاديمية متقدمة",
    desc: "Claude 3.5 Sonnet & Haiku models known for articulate academic prose and exceptional coding.",
    descAr: "نماذج كلود المتميزة في السرد الأكاديمي والتحليل العلمي والبرمجة الدقيقة.",
    baseUrl: "https://api.anthropic.com/v1",
    keyRequired: true,
    keyUrl: "https://console.anthropic.com/settings/keys",
    keyHint: "Keys from console.anthropic.com",
    keyHintAr: "احصل على المفتاح من console.anthropic.com",
    models: [
      "claude-3-5-sonnet-20241022",
      "claude-3-5-haiku-20241022",
    ],
  },
  ollama: {
    name: "Ollama (Local Offline)",
    nameAr: "أولاما المحلي (Ollama)",
    type: "openai",
    category: "local",
    tag: "100% Private & Local",
    tagAr: "محلي وخاص 100%",
    desc: "Run open models entirely on your own device with zero internet transmission.",
    descAr: "تشغيل النماذج بالكامل على جهازك الشخصي دون الحاجة لإنترنت وبخصوصية مطلقة.",
    baseUrl: "http://localhost:11434/v1",
    keyRequired: false,
    keyHint: "No API key needed. Requires Ollama running locally (`ollama serve`).",
    keyHintAr: "لا حاجة لمفتاح. تأكد من تشغيل Ollama محلياً على حاسوبك (`ollama serve`).",
    models: [
      "llama3.1",
      "qwen2.5",
      "deepseek-r1",
      "mistral",
    ],
  },
  custom: {
    name: "Custom (OpenAI-compatible)",
    nameAr: "مزود مخصص (OpenAI-Compatible)",
    type: "openai",
    category: "cloud",
    tag: "Any Endpoint",
    tagAr: "أي رابط مخصص",
    desc: "Connect any custom OpenAI-compatible server, vLLM, LM Studio, or local proxy.",
    descAr: "ربط أي خادم أو خادم محلي متوافق مع بروتوكول OpenAI مثل vLLM أو LM Studio.",
    baseUrl: "",
    keyRequired: false,
    models: [],
  },
};

export const AIProvider = {
  presets: PRESETS,
  settings: {
    enabled: false,
    preset: "openrouter",
    baseUrl: PRESETS.openrouter.baseUrl,
    apiKey: "",
    model: "deepseek/deepseek-r1:free",
    temperature: 0.2,
    mindmap: true,
  } as AISettings,

  async load() {
    let s: AISettings | null = null;
    try {
      if (Store.isLoggedIn()) s = await Store.getSettings();
      if (!s) s = JSON.parse(localStorage.getItem("taiv1.ai-settings") || "null");
    } catch (e) {}
    if (s && typeof s === "object") this.settings = Object.assign({}, this.settings, s);
    return this.settings;
  },

  async save(patch: Partial<AISettings>) {
    this.settings = Object.assign({}, this.settings, patch);
    try {
      localStorage.setItem("taiv1.ai-settings", JSON.stringify(this.settings));
    } catch (e) {}
    try {
      if (Store.isLoggedIn()) await Store.saveSettings(this.settings);
    } catch (e) {}
    return this.settings;
  },

  activeName(lang: string = "en") {
    const s = this.settings;
    if (!s.enabled || !s.baseUrl) return null;
    const p = PRESETS[s.preset];
    const name = p ? (lang === "ar" ? p.nameAr : p.name) : "Custom";
    return name + " · " + (s.model || "?");
  },

  isCustom() {
    const s = this.settings;
    return !!(s.enabled && s.baseUrl && s.model);
  },

  presetType() {
    const p = PRESETS[this.settings.preset];
    return p ? p.type : "openai";
  },

  /**
   * Primary network invocation layer.
   * Throws strictly on failure. Never swallows errors or returns empty strings.
   */
  async generate(opts: {
    instruction: string;
    onChunk?: (chunk: string) => void;
    stopSequences?: string[];
    temperature?: number;
  }): Promise<string> {
    const { instruction, onChunk, stopSequences, temperature } = opts;
    const s = this.settings;

    const safeFetchJson = async (resp: Response): Promise<any> => {
      const contentType = resp.headers.get("content-type") || "";
      const rawText = await resp.text();
      if (contentType.includes("text/html") || rawText.trim().startsWith("<!") || rawText.includes("<html")) {
        throw new Error("HTML_PROXY_UNAVAILABLE");
      }
      try {
        return JSON.parse(rawText);
      } catch (err) {
        throw new Error(`Invalid JSON response (HTTP ${resp.status}): ${rawText.slice(0, 100)}`);
      }
    };

    const directFetch = async (): Promise<string> => {
      if (!s.baseUrl) throw new Error("Base URL is required for custom provider.");
      let cleanBase = String(s.baseUrl).trim().replace(/\/+$/, "");
      cleanBase = cleanBase.replace(/\/chat\/completions$/, "").replace(/\/messages$/, "");

      const isAnthropic = this.presetType() === "anthropic";
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "HTTP-Referer": "https://tutorai.me",
        "X-Title": "TutorAI",
      };
      if (s.apiKey) {
        if (isAnthropic) {
          headers["x-api-key"] = s.apiKey;
          headers["anthropic-version"] = "2023-06-01";
          headers["anthropic-dangerous-direct-browser-access"] = "true";
        } else {
          headers["Authorization"] = `Bearer ${s.apiKey}`;
        }
      }

      const endpoint = isAnthropic ? `${cleanBase}/messages` : `${cleanBase}/chat/completions`;
      const bodyPayload = isAnthropic
        ? {
            model: s.model || "claude-3-5-sonnet-20241022",
            max_tokens: 4000,
            temperature: typeof temperature === "number" ? temperature : s.temperature ?? 0.2,
            messages: [{ role: "user", content: instruction }],
            stop_sequences: stopSequences || undefined,
          }
        : {
            model: s.model || "gpt-4o-mini",
            temperature: typeof temperature === "number" ? temperature : s.temperature ?? 0.2,
            messages: [{ role: "user", content: instruction }],
            stop: stopSequences || undefined,
          };

      const resp = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(bodyPayload),
      });

      const contentType = resp.headers.get("content-type") || "";
      if (contentType.includes("text/html")) {
        throw new Error(`Base URL "${s.baseUrl}" returned an HTML page instead of API JSON. Please verify your Base URL in Settings (e.g. https://openrouter.ai/api/v1).`);
      }

      const data = await safeFetchJson(resp);
      if (!resp.ok) {
        throw new Error(data.error?.message || data.message || `Provider HTTP ${resp.status}`);
      }

      const text = isAnthropic ? data?.content?.[0]?.text : data?.choices?.[0]?.message?.content;
      if (typeof text !== "string" || !text.trim()) {
        throw new Error("Custom provider returned empty content.");
      }
      return text;
    };

    const directGeminiFetch = async (): Promise<string> => {
      const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY || "";
      if (!apiKey) {
        throw new Error("Backend AI proxy is unavailable on static deployments. Please configure an AI Provider Base URL and API Key in Settings (⚙️ الإعدادات).");
      }
      const ai = new GoogleGenAI({ apiKey });
      const candidateModels = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-3.8-flash"];
      let lastErr = "";
      for (const m of candidateModels) {
        try {
          const resp = await ai.models.generateContent({
            model: m,
            contents: instruction,
            config: { temperature: typeof temperature === "number" ? temperature : s.temperature ?? 0.2 },
          });
          const resText = resp.text || "";
          if (resText.trim()) return resText;
        } catch (e: any) {
          lastErr = e.message || String(e);
        }
      }
      throw new Error(`Gemini Client Error: ${lastErr}`);
    };

    let text = "";
    try {
      const resp = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction,
          model: s.enabled ? s.model : undefined,
          customApiKey: s.enabled ? s.apiKey : undefined,
          customBaseUrl: s.enabled ? s.baseUrl : undefined,
          providerType: s.enabled ? this.presetType() : undefined,
          stopSequences,
          temperature: typeof temperature === "number" ? temperature : s.temperature ?? 0.2,
        }),
      });

      const contentType = resp.headers.get("content-type") || "";
      if (contentType.includes("text/html")) {
        if (s.enabled && s.baseUrl) {
          text = await directFetch();
        } else {
          text = await directGeminiFetch();
        }
      } else if (!resp.ok) {
        const data = await safeFetchJson(resp).catch(() => ({}));
        if (s.enabled && s.baseUrl) {
          text = await directFetch();
        } else {
          const msg = data.error || `HTTP ${resp.status} - AI Generation Error`;
          throw new Error(msg);
        }
      } else {
        const data = await safeFetchJson(resp);
        text = data?.text;
      }
    } catch (err: any) {
      if (s.enabled && s.baseUrl) {
        text = await directFetch();
      } else {
        try {
          text = await directGeminiFetch();
        } catch (gErr) {
          throw err;
        }
      }
    }

    if (typeof text !== "string" || !text.trim()) {
      throw new Error("AI provider returned empty content. Verify provider quota, model availability, or prompt syntax.");
    }

    // Smooth UI rendering for verified payload
    if (onChunk) {
      const step = Math.max(1, Math.floor(text.length / 30));
      for (let i = 0; i < text.length; i += step) {
        onChunk(text.slice(i, i + step));
        await new Promise((r) => setTimeout(r, 10));
      }
    }

    return text;
  },

  async generateStream(opts: {
    instruction: string;
    temperature?: number;
    stopSequences?: string[];
    onChunk?: (chunk: string) => void;
    onThought?: (thought: string) => void;
  }): Promise<string> {
    const s = this.settings;

    const directStreamFetch = async (): Promise<string> => {
      if (!s.baseUrl) throw new Error("Base URL is required for custom provider.");
      let cleanBase = String(s.baseUrl).trim().replace(/\/+$/, "");
      cleanBase = cleanBase.replace(/\/chat\/completions$/, "").replace(/\/messages$/, "");

      const isAnthropic = this.presetType() === "anthropic";
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "HTTP-Referer": "https://tutorai.me",
        "X-Title": "TutorAI",
      };
      if (s.apiKey) {
        if (isAnthropic) {
          headers["x-api-key"] = s.apiKey;
          headers["anthropic-version"] = "2023-06-01";
          headers["anthropic-dangerous-direct-browser-access"] = "true";
        } else {
          headers["Authorization"] = `Bearer ${s.apiKey}`;
        }
      }

      const endpoint = isAnthropic ? `${cleanBase}/messages` : `${cleanBase}/chat/completions`;
      const tempVal = typeof opts.temperature === "number" ? opts.temperature : s.temperature ?? 0.2;
      const bodyPayload = isAnthropic
        ? {
            model: s.model || "claude-3-5-sonnet-20241022",
            max_tokens: 4000,
            temperature: tempVal,
            messages: [{ role: "user", content: opts.instruction }],
            stop_sequences: opts.stopSequences || undefined,
            stream: true,
          }
        : {
            model: s.model || "gpt-4o-mini",
            temperature: tempVal,
            messages: [{ role: "user", content: opts.instruction }],
            stop: opts.stopSequences || undefined,
            stream: true,
          };

      const resp = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(bodyPayload),
      });

      const contentType = resp.headers.get("content-type") || "";
      if (contentType.includes("text/html")) {
        throw new Error(`Base URL "${s.baseUrl}" returned an HTML page instead of API stream. Check Base URL in Settings.`);
      }

      if (!resp.ok) {
        const rawErr = await resp.text();
        let errMsg = `HTTP ${resp.status}`;
        try {
          const errJson = JSON.parse(rawErr);
          errMsg = errJson.error?.message || errJson.message || errMsg;
        } catch (e) {}
        throw new Error(`Provider Stream Error: ${errMsg}`);
      }

      let fullStreamText = "";
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
                if (isAnthropic) {
                  if (parsed.type === "content_block_delta") {
                    if (parsed.delta?.type === "thinking_delta" && parsed.delta?.thinking) {
                      opts.onThought?.(parsed.delta.thinking);
                    } else if (parsed.delta?.text) {
                      fullStreamText += parsed.delta.text;
                      opts.onChunk?.(parsed.delta.text);
                    }
                  }
                } else {
                  const delta = parsed.choices?.[0]?.delta;
                  if (delta) {
                    const reasoning = delta.reasoning_content || delta.reasoning || delta.thought;
                    if (reasoning) {
                      opts.onThought?.(reasoning);
                    }
                    if (delta.content) {
                      fullStreamText += delta.content;
                      opts.onChunk?.(delta.content);
                    }
                  }
                }
              } catch (e) {}
            }
          }
        }
      }

      if (fullStreamText.trim()) return fullStreamText;
      return await this.generate(opts);
    };

    const directGeminiStreamFetch = async (): Promise<string> => {
      const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY || "";
      if (!apiKey) {
        return await this.generate(opts);
      }
      const ai = new GoogleGenAI({ apiKey });
      const candidateModels = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-3.8-flash"];
      let lastErr = "";
      for (const m of candidateModels) {
        try {
          const responseStream = await ai.models.generateContentStream({
            model: m,
            contents: opts.instruction,
            config: { temperature: typeof opts.temperature === "number" ? opts.temperature : s.temperature ?? 0.2 },
          });
          let full = "";
          for await (const chunk of responseStream) {
            const textChunk = chunk.text || "";
            if (textChunk) {
              full += textChunk;
              opts.onChunk?.(textChunk);
            }
          }
          if (full.trim()) return full;
        } catch (e: any) {
          lastErr = e.message || String(e);
        }
      }
      return await this.generate(opts);
    };

    try {
      const resp = await fetch("/api/ai/generate-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction: opts.instruction,
          model: s.enabled ? s.model : undefined,
          customApiKey: s.enabled ? s.apiKey : undefined,
          customBaseUrl: s.enabled ? s.baseUrl : undefined,
          providerType: s.enabled ? this.presetType() : undefined,
          stopSequences: opts.stopSequences,
          temperature: typeof opts.temperature === "number" ? opts.temperature : s.temperature ?? 0.2,
        }),
      });

      const contentType = resp.headers.get("content-type") || "";
      if (!resp.ok || contentType.includes("text/html")) {
        if (s.enabled && s.baseUrl) {
          return await directStreamFetch();
        }
        return await directGeminiStreamFetch();
      }

      let fullText = "";
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
              try {
                const event = JSON.parse(trimmed.slice(6));
                if (event.type === "thought" && event.text) {
                  opts.onThought?.(event.text);
                } else if (event.type === "text" && event.text) {
                  fullText += event.text;
                  opts.onChunk?.(event.text);
                } else if (event.type === "error" && event.error) {
                  console.warn("[AIProvider] Stream event error:", event.error);
                }
              } catch (e) {}
            }
          }
        }
      }

      if (fullText.trim()) return fullText;
    } catch (err) {
      if (s.enabled && s.baseUrl) {
        return await directStreamFetch();
      }
    }

    return await this.generate(opts);
  },

  async test() {
    const s = this.settings;
    if (!s.baseUrl || !s.model) throw new Error("need-fields");
    const p = PRESETS[s.preset];
    if (p && p.keyRequired && !s.apiKey) throw new Error("need-key");

    const t0 = performance.now();
    try {
      const text = await this.generate({ instruction: "Reply with exactly: OK", temperature: 0.1 });
      const elapsed = Math.round(performance.now() - t0);
      return { text, elapsed };
    } catch (e: any) {
      throw new Error(e.message || "Failed");
    }
  },

  async fetchModels(customBaseUrl?: string, customApiKey?: string): Promise<string[]> {
    const s = this.settings;
    const baseUrl = customBaseUrl || s.baseUrl;
    const apiKey = customApiKey !== undefined ? customApiKey : s.apiKey;

    if (!baseUrl) {
      throw new Error("Base URL is required to fetch models.");
    }

    const safeFetchJson = async (resp: Response): Promise<any> => {
      const rawText = await resp.text();
      try {
        return JSON.parse(rawText);
      } catch (err) {
        if (rawText.includes("<!DOCTYPE") || rawText.includes("<html") || rawText.includes("The page")) {
          throw new Error("Endpoint returned an HTML 404 page instead of JSON.");
        }
        throw new Error(`Invalid JSON response (HTTP ${resp.status}): ${rawText.slice(0, 100)}`);
      }
    };

    const directFetchModels = async (): Promise<string[]> => {
      let cleanBase = String(baseUrl).trim().replace(/\/+$/, "");
      cleanBase = cleanBase.replace(/\/chat\/completions$/, "").replace(/\/messages$/, "");

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

      const resp = await fetch(`${cleanBase}/models`, { method: "GET", headers });
      const data = await safeFetchJson(resp);
      if (!resp.ok) {
        throw new Error(data.error?.message || data.message || `HTTP ${resp.status}`);
      }

      let models: string[] = [];
      if (Array.isArray(data.data)) {
        models = data.data.map((m: any) => m.id || m.name || String(m)).filter(Boolean);
      } else if (Array.isArray(data.models)) {
        models = data.models.map((m: any) => m.id || m.name || String(m)).filter(Boolean);
      }
      return models;
    };

    try {
      const resp = await fetch("/api/ai/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customBaseUrl: baseUrl,
          customApiKey: apiKey,
          providerType: this.presetType(),
        }),
      });

      if (!resp.ok) {
        return await directFetchModels();
      }

      const data = await safeFetchJson(resp);
      if (!Array.isArray(data.models) || data.models.length === 0) {
        return await directFetchModels();
      }

      return data.models;
    } catch (e) {
      return await directFetchModels();
    }
  },

  async testModel(modelId: string, customBaseUrl?: string, customApiKey?: string): Promise<{ ok: boolean; elapsed: number; text: string; error?: string }> {
    const s = this.settings;
    const baseUrl = customBaseUrl || s.baseUrl;
    const apiKey = customApiKey !== undefined ? customApiKey : s.apiKey;
    const t0 = performance.now();

    try {
      const safeFetchJson = async (resp: Response): Promise<any> => {
        const rawText = await resp.text();
        try {
          return JSON.parse(rawText);
        } catch (err) {
          throw new Error(`Returned HTML/non-JSON page (HTTP ${resp.status}). Check Base URL.`);
        }
      };

      const directTest = async (): Promise<string> => {
        let cleanBase = String(baseUrl).trim().replace(/\/+$/, "");
        cleanBase = cleanBase.replace(/\/chat\/completions$/, "").replace(/\/messages$/, "");

        const isAnthropic = this.presetType() === "anthropic";
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (apiKey) {
          if (isAnthropic) {
            headers["x-api-key"] = apiKey;
            headers["anthropic-version"] = "2023-06-01";
            headers["anthropic-dangerous-direct-browser-access"] = "true";
          } else {
            headers["Authorization"] = `Bearer ${apiKey}`;
          }
        }

        const endpoint = isAnthropic ? `${cleanBase}/messages` : `${cleanBase}/chat/completions`;
        const bodyPayload = isAnthropic
          ? { model: modelId, max_tokens: 10, messages: [{ role: "user", content: "OK" }] }
          : { model: modelId, messages: [{ role: "user", content: "OK" }] };

        const resp = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify(bodyPayload) });
        const data = await safeFetchJson(resp);
        if (!resp.ok) throw new Error(data.error?.message || data.message || `HTTP ${resp.status}`);
        const text = isAnthropic ? data?.content?.[0]?.text : data?.choices?.[0]?.message?.content;
        return text || "OK";
      };

      let resText = "";
      try {
        const resp = await fetch("/api/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instruction: "Respond with the single word: OK",
            model: modelId,
            customApiKey: apiKey,
            customBaseUrl: baseUrl,
            providerType: this.presetType(),
            temperature: 0.1,
          }),
        });

        if (!resp.ok) {
          resText = await directTest();
        } else {
          const data = await safeFetchJson(resp);
          resText = data?.text || "OK";
        }
      } catch (err) {
        resText = await directTest();
      }

      const elapsed = Math.round(performance.now() - t0);
      return { ok: true, elapsed, text: String(resText).trim() };
    } catch (e: any) {
      return { ok: false, elapsed: Math.round(performance.now() - t0), text: "", error: e.message || String(e) };
    }
  },
};

// Wire harness transport to AIProvider.generateStream
setTransport((opts) => AIProvider.generateStream(opts));

/* ========================================================
   COURSE AI LAYER (Strictly powered by harness)
   ======================================================== */

export const CourseAI = {
  async generateOutline(topic: string, personal: any, settings: any, lang: string = "en"): Promise<CourseOutline> {
    const outline = await designOutline(topic, personal, settings, lang);
    return outline;
  },

  async generateLessonStream(
    courseTitle: string,
    topic: string,
    modTitle: string,
    lessonTitle: string,
    personal: any,
    lang: string = "en",
    onChunk?: (chunk: string) => void,
    onThought?: (thought: string) => void,
    ctx?: {
      slug: string;
      lessonIndex: number;
      totalLessons: number;
      outline: CourseOutline;
      settings: any;
      difficulty?: "beginner" | "intermediate" | "advanced";
      course?: Course;
      brainCovered?: { title: string; digest: string }[];
      brainUsedTerms?: string[];
      masterSummary?: string;
      glossary?: Term[];
    }
  ): Promise<{
    doc: LessonDoc;
    html: string;
    brainCovered: { title: string; digest: string }[];
    brainUsedTerms: string[];
    masterSummary: string;
  }> {
    const brain = ctx?.slug ? getBrain(ctx.slug) : new CourseBrain("default");

    // Rehydrate brain state from persistent store or passed context
    rehydrate(
      brain,
      ctx?.brainCovered || ctx?.course?.brainCovered,
      ctx?.brainUsedTerms || ctx?.course?.brainUsedTerms,
      ctx?.glossary || ctx?.course?.glossary,
      ctx?.masterSummary || ctx?.course?.masterSummary
    );

    if (ctx?.outline) {
      await brain.prime(
        ctx.outline,
        topic,
        lang,
        ctx.difficulty || ctx.settings?.difficulty || "beginner",
        ctx.settings?.source_excerpt
      );
    }

    // Look up concept dependencies for this lesson from outline
    let lessonPrereqs: string[] = [];
    let lessonIntroduces: string[] = [];
    let lessonReinforces: string[] = [];

    if (ctx?.outline) {
      if (ctx.outline.conceptDependencies?.[lessonTitle]) {
        const dep = ctx.outline.conceptDependencies[lessonTitle];
        lessonPrereqs = dep.prerequisites || [];
        lessonIntroduces = dep.introduces || [];
        lessonReinforces = dep.reinforces || [];
      } else if (Array.isArray(ctx.outline.modules)) {
        for (const m of ctx.outline.modules) {
          if (m.lessonItems) {
            const found = m.lessonItems.find((li) => li.title === lessonTitle);
            if (found) {
              lessonPrereqs = found.prerequisites || [];
              lessonIntroduces = found.introduces || [];
              lessonReinforces = found.reinforces || [];
              break;
            }
          }
        }
      }
    }

    const doc = await writeLesson(
      {
        courseTitle,
        topic,
        modTitle,
        lessonTitle,
        lessonIndex: ctx?.lessonIndex ?? 0,
        totalLessons: ctx?.totalLessons ?? 1,
        personal,
        difficulty: ctx?.difficulty || ctx?.settings?.difficulty || "beginner",
        settings: ctx?.settings || {},
        brain,
        introduces: lessonIntroduces,
        prerequisites: lessonPrereqs,
        reinforces: lessonReinforces,
        onChunk,
        onThought,
      },
      lang
    );

    // Commit lesson to cumulative memory
    brain.commit(doc, lessonTitle);

    // Update cumulative masterSummary (strictly <= 60 words)
    let updatedMasterSummary = brain.masterSummary;
    try {
      updatedMasterSummary = await updateMasterSummary(
        brain.masterSummary,
        lessonTitle,
        doc.digest,
        lang
      );
      brain.masterSummary = updatedMasterSummary;
    } catch (err) {
      console.warn("[CourseAI] Master summary generation warning:", err);
    }

    // Sync state back to course object if provided to guarantee persistence outside memory Map
    if (ctx?.course) {
      ctx.course.brainCovered = [...brain.covered];
      ctx.course.brainUsedTerms = Array.from(brain.usedTerms);
      ctx.course.masterSummary = updatedMasterSummary;
      if (!ctx.course.glossary || ctx.course.glossary.length === 0) {
        ctx.course.glossary = [...brain.glossary];
      }
    }

    // Code builds HTML deterministically
    const html = renderLesson(doc);

    if (onChunk) {
      const step = Math.max(1, Math.floor(html.length / 30));
      for (let i = 0; i < html.length; i += step) {
        onChunk(html.slice(i, i + step));
        await new Promise((r) => setTimeout(r, 10));
      }
    }

    return {
      doc,
      html,
      brainCovered: [...brain.covered],
      brainUsedTerms: Array.from(brain.usedTerms),
      masterSummary: updatedMasterSummary,
    };
  },

  async generateQuiz(
    doc: LessonDoc | null,
    courseTitle: string,
    modTitle: string,
    lessonTitle: string,
    lang: string = "en"
  ): Promise<QuizItem[]> {
    if (!doc) {
      throw new HarnessError("generateQuiz", [
        "A verified LessonDoc is strictly required to build an authentic quiz. Generate the lesson content first."
      ]);
    }
    return buildQuiz(doc, courseTitle, lessonTitle, lang);
  },

  async generateFlashcards(
    doc: LessonDoc | null,
    glossary: Term[] | null,
    courseTitle: string,
    topic: string,
    lang: string = "en"
  ): Promise<Card[]> {
    if (!doc) {
      throw new HarnessError("generateFlashcards", [
        "A verified LessonDoc is strictly required to build authentic flashcards. Generate the lesson content first."
      ]);
    }
    return buildCards(doc, glossary || [], courseTitle, lang);
  },

  async chat(
    courseTitle: string,
    topic: string,
    lessonTitle: string,
    history: any[],
    question: string,
    lang: string = "en",
    verifiedLessonText?: string,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    const contextEvidence = verifiedLessonText
      ? `\nVERIFIED LESSON MATERIAL COVERED IN CURRENT LESSON:\n${verifiedLessonText.slice(0, 2500)}\n`
      : "";

    const h = (history || [])
      .slice(-6)
      .map((m) => (m.role === "user" ? "Student: " + m.text : "Tutor: " + m.text))
      .join("\n");

    const prompt =
      (lang === "ar"
        ? `أنت المعلم الذكي التفاعلي لدورة "${courseTitle}". أجب على سؤال الطالب بدقة مستنداً إلى محتوى الدرس التالي:\n`
        : `You are TutorAI conversational tutor for "${courseTitle}". Answer the student's question accurately using the lesson context below:\n`) +
      contextEvidence +
      `\nCurrent Lesson: "${lessonTitle}" | Topic: "${topic}"\n` +
      `Recent Conversation:\n${h}\n` +
      `Student Question: "${question}"\n` +
      `INSTRUCTION: If the answer is NOT covered in the lesson context or course scope, state honestly and explicitly that this topic is outside the current lesson scope. Do NOT fabricate facts.`;

    const text = await AIProvider.generate({
      instruction: prompt,
      stopSequences: ["\nStudent:"],
      temperature: 0.3,
      onChunk,
    });
    return text;
  },

  async homework(
    question: string,
    lang: string = "en",
    onChunk?: (chunk: string) => void
  ): Promise<{ solved: boolean; steps: string[]; finalAnswer: string; check: string }> {
    const prompt = `
You are TutorAI Homework Specialist.
Solve the following academic question with verified mathematical or logical steps.

QUESTION: "${question}"
LANGUAGE: ${lang === "ar" ? "Arabic (العربية)" : "English"}

OUTPUT CONTRACT:
Output ONLY a single valid JSON object matching this schema:
{
  "solved": boolean (true if the problem is fully solvable with given data; false if required parameters are missing or ambiguous),
  "steps": [string, string] (numbered derivation steps showing formulas and arithmetic),
  "finalAnswer": string (the exact final answer or clarification of missing prerequisite),
  "check": string (verification method or boundary check proving correctness)
}

RULES:
- If key information is missing to solve the problem, set "solved": false, explain the missing data in "finalAnswer", and DO NOT claim it is solved.
- Never state "Solution verified" without rigorous mathematical or analytical proof.
`;

    const raw = await AIProvider.generate({
      instruction: prompt,
      temperature: 0.1,
    });

    const parsed = JSON.parse(cleanJson(raw));
    if (typeof parsed.solved !== "boolean" || !Array.isArray(parsed.steps) || !parsed.finalAnswer) {
      throw new HarnessError("homework", ["Homework solver returned incomplete or invalid structure."]);
    }

    if (onChunk) {
      const summary = parsed.steps.join("\n\n") + "\n\n**Result:** " + parsed.finalAnswer;
      onChunk(summary);
    }
    return parsed;
  },
};
