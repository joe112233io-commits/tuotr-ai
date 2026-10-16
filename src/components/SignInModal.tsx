import React, { useState } from "react";
import { Store } from "../store";
import { STR } from "../i18n";

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang: string;
  onSuccess: () => void;
  postAction?: () => void;
}

export const SignInModal: React.FC<SignInModalProps> = ({ isOpen, onClose, currentLang, onSuccess, postAction }) => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const t = (k: string) => (STR as any)[currentLang][k] || (STR.en as any)[k] || k;

  if (!isOpen) return null;

  const handleEmailSignIn = async () => {
    const cleanEmail = email.trim();
    const cleanName = name.trim();
    if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(cleanEmail)) {
      setErr(t("validEmail"));
      return;
    }
    setErr("");
    setLoading(true);
    try {
      const { isNewUser } = await Store.signIn({ email: cleanEmail, name: cleanName });
      if (isNewUser && Store.user) {
        try { await Store.saveProfile({ lang: currentLang }); } catch (e) {}
      }
      onSuccess();
      onClose();
      if (postAction) postAction();
    } catch (e) {
      setErr(t("wentWrong"));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    const fakeEmail = email.trim().toLowerCase() || "learner" + Math.floor(Math.random() * 10000) + "@gmail.com";
    const fakeName = name.trim() || fakeEmail.split("@")[0];
    setLoading(true);
    try {
      await Store.signIn({ email: fakeEmail, name: fakeName });
      onSuccess();
      onClose();
      if (postAction) postAction();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true">
        <h2>{t("siTitle")}</h2>
        <p className="sub">{t("siSub")}</p>
        <label style={{ fontWeight: 600, fontSize: 14 }}>{t("siName")}</label>
        <input className="field" placeholder={t("siNamePh")} value={name} onChange={(e) => setName(e.target.value)} style={{ margin: "6px 0 12px" }} />
        <label style={{ fontWeight: 600, fontSize: 14 }}>Email</label>
        <input className="field" dir="ltr" placeholder={t("siEmailPh")} value={email} onChange={(e) => setEmail(e.target.value)} style={{ margin: "6px 0" }} />
        {err && <div className="err">{err}</div>}
        <button className="btn btn-primary" disabled={loading} style={{ width: "100%", marginTop: 12 }} onClick={handleEmailSignIn}>
          {loading ? t("siSending") : t("siContinue")}
        </button>
        <button className="btn btn-ghost" disabled={loading} style={{ width: "100%", marginTop: 10 }} onClick={handleGoogleSignIn}>
          {t("siGoogle")}
        </button>
        <p className="hint">{t("siNote")}</p>
        <div className="modal-nav">
          <button className="btn btn-ghost" onClick={onClose}>{t("close")}</button>
        </div>
      </div>
    </div>
  );
};
