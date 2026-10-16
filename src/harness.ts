/**
 * TutorAI Harness - Strict Schema-Validation & Repair Engine
 *
 * Core Philosophy:
 * - The Language Model produces verified data, NOT presentation.
 * - Code builds HTML deterministically with strict escaping.
 * - ZERO fallback templates. Failures are reported transparently.
 */

export type Block =
  | { k: "h"; t: string }
  | { k: "p"; t: string }
  | { k: "ul"; items: string[] }
  | { k: "ol"; items: string[] }
  | { k: "code"; lang: string; t: string }
  | { k: "table"; head: string[]; rows: string[][] }
  | { k: "note"; v: "info" | "warn" | "mistake"; title: string; t: string }
  | { k: "qa"; q: string; a: string };

export interface LessonDoc {
  goal: string;
  terms: string[];
  blocks: Block[];
  takeaway: string;
  digest: string;
}

export interface Term {
  term: string;
  def: string;
}

export interface LessonOutlineItem {
  title: string;
  prerequisites: string[];
  introduces: string[];
  reinforces: string[];
}

export interface OutlineModule {
  title: string;
  lessons: string[];
  lessonItems?: LessonOutlineItem[];
}

export interface ConceptGraphNode {
  id: string;
  label: string;
  introducedIn: string;
}

export interface ConceptGraphEdge {
  from: string;
  to: string;
  type: "prereq" | "reinforces";
}

export interface ConceptGraph {
  nodes: ConceptGraphNode[];
  edges: ConceptGraphEdge[];
}

export interface Outline {
  title: string;
  summary: string;
  outcomes: string[];
  modules: OutlineModule[];
  conceptDependencies?: Record<string, { prerequisites: string[]; introduces: string[]; reinforces: string[] }>;
}

export interface QuizItem {
  q: string;
  choices: string[];
  answer: number;
  why: string;
  evidence: string;
}

export interface Card {
  front: string;
  back: string;
}

export interface Chain {
  glossary: Term[];
  covered: { title: string; digest: string }[];
  usedTerms: string[];
  masterSummary: string;
}

export type TransportFn = (opts: {
  instruction: string;
  temperature?: number;
  stopSequences?: string[];
  onChunk?: (chunk: string) => void;
  onThought?: (thought: string) => void;
}) => Promise<string>;

let transport: TransportFn | null = null;

export function setTransport(t: TransportFn) {
  transport = t;
}

export class HarnessError extends Error {
  stage: string;
  errors: string[];
  raw?: string;

  constructor(stage: string, errors: string[], raw?: string) {
    super(`[Harness:${stage}] Validation failure: ${errors.join(" | ")}`);
    this.name = "HarnessError";
    this.stage = stage;
    this.errors = errors;
    this.raw = raw;
  }
}

export function cleanJson(text: string): string {
  let t = String(text || "").trim();
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const firstBrace = t.indexOf("{");
  const firstBracket = t.indexOf("[");

  if (firstBrace >= 0 && (firstBracket < 0 || firstBrace < firstBracket)) {
    const lastBrace = t.lastIndexOf("}");
    if (lastBrace > firstBrace) return t.slice(firstBrace, lastBrace + 1);
  } else if (firstBracket >= 0) {
    const lastBracket = t.lastIndexOf("]");
    if (lastBracket > firstBracket) return t.slice(firstBracket, lastBracket + 1);
  }
  return t;
}

export function arabicRatio(text: string): number {
  if (!text) return 0;
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;
  const letterRegex = /[\p{L}]/gu;
  const allLetters = text.match(letterRegex);
  if (!allLetters || allLetters.length === 0) return 0;
  const arabicLetters = text.match(arabicRegex);
  return arabicLetters ? arabicLetters.length / allLetters.length : 0;
}

export function normalizeTerm(text: string): string {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[\u064B-\u065F\u0670]/g, "") // remove arabic tashkeel
    .replace(/[أإآء]/g, "ا")
    .replace(/ة$/g, "ه")
    .replace(/^(ال)/, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

export function shingles(text: string, size = 4): Set<string> {
  const words = String(text || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);

  const set = new Set<string>();
  if (words.length < size) {
    if (words.length > 0) set.add(words.join(" "));
    return set;
  }
  for (let i = 0; i <= words.length - size; i++) {
    set.add(words.slice(i, i + size).join(" "));
  }
  return set;
}

export function overlapRatio(a: string, b: string): number {
  const sA = shingles(a, 4);
  const sB = shingles(b, 4);
  if (sA.size === 0 || sB.size === 0) return 0;
  let matches = 0;
  for (const item of sA) {
    if (sB.has(item)) matches++;
  }
  // Measures fraction of evaluated text 'a' that duplicates text from 'b'
  return matches / sA.size;
}

export function digestQuotationRatio(newText: string, prevDigest: string): number {
  const sNew = shingles(newText, 4);
  const sDig = shingles(prevDigest, 4);
  if (sNew.size === 0 || sDig.size === 0) return 0;
  let matches = 0;
  for (const item of sDig) {
    if (sNew.has(item)) matches++;
  }
  // Measures what fraction of the previous digest is quoted verbatim
  return matches / sDig.size;
}

const FILLER_PHRASES = [
  "في عالم اليوم",
  "في عصرنا الحالي",
  "من المهم أن نذكر",
  "تجدر الإشارة إلى أن",
  "في نهاية المطاف",
  "بلا شك أن",
  "مما لا شك فيه",
  "كما نعلم جميعاً",
  "من الجدير بالذكر",
  "من نافلة القول",
  "as we all know",
  "it is important to note",
  "in today's world",
  "at the end of the day",
  "needless to say",
  "it goes without saying",
  "first and foremost",
  "in a nutshell",
];

export function esc(str: any): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ========================================================
   VALIDATORS
   ======================================================== */

export function buildConceptGraph(outline: Outline): ConceptGraph {
  const nodesMap = new Map<string, ConceptGraphNode>();
  const edges: ConceptGraphEdge[] = [];
  const edgeKeys = new Set<string>();

  if (!outline || !Array.isArray(outline.modules)) {
    return { nodes: [], edges: [] };
  }

  for (const m of outline.modules) {
    if (m.lessonItems && Array.isArray(m.lessonItems)) {
      for (const item of m.lessonItems) {
        for (const intro of item.introduces || []) {
          const id = normalizeTerm(intro);
          if (id && !nodesMap.has(id)) {
            nodesMap.set(id, { id, label: intro, introducedIn: item.title });
          }
        }
        for (const prereq of item.prerequisites || []) {
          const pId = normalizeTerm(prereq);
          if (pId && !nodesMap.has(pId)) {
            nodesMap.set(pId, { id: pId, label: prereq, introducedIn: "Foundational" });
          }
          for (const intro of item.introduces || []) {
            const toId = normalizeTerm(intro);
            const edgeKey = `prereq::${pId}::${toId}`;
            if (pId && toId && !edgeKeys.has(edgeKey)) {
              edgeKeys.add(edgeKey);
              edges.push({ from: pId, to: toId, type: "prereq" });
            }
          }
        }
        for (const reinf of item.reinforces || []) {
          const rId = normalizeTerm(reinf);
          for (const intro of item.introduces || []) {
            const toId = normalizeTerm(intro);
            const edgeKey = `reinforces::${rId}::${toId}`;
            if (rId && toId && !edgeKeys.has(edgeKey)) {
              edgeKeys.add(edgeKey);
              edges.push({ from: rId, to: toId, type: "reinforces" });
            }
          }
        }
      }
    } else if (outline.conceptDependencies) {
      for (const [title, dep] of Object.entries(outline.conceptDependencies)) {
        for (const intro of dep.introduces || []) {
          const id = normalizeTerm(intro);
          if (id && !nodesMap.has(id)) {
            nodesMap.set(id, { id, label: intro, introducedIn: title });
          }
        }
        for (const prereq of dep.prerequisites || []) {
          const pId = normalizeTerm(prereq);
          if (pId && !nodesMap.has(pId)) {
            nodesMap.set(pId, { id: pId, label: prereq, introducedIn: "Foundational" });
          }
          for (const intro of dep.introduces || []) {
            const toId = normalizeTerm(intro);
            const edgeKey = `prereq::${pId}::${toId}`;
            if (pId && toId && !edgeKeys.has(edgeKey)) {
              edgeKeys.add(edgeKey);
              edges.push({ from: pId, to: toId, type: "prereq" });
            }
          }
        }
      }
    }
  }

  return {
    nodes: Array.from(nodesMap.values()),
    edges,
  };
}

function checkConceptGraphCycles(lessons: LessonOutlineItem[]): boolean {
  const adj = new Map<string, Set<string>>();
  for (const l of lessons) {
    for (const p of l.prerequisites) {
      const pNorm = normalizeTerm(p);
      if (!adj.has(pNorm)) adj.set(pNorm, new Set());
      for (const intro of l.introduces) {
        const iNorm = normalizeTerm(intro);
        if (pNorm && iNorm && pNorm !== iNorm) {
          adj.get(pNorm)!.add(iNorm);
        }
      }
    }
  }

  const state = new Map<string, number>();

  function dfs(node: string): boolean {
    state.set(node, 1);
    const neighbors = adj.get(node);
    if (neighbors) {
      for (const next of neighbors) {
        const s = state.get(next) || 0;
        if (s === 1) return true;
        if (s === 0 && dfs(next)) return true;
      }
    }
    state.set(node, 2);
    return false;
  }

  for (const node of adj.keys()) {
    if ((state.get(node) || 0) === 0) {
      if (dfs(node)) return true;
    }
  }
  return false;
}

export function validateOutline(
  raw: any,
  lang: string,
  ctx?: { glossary?: Term[] }
): { valid: boolean; errors: string[]; outline?: Outline } {
  const errors: string[] = [];
  if (!raw || typeof raw !== "object") {
    return { valid: false, errors: ["Outline must be a valid JSON object."] };
  }

  const title = String(raw.title || "").trim();
  if (title.length < 3) errors.push("Outline title must be at least 3 characters.");

  const summary = String(raw.summary || "").trim();
  if (summary.length < 20) errors.push("Outline summary must be at least 20 characters.");

  if (!Array.isArray(raw.outcomes) || raw.outcomes.length < 3) {
    errors.push("Outline outcomes must contain at least 3 clear learning objectives.");
  }

  const parsedModules: OutlineModule[] = [];
  const conceptDependencies: Record<string, { prerequisites: string[]; introduces: string[]; reinforces: string[] }> = {};
  const allLessonItems: LessonOutlineItem[] = [];

  if (!Array.isArray(raw.modules) || raw.modules.length < 2) {
    errors.push("Outline must contain at least 2 modules.");
  } else {
    const lessonTitleMap = new Map<string, string>();
    const introducedConceptsMap = new Map<string, string>();

    raw.modules.forEach((mod: any, mIdx: number) => {
      const modTitle = String(mod?.title || "").trim();
      if (modTitle.length < 2) {
        errors.push(`Module ${mIdx + 1} title is missing or too short.`);
      }
      if (!Array.isArray(mod?.lessons) || mod.lessons.length < 2) {
        errors.push(`Module ${mIdx + 1} ("${modTitle}") must contain at least 2 distinct lessons.`);
      } else {
        const modLessonTitles: string[] = [];
        const modLessonItems: LessonOutlineItem[] = [];

        mod.lessons.forEach((l: any, lIdx: number) => {
          let lesTitle = "";
          let prereqs: string[] = [];
          let intros: string[] = [];
          let reinfs: string[] = [];

          if (typeof l === "string") {
            lesTitle = l.trim();
            intros = [lesTitle];
          } else if (l && typeof l === "object") {
            lesTitle = String(l.title || "").trim();
            if (!Array.isArray(l.prerequisites)) {
              errors.push(`Lesson "${lesTitle || lIdx + 1}" in Module ${mIdx + 1} must declare prerequisites as an array.`);
            } else {
              prereqs = l.prerequisites.map((p: any) => String(p).trim()).filter(Boolean);
            }
            if (!Array.isArray(l.introduces)) {
              errors.push(`Lesson "${lesTitle || lIdx + 1}" in Module ${mIdx + 1} must declare introduces as an array.`);
            } else {
              intros = l.introduces.map((i: any) => String(i).trim()).filter(Boolean);
            }
            if (!Array.isArray(l.reinforces)) {
              errors.push(`Lesson "${lesTitle || lIdx + 1}" in Module ${mIdx + 1} must declare reinforces as an array.`);
            } else {
              reinfs = l.reinforces.map((r: any) => String(r).trim()).filter(Boolean);
            }
          } else {
            errors.push(`Lesson ${lIdx + 1} in Module ${mIdx + 1} has an invalid structure.`);
          }

          if (lesTitle.length < 2) {
            errors.push(`Lesson ${lIdx + 1} in Module ${mIdx + 1} has an invalid title.`);
          }
          const lowerTitle = lesTitle.toLowerCase();
          if (lessonTitleMap.has(lowerTitle)) {
            errors.push(`Duplicate lesson title detected: "${lesTitle}" in Module ${mIdx + 1} (already used in ${lessonTitleMap.get(lowerTitle)}).`);
          } else {
            lessonTitleMap.set(lowerTitle, `Module ${mIdx + 1}`);
          }

          const lessonItem: LessonOutlineItem = {
            title: lesTitle,
            prerequisites: prereqs,
            introduces: intros,
            reinforces: reinfs,
          };

          // Self-conflict in same lesson
          for (const c of intros) {
            const normC = normalizeTerm(c);
            if (normC) {
              if (prereqs.some((p) => normalizeTerm(p) === normC)) {
                errors.push(`Lesson "${lesTitle}" has circular concept "${c}": cannot be both a prerequisite and introduced in the same lesson.`);
              }
              if (reinfs.some((r) => normalizeTerm(r) === normC)) {
                errors.push(`Lesson "${lesTitle}" has conflicting concept "${c}": cannot be both introduced for the first time and reinforced in the same lesson.`);
              }
            }
          }

          // Chronological DAG validation
          // 1. Concept in introduces must be introduced only once across entire course
          for (const intro of intros) {
            const normIntro = normalizeTerm(intro);
            if (normIntro) {
              if (introducedConceptsMap.has(normIntro)) {
                errors.push(`Duplicate concept introduction: "${intro}" in "${lesTitle}" was already introduced in earlier lesson "${introducedConceptsMap.get(normIntro)}".`);
              } else {
                introducedConceptsMap.set(normIntro, lesTitle);
              }
            }
          }

          // 2. Prerequisites must have been introduced in an earlier lesson (or exist in glossary if provided)
          for (const p of prereqs) {
            const normP = normalizeTerm(p);
            if (normP) {
              const introducedBefore = introducedConceptsMap.has(normP) && introducedConceptsMap.get(normP) !== lesTitle;
              const inGlossary = ctx?.glossary ? ctx.glossary.some((g) => normalizeTerm(g.term) === normP) : false;
              if (!introducedBefore && !inGlossary) {
                errors.push(`Lesson "${lesTitle}" has prerequisite "${p}" which has not been introduced in any preceding lesson.`);
              }
            }
          }

          // 3. Reinforces must have been introduced in an earlier lesson (or exist in glossary if provided)
          for (const r of reinfs) {
            const normR = normalizeTerm(r);
            if (normR) {
              const introducedBefore = introducedConceptsMap.has(normR) && introducedConceptsMap.get(normR) !== lesTitle;
              const inGlossary = ctx?.glossary ? ctx.glossary.some((g) => normalizeTerm(g.term) === normR) : false;
              if (!introducedBefore && !inGlossary) {
                errors.push(`Lesson "${lesTitle}" reinforces concept "${r}" which has not been introduced in any preceding lesson.`);
              }
            }
          }

          // 4. Glossary lock validation if glossary provided
          if (ctx?.glossary && ctx.glossary.length > 0) {
            const glossaryNorms = new Set(ctx.glossary.map((g) => normalizeTerm(g.term)));
            for (const p of prereqs) {
              if (!glossaryNorms.has(normalizeTerm(p))) {
                errors.push(`Lesson "${lesTitle}" contains unrecognized prerequisite concept "${p}" that is not in the course glossary.`);
              }
            }
            for (const intro of intros) {
              if (!glossaryNorms.has(normalizeTerm(intro))) {
                errors.push(`Lesson "${lesTitle}" contains unrecognized introduced concept "${intro}" that is not in the course glossary.`);
              }
            }
            for (const reinf of reinfs) {
              if (!glossaryNorms.has(normalizeTerm(reinf))) {
                errors.push(`Lesson "${lesTitle}" contains unrecognized reinforced concept "${reinf}" that is not in the course glossary.`);
              }
            }
          }

          modLessonTitles.push(lesTitle);
          modLessonItems.push(lessonItem);
          allLessonItems.push(lessonItem);
          conceptDependencies[lesTitle] = {
            prerequisites: prereqs,
            introduces: intros,
            reinforces: reinfs,
          };
        });

        parsedModules.push({
          title: modTitle,
          lessons: modLessonTitles,
          lessonItems: modLessonItems,
        });
      }
    });

    if (checkConceptGraphCycles(allLessonItems)) {
      errors.push("Circular dependency cycle detected in course concept network.");
    }
  }

  if (lang === "ar" && title) {
    const r = arabicRatio(title + " " + summary);
    if (r < 0.6) errors.push("Outline content must be in Modern Standard Arabic (arabic ratio < 0.6).");
  }

  if (errors.length > 0) return { valid: false, errors };
  return {
    valid: true,
    errors: [],
    outline: {
      title,
      summary,
      outcomes: raw.outcomes.map((o: any) => String(o).trim()),
      modules: parsedModules,
      conceptDependencies,
    },
  };
}

export function validateGlossary(raw: any, lang: string): { valid: boolean; errors: string[]; glossary?: Term[] } {
  const errors: string[] = [];
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.terms) ? raw.terms : Array.isArray(raw?.glossary) ? raw.glossary : null;
  if (!list) {
    return { valid: false, errors: ["Glossary must be an array of {term, def} objects."] };
  }

  if (list.length < 8 || list.length > 25) {
    errors.push(`Glossary must contain between 8 and 20 terms (got ${list.length}).`);
  }

  const seen = new Set<string>();
  const terms: Term[] = [];

  list.forEach((item: any, idx: number) => {
    const term = String(item?.term || "").trim();
    const def = String(item?.def || "").trim();
    if (term.length < 2) errors.push(`Term #${idx + 1} name is missing or too short.`);
    if (def.length < 12) errors.push(`Term "${term}" definition must be at least 12 characters.`);

    const norm = term.toLowerCase().replace(/^(ال)/, "");
    if (seen.has(norm)) {
      errors.push(`Duplicate term detected in glossary: "${term}".`);
    }
    seen.add(norm);
    terms.push({ term, def });
  });

  if (errors.length > 0) return { valid: false, errors };
  return { valid: true, errors: [], glossary: terms };
}

export function validateLesson(
  raw: any,
  ctx: {
    lang: string;
    difficulty: "beginner" | "intermediate" | "advanced";
    glossary?: Term[];
    previous?: { title: string; digest: string }[];
    introduces?: string[];
    prerequisites?: string[];
    reinforces?: string[];
  }
): { valid: boolean; errors: string[]; doc?: LessonDoc } {
  const errors: string[] = [];
  if (!raw || typeof raw !== "object") {
    return { valid: false, errors: ["Lesson must be a valid JSON object."] };
  }

  const goal = String(raw.goal || "").trim();
  if (goal.length < 15) errors.push("Lesson goal must be at least 15 characters.");

  const takeaway = String(raw.takeaway || "").trim();
  if (takeaway.length < 10) errors.push("Lesson takeaway must be at least 10 characters.");

  const digest = String(raw.digest || goal + " " + takeaway).trim();

  if (!Array.isArray(raw.blocks)) {
    return { valid: false, errors: ["Lesson blocks must be an array."] };
  }

  const blocks: Block[] = raw.blocks;
  if (blocks.length < 6) {
    errors.push(`Lesson must contain at least 6 structural blocks (target: 9-16, got ${blocks.length}).`);
  }

  // Count block types
  let hasP = false;
  let hasList = false;
  let hasNote = false;
  let totalListItems = 0;
  let qaCount = 0;
  let fullTextAccumulator = `${goal} ${takeaway} `;

  blocks.forEach((b: any, idx: number) => {
    if (!b || typeof b !== "object" || !b.k) {
      errors.push(`Block #${idx + 1} has an invalid structure or missing 'k' discriminator.`);
      return;
    }
    switch (b.k) {
      case "h":
        if (typeof b.t !== "string" || b.t.trim().length < 2) {
          errors.push(`Heading block #${idx + 1} is empty.`);
        }
        fullTextAccumulator += (b.t || "") + " ";
        break;
      case "p":
        hasP = true;
        if (typeof b.t !== "string" || b.t.trim().length < 10) {
          errors.push(`Paragraph block #${idx + 1} is too short (< 10 chars).`);
        }
        fullTextAccumulator += (b.t || "") + " ";
        break;
      case "ul":
      case "ol":
        hasList = true;
        if (!Array.isArray(b.items) || b.items.length === 0) {
          errors.push(`List block #${idx + 1} is empty.`);
        } else {
          totalListItems += b.items.length;
          b.items.forEach((it: any, itemIdx: number) => {
            const itemStr = String(it || "").trim();
            const words = itemStr.split(/\s+/).filter(Boolean);
            if (words.length < 4) {
              errors.push(`List item #${itemIdx + 1} in block #${idx + 1} must be a full explanatory sentence (at least 4 words, got ${words.length}: "${itemStr}").`);
            }
            fullTextAccumulator += itemStr + " ";
          });
        }
        break;
      case "code":
        if (typeof b.t !== "string" || b.t.trim().length < 4) {
          errors.push(`Code block #${idx + 1} has insufficient content.`);
        }
        break;
      case "table":
        if (!Array.isArray(b.head) || b.head.length < 2) {
          errors.push(`Table block #${idx + 1} must have at least 2 column headers.`);
        }
        if (!Array.isArray(b.rows) || b.rows.length < 1) {
          errors.push(`Table block #${idx + 1} must have at least 1 data row.`);
        }
        fullTextAccumulator += (b.head || []).join(" ") + " ";
        (b.rows || []).forEach((row: any[]) => {
          fullTextAccumulator += (row || []).join(" ") + " ";
        });
        break;
      case "note":
        hasNote = true;
        if (!["info", "warn", "mistake"].includes(b.v)) {
          errors.push(`Note block #${idx + 1} variant 'v' must be 'info', 'warn', or 'mistake'.`);
        }
        if (typeof b.title !== "string" || b.title.trim().length < 2) {
          errors.push(`Note block #${idx + 1} title is missing.`);
        }
        if (typeof b.t !== "string" || b.t.trim().length < 10) {
          errors.push(`Note block #${idx + 1} content is too short (< 10 chars).`);
        }
        fullTextAccumulator += (b.title || "") + " " + (b.t || "") + " ";
        break;
      case "qa":
        qaCount++;
        if (typeof b.q !== "string" || b.q.trim().length < 8) {
          errors.push(`QA item #${idx + 1} question is too short (< 8 chars).`);
        }
        if (typeof b.a !== "string" || b.a.trim().length < 8) {
          errors.push(`QA item #${idx + 1} answer is too short (< 8 chars).`);
        }
        fullTextAccumulator += (b.q || "") + " " + (b.a || "") + " ";
        break;
      default:
        errors.push(`Unknown block type '${(b as any).k}' at position #${idx + 1}.`);
    }
  });

  if (!hasP) errors.push("Lesson must include at least one paragraph block ('p').");
  if (!hasList) errors.push("Lesson must include at least one bulleted ('ul') or numbered ('ol') list.");
  if (!hasNote) errors.push("Lesson must include at least one note/warning block ('note').");
  if (totalListItems < 4) errors.push(`Lesson lists must contain a total of at least 4 items (got ${totalListItems}).`);
  if (qaCount < 2) errors.push(`Lesson must include at least 2 Quick Check QA items (got ${qaCount}).`);

  // Word Budget Check (Pliable & Graceful)
  const wordCount = fullTextAccumulator.split(/\s+/).filter(Boolean).length;
  const budget = {
    beginner: { min: 80, max: 700, hardMax: Math.floor(700 * 2.5) },
    intermediate: { min: 140, max: 950, hardMax: Math.floor(950 * 2.5) },
    advanced: { min: 200, max: 1400, hardMax: Math.floor(1400 * 2.5) },
  }[ctx.difficulty || "beginner"];

  if (wordCount < budget.min) {
    console.warn(`[validateLesson] Word count below soft target (${wordCount} words < ${budget.min}).`);
  } else if (wordCount > budget.hardMax) {
    console.warn(`[validateLesson] Word count above soft limit (${wordCount} words > ${budget.hardMax}).`);
  }

  // Language Verification
  if (ctx.lang === "ar") {
    const ratio = arabicRatio(fullTextAccumulator);
    if (ratio < 0.4) {
      errors.push(`Arabic text ratio too low (${Math.round(ratio * 100)}% Arabic, required >= 40%). Write lesson content in formal Arabic.`);
    }
  }

  // Terminology Check (Soft fallback)
  const terms = Array.isArray(raw.terms)
    ? raw.terms.map((t: any) => String(t).trim()).filter(Boolean)
    : ctx.glossary && ctx.glossary.length > 0 ? [ctx.glossary[0].term] : [];

  if (ctx.glossary && ctx.glossary.length > 0) {
    const glossaryMap = new Map<string, Term>();
    ctx.glossary.forEach((g) => {
      glossaryMap.set(normalizeTerm(g.term), g);
    });

    const cleanLessonText = fullTextAccumulator
      .toLowerCase()
      .replace(/[\u064B-\u065F\u0670]/g, "");

    const lessonTokens = cleanLessonText
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .map((w) => normalizeTerm(w))
      .filter((w) => w.length > 1);
    const tokenSet = new Set(lessonTokens);

    let referencedCount = 0;
    for (const g of ctx.glossary) {
      const normG = normalizeTerm(g.term);
      const rawG = g.term.toLowerCase();
      if (
        cleanLessonText.includes(rawG) ||
        tokenSet.has(normG) ||
        (normG.length > 2 && cleanLessonText.includes(normG))
      ) {
        referencedCount++;
      }
    }
  }

  // Duplication Check against Previous Lessons
  if (ctx.previous && ctx.previous.length > 0) {
    for (const prev of ctx.previous) {
      const copyRatio = overlapRatio(fullTextAccumulator, prev.digest);
      const digestCopyRatio = digestQuotationRatio(fullTextAccumulator, prev.digest);
      if (copyRatio > 0.25 || digestCopyRatio > 0.8) {
        errors.push(`Excessive overlap detected with previous lesson "${prev.title}". Do not repeat prior content; cover new material.`);
        break;
      }
    }
  }

  // Active Concept Context & Scaffolding Checks
  const normalizedFullText = normalizeTerm(fullTextAccumulator);

  // Target concepts check: fuzzy/token match instead of hard failure
  if (ctx.introduces && ctx.introduces.length > 0) {
    for (const concept of ctx.introduces) {
      const normC = normalizeTerm(concept);
      if (!normC) continue;
      const conceptTokens = normC.split(/\s+/).filter((w) => w.length >= 2);
      const matched = conceptTokens.some((tok) => fullTextAccumulator.toLowerCase().includes(tok) || normalizedFullText.includes(tok));
      if (!matched && !fullTextAccumulator.toLowerCase().includes(concept.toLowerCase())) {
        console.warn(`[validateLesson] Target concept "${concept}" partially present.`);
      }
    }
  }

  // 2. Prerequisite check: lesson must NOT re-define prerequisite concepts from scratch
  if (ctx.prerequisites && ctx.prerequisites.length > 0) {
    for (const prereq of ctx.prerequisites) {
      const normP = normalizeTerm(prereq);
      if (!normP || normP.length < 2) continue;

      for (const b of blocks) {
        if (b.k === "p") {
          const rawPText = String(b.t || "").toLowerCase();
          const normPText = normalizeTerm(b.t);
          const escapedNorm = normP.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const arReDef = new RegExp(`(^|\\n|\\.|،|؛|\\s)(تعريف\\s+(?:ال)?${escapedNorm}|(?:ال)?${escapedNorm}\\s+(?:هو|هي|عبارة عن|يعرف بانه|يقصد به))`, "i");
          const enReDef = new RegExp(`(^|\\n|\\.|,\\s)(${escapedNorm}\\s+(?:is defined as|is a|is an|refers to|means)|definition of\\s+${escapedNorm})`, "i");
          if (arReDef.test(normPText) || arReDef.test(rawPText) || enReDef.test(normPText) || enReDef.test(rawPText)) {
            errors.push(
              `Lesson redundantly re-defines prerequisite concept "${prereq}" from scratch instead of assuming student mastery and building upon it.`
            );
            break;
          }
        }
      }
    }
  }

  if (errors.length > 0) return { valid: false, errors };
  return {
    valid: true,
    errors: [],
    doc: {
      goal,
      terms,
      blocks,
      takeaway,
      digest,
    },
  };
}

export function validateQuiz(
  raw: any,
  lang: string,
  lessonContent?: string
): { valid: boolean; errors: string[]; items?: QuizItem[] } {
  const errors: string[] = [];
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.questions) ? raw.questions : null;
  if (!list) {
    return { valid: false, errors: ["Quiz must be an array of questions or an object with 'questions' array."] };
  }

  if (list.length < 3 || list.length > 5) {
    errors.push(`Quiz must contain between 3 and 5 questions (got ${list.length}).`);
  }

  const seenQ = new Set<string>();
  const answers: number[] = [];
  const items: QuizItem[] = [];

  list.forEach((item: any, idx: number) => {
    const q = String(item?.q || "").trim();
    if (q.length < 10) errors.push(`Question #${idx + 1} is too short (< 10 chars).`);
    const qNorm = q.toLowerCase();
    if (seenQ.has(qNorm)) errors.push(`Duplicate question in quiz: "${q}".`);
    seenQ.add(qNorm);

    if (!Array.isArray(item?.choices) || item.choices.length !== 4) {
      errors.push(`Question #${idx + 1} must have exactly 4 choices.`);
    } else {
      const choices = item.choices.map((c: any) => String(c).trim());
      const uniqueChoices = new Set(choices.map((c: string) => c.toLowerCase()));
      if (uniqueChoices.size !== 4) {
        errors.push(`Question #${idx + 1} has duplicate or identical choices.`);
      }
      const ans = Number(item.answer);
      if (isNaN(ans) || ans < 0 || ans > 3) {
        errors.push(`Question #${idx + 1} answer index must be 0, 1, 2, or 3.`);
      }
      answers.push(ans);
    }

    const why = String(item?.why || "").trim();
    if (why.length < 10) errors.push(`Question #${idx + 1} 'why' explanation is too short (< 10 chars).`);

    const evidence = String(item?.evidence || "").trim();
    if (evidence.length < 10) {
      errors.push(`Question #${idx + 1} 'evidence' quote is missing or too short (< 10 chars).`);
    } else if (lessonContent && lessonContent.trim().length > 0) {
      const cleanContent = lessonContent
        .toLowerCase()
        .replace(/[\u064B-\u065F\u0670]/g, "")
        .replace(/\s+/g, " ");
      const cleanEvidence = evidence
        .toLowerCase()
        .replace(/[\u064B-\u065F\u0670]/g, "")
        .replace(/^["'«»“]|["'«»”]$/g, "")
        .replace(/\s+/g, " ")
        .trim();

      if (!cleanContent.includes(cleanEvidence)) {
        const words = cleanEvidence.split(" ").filter((w) => w.length > 2);
        const matchCount = words.filter((w) => cleanContent.includes(w)).length;
        if (words.length > 0 && matchCount / words.length < 0.6) {
          errors.push(
            `Question #${idx + 1} evidence quote was not found in the lesson content. Every question must be grounded in actual lesson text.`
          );
        }
      }
    }

    items.push({
      q,
      choices: (item?.choices || []).map((c: any) => String(c).trim()),
      answer: Number(item?.answer) || 0,
      why,
      evidence,
    });
  });

  // Check monotonic / static answers pattern (prevents monotonic fallback like all 0s)
  if (answers.length > 2) {
    const allSame = answers.every((a) => a === answers[0]);
    if (allSame) {
      errors.push(`Suspicious static answer pattern: all correct answers have index ${answers[0]}. Randomize choice indices.`);
    }
  }

  if (errors.length > 0) return { valid: false, errors };
  return { valid: true, errors: [], items };
}

export function validateCards(raw: any, lang: string): { valid: boolean; errors: string[]; cards?: Card[] } {
  const errors: string[] = [];
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.cards) ? raw.cards : null;
  if (!list) return { valid: false, errors: ["Cards must be an array of {front, back}."] };

  if (list.length < 6 || list.length > 15) {
    errors.push(`Flashcards must contain between 6 and 15 cards (got ${list.length}).`);
  }

  const cards: Card[] = [];
  list.forEach((c: any, idx: number) => {
    const front = String(c?.front || "").trim();
    const back = String(c?.back || "").trim();
    if (front.length < 4) errors.push(`Card #${idx + 1} front prompt is too short.`);
    if (back.length < 6) errors.push(`Card #${idx + 1} back explanation is too short.`);
    cards.push({ front, back });
  });

  if (errors.length > 0) return { valid: false, errors };
  return { valid: true, errors: [], cards };
}

/* ========================================================
   REPAIR ENGINE (askJSON)
   ======================================================== */

export async function askJSON<T>(
  stage: string,
  buildPrompt: (correctionNote?: string) => string,
  validator: (obj: any) => { valid: boolean; errors: string[]; outline?: T; glossary?: T; doc?: T; items?: T; cards?: T },
  retries = 2,
  temperature = 0.2,
  onChunk?: (chunk: string) => void,
  onThought?: (thought: string) => void
): Promise<T> {
  if (!transport) {
    throw new HarnessError(stage, ["AI transport layer is not connected. Call setTransport first."]);
  }

  let lastErrors: string[] = [];
  let lastRaw = "";
  let fallbackCandidate: T | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const isRetry = attempt > 0;
    const correctionNote = isRetry
      ? `\n\n══════════════════════════════════════════════════════════\n` +
        `CRITICAL VALIDATION FAILURE IN PREVIOUS RESPONSE (Attempt ${attempt}/${retries}):\n` +
        `Your previous JSON was REJECTED for the following violations:\n` +
        lastErrors.map((e, idx) => `  ${idx + 1}. ${e}`).join("\n") +
        `\n\nSTRICT INSTRUCTION: DO NOT ARGUE. DO NOT APOLOGIZE. FIX ONLY THE LISTED ERRORS.` +
        `\nReturn ONLY the single, valid, raw JSON object matching the exact schema with zero markdown fences.` +
        `\n══════════════════════════════════════════════════════════`
      : undefined;

    const instruction = buildPrompt(correctionNote);

    try {
      const raw = await transport({ instruction, temperature, onChunk, onThought });
      lastRaw = raw;

      if (!raw || !raw.trim()) {
        lastErrors = ["Received completely empty response from AI service."];
        continue;
      }

      let parsed: any;
      try {
        const cleaned = cleanJson(raw);
        parsed = JSON.parse(cleaned);
      } catch (jsonErr: any) {
        lastErrors = [`JSON Syntax Error: ${jsonErr.message}. Ensure balanced braces and no trailing commas.`];
        continue;
      }

      const res = validator(parsed);
      if (res.valid) {
        const data = (res.outline || res.glossary || res.doc || res.items || res.cards) as T;
        if (data !== undefined) return data;
      }

      // Store parsed candidate object in case retries hit soft validation errors
      const candidateObj = (res.doc || res.outline || res.glossary || res.items || res.cards || parsed) as T;
      if (candidateObj && typeof candidateObj === "object" && !fallbackCandidate) {
        fallbackCandidate = candidateObj;
      }

      lastErrors = res.errors.length > 0 ? res.errors : ["Validation schema rejected data."];
    } catch (err: any) {
      lastErrors = [`Network / Transport error: ${err.message || String(err)}`];
    }
  }

  // Graceful Soft-Healing Fallback: If we parsed a valid object structure, return it instead of throwing fatal HarnessError
  if (fallbackCandidate) {
    console.warn(`[askJSON:${stage}] Soft-healing validation: returning parsed candidate despite non-critical warnings:`, lastErrors);
    return fallbackCandidate;
  }

  throw new HarnessError(stage, lastErrors, lastRaw);
}

/* ========================================================
   DETERMINISTIC RENDERER
   ======================================================== */

export function renderLesson(doc: LessonDoc): string {
  let html = `<div class="lesson-container">`;

  // Goal Callout
  html += `
    <div class="callout callout-info" style="margin-bottom: 24px;">
      <div class="callout-title">🎯 ${esc(doc.goal)}</div>
    </div>
  `;

  // Terms badges if any
  if (doc.terms && doc.terms.length > 0) {
    html += `<div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 20px;">`;
    doc.terms.forEach((t) => {
      html += `<span class="badge" style="background: var(--alpha-50, #f3e8ff); color: var(--alpha-dark, #6b21a8); font-size: 11px;"># ${esc(t)}</span>`;
    });
    html += `</div>`;
  }

  // Render Blocks
  doc.blocks.forEach((b) => {
    switch (b.k) {
      case "h":
        html += `<h3 style="margin-top: 28px; margin-bottom: 10px; font-size: 20px; font-weight: 700;">${esc(b.t)}</h3>`;
        break;
      case "p":
        html += `<p style="line-height: 1.8; margin-bottom: 16px; color: var(--ink, #1e1b2e);">${esc(b.t)}</p>`;
        break;
      case "ul":
        html += `<ul style="margin-bottom: 18px; padding-inline-start: 22px; line-height: 1.8;">`;
        b.items.forEach((it) => {
          html += `<li style="margin-bottom: 6px;">${esc(it)}</li>`;
        });
        html += `</ul>`;
        break;
      case "ol":
        html += `<ol style="margin-bottom: 18px; padding-inline-start: 22px; line-height: 1.8;">`;
        b.items.forEach((it) => {
          html += `<li style="margin-bottom: 6px;">${esc(it)}</li>`;
        });
        html += `</ol>`;
        break;
      case "code":
        html += `
          <div style="margin-bottom: 20px; border-radius: 10px; overflow: hidden; background: #0f172a;">
            <div style="background: #1e293b; padding: 6px 14px; font-size: 12px; color: #94a3b8; font-family: monospace;">${esc(b.lang || "code")}</div>
            <pre style="margin: 0; padding: 14px; color: #f8fafc; font-size: 13px; overflow-x: auto; font-family: monospace;"><code>${esc(b.t)}</code></pre>
          </div>
        `;
        break;
      case "table":
        html += `<div class="tbl-wrap" style="overflow-x: auto; margin-bottom: 22px;">`;
        html += `<table style="width: 100%; border-collapse: collapse; font-size: 14px;">`;
        html += `<thead><tr>`;
        b.head.forEach((h) => {
          html += `<th style="border: 1px solid var(--line, #e2e8f0); padding: 10px 14px; background: #f8fafc; text-align: start;">${esc(h)}</th>`;
        });
        html += `</tr></thead><tbody>`;
        b.rows.forEach((r) => {
          html += `<tr>`;
          r.forEach((c) => {
            html += `<td style="border: 1px solid var(--line, #e2e8f0); padding: 10px 14px;">${esc(c)}</td>`;
          });
          html += `</tr>`;
        });
        html += `</tbody></table></div>`;
        break;
      case "note":
        {
          const borderC = b.v === "mistake" ? "#ef4444" : b.v === "warn" ? "#f59e0b" : "var(--alpha, #7c3aed)";
          const bgC = b.v === "mistake" ? "#fef2f2" : b.v === "warn" ? "#fffbeb" : "#faf5ff";
          const icon = b.v === "mistake" ? "⚠️ Common Trap & Mistake:" : b.v === "warn" ? "⚡ Crucial Warning:" : "💡 Pro Insight:";
          html += `
            <div class="callout callout-${esc(b.v)}" style="border-inline-start: 4px solid ${borderC}; background: ${bgC}; padding: 14px 18px; border-radius: 8px; margin-bottom: 20px;">
              <div style="font-weight: 700; margin-bottom: 4px; font-size: 14px;">${icon} ${esc(b.title)}</div>
              <p style="margin: 0; font-size: 14px; line-height: 1.6;">${esc(b.t)}</p>
            </div>
          `;
        }
        break;
      case "qa":
        html += `
          <div class="quickcheck" style="margin-bottom: 12px; border: 1px solid var(--line, #e2e8f0); border-radius: 10px; background: #fcfbfe;">
            <details style="padding: 12px 16px;">
              <summary style="font-weight: 700; cursor: pointer; color: var(--ink, #1e1b2e);">❓ ${esc(b.q)}</summary>
              <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #e2e8f0; color: #166534; font-size: 14px; line-height: 1.6;">
                <strong>✓ Answer:</strong> ${esc(b.a)}
              </div>
            </details>
          </div>
        `;
        break;
    }
  });

  // Takeaway Box
  html += `
    <div class="lesson-takeaway" style="margin-top: 28px; padding: 16px 20px; background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 12px;">
      <div style="font-weight: 800; color: #166534; margin-bottom: 4px; font-size: 14px;">💡 Lesson Takeaway</div>
      <p style="margin: 0; color: #14532d; font-size: 14px; line-height: 1.7;">${esc(doc.takeaway)}</p>
    </div>
  `;

  html += `</div>`;
  return html;
}

/* ========================================================
   COURSE BRAIN (Cumulative Context & Terminology Lock)
   ======================================================== */

export class CourseBrain {
  slug: string;
  glossary: Term[] = [];
  covered: { title: string; digest: string }[] = [];
  usedTerms: Set<string> = new Set();
  masterSummary: string = "";

  constructor(slug: string) {
    this.slug = slug;
  }

  rehydrate(
    brainCovered?: { title: string; digest: string }[],
    brainUsedTerms?: string[],
    glossary?: Term[],
    masterSummary?: string
  ) {
    if (glossary && glossary.length > 0 && this.glossary.length === 0) {
      this.glossary = [...glossary];
    }
    if (brainCovered && Array.isArray(brainCovered) && brainCovered.length > 0) {
      this.covered = [...brainCovered];
    }
    if (brainUsedTerms && Array.isArray(brainUsedTerms) && brainUsedTerms.length > 0) {
      this.usedTerms = new Set(brainUsedTerms.map((t) => t.toLowerCase().trim()));
    }
    if (masterSummary && typeof masterSummary === "string" && masterSummary.trim().length > 0) {
      this.masterSummary = masterSummary.trim();
    }
  }

  async prime(outline: Outline, topic: string, lang: string, difficulty?: string, source_excerpt?: string) {
    if (this.glossary.length > 0) return;
    this.glossary = await buildGlossary(outline, topic, lang, difficulty, source_excerpt);
  }

  chain(): Chain {
    return {
      glossary: this.glossary,
      covered: [...this.covered],
      usedTerms: Array.from(this.usedTerms),
      masterSummary: this.masterSummary,
    };
  }

  commit(doc: LessonDoc, lessonTitle: string) {
    const digest = doc.digest || (doc.goal + " " + doc.takeaway);
    const existingIdx = this.covered.findIndex((c) => c.title === lessonTitle);
    if (existingIdx >= 0) {
      this.covered[existingIdx] = { title: lessonTitle, digest };
    } else {
      this.covered.push({
        title: lessonTitle,
        digest,
      });
    }
    for (const term of doc.terms || []) {
      if (term) this.usedTerms.add(term.toLowerCase().trim());
    }
  }
}

const brains = new Map<string, CourseBrain>();

export function getBrain(slug: string): CourseBrain {
  let b = brains.get(slug);
  if (!b) {
    b = new CourseBrain(slug);
    brains.set(slug, b);
  }
  return b;
}

export function rehydrate(
  brain: CourseBrain,
  brainCovered?: { title: string; digest: string }[],
  brainUsedTerms?: string[],
  glossary?: Term[],
  masterSummary?: string
): CourseBrain {
  brain.rehydrate(brainCovered, brainUsedTerms, glossary, masterSummary);
  return brain;
}

export const rehydrateBrain = rehydrate;

export function resetBrain(slug: string) {
  brains.delete(slug);
}

export function validateMasterSummary(raw: any): { valid: boolean; errors: string[]; summary?: string } {
  const errors: string[] = [];
  const text = typeof raw === "string" ? raw.trim() : String(raw?.summary || "").trim();
  if (text.length < 8) {
    errors.push("Master summary is too short (must be at least 8 characters).");
  }
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length > 60) {
    errors.push(`Master summary strictly exceeded 60 words ceiling (${words.length} words > 60). Condense into a tight single paragraph under 60 words.`);
  }
  if (errors.length > 0) return { valid: false, errors };
  return { valid: true, errors: [], summary: text };
}

export async function updateMasterSummary(
  currentMasterSummary: string,
  newLessonTitle: string,
  newLessonDigest: string,
  lang: string = "en"
): Promise<string> {
  const res = await askJSON<{ summary: string }>(
    "updateMasterSummary",
    (correctionNote) => `
You are TutorAI Synthesis Specialist.
TASK: Update the concise cumulative master summary answering: What has the student mastered up to this point across the curriculum?

PREVIOUS MASTER SUMMARY:
${currentMasterSummary ? currentMasterSummary : "Course start (No prior lessons)."}

NEWLY COMPLETED LESSON:
Title: "${newLessonTitle}"
Digest: ${newLessonDigest}

LANGUAGE: ${lang === "ar" ? "Formal Modern Standard Arabic (الفصحى)" : "English"}

OUTPUT CONTRACT:
Output ONLY a single valid JSON object strictly matching this schema:
{
  "summary": string
}

STRICT CONSTRAINTS:
1. State concretely: What skills, knowledge, and capabilities has the student mastered up to this point?
2. STRICT MAXIMUM: 60 WORDS. Any answer exceeding 60 words will be rejected. Be concise and dense.
3. Single unified paragraph only.
${correctionNote || ""}
`,
    (raw) => {
      const v = validateMasterSummary(raw);
      if (!v.valid) return { valid: false, errors: v.errors };
      return { valid: true, errors: [], doc: { summary: v.summary! } as any };
    },
    2,
    0.2
  );

  return typeof res === "string" ? res : (res as any)?.summary || "";
}

/* ========================================================
   PIPELINE STAGES
   ======================================================== */

export async function designOutline(
  topic: string,
  personal: any,
  settings: any,
  lang: string
): Promise<Outline> {
  const difficulty = settings?.difficulty || "beginner";
  const sourceExcerpt = settings?.source_excerpt ? `\nSOURCE REFERENCE EXCERPT:\n${settings.source_excerpt}` : "";

  return askJSON<Outline>(
    "designOutline",
    (correctionNote) => `
You are TutorAI, an elite curriculum designer.
TASK: Design a rigorous, multi-module course curriculum outline with an explicit Concept Dependency Network (DAG) for the topic below.

TOPIC: ${topic}
TARGET DIFFICULTY: ${difficulty}
LEARNER PROFILE: ${personal ? JSON.stringify(personal) : "Lifelong learner"}
${sourceExcerpt}
LANGUAGE: ${lang === "ar" ? "Modern Standard Arabic (الفصحى الكاملة)" : "Same language as the topic"}

OUTPUT CONTRACT:
Output ONLY a single valid JSON object strictly matching this schema:
{
  "title": string (at least 3 chars),
  "summary": string (at least 20 chars),
  "outcomes": [string, string, string] (at least 3 concrete outcomes),
  "modules": [
    {
      "title": string,
      "lessons": [
        {
          "title": string (unique lesson title),
          "prerequisites": [string], // Concepts student must know before this lesson. Must come from concepts introduced in earlier lessons (or empty [] for introductory lessons).
          "introduces": [string],    // 1 to 3 net-new concepts taught for the first time in this lesson. Must be unique across the entire course.
          "reinforces": [string]     // Previously covered concepts that this lesson deepens or applies in a new context.
        }
      ]
    }
  ]
}

RULES:
- Modules count: between 2 and 5.
- Every module MUST have at least 2 distinct lessons.
- ALL lesson titles across all modules MUST be unique (NO duplicate titles anywhere).
- Outcomes must state verifiable skills.
- CONCEPT DEPENDENCY RULES (Strict Pedagogical DAG):
  1. "introduces": Each concept must be introduced in exactly ONE lesson across the entire course (no duplicate introductions).
  2. "prerequisites": Every prerequisite must have been introduced in an EARLIER lesson (or empty [] for lesson 1). NEVER depend on a concept that has not been introduced yet.
  3. "reinforces": Every reinforced concept must have been introduced in an EARLIER lesson.
  4. NO circular dependencies: A concept cannot be both a prerequisite and introduced in the same lesson.
${correctionNote || ""}
`,
    (raw) => validateOutline(raw, lang),
    2,
    0.2
  );
}

export async function buildGlossary(
  outline: Outline,
  topic: string,
  lang: string,
  difficulty?: string,
  source_excerpt?: string
): Promise<Term[]> {
  const introducedConcepts: string[] = [];
  if (outline.modules) {
    for (const m of outline.modules) {
      if (m.lessonItems) {
        for (const item of m.lessonItems) {
          if (Array.isArray(item.introduces)) introducedConcepts.push(...item.introduces);
        }
      }
    }
  }

  return askJSON<Term[]>(
    "buildGlossary",
    (correctionNote) => `
You are TutorAI Curriculum Lexicographer.
TASK: Build the definitive course glossary for this course to ensure terminology consistency across all lessons.

COURSE: "${outline.title}"
TOPIC: "${topic}"
DIFFICULTY: ${difficulty || "beginner"}
OUTLINE MODULES: ${outline.modules.map((m) => m.title + " (" + m.lessons.join(", ") + ")").join(" | ")}
${introducedConcepts.length > 0 ? `KEY CONCEPTS INTRODUCED IN CURRICULUM: ${introducedConcepts.join(", ")}` : ""}
${source_excerpt ? `SOURCE EXCERPT:\n${source_excerpt.slice(0, 1500)}` : ""}
LANGUAGE: ${lang === "ar" ? "Modern Standard Arabic (الفصحى)" : "English"}

OUTPUT CONTRACT:
Output ONLY a JSON array with 8 to 20 key domain terms strictly matching this schema:
[
  { "term": string, "def": string (at least 12 chars) }
]

RULES:
- Exactly 8 to 20 domain-critical terms and concepts.
- Definitions must be precise and unambiguous.
- No duplicate terms.
${correctionNote || ""}
`,
    (raw) => validateGlossary(raw, lang),
    2,
    0.2
  );
}

export async function writeLesson(
  ctx: {
    courseTitle: string;
    topic: string;
    modTitle: string;
    lessonTitle: string;
    lessonIndex: number;
    totalLessons: number;
    personal: any;
    difficulty: "beginner" | "intermediate" | "advanced";
    settings: any;
    brain: CourseBrain;
    introduces?: string[];
    prerequisites?: string[];
    reinforces?: string[];
    onChunk?: (chunk: string) => void;
    onThought?: (thought: string) => void;
  },
  lang: string
): Promise<LessonDoc> {
  const chain = ctx.brain.chain();
  const coveredText = chain.covered.length > 0
    ? chain.covered.map((c, i) => `${i + 1}. ${c.title}: ${c.digest}`).join("\n")
    : "This is Lesson 1 (Course Foundation).";

  const glossaryNames = chain.glossary.map((g) => g.term).join(", ");
  const sourceExcerpt = ctx.settings?.source_excerpt ? `\nSOURCE REFERENCE EXCERPT:\n${ctx.settings.source_excerpt.slice(0, 2000)}` : "";

  const introducesList = ctx.introduces && ctx.introduces.length > 0 ? ctx.introduces : [ctx.lessonTitle];
  const prereqsList = ctx.prerequisites && ctx.prerequisites.length > 0 ? ctx.prerequisites : [];
  const reinforcesList = ctx.reinforces && ctx.reinforces.length > 0 ? ctx.reinforces : [];

  let prereqSection = "";
  if (prereqsList.length > 0) {
    const relevantPrior = chain.covered.filter((c) =>
      prereqsList.some((p) => c.title.toLowerCase().includes(p.toLowerCase()) || c.digest.toLowerCase().includes(p.toLowerCase()))
    );
    const priorExcerpt = relevantPrior.length > 0
      ? relevantPrior.map((r) => `- ${r.title}: ${r.digest}`).join("\n")
      : prereqsList.map((p) => `- ${p} (previously mastered by learner)`).join("\n");

    prereqSection = `
PREREQUISITE CONCEPTS (ASSUMED STUDENT KNOWLEDGE):
The student already mastered these concepts: ${prereqsList.join(", ")}
Prior coverage:
${priorExcerpt}
CRITICAL INSTRUCTION: DO NOT define or explain these prerequisite concepts from scratch. The student already knows them. Assume full mastery, reference them directly, and BUILD ADVANCED KNOWLEDGE UPON THEM.`;
  }

  let reinforcesSection = "";
  if (reinforcesList.length > 0) {
    reinforcesSection = `
REINFORCED CONCEPTS:
Apply and connect these previously taught concepts to new scenarios without re-defining them: ${reinforcesList.join(", ")}`;
  }

  return askJSON<LessonDoc>(
    "writeLesson",
    (correctionNote) => `
You are TutorAI Master Pedagogue.
TASK: Write an in-depth, structured Lesson Data Document (LessonDoc) for the specific lesson specified below.

COURSE: "${ctx.courseTitle}" (Lesson ${ctx.lessonIndex + 1} of ${ctx.totalLessons})
MODULE: "${ctx.modTitle}"
LESSON TITLE: "${ctx.lessonTitle}"
TOPIC: "${ctx.topic}"
DIFFICULTY: ${ctx.difficulty}
${sourceExcerpt}

ACTIVE PEDAGOGICAL MISSION:
- TARGET NEW CONCEPTS TO INTRODUCE: ${introducesList.join(", ")}
  (You MUST explain, define, and illustrate these target concepts thoroughly with concrete explanations and examples).
${prereqSection}
${reinforcesSection}

ESTABLISHED COURSE GLOSSARY (Strictly lock your 'terms' to terms in this list):
${glossaryNames}

CUMULATIVE COURSE MASTERY (MASTER SUMMARY):
${chain.masterSummary ? chain.masterSummary : (lang === "ar" ? "الدرس التأسيسي الأول للدورة (لا توجد دروس سابقة)." : "Initial course foundation lesson (no prior lessons).")}

PREVIOUSLY COVERED LESSON DIGESTS (DO NOT REPEAT, BUILD CUMULATIVELY):
${coveredText}

LEARNER PROFILE: ${ctx.personal ? JSON.stringify(ctx.personal) : "None"}
LANGUAGE: ${lang === "ar" ? "Formal Modern Standard Arabic (الفصحى). Ratio of Arabic letters must exceed 65%." : "English"}

OUTPUT CONTRACT:
Output ONLY a single valid JSON object strictly matching this schema:
{
  "goal": string (at least 15 chars, state concrete outcome),
  "terms": [string, string] (must be chosen from the established course glossary list above),
  "blocks": [
    // 9 to 16 blocks total. Permitted block types:
    // { "k": "h", "t": string }
    // { "k": "p", "t": string (at least 10 chars) }
    // { "k": "ul", "items": [string, string] } (each item must be a full explanatory sentence >= 4 words)
    // { "k": "ol", "items": [string, string] }
    // { "k": "code", "lang": string, "t": string }
    // { "k": "table", "head": [string, string], "rows": [[string, string]] }
    // { "k": "note", "v": "info"|"warn"|"mistake", "title": string, "t": string }
    // { "k": "qa", "q": string (>= 8 chars), "a": string (>= 8 chars) }
  ],
  "takeaway": string (at least 10 chars),
  "digest": string (2-3 sentences summarizing the net new knowledge taught in this lesson)
}

STRICT QUALITY RULES:
1. Blocks count: 9 to 16 blocks.
2. Must contain: at least 1 paragraph ("p"), at least 1 list ("ul" or "ol"), at least 1 note/mistake block ("note"), at least 2 QA items ("qa").
3. Total list items across lists must be at least 4. Every list item must be a complete explanation sentence (>= 4 words).
4. NO FILLER PHRASES ("في عالم اليوم", "as we all know", etc.).
5. If language is Arabic, all text, headings, and tables must be in clear Arabic.
6. The "terms" field is strictly MANDATORY and must NOT be empty. Pick 2 to 5 applicable terms from the established glossary.
7. The lesson text MUST actively weave in, explain, and reference the established course vocabulary (at least 30% of the terms in the glossary).
8. Target concepts must be clearly introduced and explained; do not re-define prerequisite concepts from scratch.
${correctionNote || ""}
`,
    (raw) =>
      validateLesson(raw, {
        lang,
        difficulty: ctx.difficulty,
        glossary: chain.glossary,
        previous: chain.covered,
        introduces: introducesList,
        prerequisites: prereqsList,
        reinforces: reinforcesList,
      }),
    2,
    0.2,
    ctx.onChunk,
    ctx.onThought
  );
}

export async function buildQuiz(doc: LessonDoc, courseTitle: string, lessonTitle: string, lang: string): Promise<QuizItem[]> {
  const lessonEvidence = doc.blocks
    .filter((b) => b.k === "p" || b.k === "ul" || b.k === "note")
    .map((b) => (b.k === "ul" ? (b as any).items.join(" ") : (b as any).t))
    .join("\n")
    .slice(0, 3000);

  return askJSON<QuizItem[]>(
    "buildQuiz",
    (correctionNote) => `
You are TutorAI Assessment Specialist.
TASK: Create a 3 to 5 question mastery quiz based STRICTLY and EXCLUSIVELY on the verified lesson content provided below.

COURSE: "${courseTitle}" | LESSON: "${lessonTitle}"
LESSON CONTENT TO TEST:
${lessonEvidence}
LANGUAGE: ${lang === "ar" ? "Arabic" : "English"}

OUTPUT CONTRACT:
Output ONLY a JSON array with 3 to 5 questions strictly matching this schema:
[
  {
    "q": string (clear question, at least 10 chars),
    "choices": [string, string, string, string] (exactly 4 distinct plausible choices),
    "answer": number (0-indexed: 0, 1, 2, or 3),
    "why": string (explanation of why the answer is correct, at least 10 chars),
    "evidence": string (direct quote or factual excerpt from the lesson content above, at least 10 chars)
  }
]

RULES:
- Every question must be directly testable from the text above.
- Vary the correct answer index across questions (DO NOT make every correct answer 0 or 1).
- Every "evidence" string MUST be an exact quote or direct excerpt from the lesson content above.
${correctionNote || ""}
`,
    (raw) => validateQuiz(raw, lang, lessonEvidence),
    2,
    0.2
  );
}

export async function buildCards(doc: LessonDoc, glossary: Term[], courseTitle: string, lang: string): Promise<Card[]> {
  return askJSON<Card[]>(
    "buildCards",
    (correctionNote) => `
You are TutorAI Spaced-Repetition Specialist.
TASK: Create 8 to 12 high-retention flashcards based on the lesson's core concepts and glossary.

COURSE: "${courseTitle}"
LESSON GOAL: ${doc.goal}
KEY TAKEAWAY: ${doc.takeaway}
GLOSSARY TERMS: ${glossary.slice(0, 8).map((g) => g.term + ": " + g.def).join(" | ")}
LANGUAGE: ${lang === "ar" ? "Arabic" : "English"}

OUTPUT CONTRACT:
Output ONLY a JSON array of 8 to 12 flashcards:
[
  { "front": string (concept/question >= 4 chars), "back": string (concise explanation >= 6 chars) }
]
${correctionNote || ""}
`,
    (raw) => validateCards(raw, lang),
    2,
    0.2
  );
}
