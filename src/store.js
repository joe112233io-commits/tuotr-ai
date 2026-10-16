/* TutorAI clone — Store: auth (local demo of Firebase flow), A/B group, kv persistence.
   Classic script: exposes window.Store. Uses root.kv + root.* pjs helpers. */
(function () {
  "use strict";
  const LS = { email: "taiv1.email_id", uuid: "taiv1.uuid", ab: "taiv1.ab_group", name: "taiv1.full_name" };

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  function ensureIdentity() {
    let id = localStorage.getItem(LS.uuid);
    let ab = localStorage.getItem(LS.ab);
    if (!id) {
      id = uuid();
      ab = Math.random() < 0.5 ? "A" : "B";
      try {
        localStorage.setItem(LS.uuid, id);
        localStorage.setItem(LS.ab, ab);
      } catch (e) {}
      // Mirror of /api/update-ab-group (local only)
      kvLog("ab-group", { cookieUuid: id, abGroup: ab });
    }
    return { id, ab: ab || "A" };
  }

  // Local stand-in for server event logging (GA4 events fire separately in app.js)
  function kvLog() {}

  async function kvSafe(fn, fallback) {
    try {
      return await fn();
    } catch (e) {
      console.warn("[kv] unavailable:", e && e.message);
      return fallback;
    }
  }

  const Store = {
    user: null, // {email, name, plan, createdAt}
    identity: ensureIdentity(),

    isLoggedIn() { return !!this.user; },
    plan() { return this.user ? this.user.plan || 0 : 0; },

    async boot() {
      this.identity = ensureIdentity();
      const email = localStorage.getItem(LS.email);
      if (email) {
        const u = await kvSafe(() => root.kv.tutorUsers.get(email), null);
        if (u) this.user = u;
        else {
          // localStorage session without kv record (fresh browser) — recreate lightly
          this.user = {
            email,
            name: localStorage.getItem(LS.name) || email.split("@")[0],
            plan: 0,
            createdAt: Date.now(),
          };
        }
      }
      return this.user;
    },

    // Demo equivalent of Google login + POST /api/update-db-user
    async signIn({ email, name }) {
      email = String(email || "").trim().toLowerCase();
      if (!email) throw new Error("email required");
      let u = await kvSafe(() => root.kv.tutorUsers.get(email), null);
      const isNew = !u;
      if (!u) {
        u = { email, name: name || email.split("@")[0], plan: 0, createdAt: Date.now(), courseSearchMade: false };
      } else if (name && !u.name) u.name = name;
      await kvSafe(() => root.kv.tutorUsers.set(email, u), null);
      try {
        localStorage.setItem(LS.email, email);
        localStorage.setItem(LS.name, u.name || "");
      } catch (e) {}
      this.user = u;
      // Fire GA-equivalent event hook
      window.dispatchEvent(new CustomEvent("tutorai-auth", { detail: { type: isNew ? "sign_up" : "login", email } }));
      return { user: u, isNewUser: isNew };
    },

    async signOut() {
      try {
        localStorage.removeItem(LS.email);
      } catch (e) {}
      this.user = null;
    },

    async setPlan(planId) {
      if (!this.user) throw new Error("not logged in");
      this.user.plan = planId;
      await kvSafe(() => root.kv.tutorUsers.set(this.user.email, this.user), null);
      return this.user;
    },

    async saveProfile(patch) {
      if (!this.user) return null;
      Object.assign(this.user, patch);
      await kvSafe(() => root.kv.tutorUsers.set(this.user.email, this.user), null);
      return this.user;
    },

    // ---- Library ----
    async mySlugs() {
      if (!this.user) return [];
      const lib = await kvSafe(() => root.kv.tutorLib.get(this.user.email), null);
      return Array.isArray(lib) ? lib : [];
    },
    async addToLibrary(slug) {
      if (!this.user) return;
      const lib = await this.mySlugs();
      if (!lib.includes(slug)) {
        lib.unshift(slug);
        await kvSafe(() => root.kv.tutorLib.set(this.user.email, lib.slice(0, 200)), null);
      }
      // mark courseSearchMade like /api/update-db-user does
      if (this.user && !this.user.courseSearchMade) {
        this.user.courseSearchMade = true;
        await kvSafe(() => root.kv.tutorUsers.set(this.user.email, this.user), null);
      }
    },
    async removeFromLibrary(slug) {
      if (!this.user) return;
      const lib = (await this.mySlugs()).filter((s) => s !== slug);
      await kvSafe(() => root.kv.tutorLib.set(this.user.email, lib), null);
      await kvSafe(() => root.kv.tutorCourses.delete(slug), null);
    },

    // ---- Courses ----
    async getCourse(slug) {
      return await kvSafe(() => root.kv.tutorCourses.get(slug), null);
    },
    async saveCourse(course) {
      await kvSafe(() => root.kv.tutorCourses.set(course.slug, course), null);
    },

    // ---- Progress ----
    progressKey(slug) { return this.user.email + "::" + slug; },
    async getProgress(slug) {
      if (!this.user) return { done: [], quiz: {} };
      const p = await kvSafe(() => root.kv.tutorProgress.get(this.progressKey(slug)), null);
      return p || { done: [], quiz: {} };
    },
    async saveProgress(slug, p) {
      if (!this.user) return;
      await kvSafe(() => root.kv.tutorProgress.set(this.progressKey(slug), p), null);
    },

    // ---- Personalization survey ----
    async getPersonalization() {
      if (!this.user) return null;
      return await kvSafe(() => root.kv.tutorPersonal.get(this.user.email), null);
    },
    async savePersonalization(data) {
      if (!this.user) return;
      await kvSafe(() => root.kv.tutorPersonal.set(this.user.email, data), null);
    },

    // ---- AI provider settings ----
    async getSettings() {
      if (!this.user) return null;
      return await kvSafe(() => root.kv.tutorSettings.get(this.user.email), null);
    },
    async saveSettings(s) {
      if (!this.user) return;
      await kvSafe(() => root.kv.tutorSettings.set(this.user.email, s), null);
    },

    // ---- Contacts ----
    async saveContact(msg) {
      const all = (await kvSafe(() => root.kv.tutorContacts.get("inbox"), null)) || [];
      all.push(msg);
      await kvSafe(() => root.kv.tutorContacts.set("inbox", all.slice(-200)), null);
    },
  };

  window.Store = Store;
})();
