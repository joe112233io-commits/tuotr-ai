import React, { useState } from "react";
import { STR, LISTS } from "../i18n";

interface HomeProps {
  currentLang: string;
  navigate: (route: string) => void;
  onToast: (msg: string, kind?: string) => void;
}

export const Home: React.FC<HomeProps> = ({ currentLang, navigate, onToast }) => {
  const [searchTopic, setSearchTopic] = useState("");
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  const t = (k: string) => (STR as any)[currentLang][k] || (STR.en as any)[k] || k;
  const isAr = currentLang === "ar";
  const popular = isAr ? LISTS.popularCoursesAr : LISTS.popularCourses;
  const feats = isAr ? LISTS.homeFeaturesAr : LISTS.homeFeatures;
  const steps = isAr ? LISTS.howItWorksAr : LISTS.howItWorks;
  const auds = isAr ? LISTS.audiencesAr : LISTS.audiences;
  const faqs = isAr ? LISTS.faqAr : LISTS.faq;
  const stats = [["800K+", t("stat1")], ["10M+", t("stat2")], ["14+", t("stat3")], ["23+", t("stat4")]] as const;

  const handleStart = (topic?: string) => {
    const tpc = (topic !== undefined ? topic : searchTopic || "").trim();
    if (tpc.length > 0) {
      sessionStorage.setItem("tutorai.pendingTopic", tpc);
    } else {
      sessionStorage.removeItem("tutorai.pendingTopic");
    }
    navigate("#/create-course");
  };

  return (
    <div>
      <section className="hero">
        <div className="main-container">
          <h1>
            {t("heroA")}
            <span style={{ display: "block" }}>{t("heroB")}</span>
          </h1>
          <p className="sub">{t("heroSub")}</p>
          <div className="search-wrap">
            <input
              className="search-input"
              aria-label={t("searchPh")}
              placeholder={t("searchPh")}
              value={searchTopic}
              onChange={(e) => setSearchTopic(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleStart(searchTopic); }}
            />
            <button className="btn btn-primary search-btn" onClick={() => handleStart(searchTopic)}>
              {t("createCourseBtn")}
            </button>
          </div>
          <div className="popular">
            <span>{t("popular")}</span>
            {popular.map((p) => {
              const s = p.split("|");
              return (
                <button key={s[1]} className="chip" onClick={() => handleStart(s[0])}>
                  {s[0]}
                </button>
              );
            })}
          </div>
          <div className="demo-link" onClick={() => onToast(t("demoToast"), "ok")}>
            <span className="play">▶</span>
            <span style={{ textDecoration: "underline" }}>{t("demoLink")}</span>
          </div>
          <div className="hero-shot">
            <div className="hero-shot-fallback">
              <h3>{t("shotTitle")}</h3>
              <p>{t("shotSub")}</p>
              <p style={{ marginTop: 14 }}>
                <span className="badge" style={{ background: "#fff", color: "#6d28d9" }}>800K+ {t("stat1")}</span> &nbsp;
                <span className="badge" style={{ background: "#fff", color: "#6d28d9" }}>10M+ {t("stat2")}</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="stats">
        <div className="main-container stats-grid">
          {stats.map((s, i) => (
            <div key={i}>
              <div className="stat-n">{s[0]}</div>
              <div className="stat-l">{s[1]}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="main-container">
          <h2>{t("featTitle")}</h2>
          <p className="lead">{t("featSub")}</p>
          <div className="cards3">
            {feats.map((f, i) => {
              const p = f.split("|");
              return (
                <div key={i} className="card">
                  <div className="ic emoji-ic" aria-hidden="true">{p[0]}</div>
                  <h3>{p[1]}</h3>
                  <p>{p[2]}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="main-container">
          <h2>{t("stepsTitle")}</h2>
          <p className="lead">{t("stepsSub")}</p>
          <div className="cards4">
            {steps.map((s, i) => {
              const p = s.split("|");
              return (
                <div key={i} className="step">
                  <div className="step-n">{p[0]}</div>
                  <div className="step-ic emoji-ic" aria-hidden="true">{p[1]}</div>
                  <h3>{p[2]}</h3>
                  <p style={{ color: "var(--muted)", fontSize: 14 }}>{p[3]}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="main-container">
          <h2>{t("audTitle")}</h2>
          <div className="cards2" style={{ marginTop: 26 }}>
            {auds.map((a, i) => {
              const p = a.split("|");
              return (
                <div key={i} className="card">
                  <div style={{ display: "flex", gap: 14 }}>
                    <div className="aud-ic emoji-ic" aria-hidden="true">{p[0]}</div>
                    <div>
                      <h3>{p[1]}</h3>
                      <p>{p[2]}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="main-container">
          <h2>{t("faqTitle")}</h2>
          <div className="faq" style={{ marginTop: 24 }}>
            {faqs.map((f, i) => {
              const idx = f.indexOf("|");
              const q = f.slice(0, idx);
              const a = f.slice(idx + 1);
              const open = faqOpen === i;
              return (
                <div key={i} className={`faq-item ${open ? "open" : ""}`}>
                  <button className="faq-q" onClick={() => setFaqOpen(open ? null : i)}>
                    <span>{q}</span>
                    <span>{open ? "-" : "+"}</span>
                  </button>
                  <div className="faq-a">{a}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="main-container">
          <div className="cta">
            <h2>{t("ctaTitle")}</h2>
            <p>{t("ctaSub")}</p>
            <div className="cta-row">
              <button className="btn btn-white" onClick={() => navigate("#/create-course")}>{t("ctaBtn1")}</button>
              <button className="btn btn-outline-w" onClick={() => navigate("#/pricing")}>{t("ctaBtn2")}</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
