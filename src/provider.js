/* TutorAI clone — AIProvider: builtin Perchance AI + any OpenAI-compatible provider + Anthropic native.
   Keys stay in this browser (kv per user, localStorage for guests). Calls go through superFetch (CORS-free).
   Classic script, exposes window.AIProvider. */
(function () {
  "use strict";

  const PRESETS = {
    builtin: { name: "Perchance built-in", type: "builtin", baseUrl: "", models: [] },
    openai: { name: "OpenAI", type: "openai", baseUrl: "https://api.openai.com/v1", models: ["gpt-4o-mini", "gpt-4o", "o3-mini", "gpt-4.1-mini"] },
    anthropic: { name: "Anthropic", type: "anthropic", baseUrl: "https://api.anthropic.com/v1", models: ["claude-sonnet-4-20250514", "claude-3-5-haiku-20241022", "claude-3-5-sonnet-20241022"] },
    gemini: { name: "Google Gemini", type: "openai", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", models: ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-pro"] },
    mistral: { name: "Mistral", type: "openai", baseUrl: "https://api.mistral.ai/v1", models: ["mistral-small-latest", "mistral-medium-latest", "mistral-large-latest"] },
    deepseek: { name: "DeepSeek", type: "openai", baseUrl: "https://api.deepseek.com/v1", models: ["deepseek-chat", "deepseek-reasoner"] },
    groq: { name: "Groq", type: "openai", baseUrl: "https://api.groq.com/openai/v1", models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "deepseek-r1-distill-llama-70b"] },
    together: { name: "Together AI", type: "openai", baseUrl: "https://api.together.xyz/v1", models: ["meta-llama/Llama-3.3-70B-Instruct-Turbo", "mistralai/Mixtral-8x7B-Instruct-v0.1"] },
    openrouter: { name: "OpenRouter", type: "openai", baseUrl: "https://openrouter.ai/api/v1", models: ["openai/gpt-4o-mini", "anthropic/claude-3.5-sonnet", "google/gemini-2.0-flash-001", "deepseek/deepseek-chat"] },
    cohere: { name: "Cohere", type: "openai", baseUrl: "https://api.cohere.com/compatibility/v1", models: ["command-r-plus", "command-r"] },
    ollama: { name: "Ollama (local)", type: "openai", baseUrl: "http://localhost:11434/v1", models: ["llama3.1", "qwen2.5", "mistral"] },
    custom: { name: "Custom (OpenAI-compatible)", type: "openai", baseUrl: "", models: [] },
  };

  function cleanBase(u) { return String(u || "").trim().replace(/\/+$/, ""); }

  async function postJson(url, headers, body) {
    // Prefer superFetch (CORS-free proxy); fall back to fetch for same-origin/local (Ollama).
    const h = Object.assign({ "Content-Type": "application/json" }, headers);
    try {
      if (window.root && root.superFetch) {
        const r = await root.superFetch(url, { method: "POST", headers: h, body: JSON.stringify(body) });
        const txt = await r.text();
        let data = null;
        try { data = JSON.parse(txt); } catch (e) { throw new Error("bad-json: " + txt.slice(0, 200)); }
        if (!r.ok) throw new Error("http-" + r.status + ": " + txt.slice(0, 300));
        return data;
      }
    } catch (e) {
      if (/localhost|127\.0\.0\.1|192\.168\.|10\./.test(url)) { /* try direct fetch below */ }
      else throw e;
    }
    const r = await fetch(url, { method: "POST", headers: h, body: JSON.stringify(body) });
    const txt = await r.text();
    if (!r.ok) throw new Error("http-" + r.status + ": " + txt.slice(0, 300));
    return JSON.parse(txt);
  }

  async function completeOpenAI(s, prompt, stop) {
    const data = await postJson(cleanBase(s.baseUrl) + "/chat/completions",
      { Authorization: "Bearer " + s.apiKey },
      { model: s.model, temperature: s.temperature == null ? 0.7 : s.temperature,
        messages: [{ role: "user", content: prompt }],
        stop: stop && stop.length ? stop : undefined });
    const text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!text) throw new Error("empty-response");
    return text;
  }

  async function completeAnthropic(s, prompt, stop) {
    // Anthropic accepts temperature 0..1 — clamp UI values (slider goes to 1.5 for OpenAI models).
    const temp = Math.min(1, Math.max(0, s.temperature == null ? 0.7 : s.temperature));
    const data = await postJson(cleanBase(s.baseUrl) + "/messages",
      { "x-api-key": s.apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
      { model: s.model, max_tokens: 4000, temperature: temp,
        messages: [{ role: "user", content: prompt }],
        stop_sequences: stop && stop.length ? stop : undefined });
    const blk = data && data.content && data.content[0];
    const text = typeof blk === "string" ? blk : blk && blk.text;
    if (!text) throw new Error("empty-response");
    return text;
  }

  const AIProvider = {
    presets: PRESETS,
    settings: { enabled: false, preset: "openai", baseUrl: PRESETS.openai.baseUrl, apiKey: "", model: "gpt-4o-mini", temperature: 0.7, mindmap: false },

    async load() {
      let s = null;
      try {
        if (window.Store && Store.isLoggedIn()) s = await Store.getSettings();
        if (!s) s = JSON.parse(localStorage.getItem("taiv1.ai-settings") || "null");
      } catch (e) {}
      if (s && typeof s === "object") this.settings = Object.assign({}, this.settings, s);
      return this.settings;
    },
    async save(patch) {
      this.settings = Object.assign({}, this.settings, patch);
      try { localStorage.setItem("taiv1.ai-settings", JSON.stringify(this.settings)); } catch (e) {}
      try { if (window.Store && Store.isLoggedIn()) await Store.saveSettings(this.settings); } catch (e) {}
      return this.settings;
    },
    activeName() {
      const s = this.settings;
      if (!s.enabled || !s.apiKey) return null;
      const p = PRESETS[s.preset];
      return (p ? p.name : "Custom") + " · " + (s.model || "?");
    },
    isCustom() { const s = this.settings; return !!(s.enabled && s.apiKey && s.baseUrl && s.model); },
    presetType() { const p = PRESETS[this.settings.preset]; return p ? p.type : "openai"; },

    // Unified generate: {instruction, onChunk, stopSequences} -> full text. Streams when builtin.
    async generate(opts) {
      const { instruction, onChunk, stopSequences } = opts;
      if (!this.isCustom()) {
        return await root.generateText({ instruction, onChunk, stopSequences });
      }
      const s = this.settings;
      const text = this.presetType() === "anthropic"
        ? await completeAnthropic(s, instruction, stopSequences)
        : await completeOpenAI(s, instruction, stopSequences);
      if (onChunk) {
        // Deliver as progressive slices so the UI streaming code keeps working.
        const step = Math.max(1, Math.floor(text.length / 40));
        for (let i = 0; i < text.length; i += step) {
          onChunk({ textChunk: text.slice(i, i + step) });
          await new Promise((r) => setTimeout(r, 15));
        }
      }
      return text;
    },

    async test() {
      const s = this.settings;
      if (!s.baseUrl || !s.apiKey || !s.model) throw new Error("need-fields");
      const text = this.presetType() === "anthropic"
        ? await completeAnthropic(s, "Reply with exactly: OK", null)
        : await completeOpenAI(s, "Reply with exactly: OK", null);
      return text;
    },
  };

  window.AIProvider = AIProvider;
})();
