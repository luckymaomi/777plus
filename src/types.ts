export type ModuleId = "essentials" | "focus" | "materials" | "terms" | "templates" | "experience";

export interface MaterialCatalogItem {
  id: string;
  title: string;
  source: string;
  category: string;
  format: string;
  status?: "旧材料";
  path: string;
  sha256: string;
  characters: number;
  lines: number;
}

export interface Material extends MaterialCatalogItem {
  markdown: string;
  body: string;
  plainText: string;
}

export interface OfficialEvidence {
  id: string;
  materialId: string;
  sourceLabel?: string;
  heading: string;
  quote: string;
}

export interface ExamFocusData {
  title: string;
  notice: string;
  evidence: OfficialEvidence[];
}

export interface TermFact {
  value: string;
  label: string;
  asOf: string;
}

export interface TermDefinition {
  id: string;
  label: string;
  universal: string;
  summary: string;
  points: string[];
  evidenceIds: string[];
  facts?: TermFact[];
}

export interface AnswerSection {
  anchor: string;
  heading: string;
  body: string[];
  evidenceIds: string[];
}

export interface AnswerTemplate {
  id: string;
  label: string;
  title: string;
  question: string;
  universal: string;
  structureAnchor: string;
  opening: string;
  sections: AnswerSection[];
  closing: string;
}

export interface EssentialKnowledge {
  id: string;
  title: string;
  summary: string;
  bullets: string[];
  evidenceIds: string[];
}

export interface EssentialNumber {
  value: string;
  label: string;
  asOf: string;
}

export interface EssentialKeywordGroup {
  label: string;
  keywords: string[];
}

export interface EssentialAnswerStep {
  heading: string;
  body: string;
}

export interface EssentialPhrase {
  label: string;
  text: string;
}

export interface EssentialsData {
  title: string;
  knowledge: EssentialKnowledge[];
  numbers: EssentialNumber[];
  keywordGroups: EssentialKeywordGroup[];
  answerSteps: EssentialAnswerStep[];
  phrases: EssentialPhrase[];
}

export type ExperienceNoteStatus = "current" | "outdated" | "legacy";

export interface ExperienceNoteEntry {
  heading: string;
  status: ExperienceNoteStatus;
  paragraphs: string[];
}

export interface ExperienceNoteSection {
  id: string;
  title: string;
  entries: ExperienceNoteEntry[];
}

export interface ExperienceNotesData {
  id: string;
  title: string;
  source: string;
  asOf: string;
  sha256: string;
  sections: ExperienceNoteSection[];
}

export interface CuratedExperienceSection {
  id: string;
  title: string;
  paragraphs: string[];
}

export interface CuratedExperienceNotesData {
  id: string;
  title: string;
  source: string;
  asOf: string;
  sha256: string;
  sections: CuratedExperienceSection[];
}

export interface Route {
  module: ModuleId;
  itemId?: string;
  needle?: string;
}

export interface SearchResult {
  type: "material" | "essential" | "focus" | "term" | "template" | "experience";
  id: string;
  module: ModuleId;
  title: string;
  meta: string;
  snippet: string;
  score: number;
  needle?: string;
}
