import React from "react";
import { STR } from "../i18n";

interface FooterProps {
  currentLang: string;
  navigate: (route: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ currentLang, navigate }) => {
  const t = (k: string) => (STR as any)[currentLang][k] || (STR.en as any)[k] || k;

  return (
    <footer>
      <div className="fl">
        <a href="#/create-course" onClick={(e) => { e.preventDefault(); navigate("#/create-course"); }}>{t("navCreate")}</a>
        <a href="#/pricing" onClick={(e) => { e.preventDefault(); navigate("#/pricing"); }}>{t("navPricing")}</a>
        <a href="#/library" onClick={(e) => { e.preventDefault(); navigate("#/library"); }}>{t("navLibrary")}</a>
        <a href="#/contact-us" onClick={(e) => { e.preventDefault(); navigate("#/contact-us"); }}>{t("navContact")}</a>
      </div>
      <div>{t("footerTag")}</div>
    </footer>
  );
};
