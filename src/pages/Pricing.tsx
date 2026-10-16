import React, { useState } from "react";
import { Store } from "../store";
import { STR, getPricingData } from "../i18n";

interface PricingProps {
  currentLang: string;
  navigate: (route: string) => void;
  onOpenSignIn: (cb?: () => void) => void;
  onStartCheckout: (planId: number, yearly: boolean) => void;
}

export const Pricing: React.FC<PricingProps> = ({ currentLang, navigate }) => {
  const [yearly, setYearly] = useState(true);
  const t = (k: string) => (STR as any)[currentLang][k] || (STR.en as any)[k] || k;
  const isAr = currentLang === "ar";
  const pricingData = getPricingData(currentLang);

  return (
    <div className="main-container" style={{ paddingBottom: 60 }}>
      {/* Free Access Announcement Banner */}
      <div
        style={{
          marginTop: 24,
          padding: "20px 24px",
          background: "linear-gradient(135deg, #f5f1ff, #ede9fe)",
          border: "2px solid #c4b5fd",
          borderRadius: 20,
          boxShadow: "0 10px 30px -10px rgba(124,58,237,.18)",
          textAlign: "center",
        }}
      >
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--alpha)", color: "#fff", padding: "4px 16px", borderRadius: 999, fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
          <span>🎉</span>
          <span>{isAr ? "كل شيء متاح مجاناً للجميع حالياً" : "All Features Currently 100% Free"}</span>
        </div>
        <h2 style={{ margin: "4px 0 8px", fontSize: "clamp(20px, 2.5vw, 26px)", fontWeight: 800, color: "var(--ink)" }}>
          {isAr
            ? "الاشتراكات المدفوعة غير متوفرة للشراء حالياً (قريباً)"
            : "Paid Subscriptions Are Currently Unavailable (Coming Soon)"}
        </h2>
        <p style={{ margin: "0 auto", maxWidth: 720, color: "var(--muted)", fontSize: 15, lineHeight: 1.6 }}>
          {isAr
            ? "نحن نتيح لكافة المستخدمين تجربة كامل ميزات المنصة مجاناً وبلا قيود؛ بما في ذلك إنشاء عدد غير محدود من الدورات، والتخصيص الكامل، والاختبارات، والبطاقات التعليمية، والمدرس الذكي."
            : "All platform capabilities are unlocked for free with no limits; including unlimited course generation, personalization, quizzes, flashcards, mind maps, and AI tutor support."}
        </p>
      </div>

      <div className="page-head" style={{ marginTop: 20 }}>
        <h1>{t("priceTitle")}</h1>
        <p>{t("priceSub")}</p>
      </div>

      <div className="bill-toggle">
        <span>{t("billYearly")}</span>
        <label className="switch">
          <input type="checkbox" checked={yearly} onChange={(e) => setYearly(e.target.checked)} />
          <span className="knob"></span>
        </label>
        <span style={{ color: "var(--green)", fontSize: 14 }}>{t("save30")}</span>
      </div>

      <div className="price-grid">
        {pricingData.map((p: any) => {
          const isFree = p.id === 0;
          const isComingSoon = p.comingSoon;
          const bigTxt = isFree ? (isAr ? "مجاناً" : "Free") : "$" + (yearly ? p.perMonthBilledYearly.toFixed(2) : p.monthly.toFixed(2));
          const per = isFree ? null : <div className="price-per">{t("perMonth")}{yearly ? t("billedYearly") : ""}</div>;

          return (
            <div
              key={p.id}
              className={`price-card ${isFree ? "hot" : ""}`}
              style={{
                position: "relative",
                opacity: isComingSoon ? 0.88 : 1,
                border: isFree ? "2px solid var(--alpha)" : "1.5px solid var(--line)",
              }}
            >
              {isComingSoon && (
                <div
                  style={{
                    position: "absolute",
                    top: 14,
                    right: isAr ? undefined : 14,
                    left: isAr ? 14 : undefined,
                    background: "#fef3c7",
                    color: "#92400e",
                    padding: "4px 10px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  {isAr ? "قريباً" : "Coming Soon"}
                </div>
              )}

              <h2>{p.name}</h2>
              <small style={{ color: isFree ? "rgba(255,255,255,.9)" : "var(--muted)", fontWeight: 600 }}>{p.tag}</small>
              <div className="price-big">{bigTxt}</div>
              {per}
              <ul className="feat-list">
                {p.features.map((f: string, i: number) => (
                  <li key={i}>
                    <span className="tick">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {isFree ? (
                <button
                  className="btn btn-white"
                  style={{ fontWeight: 800 }}
                  onClick={() => navigate("#/create-course")}
                >
                  {isAr ? "✦ ابدأ التعلم والإنشاء مجاناً" : "✦ Start Learning Free"}
                </button>
              ) : (
                <button
                  className="btn btn-ghost"
                  disabled
                  style={{ opacity: 0.65, cursor: "not-allowed", fontSize: 13, padding: "10px 14px" }}
                >
                  {isAr ? "قريباً (غير متوفر الشراء حالياً)" : "Coming Soon (Unavailable)"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 28, textAlign: "center" }}>
        <p className="hint" style={{ fontSize: 14, color: "var(--muted)" }}>
          {isAr
            ? "لا توجد أي رسوم أو بطاقة ائتمانية مطلوبة. المنصة مجانية ومتاحة للجميع بالكامل."
            : "No payment or credit card is required. The platform is completely open and free."}
        </p>
      </div>
    </div>
  );
};
