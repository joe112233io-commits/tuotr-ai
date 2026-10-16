import React, { useState, useEffect } from "react";
import DOMPurify from "dompurify";
import { Store } from "../store";
import { STR, planName } from "../i18n";
import { CourseAI } from "../ai";
import { Course } from "../types";
import { LessonDoc, HarnessError } from "../harness";

interface CourseDetailProps {
  slug: string;
  currentLang: string;
  navigate: (route: string) => void;
  setLang: (l: string) => void;
  onToast: (msg: string, kind?: string) => void;
}

export const CourseDetail: React.FC<CourseDetailProps> = ({ slug, currentLang, navigate, setLang, onToast }) => {
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [modIdx, setModIdx] = useState(0);
  const [lesIdx, setLesIdx] = useState(0);
  const [tab, setTab] = useState<"lesson" | "quiz" | "flash" | "mind" | "chat">("lesson");
  const [progress, setProgress] = useState<{ done: string[]; quiz: any }>({ done: [], quiz: {} });
  const [lessonHtml, setLessonHtml] = useState("");
  const [lessonLoading, setLessonLoading] = useState(false);
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
      setLessonHtml(cachedHtml);
      return;
    }

    setLessonLoading(true);
    setLessonHtml("");
    let streamingHtml = "";

    try {
      const personal = course.personal ? await Store.getPersonalization() : null;
      const totalLessons = course.outline.modules.reduce((acc, m) => acc + m.lessons.length, 0);

      const result = await CourseAI.generateLessonStream(
        course.title || course.topic,
        course.topic,
        curModule.title,
        curLessonTitle,
        personal,
        course.lang || currentLang,
        (chunk) => {
          streamingHtml += chunk;
          setLessonHtml(streamingHtml);
        },
        {
          slug,
          lessonIndex: lesIdx,
          totalLessons,
          outline: course.outline,
          settings: course.settings,
          difficulty: course.settings?.difficulty || "beginner",
        }
      );

      // Save verified data and rendered HTML
      if (!course.lessonDocs) course.lessonDocs = {};
      course.lessonDocs[lessonIdKey] = result.doc;
      if (!course.lessons) course.lessons = {};
      course.lessons[lessonIdKey] = result.html;
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
                return (
                  <button
                    key={j}
                    className={`les ${isActive ? "active" : ""} ${isDone ? "done" : ""}`}
                    onClick={() => {
                      setModIdx(i);
                      setLesIdx(j);
                      setTab("lesson");
                    }}
                  >
                    {l}
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
                <div style={{ borderBottom: "1px solid var(--line)", paddingBottom: 14, marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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

                {lessonLoading && (
                  <div style={{ textAlign: "center", padding: "40px 0" }}>
                    <div className="spinner"></div>
                    <p className="pulse" style={{ marginTop: 12, fontWeight: 600, color: "var(--alpha)" }}>
                      {t("writingLesson")}
                    </p>
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

                {!lessonLoading && !lessonError && (
                  <div dangerouslySetInnerHTML={{ __html: sanitizedLessonHtml }} />
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 32, paddingTop: 20, borderTop: "1px solid var(--line)" }}>
                  <button className="btn btn-ghost" onClick={() => stepLesson(-1)}>
                    {isAr ? "← الدرس السابق" : "← Previous Lesson"}
                  </button>
                  <button className="btn btn-primary" onClick={completeAndNext}>
                    {isAr ? "إتمام والانتقال للدرس التالي →" : "Complete & Next Lesson →"}
                  </button>
                </div>
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
