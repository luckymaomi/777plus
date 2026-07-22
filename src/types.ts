export type ModuleId = "materials" | "keywords" | "directions" | "templates";

export interface MaterialCatalogItem {
  id: string;
  title: string;
  source: string;
  category: string;
  format: string;
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
  kind: "keyword" | "direction";
  mappings: TopicMapping[];
}

export interface ResolvedContext extends TopicMapping {
  material: Material;
  block: string;
  heading: string;
  targetBlock: string;
}

export interface AnswerField {
  id: string;
  label: string;
}

export interface AnswerTemplate {
  id: string;
  label: string;
  fields: AnswerField[];
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
