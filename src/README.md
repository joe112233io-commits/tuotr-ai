# TutorAI Clone — README

Rebuilt from `scratch/message-attachments/tutorai-me-reverse-engineering/README.md` (static analysis of tutorai.me Next.js bundles, RSC payloads, CDP capture).

## What was cloned
- **Home**: hero ("Next Level AI Tutoring for Life-Long Learners"), topic search, popular courses, stats (800K+ / 10M+ / 14+ / 23+), 6 feature cards, 4-step How-it-works, 4 audiences, 6-item FAQ, CTA — copy taken from `js-chunks/app-pages/app-page.js`.
- **Create course** (`#/create-course`): topic input, "Use your own sources" + "Define course structure" toggles, suggested topics, file upload (text read locally; PDF name-only + plan-based MB limits 4/10/20), structure editor, AI-drafted structure, homework helper.
- **Personalization survey**: Step 0 (Yes/No, free users blocked like the original) + Steps 1–3 (education, age 12–100, proficient subjects, goals, preferences, depth, accessibility default None, challenges) with the original validation messages.
- **Authorization UX** (`/api/search-authorization` mirrored): banned-content message, no-info message, per-plan credit-exhausted messages (Free/Mentor/max), `course_searched` / `course_search_failed` events.
- **Course page** (`#/course/:slug`): outline → modules/lessons sidebar, streamed AI lesson HTML, quiz, flashcards, AI tutor chat, progress bar persisted per user.
- **Library** (`#/library`), **Pricing** (`#/pricing`: Starter/Mentor/Genius, monthly/yearly toggle, B-group prices $16/$21, demo checkout), **Contact** (`#/contact-us`: original email regex, inbox in kv), **Profile** (`#/profile`).
- **Auth**: demo equivalent of Firebase Google + magic-link (instant local login, `sign_up`/`login` events, A/B group 50/50 in localStorage `taiv1.*`).

## Deliberate differences from the original
- No Firebase/Stripe keys or backend: persistence via `kv-plugin` (`tutorUsers`, `tutorLib`, `tutorCourses`, `tutorProgress`, `tutorPersonal`, `tutorContacts`), checkout only flips the local plan.
- Course content comes from `ai-text-plugin`, not the original `/course/[slug]` backend (not captured).
- Analytics (GA4/Clarity/Rewardful) are console-log stubs.

## Files
- `main.pjs` — $meta, plugin imports (`ai-text-plugin`, `kv-plugin`, `super-fetch-plugin`), EN + AR topic/FAQ/feature lists, `getPricingData(lang)`, `planName(id, lang)`, `slugify()`, banned words.
- `index.html` — shell: nav, `#view`, footer, 3 modals, script tags. Static strings use `data-i18n`/`data-i18n-ph`.
- `src/i18n.js` — EN/AR dictionary + survey option translations, `dir`/`lang` switching, localStorage + profile persistence, Arabic auto-detect from browser.
- `src/store.js` (auth/library/kv + provider settings), `src/provider.js` (AI backends), `src/ai.js` (language-aware prompts), `src/app.js` (router + pages incl. `#/settings`).

## Languages (EN/AR + RTL)
- Toggle 🌐 in the navbar (persists per browser + per user profile; auto-detects Arabic browsers).
- All pages, modals, survey, pricing, emails-validation messages fully translated; `document.dir` flips and CSS mirrors search button, switches, lesson rails, toasts (`html[dir=rtl]` rules).
- Course generation follows the UI language (Arabic prompts force Arabic output); the course page re-applies its saved language when opened.

## AI provider settings (`#/settings`)
- Default: Perchance built-in AI. Optional custom backend for **all** generation (outlines, lessons, quizzes, flashcards, tutor chat, homework).
- Presets: OpenAI, Anthropic (native Messages API), Gemini, Mistral, DeepSeek, Groq, Together, OpenRouter, Cohere, Ollama/local, plus fully **Custom** (any OpenAI-compatible base URL + any custom model name + temperature).
- Keys stored only in this browser (kv per user, localStorage for guests); Test-connection button verifies with a minimal prompt before saving.

## Lessons: tables & HTML safety
- The lesson prompt requires real `<table><thead>…` data tables (never dash-faked ones like in the old report).
- Rendered lesson HTML is normalized with DOMParser (fixes unclosed `<pre>`/lists from the model) and every table is wrapped in a responsive `.tbl-wrap` scroll container with styled header/zebra rows.

## Mind maps (optional, off by default)
- `#/settings` → Learning extras → "Enable mind maps". Stored with the provider settings (kv per user).
- When on, course pages gain a 🧠 tab: SVG map (course → modules → lessons), click any node to jump to that lesson, EN/AR titles supported.

## Full-review pass (responsive, icons, a11y)
- **Mobile nav**: hamburger ☰ menu under 900px (nav links hide there); closes on navigation and on ESC; desktop shows inline links, hamburger hidden.
- **Grid blowout fix**: `course-layout`/`create-grid` use `minmax(0,…)` + `min-width:0` children — long lesson titles no longer force horizontal page overflow (was +147px on phones).
- **Icons**: SVG graduation-cap brand mark; feature cards use soft-violet icon chips; emoji use a consistent color-emoji font stack, fixed sizes, `aria-hidden`.
- **Touch**: ≥44px-ish targets on coarse pointers (chips, tabs, quiz radios, lesson buttons); chat/struct-editor rows wrap on narrow screens; hot price card stops scaling on phones.
- **A11y**: `:focus-visible` rings, `prefers-reduced-motion` disables spinner/pulse animation, modals have `role=dialog` + ESC/backdrop close, search/email inputs labelled, email inputs `dir=ltr`.
- **Validation**: email regex accepts long TLDs (contact + sign-in); Anthropic temperature clamped to 0–1; slug collisions loop until free; course delete uses inline two-tap confirm instead of blocking `confirm()`; settings shows a localhost hint for the Ollama preset.
