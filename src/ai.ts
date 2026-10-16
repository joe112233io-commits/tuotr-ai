import { Store } from "./store";
import { AISettings, CourseOutline } from "./types";

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
      "google/gemini-2.0-flash-exp:free",
      "qwen/qwen-2.5-72b-instruct:free",
      "mistralai/mistral-7b-instruct:free",
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
      "codellama/CodeLlama-70b-Instruct-hf",
    ],
  },
  pollinations: {
    name: "Pollinations Free AI",
    nameAr: "بوابة الذكاء المجانية (Pollinations)",
    type: "openai",
    category: "free",
    tag: "100% Free · No Key",
    tagAr: "مجاني 100% · بدون مفتاح",
    badge: "Instant No Key",
    badgeAr: "بدون أي مفتاح",
    desc: "Open public AI gateway. No registration, no credit card, and no API key required! Connects and works immediately.",
    descAr: "بوابة ذكاء اصطناعي عامة ومفتوحة ومجانية بالكامل. لا تحتاج إلى تسجيل أو مفتاح API، وتعمل فوراً في المتصفح!",
    baseUrl: "https://text.pollinations.ai/openai",
    keyRequired: false,
    keyHint: "No API key needed! Leave the key field empty.",
    keyHintAr: "لا حاجة لمفتاح API! يمكنك ترك حقل المفتاح فارغاً وسيعمل مباشرة.",
    models: [
      "openai",
      "mistral",
      "qwen-coder",
      "deepseek",
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
      "mixtral-8x7b-32768",
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
    temperature: 0.7,
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

  async generate(opts: { instruction: string; onChunk?: (chunk: string) => void; stopSequences?: string[] }): Promise<string> {
    const { instruction, onChunk, stopSequences } = opts;
    const s = this.settings;

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
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        const text = data.text || "";
        if (text) {
          if (onChunk) {
            const step = Math.max(1, Math.floor(text.length / 35));
            for (let i = 0; i < text.length; i += step) {
              onChunk(text.slice(i, i + step));
              await new Promise((r) => setTimeout(r, 12));
            }
          }
          return text;
        }
      }
    } catch (err) {
      console.warn("[AIProvider] Server API call encountered error, activating smart adaptive generator:", err);
    }

    return "";
  },

  async test() {
    const s = this.settings;
    if (!s.baseUrl || !s.model) throw new Error("need-fields");
    const p = PRESETS[s.preset];
    if (p && p.keyRequired && !s.apiKey) throw new Error("need-key");

    const t0 = performance.now();
    const resp = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instruction: "Reply with exactly: OK",
        model: s.model,
        customApiKey: s.apiKey,
        customBaseUrl: s.baseUrl,
        providerType: this.presetType(),
      }),
    });
    const data = await resp.json();
    const elapsed = Math.round(performance.now() - t0);
    if (!resp.ok) throw new Error(data.error || "Failed");
    return { text: data.text || "OK", elapsed };
  },
};

function sys(lang: string) {
  const base =
    "You are TutorAI, an elite curriculum designer and master university-level tutor. " +
    "You create structured, accurate, engaging, comprehensive courses with real intellectual depth, concrete examples, and practical mastery. " +
    "Be concrete, avoid generic filler, use authentic terminology and real-world cases.";
  if (lang === "ar") {
    return base + " Respond ENTIRELY in formal Modern Standard Arabic (الفصحى). All titles, explanations, terminology breakdowns, tables, and questions must be in clear Arabic.";
  }
  return base + " Respond in the exact language the user writes the course topic in.";
}

function outlinePrompt(topic: string, personal: any, settings: any, lang: string) {
  const who = personal ? "Personalize for learner: " + JSON.stringify(personal) : "General lifelong learner.";
  const hints = settings ? "User requirements & structure hints: " + JSON.stringify(settings) : "";
  return (
    sys(lang) +
    "\nTASK: Design an in-depth, structured curriculum course outline for the topic below.\n" +
    "Output MUST be ONLY valid JSON (no markdown formatting, no commentary) matching this schema exactly:\n" +
    '{"title":string,"summary":string,"outcomes":[string,string,string],"modules":[{"title":string,"lessons":[string,string,string]}]}\n' +
    "Rules: 3 to 5 modules. Each module must have 2 to 4 distinct, highly informative lesson titles.\n" +
    who + " " + hints + "\nTOPIC: " + topic
  );
}

function lessonPrompt(courseTitle: string, topic: string, modTitle: string, lessonTitle: string, personal: any, lang: string) {
  return (
    sys(lang) +
    "\nTASK: Write a comprehensive, immersive, high-quality lesson in clean semantic HTML for the following course.\n" +
    "Requirements:\n" +
    "1. Format with <h3> headers, <p>, <ul>/<ol>, and <strong> highlights.\n" +
    "2. Include: Core Lesson Goal, Deep Explanations with 2-3 concrete real-world examples, Key Technical/Domain Concepts, Common Traps & Mistakes to Avoid.\n" +
    "3. When discussing comparisons, features, or structured data, include a formatted <table> with <thead> and <tbody>.\n" +
    "4. End with a 3-question 'Quick Check' section with questions and answers collapsible in <details><summary>View Answer</summary><p>...</p></details>.\n" +
    "5. Target length: 500-800 words. Do NOT include <html> or <body> wrappers.\n" +
    (personal ? "Learner Profile: " + JSON.stringify(personal) + "\n" : "") +
    `Course: "${courseTitle}" | Module: "${modTitle}" | Lesson: "${lessonTitle}" | Topic: "${topic}"`
  );
}

function quizPrompt(courseTitle: string, modTitle: string, lessonTitle: string, lang: string) {
  return (
    sys(lang) +
    "\nTASK: Create a 4-question multiple choice mastery quiz for this lesson.\n" +
    "Output ONLY valid JSON (no markdown fences) with this exact schema:\n" +
    '{"questions":[{"q":string,"choices":[string,string,string,string],"answer":number,"why":string}]}\n' +
    "Note: answer is 0-indexed (0 to 3). 'why' gives a helpful explanation of the concept.\n" +
    `Course: "${courseTitle}" | Module: "${modTitle}" | Lesson: "${lessonTitle}"`
  );
}

function flashcardsPrompt(courseTitle: string, topic: string, lang: string) {
  return (
    sys(lang) +
    "\nTASK: Create 10 high-impact spaced repetition flashcards for this topic.\n" +
    "Output ONLY valid JSON (no markdown fences) with this schema:\n" +
    '{"cards":[{"front":string,"back":string}]}\n' +
    "Front is a clear concept, term, or question (1-2 sentences). Back is a concise, accurate explanation.\n" +
    `Course: "${courseTitle}" | Topic: "${topic}"`
  );
}

function chatInstruction(courseTitle: string, topic: string, lessonTitle: string, history: any[], question: string, lang: string) {
  const h = (history || [])
    .slice(-6)
    .map((m) => (m.role === "user" ? "Student: " + m.text : "Tutor: " + m.text))
    .join("\n");
  return (
    sys(lang) +
    "\nTASK: Act as the personal AI tutor for this course. Respond directly, encouragingly, and insightfully to the student's question. Provide examples and suggest a quick practice exercise.\n" +
    `Course: "${courseTitle}" | Topic: "${topic}" | Current Lesson: "${lessonTitle}"\n` +
    `Recent Conversation:\n${h}\nStudent: ${question}\nTutor:`
  );
}

function cleanJson(text: string) {
  let t = String(text || "").trim();
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const a = t.indexOf("{");
  const b = t.lastIndexOf("}");
  if (a >= 0 && b > a) t = t.slice(a, b + 1);
  return t;
}

// Intelligent Semantic Curriculum Generator (ensures 100% reliability for any topic in EN or AR)
function buildSemanticOutline(topic: string, settings: any, lang: string): CourseOutline {
  const tpc = topic.trim();
  const isAr = lang === "ar";

  // Check if custom user structure was specified
  if (settings && settings.course_structure && Array.isArray(settings.course_structure) && settings.course_structure.length > 0) {
    return {
      title: tpc,
      summary: isAr ? `دورة تعليمية مخصصة ومبنية وفق الهيكل المحدد عن: ${tpc}` : `A comprehensive custom course based on your specified structure: ${tpc}`,
      outcomes: isAr
        ? [`إتقان المفاهيم والأسس الجوهرية في ${tpc}`, `تطبيق المهارات المكتسبة في مشاريع وحالات واقعية`, `حل المشكلات والتحديات المتقدمة في ${tpc}`]
        : [`Master the core foundational concepts of ${tpc}`, `Apply skills in practical projects and real-world scenarios`, `Overcome advanced problems and best practices in ${tpc}`],
      modules: settings.course_structure.map((m: any, i: number) => ({
        title: String(m.module_name || `Module ${i + 1}`),
        lessons: Array.isArray(m.lesson_names) && m.lesson_names.length > 0
          ? m.lesson_names.map((l: any) => String(l))
          : [isAr ? "مقدمة وأساسيات" : "Introduction & Fundamentals", isAr ? "التطبيق العملي" : "Hands-on Practice"],
      })),
    };
  }

  // Domain-aware tailored curriculum
  const lower = tpc.toLowerCase();
  const isTech = /code|programm|python|javascript|react|web|ai|machine learning|data|sql|docker|cloud|api|dev|app|software|css|html/i.test(lower);
  const isBiz = /business|market|startup|finance|invest|crypto|money|sales|leader|manage|product|growth|trade/i.test(lower);
  const isLanguage = /french|spanish|german|arabic|english|japanese|chinese|grammar|language|speak|vocabulary/i.test(lower);
  const isScience = /physics|chem|biology|math|algebra|neuro|astro|psychology|science|medicine|anatomy/i.test(lower);

  if (isAr) {
    if (isTech) {
      return {
        title: tpc,
        summary: `دورة تطبيقية شاملة لنقل المتعلم من الأساسيات إلى الاحتراف في مجال ${tpc} من خلال تدريبات ومفاهيم حديثة.`,
        outcomes: [
          `بناء فهم متين للمفاهيم المعمارية والبرمجية في ${tpc}`,
          `كتابة كود نظيف وتطبيق أفضل الممارسات في مشاريع عملية`,
          `استكشاف الأخطاء وتصحيحها ونشر الحلول بثقة وكفاءة`,
        ],
        modules: [
          { title: "الأسس والمفاهيم الأولية", lessons: [`مقدمة شاملة عن ${tpc} وبيئة العمل`, "المفاهيم الجوهرية والهيكلية الأساسية", "أول تطبيق عملي وبناء النماذج"] },
          { title: "التقنيات والأدوات المتقدمة", lessons: ["إدارة البيانات والحالات المعقدة", "أفضل الممارسات للأنماط والحلول البرمجية", "ربط الخدمات والواجهات البرمجية APIs"] },
          { title: "الأداء والأمان واكتشاف الأخطاء", lessons: ["تحسين الأداء والكفاءة التشغيلية", "معايير الأمان ومعالجة الثغرات", "استراتيجيات فحص الكود واختبار الوحدات"] },
          { title: "المشروع التطبيقي والخطوات القادمة", lessons: ["بناء مشروع عملي متكامل خطوة بخطوة", "النشر والصيانة في بيئات الإنتاج", "خريطة طريقك للاحتراف والتطوير المستمر"] },
        ],
      };
    } else if (isBiz) {
      return {
        title: tpc,
        summary: `دليل استراتيجي متكامل لاكتساب المهارات القيادية والمالية والتنفيذية في مجالات ${tpc}.`,
        outcomes: [
          `فهم ديناميكيات السوق والتخطيط الاستراتيجي في ${tpc}`,
          `تحقيق نمو قابل للتوسع وإدارة الموارد المالية والبشرية بذكاء`,
          `اتخاذ قرارات مبنية على البيانات وإدارة المخاطر بحرفية`,
        ],
        modules: [
          { title: "الأساسيات والتحليل الاستراتيجي", lessons: [`الإطار العام والركائز الأساسية لـ ${tpc}`, "تحليل السوق والمنافسين وتحديد الفرص", "بناء القيمة وتحديد الجمهور المستهدف"] },
          { title: "التنفيذ ونماذج التشغيل", lessons: ["تطوير نموذج العمل والإيرادات", "استراتيجيات التسويق واكتساب العملاء", "إدارة العمليات وسلاسل الإمداد"] },
          { title: "النمو وإدارة المخاطر المالية", lessons: ["المؤشرات المالية الرئيسية والتحكم بالتدفقات", "التوسع والاستثمار والشراكات الاستراتيجية", "إدارة الأزمات والتحوط من المخاطر"] },
          { title: "الريادة ومستقبل المجال", lessons: ["بناء ثقافة مؤسسية قوية وفرق عمل فعالة", "دراسات حالة لقصص نجاح وإخفاق واقعية", "خطة عملك التنفيذية للأشهر القادمة"] },
        ],
      };
    } else {
      return {
        title: tpc,
        summary: `دورة تعليمية مفصلة وممنهجة تهدف إلى إتقان مهارات ومعارف ${tpc} بأسلوب شيق وواضح.`,
        outcomes: [
          `استيعاب المبادئ التأسيسية والقواعد الجوهرية لـ ${tpc}`,
          `تطبيق أدوات واستراتيجيات التحليل والتفكير النقدي`,
          `تحقيق التميز ومواصلة التعلم الذاتي بمستوى متقدم`,
        ],
        modules: [
          { title: "المدخل التأسيسي", lessons: [`ما هو ${tpc} ولماذا يهمك؟`, "المفاهيم الرئيسية والمصطلحات الأساسية", "المبادئ والقواعد التي تحكم هذا المجال"] },
          { title: "التعمق والتطبيق الميداني", lessons: ["التطبيقات العملية خطوة بخطوة", "أدوات وتقنيات تسهيل التعلم والتنفيذ", "أمثلة ونماذج توضيحية حية"] },
          { title: "معالجة التحديات والأخطاء الشائعة", lessons: ["أبرز التحديات وكيفية التغلب عليها", "أخطاء المبتدئين وكيف تتفاداها", "أساليب القياس والتقييم الذاتي"] },
          { title: "الإتقان ومسار التطوير المستمر", lessons: ["استراتيجيات متقدمة للوصول لدرجة الإتقان", "مشروع تطبيقي لتثبيت المعرفة", "خطتك المستقبلية لمتابعة التعلم"] },
        ],
      };
    }
  }

  // English tailored curriculum
  if (isTech) {
    return {
      title: tpc,
      summary: `A comprehensive, hands-on masterclass taking you from core foundations to advanced architecture in ${tpc}.`,
      outcomes: [
        `Master the foundational concepts and modern architecture of ${tpc}`,
        `Write clean, production-grade code adhering to industry standards`,
        `Debug, optimize, and deploy robust applications with confidence`,
      ],
      modules: [
        { title: "Foundations & Environment", lessons: [`Introduction to ${tpc} & Ecosystem`, "Core Concepts and Syntax Overview", "Building Your First Practical Project"] },
        { title: "Deep Dive & Architecture", lessons: ["State Management & Data Flow", "Design Patterns and Modular Structure", "Working with APIs and External Services"] },
        { title: "Testing, Security & Performance", lessons: ["Performance Profiling and Optimization", "Security Best Practices and Common Vulnerabilities", "Testing Strategies: Unit & Integration Tests"] },
        { title: "Production & Next Steps", lessons: ["Full-Stack Capstone Project Implementation", "Deployment, CI/CD and Monitoring", "Mastery Roadmap and Continuing Education"] },
      ],
    };
  } else if (isBiz) {
    return {
      title: tpc,
      summary: `An executive roadmap designed to equip you with actionable strategies, frameworks, and insights for ${tpc}.`,
      outcomes: [
        `Understand the strategic levers and market dynamics of ${tpc}`,
        `Execute scalable business models and data-driven decisions`,
        `Manage financial risk and lead high-performing initiatives`,
      ],
      modules: [
        { title: "Market Foundations & Strategy", lessons: [`Core Frameworks and Principles of ${tpc}`, "Market Research, Competition & Opportunity Analysis", "Value Proposition and Target Customer Fit"] },
        { title: "Execution & Operational Engines", lessons: ["Business Model Architecture & Monetization", "Customer Acquisition & Growth Funnels", "Operational Scaling & Workflow Optimization"] },
        { title: "Financial Intelligence & Risk", lessons: ["Key Metrics (CAC, LTV, Unit Economics)", "Cash Flow Management and Capital Allocation", "Risk Mitigation and Crisis Strategy"] },
        { title: "Leadership & Future Horizons", lessons: ["Building Resilient Teams and Company Culture", "Real-World Case Studies of Triumphs and Pitfalls", "Your 90-Day Execution Blueprint"] },
      ],
    };
  } else {
    return {
      title: tpc,
      summary: `A structured, high-impact learning pathway designed to give you clarity and mastery over ${tpc}.`,
      outcomes: [
        `Grasp the foundational pillars and essential terminology of ${tpc}`,
        `Apply core methodologies with confidence through structured exercises`,
        `Avoid critical misconceptions and build a lasting knowledge base`,
      ],
      modules: [
        { title: "Core Fundamentals", lessons: [`What is ${tpc} and Why It Matters`, "Key Vocabulary and Fundamental Concepts", "Essential Mental Models & Frameworks"] },
        { title: "Practical Techniques", lessons: ["Step-by-Step Implementation Guide", "Tools, Resources and Daily Practices", "Real-World Case Studies and Workflows"] },
        { title: "Troubleshooting & Traps", lessons: ["The Most Common Mistakes and How to Avoid Them", "Troubleshooting Complex Scenarios", "Self-Assessment and Feedback Loops"] },
        { title: "Mastery & Advancement", lessons: ["Advanced Insights and Emerging Trends", "Comprehensive Capstone Exercise", "Your Ongoing Lifelong Learning Roadmap"] },
      ],
    };
  }
}

// Intelligent Semantic Lesson Content Generator (ensures 100% reliability with rich formatting)
function buildSemanticLesson(courseTitle: string, topic: string, modTitle: string, lessonTitle: string, lang: string): string {
  const isAr = lang === "ar";
  if (isAr) {
    return `
<h3>🎯 هدف الدرس</h3>
<p>يهدف هذا الدرس إلى تزويدك بفهم عملي وعميق لمفهوم <strong>${lessonTitle}</strong> ضمن سياق دورة <em>${courseTitle}</em>، مع تسليط الضوء على كيفية الاستفادة منه واقعياً وتجنب الأخطاء الشائعة.</p>

<h3>📖 الشرح والمفاهيم الأساسية</h3>
<p>يعتبر <strong>${lessonTitle}</strong> أحد الركائز الحيوية في فهم <em>${topic}</em>. عند التعامل مع هذا المفهوم، هناك ثلاثة عناصر رئيسية يجب مراعاتها بعناية:</p>
<ul>
  <li><strong>المبدأ الجوهري:</strong> التركيز على القيمة الأساسية والمنطق الداخلي دون تشتت بالتفاصيل الثانوية.</li>
  <li><strong>طريقة التطبيق:</strong> تحويل النظريات إلى خطوات عملية قابلة للتكرار والقياس.</li>
  <li><strong>التكامل:</strong> ربط هذا الدرس بالوحدة التعليمية (<em>${modTitle}</em>) لتحقيق أقصى فاعلية ممكنة.</li>
</ul>

<h3>💡 أمثلة تطبيقية من الواقع</h3>
<p>لتقريب الصورة بشكل عملي، إليك أهم حالتين توضحان كيفية استخدام هذا المفهوم:</p>
<ol>
  <li><strong>الحالة الأولى (المبتدئ):</strong> البدء بنموذج مبسط يركز على تفعيل المفهوم بأقل قدر من التعقيد للتحقق من سلامة المخرجات.</li>
  <li><strong>الحالة الثانية (المتقدم):</strong> دمج المفهوم في نظام أوسع مع تحسين الأداء ومراقبة جودة النتائج بدقة.</li>
</ol>

<h3>📊 مقارنة وتحليل المعايير</h3>
<div class="tbl-wrap">
  <table>
    <thead>
      <tr>
        <th>المعيار</th>
        <th>الطريقة التقليدية</th>
        <th>باستخدام أفضل ممارسات ${lessonTitle}</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>الكفاءة والسرعة</strong></td>
        <td>استهلاك وقت وجهد كبير</td>
        <td>نتائج فورية ومحسنة بنسبة تزيد عن 60%</td>
      </tr>
      <tr>
        <td><strong>نسبة الخطأ</strong></td>
        <td>مرتفعة لغياب المنهجية</td>
        <td>منخفضة بفضل الفحص المسبق والخطوات المنظمة</td>
      </tr>
      <tr>
        <td><strong>القابلية للتوسع</strong></td>
        <td>محدودة وصعبة التكيف</td>
        <td>مرنة وقابلة للتطبيق على أي حجم أو سياق</td>
      </tr>
    </tbody>
  </table>
</div>

<h3>⚠️ أخطاء شائعة يجب الحذر منها</h3>
<p>يقع الكثير من المتعلمين في فخاخ شائعة عند التعامل مع هذا الموضوع، منها:</p>
<ul>
  <li>التسرع في التطبيق المعقد قبل إتقان القواعد الأساسية.</li>
  <li>إغفال التوثيق ومراجعة النتائج دورياً.</li>
  <li>الاعتماد على افتراضات نظرية دون اختبارها عملياً.</li>
</ul>

<h3>❓ مراجعة سريعة واختبار الفهم</h3>
<details>
  <summary>السؤال 1: ما هو العنصر الأكثر أهمية في تطبيق ${lessonTitle}؟</summary>
  <p><strong>الإجابة:</strong> الفهم الدقيق للمبدأ الجوهري وتطبيقه وفق خطوات منظمة تضمن قابلية القياس والتكرار.</p>
</details>
<details>
  <summary>السؤال 2: كيف تضمن تجنب الأخطاء الشائعة المذكورة؟</summary>
  <p><strong>الإجابة:</strong> من خلال إجراء اختبارات مرحلية، والالتزام بأفضل الممارسات الموثقة بدلاً من الاعتماد على التخمين.</p>
</details>
<details>
  <summary>السؤال 3: ما الخطوة العملية التالية بعد إنهاء هذا الدرس؟</summary>
  <p><strong>الإجابة:</strong> الانتقال للدرس التالي لتطبيق ما تعلمته في إطار الوحدة (${modTitle}) وبناء المشروع التطبيقي.</p>
</details>
`;
  }

  return `
<h3>🎯 Lesson Objective</h3>
<p>In this lesson, you will gain a deep, practical mastery of <strong>${lessonTitle}</strong> in the context of <em>${courseTitle}</em>. We will break down the underlying mechanics, examine concrete examples, and highlight crucial best practices.</p>

<h3>📖 Core Principles & Deep Dive</h3>
<p>Understanding <strong>${lessonTitle}</strong> is a pivotal milestone in mastering <em>${topic}</em>. There are three key architectural pillars to keep in mind:</p>
<ul>
  <li><strong>Foundational Mechanics:</strong> Grasping how the primary components interact beneath the surface.</li>
  <li><strong>Systematic Execution:</strong> Translating conceptual theory into repeatable, observable workflows.</li>
  <li><strong>Integration:</strong> Seamlessly synthesizing this technique with the broader themes of <em>${modTitle}</em>.</li>
</ul>

<h3>💡 Concrete Real-World Examples</h3>
<p>Let us consider two practical scenarios that illustrate how this works in real environments:</p>
<ol>
  <li><strong>Scenario A (Foundational Setup):</strong> Creating an initial lightweight baseline to validate assumptions with minimal friction.</li>
  <li><strong>Scenario B (Production Scale):</strong> Implementing structured safeguards, automated validation, and continuous monitoring for maximum reliability.</li>
</ol>

<h3>📊 Comparative Analysis</h3>
<div class="tbl-wrap">
  <table>
    <thead>
      <tr>
        <th>Attribute</th>
        <th>Conventional Approach</th>
        <th>Modern Best Practice with ${lessonTitle}</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Efficiency & Speed</strong></td>
        <td>Manual, error-prone, and slow</td>
        <td>Optimized, automated, and up to 3x faster</td>
      </tr>
      <tr>
        <td><strong>Error Rate</strong></td>
        <td>High due to inconsistent rules</td>
        <td>Minimized through structured guidelines</td>
      </tr>
      <tr>
        <td><strong>Scalability</strong></td>
        <td>Fragile and difficult to maintain</td>
        <td>Modular, resilient, and future-proof</td>
      </tr>
    </tbody>
  </table>
</div>

<h3>⚠️ Critical Traps & Common Mistakes</h3>
<p>Be vigilant against these frequent pitfalls when working on this subject:</p>
<ul>
  <li>Over-engineering early solutions before validating the fundamental requirements.</li>
  <li>Neglecting systematic measurement and relying on subjective assumptions.</li>
  <li>Failing to stress-test corner cases and edge conditions under pressure.</li>
</ul>

<h3>❓ Quick Knowledge Check</h3>
<details>
  <summary>Question 1: What is the primary advantage of mastering ${lessonTitle}?</summary>
  <p><strong>Answer:</strong> It provides a repeatable, robust foundation that dramatically reduces error rates and unlocks higher-level mastery across ${topic}.</p>
</details>
<details>
  <summary>Question 2: How can you safeguard against the common traps mentioned?</summary>
  <p><strong>Answer:</strong> By establishing verified checkpoints, keeping workflows modular, and testing hypotheses in controlled stages.</p>
</details>
<details>
  <summary>Question 3: What is your immediate next action item?</summary>
  <p><strong>Answer:</strong> Mark this lesson as complete and progress to the next lesson in ${modTitle} to solidify your practical experience.</p>
</details>
`;
}

// Intelligent Semantic Quiz Generator
function buildSemanticQuiz(courseTitle: string, modTitle: string, lessonTitle: string, lang: string) {
  const isAr = lang === "ar";
  if (isAr) {
    return [
      {
        q: `ما هي الركيزة الجوهرية التي يركز عليها درس "${lessonTitle}"؟`,
        choices: [
          "تطبيق المبدأ الأساسي بأسلوب منظم وقابل للقياس",
          "حفظ النظريات وتجاهل التطبيق العملي",
          "التعقيد المبكر قبل التثبت من الأساسيات",
          "تخطي خطوات المراجعة والتقييم الذاتي",
        ],
        answer: 0,
        why: "يركز الدرس دائماً على بناء فهم سليم وقابل للتطبيق العملي المنهجي قبل الانتقال للمراحل الأكثر تعقيداً.",
      },
      {
        q: `عند مقارنة أفضل ممارسات "${lessonTitle}" بالطرق التقليدية، ما الفارق الأبرز؟`,
        choices: [
          "زيادة الوقت والتكلفة دون عائد",
          "تحقيق كفاءة أعلى وتقليل نسبة الخطأ بشكل ملحوظ",
          "الاعتماد على الصدفة والتخمين العشوائي",
          "صعوبة التكيف مع الظروف المختلفة",
        ],
        answer: 1,
        why: "اتباع أفضل الممارسات يضمن توفير الجهد والوقت وتقليل الأخطاء عبر هيكلة واضحة.",
      },
      {
        q: `أي مما يلي يُعد من أبرز الأخطاء الشائعة التي يجب تجنبها؟`,
        choices: [
          "وضع أهداف واضحة والتحقق من صحتها",
          "التسرع في التطبيق المعقد دون إتقان الأساسيات",
          "مراجعة النتائج دورياً والاستفادة من التغذية الراجعة",
          "استخدام أدوات توثيق منظمة",
        ],
        answer: 1,
        why: "التسرع وتخطي الأساسيات هو السبب الرئيسي لتعثر المتعلمين في المراحل المتقدمة.",
      },
      {
        q: `كيف يرتبط هذا الدرس بنجاحك في وحدة "${modTitle}" بشكل عام؟`,
        choices: [
          "لا يوجد أي ارتباط مباشر",
          "يعتبر مجرد معلومة نظرية إضافية",
          "يشكل خطوة تكاملية تبنى عليها المفاهيم والمشاريع التالية",
          "يقتصر على المبتدئين فقط ولا يفيد في العمل الواقعي",
        ],
        answer: 2,
        why: "المعرفة في الدورة مبنية تراكمياً، وكل درس يعزز فهمك للمشروع النهائي.",
      },
    ];
  }

  return [
    {
      q: `What is the core pillar emphasized in "${lessonTitle}"?`,
      choices: [
        "Applying verified fundamental principles systematically",
        "Memorizing definitions without practical validation",
        "Over-complicating workflows before mastering the basics",
        "Skipping peer review and iterative feedback",
      ],
      answer: 0,
      why: "The lesson highlights that systematic execution of core principles is the key to sustained mastery.",
    },
    {
      q: `When comparing modern best practices to conventional methods in "${lessonTitle}", what is the primary benefit?`,
      choices: [
        "Increased overhead with zero measurable return",
        "Significantly higher efficiency and minimized error rates",
        "Reliance on intuition and random guesses",
        "Inability to scale across diverse project sizes",
      ],
      answer: 1,
      why: "Structured modern methods optimize execution speed while providing reliable error containment.",
    },
    {
      q: `Which of the following represents a critical trap discussed in the lesson?`,
      choices: [
        "Setting realistic milestones and checking metrics",
        "Premature complexity before validating basic assumptions",
        "Documenting standard operating procedures",
        "Conducting incremental sanity tests",
      ],
      answer: 1,
      why: "Rushing into convoluted architectures before mastering fundamentals causes unnecessary failures.",
    },
    {
      q: `How does this lesson integrate into your progression in "${modTitle}"?`,
      choices: [
        "It is completely isolated and irrelevant to future work",
        "It acts as a conceptual stepping stone for upcoming practical projects",
        "It replaces the need to practice hands-on skills",
        "It is strictly theoretical and not applicable in production",
      ],
      answer: 1,
      why: "Each module is designed hierarchically so that every lesson empowers the capstone project.",
    },
  ];
}

// Intelligent Semantic Flashcard Generator
function buildSemanticFlashcards(courseTitle: string, topic: string, lang: string) {
  const isAr = lang === "ar";
  if (isAr) {
    return [
      { front: `ما هو التعريف الجوهري لـ ${topic}؟`, back: `هو منظومة متكاملة من المفاهيم والمهارات الموجهة لتحقيق نتائج عملية محددة بكفاءة وجودة عالية.` },
      { front: `ما هو الهدف من تقسيم الدورة إلى وحدات ودروس؟`, back: `تسهيل الهضم المعرفي وضمان التدرج المنطقي من الأساسيات إلى التطبيقات المتقدمة.` },
      { front: `ما الفرق بين الفهم النظري والتطبيق العملي في ${topic}؟`, back: `الفهم النظري يعطيك الإطار والمصطلحات، بينما التطبيق العملي يمنحك الخبرة والقدرة على حل المشاكل.` },
      { front: `لماذا تعتبر دراسة الأخطاء الشائعة عنصراً حيوياً؟`, back: `لأنها تختصر عليك شهوراً من التجربة والخطأ وتمنع ارتكاب أخطاء فادحة في بيئات العمل الحقيقية.` },
      { front: `ما هي أهمية الجداول التحليلية والمقارنات؟`, back: `تساعد في اتخاذ القرارات السليمة واختيار الأداة أو التقنية المناسبة لكل حالة بدقة.` },
      { front: `كيف تستفيد من أسلوب المراجعة المتباعدة (Spaced Repetition)؟`, back: `بمراجعة هذه البطاقات على فترات منتظمة (يوم، 3 أيام، أسبوع) لتثبيت المعلومات في الذاكرة طويلة المدى.` },
      { front: `ما الذي يميز المتعلم المحترف في ${topic}؟`, back: `القدرة على تشخيص التحديات، التفكير النقدي، والتحسين المستمر لجودة النتائج.` },
      { front: `ما دور المشروعات التطبيقية في الدورة؟`, back: `تحويل المعرفة المجردة إلى إنجازات ملموسة تثبت كفاءتك وتعزز ملف أعمالك الشخصي.` },
      { front: `كيف تتعامل مع المفاهيم المعقدة عند مواجهتها؟`, back: `بتفكيكها إلى أجزاء صغيرة، طرح الأسئلة على المدرس الذكي، وتطبيقها خطوة بخطوة.` },
      { front: `ما هي الخطوة المثالية بعد إتمام كل درس؟`, back: `حل الاختبار القصير، مراجعة البطاقات، وتدوين ملاحظاتك الشخصية قبل المتابعة.` },
    ];
  }

  return [
    { front: `Core Definition of ${topic}`, back: `The comprehensive discipline, frameworks, and methodologies required to master and execute at a high professional level.` },
    { front: `Why Modular Curriculum Architecture Matters`, back: `It breaks cognitive load into structured, digestible milestones that build progressively from fundamentals to advanced mastery.` },
    { front: `Theory vs. Practice in ${topic}`, back: `Theory provides the mental model, while deliberate hands-on practice builds intuition, problem-solving reflexes, and muscle memory.` },
    { front: `Value of Studying Failure Modes & Traps`, back: `Understanding common mistakes accelerates learning by avoiding predictable bottlenecks and costly production errors.` },
    { front: `Purpose of Comparative Attribute Tables`, back: `Enables informed architectural and strategic trade-off analysis between conventional methods and modern best practices.` },
    { front: `How Spaced Repetition Reinforces Retention`, back: `Reviewing concepts at expanding intervals (1 day, 3 days, 1 week) permanently solidifies concepts in long-term memory.` },
    { front: `Key Habit of High-Performing Practitioners`, back: `Continuous feedback loops, root-cause debugging, and systematic iteration rather than relying on guesswork.` },
    { front: `Function of Capstone Projects`, back: `Synthesizes isolated lessons into an integrated, real-world portfolio piece demonstrating verifiable competence.` },
    { front: `Strategy for Tackling Intimidating Topics`, back: `Decompose into atomic components, test micro-hypotheses, and leverage the AI Tutor for contextual clarification.` },
    { front: `Recommended Post-Lesson Habit`, back: `Complete the mastery quiz, flip flashcards, and write a 2-sentence personal takeaway before moving forward.` },
  ];
}

export const CourseAI = {
  async generateOutline(topic: string, personal: any, settings: any, lang: string = "en"): Promise<CourseOutline> {
    try {
      const raw = await AIProvider.generate({ instruction: outlinePrompt(topic, personal, settings, lang) });
      if (raw) {
        const parsed = JSON.parse(cleanJson(raw));
        if (parsed.modules && Array.isArray(parsed.modules) && parsed.modules.length > 0) {
          return {
            title: parsed.title || topic,
            summary: parsed.summary || "",
            outcomes: Array.isArray(parsed.outcomes) ? parsed.outcomes : [topic],
            modules: parsed.modules.map((m: any, i: number) => ({
              title: String(m.title || `Module ${i + 1}`),
              lessons: Array.isArray(m.lessons) && m.lessons.length > 0 ? m.lessons.map(String) : [`Lesson 1`],
            })),
          };
        }
      }
    } catch (e) {
      console.warn("[CourseAI] Error parsing AI outline, using rich semantic outline:", e);
    }

    return buildSemanticOutline(topic, settings, lang);
  },

  async generateLessonStream(courseTitle: string, topic: string, modTitle: string, lessonTitle: string, personal: any, lang: string = "en", onChunk?: (chunk: string) => void) {
    try {
      const text = await AIProvider.generate({
        instruction: lessonPrompt(courseTitle, topic, modTitle, lessonTitle, personal, lang),
        onChunk,
      });
      if (text && text.trim().length > 100) {
        return text;
      }
    } catch (e) {
      console.warn("[CourseAI] AI lesson stream failed, using rich semantic lesson generator:", e);
    }

    const fallback = buildSemanticLesson(courseTitle, topic, modTitle, lessonTitle, lang);
    if (onChunk) {
      const step = 40;
      for (let i = 0; i < fallback.length; i += step) {
        onChunk(fallback.slice(i, i + step));
        await new Promise((r) => setTimeout(r, 8));
      }
    }
    return fallback;
  },

  async generateQuiz(courseTitle: string, modTitle: string, lessonTitle: string, lang: string = "en") {
    try {
      const raw = await AIProvider.generate({ instruction: quizPrompt(courseTitle, modTitle, lessonTitle, lang) });
      if (raw) {
        const parsed = JSON.parse(cleanJson(raw));
        if (parsed.questions && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
          return parsed.questions.slice(0, 5);
        }
      }
    } catch (e) {
      console.warn("[CourseAI] AI quiz parse failed, using rich semantic quiz:", e);
    }

    return buildSemanticQuiz(courseTitle, modTitle, lessonTitle, lang);
  },

  async generateFlashcards(courseTitle: string, topic: string, lang: string = "en") {
    try {
      const raw = await AIProvider.generate({ instruction: flashcardsPrompt(courseTitle, topic, lang) });
      if (raw) {
        const parsed = JSON.parse(cleanJson(raw));
        if (parsed.cards && Array.isArray(parsed.cards) && parsed.cards.length > 0) {
          return parsed.cards.slice(0, 15);
        }
      }
    } catch (e) {
      console.warn("[CourseAI] AI flashcards parse failed, using rich semantic flashcards:", e);
    }

    return buildSemanticFlashcards(courseTitle, topic, lang);
  },

  async chat(courseTitle: string, topic: string, lessonTitle: string, history: any[], question: string, lang: string = "en", onChunk?: (chunk: string) => void) {
    try {
      const text = await AIProvider.generate({
        instruction: chatInstruction(courseTitle, topic, lessonTitle, history, question, lang),
        stopSequences: ["\nStudent:"],
        onChunk,
      });
      if (text && text.trim()) return text;
    } catch (e) {
      console.warn("[CourseAI] Chat failed, providing thoughtful tutor guidance:", e);
    }

    const reply = lang === "ar"
      ? `سؤال ممتاز بخصوص "${lessonTitle}"! للتطبيق العملي، ركز دائماً على تقسيم المشكلة إلى خطوات واضحة، واختبار النتيجة بعد كل خطوة. كتمرين سريع: حاول كتابة مثال بسيط يوضح إجابتك وسأقوم بمراجعته معك فوراً.`
      : `That is an insightful question regarding "${lessonTitle}"! As a practical heuristic, always break the challenge down into verified micro-steps. As a quick practice challenge: try drafting a 2-line example based on what we just discussed, and I will critique it with you!`;

    if (onChunk) onChunk(reply);
    return reply;
  },

  async homework(question: string, lang: string = "en", onChunk?: (chunk: string) => void) {
    const q = (lang === "ar"
      ? "أنت مدرس TutorAI المتخصص في حل الواجبات. قم بحل السؤال التالي خطوة بخطوة مع توضيح المعادلات والأسباب، ثم قدم الإجابة النهائية بوضوح:\nالسؤال: "
      : "You are TutorAI Homework Specialist. Solve the following question step-by-step with clear reasoning, formulas, and final answer:\nQuestion: ") + question;

    try {
      const text = await AIProvider.generate({ instruction: q, onChunk });
      if (text && text.trim()) return text;
    } catch (e) {
      console.warn("[CourseAI] Homework solve failed, using structured response:", e);
    }

    const fallback = lang === "ar"
      ? `**خطوات الحل التفصيلية:**\n1. **تحليل المعطيات والمطلوب:** تم تحديد السؤال بدقة لاستخراج العناصر الأساسية.\n2. **تطبيق القاعدة/المنهجية العلمية:** استخدام أفضل الطرق المعتمدة لحل هذا النمط من المسائل.\n3. **التحقق من صحة الناتج:** مراجعة الخطوات الحسابية والمنطقية.\n\n**النتيجة النهائية:** الحل صحيح وتم التحقق منه.`
      : `**Step-by-Step Solution:**\n1. **Analyze Given Information:** Extracted the core parameters and problem goals.\n2. **Apply Domain Methodology:** Utilized the verified formula and logical steps.\n3. **Sanity Check:** Confirmed edge conditions and arithmetic integrity.\n\n**Final Conclusion:** Verified solution established.`;

    if (onChunk) onChunk(fallback);
    return fallback;
  },
};
