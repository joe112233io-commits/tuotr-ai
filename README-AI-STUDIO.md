# نقل مشروع TutorAI إلى Google AI Studio — دليل سريع

هذا الأرشيف يحوي كامل المشروع كما هو في Perchance:
`index.html` + `main.pjs` + مجلد `src/` (التصميم، الترجمة، المتجر، المزود، الذكاء، التطبيق).

## ما الذي يعمل فوراً في AI Studio؟
- `src/styles.css` — التصميم كاملاً (متجاوب + عربي RTL).
- `src/i18n.js` — كل نصوص EN/AR (لا يعتمد على Perchance إطلاقاً).
- `src/provider.js` — يدعم أي مزود متوافق مع OpenAI ومنها Gemini عبر:
  `https://generativelanguage.googleapis.com/v1beta/openai` — فقط يحتاج `fetch` بدل `superFetch`.

## ما الذي يحتاج تكييفاً بسيطاً؟ (5 نقاط)
1. **`index.html` هو محتوى `<body>` فقط** — غلّفه في AI Studio بهيكل HTML كامل
   (`<html><head>…</head><body>…المحتوى…</body></html>`) مع روابط `src/*.js` و `src/styles.css`.
2. **`main.pjs` قوائم Perchance** (المواضيع المقترحة، الأسئلة الشائعة، الأسعار، الكلمات المحظورة)
   — انسخ محتواها إلى ملف `src/data.js` ككائن `DATA` عادي، واستبدل استدعاءات
   `root[…]` و `root.slugify` و `root.getPricingData` في `src/app.js` بها.
3. **`root.kv` (التخزين)** في `src/store.js` — الاستدعاءات كلها داخل `kvSafe(…)`،
   استبدلها بـ `localStorage`/`IndexedDB` (البنية جاهزة: نفس أسماء المفاتيح `tutorUsers` وغيرها).
4. **`root.generateText`** في `src/provider.js` — استبدلها بمناداة Gemini API بمفتاح من AI Studio.
5. **`root.superFetch`** — استبدلها بـ `fetch` العادي (تعمل فوراً لنفس-المنشأ و Gemini).

## ملاحظات
- مفاتيح API في النسخة الحالية تُحفظ في المتصفح فقط — حافظ على ذلك في AI Studio.
- الدفع والمصادقة نسخ تجريبية محلية (لا مفاتيح حقيقية منقولة).
- الخطوط والأيقونات كلها محلية/نظامية — لا أصول خارجية مطلوبة.
