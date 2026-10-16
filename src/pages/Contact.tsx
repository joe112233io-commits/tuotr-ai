import React, { useState } from "react";
import { Store } from "../store";
import { STR } from "../i18n";

interface ContactProps {
  currentLang: string;
  onToast: (msg: string, kind?: string) => void;
}

export const Contact: React.FC<ContactProps> = ({ currentLang, onToast }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [emailErr, setEmailErr] = useState("");
  const [sending, setSending] = useState(false);

  const t = (k: string) => (STR as any)[currentLang][k] || (STR.en as any)[k] || k;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(cleanEmail)) {
      setEmailErr(t("validEmail"));
      return;
    }
    setEmailErr("");
    setSending(true);
    try {
      await Store.saveContact({ name, email: cleanEmail, message: msg, at: Date.now() });
      onToast(t("msgOk"), "ok");
      setName("");
      setEmail("");
      setMsg("");
    } catch (err) {
      onToast(t("msgErr"), "err");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="main-container" style={{ paddingBottom: 50 }}>
      <div className="page-head">
        <h1>{t("contactTitle")}</h1>
        <p>{t("contactSub")}</p>
      </div>
      <form className="contact-form" onSubmit={handleSubmit}>
        <label>{t("nameL")}</label>
        <input className="field" maxLength={64} placeholder={t("namePh")} value={name} onChange={(e) => setName(e.target.value)} required />
        <label>{t("emailL")}</label>
        <input className="field" dir="ltr" maxLength={64} placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        {emailErr && <div className="err">{emailErr}</div>}
        <label>{t("msgL")}</label>
        <textarea className="field" rows={5} maxLength={1500} placeholder={t("msgPh")} value={msg} onChange={(e) => setMsg(e.target.value)} required />
        <button className="btn btn-primary" style={{ width: "100%", marginTop: 18 }} disabled={sending}>
          {sending ? t("sending") : t("submit")}
        </button>
      </form>
    </div>
  );
};
