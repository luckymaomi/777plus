export type ModuleId = "materials" | "keywords" | "templates";

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

export interface TopicMapping {
  materialId: string;
  needle: string;
}

export interface Topic {
  id: string;
  label: string;
  kind: "keyword";
  mappings: TopicMapping[];
}

export interface ResolvedContext extends TopicMapping {
  material: Material;
  block: string;
  heading: string;
  targetBlock: string;
}

export interface AnswerCitation extends TopicMapping {
  quote: string;
}

export interface AnswerSection {
  heading: string;
  paragraphs: string[];
  citations: AnswerCitation[];
}

export interface AnswerMemory {
  sequence: string[];
  tip: string;
}

export interface AnswerExample {
  id: string;
  label: string;
  question: string;
  memory: AnswerMemory;
  opening: string;
  sections: AnswerSection[];
  closing: string;
}

export interface Route {
  module: ModuleId;
  itemId?: string;
  needle?: string;
}

export interface SearchResult {
  type: "material" | "topic";
  id: string;
  module: ModuleId;
  title: string;
  meta: string;
  snippet: string;
  score: number;
  needle?: string;
}
