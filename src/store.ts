import { User, Course, PersonalizationData, AISettings } from "./types";

const LS = {
  email: "taiv1.email_id",
  uuid: "taiv1.uuid",
  ab: "taiv1.ab_group",
  name: "taiv1.full_name",
  lang: "taiv1.lang",
  aiSettings: "taiv1.ai-settings",
};

function uuid(): string {
  if (typeof window !== "undefined" && window.crypto && crypto.randomUUID) return crypto.randomUUID();
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
  }
  return { id, ab: ab || "A" };
}

function kvSafeGet<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch (e) {
    return fallback;
  }
}

function kvSafeSet(key: string, val: any) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {}
}

export const Store = {
  user: null as User | null,
  identity: ensureIdentity(),

  isLoggedIn() {
    return !!this.user;
  },

  plan() {
    return this.user ? this.user.plan || 0 : 0;
  },

  async boot(): Promise<User | null> {
    this.identity = ensureIdentity();
    const email = localStorage.getItem(LS.email);
    if (email) {
      const u = kvSafeGet<User | null>(`taiv1.user::${email}`, null);
      if (u) {
        this.user = u;
      } else {
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

  async signIn({ email, name }: { email: string; name?: string }): Promise<{ user: User; isNewUser: boolean }> {
    email = String(email || "").trim().toLowerCase();
    if (!email) throw new Error("email required");
    let u = kvSafeGet<User | null>(`taiv1.user::${email}`, null);
    const isNew = !u;
    if (!u) {
      u = { email, name: name || email.split("@")[0], plan: 0, createdAt: Date.now(), courseSearchMade: false };
    } else if (name && !u.name) {
      u.name = name;
    }
    kvSafeSet(`taiv1.user::${email}`, u);
    try {
      localStorage.setItem(LS.email, email);
      localStorage.setItem(LS.name, u.name || "");
    } catch (e) {}
    this.user = u;
    window.dispatchEvent(new CustomEvent("tutorai-auth", { detail: { type: isNew ? "sign_up" : "login", email } }));
    return { user: u, isNewUser: isNew };
  },

  async signOut() {
    try {
      localStorage.removeItem(LS.email);
    } catch (e) {}
    this.user = null;
  },

  async setPlan(planId: number): Promise<User> {
    if (!this.user) throw new Error("not logged in");
    this.user.plan = planId;
    kvSafeSet(`taiv1.user::${this.user.email}`, this.user);
    return this.user;
  },

  async saveProfile(patch: Partial<User>): Promise<User | null> {
    if (!this.user) return null;
    Object.assign(this.user, patch);
    kvSafeSet(`taiv1.user::${this.user.email}`, this.user);
    return this.user;
  },

  async mySlugs(): Promise<string[]> {
    if (!this.user) return [];
    return kvSafeGet<string[]>(`taiv1.lib::${this.user.email}`, []);
  },

  async addToLibrary(slug: string) {
    if (!this.user) return;
    const lib = await this.mySlugs();
    if (!lib.includes(slug)) {
      lib.unshift(slug);
      kvSafeSet(`taiv1.lib::${this.user.email}`, lib.slice(0, 200));
    }
    if (this.user && !this.user.courseSearchMade) {
      this.user.courseSearchMade = true;
      kvSafeSet(`taiv1.user::${this.user.email}`, this.user);
    }
  },

  async removeFromLibrary(slug: string) {
    if (!this.user) return;
    const lib = (await this.mySlugs()).filter((s) => s !== slug);
    kvSafeSet(`taiv1.lib::${this.user.email}`, lib);
    try {
      localStorage.removeItem(`taiv1.course::${slug}`);
    } catch (e) {}
  },

  async getCourse(slug: string): Promise<Course | null> {
    return kvSafeGet<Course | null>(`taiv1.course::${slug}`, null);
  },

  async saveCourse(course: Course) {
    kvSafeSet(`taiv1.course::${course.slug}`, course);
  },

  progressKey(slug: string) {
    return (this.user ? this.user.email : "guest") + "::" + slug;
  },

  async getProgress(slug: string): Promise<{ done: string[]; quiz: any }> {
    if (!this.user) return { done: [], quiz: {} };
    return kvSafeGet<{ done: string[]; quiz: any }>(`taiv1.prog::${this.progressKey(slug)}`, { done: [], quiz: {} });
  },

  async saveProgress(slug: string, p: { done: string[]; quiz: any }) {
    if (!this.user) return;
    kvSafeSet(`taiv1.prog::${this.progressKey(slug)}`, p);
  },

  async getPersonalization(): Promise<PersonalizationData | null> {
    if (!this.user) return null;
    return kvSafeGet<PersonalizationData | null>(`taiv1.pers::${this.user.email}`, null);
  },

  async savePersonalization(data: PersonalizationData) {
    if (!this.user) return;
    kvSafeSet(`taiv1.pers::${this.user.email}`, data);
  },

  async getSettings(): Promise<AISettings | null> {
    if (!this.user) return null;
    return kvSafeGet<AISettings | null>(`taiv1.settings::${this.user.email}`, null);
  },

  async saveSettings(s: AISettings) {
    if (!this.user) return;
    kvSafeSet(`taiv1.settings::${this.user.email}`, s);
  },

  async saveContact(msg: any) {
    const all = kvSafeGet<any[]>(`taiv1.contacts::inbox`, []);
    all.push(msg);
    kvSafeSet(`taiv1.contacts::inbox`, all.slice(-200));
  },
};
