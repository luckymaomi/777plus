import type { AppData } from "../data";
import type { SearchResult } from "../types";
import { MENG_NOTES_ID } from "./experience";
import { normalizeText } from "./text";

function makeSnippet(text: string, query: string): string {
  const compact = text.replace(/\s+/g, " ").trim();
  const index = compact.toLocaleLowerCase("zh-CN").indexOf(query.toLocaleLowerCase("zh-CN"));
  if (index < 0) return compact.slice(0, 120);
  const start = Math.max(0, index - 42);
  const end = Math.min(compact.length, index + query.length + 72);
  return `${start > 0 ? "…" : ""}${compact.slice(start, end)}${end < compact.length ? "…" : ""}`;
}

export function searchAll(query: string, data: AppData): SearchResult[] {
  const term = query.trim();
  const normalized = normalizeText(term);
  if (!normalized) return [];

  const materialResults = data.materials.flatMap<SearchResult>((material) => {
    const titleHit = normalizeText(material.title).includes(normalized);
    const bodyHit = normalizeText(material.plainText).includes(normalized);
    if (!titleHit && !bodyHit) return [];
    return [{
      type: "material",
      id: material.id,
      module: "materials",
      title: material.title,
      meta: material.status ? `文献综述 · ${material.status}` : "文献综述",
      snippet: makeSnippet(material.plainText, term),
      score: titleHit ? 100 : 50,
      needle: bodyHit ? term : undefined,
    }];
  });

  const focusSource = `${data.examFocus.title}${data.examFocus.notice}`;
  const focusResults: SearchResult[] = normalizeText(focusSource).includes(normalized)
    ? [{
      type: "focus",
      id: "",
      module: "focus",
      title: data.examFocus.title,
      meta: "考试通告",
      snippet: makeSnippet(focusSource, term),
      score: 90,
    }]
    : [];

  const essentialSections = [
    {
      id: "knowledge",
      title: "核心知识",
      source: data.essentials.knowledge.map((item) => `${item.title}${item.summary}${item.bullets.join("")}`).join(""),
    },
    {
      id: "numbers",
      title: "数字速记",
      source: data.essentials.numbers.map((item) => `${item.value}${item.label}${item.asOf}`).join(""),
    },
    {
      id: "keywords",
      title: "关键词",
      source: data.essentials.keywordGroups.map((group) => `${group.label}${group.keywords.join("")}`).join(""),
    },
    {
      id: "framework",
      title: "五步答题骨架",
      source: data.essentials.answerSteps.map((step) => `${step.heading}${step.body}`).join(""),
    },
    {
      id: "phrases",
      title: "万能表述",
      source: data.essentials.phrases.map((phrase) => `${phrase.label}${phrase.text}`).join(""),
    },
  ];
  const essentialResults = essentialSections.flatMap<SearchResult>((section) => {
    const source = `${data.essentials.title}${section.title}${section.source}`;
    if (!normalizeText(source).includes(normalized)) return [];
    return [{
      type: "essential",
      id: section.id,
      module: "essentials",
      title: section.title,
      meta: data.essentials.title,
      snippet: makeSnippet(source, term),
      score: normalizeText(section.title).includes(normalized) ? 160 : 80,
    }];
  });

  const termResults = data.terms.flatMap<SearchResult>((definition) => {
    const source = `${definition.label}${definition.universal}${definition.summary}${definition.points.join("")}`;
    if (!normalizeText(source).includes(normalized)) return [];
    return [{
      type: "term",
      id: definition.id,
      module: "terms",
      title: definition.label,
      meta: "名词解释",
      snippet: makeSnippet(source, term),
      score: normalizeText(definition.label).includes(normalized) ? 140 : 70,
    }];
  });

  const templateResults = data.templates.flatMap<SearchResult>((template) => {
    const source = `${template.label}${template.title}${template.question}${template.universal}${template.structureAnchor}${template.opening}${template.sections.map((section) => `${section.anchor}${section.heading}${section.body.join("")}`).join("")}${template.closing}`;
    if (!normalizeText(source).includes(normalized)) return [];
    return [{
      type: "template",
      id: template.id,
      module: "templates",
      title: template.label,
      meta: "答题模板",
      snippet: makeSnippet(source, term),
      score: normalizeText(`${template.label}${template.title}`).includes(normalized) ? 130 : 60,
    }];
  });

  const fanExperienceSource = data.experienceNotes.sections.map((section) => (
    `${section.title}${section.entries.map((entry) => `${entry.heading}${entry.paragraphs.join("")}`).join("")}`
  )).join("");
  const jingExperienceSource = data.jingNotes.sections.map((section) => (
    `${section.title}${section.paragraphs.join("")}`
  )).join("");
  const experienceCollections = [
    { id: data.jingNotes.id, title: data.jingNotes.title, source: jingExperienceSource },
    { id: data.experienceNotes.id, title: data.experienceNotes.title, source: fanExperienceSource },
    { id: MENG_NOTES_ID, title: "孟哥笔记", source: "孟哥重点整理原图" },
  ];
  const experienceResults = experienceCollections.flatMap<SearchResult>(({ id, title, source }) => (
    normalizeText(`${title}${source}`).includes(normalized) ? [{
      type: "experience",
      id,
      module: "experience",
      title,
      meta: "大神经验",
      snippet: makeSnippet(source, term),
      score: normalizeText(title).includes(normalized) ? 120 : 65,
    }] : []
  ));

  return [...essentialResults, ...focusResults, ...termResults, ...templateResults, ...experienceResults, ...materialResults]
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title, "zh-CN"))
    .slice(0, 24);
}
