import React, { useState, useEffect } from "react";
import { Store } from "../store";
import { STR, OPTS } from "../i18n";
import { PersonalizationData } from "../types";

interface SurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang: string;
  topic: string;
  settings: any;
  onComplete: (slug: string) => void;
}

export const SurveyModal: React.FC<SurveyModalProps> = ({ isOpen, onClose, currentLang, topic, settings, onComplete }) => {
  const [step, setStep] = useState(0);
  const [personalized, setPersonalized] = useState("No");
  const [data, setData] = useState<PersonalizationData>({
    educationLevel: "",
    educationLevelOther: "",
    age: "",
    proficientSubjects: "",
    learningGoals: [],
    learningGoalsOther: "",
    learningPreferences: [],
    learningPreferencesOther: "",
    contentDepth: "",
    contentDepthOther: "",
    accessibility: ["None"],
    accessibilityOther: "",
    challenges: [],
    challengesOther: "",
  });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const t = (k: string) => (STR as any)[currentLang][k] || (STR.en as any)[k] || k;
  const isAr = currentLang === "ar";
  const otherStr = isAr ? "أخرى" : "Other";
  const isOther = (v: string) => v === "Other" || v === "أخرى";
  const arrHasOther = (arr: string[]) => arr.some(isOther);

  useEffect(() => {
    if (isOpen) {
      setStep(0);
      setPersonalized(Store.plan() === 0 ? "No" : "No");
      Store.getPersonalization().then((saved) => {
        if (saved) {
          setData((prev) => ({ ...prev, ...saved }));
          if (saved.accessibility && !saved.accessibility.length) {
            setData((prev) => ({ ...prev, accessibility: [OPTS[currentLang as "en" | "ar"].accessibility[0]] }));
          }
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const optRows = (key: keyof PersonalizationData, optsKey: string, multi: boolean) => {
    const list = (OPTS[currentLang as "en" | "ar"] as any)[optsKey] || OPTS.en.accessibility;
    const cur = (data as any)[key];
    return (
      <div className="opt-grid">
        {list.map((o: string) => {
          const sel = multi ? (cur as string[]).some((v) => v === o || (isOther(v) && isOther(o))) : cur === o || (isOther(cur) && isOther(o));
          return (
            <button
              key={o}
              className={`opt ${sel ? "sel" : ""}`}
              onClick={() => {
                if (multi) {
                  const arr = [...(cur as string[])];
                  const i = arr.findIndex((x) => x === o || (isOther(x) && isOther(o)));
                  if (i >= 0) arr.splice(i, 1);
                  else arr.push(o);
                  setData({ ...data, [key]: arr });
                } else {
                  setData({ ...data, [key]: o });
                }
              }}
            >
              {o}
            </button>
          );
        })}
      </div>
    );
  };

  const handleNext = async () => {
    setErr("");
    if (step === 0) {
      if (personalized === "Yes") {
        setStep(1);
      } else {
        await finish(false);
      }
      return;
    }
    if (step === 1) {
      if (!data.educationLevel) { setErr(t("eEdu")); return; }
      if (isOther(data.educationLevel) && !data.educationLevelOther.trim()) { setErr(t("eEduO")); return; }
      const ageNum = parseInt(data.age, 10);
      if (!String(data.age).trim() || isNaN(ageNum)) { setErr(t("eAge")); return; }
      if (ageNum < 12 || ageNum > 100) { setErr(t("eAgeRange")); return; }
      if (!data.proficientSubjects.trim()) { setErr(t("eProf")); return; }
      if (!data.learningGoals.length) { setErr(t("eGoals")); return; }
      if (arrHasOther(data.learningGoals) && !data.learningGoalsOther.trim()) { setErr(t("eGoalsO")); return; }
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!data.learningPreferences.length) { setErr(t("ePrefs")); return; }
      if (arrHasOther(data.learningPreferences) && !data.learningPreferencesOther.trim()) { setErr(t("ePrefsO")); return; }
      if (!data.contentDepth) { setErr(t("eDepth")); return; }
      if (isOther(data.contentDepth) && !data.contentDepthOther.trim()) { setErr(t("eDepthO")); return; }
      setStep(3);
      return;
    }
    if (!data.accessibility.length) { setErr(t("eAcc")); return; }
    if (arrHasOther(data.accessibility) && !data.accessibilityOther.trim()) { setErr(t("eAccO")); return; }
    if (!data.challenges.length) { setErr(t("eChal")); return; }
    if (arrHasOther(data.challenges) && !data.challengesOther.trim()) { setErr(t("eChalO")); return; }
    await finish(true);
  };

  const finish = async (personalizedFlag: boolean) => {
    setBusy(true);
    try {
      const persData = personalizedFlag ? data : null;
      if (personalizedFlag) await Store.savePersonalization(data);
      const baseSlug = topic.toLowerCase().trim().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "course";
      let slug = baseSlug;
      while (await Store.getCourse(slug)) {
        slug = baseSlug + "-" + Math.floor(Math.random() * 9000 + 1000);
      }
      const course = {
        slug,
        topic,
        title: topic,
        createdAt: Date.now(),
        owner: Store.user ? Store.user.email : "guest",
        personal: personalizedFlag,
        settings,
        outline: null,
        lessons: {},
        lang: currentLang,
      };
      await Store.saveCourse(course);
      await Store.addToLibrary(slug);
      onComplete(slug);
    } catch (e) {
      setErr(t("wentWrong"));
      setBusy(false);
    }
  };

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal wide" role="dialog" aria-modal="true">
        {step === 0 && (
          <div>
            <h2>{t("s0t")}</h2>
            <p className="sub">{t("s0s")}</p>
            <div className="opt-grid">
              <button className={`opt ${personalized === "Yes" ? "sel" : ""}`} onClick={() => setPersonalized("Yes")}>
                {isAr ? "نعم، أريد تخصيص الدورة لي" : "Yes, personalize for me"}
              </button>
              <button className={`opt ${personalized === "No" ? "sel" : ""}`} onClick={() => setPersonalized("No")}>
                {isAr ? "لا، مسار عام قياسي" : "No, standard curriculum"}
              </button>
            </div>
            <p className="hint" style={{ marginTop: 12, color: "var(--alpha-dark)" }}>
              {isAr ? "✨ التخصيص متاح مجاناً للجميع حالياً!" : "✨ Course personalization is currently 100% free for everyone!"}
            </p>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2>{t("s1t")}</h2>
            <p className="sub">{t("s1s")}</p>
            <label><b>{t("eduL")}</b></label>
            {optRows("educationLevel", "educationLevel", false)}
            {isOther(data.educationLevel) && (
              <input className="field" placeholder={t("specifyPh")} value={data.educationLevelOther} onChange={(e) => setData({ ...data, educationLevelOther: e.target.value })} style={{ margin: "6px 0 12px" }} />
            )}
            <label><b>{t("ageL")}</b></label>
            <input className="field" type="number" min="12" max="100" value={data.age} onChange={(e) => setData({ ...data, age: e.target.value })} style={{ margin: "6px 0 12px" }} />
            <label><b>{t("profL")}</b></label>
            <input className="field" placeholder={t("profPh")} value={data.proficientSubjects} onChange={(e) => setData({ ...data, proficientSubjects: e.target.value })} style={{ margin: "6px 0 12px" }} />
            <label><b>{t("goalsL")}</b></label>
            {optRows("learningGoals", "learningGoals", true)}
            {arrHasOther(data.learningGoals) && (
              <input className="field" placeholder={t("specifyPh")} value={data.learningGoalsOther} onChange={(e) => setData({ ...data, learningGoalsOther: e.target.value })} style={{ margin: "6px 0 12px" }} />
            )}
          </div>
        )}

        {step === 2 && (
          <div>
            <h2>{t("s2t")}</h2>
            <p className="sub">{t("s2s")}</p>
            <label><b>{t("prefL")}</b></label>
            {optRows("learningPreferences", "learningPreferences", true)}
            {arrHasOther(data.learningPreferences) && (
              <input className="field" placeholder={t("specifyPh")} value={data.learningPreferencesOther} onChange={(e) => setData({ ...data, learningPreferencesOther: e.target.value })} style={{ margin: "6px 0 12px" }} />
            )}
            <label><b>{t("depthL")}</b></label>
            {optRows("contentDepth", "contentDepth", false)}
            {isOther(data.contentDepth) && (
              <input className="field" placeholder={t("specifyPh")} value={data.contentDepthOther} onChange={(e) => setData({ ...data, contentDepthOther: e.target.value })} style={{ margin: "6px 0 12px" }} />
            )}
          </div>
        )}

        {step === 3 && (
          <div>
            <h2>{t("s3t")}</h2>
            <p className="sub">{t("s3s")}</p>
            <label><b>{t("accL")}</b></label>
            {optRows("accessibility", "accessibility", true)}
            {arrHasOther(data.accessibility) && (
              <input className="field" placeholder={t("specifyPh")} value={data.accessibilityOther} onChange={(e) => setData({ ...data, accessibilityOther: e.target.value })} style={{ margin: "6px 0 12px" }} />
            )}
            <label><b>{t("chalL")}</b></label>
            {optRows("challenges", "challenges", true)}
            {arrHasOther(data.challenges) && (
              <input className="field" placeholder={t("specifyPh")} value={data.challengesOther} onChange={(e) => setData({ ...data, challengesOther: e.target.value })} style={{ margin: "6px 0 12px" }} />
            )}
          </div>
        )}

        {err && <div className="err" style={{ marginTop: 10 }}>{err}</div>}
        {busy && (
          <div className="loading-line" style={{ marginTop: 10 }}>
            <span className="spinner" style={{ margin: 0 }}></span>
            <span>{t("generating")}</span>
          </div>
        )}

        <div className="modal-nav">
          {step > 0 && <button className="btn btn-ghost" onClick={() => setStep(step - 1)}>{t("back")}</button>}
          <button className="btn btn-primary" disabled={busy} onClick={handleNext}>
            {step === 3 || (step === 0 && personalized === "No") ? t("createNow") : t("next")}
          </button>
        </div>
      </div>
    </div>
  );
};
