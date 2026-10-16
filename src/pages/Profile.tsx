import React, { useState, useEffect } from "react";
import { Store } from "../store";
import { STR, planName, getPricingData } from "../i18n";
import { PersonalizationData } from "../types";

interface ProfileProps {
  currentLang: string;
  navigate: (route: string) => void;
  onOpenSignIn: () => void;
}

export const Profile: React.FC<ProfileProps> = ({ currentLang, navigate, onOpenSignIn }) => {
  const [slugsCount, setSlugsCount] = useState(0);
  const [personal, setPersonal] = useState<PersonalizationData | null>(null);
  const [loading, setLoading] = useState(true);

  const t = (k: string) => (STR as any)[currentLang][k] || (STR.en as any)[k] || k;
  const isAr = currentLang === "ar";
  const plan = Store.plan();
  const pricing = getPricingData(currentLang);
  const maxCourses = pricing[plan]?.maxCourses || 6;

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!Store.isLoggedIn()) {
        if (mounted) setLoading(false);
        return;
      }
      const sList = await Store.mySlugs();
      const pData = await Store.getPersonalization();
      if (mounted) {
        setSlugsCount(sList.length);
        setPersonal(pData);
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
          <h1>{t("profileTitle")}</h1>
          <p>{t("profileSign")}</p>
          <br />
          <button className="btn btn-primary" onClick={onOpenSignIn}>{t("signIn")}</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="main-container" style={{ paddingBottom: 50 }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="main-container" style={{ paddingBottom: 50 }}>
      <div className="page-head" style={{ textAlign: "start" }}>
        <h1>{t("profileTitle")}</h1>
      </div>
      <div className="panel">
        <h3 style={{ marginTop: 0 }}>{Store.user?.name || "Learner"}</h3>
        <p className="hint">
          {Store.user?.email} · {planName(plan, currentLang)} · A/B {Store.identity.ab}
        </p>
        <p>
          {t("coursesCreated")}<b>{slugsCount} ({isAr ? "غير محدود مجاناً" : "Unlimited Free"})</b>
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
          <button className="btn btn-ghost" onClick={() => navigate("#/library")}>{t("openLib")}</button>
          <button className="btn btn-ghost" onClick={() => navigate("#/pricing")}>{isAr ? "الأسعار والخطط" : "Plans"}</button>
          <button className="btn btn-ghost" onClick={() => navigate("#/settings")}>{t("navSettings")}</button>
          <button
            className="btn btn-ghost"
            onClick={async () => {
              await Store.signOut();
              navigate("#/");
            }}
          >
            {t("signOut")}
          </button>
        </div>
        {personal && (
          <>
            <h3>{t("savedPers")}</h3>
            <pre style={{ background: "var(--alpha-50)", padding: 14, borderRadius: 10, overflow: "auto", fontSize: 13 }}>
              {JSON.stringify(personal, null, 1)}
            </pre>
          </>
        )}
      </div>
    </div>
  );
};
