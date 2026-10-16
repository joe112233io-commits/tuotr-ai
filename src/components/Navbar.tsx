import React, { useState } from "react";
import { Store } from "../store";
import { STR } from "../i18n";

interface NavbarProps {
  currentLang: string;
  setLang: (l: string) => void;
  onOpenSignIn: (cb?: () => void) => void;
  activeRoute: string;
  navigate: (route: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentLang, setLang, onOpenSignIn, activeRoute, navigate }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const t = (k: string) => (STR as any)[currentLang][k] || (STR.en as any)[k] || k;

  const handleNav = (r: string) => {
    setMenuOpen(false);
    navigate(r);
  };

  return (
    <nav className="nav">
      <div className="nav-inner">
        <div className="brand" onClick={() => handleNav("#/")}>
          <span className="brand-mark" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10 12 5 2 10l10 5 10-5z" />
              <path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" />
              <path d="M22 10v6" />
            </svg>
          </span>
          <span>Tutor AI</span>
        </div>
        <div className={`nav-links ${menuOpen ? "open" : ""}`}>
          <a href="#/create-course" onClick={(e) => { e.preventDefault(); handleNav("#/create-course"); }}>{t("navCreate")}</a>
          <a href="#/pricing" onClick={(e) => { e.preventDefault(); handleNav("#/pricing"); }}>{t("navPricing")}</a>
          <a href="#/library" onClick={(e) => { e.preventDefault(); handleNav("#/library"); }}>{t("navLibrary")}</a>
          <a href="#/settings" onClick={(e) => { e.preventDefault(); handleNav("#/settings"); }}>{t("navSettings")}</a>
          <a href="#/contact-us" onClick={(e) => { e.preventDefault(); handleNav("#/contact-us"); }}>{t("navContact")}</a>
        </div>
        <button className="btn btn-ghost menu-btn" onClick={() => setMenuOpen(!menuOpen)} aria-label={t("menu")} style={{ padding: "9px 14px" }}>
          ☰
        </button>
        <div className="nav-right">
          <button className="btn btn-ghost" style={{ padding: "10px 16px" }} onClick={() => setLang(currentLang === "ar" ? "en" : "ar")}>
            🌐 {t("otherLang")}
          </button>
          {Store.isLoggedIn() && Store.user ? (
            <>
              <button className="btn btn-primary" style={{ padding: "10px 20px" }} onClick={() => handleNav("#/create-course")}>
                {t("newCourse")}
              </button>
              <div className="avatar" title={Store.user.email} onClick={() => handleNav("#/profile")}>
                {(Store.user.name || Store.user.email || "L").trim()[0].toUpperCase()}
              </div>
            </>
          ) : (
            <button className="btn btn-primary" style={{ padding: "10px 22px" }} onClick={() => onOpenSignIn()}>
              {t("signIn")}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};
