import React, { useState, useEffect, useCallback } from "react";
import { Store } from "./store";
import { STR, getPricingData } from "./i18n";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { SignInModal } from "./components/SignInModal";
import { SurveyModal } from "./components/SurveyModal";
import { CheckoutModal } from "./components/CheckoutModal";

import { Home } from "./pages/Home";
import { CreateCourse } from "./pages/CreateCourse";
import { CourseDetail } from "./pages/CourseDetail";
import { Library } from "./pages/Library";
import { Pricing } from "./pages/Pricing";
import { Contact } from "./pages/Contact";
import { Profile } from "./pages/Profile";
import { Settings } from "./pages/Settings";

interface ToastItem {
  id: number;
  msg: string;
  kind?: string;
}

export function App() {
  const [currentLang, setCurrentLangState] = useState<string>("en");
  const [routeHash, setRouteHash] = useState<string>(window.location.hash || "#/");
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [signInOpen, setSignInOpen] = useState(false);
  const [postSignInAction, setPostSignInAction] = useState<(() => void) | null>(null);
  const [surveyOpen, setSurveyOpen] = useState(false);
  const [surveyTopic, setSurveyTopic] = useState("");
  const [surveySettings, setSurveySettings] = useState<any>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<any>(null);
  const [checkoutYearly, setCheckoutYearly] = useState(true);

  const addToast = useCallback((msg: string, kind?: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, msg, kind }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 8000);
  }, []);

  const handleSetLang = useCallback(async (l: string) => {
    const lang = l === "ar" ? "ar" : "en";
    setCurrentLangState(lang);
    try { localStorage.setItem("taiv1.lang", lang); } catch (e) {}
    try {
      if (Store.isLoggedIn()) await Store.saveProfile({ lang });
    } catch (e) {}
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, []);

  useEffect(() => {
    async function init() {
      await Store.boot();
      let l = null;
      try { l = localStorage.getItem("taiv1.lang"); } catch (e) {}
      if (!l && Store.user && Store.user.lang) l = Store.user.lang;
      if (!l) {
        const nav = (navigator.language || "en").toLowerCase();
        l = nav.startsWith("ar") ? "ar" : "en";
      }
      await handleSetLang(l);
    }
    init();

    const handleHash = () => {
      setRouteHash(window.location.hash || "#/");
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, [handleSetLang]);

  const navigate = (r: string) => {
    window.location.hash = r;
  };

  const openSignInModal = (cb?: () => void) => {
    setPostSignInAction(() => cb || null);
    setSignInOpen(true);
  };

  const openSurveyModal = (topic: string, settings: any) => {
    setSurveyTopic(topic);
    setSurveySettings(settings);
    setSurveyOpen(true);
  };

  const handleStartCheckout = (planId: number, yearly: boolean) => {
    const pData = getPricingData(currentLang);
    const p = pData.find((x) => x.id === planId);
    if (!p) return;
    setCheckoutPlan(p);
    setCheckoutYearly(yearly);
    setCheckoutOpen(true);
  };

  // Parse route
  const hash = routeHash.replace(/^#\/?/, "");
  const parts = hash.split("/");
  const page = parts[0] || "";

  let pageContent = <Home currentLang={currentLang} navigate={navigate} onToast={addToast} />;
  if (page === "create-course") {
    pageContent = (
      <CreateCourse
        currentLang={currentLang}
        navigate={navigate}
        onOpenSignIn={openSignInModal}
        onOpenSurvey={openSurveyModal}
        onToast={addToast}
      />
    );
  } else if (page === "pricing") {
    pageContent = (
      <Pricing
        currentLang={currentLang}
        navigate={navigate}
        onOpenSignIn={openSignInModal}
        onStartCheckout={handleStartCheckout}
      />
    );
  } else if (page === "library") {
    pageContent = <Library currentLang={currentLang} navigate={navigate} onOpenSignIn={() => openSignInModal()} />;
  } else if (page === "contact-us") {
    pageContent = <Contact currentLang={currentLang} onToast={addToast} />;
  } else if (page === "profile") {
    pageContent = <Profile currentLang={currentLang} navigate={navigate} onOpenSignIn={() => openSignInModal()} />;
  } else if (page === "settings") {
    pageContent = <Settings currentLang={currentLang} onToast={addToast} />;
  } else if (page === "course" && parts[1]) {
    pageContent = (
      <CourseDetail
        slug={decodeURIComponent(parts.slice(1).join("/"))}
        currentLang={currentLang}
        navigate={navigate}
        setLang={handleSetLang}
        onToast={addToast}
      />
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar
        currentLang={currentLang}
        setLang={handleSetLang}
        onOpenSignIn={openSignInModal}
        activeRoute={routeHash}
        navigate={navigate}
      />

      <div style={{ flex: 1 }}>{pageContent}</div>

      <Footer currentLang={currentLang} navigate={navigate} />

      <div id="toastCtn">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind || ""}`}>
            <div style={{ flex: 1 }}>{t.msg}</div>
            <button
              style={{ background: "none", border: 0, color: "#fff", fontSize: 18, cursor: "pointer" }}
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <SignInModal
        isOpen={signInOpen}
        onClose={() => setSignInOpen(false)}
        currentLang={currentLang}
        onSuccess={() => {
          addToast(STR[currentLang as "en" | "ar"].welcomeBack, "ok");
          if (postSignInAction) {
            const cb = postSignInAction;
            setPostSignInAction(null);
            cb();
          }
        }}
        postAction={postSignInAction || undefined}
      />

      <SurveyModal
        isOpen={surveyOpen}
        onClose={() => setSurveyOpen(false)}
        currentLang={currentLang}
        topic={surveyTopic}
        settings={surveySettings}
        onComplete={(slug) => {
          setSurveyOpen(false);
          navigate("#/course/" + encodeURIComponent(slug));
        }}
      />

      <CheckoutModal
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        currentLang={currentLang}
        plan={checkoutPlan}
        yearly={checkoutYearly}
        onConfirm={async () => {
          if (checkoutPlan) {
            await Store.setPlan(checkoutPlan.id);
            setCheckoutOpen(false);
            addToast(`${STR[currentLang as "en" | "ar"].nowOn} ${checkoutPlan.name} ${STR[currentLang as "en" | "ar"].planDemo}`, "ok");
            // Force re-render of pricing
            setRouteHash("#/pricing");
          }
        }}
      />
    </div>
  );
}

export default App;
