import React, { useState, useEffect } from "react";
import DOMPurify from "dompurify";
import { Store } from "../store";
import { STR, planName } from "../i18n";
import { CourseAI } from "../ai";
import { Course } from "../types";
import { LessonDoc, HarnessError, rehydrate, getBrain, buildConceptGraph } from "../harness";

interface CourseDetailProps {
  slug: string;
  currentLang: string;
  navigate: (route: string) => void;
  setLang: (l: string) => void;
  onToast: (msg: string, kind?: string) => void;
}

export function cleanStreamPreview(rawStream: string, isAr: boolean = true): string {
  if (!rawStream) return "";

  try {
    const cleaned = rawStream.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const firstBrace = cleaned.indexOf("{");
    if (firstBrace >= 0) {
      const lastBrace = cleaned.lastIndexOf("}");
      const sliceJson = lastBrace > firstBrace ? cleaned.slice(firstBrace, lastBrace + 1) : cleaned.slice(firstBrace);
      const parsed = JSON.parse(sliceJson);
      if (parsed && typeof parsed === "object") {
        let formatted = "";
        if (parsed.goal) {
          formatted += `🎯 ${isAr ? "هدف الدرس:" : "Goal:"} ${parsed.goal}\n\n`;
        }
        if (Array.isArray(parsed.blocks)) {
          for (const b of parsed.blocks) {
            if (!b || typeof b !== "object") continue;
            if (b.k === "h" && b.t) {
              formatted += `\n📌 ${b.t}\n\n`;
            } else if (b.k === "p" && b.t) {
              formatted += `${b.t}\n\n`;
            } else if ((b.k === "ul" || b.k === "ol") && Array.isArray(b.items)) {
              for (const item of b.items) {
                if (item) formatted += `• ${item}\n`;
              }
              formatted += `\n`;
            } else if (b.k === "note" && b.t) {
              formatted += `💡 ${b.title ? b.title + ": " : ""}${b.t}\n\n`;
            } else if (b.k === "qa" && (b.q || b.a)) {
              if (b.q) formatted += `❓ ${b.q}\n`;
              if (b.a) formatted += `✅ ${b.a}\n\n`;
            } else if (b.k === "code" && b.t) {
              formatted += `\`\`\`${b.lang || ""}\n${b.t}\n\`\`\`\n\n`;
            }
          }
        }
        if (parsed.takeaway) {
          formatted += `\n💎 ${isAr ? "الخلاصة:" : "Key Takeaway:"} ${parsed.takeaway}\n`;
        }
        if (formatted.trim()) return formatted.trim();
      }
    }
  } catch (e) {
    // Stream in progress
  }

  const stringValRegex = /"(?:t|q|a|goal|takeaway)"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"?/gi;
  const extractedPieces: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = stringValRegex.exec(rawStream)) !== null) {
    if (match[1] && match[1].trim().length > 3) {
      const unescaped = match[1].replace(/\\n/g, "\n").replace(/\\"/g, '"');
      if (!extractedPieces.includes(unescaped)) {
        extractedPieces.push(unescaped);
      }
    }
  }

  if (extractedPieces.length > 0) {
    return extractedPieces.join("\n\n");
  }

  return rawStream
    .replace(/[{}\[\]"]/g, "")
    .replace(/\b(goal|terms|blocks|takeaway|digest|k|t|v|items|title|head|rows|q|a|code|lang|info|warn|mistake)\s*:/gi, "")
    .replace(/,\\s*/g, "\n")
    .trim();
}

export const CourseDetail: React.FC<CourseDetailProps> = ({ slug, currentLang, navigate, setLang, onToast }) => {
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [modIdx, setModIdx] = useState(0);
  const [lesIdx, setLesIdx] = useState(0);
  const [tab, setTab] = useState<"lesson" | "quiz" | "flash" | "mind" | "chat" | "concept">("lesson");
  const [progress, setProgress] = useState<{ done: string[]; quiz: any }>({ done: [], quiz: {} });
  const [lessonHtml, setLessonHtml] = useState("");
  const [lessonLoading, setLessonLoading] = useState(false);
  const [liveThought, setLiveThought] = useState("");
  const [liveContent, setLiveContent] = useState("");
  const [lessonError, setLessonError] = useState<string | null>(null);
  const [quizData, setQuizData] = useState<any[] | null>(null);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizRevealed, setQuizRevealed] = useState<Record<number, boolean>>({});
  const [flashCards, setFlashCards] = useState<any[] | null>(null);
  const [flashError, setFlashError] = useState<string | null>(null);
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatStreaming, setChatStreaming] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [outlineError, setOutlineError] = useState<string | null>(null);
  const [missingSequenceLessons, setMissingSequenceLessons] = useState<
    { modIdx: number; lesIdx: number; title: string; key: string; modTitle: string }[]
  >([]);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchProgressText, setBatchProgressText] = useState("");

  const t = (k: string) => (STR as any)[currentLang][k] || (STR.en as any)[k] || k;
  const isAr = currentLang === "ar";
  const plan = Store.plan();

  const loadCourseData = async () => {
    setLoading(true);
    setOutlineError(null);
    const c = await Store.getCourse(slug);
    if (!c) {
      setCourse(null);
      setLoading(false);
      return;
    }
    if (c.lang && c.lang !== currentLang) {
      setLang(c.lang);
    }
    if (Store.isLoggedIn()) {
      const p = await Store.getProgress(slug);
      setProgress(p);
    }

    if (!c.outline) {
      try {
        const personal = c.personal ? await Store.getPersonalization() : null;
        const outline = await CourseAI.generateOutline(c.topic, personal, c.settings, c.lang || currentLang);
        c.outline = outline;
        c.title = outline.title || c.topic;
        c.conceptGraph = buildConceptGraph(outline);
        await Store.saveCourse(c);
      } catch (e: any) {
        console.error("[CourseDetail] Outline generation failed:", e);
        const errDetail = e instanceof HarnessError ? e.message : (e.message || t("outlineFail"));
        setOutlineError(errDetail);
        onToast(errDetail, "err");
        setCourse(c);
        setLoading(false);
        return;
      }
    }

    setCourse(c);
    setLoading(false);
  };

  useEffect(() => {
    loadCourseData();
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [slug]);

  const curModule = course?.outline?.modules[modIdx];
  const curLessonTitle = curModule ? curModule.lessons[lesIdx] : "";
  const lessonIdKey = `${modIdx}:${lesIdx}`;

  useEffect(() => {
    if (!course || !course.outline || !curLessonTitle) return;
    if (tab === "lesson") {
      loadLessonContent();
    } else if (tab === "quiz") {
      loadQuiz();
    } else if (tab === "flash") {
      loadFlashcards();
    }
  }, [modIdx, lesIdx, tab, course]);

  const loadLessonContent = async () => {
    if (!course || !course.outline || !curLessonTitle || !curModule) return;
    setLessonError(null);

    const cachedHtml = course.lessons?.[lessonIdKey];
    if (cachedHtml && cachedHtml.trim().length > 60) {
      setMissingSequenceLessons([]);
      setLessonHtml(cachedHtml);
      return;
    }

    // (Sequential Scaffolding Protection: Halt out-of-order generation)
    const flatLessons: { modIdx: number; lesIdx: number; title: string; key: string; modTitle: string }[] = [];
    course.outline.modules.forEach((m, mI) => {
      m.lessons.forEach((l, lI) => {
        flatLessons.push({
          modIdx: mI,
          lesIdx: lI,
          title: l,
          key: `${mI}:${lI}`,
          modTitle: m.title,
        });
      });
    });

    const curFlatIdx = flatLessons.findIndex((item) => item.modIdx === modIdx && item.lesIdx === lesIdx);
    if (curFlatIdx > 0) {
      const missingPrior = flatLessons.slice(0, curFlatIdx).filter((item) => !course.lessonDocs?.[item.key]);
      if (missingPrior.length > 0) {
        // Halt generation! Do not generate silently without prerequisite context!
        setMissingSequenceLessons(missingPrior);
        setLessonLoading(false);
        setLessonHtml("");
        return;
      }
    }

    setMissingSequenceLessons([]);
    setLessonLoading(true);
    setLessonHtml("");
    setLiveThought("");
    setLiveContent("");

    try {
      const personal = course.personal ? await Store.getPersonalization() : null;
      const totalLessons = course.outline.modules.reduce((acc, m) => acc + m.lessons.length, 0);

      // (1) Read brainCovered from course; if empty, rebuild from lessonDocs
      let covered = course.brainCovered ? [...course.brainCovered] : [];
      if (covered.length === 0 && course.lessonDocs) {
        covered = [];
        for (const [key, doc] of Object.entries(course.lessonDocs)) {
          if (doc) {
            let title = key;
            const parts = key.split(/[:-]/).map(Number);
            if (parts.length === 2 && course.outline.modules[parts[0]]?.lessons[parts[1]]) {
              title = course.outline.modules[parts[0]].lessons[parts[1]];
            }
            const digest = doc.digest || `${doc.goal || ""} ${doc.takeaway || ""}`.trim();
            if (digest && !covered.some((c) => c.title === title)) {
              covered.push({ title, digest });
            }
          }
        }
        course.brainCovered = covered;
      }

      // (2) Read brainUsedTerms from course; if empty, aggregate from lessonDocs
      let usedTerms = course.brainUsedTerms ? [...course.brainUsedTerms] : [];
      if (usedTerms.length === 0 && course.lessonDocs) {
        const termsSet = new Set<string>();
        for (const doc of Object.values(course.lessonDocs)) {
          if (doc && Array.isArray(doc.terms)) {
            for (const t of doc.terms) {
              if (t && typeof t === "string") termsSet.add(t.toLowerCase().trim());
            }
          }
        }
        usedTerms = Array.from(termsSet);
        course.brainUsedTerms = usedTerms;
      }

      // (3) Rehydrate CourseBrain explicitly
      const brain = getBrain(slug);
      rehydrate(brain, covered, usedTerms, course.glossary, course.masterSummary);

      let accumulatedJson = "";
      const result = await CourseAI.generateLessonStream(
        course.title || course.topic,
        course.topic,
        curModule.title,
        curLessonTitle,
        personal,
        course.lang || currentLang,
        (chunk) => {
          accumulatedJson += chunk;
          const cleanText = cleanStreamPreview(accumulatedJson, isAr);
          setLiveContent(cleanText);
        },
        (thoughtChunk) => {
          setLiveThought((prev) => prev + thoughtChunk);
        },
        {
          slug,
          lessonIndex: lesIdx,
          totalLessons,
          outline: course.outline,
          settings: course.settings,
          difficulty: course.settings?.difficulty || "beginner",
          course,
          brainCovered: covered,
          brainUsedTerms: usedTerms,
          masterSummary: course.masterSummary,
          glossary: course.glossary,
        }
      );

      // (4) Save verified data and rendered HTML
      if (!course.lessonDocs) course.lessonDocs = {};
      course.lessonDocs[lessonIdKey] = result.doc;
      if (!course.lessons) course.lessons = {};
      course.lessons[lessonIdKey] = result.html;
      course.masterSummary = result.masterSummary;

      // (5) Update brainCovered with current lesson
      if (!course.brainCovered) course.brainCovered = [];
      const curDigest = result.doc.digest || `${result.doc.goal || ""} ${result.doc.takeaway || ""}`.trim();
      const existingCovIdx = course.brainCovered.findIndex((c) => c.title === curLessonTitle);
      if (existingCovIdx >= 0) {
        course.brainCovered[existingCovIdx] = { title: curLessonTitle, digest: curDigest };
      } else {
        course.brainCovered.push({ title: curLessonTitle, digest: curDigest });
      }

      // (6) Update brainUsedTerms with current lesson terms
      if (!course.brainUsedTerms) course.brainUsedTerms = [];
      const termsSet = new Set<string>(course.brainUsedTerms.map((t) => t.toLowerCase().trim()));
      if (Array.isArray(result.doc.terms)) {
        for (const t of result.doc.terms) {
          if (t && typeof t === "string") termsSet.add(t.toLowerCase().trim());
        }
      }
      course.brainUsedTerms = Array.from(termsSet);

      if (result.brainCovered && result.brainCovered.length > course.brainCovered.length) {
        course.brainCovered = result.brainCovered;
      }
      if (result.brainUsedTerms && result.brainUsedTerms.length > course.brainUsedTerms.length) {
        course.brainUsedTerms = result.brainUsedTerms;
      }

      // (7) Persist course state via Store.saveCourse
      await Store.saveCourse(course);
      setLessonHtml(result.html);
    } catch (e: any) {
      console.error("[CourseDetail] Lesson generation failed:", e);
      const msg = e instanceof HarnessError ? e.message : (e.message || t("lessonFail"));
      setLessonError(msg);
      setLessonHtml("");
    } finally {
      setLessonLoading(false);
    }
  };

  const handleGenerateMissingSequence = async () => {
    if (!course || !course.outline || missingSequenceLessons.length === 0) return;
    setBatchGenerating(true);
    setLessonError(null);

    try {
      const personal = course.personal ? await Store.getPersonalization() : null;
      const totalLessons = course.outline.modules.reduce((acc, m) => acc + m.lessons.length, 0);

      for (let i = 0; i < missingSequenceLessons.length; i++) {
        const item = missingSequenceLessons[i];
        setBatchProgressText(
          isAr
            ? `جارٍ توليد الدرس السابق (${i + 1}/${missingSequenceLessons.length}): "${item.title}"...`
            : `Generating preceding lesson (${i + 1}/${missingSequenceLessons.length}): "${item.title}"...`
        );

        if (course.lessonDocs?.[item.key]) continue;

        let covered = course.brainCovered ? [...course.brainCovered] : [];
        let usedTerms = course.brainUsedTerms ? [...course.brainUsedTerms] : [];
        const brain = getBrain(slug);
        rehydrate(brain, covered, usedTerms, course.glossary, course.masterSummary);

        const result = await CourseAI.generateLessonStream(
          course.title || course.topic,
          course.topic,
          item.modTitle,
          item.title,
          personal,
          course.lang || currentLang,
          undefined,
          {
            slug,
            lessonIndex: item.lesIdx,
            totalLessons,
            outline: course.outline,
            settings: course.settings,
            difficulty: course.settings?.difficulty || "beginner",
            course,
            brainCovered: covered,
            brainUsedTerms: usedTerms,
            masterSummary: course.masterSummary,
            glossary: course.glossary,
          }
        );

        if (!course.lessonDocs) course.lessonDocs = {};
        course.lessonDocs[item.key] = result.doc;
        if (!course.lessons) course.lessons = {};
        course.lessons[item.key] = result.html;
        course.masterSummary = result.masterSummary;
        course.brainCovered = result.brainCovered;
        course.brainUsedTerms = result.brainUsedTerms;

        await Store.saveCourse(course);
      }

      setBatchGenerating(false);
      setBatchProgressText("");
      setMissingSequenceLessons([]);
      // Proceed to load/generate target lesson
      await loadLessonContent();
    } catch (e: any) {
      console.error("[CourseDetail] Sequential batch generation failed:", e);
      setBatchGenerating(false);
      const msg = e instanceof HarnessError ? e.message : (e.message || t("lessonFail"));
      setLessonError(msg);
    }
  };

  const loadQuiz = async () => {
    if (!course || !curLessonTitle || !curModule) return;
    setQuizError(null);
    setQuizData(null);
    setQuizAnswers({});
    setQuizRevealed({});

    const curDoc = course.lessonDocs?.[lessonIdKey] || null;
    if (!curDoc) {
      setQuizError(
        isAr
          ? "يجب توليد محتوى الدرس أولاً لإنشاء اختبار حقيقي مستند إلى نصوص الدرس المعتمدة."
          : "Lesson content must be generated first to build an authentic quiz grounded in verified lesson text."
      );
      return;
    }

    try {
      const qs = await CourseAI.generateQuiz(
        curDoc,
        course.title || course.topic,
        curModule.title,
        curLessonTitle,
        course.lang || currentLang
      );
      setQuizData(qs);
    } catch (e: any) {
      setQuizError(e.message || t("quizFail"));
      setQuizData([]);
    }
  };

  const loadFlashcards = async () => {
    if (!course) return;
    setFlashError(null);
    setFlashCards(null);
    setFlippedCards({});

    const curDoc = course.lessonDocs?.[lessonIdKey] || null;
    if (!curDoc) {
      setFlashError(
        isAr
          ? "يجب توليد محتوى الدرس أولاً لاشتقاق البطاقات التعليمية."
          : "Lesson content must be generated first to derive flashcards."
      );
      return;
    }

    try {
      const cards = await CourseAI.generateFlashcards(
        curDoc,
        course.glossary || null,
        course.title || course.topic,
        course.topic,
        course.lang || currentLang
      );
      setFlashCards(cards);
    } catch (e: any) {
      setFlashError(e.message || "Failed to generate flashcards");
      setFlashCards([]);
    }
  };

  const stepLesson = (d: number) => {
    if (!course || !course.outline) return;
    const mods = course.outline.modules;
    let m = modIdx;
    let l = lesIdx + d;
    while (m >= 0 && m < mods.length) {
      if (l >= 0 && l < mods[m].lessons.length) break;
      m += d;
      l = d > 0 ? 0 : m >= 0 ? mods[m].lessons.length - 1 : 0;
    }
    if (m < 0 || m >= mods.length) return;
    setModIdx(m);
    setLesIdx(l);
    setTab("lesson");
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }
  };

  const completeAndNext = async () => {
    if (!course) return;
    const id = lessonIdKey;
    if (!progress.done.includes(id)) {
      const newDone = [...progress.done, id];
      const newProg = { ...progress, done: newDone };
      setProgress(newProg);
      if (Store.isLoggedIn()) {
        await Store.saveProgress(slug, newProg);
      }
      onToast(isAr ? "تم إتمام الدرس بنجاح!" : "Lesson completed!", "ok");
    }
    stepLesson(1);
  };

  const handleSendChat = async () => {
    const q = chatInput.trim();
    if (!q || !course) return;
    setChatInput("");
    const newHist = [...chatHistory, { role: "user", text: q }];
    setChatHistory(newHist);
    setChatStreaming(true);
    let tutorReply = "";
    try {
      const curDoc = course.lessonDocs?.[lessonIdKey];
      const lessonText = curDoc ? `${curDoc.goal}\n${curDoc.takeaway}` : "";
      await CourseAI.chat(
        course.title || course.topic,
        course.topic,
        curLessonTitle,
        newHist.slice(0, -1),
        q,
        course.lang || currentLang,
        lessonText,
        (chunk) => {
          tutorReply += chunk;
          setChatHistory([...newHist, { role: "tutor", text: tutorReply }]);
        }
      );
    } catch (e: any) {
      tutorReply = e.message || t("wentWrong");
      setChatHistory([...newHist, { role: "tutor", text: tutorReply }]);
    } finally {
      setChatStreaming(false);
    }
  };

  const toggleSpeech = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      onToast("Speech synthesis is not supported on this browser", "err");
      return;
    }
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const curDoc = course?.lessonDocs?.[lessonIdKey];
    let textContent = "";
    if (curDoc) {
      textContent = `${curDoc.goal}. ${curDoc.blocks.map((b) => (b as any).t || ((b as any).items ? (b as any).items.join(". ") : "")).join(" ")}. ${curDoc.takeaway}`;
    } else {
      textContent = lessonHtml.replace(/<[^>]*>/g, " ");
    }

    if (!textContent.trim()) return;

    const utterance = new SpeechSynthesisUtterance(textContent.slice(0, 3000));
    utterance.lang = isAr ? "ar-SA" : "en-US";
    utterance.rate = 1.0;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

  // Interactive Mind Map Generator
  const renderMindMapSVG = () => {
    if (!course || !course.outline) return null;
    const o = course.outline;
    const pad = 30;
    const MODC = ["#7c3aed", "#0284c7", "#16a34a", "#ea580c", "#dc2626", "#9333ea"];
    const trunc = (s: string, n: number) => (s && s.length > n ? s.slice(0, n - 1) + "…" : s || "");

    const mods = o.modules.map((m, i) => ({ title: m.title, lessons: [...m.lessons], i }));
    const right: typeof mods = [];
    const left: typeof mods = [];
    mods.forEach((m, k) => (k % 2 === 0 ? right : left).push(m));

    const rootT = trunc(o.title || course.topic, 28);
    const rootW = Math.min(260, Math.max(140, rootT.length * 9 + 40));
    const rootH = 54;

    const modW = 160;
    const lesW = 170;
    const gapX = 50;

    const totalRightH = right.reduce((acc, m) => acc + 48 + m.lessons.length * 40 + 20, 0);
    const totalLeftH = left.reduce((acc, m) => acc + 48 + m.lessons.length * 40 + 20, 0);
    const H = Math.max(totalRightH, totalLeftH, 360) + pad * 2;
    const W = (modW + lesW + gapX * 2) * 2 + rootW + pad * 2;
    const cx = W / 2;
    const cy = H / 2;

    const elements: React.ReactNode[] = [];

    // Root node
    elements.push(
      <g key="root-node" style={{ cursor: "default" }}>
        <rect
          x={cx - rootW / 2}
          y={cy - rootH / 2}
          width={rootW}
          height={rootH}
          rx={14}
          fill="#6d28d9"
          filter="drop-shadow(0 6px 16px rgba(109,40,217,.3))"
        />
        <text
          x={cx}
          y={cy + 5}
          textAnchor="middle"
          fontSize={15}
          fontWeight={800}
          fill="#ffffff"
        >
          {rootT}
        </text>
      </g>
    );

    const renderBranch = (branchMods: typeof mods, dir: number) => {
      let curY = cy - branchMods.reduce((acc, m) => acc + 48 + m.lessons.length * 40 + 20, 0) / 2 + pad;

      branchMods.forEach((m) => {
        const mx = dir > 0 ? cx + rootW / 2 + gapX : cx - rootW / 2 - gapX - modW;
        const my = curY;
        const color = MODC[m.i % MODC.length];

        const rEdgeX = dir > 0 ? cx + rootW / 2 : cx - rootW / 2;
        const mEdgeX = dir > 0 ? mx : mx + modW;
        elements.push(
          <path
            key={`link-root-m-${m.i}`}
            d={`M ${rEdgeX} ${cy} C ${(rEdgeX + mEdgeX) / 2} ${cy}, ${(rEdgeX + mEdgeX) / 2} ${my + 20}, ${mEdgeX} ${my + 20}`}
            fill="none"
            stroke="#c4b5fd"
            strokeWidth={2.5}
          />
        );

        elements.push(
          <g
            key={`mod-node-${m.i}`}
            onClick={() => {
              setModIdx(m.i);
              setLesIdx(0);
              setTab("lesson");
            }}
            style={{ cursor: "pointer" }}
          >
            <rect
              x={mx}
              y={my}
              width={modW}
              height={40}
              rx={10}
              fill={color}
              filter="drop-shadow(0 4px 10px rgba(0,0,0,.12))"
            />
            <text
              x={mx + modW / 2}
              y={my + 24}
              textAnchor="middle"
              fontSize={13}
              fontWeight={700}
              fill="#ffffff"
            >
              {trunc(m.title, 20)}
            </text>
          </g>
        );

        let lesY = my + 50;
        m.lessons.forEach((l, j) => {
          const lx = dir > 0 ? mx + modW + gapX : mx - gapX - lesW;
          const ly = lesY;
          const isDone = progress.done.includes(`${m.i}:${j}`);

          const mConnX = dir > 0 ? mx + modW : mx;
          const lConnX = dir > 0 ? lx : lx + lesW;
          elements.push(
            <path
              key={`link-m-l-${m.i}-${j}`}
              d={`M ${mConnX} ${my + 20} C ${(mConnX + lConnX) / 2} ${my + 20}, ${(mConnX + lConnX) / 2} ${ly + 16}, ${lConnX} ${ly + 16}`}
              fill="none"
              stroke="#e9e4f7"
              strokeWidth={2}
            />
          );

          elements.push(
            <g
              key={`les-node-${m.i}-${j}`}
              onClick={() => {
                setModIdx(m.i);
                setLesIdx(j);
                setTab("lesson");
              }}
              style={{ cursor: "pointer" }}
            >
              <rect
                x={lx}
                y={ly}
                width={lesW}
                height={32}
                rx={8}
                fill={isDone ? "#f0fdf4" : "#ffffff"}
                stroke={isDone ? "#86efac" : "#e9e4f7"}
                strokeWidth={1.5}
              />
              <text
                x={lx + lesW / 2}
                y={ly + 20}
                textAnchor="middle"
                fontSize={12}
                fontWeight={600}
                fill={isDone ? "#166534" : "#1e1b2e"}
              >
                {trunc(l, 22)} {isDone ? "✓" : ""}
              </text>
            </g>
          );

          lesY += 38;
        });

        curY = lesY + 16;
      });
    };

    renderBranch(right, 1);
    renderBranch(left, -1);

    return (
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", minWidth: 680, height: "auto", display: "block" }}
      >
        {elements}
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="main-container" style={{ paddingBottom: 60, textAlign: "center", paddingTop: 80 }}>
        <span className="spinner" style={{ margin: "0 auto 16px" }}></span>
        <p className="pulse" style={{ fontWeight: 600, color: "var(--alpha)" }}>{t("designing")}</p>
      </div>
    );
  }

  if (outlineError) {
    return (
      <div className="main-container" style={{ paddingTop: 60 }}>
        <div className="panel" style={{ maxWidth: 640, margin: "0 auto", padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <h2 style={{ color: "#dc2626", margin: "0 0 12px" }}>
            {isAr ? "فشل بناء مخطط الدورة التعليمية" : "Course Outline Generation Failed"}
          </h2>
          <p style={{ color: "var(--muted)", lineHeight: 1.6, marginBottom: 24, fontSize: 14 }}>
            {outlineError}
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
            <button className="btn btn-primary" onClick={loadCourseData}>
              🔄 {isAr ? "إعادة المحاولة الآن" : "Retry Generation"}
            </button>
            <button className="btn btn-ghost" onClick={() => navigate("#/create")}>
              {isAr ? "العودة للإنشاء" : "Back to Create"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!course || !course.outline) {
    return (
      <div className="main-container" style={{ paddingTop: 60 }}>
        <div className="page-head">
          <h1>{t("notFoundT")}</h1>
          <p>{t("notFoundS")}</p>
          <br />
          <button className="btn btn-primary" onClick={() => navigate("#/")}>{t("backHome")}</button>
        </div>
      </div>
    );
  }

  const outline = course.outline;
  const totalLessons = outline.modules.reduce((acc, m) => acc + m.lessons.length, 0);
  const doneCount = progress.done.length;
  const pct = totalLessons ? Math.round((doneCount / totalLessons) * 100) : 0;

  const tabs: [any, string][] = [
    ["lesson", t("tabLesson")],
    ["quiz", t("tabQuiz")],
    ["flash", t("tabFlash")],
    ["concept", isAr ? "🕸️ شبكة المفاهيم" : "🕸️ Concept Graph"],
    ["mind", t("tabMind")],
    ["chat", t("tabChat")],
  ];

  const sanitizedLessonHtml = DOMPurify.sanitize(lessonHtml, {
    ALLOWED_TAGS: [
      "div", "span", "p", "h3", "h4", "ul", "ol", "li", "table", "thead",
      "tbody", "tr", "th", "td", "code", "pre", "details", "summary",
      "strong", "em", "b", "i", "small"
    ],
    ALLOWED_ATTR: ["class", "style"],
  });

  return (
    <div className="main-container" style={{ paddingBottom: 60 }}>
      {/* Course Hero Bar */}
      <div style={{ marginTop: 20, background: "linear-gradient(180deg, #fbf9ff, #ffffff)", border: "1px solid var(--line)", borderRadius: 20, padding: "24px 28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <span className="badge">{planName(plan, currentLang)}</span>
            <h1 style={{ margin: "10px 0 6px", fontSize: "clamp(24px, 3.4vw, 36px)", fontWeight: 800 }}>
              {outline.title || course.topic}
            </h1>
            {outline.summary && (
              <p style={{ color: "var(--muted)", maxWidth: 760, fontSize: 15, margin: 0 }}>
                {outline.summary}
              </p>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn btn-ghost"
              style={{ padding: "8px 16px", fontSize: 13 }}
              onClick={() => window.print()}
            >
              🖨 {isAr ? "طباعة / تصدير" : "Print / PDF"}
            </button>
            <button
              className="btn btn-ghost"
              style={{ padding: "8px 16px", fontSize: 13 }}
              onClick={toggleSpeech}
            >
              {speaking ? (isAr ? "⏹ إيقاف القراءة" : "⏹ Stop Audio") : (isAr ? "🔊 استمع للدرس" : "🔊 Listen")}
            </button>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <div className="progress" style={{ height: 8, margin: "8px 0" }}>
            <div style={{ width: `${pct}%` }}></div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--muted)", fontSize: 13, fontWeight: 600 }}>
            <span>{doneCount} / {totalLessons} {t("lessonOf")}</span>
            <span>{pct}% {isAr ? "مكتمل" : "Completed"}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginTop: 20 }}>
        {tabs.map((x) => (
          <button key={x[0]} className={`tab ${tab === x[0] ? "active" : ""}`} onClick={() => setTab(x[0])}>
            {x[1]}
          </button>
        ))}
      </div>

      {/* Layout: Sidebar + Main Content */}
      <div className="course-layout">
        <div className="modules" style={{ background: "#ffffff", border: "1.5px solid var(--line)" }}>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {isAr ? "وحدات ومحاور الدورة" : "Course Modules"}
          </div>
          {outline.modules.map((m, i) => (
            <div key={i} className="mod">
              <button
                className="mod-t"
                onClick={() => {
                  setModIdx(i);
                  setLesIdx(0);
                  setTab("lesson");
                }}
              >
                {i + 1}. {m.title}
              </button>
              {m.lessons.map((l, j) => {
                const idKey = `${i}:${j}`;
                const isActive = i === modIdx && j === lesIdx;
                const isDone = progress.done.includes(idKey);
                const lesDep = m.lessonItems?.[j] || (course.outline?.conceptDependencies ? course.outline.conceptDependencies[l] : undefined);
                return (
                  <button
                    key={j}
                    className={`les ${isActive ? "active" : ""} ${isDone ? "done" : ""}`}
                    onClick={() => {
                      setModIdx(i);
                      setLesIdx(j);
                      setTab("lesson");
                    }}
                    style={{ textAlign: isAr ? "right" : "left", display: "flex", flexDirection: "column", gap: 3, alignItems: "stretch", padding: "10px 14px" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>{l}</span>
                      {isDone && <span style={{ color: "#166534", fontSize: 12 }}>✓</span>}
                    </div>
                    {lesDep && (lesDep.introduces?.length || lesDep.prerequisites?.length) ? (
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 2 }}>
                        {lesDep.introduces?.slice(0, 2).map((intro, idx) => (
                          <span key={`i-${idx}`} style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "#ecfdf5", color: "#065f46", fontWeight: 700 }}>
                            🚀 {intro}
                          </span>
                        ))}
                        {lesDep.prerequisites?.slice(0, 1).map((prereq, idx) => (
                          <span key={`p-${idx}`} style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "#fef3c7", color: "#92400e", fontWeight: 700 }}>
                            🔑 {prereq}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div>
          <div className="lesson-body" style={{ background: "#ffffff", border: "1.5px solid var(--line)", boxShadow: "0 4px 20px -8px rgba(0,0,0,.06)" }}>
            {/* LESSON TAB */}
            {tab === "lesson" && (
              <div>
                <div style={{ borderBottom: "1px solid var(--line)", paddingBottom: 14, marginBottom: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--alpha)" }}>{curModule?.title}</span>
                      <h2 style={{ margin: "4px 0 0", fontSize: 22 }}>{curLessonTitle}</h2>
                    </div>
                    {progress.done.includes(lessonIdKey) && (
                      <span className="badge" style={{ background: "#dcfce7", color: "#166534" }}>
                        ✓ {isAr ? "مكتمل" : "Completed"}
                      </span>
                    )}
                  </div>

                  {/* Scaffolding Concept Badges */}
                  {(() => {
                    const curDep = curModule?.lessonItems?.[lesIdx] ||
                      (course.outline?.conceptDependencies ? course.outline.conceptDependencies[curLessonTitle] : undefined);
                    if (!curDep) return null;
                    const hasIntro = curDep.introduces && curDep.introduces.length > 0;
                    const hasPrereq = curDep.prerequisites && curDep.prerequisites.length > 0;
                    const hasReinf = curDep.reinforces && curDep.reinforces.length > 0;
                    if (!hasIntro && !hasPrereq && !hasReinf) return null;

                    return (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12, paddingTop: 10, borderTop: "1px dashed var(--line)" }}>
                        {hasIntro && (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 11, fontWeight: 800, color: "#065f46" }}>
                              🚀 {isAr ? "مفاهيم جديدة:" : "Introduces:"}
                            </span>
                            {curDep.introduces?.map((intro, idx) => (
                              <span
                                key={`intro-${idx}`}
                                style={{
                                  background: "#ecfdf5",
                                  color: "#065f46",
                                  border: "1px solid #a7f3d0",
                                  borderRadius: 8,
                                  padding: "3px 9px",
                                  fontSize: 12,
                                  fontWeight: 700,
                                }}
                              >
                                {intro}
                              </span>
                            ))}
                          </div>
                        )}
                        {hasPrereq && (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 11, fontWeight: 800, color: "#92400e" }}>
                              🔑 {isAr ? "متطلبات سابقة:" : "Prerequisites:"}
                            </span>
                            {curDep.prerequisites?.map((p, idx) => (
                              <span
                                key={`pre-${idx}`}
                                style={{
                                  background: "#fef3c7",
                                  color: "#92400e",
                                  border: "1px solid #fde68a",
                                  borderRadius: 8,
                                  padding: "3px 9px",
                                  fontSize: 12,
                                  fontWeight: 700,
                                }}
                              >
                                {p}
                              </span>
                            ))}
                          </div>
                        )}
                        {hasReinf && (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 11, fontWeight: 800, color: "#3730a3" }}>
                              🔄 {isAr ? "ترسيخ مفاهيم:" : "Reinforces:"}
                            </span>
                            {curDep.reinforces?.map((r, idx) => (
                              <span
                                key={`reinf-${idx}`}
                                style={{
                                  background: "#e0e7ff",
                                  color: "#3730a3",
                                  border: "1px solid #c7d2fe",
                                  borderRadius: 8,
                                  padding: "3px 9px",
                                  fontSize: 12,
                                  fontWeight: 700,
                                }}
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Missing Prerequisite Sequence Card */}
                {missingSequenceLessons.length > 0 && !lessonLoading && !lessonError && (
                  <div style={{ padding: "24px 28px", background: "#fffbeb", border: "1.5px solid #fde68a", borderRadius: 16, margin: "16px 0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#92400e", fontWeight: 800, fontSize: 17, marginBottom: 8 }}>
                      <span style={{ fontSize: 24 }}>⚠️</span>
                      <span>{isAr ? "دروس سابقة مفقودة في التسلسل البيداغوجي" : "Prerequisite Lessons Missing in Sequence"}</span>
                    </div>
                    <p style={{ color: "#78350f", fontSize: 14, margin: "0 0 16px", lineHeight: 1.6 }}>
                      {isAr
                        ? `هذا الدرس ("${curLessonTitle}") يفترض استيعاب مفاهيم تراكمية تم شرحها في الدروس السابقة. لتجنب الفجوات المعرفية وضمان سلامة سياق الذاكرة التراكمية، يجب توليد الدروس السابقة أولاً:`
                        : `This lesson ("${curLessonTitle}") builds upon cumulative concepts covered in preceding lessons. To avoid cognitive gaps, preceding lessons must be generated first:`}
                    </p>

                    <div style={{ background: "#ffffff", border: "1px solid #fde68a", borderRadius: 12, padding: "14px 18px", marginBottom: 18 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: 8 }}>
                        {isAr ? "الدروس الناقصة المطلوب توليدها بالترتيب:" : "Missing Preceding Lessons to Generate in Order:"}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {missingSequenceLessons.map((item, idx) => (
                          <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#1e1b2e" }}>
                            <span style={{ fontWeight: 800, color: "#b45309", width: 20 }}>{idx + 1}.</span>
                            <span style={{ color: "var(--muted)", fontSize: 12 }}>({item.modTitle})</span>
                            <span style={{ fontWeight: 700 }}>{item.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {batchGenerating ? (
                      <div style={{ textAlign: "center", padding: "16px 0" }}>
                        <div className="spinner" style={{ margin: "0 auto 10px" }}></div>
                        <p className="pulse" style={{ fontWeight: 700, color: "#b45309", fontSize: 14 }}>
                          {batchProgressText}
                        </p>
                      </div>
                    ) : (
                      <button
                        className="btn btn-primary"
                        onClick={handleGenerateMissingSequence}
                        style={{ padding: "12px 28px", fontSize: 14, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 8 }}
                      >
                        <span>⚡</span>
                        <span>{isAr ? "توليد الدروس الناقصة أولاً بالتسلسل" : "Generate Missing Lessons in Sequence"}</span>
                      </button>
                    )}
                  </div>
                )}

                {lessonLoading && (
                  <div style={{ margin: "16px 0", padding: "20px 24px", background: "linear-gradient(180deg, #fafafa 0%, #ffffff 100%)", border: "1.5px solid var(--line)", borderRadius: 16, boxShadow: "0 4px 20px -8px rgba(0,0,0,0.06)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span className="pulse" style={{ width: 10, height: 10, borderRadius: "50%", background: "#10b981", display: "inline-block" }}></span>
                        <span style={{ fontWeight: 800, fontSize: 15, color: "var(--alpha)" }}>
                          {isAr ? "🔴 بث مباشر للتوليد والتحليل البيداغوجي" : "🔴 Live Pedagogical Generation Stream"}
                        </span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, background: "var(--bg)", border: "1px solid var(--line)", padding: "4px 10px", borderRadius: 20, color: "var(--muted)" }}>
                        {curLessonTitle}
                      </span>
                    </div>

                    {/* LIVE THOUGHT STREAM PANEL */}
                    {Boolean(liveThought) && (
                      <div style={{ marginBottom: 16, background: "#0f172a", borderRadius: 12, border: "1px solid #1e293b", overflow: "hidden" }}>
                        <div style={{ padding: "10px 14px", background: "#1e293b", display: "flex", alignItems: "center", gap: 8, color: "#38bdf8", fontSize: 12, fontWeight: 800 }}>
                          <span style={{ fontSize: 15 }}>🧠</span>
                          <span>{isAr ? "عملية التفكير واستحضار المعارف (Mind Stream):" : "Model Thought Process & Knowledge Synthesis:"}</span>
                        </div>
                        <div style={{ padding: 14, maxHeight: 180, overflowY: "auto", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", fontSize: 12, color: "#94a3b8", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                          {liveThought}
                          <span className="pulse" style={{ display: "inline-block", width: 6, height: 14, background: "#38bdf8", marginLeft: 4, verticalAlign: "middle" }}></span>
                        </div>
                      </div>
                    )}

                    {/* LIVE TEXT WRITING PANEL */}
                    <div style={{ background: "#ffffff", border: "1px solid var(--line)", borderRadius: 12, padding: 18 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)", fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
                        <span style={{ fontSize: 16 }}>✍️</span>
                        <span>{isAr ? "جاري كِتابة صلب الدرس وبنيته البيداغوجية..." : "Writing lesson content & structure live..."}</span>
                      </div>

                      {liveContent ? (
                        <div style={{ fontFamily: "inherit", fontSize: 14, lineHeight: 1.8, color: "#1e293b", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                          {liveContent}
                          <span className="pulse" style={{ display: "inline-block", width: 8, height: 16, background: "var(--alpha)", marginLeft: 2, verticalAlign: "middle" }}></span>
                        </div>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0", color: "var(--muted)" }}>
                          <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }}></div>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>
                            {isAr ? "جاري الاتصال بمزود الذكاء الاصطناعي وبدء التدفق المباشر..." : "Connecting to AI model & starting stream..."}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {lessonError && (
                  <div style={{ padding: "20px 24px", background: "#fef2f2", border: "1.5px solid #fecaca", borderRadius: 14, margin: "16px 0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#991b1b", fontWeight: 800, fontSize: 15 }}>
                      <span>⚠️</span>
                      <span>{isAr ? "تعذر توليد الدرس عبر الذكاء الاصطناعي" : "AI Lesson Generation Failed"}</span>
                    </div>
                    <p style={{ color: "#7f1d1d", fontSize: 13, margin: "10px 0 16px", lineHeight: 1.6 }}>
                      {lessonError}
                    </p>
                    <button
                      className="btn btn-primary"
                      onClick={loadLessonContent}
                      style={{ padding: "8px 20px", fontSize: 13 }}
                    >
                      🔄 {isAr ? "إعادة محاولة التوليد" : "Retry Generation"}
                    </button>
                  </div>
                )}

                {!lessonLoading && !lessonError && missingSequenceLessons.length === 0 && Boolean(sanitizedLessonHtml) && (
                  <div dangerouslySetInnerHTML={{ __html: sanitizedLessonHtml }} />
                )}

                {!lessonLoading && missingSequenceLessons.length === 0 && Boolean(sanitizedLessonHtml) && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 32, paddingTop: 20, borderTop: "1px solid var(--line)" }}>
                    <button className="btn btn-ghost" onClick={() => stepLesson(-1)}>
                      {isAr ? "← الدرس السابق" : "← Previous Lesson"}
                    </button>
                    <button className="btn btn-primary" onClick={completeAndNext}>
                      {isAr ? "إتمام والانتقال للدرس التالي →" : "Complete & Next Lesson →"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* QUIZ TAB */}
            {tab === "quiz" && (
              <div>
                <h3 style={{ marginTop: 0 }}>{isAr ? "اختبار استيعاب الدرس:" : "Mastery Quiz:"} {curLessonTitle}</h3>
                {quizError && (
                  <div style={{ padding: "16px 20px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, marginBottom: 16 }}>
                    <div style={{ color: "#991b1b", fontWeight: 700, marginBottom: 6 }}>
                      ⚠️ {isAr ? "تعذر إنشاء الاختبار" : "Quiz Generation Error"}
                    </div>
                    <p style={{ margin: "0 0 12px", color: "#7f1d1d", fontSize: 13 }}>{quizError}</p>
                    <button className="btn btn-primary" style={{ padding: "6px 16px", fontSize: 12 }} onClick={loadQuiz}>
                      🔄 {isAr ? "إعادة المحاولة" : "Retry"}
                    </button>
                  </div>
                )}
                {!quizData && !quizError ? (
                  <div style={{ textAlign: "center", padding: "40px 0" }}>
                    <div className="spinner"></div>
                    <p className="pulse">{t("quizPrep")}</p>
                  </div>
                ) : quizData && quizData.length > 0 ? (
                  <div>
                    {quizData.map((q, i) => (
                      <div
                        key={i}
                        className="quiz-q"
                        style={{
                          borderColor: quizRevealed[i] ? (quizAnswers[i] === q.answer ? "var(--green)" : "#dc2626") : "var(--line)",
                          background: quizRevealed[i] ? (quizAnswers[i] === q.answer ? "#f0fdf4" : "#fef2f2") : "#ffffff",
                        }}
                      >
                        <b>Q{i + 1}. {q.q}</b>
                        {q.choices.map((ch: string, j: number) => (
                          <label key={j}>
                            <input
                              type="radio"
                              name={`q_${i}`}
                              checked={quizAnswers[i] === j}
                              onChange={() => setQuizAnswers({ ...quizAnswers, [i]: j })}
                            />{" "}
                            {ch}
                          </label>
                        ))}
                        {quizRevealed[i] && (
                          <div className="hint" style={{ display: "block", marginTop: 8, color: quizAnswers[i] === q.answer ? "#166534" : "#991b1b" }}>
                            💡 {q.why}
                            {q.evidence && (
                              <div style={{ marginTop: 4, fontSize: 12, opacity: 0.9 }}>
                                <em>📖 {isAr ? "دليل من الدرس:" : "Evidence from lesson:"} "{q.evidence}"</em>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    <button
                      className="btn btn-primary"
                      style={{ marginTop: 10 }}
                      onClick={() => {
                        const rev: Record<number, boolean> = {};
                        quizData.forEach((_, i) => { rev[i] = true; });
                        setQuizRevealed(rev);
                        const correct = quizData.filter((q, i) => quizAnswers[i] === q.answer).length;
                        onToast(`${isAr ? "نتيجتك:" : "Score:"} ${correct} / ${quizData.length}`, correct >= quizData.length / 2 ? "ok" : "err");
                      }}
                    >
                      {t("checkAns")}
                    </button>
                  </div>
                ) : null}
              </div>
            )}

            {/* FLASHCARDS TAB */}
            {tab === "flash" && (
              <div>
                <h3 style={{ marginTop: 0 }}>{isAr ? "بطاقات الاستذكار السريع:" : "Spaced Repetition Flashcards:"} {curLessonTitle}</h3>
                {flashError && (
                  <div style={{ padding: "16px 20px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, marginBottom: 16 }}>
                    <div style={{ color: "#991b1b", fontWeight: 700, marginBottom: 6 }}>
                      ⚠️ {isAr ? "تعذر توليد البطاقات" : "Flashcards Error"}
                    </div>
                    <p style={{ margin: "0 0 12px", color: "#7f1d1d", fontSize: 13 }}>{flashError}</p>
                    <button className="btn btn-primary" style={{ padding: "6px 16px", fontSize: 12 }} onClick={loadFlashcards}>
                      🔄 {isAr ? "إعادة المحاولة" : "Retry"}
                    </button>
                  </div>
                )}
                {!flashCards && !flashError ? (
                  <div style={{ textAlign: "center", padding: "40px 0" }}>
                    <div className="spinner"></div>
                    <p className="pulse">{t("flashPrep")}</p>
                  </div>
                ) : flashCards && flashCards.length > 0 ? (
                  <div className="flash-grid">
                    {flashCards.map((c, i) => {
                      const flipped = flippedCards[i];
                      return (
                        <div
                          key={i}
                          className="flash-card"
                          onClick={() => setFlippedCards({ ...flippedCards, [i]: !flipped })}
                          style={{
                            minHeight: 140,
                            padding: 20,
                            border: "1.5px solid var(--line)",
                            borderRadius: 14,
                            cursor: "pointer",
                            background: flipped ? "#f5f3ff" : "#ffffff",
                            borderColor: flipped ? "var(--alpha)" : "var(--line)",
                            transition: "all .2s",
                          }}
                        >
                          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: 8 }}>
                            {flipped ? (isAr ? "💡 الشرح / الإجابة (انقر للقلب)" : "💡 Explanation (Click to flip)") : (isAr ? "❓ المفهوم (انقر للقلب)" : "❓ Question (Click to flip)")}
                          </div>
                          <div style={{ fontSize: 15, fontWeight: flipped ? 500 : 700, color: flipped ? "var(--ink)" : "var(--alpha-dark)", lineHeight: 1.6 }}>
                            {flipped ? c.back : c.front}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            )}

            {/* CONCEPT DEPENDENCY NETWORK TAB */}
            {tab === "concept" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
                  <div>
                    <h3 style={{ margin: "0 0 6px", fontSize: 20, display: "flex", alignItems: "center", gap: 8 }}>
                      <span>🕸️</span>
                      <span>{isAr ? "شبكة المفاهيم والترابط البيداغوجي" : "Concept Dependency Network"}</span>
                    </h3>
                    <p style={{ margin: 0, color: "var(--muted)", fontSize: 13, lineHeight: 1.5 }}>
                      {isAr
                        ? "مخطط التبعيات التراكمي المنطقي (DAG): يضمن تسلسل اكتساب المفاهيم خطوة بخطوة دون تكرار ودون فجوات معرفية."
                        : "Directed Acyclic Graph (DAG) visualizing concept scaffolding, prerequisite prerequisites, and cumulative learning."}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", fontSize: 12, fontWeight: 700, padding: "5px 12px", borderRadius: 8 }}>
                      ✓ {isAr ? "تسلسل بيداغوجي موثق" : "Acyclic Scaffolding"}
                    </span>
                  </div>
                </div>

                {/* Concept Stats */}
                {(() => {
                  const graph = course.conceptGraph || (course.outline ? buildConceptGraph(course.outline as any) : { nodes: [], edges: [] });
                  const prereqEdges = graph.edges.filter((e) => e.type === "prereq").length;
                  const reinfEdges = graph.edges.filter((e) => e.type === "reinforces").length;

                  return (
                    <div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
                        <div style={{ background: "#f8fafc", border: "1px solid var(--line)", borderRadius: 12, padding: "14px 16px" }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
                            {isAr ? "إجمالي المفاهيم" : "Total Concepts"}
                          </div>
                          <div style={{ fontSize: 24, fontWeight: 800, color: "var(--ink)", marginTop: 4 }}>
                            {graph.nodes.length || outline.modules.reduce((acc, m) => acc + (m.lessonItems?.reduce((a, li) => a + (li.introduces?.length || 0), 0) || 0), 0)}
                          </div>
                        </div>

                        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: "14px 16px" }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#92400e", textTransform: "uppercase" }}>
                            🔑 {isAr ? "روابط المتطلبات" : "Prerequisite Links"}
                          </div>
                          <div style={{ fontSize: 24, fontWeight: 800, color: "#b45309", marginTop: 4 }}>
                            {prereqEdges}
                          </div>
                        </div>

                        <div style={{ background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: 12, padding: "14px 16px" }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#3730a3", textTransform: "uppercase" }}>
                            🔄 {isAr ? "روابط الترسيخ" : "Reinforcement Links"}
                          </div>
                          <div style={{ fontSize: 24, fontWeight: 800, color: "#4338ca", marginTop: 4 }}>
                            {reinfEdges}
                          </div>
                        </div>
                      </div>

                      {/* Chronological Concept Flow by Module and Lesson */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {outline.modules.map((m, mI) => (
                          <div
                            key={mI}
                            style={{
                              background: "#ffffff",
                              border: "1.5px solid var(--line)",
                              borderRadius: 14,
                              padding: "18px 20px",
                            }}
                          >
                            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--alpha)", marginBottom: 12 }}>
                              {isAr ? "الوحدة" : "Module"} {mI + 1}: {m.title}
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                              {m.lessons.map((lTitle, lI) => {
                                const idKey = `${mI}:${lI}`;
                                const isDone = progress.done.includes(idKey);
                                const isCur = mI === modIdx && lI === lesIdx;
                                const dep = m.lessonItems?.[lI] ||
                                  (course.outline?.conceptDependencies ? course.outline.conceptDependencies[lTitle] : undefined);

                                return (
                                  <div
                                    key={lI}
                                    onClick={() => {
                                      setModIdx(mI);
                                      setLesIdx(lI);
                                      setTab("lesson");
                                    }}
                                    style={{
                                      border: isCur ? "2px solid var(--alpha)" : "1.5px solid var(--line)",
                                      background: isCur ? "#faf8ff" : isDone ? "#f0fdf4" : "#ffffff",
                                      borderRadius: 12,
                                      padding: 14,
                                      cursor: "pointer",
                                      transition: "all .15s",
                                    }}
                                  >
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                      <span style={{ fontWeight: 700, fontSize: 14, color: isCur ? "var(--alpha)" : "var(--ink)" }}>
                                        {lI + 1}. {lTitle}
                                      </span>
                                      {isDone && (
                                        <span style={{ color: "#166534", fontSize: 12, fontWeight: 700 }}>✓</span>
                                      )}
                                    </div>

                                    {/* Introduces */}
                                    {dep?.introduces && dep.introduces.length > 0 && (
                                      <div style={{ marginTop: 6 }}>
                                        <div style={{ fontSize: 10, fontWeight: 700, color: "#065f46", marginBottom: 3 }}>
                                          🚀 {isAr ? "يقدّم لأول مرة:" : "Introduces:"}
                                        </div>
                                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                          {dep.introduces.map((intro, idx) => (
                                            <span
                                              key={idx}
                                              style={{
                                                fontSize: 11,
                                                padding: "2px 7px",
                                                borderRadius: 6,
                                                background: "#ecfdf5",
                                                color: "#065f46",
                                                fontWeight: 700,
                                                border: "1px solid #a7f3d0",
                                              }}
                                            >
                                              {intro}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Prerequisites */}
                                    {dep?.prerequisites && dep.prerequisites.length > 0 && (
                                      <div style={{ marginTop: 8 }}>
                                        <div style={{ fontSize: 10, fontWeight: 700, color: "#92400e", marginBottom: 3 }}>
                                          🔑 {isAr ? "يبني على متطلبات:" : "Requires:"}
                                        </div>
                                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                          {dep.prerequisites.map((p, idx) => (
                                            <span
                                              key={idx}
                                              style={{
                                                fontSize: 11,
                                                padding: "2px 7px",
                                                borderRadius: 6,
                                                background: "#fef3c7",
                                                color: "#92400e",
                                                fontWeight: 600,
                                                border: "1px solid #fde68a",
                                              }}
                                            >
                                              {p}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Reinforces */}
                                    {dep?.reinforces && dep.reinforces.length > 0 && (
                                      <div style={{ marginTop: 8 }}>
                                        <div style={{ fontSize: 10, fontWeight: 700, color: "#3730a3", marginBottom: 3 }}>
                                          🔄 {isAr ? "يعيد ترسيخ وتطبيق:" : "Reinforces:"}
                                        </div>
                                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                          {dep.reinforces.map((r, idx) => (
                                            <span
                                              key={idx}
                                              style={{
                                                fontSize: 11,
                                                padding: "2px 7px",
                                                borderRadius: 6,
                                                background: "#e0e7ff",
                                                color: "#3730a3",
                                                fontWeight: 600,
                                                border: "1px solid #c7d2fe",
                                              }}
                                            >
                                              {r}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* MIND MAP TAB */}
            {tab === "mind" && (
              <div>
                <h3 style={{ marginTop: 0 }}>{isAr ? "خريطة المفاهيم التفاعلية" : "Interactive Concept Mind Map"}</h3>
                <div style={{ border: "1.5px solid var(--line)", borderRadius: 16, overflow: "auto", background: "#fbfaff", padding: 20 }}>
                  {renderMindMapSVG()}
                </div>
              </div>
            )}

            {/* CHAT TAB */}
            {tab === "chat" && (
              <div>
                <h3 style={{ marginTop: 0 }}>{isAr ? "اسأل المعلم الذكي عن هذا الدرس" : "Ask the AI Tutor About This Lesson"}</h3>
                <div className="chat-box" style={{ minHeight: 280, maxHeight: 440, overflowY: "auto", border: "1px solid var(--line)", borderRadius: 14, padding: 16, marginBottom: 14, background: "#faf9fe" }}>
                  {chatHistory.length === 0 ? (
                    <p style={{ color: "var(--muted)", textAlign: "center", marginTop: 80 }}>
                      {isAr ? "اطرح أي سؤال أو اطلب توضيح نقطة معينة في هذا الدرس وسيجيبك المعلم فوراً." : "Ask any question or request clarification on this lesson."}
                    </p>
                  ) : (
                    chatHistory.map((m, i) => (
                      <div
                        key={i}
                        style={{
                          marginBottom: 12,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: m.role === "user" ? "flex-end" : "flex-start",
                        }}
                      >
                        <div
                          style={{
                            maxWidth: "80%",
                            padding: "10px 16px",
                            borderRadius: 14,
                            background: m.role === "user" ? "var(--alpha)" : "#ffffff",
                            color: m.role === "user" ? "#ffffff" : "var(--ink)",
                            border: m.role === "user" ? "none" : "1px solid var(--line)",
                            fontSize: 14,
                            lineHeight: 1.6,
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {m.text}
                        </div>
                      </div>
                    ))
                  )}
                  {chatStreaming && (
                    <div style={{ color: "var(--muted)", fontSize: 13 }}>
                      <em>{isAr ? "المعلم يكتب..." : "Tutor is typing..."}</em>
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <input
                    className="field"
                    placeholder={isAr ? "اكتب سؤالك هنا..." : "Type your question here..."}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSendChat(); }}
                  />
                  <button className="btn btn-primary" onClick={handleSendChat}>
                    {t("send")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
