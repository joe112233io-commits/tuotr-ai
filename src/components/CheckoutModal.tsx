import React from "react";
import { STR } from "../i18n";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang: string;
  plan: any;
  yearly: boolean;
  onConfirm: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, currentLang, plan, yearly, onConfirm }) => {
  const t = (k: string) => (STR as any)[currentLang][k] || (STR.en as any)[k] || k;
  if (!isOpen || !plan) return null;

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true">
        <h2>{t("coTitle")}</h2>
        <p className="sub">
          {t("coSub1")} <b>{plan.name}</b> — ${yearly ? plan.yearly + "/year" : plan.monthly + "/month"}. {t("coSub2")}
        </p>
        <div className="modal-nav">
          <button className="btn btn-ghost" onClick={onClose}>{t("cancel")}</button>
          <button className="btn btn-primary" onClick={onConfirm}>{t("confirmUpgrade")}</button>
        </div>
      </div>
    </div>
  );
};
