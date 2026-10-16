import React, { useState, useEffect } from "react";
import { Store } from "../store";
import { STR, planName } from "../i18n";
import { Course } from "../types";

interface LibraryProps {
  currentLang: string;
  navigate: (route: string) => void;
  onOpenSignIn: () => void;
}

export const Library: React.FC<LibraryProps> = ({ currentLang, navigate, onOpenSignIn }) => {
  const [slugs, setSlugs] = useState<string[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [armedDel, setArmedDel] = useState<string | null>(null);

  const t = (k: string) => (STR as any)[currentLang][k] || (STR.en as any)[k] || k;
  const plan = Store.plan();

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!Store.isLoggedIn()) {
        if (mounted) setLoading(false);
        return;
      }
      const sList = await Store.mySlugs();
      const cList: Course[] = [];
      for (const s of sList) {
        const c = await Store.getCourse(s);
        if (c) cList.push(c);
      }
      if (mounted) {
        setSlugs(sList);
        setCourses(cList);
        setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  if (!Store.isLoggedIn()) {
    return (
      <div className="main-container">
        <div className="page-head">
          <h1>{t("libTitle")}</h1>
          <p>{t("libSign")}</p>
          <br />
          <button className="btn btn-primary" onClick={onOpenSignIn}>{t("signIn")}</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="main-container" style={{ paddingBottom: 40 }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="main-container" style={{ paddingBottom: 40 }}>
      <div className="page-head" style={{ textAlign: "start" }}>
        <h1>{t("libTitle")}</h1>
        <p>{slugs.length} · {planName(plan, currentLang)}</p>
      </div>
      {slugs.length === 0 ? (
        <div className="card" style={{ marginTop: 20 }}>
          <h3>{t("libEmptyT")}</h3>
          <p>{t("libEmptyS")}</p>
          <br />
          <button className="btn btn-primary" onClick={() => navigate("#/create-course")}>{t("libCreate")}</button>
        </div>
      ) : (
        <div className="lib-grid">
          {courses.map((c) => {
            const n = c.outline ? c.outline.modules.reduce((a, m) => a + m.lessons.length, 0) : 0;
            const isArmed = armedDel === c.slug;
            return (
              <div key={c.slug} className="lib-card" onClick={() => navigate("#/course/" + encodeURIComponent(c.slug))}>
                <h3>{(c.outline && c.outline.title) || c.topic}</h3>
                <p>{n} {t("lessons")} · {new Date(c.createdAt).toLocaleDateString(currentLang === "ar" ? "ar" : "en")}</p>
                <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                  <button className="btn btn-primary" style={{ padding: "8px 18px", fontSize: 13 }} onClick={(e) => { e.stopPropagation(); navigate("#/course/" + encodeURIComponent(c.slug)); }}>
                    {t("open")}
                  </button>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: "8px 18px", fontSize: 13 }}
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!isArmed) {
                        setArmedDel(c.slug);
                        setTimeout(() => setArmedDel(null), 4000);
                        return;
                      }
                      setArmedDel(null);
                      await Store.removeFromLibrary(c.slug);
                      setSlugs(await Store.mySlugs());
                      setCourses((prev) => prev.filter((item) => item.slug !== c.slug));
                    }}
                  >
                    {isArmed ? `⚠ ${t("delConfirm")}` : t("del")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
