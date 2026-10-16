import {
  LessonDoc,
  Term,
  Outline,
  OutlineModule,
  LessonOutlineItem,
  ConceptGraph,
  ConceptGraphNode,
  ConceptGraphEdge,
} from "./harness";

export interface User {
  email: string;
  name: string;
  plan: number;
  createdAt: number;
  courseSearchMade?: boolean;
  lang?: string;
}

export type CourseOutline = Outline;
export type ModuleData = OutlineModule;
export type LessonItem = LessonOutlineItem;
export type { ConceptGraph, ConceptGraphNode, ConceptGraphEdge };

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
  masterSummary?: string;
  conceptGraph?: ConceptGraph;
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
