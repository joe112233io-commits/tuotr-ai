/* TutorAI clone — CourseAI: prompts routed through window.AIProvider (builtin or custom).
   Language-aware: pass lang "en"|"ar". Classic script, exposes window.CourseAI. */
(function () {
  "use strict";

  function sys(lang) {
    const base =
      "You are TutorAI, an expert curriculum designer and personal tutor. " +
      "You create structured, accurate, beginner-friendly courses with real depth. " +
      "Be concrete, avoid filler, use examples.";
    if (lang === "ar") return base + " Respond ENTIRELY in Arabic (Modern Standard Arabic). All headings, explanations, quizzes and flashcards must be in Arabic.";
    return base + " Respond in the same language the user writes the course topic in.";
  }

  function outlinePrompt(topic, personal, settings, lang) {
    const who = personal
      ? "Personalize for this learner: " + JSON.stringify(personal)
      : "General audience, no personalization.";
    const shape = settings
      ? "Course-plan hints from the user: " + JSON.stringify(settings)
      : "No course-plan hints.";
    return (
      sys(lang) +
      "\nTASK: design a course outline for the topic below. " +
      "Return ONLY valid JSON, no markdown fences, with this exact shape: " +
      '{"title":string,"summary":string,"outcomes":[string],"modules":[{"title":string,"lessons":[string]}]}. ' +
      "Use 3-6 modules and 2-5 lessons per module. Lesson titles must be specific, not generic. " +
      who +
      " " +
      shape +
      "\nTOPIC: " +
      topic
    );
  }

  function lessonPrompt(courseTitle, topic, modTitle, lessonTitle, personal, lang) {
    return (
      sys(lang) +
      "\nTASK: write ONE full lesson in HTML (use <h3>, <p>, <ul>/<ol>, <pre><code> where useful, <strong>). " +
      "Structure: 1) goal of this lesson, 2) clear explanation with 2-4 concrete examples, " +
      "3) common mistakes, 4) 3-question quick check (questions only, answers hidden in <details><summary>Answer</summary>). " +
      "When you present comparisons, feature lists with attributes, or multi-step data, use a real data table: " +
      "<table><thead><tr><th>..</th></tr></thead><tbody><tr><td>..</td></tr></tbody></table> with a header row — never fake tables with dashes or spaces. " +
      "Length: 400-700 words. No <html>/<body> wrapper. " +
      (personal ? "Learner context: " + JSON.stringify(personal) + ". " : "") +
      'Course: "' + courseTitle + '", topic: "' + topic + '", module: "' + modTitle + '", lesson: "' + lessonTitle + '".'
    );
  }

  function quizPrompt(courseTitle, modTitle, lessonTitle, lang) {
    return (
      sys(lang) +
      "\nTASK: write a 4-question multiple choice quiz in JSON ONLY (no markdown): " +
      '{"questions":[{"q":string,"choices":[string,string,string,string],"answer":0-3,"why":string}]}. ' +
      'Course: "' + courseTitle + '", module: "' + modTitle + '", lesson: "' + lessonTitle + '".'
    );
  }

  function flashcardsPrompt(courseTitle, topic, lang) {
    return (
      sys(lang) +
      "\nTASK: write 10 flashcards for spaced repetition in JSON ONLY: " +
      '{"cards":[{"front":string,"back":string}]}. ' +
      'Course: "' + courseTitle + '", topic: "' + topic + '". Keep fronts short, backs 1-3 sentences.'
    );
  }

  function chatInstruction(courseTitle, topic, lessonTitle, history, question, lang) {
    const h = (history || [])
      .slice(-8)
      .map((m) => (m.role === "user" ? "Student: " + m.text : "Tutor: " + m.text))
      .join("\n");
    return (
      sys(lang) +
      "\nTASK: act as the personal tutor for this course. Answer clearly with examples, then suggest one follow-up exercise. " +
      'Course: "' + courseTitle + '", topic: "' + topic + '", current lesson: "' + lessonTitle + '".\nConversation so far:\n' +
      h + "\nStudent: " + question + "\nTutor:"
    );
  }

  function cleanJson(text) {
    let t = String(text || "").trim();
    t = t.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    const a = t.indexOf("{");
    const b = t.lastIndexOf("}");
    if (a >= 0 && b > a) t = t.slice(a, b + 1);
    return t;
  }

  function lang() { return (window.I18N && I18N.lang) || "en"; }

  const CourseAI = {
    async generateOutline(topic, personal, settings, onStatus) {
      if (onStatus) onStatus(window.t ? t("designing") : "Designing…");
      const raw = await AIProvider.generate({ instruction: outlinePrompt(topic, personal, settings, lang()) });
      const text = typeof raw === "string" ? raw : raw && raw.text ? raw.text : String(raw);
      try {
        const o = JSON.parse(cleanJson(text));
        if (!o.modules || !o.modules.length) throw new Error("empty");
        o.modules = o.modules.slice(0, 6).map((m, i) => ({
          title: String(m.title || "Module " + (i + 1)),
          lessons: (Array.isArray(m.lessons) ? m.lessons : []).slice(0, 5).map((l) => String(l)),
        }));
        return o;
      } catch (e) {
        const ar = lang() === "ar";
        const tpc = topic.trim();
        return {
          title: tpc,
          summary: ar ? "دورة مخصصة عن " + tpc + "، تُولّد فوراً." : "A personalized course on " + tpc + ", generated instantly.",
          outcomes: ar
            ? ["فهم أساسيات " + tpc, "تطبيق مهارات " + tpc + " الأساسية عملياً", "تجنب أخطاء المبتدئين الشائعة"]
            : ["Understand the fundamentals of " + tpc, "Apply core " + tpc + " skills in practice", "Avoid common beginner mistakes"],
          modules: ar
            ? [
                { title: "البداية", lessons: ["ما هو " + tpc + "؟", "المصطلحات والصورة الكبرى"] },
                { title: "المهارات الأساسية", lessons: ["الأساسيات خطوة بخطوة", "تدريب عملي موجّه"] },
                { title: "التعمق", lessons: ["أخطاء شائعة وإصلاحها", "خطتك للأيام السبعة القادمة"] },
              ]
            : [
                { title: "Getting Started", lessons: ["What is " + tpc + "?", "Key terms and big picture"] },
                { title: "Core Skills", lessons: ["Step-by-step fundamentals", "Guided practice session"] },
                { title: "Going Further", lessons: ["Common mistakes and fixes", "Your next 7-day plan"] },
              ],
        };
      }
    },

    generateLessonStream(courseTitle, topic, modTitle, lessonTitle, personal, onChunk) {
      return AIProvider.generate({
        instruction: lessonPrompt(courseTitle, topic, modTitle, lessonTitle, personal, lang()),
        onChunk: (d) => {
          const chunk = typeof d === "string" ? d : d.textChunk || "";
          if (onChunk) onChunk(chunk);
        },
      });
    },

    async generateQuiz(courseTitle, modTitle, lessonTitle) {
      const ar = lang() === "ar";
      const raw = await AIProvider.generate({ instruction: quizPrompt(courseTitle, modTitle, lessonTitle, lang()) });
      const text = typeof raw === "string" ? raw : raw && raw.text ? raw.text : String(raw);
      try {
        const o = JSON.parse(cleanJson(text));
        if (o.questions && o.questions.length) return o.questions.slice(0, 4);
      } catch (e) {}
      return [
        ar
          ? { q: "ما الفكرة الأهم في هذا الدرس؟", choices: ["المفهوم الأساسي المشروح أعلاه", "تفصيل غير مرتبط", "حفظ المصطلحات", "تخطي التدريب"], answer: 0, why: "ركّز على المفهوم الأساسي أولاً." }
          : { q: "What is the single most important idea in this lesson?", choices: ["The core concept explained above", "An unrelated detail", "Memorizing jargon", "Skipping practice"], answer: 0, why: "Focus on the core concept first." },
      ];
    },

    async generateFlashcards(courseTitle, topic) {
      const raw = await AIProvider.generate({ instruction: flashcardsPrompt(courseTitle, topic, lang()) });
      const text = typeof raw === "string" ? raw : raw && raw.text ? raw.text : String(raw);
      try {
        const o = JSON.parse(cleanJson(text));
        if (o.cards && o.cards.length) return o.cards.slice(0, 12);
      } catch (e) {}
      return [];
    },

    chat(courseTitle, topic, lessonTitle, history, question, onChunk) {
      return AIProvider.generate({
        instruction: chatInstruction(courseTitle, topic, lessonTitle, history, question, lang()),
        stopSequences: ["\nStudent:"],
        onChunk: (d) => {
          const chunk = typeof d === "string" ? d : d.textChunk || "";
          if (onChunk) onChunk(chunk);
        },
      });
    },

    homework(question, onChunk) {
      const q = (window.t ? t("hwPrompt") : "Solve: ") + question;
      return AIProvider.generate({
        instruction: q,
        onChunk: (d) => {
          const chunk = typeof d === "string" ? d : d.textChunk || "";
          if (onChunk) onChunk(chunk);
        },
      });
    },
  };

  window.CourseAI = CourseAI;
})();
