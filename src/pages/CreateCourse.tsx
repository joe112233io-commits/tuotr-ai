import React, { useState, useEffect } from "react";
import { Store } from "../store";
import { STR, LISTS, getPricingData, planName } from "../i18n";
import { CourseAI } from "../ai";
import { ModuleData } from "../types";

interface CreateCourseProps {
  currentLang: string;
  navigate: (route: string) => void;
  onOpenSignIn: (cb?: () => void) => void;
  onOpenSurvey: (topic: string, settings: any) => void;
  onToast: (msg: string, kind?: string) => void;
}

export const CreateCourse: React.FC<CreateCourseProps> = ({ currentLang, navigate, onOpenSignIn, onOpenSurvey, onToast }) => {
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [useSources, setUseSources] = useState(false);
  const [useStructure, setUseStructure] = useState(false);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number; content: string } | null>(null);
  const [structure, setStructure] = useState<ModuleData[]>([
    {
      title: currentLang === "ar" ? "الوحدة 1: الأساسيات والمدخل" : "Module 1: Foundations & Overview",
      lessons: [
        currentLang === "ar" ? "المفاهيم الجوهرية والتعريفات" : "Core Concepts & Vocabulary",
        currentLang === "ar" ? "أول تدريب تطبيقي عملي" : "First Practical Walkthrough",
      ],
    },
  ]);
  const [aiDrafting, setAiDrafting] = useState(false);
  const [err, setErr] = useState("");
  const [hwOpen, setHwOpen] = useState(false);
  const [hwQ, setHwQ] = useState("");
  const [hwOut, setHwOut] = useState("");
  const [hwLoading, setHwLoading] = useState(false);

  const t = (k: string) => (STR as any)[currentLang][k] || (STR.en as any)[k] || k;
  const isAr = currentLang === "ar";
  const suggestions = isAr ? LISTS.suggestedTopicsAr : LISTS.suggestedTopics;
  const pricing = getPricingData(currentLang);
  const plan = Store.plan();
  const planMaxCourses = pricing[plan]?.maxCourses || 6;

  useEffect(() => {
    const pending = sessionStorage.getItem("tutorai.pendingTopic");
    if (pending) {
      setTopic(pending);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const limitMB = plan === 2 ? 20 : plan === 1 ? 10 : 4;
    if (f.size > limitMB * 1048576 && /pdf/i.test(f.type || f.name)) {
      onToast(`File ${f.name} exceeds your ${limitMB}MB upload limit for PDFs.`, "err");
      e.target.value = "";
      return;
    }
    if (/text|md/.test(f.type) || /\.(txt|md)$/i.test(f.name)) {
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result);
        setFileInfo({ name: f.name, size: f.size, content: text.slice(0, 20000) });
        onToast(isAr ? `تم تحميل الملف: ${f.name}` : `File loaded: ${f.name}`, "ok");
      };
      reader.readAsText(f);
    } else {
      setFileInfo({ name: f.name, size: f.size, content: "" });
      onToast(isAr ? `تم تحديد الملف: ${f.name}` : `File selected: ${f.name}`, "ok");
    }
  };

  const handleAiDraft = async () => {
    const tpc = topic.trim() || (isAr ? "هذا الموضوع" : "this topic");
    setAiDrafting(true);
    try {
      const o = await CourseAI.generateOutline(tpc, null, null, currentLang);
      if (o.modules && o.modules.length > 0) {
        setStructure(o.modules.map((m) => ({ title: m.title, lessons: [...m.lessons] })));
        onToast(t("structToast"), "ok");
      }
    } catch (e) {
      onToast(t("wentWrong"), "err");
    } finally {
      setAiDrafting(false);
    }
  };

  const authorize = (tpc: string) => {
    const low = tpc.toLowerCase();
    const banned = LISTS.bannedWords;
    if (banned.some((w) => low.includes(w.toLowerCase())) || /(bomb|murder|child abuse|hack bank|steal)/i.test(tpc)) {
      return { ok: false, msg: t("banned") };
    }
    if (tpc.length < 2) return { ok: false, msg: t("noInfo") };
    return { ok: true };
  };

  const handleCreate = async () => {
    setErr("");
    const tpc = topic.trim();
    if (!Store.isLoggedIn()) {
      onOpenSignIn(handleCreate);
      return;
    }
    if (tpc.length < 2) {
      setErr(t("needTopic"));
      return;
    }
    const auth = authorize(tpc);
    if (!auth.ok) {
      setErr(auth.msg);
      return;
    }

    let settings: any = { difficulty };
    if (useStructure && structure && structure.length > 0) {
      settings.course_structure = structure.map((m) => ({ module_name: m.title, lesson_names: m.lessons }));
    }
    if (fileInfo && fileInfo.content) {
      settings.source_document = fileInfo.name;
      settings.source_excerpt = fileInfo.content.slice(0, 4000);
    }

    onOpenSurvey(tpc, settings);
  };

  const solveHomework = async () => {
    const q = hwQ.trim();
    if (!q) return;
    if (!Store.isLoggedIn()) {
      onOpenSignIn(solveHomework);
      return;
    }
    setHwLoading(true);
    setHwOut("");
    let html = "";
    try {
      await CourseAI.homework(q, currentLang, (chunk) => {
        html += chunk;
        setHwOut(html);
      });
    } catch (e) {
      setHwOut(t("wentWrong"));
    } finally {
      setHwLoading(false);
    }
  };

  return (
    <div className="main-container" style={{ paddingBottom: 60 }}>
      <div className="page-head" style={{ textAlign: "start", marginBottom: 24 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--alpha-50)", color: "var(--alpha-dark)", padding: "4px 14px", borderRadius: 999, fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
          <span>✦</span>
          <span>{isAr ? "منصة بناء وتصميم المناهج الذكية" : "AI Course Builder & Curriculum Architect"}</span>
        </div>
        <h1 style={{ fontSize: "clamp(26px, 3.5vw, 38px)", margin: "4px 0 8px", fontWeight: 800 }}>{t("createTitle")}</h1>
        <p style={{ color: "var(--muted)", fontSize: 16 }}>
          {isAr
            ? "أدخل أي موضوع ترغب في تعلمه، وحدد تفضيلاتك وسيقوم الذكاء الاصطناعي ببناء دورة تعليمية متكاملة."
            : "Enter any subject to instantly architect a comprehensive, personalized course."}
        </p>
      </div>

      <div className="create-grid">
        <div className="panel" style={{ boxShadow: "0 10px 30px -10px rgba(124,58,237,.15)", border: "1.5px solid var(--line)" }}>
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontWeight: 700, fontSize: 14, marginBottom: 8, color: "var(--ink)" }}>
              {isAr ? "موضوع الدورة التعليمة" : "Course Topic"}
            </label>
            <input
              id="ctTopic"
              className="field"
              style={{ borderRadius: 14, padding: "16px 20px", fontSize: 16, fontWeight: 500 }}
              placeholder={t("topicPh")}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontWeight: 700, fontSize: 13, marginBottom: 8, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {isAr ? "مستوى الصعوبة" : "Target Difficulty"}
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {[
                { id: "beginner", label: isAr ? "مبتدئ" : "Beginner", desc: isAr ? "أساسيات من الصفر" : "Zero to hero basics" },
                { id: "intermediate", label: isAr ? "متوسط" : "Intermediate", desc: isAr ? "تطبيق وتوسع" : "Hands-on depth" },
                { id: "advanced", label: isAr ? "متقدم" : "Advanced", desc: isAr ? "احتراف وتعمق" : "Mastery & nuance" },
              ].map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => setDifficulty(lvl.id as any)}
                  style={{
                    border: difficulty === lvl.id ? "2px solid var(--alpha)" : "1.5px solid var(--line)",
                    background: difficulty === lvl.id ? "var(--alpha-50)" : "#fff",
                    color: difficulty === lvl.id ? "var(--alpha-dark)" : "var(--ink)",
                    borderRadius: 12,
                    padding: "10px 8px",
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all .15s",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{lvl.label}</div>
                  <small style={{ color: "var(--muted)", fontSize: 11 }}>{lvl.desc}</small>
                </button>
              ))}
            </div>
          </div>

          <div style={{ background: "#faf9fe", borderRadius: 14, padding: "14px 18px", marginBottom: 20, border: "1px solid var(--line)" }}>
            <div className="toggle-row" style={{ marginTop: 0 }}>
              <label className="switch">
                <input type="checkbox" checked={useSources} onChange={(e) => setUseSources(e.target.checked)} />
                <span className="knob"></span>
              </label>
              <div>
                <b>{t("useSources")}</b><br />
                <small>{t("useSourcesSub")}</small>
              </div>
            </div>

            <div className="toggle-row" style={{ marginTop: 14, borderTop: "1px dashed var(--line)", paddingTop: 14 }}>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={useStructure}
                  onChange={(e) => setUseStructure(e.target.checked)}
                />
                <span className="knob"></span>
              </label>
              <div>
                <b>{t("useStruct")}</b><br />
                <small>{t("useStructSub")}</small>
              </div>
            </div>
          </div>

          {err && <div className="err" style={{ marginBottom: 14, padding: "10px 14px", background: "#fef2f2", borderRadius: 10, border: "1px solid #fecaca" }}>{err}</div>}

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <button className="btn btn-primary" style={{ padding: "14px 32px", fontSize: 16 }} onClick={handleCreate}>
              {t("createBtn")}
            </button>
            <button className="btn btn-ghost" style={{ padding: "12px 22px" }} onClick={() => setHwOpen(!hwOpen)}>
              {t("hwBtn")}
            </button>
          </div>

          {/* Sources Upload Panel */}
          {useSources && (
            <div style={{ marginTop: 22, borderTop: "1px solid var(--line)", paddingTop: 18 }}>
              <h3 style={{ fontSize: 17, margin: "0 0 8px" }}>{t("srcTitle")}</h3>
              <div style={{ border: "2px dashed #c4b5fd", borderRadius: 14, padding: "20px", textAlign: "center", background: "#fdfcff" }}>
                <input
                  type="file"
                  id="sourceUpload"
                  accept=".txt,.md,.pdf"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
                <label htmlFor="sourceUpload" className="btn btn-ghost" style={{ cursor: "pointer", display: "inline-block", marginBottom: 8 }}>
                  📁 {isAr ? "اختر ملفاً (PDF أو TXT أو MD)" : "Choose document (PDF, TXT, MD)"}
                </label>
                <div className="hint" style={{ fontSize: 12 }}>{t("fileHint")}</div>
                {fileInfo && (
                  <div style={{ marginTop: 12, padding: "8px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, display: "inline-flex", alignItems: "center", gap: 10, color: "#166534" }}>
                    <span>✓ {fileInfo.name} ({(fileInfo.size / 1024).toFixed(1)} KB)</span>
                    <button
                      type="button"
                      style={{ background: "none", border: 0, color: "#dc2626", cursor: "pointer", fontWeight: 700 }}
                      onClick={() => setFileInfo(null)}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Structure Customizer */}
          {useStructure && (
            <div style={{ marginTop: 22, borderTop: "1px solid var(--line)", paddingTop: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontSize: 17, margin: 0 }}>{t("structTitle")}</h3>
                  <small style={{ color: "var(--muted)" }}>{t("structSub")}</small>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ padding: "7px 16px", fontSize: 13 }}
                  disabled={aiDrafting}
                  onClick={handleAiDraft}
                >
                  {aiDrafting ? t("aiDrafting") : t("aiDraft")}
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {structure.map((mod, i) => (
                  <div key={i} style={{ border: "1px solid var(--line)", borderRadius: 14, padding: "14px", background: "#faf9fe" }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                      <span style={{ fontWeight: 800, color: "var(--alpha)" }}>#{i + 1}</span>
                      <input
                        className="field"
                        style={{ fontWeight: 700 }}
                        value={mod.title}
                        onChange={(e) => {
                          const val = e.target.value;
                          setStructure((prev) => prev.map((item, idx) => (idx === i ? { ...item, title: val } : item)));
                        }}
                      />
                      <button
                        type="button"
                        style={{ background: "none", border: 0, color: "#dc2626", cursor: "pointer", fontSize: 18 }}
                        title="Delete Module"
                        onClick={() => setStructure((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        🗑
                      </button>
                    </div>

                    <div style={{ paddingInlineStart: 24, display: "flex", flexDirection: "column", gap: 6 }}>
                      {mod.lessons.map((les, j) => (
                        <div key={j} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span style={{ color: "var(--muted)", fontSize: 13 }}>•</span>
                          <input
                            className="field"
                            style={{ padding: "8px 12px", fontSize: 14 }}
                            value={les}
                            onChange={(e) => {
                              const val = e.target.value;
                              setStructure((prev) =>
                                prev.map((item, idx) =>
                                  idx === i
                                    ? { ...item, lessons: item.lessons.map((l, ldx) => (ldx === j ? val : l)) }
                                    : item
                                )
                              );
                            }}
                          />
                          <button
                            type="button"
                            style={{ background: "none", border: 0, color: "#9ca3af", cursor: "pointer" }}
                            onClick={() => {
                              setStructure((prev) =>
                                prev.map((item, idx) =>
                                  idx === i ? { ...item, lessons: item.lessons.filter((_, ldx) => ldx !== j) } : item
                                )
                              );
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ padding: "5px 12px", fontSize: 12, alignSelf: "flex-start", marginTop: 4 }}
                        onClick={() => {
                          setStructure((prev) =>
                            prev.map((item, idx) =>
                              idx === i
                                ? { ...item, lessons: [...item.lessons, isAr ? `درس جديد ${item.lessons.length + 1}` : `New Lesson ${item.lessons.length + 1}`] }
                                : item
                            )
                          );
                        }}
                      >
                        + {isAr ? "إضافة درس" : "Add Lesson"}
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ padding: "10px 18px", fontSize: 13, alignSelf: "flex-start" }}
                  onClick={() =>
                    setStructure((prev) => [
                      ...prev,
                      {
                        title: isAr ? `الوحدة ${prev.length + 1}: موضوع جديد` : `Module ${prev.length + 1}: New Topic`,
                        lessons: [isAr ? "الدرس 1" : "Lesson 1"],
                      },
                    ])
                  }
                >
                  {t("addModule")}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar / Recommended Topics Panel */}
        <div className="panel" style={{ boxShadow: "0 10px 30px -10px rgba(124,58,237,.15)", border: "1.5px solid var(--line)" }}>
          <h3 style={{ marginTop: 0, fontSize: 18 }}>{t("sugTitle")}</h3>
          <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 14px" }}>
            {isAr ? "انقر على أي موضوع لبدء توليد مسار التعلم فوراً:" : "Click any topic to prefill your course builder:"}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                className="chip"
                style={{ background: topic === s ? "var(--alpha-50)" : "rgba(255,255,255,.9)", borderColor: topic === s ? "var(--alpha)" : "var(--line)" }}
                onClick={() => setTopic(s)}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="kv-note" style={{ borderRadius: 12, padding: "14px 16px", background: "#f5f3ff", border: "1px solid #ddd6fe" }}>
            <div style={{ fontWeight: 800, color: "var(--alpha-dark)", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
              <span>✨</span>
              <span>{isAr ? "كل شيء متاح مجاناً للجميع حالياً" : "All Features Free For Everyone"}</span>
            </div>
            <div style={{ color: "#5b21b6", fontSize: 13, lineHeight: 1.5 }}>
              {isAr
                ? "إنشاء الدورات مفتوح بلا حدود، والاشتراكات المدفوعة غير متوفرة للشراء حالياً (قريباً). استمتع بالتعلم الكامل!"
                : "Unlimited course creation unlocked. Paid tiers are coming soon and unavailable for purchase. Enjoy full access!"}
            </div>
            {Store.isLoggedIn() && Store.user && (
              <div style={{ marginTop: 6, fontSize: 12, color: "var(--muted)" }}>
                {Store.user.email} · {planName(plan, currentLang)}
              </div>
            )}
          </div>

          {/* Homework Solver Drawer */}
          {hwOpen && (
            <div style={{ marginTop: 22, borderTop: "1px solid var(--line)", paddingTop: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 20 }}>🤖</span>
                <h3 style={{ margin: 0, fontSize: 18 }}>{t("hwTitle")}</h3>
              </div>
              <textarea
                className="field"
                rows={3}
                placeholder={t("hwPh")}
                value={hwQ}
                onChange={(e) => setHwQ(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-primary"
                style={{ marginTop: 10, padding: "10px 22px" }}
                disabled={hwLoading}
                onClick={solveHomework}
              >
                {hwLoading ? "..." : t("hwGo")}
              </button>
              {hwOut && (
                <div
                  style={{
                    marginTop: 14,
                    padding: 14,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 12,
                    lineHeight: 1.7,
                    whiteSpace: "pre-wrap",
                    fontSize: 14,
                  }}
                  dangerouslySetInnerHTML={{ __html: hwOut }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
