/* TutorAI clone — i18n: English + Arabic with full RTL. Classic script, exposes window.I18N. */
(function () {
  "use strict";

  const STR = {
    en: {
      dir: "ltr", langName: "EN", otherLang: "عربي",
      navCreate: "Create Course", navPricing: "Pricing", navLibrary: "Library", navContact: "Contact", navSettings: "Settings",
      signIn: "Sign In", newCourse: "+ New Course", menu: "Menu",
      heroA: "Next Level AI Tutoring", heroB: "for Life-Long Learners",
      heroSub: "Create a custom learning pathway to help you achieve more in school, work, and life.",
      searchPh: "Enter any topic to create a custom course...",
      createCourseBtn: "✦ Create Course", popular: "Popular courses:",
      demoLink: "Tutor AI explained in 109 seconds", demoToast: "Demo video is a placeholder in this rebuild — the original embedded /videos/demo.m3u8.",
      shotTitle: "📚 Your personal AI tutor, 24/7", shotSub: "Personalized courses • Quizzes • Flashcards • Progress tracking",
      stat1: "Happy Learners", stat2: "Courses Generated", stat3: "Years Of Experience", stat4: "Universities Using Tutor AI",
      featTitle: "Everything You Need to Learn Smarter", featSub: "Powerful AI tools designed to make learning easier, faster, and more effective",
      stepsTitle: "How Tutor AI Works", stepsSub: "Start learning in minutes with our simple, powerful process",
      audTitle: "Perfect for Every Learner",
      faqTitle: "Frequently Asked Questions",
      ctaTitle: "Ready to Start Learning?", ctaSub: "Join hundreds of thousands of learners who are achieving their goals with Tutor AI. Start your journey today!",
      ctaBtn1: "Create Your First Course", ctaBtn2: "View Pricing",
      notFoundT: "Sorry we couldn't find this page.", notFoundS: "But don't worry, you can find plenty of other things on our homepage.", backHome: "Back to homepage",
      // create
      createTitle: "Create New Course", topicPh: "Type a topic to instantly generate a course...",
      useSources: "Use your own sources", useSourcesSub: "Upload or select documents to build a course with your own content.",
      useStruct: "Define course structure", useStructSub: "Generate and customize the structure before building the course.",
      createBtn: "✦ Create Course", hwBtn: "AI Homework Helper", sugTitle: "Suggested Topics:",
      guestLine: "guest — sign in to generate", planLine: "plan",
      srcTitle: "Your sources", fileHint: "PDFs: name recorded (demo limit 4MB free / 10MB Mentor / 20MB Genius). Text files are read locally and used as course-plan hints.",
      structTitle: "Course Plan Structure Guide", structSub: "Define your course structure to help generate more relevant content.",
      addModule: "+ Add Module", aiDraft: "✦ Let AI draft it from my topic", aiDrafting: "Drafting…",
      structToast: "Structure drafted — edit it freely before building.",
      hwTitle: "AI Homework Helper", hwPh: "Paste any homework question...", hwGo: "Solve step-by-step",
      hwPrompt: "You are TutorAI homework helper. Solve step-by-step with clear explanations, then give the final answer. Question: ",
      needTopic: "Please enter a proper topic to search.",
      // authz
      banned: "The term searched is banned and goes against our terms of service.",
      noInfo: "The term searched does not have enough information to generate learning modules. ",
      credit0: "You have exhausted your free course generation credits. Please upgrade to a paid plan to continue generating courses.",
      credit1: "You have exhausted your course generation credits for this month. Please upgrade to a higher plan to continue generating courses.",
      credit2: "You have exhausted the max course generation credits for this month. Please contact support so we can assess your usage and provide a solution.",
      wentWrong: "Something went wrong. Please try again.",
      // survey
      s0t: "Personalization Preference", s0s: "Would you like the course to be personalized for you?",
      freeBlocked: "Personalization of courses is not available for free users.",
      explorePlans: "Explore paid plans", here: "here",
      s1t: "Step 1 — Background", s1s: "Education, age, subjects & goals",
      s2t: "Step 2 — How you learn", s2s: "Preferences & depth",
      s3t: "Step 3 — Support needs", s3s: "Accessibility & challenges",
      eduL: "Education Level", ageL: "Age", profL: "Proficient Subjects", goalsL: "Learning Goals",
      prefL: "Learning Preferences", depthL: "Content Depth", accL: "Accessibility Needs", chalL: "Learning Challenges",
      specifyPh: "Specify...", agePh: "", profPh: "e.g. math, writing",
      back: "Back", next: "Next", createNow: "Create Now", cancel: "Cancel",
      generating: "Generating... Please wait.", designing: "Designing your course outline…",
      eEdu: "Please select your educational background.", eEduO: "Please specify your educational background.",
      eAge: "Please enter a valid age.", eAgeRange: "Please enter a valid age between 12 and 100.",
      eProf: "Please enter your proficient subjects.", eGoals: "Please select your learning goals.", eGoalsO: "Please specify your learning goals.",
      ePrefs: "Please select your learning preferences.", ePrefsO: "Please specify your learning preferences.",
      eDepth: "Please select your content depth preferences.", eDepthO: "Please specify your content depth preferences.",
      eAcc: "Please select your accessibility needs.", eAccO: "Please specify your accessibility needs.",
      eChal: "Please select your learning challenges.", eChalO: "Please specify your learning challenges.",
      // course
      tabLesson: "📖 Lesson", tabQuiz: "📝 Quiz", tabFlash: "🗂 Flashcards", tabChat: "💬 AI Tutor",
      prev: "← Previous", doneNext: "✓ Mark complete & next",
      lessonOf: "lessons complete", writingLesson: "Writing your lesson with AI…",
      lessonFail: "Lesson generation failed. Please retry.", retry: "Retry",
      quizPrep: "Preparing your quiz…", checkAns: "Check answers", score: "Score: ",
      quizFail: "Quiz failed to load. Try again.",
      flashMake: "Making flashcards…", flashTitle: "Flashcards — click to flip", flashFail: "Flashcards failed to load.",
      chatTitle: "Ask your AI tutor", chatPh: "Ask anything about this lesson...", send: "Send", thinking: "Thinking…",
      outlineFail: "Outline generation hiccup — showing a starter outline.",
      // library
      libTitle: "Your Library", libSign: "Sign in to see your courses.",
      libEmptyT: "No courses yet", libEmptyS: "Create your first AI course in seconds.", libCreate: "Create a course",
      open: "Open", del: "Delete", delConfirm: "Delete this course?", lessons: "lessons",
      // pricing
      priceTitle: "Plans That Fit Your Needs", priceSub: "Create a custom learning pathway to help you achieve more in school, work, and life.",
      billYearly: "Bill Yearly", save30: "(Saves up to 30%)", perMonth: "/ Month", billedYearly: ", billed yearly",
      startFree: "Start for free", getStarted: "Get Started", currentPlan: "Current plan",
      demoCheckoutNote: "Demo checkout — no real payment. Upgrading stores your plan locally.",
      coTitle: "Checkout (demo)", coSub1: "Upgrade to", coSub2: "No card required in this rebuild.",
      confirmUpgrade: "Confirm upgrade", nowOn: "You're now on the", planDemo: "plan (demo).",
      // contact
      contactTitle: "Contact Us", contactSub: "We'd love to hear from you — hello@tutorai.me",
      nameL: "Name", namePh: "Your Name", emailL: "Email", msgL: "Your Message", msgPh: "Write your message here...",
      submit: "Submit", sending: "Sending…", validEmail: "Please enter a valid email",
      msgOk: "Your message has been submitted successfully. We'll get back to you soon.",
      msgErr: "Something went wrong. Please try again later or contact us at hello@tutorai.me",
      // profile
      profileTitle: "Profile", profileSign: "Sign in first.", coursesCreated: "Courses created: ",
      openLib: "Open Library", changePlan: "Change plan", signOut: "Sign out", savedPers: "Saved personalization",
      // signin modal
      siTitle: "Welcome to Tutor AI", siSub: "Sign in with a magic email link or Google. Demo build: login completes instantly, no password.",
      siName: "Name (optional)", siNamePh: "Your name", siEmailPh: "your@email.com",
      siContinue: "Continue with Email", siSending: "Sending magic link…", siGoogle: "Ⓖ Sign in with Google",
      siNote: 'We sent you a magic link — in this demo the link is auto-accepted. "Sign in with Apple" was disabled in the original and stays disabled here.',
      close: "Close",
      welcomeNew: "Welcome! Your demo magic link signed you in.", welcomeBack: "Welcome back!",
      googleNew: "Signed in with Google (demo).",
      // settings
      setTitle: "AI Provider Settings", setSub: "Choose which AI service generates your courses. Keys are stored only in this browser.",
      backendL: "Active backend:", builtin: "Perchance built-in AI",
      useCustom: "Use a custom AI provider", useCustomSub: "Route all generation (outlines, lessons, quizzes, chat) through your own API key.",
      presetL: "Provider preset", baseL: "Base URL (OpenAI-compatible)", keyL: "API key", modelL: "Model",
      tempL: "Temperature", saveSet: "Save settings", testConn: "Test connection", testing: "Testing…",
      testOk: "Connection works — the provider replied correctly.",
      testFail: "Test failed. Check the base URL, key and model, then try again.",
      testNeed: "Enter a base URL, API key and model first.",
      keysNote: "Your key never leaves this browser except to call the provider you configured. Without a key, the built-in Perchance AI is used.",
      ollamaNote: "Ollama runs on your own machine — open this page in a desktop browser on the same computer. No API key needed; HTTPS pages may block plain-http localhost, use http:// or the desktop app in that case.",      setSaved: "Provider settings saved.", customOn: "Custom provider enabled.",
      tabMind: "🧠 Mind Map", mindTitle: "Course mind map", mindHint: "Click any node to jump to that lesson.",
      setExtras: "Learning extras",
      mindEnable: "Enable mind maps", mindEnableSub: "Show an interactive mind-map tab on course pages (optional, off by default).",
      footerTag: "TutorAI rebuild — demo clone for learning. Contact: hello@tutorai.me",
      perMonthBill: "/ Month",
    },
    ar: {
      dir: "rtl", langName: "عربي", otherLang: "EN",
      navCreate: "إنشاء دورة", navPricing: "الأسعار", navLibrary: "المكتبة", navContact: "تواصل", navSettings: "الإعدادات",
      signIn: "تسجيل الدخول", newCourse: "+ دورة جديدة", menu: "القائمة",
      heroA: "تدريس ذكي من المستوى التالي", heroB: "للمتعلمين مدى الحياة",
      heroSub: "أنشئ مسار تعلم مخصصاً يساعدك على تحقيق المزيد في الدراسة والعمل والحياة.",
      searchPh: "اكتب أي موضوع لإنشاء دورة مخصصة...",
      createCourseBtn: "✦ إنشاء دورة", popular: "دورات شائعة:",
      demoLink: "شرح Tutor AI في 109 ثوانٍ", demoToast: "الفيديو التعريفي عنصر تجريبي في هذه النسخة.",
      shotTitle: "📚 مدرّسك الذكي الخاص، على مدار الساعة", shotSub: "دورات مخصصة • اختبارات • بطاقات تعليمية • تتبع التقدم",
      stat1: "متعلم سعيد", stat2: "دورة مولّدة", stat3: "عاماً من الخبرة", stat4: "جامعة تستخدم Tutor AI",
      featTitle: "كل ما تحتاجه لتتعلم بذكاء", featSub: "أدوات ذكاء اصطناعي قوية تجعل التعلم أسهل وأسرع وأكثر فعالية",
      stepsTitle: "كيف يعمل Tutor AI", stepsSub: "ابدأ التعلم في دقائق بعملية بسيطة وقوية",
      audTitle: "مثالي لكل متعلم",
      faqTitle: "الأسئلة الشائعة",
      ctaTitle: "جاهز لبدء التعلم؟", ctaSub: "انضم إلى مئات الآلاف من المتعلمين الذين يحققون أهدافهم مع Tutor AI. ابدأ رحلتك اليوم!",
      ctaBtn1: "أنشئ دورتك الأولى", ctaBtn2: "عرض الأسعار",
      notFoundT: "عذراً، لم نعثر على هذه الصفحة.", notFoundS: "لكن لا تقلق، ستجد الكثير غيرها في صفحتنا الرئيسية.", backHome: "عودة للرئيسية",
      createTitle: "إنشاء دورة جديدة", topicPh: "اكتب موضوعاً لتوليد دورة فوراً...",
      useSources: "استخدام مصادرك الخاصة", useSourcesSub: "ارفع مستندات أو اخترها لبناء دورة من محتواك.",
      useStruct: "تحديد هيكل الدورة", useStructSub: "ولّد الهيكل وخصّصه قبل بناء الدورة.",
      createBtn: "✦ إنشاء الدورة", hwBtn: "مساعد الواجبات الذكي", sugTitle: "مواضيع مقترحة:",
      guestLine: "زائر — سجّل الدخول للتوليد", planLine: "الخطة",
      srcTitle: "مصادرك", fileHint: "ملفات PDF: يُحفظ الاسم فقط (الحد 4MB للمجانية / 10MB للمرشد / 20MB للعبقري). الملفات النصية تُقرأ محلياً وتوجّه التوليد.",
      structTitle: "دليل هيكل الدورة", structSub: "حدّد هيكل دورتك لتوليد محتوى أكثر صلة.",
      addModule: "+ إضافة وحدة", aiDraft: "✦ دَع الذكاء الاصطناعي يصوغه من موضوعي", aiDrafting: "جارٍ الصياغة...",
      structToast: "تمت صياغة الهيكل — عدّله بحرية قبل البناء.",
      hwTitle: "مساعد الواجبات الذكي", hwPh: "الصق أي سؤال واجب...", hwGo: "حل خطوة بخطوة",
      hwPrompt: "أنت مساعد الواجبات في TutorAI. حُل خطوة بخطوة مع شروحات واضحة ثم أعطِ الإجابة النهائية. أجب باللغة العربية. السؤال: ",
      needTopic: "يرجى إدخال موضوع صحيح للبحث.",
      banned: "المصطلح المبحوث عنه محظور ويخالف شروط الاستخدام.",
      noInfo: "المصطلح المبحوث عنه لا يحوي معلومات كافية لتوليد وحدات تعليمية. ",
      credit0: "لقد استنفدت رصيدك المجاني لتوليد الدورات. يرجى الترقية لخطة مدفوعة للمتابعة.",
      credit1: "لقد استنفدت رصيد توليد الدورات لهذا الشهر. يرجى الترقية لخطة أعلى للمتابعة.",
      credit2: "لقد استنفدت الحد الأقصى لرصيد التوليد لهذا الشهر. تواصل مع الدعم لنقيّم استخدامك ونقدم حلاً.",
      wentWrong: "حدث خطأ ما. يرجى المحاولة مجدداً.",
      s0t: "تفضيل التخصيص", s0s: "هل تريد تخصيص الدورة لك؟",
      freeBlocked: "تخصيص الدورات غير متاح للمستخدمين المجانيين.",
      explorePlans: "استكشف الخطط المدفوعة", here: "هنا",
      s1t: "الخطوة 1 — الخلفية", s1s: "التعليم والعمر والمواد والأهداف",
      s2t: "الخطوة 2 — كيف تتعلم", s2s: "التفضيلات والعمق",
      s3t: "الخطوة 3 — احتياجات الدعم", s3s: "إمكانية الوصول والتحديات",
      eduL: "المستوى التعليمي", ageL: "العمر", profL: "المواد المتقنة", goalsL: "أهداف التعلم",
      prefL: "تفضيلات التعلم", depthL: "عمق المحتوى", accL: "احتياجات إمكانية الوصول", chalL: "تحديات التعلم",
      specifyPh: "حدّد...", agePh: "", profPh: "مثال: رياضيات، كتابة",
      back: "رجوع", next: "التالي", createNow: "إنشاء الآن", cancel: "إلغاء",
      generating: "جارٍ التوليد... يرجى الانتظار.", designing: "جارٍ تصميم مخطط دورتك...",
      eEdu: "يرجى اختيار خلفيتك التعليمية.", eEduO: "يرجى تحديد خلفيتك التعليمية.",
      eAge: "يرجى إدخال عمر صحيح.", eAgeRange: "يرجى إدخال عمر صحيح بين 12 و 100.",
      eProf: "يرجى إدخال موادك المتقنة.", eGoals: "يرجى اختيار أهداف التعلم.", eGoalsO: "يرجى تحديد أهداف التعلم.",
      ePrefs: "يرجى اختيار تفضيلات التعلم.", ePrefsO: "يرجى تحديد تفضيلات التعلم.",
      eDepth: "يرجى اختيار عمق المحتوى.", eDepthO: "يرجى تحديد عمق المحتوى.",
      eAcc: "يرجى اختيار احتياجات إمكانية الوصول.", eAccO: "يرجى تحديد احتياجات إمكانية الوصول.",
      eChal: "يرجى اختيار تحديات التعلم.", eChalO: "يرجى تحديد تحديات التعلم.",
      tabLesson: "📖 الدرس", tabQuiz: "📝 اختبار", tabFlash: "🗂 بطاقات", tabChat: "💬 المدرّس الذكي",
      prev: "→ السابق", doneNext: "✓ إتمام ومتابعة",
      lessonOf: "درس مكتمل", writingLesson: "جارٍ كتابة درسك بالذكاء الاصطناعي...",
      lessonFail: "فشل توليد الدرس. يرجى إعادة المحاولة.", retry: "إعادة المحاولة",
      quizPrep: "جارٍ تجهيز اختبارك...", checkAns: "تحقق من الإجابات", score: "النتيجة: ",
      quizFail: "تعذر تحميل الاختبار. حاول مجدداً.",
      flashMake: "جارٍ صنع البطاقات...", flashTitle: "البطاقات التعليمية — انقر للقلب", flashFail: "تعذر تحميل البطاقات.",
      chatTitle: "اسأل مدرّسك الذكي", chatPh: "اسأل أي شيء عن هذا الدرس...", send: "إرسال", thinking: "يفكّر...",
      outlineFail: "تعثر بسيط في توليد المخطط — نعرض مخططاً مبدئياً.",
      libTitle: "مكتبتك", libSign: "سجّل الدخول لرؤية دوراتك.",
      libEmptyT: "لا دورات بعد", libEmptyS: "أنشئ أول دورة ذكية لك في ثوانٍ.", libCreate: "إنشاء دورة",
      open: "فتح", del: "حذف", delConfirm: "حذف هذه الدورة؟", lessons: "درساً",
      priceTitle: "خطط تناسب احتياجاتك", priceSub: "أنشئ مسار تعلم مخصصاً يساعدك على تحقيق المزيد في الدراسة والعمل والحياة.",
      billYearly: "الدفع السنوي", save30: "(وفّر حتى 30%)", perMonth: "/ شهرياً", billedYearly: "، يُدفع سنوياً",
      startFree: "ابدأ مجاناً", getStarted: "اشترك الآن", currentPlan: "خطتك الحالية",
      demoCheckoutNote: "دفع تجريبي — بلا مدفوعات حقيقية. الترقية تُحفظ محلياً.",
      coTitle: "الدفع (تجريبي)", coSub1: "الترقية إلى", coSub2: "لا حاجة لبطاقة في هذه النسخة.",
      confirmUpgrade: "تأكيد الترقية", nowOn: "أنت الآن على خطة", planDemo: "(تجريبي).",
      contactTitle: "تواصل معنا", contactSub: "يسعدنا سماعك — hello@tutorai.me",
      nameL: "الاسم", namePh: "اسمك", emailL: "البريد الإلكتروني", msgL: "رسالتك", msgPh: "اكتب رسالتك هنا...",
      submit: "إرسال", sending: "جارٍ الإرسال...", validEmail: "يرجى إدخال بريد صحيح",
      msgOk: "تم إرسال رسالتك بنجاح. سنرد عليك قريباً.",
      msgErr: "حدث خطأ ما. حاول لاحقاً أو راسلنا على hello@tutorai.me",
      profileTitle: "الملف الشخصي", profileSign: "سجّل الدخول أولاً.", coursesCreated: "الدورات المنشأة: ",
      openLib: "فتح المكتبة", changePlan: "تغيير الخطة", signOut: "تسجيل الخروج", savedPers: "التخصيص المحفوظ",
      siTitle: "أهلاً بك في Tutor AI", siSub: "سجّل الدخول برابط سحري أو Google. نسخة تجريبية: الدخول فوري بلا كلمة مرور.",
      siName: "الاسم (اختياري)", siNamePh: "اسمك", siEmailPh: "your@email.com",
      siContinue: "المتابعة بالبريد", siSending: "جارٍ إرسال الرابط السحري...", siGoogle: "Ⓖ الدخول عبر Google",
      siNote: "أرسلنا لك رابطاً سحرياً — في هذه النسخة يُقبل تلقائياً. زر Apple كان معطلاً في الأصل ويبقى معطلاً هنا.",
      close: "إغلاق",
      welcomeNew: "أهلاً بك! دخّلك الرابط السحري التجريبي.", welcomeBack: "عوداً حميداً!",
      googleNew: "تم الدخول عبر Google (تجريبي).",
      setTitle: "إعدادات مزود الذكاء الاصطناعي", setSub: "اختر خدمة الذكاء التي تولّد دوراتك. المفاتيح تُحفظ في هذا المتصفح فقط.",
      backendL: "الواجهة النشطة:", builtin: "ذكاء Perchance المدمج",
      useCustom: "استخدام مزود مخصص", useCustomSub: "توجيه كل التوليد (المخططات والدروس والاختبارات والمحادثة) عبر مفتاح API خاص بك.",
      presetL: "المزود الجاهز", baseL: "الرابط الأساسي (متوافق مع OpenAI)", keyL: "مفتاح API", modelL: "النموذج",
      tempL: "الحرارة (Temperature)", saveSet: "حفظ الإعدادات", testConn: "اختبار الاتصال", testing: "جارٍ الاختبار...",
      testOk: "الاتصال يعمل — ردّ المزود بشكل صحيح.",
      testFail: "فشل الاختبار. تحقق من الرابط والمفتاح والنموذج ثم حاول مجدداً.",
      testNeed: "أدخل الرابط الأساسي والمفتاح والنموذج أولاً.",
      keysNote: "مفتاحك لا يغادر هذا المتصفح إلا لمناداة المزود الذي ضبطته. وبدون مفتاح يُستخدم ذكاء Perchance المدمج.",
      ollamaNote: "يعمل Ollama على جهازك الخاص — افتح الصفحة في متصفح مكتبي على نفس الحاسوب. لا حاجة لمفتاح API؛ قد تحجب صفحات HTTPS العناوين المحلية غير المشفرة، فاستخدم http:// عندها.",
      setSaved: "تم حفظ إعدادات المزود.", customOn: "تم تفعيل المزود المخصص.",
      tabMind: "🧠 خريطة ذهنية", mindTitle: "الخريطة الذهنية للدورة", mindHint: "انقر أي عقدة للانتقال إلى درسها.",
      setExtras: "إضافات التعلم",
      mindEnable: "تفعيل الخرائط الذهنية", mindEnableSub: "عرض تبويب خريطة ذهنية تفاعلية في صفحات الدورات (اختياري، متوقف افتراضياً).",
      footerTag: "نسخة TutorAI التعليمية — للتجربة والتعلم. تواصل: hello@tutorai.me",
      perMonthBill: "/ شهرياً",
    },
  };

  const OPTS = {
    en: {
      educationLevel: ["High School", "Undergraduate", "Graduate", "Professional", "Other"],
      learningGoals: ["Exam prep", "Career growth", "Personal interest", "Research", "Skill mastery", "Other"],
      learningPreferences: ["Videos", "Reading", "Hands-on", "Examples", "Discussion", "Other"],
      contentDepth: ["Overview", "Balanced", "Deep dive", "Other"],
      accessibility: ["None", "Dyslexia-friendly", "Screen reader", "Captions", "Other"],
      challenges: ["Time management", "Focus", "Math", "Writing", "Memorization", "Other"],
    },
    ar: {
      educationLevel: ["ثانوية", "جامعي", "دراسات عليا", "مهني", "أخرى"],
      learningGoals: ["تحضير امتحانات", "تطور وظيفي", "اهتمام شخصي", "بحث علمي", "إتقان مهارة", "أخرى"],
      learningPreferences: ["فيديو", "قراءة", "تطبيق عملي", "أمثلة", "نقاش", "أخرى"],
      contentDepth: ["نظرة عامة", "متوازن", "تعمّق", "أخرى"],
      accessibility: ["لا يوجد", "مناسب لعسر القراءة", "قارئ شاشة", "ترجمة مصاحبة", "أخرى"],
      challenges: ["إدارة الوقت", "التركيز", "الرياضيات", "الكتابة", "الحفظ", "أخرى"],
    },
  };

  const I18N = {
    lang: "en",
    t(k) { const d = STR[this.lang] || STR.en; return d[k] !== undefined ? d[k] : (STR.en[k] !== undefined ? STR.en[k] : k); },
    opts(key) { return (OPTS[this.lang] || OPTS.en)[key] || OPTS.en[key]; },
    otherValue(enArr, arArr, val) {
      // map stored "Other" free-text across languages: free text is stored raw, option labels differ.
      return val;
    },
    async setLang(l) {
      if (l !== "en" && l !== "ar") l = "en";
      this.lang = l;
      try { localStorage.setItem("taiv1.lang", l); } catch (e) {}
      try { if (window.Store && Store.isLoggedIn()) await Store.saveProfile({ lang: l }); } catch (e) {}
      this.applyDir();
      this.applyStatic();
    },
    applyDir() {
      const d = this.lang === "ar" ? "rtl" : "ltr";
      document.documentElement.dir = d;
      document.documentElement.lang = this.lang;
    },
    applyStatic() {
      document.querySelectorAll("[data-i18n]").forEach((el) => {
        const v = this.t(el.dataset.i18n);
        if (typeof v === "string") {
          if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") el.placeholder = v;
          else el.textContent = v;
        }
      });
      document.querySelectorAll("[data-i18n-ph]").forEach((el) => { el.placeholder = this.t(el.dataset.i18nPh); });
    },
    async boot() {
      let l = null;
      try { l = localStorage.getItem("taiv1.lang"); } catch (e) {}
      if ((l !== "en" && l !== "ar") && window.Store && Store.user && Store.user.lang) l = Store.user.lang;
      if (l !== "en" && l !== "ar") {
        const nav = (navigator.language || "en").toLowerCase();
        l = nav.startsWith("ar") ? "ar" : "en";
      }
      this.lang = l;
      this.applyDir();
      this.applyStatic();
    },
  };

  window.I18N = I18N;
  window.t = (k) => I18N.t(k);
})();
