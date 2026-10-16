import { LessonDoc, Term } from "./harness";

export interface User {
  email: string;
  name: string;
  plan: number;
  createdAt: number;
  courseSearchMade?: boolean;
  lang?: string;
}

export interface ModuleData {
  title: string;
  lessons: string[];
}

export interface CourseOutline {
  title: string;
  summary: string;
  outcomes: string[];
  modules: ModuleData[];
}

export interface Course {
  slug: string;
  topic: string;
  title: string;
  createdAt: number;
  owner: string;
  personal: boolean;
  settings: any;
  outline: CourseOutline | null;
  lessons: Record<string, string>;
  lessonDocs?: Record<string, LessonDoc>;
  glossary?: Term[];
  brainCovered?: { title: string; digest: string }[];
  brainUsedTerms?: string[];
  lang: string;
}

export interface PersonalizationData {
  educationLevel: string;
  educationLevelOther: string;
  age: string;
  proficientSubjects: string;
  learningGoals: string[];
  learningGoalsOther: string;
  learningPreferences: string[];
  learningPreferencesOther: string;
  contentDepth: string;
  contentDepthOther: string;
  accessibility: string[];
  accessibilityOther: string;
  challenges: string[];
  challengesOther: string;
}

export interface AISettings {
  enabled: boolean;
  preset: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  mindmap: boolean;
}
