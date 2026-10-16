import React, { useState, useEffect } from "react";
import { Store } from "../store";
import { STR, planName, getPricingData } from "../i18n";
import { PersonalizationData } from "../types";
import { Settings } from "./Settings";

interface ProfileProps {
  currentLang: string;
  navigate: (route: string) => void;
  onOpenSignIn: () => void;
  onToast?: (msg: string, kind?: string) => void;
  initialTab?: "profile" | "settings";
}

export const Profile: React.FC<ProfileProps> = ({
  currentLang,
  navigate,
  onOpenSignIn,
  onToast,
  initialTab = "profile",
}) => {
  const [activeTab, setActiveTab] = useState<"profile" | "settings">(initialTab);
  const [slugsCount, setSlugsCount] = useState(0);
  const [personal, setPersonal] = useState<PersonalizationData | null>(null);
  const [loading, setLoading] = useState(true);

  const t = (k: string) => (STR as any)[currentLang]?.[k] || (STR.en as any)?.[k] || k;
  const isAr = currentLang === "ar";
  const plan = Store.plan();
  const pricing = getPricingData(currentLang);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

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
    return () => {
      mounted = false;
    };
  }, []);

  if (!Store.isLoggedIn()) {
    return (
      <div className="main-container" style={{ paddingBottom: 50, paddingTop: 40 }}>
        <div className="page-head">
          <h1>{t("profileTitle")}</h1>
          <p>{t("profileSign")}</p>
          <br />
          <button className="btn btn-primary" onClick={onOpenSignIn}>
            {t("signIn")}
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="main-container" style={{ paddingBottom: 50, textAlign: "center", paddingTop: 60 }}>
        <div className="spinner" style={{ margin: "0 auto 16px" }}></div>
      </div>
    );
  }

  return (
    <div className="main-container" style={{ paddingBottom: 60 }}>
      {/* Page Header */}
      <div className="page-head" style={{ textAlign: "start", marginBottom: 20, marginTop: 16 }}>
        <h1 style={{ fontSize: "clamp(24px, 4vw, 34px)", fontWeight: 800 }}>
          {isAr ? "الملف الشخصي والإعدادات" : "Profile & Settings"}
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 15, marginTop: 4 }}>
          {isAr
            ? "إدارة حسابك الشخصي، تفضيلات التعلم، وإعدادات محرك الذكاء الاصطناعي"
            : "Manage your profile, learning preferences, and AI engine configuration"}
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="tabs" style={{ marginBottom: 24 }}>
        <button
          className={`tab ${activeTab === "profile" ? "active" : ""}`}
          onClick={() => setActiveTab("profile")}
        >
          👤 {t("profileTitle")}
        </button>
        <button
          className={`tab ${activeTab === "settings" ? "active" : ""}`}
          onClick={() => setActiveTab("settings")}
        >
          ⚙️ {t("setTitle")}
        </button>
      </div>

      {/* Profile Details Tab */}
      {activeTab === "profile" && (
        <div className="panel" style={{ border: "1.5px solid var(--line)" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginBottom: 20,
              borderBottom: "1px solid var(--line)",
              paddingBottom: 16,
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "var(--alpha)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                fontWeight: 800,
              }}
            >
              {(Store.user?.name || Store.user?.email || "L").trim()[0].toUpperCase()}
            </div>
            <div>
              <h2 style={{ margin: "0 0 4px", fontSize: 20 }}>{Store.user?.name || "Learner"}</h2>
              <p className="hint" style={{ margin: 0 }}>
                {Store.user?.email} · <span className="badge" style={{ fontSize: 11 }}>{planName(plan, currentLang)}</span>
              </p>
            </div>
          </div>

          <div
            style={{
              background: "#f8fafc",
              border: "1px solid var(--line)",
              borderRadius: 12,
              padding: "16px 20px",
              marginBottom: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>
                  {t("coursesCreated")}
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--ink)", marginTop: 2 }}>
                  {slugsCount}{" "}
                  <span style={{ fontSize: 13, color: "#166534", fontWeight: 600 }}>
                    ({isAr ? "غير محدود مجاناً" : "Unlimited Free"})
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="btn btn-ghost" onClick={() => navigate("#/library")}>
                  {t("openLib")}
                </button>
                <button className="btn btn-ghost" onClick={() => navigate("#/pricing")}>
                  {isAr ? "الأسعار والخطط" : "Plans"}
                </button>
                <button className="btn btn-ghost" onClick={() => setActiveTab("settings")}>
                  ⚙️ {t("setTitle")}
                </button>
              </div>
            </div>
          </div>

          {personal && (
            <div style={{ marginTop: 24 }}>
              <h3 style={{ fontSize: 16, marginBottom: 12 }}>{t("savedPers")}</h3>
              <pre
                style={{
                  background: "#f8fafc",
                  border: "1px solid var(--line)",
                  padding: 16,
                  borderRadius: 12,
                  overflow: "auto",
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                {JSON.stringify(personal, null, 2)}
              </pre>
            </div>
          )}

          <div
            style={{
              borderTop: "1px solid var(--line)",
              marginTop: 28,
              paddingTop: 20,
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <button
              className="btn btn-ghost"
              style={{ color: "#dc2626", borderColor: "#fecaca" }}
              onClick={async () => {
                await Store.signOut();
                navigate("#/");
              }}
            >
              🚪 {t("signOut")}
            </button>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <Settings currentLang={currentLang} onToast={onToast || (() => {})} />
      )}
    </div>
  );
};

