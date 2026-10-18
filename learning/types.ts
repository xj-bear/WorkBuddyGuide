export type Level = "L0" | "L1" | "L2" | "L3";
export type LessonKind = "concept" | "practice" | "challenge";
export type Publication = "planned" | "preview" | "published" | "archived";
export type ScenarioId = "office" | "data" | "files" | "knowledge" | "research" | "creation" | "automation" | "agents" | "life";

export interface SourceRef {
  path: string;
  heading: string;
  anchor: string;
  startLine: number;
  endLine: number;
  sha256: string;
}

export interface CheckItem {
  id: string;
  label: string;
}

export interface TutorialPrompt {
  title: string;
  text: string;
  destination: string;
  replacements: string[];
  preparation: string[];
}

export interface TeachingInstruction {
  location: string;
  actions: string[];
  expected: string;
  recovery: string;
}

export interface PracticeMaterial {
  path: string;
  description: string;
  url: string;
}

export interface GuidedStep {
  id: string;
  title: string;
  lead: string;
  html: string;
  bodyBlocks?: { kind: "html" | "mermaid"; value: string }[];
  sourcePath: string;
  sourceHeading: string;
  sourceUrl: string;
  sourceMediaIds: string[];
  confirmation: "none" | "read_ack" | "self_confirm" | "checklist";
  requiredForPractice: boolean;
  checklist: CheckItem[];
  kind?: 'reading' | 'action' | 'prompt' | 'verify';
  instruction?: TeachingInstruction;
  prompts?: TutorialPrompt[];
}

export interface Lesson {
  id: string;
  number: number;
  level: Level;
  title: string;
  originalTitle: string;
  kind: LessonKind;
  categoryIds: ScenarioId[];
  status: Publication;
  match: "A" | "B" | "C";
  summary: string;
  stepCountLabel?: string;
  sourceCaveat?: string;
  externalSources?: { title: string; url: string }[];
  sourceRefs: SourceRef[];
  steps: GuidedStep[];
  contentVersion: string;
  reviewedAt: string | null;
  imageCount: number;
  videoCount?: number;
  prerequisiteIds: string[];
  nextLessonIds: string[];
  track?: "course" | "bluebook" | "scenario" | "work-scenario";
  pain?: string;
  preparation?: string;
  goal?: string;
  outcome?: string;
  prerequisites?: string[];
  materials?: PracticeMaterial[];
  referenceSteps?: GuidedStep[];
}

export interface ScenarioWorkflow {
  goal: string;
  prepare: string[];
  steps: string[];
  deliverable: string[];
  verify: string[];
  sourceLessonIds: string[];
  sourceLinks?: { title: string; url: string }[];
}

export interface Scenario {
  id: ScenarioId;
  title: string;
  description: string;
  icon: string;
  workflow: ScenarioWorkflow;
}

export interface WorkScenarioCase {
  id: string;
  title: string;
  categoryIds: ScenarioId[];
  pain: string;
  preparation: string;
  outcome: string;
  relatedLessonIds: string[];
  relatedChapterPaths: string[];
  images: string[];
  url: string;
}

export interface SourceMedia {
  id: string;
  path: string;
  sha256: string;
  kind: "image" | "video";
  width: number | null;
  height: number | null;
  frames: number | null;
}

export interface LearningContent {
  bluebookLessons: Lesson[];
  bluebookReadings: { title: string; url: string }[];
  lessons: Lesson[];
  scenarioGuides: Lesson[];
  workScenarioCases: WorkScenarioCase[];
  workScenarioGuides: (Lesson & { caseId: string })[];
  scenarios: Scenario[];
  cases: { title: string; url: string }[];
  generatedAt: string;
}
