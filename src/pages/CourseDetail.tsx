import React, { useState, useEffect } from "react";
import { Store } from "../store";
import { STR, planName } from "../i18n";
import { CourseAI, AIProvider } from "../ai";
import { Course } from "../types";

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
  const [quizData, setQuizData] = useState<any[] | null>(null);
  const [quizScore, setQuizScore] = useState<string | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizRevealed, setQuizRevealed] = useState<Record<number, boolean>>({});
  const [flashCards, setFlashCards] = useState<any[] | null>(null);
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatStreaming, setChatStreaming] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const t = (k: string) => (STR as any)[currentLang][k] || (STR.en as any)[k] || k;
  const isAr = currentLang === "ar";
  const plan = Store.plan();

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      const c = await Store.getCourse(slug);
      if (!c) {
        if (mounted) setCourse(null);
        setLoading(false);
        return;
      }
      if (c.lang && c.lang !== currentLang) {
        setLang(c.lang);
      }
      if (Store.isLoggedIn()) {
        const p = await Store.getProgress(slug);
        if (mounted) setProgress(p);
      }
      if (!c.outline) {
        try {
          const personal = c.personal ? await Store.getPersonalization() : null;
          const outline = await CourseAI.generateOutline(c.topic, personal, c.settings, c.lang || currentLang);
          c.outline = outline;
          c.title = outline.title || c.topic;
          await Store.saveCourse(c);
        } catch (e) {
          onToast(t("outlineFail"), "err");
          c.outline = {
            title: c.topic,
            summary: "",
            outcomes: [],
            modules: [{ title: "Module 1", lessons: ["Lesson 1"] }],
          };
          await Store.saveCourse(c);
        }
      }
      if (mounted) {
        setCourse(c);
        setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
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
    if (!course) return;
    const cached = course.lessons[lessonIdKey];
    if (cached && !/&lt;(h3|p|ul|pre|table)[\s>]/.test(cached)) {
      setLessonHtml(cached);
      return;
    }
    setLessonLoading(true);
    setLessonHtml("");
    let raw = "";
    try {
      const personal = course.personal ? await Store.getPersonalization() : null;
      await CourseAI.generateLessonStream(
        course.title || course.topic,
        course.topic,
        curModule!.title,
        curLessonTitle,
        personal,
        course.lang || currentLang,
        (chunk) => {
          raw += chunk;
          setLessonHtml(raw);
        }
      );
      const text = raw.trim() ? raw : "";
      let rendered = `<div style='white-space:pre-wrap'>${text}</div>`;
      if (/<[a-z][\s>/]/i.test(text)) {
        const doc = new DOMParser().parseFromString(text, "text/html");
        doc.querySelectorAll("table").forEach((tbl) => {
          const wrap = doc.createElement("div");
          wrap.className = "tbl-wrap";
          tbl.replaceWith(wrap);
          wrap.appendChild(tbl);
        });
        rendered = doc.body.innerHTML.trim() ? doc.body.innerHTML : rendered;
      }
      course.lessons[lessonIdKey] = rendered;
      await Store.saveCourse(course);
      setLessonHtml(rendered);
    } catch (e) {
      setLessonHtml(t("lessonFail"));
    } finally {
      setLessonLoading(false);
    }
  };

  const loadQuiz = async () => {
    if (!course) return;
    setQuizData(null);
    setQuizScore(null);
    setQuizAnswers({});
    setQuizRevealed({});
    try {
      const qs = await CourseAI.generateQuiz(course.title || course.topic, curModule!.title, curLessonTitle, course.lang || currentLang);
      setQuizData(qs);
    } catch (e) {
      setQuizData([]);
    }
  };

  const loadFlashcards = async () => {
    if (!course) return;
    setFlashCards(null);
    setFlippedCards({});
    try {
      const cards = await CourseAI.generateFlashcards(course.title || course.topic, course.topic, course.lang || currentLang);
      setFlashCards(cards);
    } catch (e) {
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
      await CourseAI.chat(
        course.title || course.topic,
        course.topic,
        curLessonTitle,
        newHist.slice(0, -1),
        q,
        course.lang || currentLang,
        (chunk) => {
          tutorReply += chunk;
          setChatHistory([...newHist, { role: "tutor", text: tutorReply }]);
        }
      );
    } catch (e) {
      tutorReply = t("wentWrong");
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

    const tmpDiv = document.createElement("div");
    tmpDiv.innerHTML = lessonHtml;
    const textContent = tmpDiv.textContent || tmpDiv.innerText || "";
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
      let curY = cy - (branchMods.reduce((acc, m) => acc + 48 + m.lessons.length * 40 + 20, 0) / 2) + pad;

      branchMods.forEach((m) => {
        const mx = dir > 0 ? cx + rootW / 2 + gapX : cx - rootW / 2 - gapX - modW;
        const my = curY;
        const color = MODC[m.i % MODC.length];

        // Connector curve root -> module
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

        // Module Node
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

          // Connector module -> lesson
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

          // Lesson Node
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
                <div dangerouslySetInnerHTML={{ __html: lessonHtml }} />
              </div>
            )}

            {/* QUIZ TAB */}
            {tab === "quiz" && (
              <div>
                <h3 style={{ marginTop: 0 }}>{isAr ? "اختبار استيعاب الدرس:" : "Mastery Quiz:"} {curLessonTitle}</h3>
                {!quizData ? (
                  <div style={{ textAlign: "center", padding: "40px 0" }}>
                    <div className="spinner"></div>
                    <p className="pulse">{t("quizPrep")}</p>
                  </div>
                ) : quizData.length === 0 ? (
                  <p>{t("quizFail")}</p>
                ) : (
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
                        let sc = 0;
                        quizData.forEach((q, i) => {
                          if (quizAnswers[i] === q.answer) sc++;
                        });
                        setQuizScore(`${t("score")} ${sc} / ${quizData.length}`);
                      }}
                    >
                      {t("checkAns")}
                    </button>
                    {quizScore && <div style={{ marginTop: 12, fontWeight: 800, fontSize: 16 }}>{quizScore}</div>}
                  </div>
                )}
              </div>
            )}

            {/* FLASHCARDS TAB */}
            {tab === "flash" && (
              <div>
                <h3 style={{ marginTop: 0 }}>{t("flashTitle")}</h3>
                <p style={{ color: "var(--muted)", fontSize: 14 }}>
                  {isAr ? "انقر على أي بطاقة لعرض الإجابة والشرح وتثبيت المعلومة." : "Click any flashcard to flip between definition and answer."}
                </p>
                {!flashCards ? (
                  <div style={{ textAlign: "center", padding: "40px 0" }}>
                    <div className="spinner"></div>
                    <p className="pulse">{t("flashMake")}</p>
                  </div>
                ) : flashCards.length === 0 ? (
                  <p>{t("flashFail")}</p>
                ) : (
                  <div className="flash-grid">
                    {flashCards.map((f, i) => {
                      const flipped = flippedCards[i];
                      return (
                        <div
                          key={i}
                          className="flash"
                          style={{
                            background: flipped ? "var(--alpha-50)" : "#ffffff",
                            borderColor: flipped ? "var(--alpha)" : "var(--line)",
                            boxShadow: "0 4px 14px rgba(0,0,0,.04)",
                          }}
                          onClick={() => setFlippedCards({ ...flippedCards, [i]: !flipped })}
                        >
                          <div style={{ padding: 10 }}>
                            {flipped ? f.back : f.front}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* MIND MAP TAB */}
            {tab === "mind" && (
              <div>
                <h3 style={{ marginTop: 0 }}>{t("mindTitle")}</h3>
                <p className="hint">{t("mindHint")}</p>
                <div className="map-scroll" style={{ padding: "20px 10px", overflowX: "auto" }}>
                  {renderMindMapSVG()}
                </div>
              </div>
            )}

            {/* AI TUTOR CHAT TAB */}
            {tab === "chat" && (
              <div>
                <h3 style={{ marginTop: 0 }}>{t("chatTitle")}</h3>
                <div id="chatLog" style={{ display: "flex", flexDirection: "column", gap: 12, margin: "16px 0", maxHeight: 420, overflowY: "auto" }}>
                  {chatHistory.length === 0 && (
                    <div style={{ padding: 20, textAlign: "center", color: "var(--muted)", background: "#faf9fe", borderRadius: 14 }}>
                      {isAr
                        ? `مرحباً! أنا مدرسك الذكي لدورة "${outline.title || course.topic}". اسألني أي سؤال حول درس "${curLessonTitle}".`
                        : `Hello! I am your AI Tutor for "${outline.title || course.topic}". Ask me anything about "${curLessonTitle}".`}
                    </div>
                  )}
                  {chatHistory.map((m, i) => (
                    <div
                      key={i}
                      style={{
                        background: m.role === "user" ? "#f3f4f6" : "var(--alpha-50)",
                        borderRadius: 14,
                        padding: "12px 18px",
                        whiteSpace: "pre-wrap",
                        alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                        maxWidth: "85%",
                        border: m.role === "user" ? "1px solid #e5e7eb" : "1px solid #e9d5ff",
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>
                        {m.role === "user" ? (isAr ? "أنت" : "You") : (isAr ? "المدرس الذكي" : "AI Tutor")}
                      </div>
                      {m.text}
                    </div>
                  ))}
                  {chatStreaming && (
                    <div style={{ background: "var(--alpha-50)", borderRadius: 14, padding: "12px 18px", maxWidth: "85%" }}>
                      <span className="pulse">{t("thinking")}</span>
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <input
                    className="field"
                    placeholder={t("chatPh")}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSendChat(); }}
                  />
                  <button className="btn btn-primary" onClick={handleSendChat}>{t("send")}</button>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Controls */}
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
            <button className="btn btn-ghost" style={{ padding: "11px 24px" }} onClick={() => stepLesson(-1)}>
              {t("prev")}
            </button>
            <button className="btn btn-primary" style={{ padding: "11px 26px" }} onClick={completeAndNext}>
              {t("doneNext")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
