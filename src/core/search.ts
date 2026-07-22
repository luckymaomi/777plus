import type { Material, SearchResult, TermDefinition, Topic } from "../types";
import { normalizeText } from "./text";

function makeSnippet(text: string, query: string): string {
  const compact = text.replace(/\s+/g, " ").trim();
  const index = compact.toLocaleLowerCase("zh-CN").indexOf(query.toLocaleLowerCase("zh-CN"));
  if (index < 0) return compact.slice(0, 120);
  const start = Math.max(0, index - 42);
  const end = Math.min(compact.length, index + query.length + 72);
  return `${start > 0 ? "…" : ""}${compact.slice(start, end)}${end < compact.length ? "…" : ""}`;
}

export function searchAll(query: string, materials: Material[], topics: Topic[], terms: TermDefinition[]): SearchResult[] {
  const term = query.trim();
  const normalized = normalizeText(term);
  if (!normalized) return [];

  const materialResults = materials.flatMap<SearchResult>((material) => {
    const titleHit = normalizeText(material.title).includes(normalized);
    const bodyHit = normalizeText(material.plainText).includes(normalized);
    if (!titleHit && !bodyHit) return [];
    return [{
      type: "material",
      id: material.id,
      module: "materials",
      title: material.title,
      meta: material.status ? `${material.category} · ${material.status}` : material.category,
      snippet: makeSnippet(material.plainText, term),
      score: titleHit ? 100 : 50,
      needle: bodyHit ? term : undefined,
    }];
  });

  const topicResults = topics.flatMap<SearchResult>((topic) => {
    if (!normalizeText(topic.label).includes(normalized)) return [];
    return [{
      type: "topic",
      id: topic.id,
      module: "keywords",
      title: topic.label,
      meta: "关键词",
      snippet: `${topic.mappings.length} 处已整理原文`,
      score: 120,
    }];
  });

  const termResults = terms.flatMap<SearchResult>((definition) => {
    const text = `${definition.label}${definition.summary}${definition.sections.map((section) => `${section.heading}${section.key}${section.body}`).join("")}${definition.closing}`;
    if (!normalizeText(text).includes(normalized)) return [];
    return [{
      type: "term",
      id: definition.id,
      module: "terms",
      title: definition.label,
      meta: "名词解释",
      snippet: makeSnippet(text, term),
      score: normalizeText(definition.label).includes(normalized) ? 140 : 70,
    }];
  });

  return [...termResults, ...topicResults, ...materialResults]
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title, "zh-CN"))
    .slice(0, 24);
}
