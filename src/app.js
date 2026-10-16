/* TutorAI clone — App: bilingual (EN/AR, full RTL) hash router + all pages. Depends on I18N, Store, AIProvider, CourseAI. */
(function () {
  "use strict";

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const L = () => I18N.lang;

  function toast(msg, kind) {
    const ctn = $("#toastCtn");
    const el = document.createElement("div");
    el.className = "toast " + (kind || "");
    el.innerHTML = "<div style='flex:1'>" + esc(msg) + "</div><button style='background:none;border:0;color:#fff;font-size:18px;cursor:pointer'>×</button>";
    el.querySelector("button").onclick = () => el.remove();
    ctn.appendChild(el);
    setTimeout(() => el.remove(), 8000);
  }
  window.toast = toast;
  function ga(event, params) { try { console.log("[ga]", event, params || {}); } catch (e) {} }

  // ---------- pjs list helpers (AR mirrors when lang=ar) ----------
  function plist(base) {
    const name = L() === "ar" ? base + "Ar" : base;
    try {
      const l = root[name] || root[base];
      if (!l || !l.selectAll) return [];
      return l.selectAll.map((it) => it.evaluateItem);
    } catch (e) { return []; }
  }
  function pjsItems(listName) {
    try {
      const l = root[listName];
      if (!l || !l.selectAll) return [];
      return l.selectAll.map((it) => it.evaluateItem);
    } catch (e) { return []; }
  }
  function pricing() { try { return root.getPricingData(L()); } catch (e) { return []; } }
  function planName(p) { try { return root.planName(p, L()); } catch (e) { return String(p); } }
  function planMax(plan) { const p = pricing().find((x) => x.id === plan); return p || { maxCourses: 6, maxLessons: 3 }; }
  const OTHER = () => (L() === "ar" ? "أخرى" : "Other");
  const isOther = (v) => v === "Other" || v === "أخرى";
  const arrHasOther = (arr) => arr.some(isOther);

  // ---------- auth modal ----------
  let postLoginAction = null;
  function openSignIn(next) { postLoginAction = next || null; I18N.applyStatic(); $("#signinOverlay").hidden = false; }
  function closeMenus() { const nl = document.querySelector(".nav-links"); if (nl) nl.classList.remove("open"); }
  function closeSignIn() { $("#signinOverlay").hidden = true; }
  window.openSignIn = openSignIn;
  window.closeSignIn = closeSignIn;
  // Modal UX: ESC closes any open modal, clicking the backdrop closes it.
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    ["signinOverlay", "surveyOverlay", "checkoutOverlay"].forEach((id) => { const o = document.getElementById(id); if (o && !o.hidden) o.hidden = true; });
    closeMenus();
  });
  ["signinOverlay", "surveyOverlay", "checkoutOverlay"].forEach((id) => {
    document.getElementById(id).addEventListener("click", (e) => { if (e.target.id === id) document.getElementById(id).hidden = true; });
  });

  async function doEmailSignIn() {
    const email = $("#siEmailInput").value.trim();
    const name = $("#siNameInput").value.trim();
    if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) { $("#siErr").textContent = t("validEmail"); return; }
    $("#siErr").textContent = "";
    $("#siBtn").disabled = true;
    $("#siBtn").textContent = t("siSending");
    try {
      const { isNewUser } = await Store.signIn({ email, name });
      if (isNewUser && Store.user) { try { await Store.saveProfile({ lang: L() }); } catch (e) {} }
      else if (Store.user && Store.user.lang && Store.user.lang !== L()) { await I18N.setLang(Store.user.lang); }
      ga(isNewUser ? "sign_up" : "login", { method: "email", email_id: email, user_tier: "free", ab_group: Store.identity.ab });
      toast(isNewUser ? t("welcomeNew") : t("welcomeBack"), "ok");
      closeSignIn();
      renderNav();
      if (postLoginAction) { const f = postLoginAction; postLoginAction = null; f(); }
      else route();
    } catch (e) { $("#siErr").textContent = t("wentWrong"); }
    finally { $("#siBtn").disabled = false; $("#siBtn").textContent = t("siContinue"); }
  }
  async function doGoogleSignIn() {
    const email = $("#siEmailInput").value.trim().toLowerCase();
    const name = $("#siNameInput").value.trim() || (email ? email.split("@")[0] : "Learner");
    const fake = email || "learner" + Math.floor(Math.random() * 10000) + "@gmail.com";
    $("#siGoogleBtn").disabled = true;
    try {
      const { isNewUser } = await Store.signIn({ email: fake, name });
      ga(isNewUser ? "sign_up" : "login", { method: "google.com", email_id: fake, user_tier: "free", ab_group: Store.identity.ab });
      toast(isNewUser ? t("googleNew") : t("welcomeBack"), "ok");
      closeSignIn();
      renderNav();
      if (postLoginAction) { const f = postLoginAction; postLoginAction = null; f(); }
      else route();
    } finally { $("#siGoogleBtn").disabled = false; }
  }
  window.doEmailSignIn = doEmailSignIn;
  window.doGoogleSignIn = doGoogleSignIn;

  // ---------- nav ----------
  function renderNav() {
    I18N.applyStatic();
    const menuBtn = $("#menuBtn");
    if (menuBtn && !menuBtn.dataset.bound) {
      menuBtn.dataset.bound = "1";
      menuBtn.addEventListener("click", () => document.querySelector(".nav-links").classList.toggle("open"));
    }
    if (menuBtn) menuBtn.setAttribute("aria-label", t("menu"));
    const area = $("#navAuth");
    if (Store.isLoggedIn()) {
      const initial = (Store.user.name || Store.user.email || "L").trim()[0].toUpperCase();
      area.innerHTML =
        "<button class='btn btn-primary' style='padding:10px 20px' data-nav='#/create-course'>" + esc(t("newCourse")) + "</button>" +
        "<button class='btn btn-ghost' style='padding:10px 16px' id='langBtn'>🌐 " + esc(t("otherLang")) + "</button>" +
        "<div class='avatar' id='avatarEl' title='" + esc(Store.user.email) + "'>" + esc(initial) + "</div>";
      $("#avatarEl").onclick = () => { location.hash = "#/profile"; };
    } else {
      area.innerHTML =
        "<button class='btn btn-ghost' style='padding:10px 16px' id='langBtn'>🌐 " + esc(t("otherLang")) + "</button>" +
        "<button class='btn btn-primary' style='padding:10px 22px' id='signinBtn'>" + esc(t("signIn")) + "</button>";
      $("#signinBtn").onclick = () => openSignIn();
    }
    $("#langBtn").onclick = async () => { await I18N.setLang(L() === "ar" ? "en" : "ar"); renderNav(); route(); };
    $$("[data-nav]").forEach((el) => {
      if (!el.dataset.bound) { el.dataset.bound = "1"; el.addEventListener("click", () => { location.hash = el.dataset.nav; }); }
    });
  }
  window.renderNav = renderNav;

  // ---------- router ----------
  const view = () => $("#view");
  function route() {
    renderNav();
    closeMenus();
    const h = location.hash || "#/";
    const parts = h.replace(/^#\/?/, "").split("/");
    const page = parts[0] || "";
    closeSignIn();
    if (page === "create-course") return renderCreate();
    if (page === "pricing") return renderPricing();
    if (page === "library") return renderLibrary();
    if (page === "contact-us") return renderContact();
    if (page === "profile") return renderProfile();
    if (page === "settings") return renderSettings();
    if (page === "course" && parts[1]) return renderCourse(decodeURIComponent(parts.slice(1).join("/")));
    return renderHome();
  }
  window.addEventListener("hashchange", route);

  // ================= HOME =================
  function renderHome() {
    const feats = plist("homeFeatures"), steps = plist("howItWorks"), auds = plist("audiences"), faqs = plist("faq"), popular = plist("popularCourses");
    const stats = [["800K+", t("stat1")], ["10M+", t("stat2")], ["14+", t("stat3")], ["23+", t("stat4")]];
    view().innerHTML =
      "<section class='hero'><div class='main-container'>" +
      "<h1>" + esc(t("heroA")) + "<span style='display:block'>" + esc(t("heroB")) + "</span></h1>" +
      "<p class='sub'>" + esc(t("heroSub")) + "</p>" +
      "<div class='search-wrap'><input id='homeSearch' class='search-input' aria-label='" + esc(t("searchPh")) + "' placeholder='" + esc(t("searchPh")) + "' />" +
      "<button class='btn btn-primary search-btn' id='homeGo'>" + esc(t("createCourseBtn")) + "</button></div>" +
      "<div class='popular'><span>" + esc(t("popular")) + "</span>" +
      popular.map((p) => { const s = p.split("|"); return "<button class='chip' data-topic='" + esc(s[0]) + "'>" + esc(s[0]) + "</button>"; }).join("") + "</div>" +
      "<div class='demo-link' id='demoLink'><span class='play'>▶</span><span style='text-decoration:underline'>" + esc(t("demoLink")) + "</span></div>" +
      "<div class='hero-shot'><div class='hero-shot-fallback'><h3>" + esc(t("shotTitle")) + "</h3>" +
      "<p>" + esc(t("shotSub")) + "</p>" +
      "<p style='margin-top:14px'><span class='badge' style='background:#fff;color:#6d28d9'>800K+ " + esc(t("stat1")) + "</span> &nbsp; <span class='badge' style='background:#fff;color:#6d28d9'>10M+ " + esc(t("stat2")) + "</span></p></div></div>" +
      "</div></section>" +
      "<section class='stats'><div class='main-container stats-grid'>" +
      stats.map((s) => "<div><div class='stat-n'>" + s[0] + "</div><div class='stat-l'>" + esc(s[1]) + "</div></div>").join("") + "</div></section>" +
      "<section class='section'><div class='main-container'>" +
      "<h2>" + esc(t("featTitle")) + "</h2><p class='lead'>" + esc(t("featSub")) + "</p>" +
      "<div class='cards3'>" + feats.map((f) => { const p = f.split("|"); return "<div class='card'><div class='ic emoji-ic' aria-hidden='true'>" + esc(p[0]) + "</div><h3>" + esc(p[1]) + "</h3><p>" + esc(p[2]) + "</p></div>"; }).join("") + "</div>" +
      "</div></section>" +
      "<section class='section'><div class='main-container'>" +
      "<h2>" + esc(t("stepsTitle")) + "</h2><p class='lead'>" + esc(t("stepsSub")) + "</p>" +
      "<div class='cards4'>" + steps.map((s) => { const p = s.split("|"); return "<div class='step'><div class='step-n'>" + esc(p[0]) + "</div><div class='step-ic emoji-ic' aria-hidden='true'>" + esc(p[1]) + "</div><h3>" + esc(p[2]) + "</h3><p style='color:var(--muted);font-size:14px'>" + esc(p[3]) + "</p></div>"; }).join("") + "</div>" +
      "</div></section>" +
      "<section class='section'><div class='main-container'><h2>" + esc(t("audTitle")) + "</h2>" +
      "<div class='cards2' style='margin-top:26px'>" + auds.map((a) => { const p = a.split("|"); return "<div class='card'><div style='display:flex;gap:14px'><div class='aud-ic emoji-ic' aria-hidden='true'>" + esc(p[0]) + "</div><div><h3>" + esc(p[1]) + "</h3><p>" + esc(p[2]) + "</p></div></div></div>"; }).join("") + "</div>" +
      "</div></section>" +
      "<section class='section'><div class='main-container'><h2>" + esc(t("faqTitle")) + "</h2>" +
      "<div class='faq' style='margin-top:24px'>" + faqs.map((f, i) => {
        const idx = f.indexOf("|");
        return "<div class='faq-item'><button class='faq-q' data-faq='" + i + "'><span>" + esc(f.slice(0, idx)) + "</span><span>+</span></button><div class='faq-a'>" + esc(f.slice(idx + 1)) + "</div></div>";
      }).join("") + "</div></div></section>" +
      "<section class='section'><div class='main-container'><div class='cta'>" +
      "<h2>" + esc(t("ctaTitle")) + "</h2><p>" + esc(t("ctaSub")) + "</p>" +
      "<div class='cta-row'><button class='btn btn-white' data-nav='#/create-course'>" + esc(t("ctaBtn1")) + "</button>" +
      "<button class='btn btn-outline-w' data-nav='#/pricing'>" + esc(t("ctaBtn2")) + "</button></div></div></div></section>";
    renderNav();
    $$("[data-faq]").forEach((b) => (b.onclick = () => b.parentElement.classList.toggle("open")));
    $$("[data-topic]").forEach((b) => (b.onclick = () => startTopic(b.dataset.topic)));
    $("#homeGo").onclick = () => startTopic($("#homeSearch").value);
    $("#homeSearch").addEventListener("keydown", (e) => { if (e.key === "Enter") startTopic(e.target.value); });
    $("#demoLink").onclick = () => toast(t("demoToast"), "ok");
  }

  function startTopic(topic) {
    topic = (topic || "").trim();
    if (topic.length < 2) { toast(t("needTopic"), "err"); return; }
    sessionStorage.setItem("tutorai.pendingTopic", topic);
    location.hash = "#/create-course";
  }

  // ================= CREATE COURSE =================
  const CreateState = { topic: "", useSources: false, useStructure: false, file: null, structure: null };

  function renderCreate() {
    const topics = plist("suggestedTopics");
    const pending = sessionStorage.getItem("tutorai.pendingTopic") || "";
    CreateState.topic = pending;
    view().innerHTML =
      "<div class='main-container' style='padding-bottom:40px'><div class='page-head' style='text-align:start'>" +
      "<h1 style='font-size:28px;margin:0'>" + esc(t("createTitle")) + "</h1></div>" +
      "<div class='create-grid'><div class='panel'>" +
      "<input id='ctTopic' class='field' style='border-radius:999px;padding:16px 22px;font-size:16px' placeholder='" + esc(t("topicPh")) + "' value='" + esc(pending) + "' />" +
      "<div class='toggle-row'><label class='switch'><input type='checkbox' id='ctSources' /><span class='knob'></span></label>" +
      "<div><b>" + esc(t("useSources")) + "</b><br /><small>" + esc(t("useSourcesSub")) + "</small></div></div>" +
      "<div class='toggle-row'><label class='switch'><input type='checkbox' id='ctStruct' /><span class='knob'></span></label>" +
      "<div><b>" + esc(t("useStruct")) + "</b><br /><small>" + esc(t("useStructSub")) + "</small></div></div>" +
      "<div id='ctErr' class='err'></div>" +
      "<div style='margin-top:16px;display:flex;gap:10px;flex-wrap:wrap'><button class='btn btn-primary' id='ctGo'>" + esc(t("createBtn")) + "</button>" +
      "<button class='btn btn-ghost' id='ctHomework'>" + esc(t("hwBtn")) + "</button></div>" +
      "<div id='ctFilePanel' class='hide' style='margin-top:16px;border-top:1px solid var(--line);padding-top:14px'>" +
      "<h3>" + esc(t("srcTitle")) + "</h3><input type='file' id='ctFile' accept='.txt,.md,.pdf' />" +
      "<div class='hint'>" + esc(t("fileHint")) + "</div><div id='ctFileInfo' class='hint'></div></div>" +
      "<div id='ctStructPanel' class='hide' style='margin-top:16px;border-top:1px solid var(--line);padding-top:14px'>" +
      "<h3>" + esc(t("structTitle")) + "</h3><p class='hint'>" + esc(t("structSub")) + "</p><div id='structEditor'></div>" +
      "<div style='display:flex;gap:8px;margin-top:10px;flex-wrap:wrap'><button class='btn btn-ghost' id='addMod' style='padding:8px 18px;font-size:13px'>" + esc(t("addModule")) + "</button>" +
      "<button class='btn btn-ghost' id='aiStruct' style='padding:8px 18px;font-size:13px'>" + esc(t("aiDraft")) + "</button></div></div>" +
      "</div><div class='panel'><h3 style='margin-top:0'>" + esc(t("sugTitle")) + "</h3>" +
      "<div style='display:flex;flex-wrap:wrap;gap:8px'>" + topics.map((x) => "<button class='chip' data-sug='" + esc(x) + "'>" + esc(x) + "</button>").join("") + "</div>" +
      "<div class='kv-note'>" + t("planLine") + ": " + planMax(0).maxCourses + " / " + planMax(1).maxCourses + " / " + planMax(2).maxCourses + ". " + (Store.isLoggedIn() ? esc(Store.user.email) + " (" + esc(planName(Store.plan())) + ")" : esc(t("guestLine"))) + "</div>" +
      "<div id='hwPanel' class='hide' style='margin-top:16px'><h3>" + esc(t("hwTitle")) + "</h3>" +
      "<textarea id='hwQ' class='field' rows='3' placeholder='" + esc(t("hwPh")) + "'></textarea>" +
      "<button class='btn btn-primary' id='hwGo' style='margin-top:10px;padding:10px 22px'>" + esc(t("hwGo")) + "</button>" +
      "<div id='hwOut' style='margin-top:10px;line-height:1.7'></div></div>" +
      "</div></div></div>";
    renderNav();
    $$("[data-sug]").forEach((b) => (b.onclick = () => { $("#ctTopic").value = b.dataset.sug; }));
    $("#ctSources").onchange = (e) => { CreateState.useSources = e.target.checked; $("#ctFilePanel").hidden = !e.target.checked; };
    $("#ctStruct").onchange = (e) => {
      CreateState.useStructure = e.target.checked; $("#ctStructPanel").hidden = !e.target.checked;
      if (e.target.checked && !CreateState.structure) { CreateState.structure = [{ title: "Module 1", lessons: ["Lesson 1"] }]; drawStructEditor(); }
    };
    $("#ctFile").onchange = onFilePicked;
    $("#addMod").onclick = () => { CreateState.structure.push({ title: "Module " + (CreateState.structure.length + 1), lessons: [] }); drawStructEditor(); };
    $("#aiStruct").onclick = draftStructureFromAI;
    $("#ctGo").onclick = onCreateCourse;
    $("#ctTopic").addEventListener("keydown", (e) => { if (e.key === "Enter") onCreateCourse(); });
    $("#ctHomework").onclick = () => { $("#hwPanel").hidden = !$("#hwPanel").hidden; };
    $("#hwGo").onclick = solveHomework;
  }

  function drawStructEditor() {
    const ed = $("#structEditor");
    if (!ed) return;
    ed.innerHTML = CreateState.structure.map((m, i) =>
      "<div style='border:1px solid var(--line);border-radius:10px;padding:10px;margin:8px 0'>" +
      "<div class='struct-row'><input class='field' data-m='" + i + "' value='" + esc(m.title) + "' />" +
      "<button class='btn btn-ghost' data-addles='" + i + "' style='padding:6px 12px;font-size:12px'>+ Lesson</button></div>" +
      m.lessons.map((l, j) => "<div class='struct-row' style='margin-top:6px'><input class='field' data-m='" + i + "' data-l='" + j + "' value='" + esc(l) + "' /></div>").join("") +
      "</div>").join("");
    $$("input[data-m]", ed).forEach((inp) => (inp.onchange = () => {
      const i = +inp.dataset.m;
      if (inp.dataset.l === undefined) CreateState.structure[i].title = inp.value;
      else CreateState.structure[i].lessons[+inp.dataset.l] = inp.value;
    }));
    $$("[data-addles]", ed).forEach((b) => (b.onclick = () => {
      CreateState.structure[+b.dataset.addles].lessons.push("Lesson " + (CreateState.structure[+b.dataset.addles].lessons.length + 1));
      drawStructEditor();
    }));
  }

  async function draftStructureFromAI() {
    const topic = $("#ctTopic").value.trim() || "this topic";
    $("#aiStruct").disabled = true;
    $("#aiStruct").textContent = t("aiDrafting");
    try {
      const o = await CourseAI.generateOutline(topic, null, null);
      CreateState.structure = o.modules.map((m) => ({ title: m.title, lessons: m.lessons.slice() }));
      drawStructEditor();
      toast(t("structToast"), "ok");
    } finally { $("#aiStruct").disabled = false; $("#aiStruct").textContent = t("aiDraft"); }
  }

  function onFilePicked(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const plan = Store.plan();
    const limitMB = plan === 2 ? 20 : plan === 1 ? 10 : 4;
    if (f.size > limitMB * 1048576 && /pdf/i.test(f.type || f.name)) {
      toast("File " + f.name + " exceeds your " + limitMB + "MB upload limit for PDFs.", "err");
      e.target.value = ""; return;
    }
    if (/text|md/.test(f.type) || /\.(txt|md)$/i.test(f.name)) {
      const r = new FileReader();
      r.onload = () => {
        CreateState.file = { name: f.name, size: f.size, content: String(r.result).slice(0, 20000) };
        $("#ctFileInfo").textContent = f.name + " ✓";
      };
      r.readAsText(f);
    } else {
      CreateState.file = { name: f.name, size: f.size, content: "" };
      $("#ctFileInfo").textContent = f.name + " ✓";
    }
  }

  async function solveHomework() {
    const q = $("#hwQ").value.trim();
    if (!q) return;
    if (!Store.isLoggedIn()) { openSignIn(solveHomework); return; }
    $("#hwOut").innerHTML = "<div class='spinner'></div>";
    let html = "";
    try {
      await CourseAI.homework(q, (chunk) => {
        html += esc(chunk);
        $("#hwOut").innerHTML = "<div style='white-space:pre-wrap'>" + html + "</div><span class='pulse'>▍</span>";
      });
    } catch (e) { $("#hwOut").innerHTML = "<p class='err'>" + esc(t("wentWrong")) + "</p>"; }
  }

  function authorize(topic) {
    const tpc = topic.trim();
    const banned = pjsItems("bannedWords");
    const low = tpc.toLowerCase();
    if (banned.some((w) => w && low.includes(String(w).toLowerCase())) || /(bomb|murder|child abuse|hack bank|steal)/i.test(tpc)) {
      return { ok: false, msg: t("banned") };
    }
    if (tpc.length < 2) return { ok: false, msg: t("noInfo") };
    return { ok: true };
  }

  async function onCreateCourse() {
    const topic = $("#ctTopic").value.trim();
    const errBox = $("#ctErr");
    errBox.textContent = "";
    if (!Store.isLoggedIn()) { openSignIn(onCreateCourse); return; }
    if (topic.length < 2) { errBox.textContent = t("needTopic"); return; }
    const lib = await Store.mySlugs();
    const max = planMax(Store.plan()).maxCourses;
    if (lib.length >= max) {
      const p = Store.plan();
      ga("course_search_failed", { search_term: topic, email_id: Store.user.email, user_tier: p });
      errBox.textContent = p === 0 ? t("credit0") : p === 1 ? t("credit1") : t("credit2");
      return;
    }
    const auth = authorize(topic);
    if (!auth.ok) { ga("course_search_failed", { search_term: topic }); errBox.textContent = auth.msg; return; }
    CreateState.topic = topic;
    openSurvey();
  }

  // ================= SURVEY MODAL =================
  const Survey = { step: 0, personalized: "No", data: null };
  const OPTKEYS = { educationLevel: "educationLevel", learningGoals: "learningGoals", learningPreferences: "learningPreferences", contentDepth: "contentDepth", accessibility: "accessibility", challenges: "challenges" };

  async function openSurvey() {
    Survey.step = 0;
    Survey.personalized = Store.plan() === 0 ? "No" : Survey.personalized;
    const saved = await Store.getPersonalization();
    Survey.data = Object.assign(
      { educationLevel: "", educationLevelOther: "", age: "", proficientSubjects: "", learningGoals: [], learningGoalsOther: "", learningPreferences: [], learningPreferencesOther: "", contentDepth: "", contentDepthOther: "", accessibility: [], accessibilityOther: "", challenges: [], challengesOther: "" },
      saved || {}
    );
    // normalize legacy "None" default
    if (!Survey.data.accessibility.length) Survey.data.accessibility = [I18N.opts("accessibility")[0]];
    drawSurvey();
    $("#surveyOverlay").hidden = false;
  }
  window.closeSurvey = () => { $("#surveyOverlay").hidden = true; };

  function optRow(key) {
    const multi = key !== "educationLevel" && key !== "contentDepth";
    const opts = I18N.opts(OPTKEYS[key] || key);
    const cur = Survey.data[key];
    return "<div class='opt-grid'>" + opts.map((o) => {
      const sel = multi ? cur.some((v) => v === o || (isOther(v) && isOther(o))) : (cur === o || (isOther(cur) && isOther(o)));
      return "<button class='opt" + (sel ? " sel" : "") + "' data-k='" + key + "' data-v='" + esc(o) + "' data-m='" + (multi ? 1 : 0) + "'>" + esc(o) + "</button>";
    }).join("") + "</div>";
  }
  function otherInput(id, val, show) {
    return show ? "<input id='" + id + "' class='field' placeholder='" + esc(t("specifyPh")) + "' value='" + esc(val) + "' />" : "";
  }

  function drawSurvey() {
    const box = $("#surveyBody");
    const s = Survey.step;
    let html = "";
    if (s === 0) {
      html = "<h2>" + esc(t("s0t")) + "</h2><p class='sub'>" + esc(t("s0s")) + "</p>" +
        (Store.plan() === 0
          ? "<div class='err'>" + esc(t("freeBlocked")) + "</div><div class='hint'>" + esc(t("explorePlans")) + " <a href='#/pricing'>" + esc(t("here")) + "</a>.</div>"
          : "<div class='opt-grid'><button class='opt" + (Survey.personalized === "Yes" ? " sel" : "") + "' data-p='Yes'>" + (L() === "ar" ? "نعم" : "Yes") + "</button><button class='opt" + (Survey.personalized === "No" ? " sel" : "") + "' data-p='No'>" + (L() === "ar" ? "لا" : "No") + "</button></div>");
    } else if (s === 1) {
      html = "<h2>" + esc(t("s1t")) + "</h2><p class='sub'>" + esc(t("s1s")) + "</p>" +
        "<label><b>" + esc(t("eduL")) + "</b></label>" + optRow("educationLevel") +
        otherInput("svEduO", Survey.data.educationLevelOther, isOther(Survey.data.educationLevel)) +
        "<label><b>" + esc(t("ageL")) + "</b></label><input id='svAge' class='field' type='number' min='12' max='100' value='" + esc(Survey.data.age) + "' />" +
        "<label><b>" + esc(t("profL")) + "</b></label><input id='svProf' class='field' placeholder='" + esc(t("profPh")) + "' value='" + esc(Survey.data.proficientSubjects) + "' />" +
        "<label><b>" + esc(t("goalsL")) + "</b></label>" + optRow("learningGoals") +
        otherInput("svGoalO", Survey.data.learningGoalsOther, arrHasOther(Survey.data.learningGoals)) +
        "<div id='svErr' class='err'></div>";
    } else if (s === 2) {
      html = "<h2>" + esc(t("s2t")) + "</h2><p class='sub'>" + esc(t("s2s")) + "</p>" +
        "<label><b>" + esc(t("prefL")) + "</b></label>" + optRow("learningPreferences") +
        otherInput("svPrefO", Survey.data.learningPreferencesOther, arrHasOther(Survey.data.learningPreferences)) +
        "<label><b>" + esc(t("depthL")) + "</b></label>" + optRow("contentDepth") +
        otherInput("svDepthO", Survey.data.contentDepthOther, isOther(Survey.data.contentDepth)) +
        "<div id='svErr' class='err'></div>";
    } else {
      html = "<h2>" + esc(t("s3t")) + "</h2><p class='sub'>" + esc(t("s3s")) + "</p>" +
        "<label><b>" + esc(t("accL")) + "</b></label>" + optRow("accessibility") +
        otherInput("svAccO", Survey.data.accessibilityOther, arrHasOther(Survey.data.accessibility)) +
        "<label><b>" + esc(t("chalL")) + "</b></label>" + optRow("challenges") +
        otherInput("svChO", Survey.data.challengesOther, arrHasOther(Survey.data.challenges)) +
        "<div id='svErr' class='err'></div>";
    }
    const last = s === 3 || (s === 0 && (Survey.personalized === "No" || Store.plan() === 0));
    html += "<div class='modal-nav'>" +
      (s > 0 ? "<button class='btn btn-ghost' id='svBack'>" + esc(t("back")) + "</button>" : "") +
      "<button class='btn btn-primary' id='svNext'>" + esc(last ? t("createNow") : t("next")) + "</button></div>" +
      "<div id='svBusy' class='loading-line hide'><span class='spinner' style='margin:0'></span><span>" + esc(t("generating")) + "</span></div>";
    box.innerHTML = html;
    $$("[data-p]", box).forEach((b) => (b.onclick = () => { Survey.personalized = b.dataset.p; drawSurvey(); }));
    $$("[data-k]", box).forEach((b) => (b.onclick = () => {
      const k = b.dataset.k, v = b.dataset.v;
      if (b.dataset.m === "1") {
        const arr = Survey.data[k];
        const i = arr.findIndex((x) => x === v || (isOther(x) && isOther(v)));
        if (i >= 0) arr.splice(i, 1); else arr.push(v);
      } else Survey.data[k] = v;
      syncSurveyInputs();
      drawSurvey();
    }));
    ["svEduO", "svAge", "svProf", "svGoalO", "svPrefO", "svDepthO", "svAccO", "svChO"].forEach((id) => {
      const el = $("#" + id);
      if (el) el.oninput = syncSurveyInputs;
    });
    const back = $("#svBack");
    if (back) back.onclick = () => { syncSurveyInputs(); Survey.step--; drawSurvey(); };
    $("#svNext").onclick = surveyNext;
  }

  function syncSurveyInputs() {
    const g = (id) => { const el = $("#" + id); return el ? el.value : undefined; };
    if (g("svEduO") !== undefined) Survey.data.educationLevelOther = g("svEduO");
    if (g("svAge") !== undefined) Survey.data.age = g("svAge");
    if (g("svProf") !== undefined) Survey.data.proficientSubjects = g("svProf");
    if (g("svGoalO") !== undefined) Survey.data.learningGoalsOther = g("svGoalO");
    if (g("svPrefO") !== undefined) Survey.data.learningPreferencesOther = g("svPrefO");
    if (g("svDepthO") !== undefined) Survey.data.contentDepthOther = g("svDepthO");
    if (g("svAccO") !== undefined) Survey.data.accessibilityOther = g("svAccO");
    if (g("svChO") !== undefined) Survey.data.challengesOther = g("svChO");
  }
  function surveyErr(m) { const e = $("#svErr"); if (e) e.textContent = m; else toast(m, "err"); }

  async function surveyNext() {
    syncSurveyInputs();
    const d = Survey.data;
    if (Survey.step === 0) {
      if (Survey.personalized === "Yes" && Store.plan() !== 0) { Survey.step = 1; drawSurvey(); }
      else await finishSurvey(false);
      return;
    }
    if (Survey.step === 1) {
      if (!d.educationLevel) return surveyErr(t("eEdu"));
      if (isOther(d.educationLevel) && !d.educationLevelOther.trim()) return surveyErr(t("eEduO"));
      const age = parseInt(d.age, 10);
      if (!String(d.age).trim() || isNaN(age)) return surveyErr(t("eAge"));
      if (age < 12 || age > 100) return surveyErr(t("eAgeRange"));
      if (!d.proficientSubjects.trim()) return surveyErr(t("eProf"));
      if (!d.learningGoals.length) return surveyErr(t("eGoals"));
      if (arrHasOther(d.learningGoals) && !d.learningGoalsOther.trim()) return surveyErr(t("eGoalsO"));
      Survey.step = 2; drawSurvey(); return;
    }
    if (Survey.step === 2) {
      if (!d.learningPreferences.length) return surveyErr(t("ePrefs"));
      if (arrHasOther(d.learningPreferences) && !d.learningPreferencesOther.trim()) return surveyErr(t("ePrefsO"));
      if (!d.contentDepth) return surveyErr(t("eDepth"));
      if (isOther(d.contentDepth) && !d.contentDepthOther.trim()) return surveyErr(t("eDepthO"));
      Survey.step = 3; drawSurvey(); return;
    }
    if (!d.accessibility.length) return surveyErr(t("eAcc"));
    if (arrHasOther(d.accessibility) && !d.accessibilityOther.trim()) return surveyErr(t("eAccO"));
    if (!d.challenges.length) return surveyErr(t("eChal"));
    if (arrHasOther(d.challenges) && !d.challengesOther.trim()) return surveyErr(t("eChalO"));
    await finishSurvey(true);
  }

  async function finishSurvey(personalized) {
    $("#svNext").disabled = true;
    $("#svBusy").classList.remove("hide");
    try {
      const data = personalized ? Survey.data : null;
      if (personalized) await Store.savePersonalization(data);
      const topic = CreateState.topic;
      let settings = null;
      if (CreateState.useStructure && CreateState.structure) {
        settings = { course_structure: CreateState.structure.map((m) => ({ module_name: m.title, lesson_names: m.lessons })) };
      }
      if (CreateState.file && CreateState.file.content) {
        settings = Object.assign(settings || {}, { source_document: CreateState.file.name, source_excerpt: CreateState.file.content.slice(0, 4000) });
      }
      const base = root.slugify(topic);
      let slug = base;
      while (await Store.getCourse(slug)) slug = base + "-" + Math.floor(Math.random() * 9000 + 1000);
      const course = {
        slug, topic, title: topic, createdAt: Date.now(), owner: Store.user.email,
        personal: personalized, settings, outline: null, lessons: {}, lang: L(),
      };
      await Store.saveCourse(course);
      await Store.addToLibrary(slug);
      sessionStorage.removeItem("tutorai.pendingTopic");
      ga("course_searched", { search_term: topic, email_id: Store.user.email, user_tier: Store.plan() });
      $("#surveyOverlay").hidden = true;
      location.hash = "#/course/" + encodeURIComponent(slug);
    } catch (e) {
      console.error(e);
      surveyErr(t("wentWrong"));
      $("#svNext").disabled = false;
      $("#svBusy").classList.add("hide");
    }
  }

  // ================= COURSE PAGE =================
  const CourseView = { course: null, modIdx: 0, lesIdx: 0, tab: "lesson", progress: null, chatHist: [] };

  async function renderCourse(slug) {
    view().innerHTML = "<div class='main-container' style='padding-bottom:50px'><div class='loading-line'><span class='spinner' style='margin:0'></span><span class='pulse'>…</span></div></div>";
    const course = await Store.getCourse(slug);
    if (!course) {
      view().innerHTML = "<div class='main-container'><div class='page-head'><h1>" + esc(t("notFoundT")) + "</h1><p>" + esc(t("notFoundS")) + "</p><br/><button class='btn btn-primary' data-nav='#/'>" + esc(t("backHome")) + "</button></div></div>";
      renderNav(); return;
    }
    if (course.lang && course.lang !== L()) { await I18N.setLang(course.lang); renderNav(); }
    CourseView.course = course;
    CourseView.tab = "lesson"; CourseView.chatHist = [];
    CourseView.progress = Store.isLoggedIn() ? await Store.getProgress(slug) : { done: [], quiz: {} };
    if (!course.outline) {
      view().innerHTML = "<div class='main-container' style='padding-bottom:50px'><div class='page-head'><h1>" + esc(course.topic) + "</h1><p>" + esc(t("designing")) + "</p></div><div class='spinner'></div></div>";
      try {
        const personal = course.personal ? await Store.getPersonalization() : null;
        const outline = await CourseAI.generateOutline(course.topic, personal, course.settings);
        course.outline = outline;
        course.title = outline.title || course.topic;
        await Store.saveCourse(course);
      } catch (e) {
        console.error(e);
        toast(t("outlineFail"), "err");
        course.outline = { title: course.topic, summary: "", outcomes: [], modules: [{ title: "Module 1", lessons: ["Lesson 1"] }] };
        await Store.saveCourse(course);
      }
    }
    CourseView.modIdx = 0; CourseView.lesIdx = 0;
    drawCourse();
  }

  function lessonId(m, l) { return m + ":" + l; }

  function drawCourse() {
    const c = CourseView.course;
    const o = c.outline;
    const total = o.modules.reduce((n, m) => n + m.lessons.length, 0);
    const done = CourseView.progress.done.length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const cur = o.modules[CourseView.modIdx];
    const curLesson = cur ? cur.lessons[CourseView.lesIdx] : "";
    const tabs = [["lesson", t("tabLesson")], ["quiz", t("tabQuiz")], ["flash", t("tabFlash")]];
    if (AIProvider.settings.mindmap) tabs.push(["mind", t("tabMind")]);
    tabs.push(["chat", t("tabChat")]);
    view().innerHTML =
      "<div class='main-container' style='padding-bottom:50px'>" +
      "<div style='margin-top:22px'><span class='badge'>" + esc(planName(Store.plan())) + "</span>" +
      "<h1 style='margin:8px 0 4px;font-size:clamp(24px,3.4vw,38px)'>" + esc(o.title || c.topic) + "</h1>" +
      (o.summary ? "<p style='color:var(--muted);max-width:760px'>" + esc(o.summary) + "</p>" : "") +
      "<div class='progress'><div style='width:" + pct + "%'></div></div>" +
      "<small style='color:var(--muted)'>" + done + " / " + total + " " + esc(t("lessonOf")) + " (" + pct + "%)</small></div>" +
      "<div class='tabs'>" + tabs.map((x) => "<button class='tab" + (CourseView.tab === x[0] ? " active" : "") + "' data-tab='" + x[0] + "'>" + esc(x[1]) + "</button>").join("") + "</div>" +
      "<div class='course-layout'><div class='modules'>" +
      o.modules.map((m, i) =>
        "<div class='mod'><button class='mod-t' data-mod='" + i + "'>" + (i + 1) + ". " + esc(m.title) + "</button>" +
        m.lessons.map((l, j) => {
          const id = lessonId(i, j);
          const cls = "les" + (i === CourseView.modIdx && j === CourseView.lesIdx ? " active" : "") + (CourseView.progress.done.includes(id) ? " done" : "");
          return "<button class='" + cls + "' data-mod='" + i + "' data-les='" + j + "'>" + esc(l) + "</button>";
        }).join("") + "</div>").join("") +
      "</div><div><div id='lessonMain' class='lesson-body'></div>" +
      "<div style='display:flex;gap:10px;margin-top:14px;flex-wrap:wrap'>" +
      "<button class='btn btn-ghost' id='prevLes' style='padding:10px 20px'>" + esc(t("prev")) + "</button>" +
      "<button class='btn btn-primary' id='doneBtn' style='padding:10px 20px'>" + esc(t("doneNext")) + "</button>" +
      "</div></div></div></div>";
    renderNav();
    $$("[data-tab]").forEach((b) => (b.onclick = () => { CourseView.tab = b.dataset.tab; drawCourse(); }));
    $$("[data-mod]").forEach((b) => (b.onclick = () => {
      CourseView.modIdx = +b.dataset.mod;
      if (b.dataset.les !== undefined) CourseView.lesIdx = +b.dataset.les; else CourseView.lesIdx = 0;
      CourseView.tab = "lesson";
      drawCourse();
    }));
    $("#prevLes").onclick = stepLesson.bind(null, -1);
    $("#doneBtn").onclick = completeAndNext;
    drawTabMain(curLesson);
  }

  function stepLesson(d) {
    const mods = CourseView.course.outline.modules;
    let m = CourseView.modIdx, l = CourseView.lesIdx + d;
    while (m >= 0 && m < mods.length) {
      if (l >= 0 && l < mods[m].lessons.length) break;
      m += d; l = d > 0 ? 0 : (m >= 0 ? mods[m].lessons.length - 1 : 0);
    }
    if (m < 0 || m >= mods.length) return;
    CourseView.modIdx = m; CourseView.lesIdx = l; CourseView.tab = "lesson";
    drawCourse();
  }

  async function completeAndNext() {
    const id = lessonId(CourseView.modIdx, CourseView.lesIdx);
    if (!CourseView.progress.done.includes(id)) {
      CourseView.progress.done.push(id);
      if (Store.isLoggedIn()) await Store.saveProgress(CourseView.course.slug, CourseView.progress);
    }
    stepLesson(1);
  }

  // Mind map: center node = course, alternating side branches = modules, leaves = lessons.
  function mindmapSVG(c) {
    const o = c.outline;
    const pad = 26;
    const MODC = ["#7c3aed", "#0284c7", "#15803d", "#b45309", "#dc2626", "#6d28d9"];
    const trunc = (s, n) => { s = String(s == null ? "" : s); return s.length > n ? s.slice(0, n - 1) + "…" : s; };
    const mods = o.modules.map((m, i) => ({ title: m.title, lessons: m.lessons.slice(), i }));
    const right = [], left = [];
    mods.forEach((m, k) => ((k % 2 === 0) ? right : left).push(m));
    const modLabel = (t) => trunc(t, 24);
    const lesLabel = (t) => trunc(t, 28);
    const modW = (t) => Math.min(180, Math.max(100, modLabel(t).length * 8.4 + 32));
    const lesW = (t) => Math.min(190, Math.max(88, lesLabel(t).length * 7.6 + 28));
    const rootT = trunc(o.title || c.topic, 28);
    const rootW = Math.min(280, Math.max(130, rootT.length * 9 + 46)), rootH = 56;
    // Columns must clear the root node: inner edge = root half-width + gap.
    const layoutCol = (list) => {
      const modMax = Math.max.apply(null, list.map((m) => modW(m.title)).concat([100]));
      const lesMax = Math.max.apply(null, list.map((m) => Math.max.apply(null, m.lessons.map(lesW).concat([88]))).concat([88]));
      const inner = rootW / 2 + 44;
      const lesInner = inner + modMax + 26;
      return { modMax, lesMax, inner, lesInner, half: lesInner + lesMax + pad };
    };
    const R = layoutCol(right), Lc = layoutCol(left);
    const half = Math.max(R.half, Lc.half, 320);
    const W = Math.ceil(half * 2), cx = W / 2;
    const colH = (list) => list.reduce((h, m) => h + 48 + m.lessons.length * 38 + 30, 0);
    const H = Math.max(colH(right), colH(left), 220) + pad * 2;
    const rootCy = H / 2;
    let s = "";
    const link = (x1, y1, x2, y2) => '<path class="map-link" d="M' + x1 + " " + y1 + " C" + ((x1 + x2) / 2) + " " + y1 + "," + ((x1 + x2) / 2) + " " + y2 + "," + x2 + " " + y2 + '"/>';
    const node = (x, y, w, h, fill, color, fs, stroke, label, full, dm, dl) =>
      '<g class="map-node"' + (dm !== undefined ? ' data-m="' + dm + '"' : "") + (dl !== undefined ? ' data-l="' + dl + '"' : "") + ">" +
      '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="10" fill="' + fill + '"' + (stroke ? ' stroke="' + stroke + '" stroke-width="1.5"' : "") + "/>" +
      '<text x="' + (x + w / 2) + '" y="' + (y + h / 2 + fs * 0.36) + '" text-anchor="middle" font-size="' + fs + '" font-weight="700" fill="' + color + '" textLength="' + Math.max(20, w - 20) + '" lengthAdjust="spacingAndGlyphs"><title>' + esc(full) + "</title>" + esc(label) + "</text></g>";
    const column = (list, info, dir) => {
      let y = (H - colH(list)) / 2;
      list.forEach((m) => {
        const mw = modW(m.title);
        const mx = dir > 0 ? cx + info.inner : cx - info.inner - mw;
        const my = y;
        s += link(cx + dir * (rootW / 2 - 4), rootCy, dir > 0 ? mx : mx + mw, my + 21);
        s += node(mx, my, mw, 42, MODC[m.i % MODC.length], "#fff", 13, null, modLabel(m.title), m.title, m.i, undefined);
        let ly = y + 52;
        m.lessons.forEach((ls, j) => {
          const lw = lesW(ls);
          const lx = dir > 0 ? cx + info.lesInner : cx - info.lesInner - lw;
          s += link(dir > 0 ? mx + mw : mx, my + 21, dir > 0 ? lx : lx + lw, ly + 16);
          s += node(lx, ly, lw, 32, "#f5f1ff", "#171321", 12, "#e9e4f7", lesLabel(ls), ls, m.i, j);
          ly += 38;
        });
        y = ly + 30;
      });
    };
    column(right, R, 1);
    column(left, Lc, -1);
    s += node(cx - rootW / 2, rootCy - rootH / 2, rootW, rootH, "#6d28d9", "#fff", 15, null, rootT, o.title || c.topic, undefined, undefined);
    return '<svg viewBox="0 0 ' + W + " " + H + '" role="img">' + s + "</svg>";
  }

  async function drawTabMain(curLesson) {
    const main = $("#lessonMain");
    if (!main) return;
    const c = CourseView.course;
    const mTitle = c.outline.modules[CourseView.modIdx].title;
    if (CourseView.tab === "lesson") {
      const id = lessonId(CourseView.modIdx, CourseView.lesIdx);
      const cached = c.lessons[id];
      // Migration: lessons cached while streaming escaped HTML as text are regenerated.
      if (cached && /&lt;(h3|p|ul|pre|table)[\s>]/.test(cached)) { delete c.lessons[id]; try { await Store.saveCourse(c); } catch (e) {} }
      else if (cached) { main.innerHTML = cached; return; }
      main.innerHTML = "<div class='spinner'></div><p style='text-align:center' class='pulse'>" + esc(t("writingLesson")) + "</p>";
      let html = "", raw = "";
      try {
        const personal = c.personal ? await Store.getPersonalization() : null;
        await CourseAI.generateLessonStream(c.title || c.topic, c.topic, mTitle, curLesson, personal, (chunk) => {
          raw += chunk;
          html += esc(chunk);
          main.innerHTML = "<div style='white-space:pre-wrap'>" + html + "</div><span class='pulse'>▍</span>";
        });
        // NOTE: the builtin plugin does not reliably resolve the full text when
        // onChunk is used, so render from our own raw accumulation instead.
        const text = raw.trim() ? raw : "";
        let rendered;
        if (/<[a-z][\s>/]/i.test(text)) {
          // Normalize AI HTML (unclosed <pre>/<table>/list tags are common) via the
          // browser parser, and wrap tables in a responsive scroll container.
          const doc = new DOMParser().parseFromString(text, "text/html");
          doc.querySelectorAll("table").forEach((tbl) => {
            const wrap = doc.createElement("div");
            wrap.className = "tbl-wrap";
            tbl.replaceWith(wrap);
            wrap.appendChild(tbl);
          });
          rendered = doc.body.innerHTML.trim()
            ? doc.body.innerHTML
            : "<div style='white-space:pre-wrap'>" + esc(text) + "</div>";
        } else {
          rendered = "<div style='white-space:pre-wrap'>" + esc(text) + "</div>";
        }
        c.lessons[id] = rendered;
        await Store.saveCourse(c);
        main.innerHTML = rendered;
      } catch (e) {
        console.error(e);
        main.innerHTML = "<p>" + esc(t("lessonFail")) + "</p><button class='btn btn-primary' id='retryLes'>" + esc(t("retry")) + "</button>";
        $("#retryLes").onclick = () => drawTabMain(curLesson);
      }
    } else if (CourseView.tab === "quiz") {
      main.innerHTML = "<div class='spinner'></div><p style='text-align:center' class='pulse'>" + esc(t("quizPrep")) + "</p>";
      try {
        const qs = await CourseAI.generateQuiz(c.title || c.topic, mTitle, curLesson);
        main.innerHTML = "<h3>" + esc(curLesson) + "</h3>" + qs.map((q, i) =>
          "<div class='quiz-q' data-q='" + i + "'><b>Q" + (i + 1) + ". " + esc(q.q) + "</b>" +
          q.choices.map((ch, j) => "<label><input type='radio' name='q" + i + "' value='" + j + "' /> " + esc(ch) + "</label>").join("") +
          "<div class='hint' data-why style='display:none'>💡 " + esc(q.why || "") + "</div></div>").join("") +
          "<button class='btn btn-primary' id='quizCheck'>" + esc(t("checkAns")) + "</button><div id='quizScore' style='margin-top:10px;font-weight:700'></div>";
        $("#quizCheck").onclick = () => {
          let score = 0;
          qs.forEach((q, i) => {
            const sel = $("input[name=q" + i + "]:checked", main);
            const box = $("[data-q='" + i + "']", main);
            $("[data-why]", box).style.display = "block";
            if (sel && +sel.value === q.answer) { score++; box.style.borderColor = "var(--green)"; }
            else box.style.borderColor = "#dc2626";
          });
          $("#quizScore").textContent = t("score") + score + " / " + qs.length;
        };
      } catch (e) { main.innerHTML = "<p>" + esc(t("quizFail")) + "</p>"; }
    } else if (CourseView.tab === "flash") {
      main.innerHTML = "<div class='spinner'></div><p style='text-align:center' class='pulse'>" + esc(t("flashMake")) + "</p>";
      try {
        const cards = await CourseAI.generateFlashcards(c.title || c.topic, c.topic);
        if (!cards.length) { main.innerHTML = "<p>" + esc(t("flashFail")) + "</p>"; return; }
        main.innerHTML = "<h3>" + esc(t("flashTitle")) + "</h3><div class='flash-grid'>" +
          cards.map((f, i) => "<div class='flash' data-f='" + i + "' data-front='" + esc(f.front) + "' data-back='" + esc(f.back) + "'>" + esc(f.front) + "</div>").join("") + "</div>";
        $$(".flash", main).forEach((el) => (el.onclick = () => {
          const showingBack = el.dataset.show === "1";
          el.dataset.show = showingBack ? "0" : "1";
          el.textContent = showingBack ? el.dataset.front : el.dataset.back;
          el.style.background = showingBack ? "#fff" : "var(--alpha-50)";
        }));
      } catch (e) { main.innerHTML = "<p>" + esc(t("flashFail")) + "</p>"; }
    } else if (CourseView.tab === "mind") {
      main.innerHTML = "<h3>" + esc(t("mindTitle")) + "</h3><p class='hint'>" + esc(t("mindHint")) + "</p><div class='map-scroll'>" + mindmapSVG(c) + "</div>";
      $$(".map-node", main).forEach((g) => {
        if (g.dataset.m === undefined) return;
        g.onclick = () => {
          CourseView.modIdx = +g.dataset.m;
          CourseView.lesIdx = g.dataset.l !== undefined ? +g.dataset.l : 0;
          CourseView.tab = "lesson";
          drawCourse();
        };
      });
    } else {
      main.innerHTML = "<h3>" + esc(t("chatTitle")) + "</h3><div id='chatLog' style='display:flex;flex-direction:column;gap:10px;margin:12px 0'>" +
        CourseView.chatHist.map((m) => "<div style='background:" + (m.role === "user" ? "#eef" : "var(--alpha-50)") + ";border-radius:10px;padding:10px 14px;white-space:pre-wrap'>" + esc(m.text) + "</div>").join("") +
      "</div><div class='chat-bar'><input id='chatIn' class='field' placeholder='" + esc(t("chatPh")) + "' /><button class='btn btn-primary' id='chatGo'>" + esc(t("send")) + "</button></div>";
      const send = async () => {
        const inp = $("#chatIn");
        const q = inp.value.trim();
        if (!q) return;
        inp.value = "";
        CourseView.chatHist.push({ role: "user", text: q });
        const log = $("#chatLog");
        log.innerHTML += "<div style='background:#eef;border-radius:10px;padding:10px 14px'>" + esc(q) + "</div><div id='chatStream' style='background:var(--alpha-50);border-radius:10px;padding:10px 14px'><span class='pulse'>" + esc(t("thinking")) + "</span></div>";
        let acc = "";
        try {
          await CourseAI.chat(c.title || c.topic, c.topic, curLesson, CourseView.chatHist.slice(0, -1), q, (chunk) => {
            acc += esc(chunk);
            const s = $("#chatStream");
            if (s) s.innerHTML = "<div style='white-space:pre-wrap'>" + acc + "</div>";
          });
        } catch (e) { acc = t("wentWrong"); }
        CourseView.chatHist.push({ role: "tutor", text: acc.replace(/<[^>]+>/g, "") || "(…)" });
        drawTabMain(curLesson);
      };
      $("#chatGo").onclick = send;
      $("#chatIn").addEventListener("keydown", (e) => { if (e.key === "Enter") send(); });
    }
  }

  // ================= LIBRARY =================
  async function renderLibrary() {
    if (!Store.isLoggedIn()) {
      view().innerHTML = "<div class='main-container'><div class='page-head'><h1>" + esc(t("libTitle")) + "</h1><p>" + esc(t("libSign")) + "</p><br/><button class='btn btn-primary' id='libSign'>" + esc(t("signIn")) + "</button></div></div>";
      renderNav();
      $("#libSign").onclick = () => openSignIn(route);
      return;
    }
    view().innerHTML = "<div class='main-container' style='padding-bottom:40px'><div class='page-head' style='text-align:start'><h1>" + esc(t("libTitle")) + "</h1><p id='libCount'>…</p></div><div class='lib-grid' id='libGrid'><div class='spinner'></div></div></div>";
    renderNav();
    const slugs = await Store.mySlugs();
    const grid = $("#libGrid");
    $("#libCount").textContent = slugs.length + " · " + planName(Store.plan());
    if (!slugs.length) {
      grid.innerHTML = "<div class='card'><h3>" + esc(t("libEmptyT")) + "</h3><p>" + esc(t("libEmptyS")) + "</p><br/><button class='btn btn-primary' data-nav='#/create-course'>" + esc(t("libCreate")) + "</button></div>";
      renderNav(); return;
    }
    const courses = [];
    for (const s of slugs) { const c = await Store.getCourse(s); if (c) courses.push(c); }
    grid.innerHTML = courses.map((c) => {
      const n = c.outline ? c.outline.modules.reduce((a, m) => a + m.lessons.length, 0) : 0;
      return "<div class='lib-card' data-slug='" + esc(c.slug) + "'><h3>" + esc((c.outline && c.outline.title) || c.topic) + "</h3><p>" + n + " " + esc(t("lessons")) + " · " + new Date(c.createdAt).toLocaleDateString(L() === "ar" ? "ar" : "en") + "</p>" +
        "<div style='margin-top:12px;display:flex;gap:8px'><button class='btn btn-primary' style='padding:8px 18px;font-size:13px' data-open='" + esc(c.slug) + "'>" + esc(t("open")) + "</button>" +
        "<button class='btn btn-ghost' style='padding:8px 18px;font-size:13px' data-del='" + esc(c.slug) + "'>" + esc(t("del")) + "</button></div></div>";
    }).join("");
    $$("[data-open]").forEach((b) => (b.onclick = (e) => { e.stopPropagation(); location.hash = "#/course/" + encodeURIComponent(b.dataset.open); }));
    $$("[data-del]").forEach((b) => (b.onclick = async (e) => {
      e.stopPropagation();
      if (b.dataset.armed !== "1") {
        b.dataset.armed = "1";
        const orig = b.textContent;
        b.textContent = "⚠ " + t("delConfirm");
        setTimeout(() => { if (b.isConnected) { b.dataset.armed = ""; b.textContent = orig; } }, 4000);
        return;
      }
      b.dataset.armed = "";
      await Store.removeFromLibrary(b.dataset.del);
      renderLibrary();
    }));
  }

  // ================= PRICING =================
  const PriceUI = { yearly: true };
  function renderPricing() {
    const data = pricing();
    ga("pricing_page_view", { user_email: Store.isLoggedIn() ? Store.user.email : "not logged in", ab_group: Store.identity.ab });
    const card = (p) => {
      const hot = p.id === 1;
      const big = p.id === 0 ? t("startFree").replace("Start for free", "Free").replace("ابدأ مجاناً", "مجاناً") : "$" + (PriceUI.yearly ? p.perMonthBilledYearly.toFixed(2) : p.monthly.toFixed(2));
      const bigTxt = p.id === 0 ? (L() === "ar" ? "مجاناً" : "Free") : big;
      const per = p.id === 0 ? "" : "<div class='price-per'>" + esc(t("perMonth")) + (PriceUI.yearly ? esc(t("billedYearly")) : "") + "</div>";
      const canBuy = p.id > 0 && Store.plan() < p.id;
      return "<div class='price-card" + (hot ? " hot" : "") + "'><h2>" + esc(p.name) + "</h2><small>" + esc(p.tag) + "</small>" +
        "<div class='price-big'>" + esc(bigTxt) + "</div>" + per +
        "<ul class='feat-list'>" + p.features.map((f) => "<li><span class='tick'>✓</span><span>" + esc(f) + "</span></li>").join("") + "</ul>" +
        (p.id === 0
          ? "<button class='btn " + (hot ? "btn-white" : "btn-ghost") + "' data-nav='#/create-course'>" + esc(t("startFree")) + "</button>"
          : Store.plan() === p.id
            ? "<button class='btn btn-ghost' disabled>" + esc(t("currentPlan")) + "</button>"
            : "<button class='btn " + (hot ? "btn-white" : "btn-primary") + "' data-buy='" + p.id + "'>" + esc(t("getStarted")) + "</button>") +
        "</div>";
    };
    view().innerHTML =
      "<div class='main-container' style='padding-bottom:50px'><div class='page-head'><h1>" + esc(t("priceTitle")) + "</h1>" +
      "<p>" + esc(t("priceSub")) + "</p></div>" +
      "<div class='bill-toggle'><span>" + esc(t("billYearly")) + "</span><label class='switch'><input type='checkbox' id='billT' " + (PriceUI.yearly ? "checked" : "") + " /><span class='knob'></span></label><span style='color:var(--green);font-size:14px'>" + esc(t("save30")) + "</span></div>" +
      "<div class='price-grid'>" + data.map(card).join("") + "</div>" +
      "<p class='hint' style='text-align:center;margin-top:16px'>" + esc(t("demoCheckoutNote")) + "</p></div>";
    renderNav();
    $("#billT").onchange = (e) => { PriceUI.yearly = e.target.checked; renderPricing(); };
    $$("[data-buy]").forEach((b) => (b.onclick = () => startCheckout(+b.dataset.buy)));
  }

  function startCheckout(planId) {
    if (!Store.isLoggedIn()) { openSignIn(() => startCheckout(planId)); return; }
    const p = pricing().find((x) => x.id === planId);
    $("#checkoutBody").innerHTML = "<h2>" + esc(t("coTitle")) + "</h2><p class='sub'>" + esc(t("coSub1")) + " <b>" + esc(p.name) + "</b> — $" +
      (PriceUI.yearly ? p.yearly + "/year" : p.monthly + "/month") + ". " + esc(t("coSub2")) + "</p>" +
      "<div class='modal-nav'><button class='btn btn-ghost' onclick='document.getElementById(\"checkoutOverlay\").hidden=true'>" + esc(t("cancel")) + "</button>" +
      "<button class='btn btn-primary' id='coConfirm'>" + esc(t("confirmUpgrade")) + "</button></div>";
    $("#checkoutOverlay").hidden = false;
    ga("begin_checkout", { user_email: Store.user.email, currency: "USD", plan: p.name });
    $("#coConfirm").onclick = async () => {
      await Store.setPlan(planId);
      $("#checkoutOverlay").hidden = true;
      toast(t("nowOn") + " " + p.name + " " + t("planDemo"), "ok");
      renderNav();
      renderPricing();
    };
  }
  window.startCheckout = startCheckout;

  // ================= CONTACT =================
  function renderContact() {
    view().innerHTML =
      "<div class='main-container' style='padding-bottom:50px'><div class='page-head'><h1>" + esc(t("contactTitle")) + "</h1><p>" + esc(t("contactSub")) + "</p></div>" +
      "<form class='contact-form' id='contactForm'><label>" + esc(t("nameL")) + "</label><input id='cName' class='field' maxlength='64' placeholder='" + esc(t("namePh")) + "' required />" +
      "<label>" + esc(t("emailL")) + "</label><input id='cEmail' class='field' dir='ltr' maxlength='64' placeholder='your@email.com' required /><div id='cEmailErr' class='err'></div>" +
      "<label>" + esc(t("msgL")) + "</label><textarea id='cMsg' class='field' rows='5' maxlength='1500' placeholder='" + esc(t("msgPh")) + "' required></textarea>" +
      "<button class='btn btn-primary' style='width:100%;margin-top:18px' id='cSend'>" + esc(t("submit")) + "</button></form></div>";
    renderNav();
    $("#contactForm").onsubmit = async (e) => {
      e.preventDefault();
      const email = $("#cEmail").value.trim();
      if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) { $("#cEmailErr").textContent = t("validEmail"); return; }
      $("#cEmailErr").textContent = "";
      const btn = $("#cSend");
      btn.disabled = true; btn.textContent = t("sending");
      try {
        await Store.saveContact({ name: $("#cName").value, email, message: $("#cMsg").value, at: Date.now() });
        toast(t("msgOk"), "ok");
        $("#cName").value = ""; $("#cEmail").value = ""; $("#cMsg").value = "";
      } catch (err) { toast(t("msgErr"), "err"); }
      finally { btn.disabled = false; btn.textContent = t("submit"); }
    };
  }

  // ================= PROFILE =================
  async function renderProfile() {
    if (!Store.isLoggedIn()) {
      view().innerHTML = "<div class='main-container'><div class='page-head'><h1>" + esc(t("profileTitle")) + "</h1><p>" + esc(t("profileSign")) + "</p><br/><button class='btn btn-primary' id='pSign'>" + esc(t("signIn")) + "</button></div></div>";
      renderNav();
      $("#pSign").onclick = () => openSignIn(route);
      return;
    }
    const slugs = await Store.mySlugs();
    const personal = await Store.getPersonalization();
    view().innerHTML =
      "<div class='main-container' style='padding-bottom:50px'><div class='page-head' style='text-align:start'><h1>" + esc(t("profileTitle")) + "</h1></div>" +
      "<div class='panel'><h3 style='margin-top:0'>" + esc(Store.user.name || "Learner") + "</h3><p class='hint'>" + esc(Store.user.email) + " · " + esc(planName(Store.plan())) + " · A/B " + esc(Store.identity.ab) + "</p>" +
      "<p>" + esc(t("coursesCreated")) + "<b>" + slugs.length + " / " + planMax(Store.plan()).maxCourses + "</b></p>" +
      "<div style='display:flex;gap:10px;flex-wrap:wrap;margin-top:12px'><button class='btn btn-ghost' data-nav='#/library'>" + esc(t("openLib")) + "</button>" +
      "<button class='btn btn-ghost' data-nav='#/pricing'>" + esc(t("changePlan")) + "</button>" +
      "<button class='btn btn-ghost' data-nav='#/settings'>" + esc(t("navSettings")) + "</button>" +
      "<button class='btn btn-ghost' id='pOut'>" + esc(t("signOut")) + "</button></div>" +
      (personal ? "<h3>" + esc(t("savedPers")) + "</h3><pre style='background:var(--alpha-50);padding:14px;border-radius:10px;overflow:auto;font-size:13px'>" + esc(JSON.stringify(personal, null, 1)) + "</pre>" : "") +
      "</div></div>";
    renderNav();
    $("#pOut").onclick = async () => { await Store.signOut(); renderNav(); location.hash = "#/"; };
  }

  // ================= SETTINGS (AI providers) =================
  const SetUI = { preset: "openai" };
  function renderSettings() {
    const P = AIProvider.presets;
    const s = AIProvider.settings;
    SetUI.preset = s.preset && P[s.preset] ? s.preset : "openai";
    const presetOpts = Object.keys(P).filter((k) => k !== "builtin").map((k) =>
      "<option value='" + k + "'" + (SetUI.preset === k ? " selected" : "") + ">" + esc(P[k].name) + "</option>").join("");
    const modelList = (P[SetUI.preset].models || []).map((m) => "<option value='" + esc(m) + "'>").join("");
    const active = AIProvider.activeName();
    view().innerHTML =
      "<div class='main-container' style='padding-bottom:50px;max-width:720px'><div class='page-head' style='text-align:start'>" +
      "<h1>" + esc(t("setTitle")) + "</h1><p>" + esc(t("setSub")) + "</p></div>" +
      "<div class='panel'><p><b>" + esc(t("backendL")) + "</b> " + (active ? "<span class='badge'>" + esc(active) + "</span>" : "<span class='badge'>" + esc(t("builtin")) + "</span>") + "</p>" +
      "<div class='toggle-row'><label class='switch'><input type='checkbox' id='setEnable' " + (s.enabled ? "checked" : "") + " /><span class='knob'></span></label>" +
      "<div><b>" + esc(t("useCustom")) + "</b><br /><small>" + esc(t("useCustomSub")) + "</small></div></div>" +
      "<div id='setForm' style='" + (s.enabled ? "" : "opacity:.45") + "'>" +
      "<label><b>" + esc(t("presetL")) + "</b></label><select id='setPreset' class='field' style='margin:6px 0 12px'>" + presetOpts + "</select>" +
      "<label><b>" + esc(t("baseL")) + "</b></label><input id='setBase' class='field' style='margin:6px 0 12px;direction:ltr' placeholder='https://api.example.com/v1' value='" + esc(s.baseUrl || "") + "' />" +
      "<label><b>" + esc(t("keyL")) + "</b></label><input id='setKey' type='password' class='field' style='margin:6px 0 12px;direction:ltr' placeholder='sk-...' value='" + esc(s.apiKey || "") + "' />" +
      "<label><b>" + esc(t("modelL")) + "</b></label><input id='setModel' class='field' list='modelList' style='margin:6px 0 12px;direction:ltr' placeholder='gpt-4o-mini' value='" + esc(s.model || "") + "' /><datalist id='modelList'>" + modelList + "</datalist>" +
      (SetUI.preset === "ollama" ? "<div class='kv-note'>" + esc(t("ollamaNote")) + "</div>" : "") +
      "<label><b>" + esc(t("tempL")) + ": <span id='tempVal'>" + (s.temperature == null ? 0.7 : s.temperature) + "</span></b></label>" +
      "<input id='setTemp' type='range' min='0' max='1.5' step='0.1' value='" + (s.temperature == null ? 0.7 : s.temperature) + "' style='width:100%' />" +
      "</div>" +
      "<h3 style='margin-top:22px'>" + esc(t("setExtras")) + "</h3>" +
      "<div class='toggle-row'><label class='switch'><input type='checkbox' id='setMind' " + (s.mindmap ? "checked" : "") + " /><span class='knob'></span></label>" +
      "<div><b>" + esc(t("mindEnable")) + "</b><br /><small>" + esc(t("mindEnableSub")) + "</small></div></div>" +
      "<div id='setErr' class='err'></div><div id='setOk' style='color:var(--green);font-weight:700;margin-top:8px'></div>" +
      "<div style='display:flex;gap:10px;margin-top:16px;flex-wrap:wrap'><button class='btn btn-primary' id='setSave'>" + esc(t("saveSet")) + "</button>" +
      "<button class='btn btn-ghost' id='setTest'>" + esc(t("testConn")) + "</button></div>" +
      "<div class='kv-note'>" + esc(t("keysNote")) + "</div>" +
      "</div></div>";
    renderNav();
    $("#setEnable").onchange = (e) => { $("#setForm").style.opacity = e.target.checked ? "" : ".45"; };
    $("#setTemp").oninput = (e) => { $("#tempVal").textContent = e.target.value; };
    $("#setPreset").onchange = (e) => {
      SetUI.preset = e.target.value;
      const p = P[SetUI.preset];
      if (p.baseUrl) $("#setBase").value = p.baseUrl;
      if (p.models && p.models.length) $("#setModel").value = p.models[0];
      const dl = $("#modelList");
      if (dl) dl.innerHTML = (p.models || []).map((m) => "<option value='" + esc(m) + "'>").join("");
    };
    const collect = () => ({
      enabled: $("#setEnable").checked,
      preset: $("#setPreset").value,
      baseUrl: $("#setBase").value.trim(),
      apiKey: $("#setKey").value.trim(),
      model: $("#setModel").value.trim(),
      temperature: parseFloat($("#setTemp").value),
      mindmap: $("#setMind").checked,
    });
    $("#setSave").onclick = async () => {
      $("#setErr").textContent = ""; $("#setOk").textContent = "";
      await AIProvider.save(collect());
      $("#setOk").textContent = t("setSaved") + (AIProvider.isCustom() ? " " + t("customOn") : "");
      renderSettings();
    };
    $("#setTest").onclick = async () => {
      $("#setErr").textContent = ""; $("#setOk").textContent = "";
      const v = collect();
      if (!v.baseUrl || !v.apiKey || !v.model) { $("#setErr").textContent = t("testNeed"); return; }
      const btn = $("#setTest");
      btn.disabled = true; btn.textContent = t("testing");
      try {
        await AIProvider.save(v);
        const reply = await AIProvider.test();
        $("#setOk").textContent = t("testOk") + " (" + String(reply).slice(0, 80) + ")";
      } catch (e) {
        console.error(e);
        $("#setErr").textContent = t("testFail");
      } finally { btn.disabled = false; btn.textContent = t("testConn"); renderNav(); }
    };
  }

  // ---------- boot ----------
  async function boot() {
    await Store.boot();
    await I18N.boot();
    if (Store.user && Store.user.lang && Store.user.lang !== I18N.lang) I18N.lang = Store.user.lang;
    I18N.applyDir();
    await AIProvider.load();
    renderNav();
    route();
  }
  if (document.readyState !== "loading") boot();
  else document.addEventListener("DOMContentLoaded", boot);
})();
