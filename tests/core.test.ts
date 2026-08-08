import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { AppData } from "../src/data";
import { serializeEmbeddedAppData } from "../src/data";
import { MENG_NOTES_ID, resolveExperienceId } from "../src/core/experience";
import { parseRoute, routeHref } from "../src/core/routes";
import { searchAll } from "../src/core/search";
import { stripFrontmatter, stripMarkdown } from "../src/core/text";
import { resolveTheme, THEME_STORAGE_KEY } from "../src/core/theme";
import type {
  AnswerTemplate,
  CuratedExperienceNotesData,
  EssentialsData,
  ExamFocusData,
  ExperienceNotesData,
  Material,
  MaterialCatalogItem,
  TermDefinition,
} from "../src/types";
import { renderEssentialsNavigation, renderEssentialsView } from "../src/views/essentials";
import { renderExperienceNavigation, renderExperienceView } from "../src/views/experience";
import { renderFocusView } from "../src/views/focus";
import { renderMaterialsNavigation } from "../src/views/materials";
import { buildAnswerText, renderTemplatesNavigation, renderTemplatesView } from "../src/views/templates";
import { renderTermsNavigation, renderTermsView } from "../src/views/terms";

const root = resolve(import.meta.dirname, "..");
const content = resolve(root, "content");
const indexHtml = readFileSync(resolve(root, "index.html"), "utf8");
const catalog = JSON.parse(readFileSync(resolve(content, "catalog.json"), "utf8")) as MaterialCatalogItem[];
const essentials = JSON.parse(readFileSync(resolve(content, "essentials.json"), "utf8")) as EssentialsData;
const examFocus = JSON.parse(readFileSync(resolve(content, "exam-focus.json"), "utf8")) as ExamFocusData;
const terms = JSON.parse(readFileSync(resolve(content, "terms.json"), "utf8")) as TermDefinition[];
const templates = JSON.parse(readFileSync(resolve(content, "templates.json"), "utf8")) as AnswerTemplate[];
const experienceNotes = JSON.parse(readFileSync(resolve(content, "experience-notes.json"), "utf8")) as ExperienceNotesData;
const jingNotes = JSON.parse(readFileSync(resolve(content, "jing-notes.json"), "utf8")) as CuratedExperienceNotesData;
const materials: Material[] = catalog.map((item) => {
  const markdown = readFileSync(resolve(content, item.path), "utf8");
  const body = stripFrontmatter(markdown);
  return { ...item, markdown, body, plainText: stripMarkdown(body) };
});
const data: AppData = {
  materials,
  essentials,
  examFocus,
  terms,
  templates,
  experienceNotes,
  jingNotes,
  experienceImage: "data:image/jpeg;base64,bWVuZw==",
};

function expectUniqueNonEmptyIds(items: Array<{ id: string }>): void {
  expect(items.length).toBeGreaterThan(0);
  expect(items.every((item) => item.id.trim().length > 0)).toBe(true);
  expect(new Set(items.map((item) => item.id)).size).toBe(items.length);
}

describe("数据结构", () => {
  it("材料目录中的文件均可读取", () => {
    expectUniqueNonEmptyIds(catalog);
    expect(materials).toHaveLength(catalog.length);
    catalog.forEach((item) => expect(existsSync(resolve(content, item.path))).toBe(true));
    expect(materials.every((material) => material.body.trim().length > 0)).toBe(true);
  });

  it("结构化复习数据具备渲染所需字段", () => {
    expect(examFocus.notice.trim().length).toBeGreaterThan(0);
    expectUniqueNonEmptyIds(examFocus.evidence);
    expectUniqueNonEmptyIds(terms);
    expectUniqueNonEmptyIds(templates);
    expectUniqueNonEmptyIds(experienceNotes.sections);
    expectUniqueNonEmptyIds(jingNotes.sections);
    expect(essentials.knowledge.length).toBeGreaterThan(0);
    expect(essentials.numbers.length).toBeGreaterThan(0);
    expect(essentials.keywordGroups.length).toBeGreaterThan(0);
    expect(essentials.answerSteps.length).toBeGreaterThan(0);
    expect(essentials.phrases.length).toBeGreaterThan(0);
    expect(experienceNotes.sections.every((section) => section.entries.length > 0)).toBe(true);
    expect(jingNotes.sections.every((section) => section.paragraphs.length > 0)).toBe(true);
  });

  it("名词、模板和冲刺资料引用的证据ID均存在", () => {
    const evidenceIds = new Set(examFocus.evidence.map((item) => item.id));
    const references = [
      ...essentials.knowledge.flatMap((item) => item.evidenceIds),
      ...terms.flatMap((term) => term.evidenceIds),
      ...templates.flatMap((template) => template.sections.flatMap((section) => section.evidenceIds)),
    ];
    expect(references.every((id) => evidenceIds.has(id))).toBe(true);
  });
});

describe("页面结构", () => {
  it("考试通告只渲染当前通告数据", () => {
    const html = renderFocusView(examFocus);
    expect(html).toContain(examFocus.notice);
    expect(html).toContain('class="document-page');
    expect(html).not.toContain('class="evidence-item');
    expect(html).not.toContain("#/materials/");
  });

  it("文献目录只标记当前选中材料", () => {
    const selected = materials[0] as Material;
    const options = { materials, selected, query: "" };
    const navigation = renderMaterialsNavigation(options);
    expect(navigation).toContain(`#/materials/${encodeURIComponent(selected.id)}`);
    expect(navigation.match(/is-active/g)).toHaveLength(1);
  });

  it("冲刺、名词和模板页面均可由结构化数据渲染", () => {
    const term = terms[0] as TermDefinition;
    const template = templates[0] as AnswerTemplate;
    const essentialsHtml = renderEssentialsView(essentials);
    const termHtml = renderTermsView(term, examFocus, materials);
    const templateHtml = renderTemplatesView(template, examFocus, materials);

    expect(essentialsHtml).toContain(essentials.title);
    expect(renderEssentialsNavigation()).toContain('class="collection-list"');
    expect(termHtml).toContain(term.label);
    expect(renderTermsNavigation(terms, term)).toContain(`#/terms/${encodeURIComponent(term.id)}`);
    expect(templateHtml).toContain(template.title);
    expect(renderTemplatesNavigation(templates, template)).toContain(`#/templates/${encodeURIComponent(template.id)}`);
    expect(buildAnswerText(template, examFocus, materials).length).toBeGreaterThan(0);
  });

  it("静姐、帆姐和孟哥只渲染各自正文", () => {
    const imagePath = resolve(content, "assets/meng-key-points.jpg");
    expect(existsSync(imagePath)).toBe(true);

    const jingHtml = renderExperienceView(data.experienceImage, experienceNotes, jingNotes, jingNotes.id);
    expect(jingHtml).toContain('class="jing-notes"');
    expect(jingHtml).not.toContain('class="fan-notes"');
    expect(jingHtml).not.toContain('class="meng-notes"');
    expect(jingHtml).not.toContain(data.experienceImage);

    const fanHtml = renderExperienceView(data.experienceImage, experienceNotes, jingNotes, experienceNotes.id);
    expect(fanHtml).toContain('class="fan-notes"');
    expect(fanHtml).not.toContain('class="jing-notes"');
    expect(fanHtml).not.toContain('class="meng-notes"');
    expect(fanHtml).not.toContain(data.experienceImage);

    const mengHtml = renderExperienceView(data.experienceImage, experienceNotes, jingNotes, MENG_NOTES_ID);
    expect(mengHtml).toContain('class="meng-notes"');
    expect(mengHtml).not.toContain('class="jing-notes"');
    expect(mengHtml).not.toContain('class="fan-notes"');
    expect(mengHtml).toContain(data.experienceImage);
  });

  it("大神经验目录只有一个激活项并链接到三个独立页面", () => {
    const ids = [jingNotes.id, experienceNotes.id, MENG_NOTES_ID];
    ids.forEach((selectedId) => {
      const navigation = renderExperienceNavigation(experienceNotes, jingNotes, selectedId);
      expect(navigation.match(/collection-item is-active/g)).toHaveLength(1);
      ids.forEach((id) => expect(navigation).toContain(`#/experience/${encodeURIComponent(id)}`));
    });
  });
});

describe("路由与搜索", () => {
  it("路由可往返并为未知模块提供默认页", () => {
    const routes = [
      { module: "materials" as const, itemId: materials[0]?.id },
      { module: "terms" as const, itemId: terms[0]?.id },
      { module: "templates" as const, itemId: templates[0]?.id },
      { module: "experience" as const, itemId: jingNotes.id },
      { module: "experience" as const, itemId: experienceNotes.id },
      { module: "experience" as const, itemId: MENG_NOTES_ID },
    ];
    routes.forEach((route) => expect(parseRoute(routeHref(route))).toEqual({ ...route, needle: undefined }));
    expect(parseRoute("#/not-a-module").module).toBe("focus");
  });

  it("大神经验未知条目回落到默认笔记", () => {
    expect(resolveExperienceId(undefined, jingNotes.id, experienceNotes.id)).toBe(jingNotes.id);
    expect(resolveExperienceId("unknown", jingNotes.id, experienceNotes.id)).toBe(jingNotes.id);
    expect(resolveExperienceId(experienceNotes.id, jingNotes.id, experienceNotes.id)).toBe(experienceNotes.id);
    expect(resolveExperienceId(MENG_NOTES_ID, jingNotes.id, experienceNotes.id)).toBe(MENG_NOTES_ID);
  });

  it("搜索结果保留目标模块和条目ID", () => {
    const cases = [
      { query: materials[0]?.title, module: "materials", id: materials[0]?.id },
      { query: terms[0]?.label, module: "terms", id: terms[0]?.id },
      { query: templates[0]?.label, module: "templates", id: templates[0]?.id },
      { query: jingNotes.title, module: "experience", id: jingNotes.id },
      { query: experienceNotes.title, module: "experience", id: experienceNotes.id },
    ];
    cases.forEach(({ query, module, id }) => {
      expect(query).toBeTruthy();
      expect(searchAll(query as string, data)).toEqual(expect.arrayContaining([
        expect.objectContaining({ module, id }),
      ]));
    });
  });
});

describe("界面约束与离线版", () => {
  it("主导航链接结构完整且没有重复模块", () => {
    const moduleLinks = [...indexHtml.matchAll(/data-module-link="([^"]+)"/g)].map((match) => match[1]);
    expect(moduleLinks.length).toBeGreaterThan(0);
    expect(new Set(moduleLinks).size).toBe(moduleLinks.length);
    moduleLinks.forEach((module) => expect(indexHtml).toContain(`href="#/${module}"`));
  });

  it("项目自有样式不存在单边框或伪元素侧边条", () => {
    const css = readdirSync(resolve(root, "src/styles"))
      .filter((name) => name.endsWith(".css"))
      .map((name) => readFileSync(resolve(root, "src/styles", name), "utf8"))
      .join("\n");
    expect(css).not.toMatch(/border-(?:left|right|top|bottom)\s*:/i);
    expect(css).not.toMatch(/::(?:before|after)/i);
  });

  it("主题状态可解析且页面具备主题切换入口", () => {
    expect(indexHtml).toContain('id="themeToggle"');
    expect(indexHtml).toContain(THEME_STORAGE_KEY);
    expect(resolveTheme("dark")).toBe("dark");
    expect(resolveTheme("light")).toBe("light");
    expect(resolveTheme(null)).toBe("light");
  });

  it("应用外壳不包含外部链接", () => {
    expect(indexHtml).not.toMatch(/<a[^>]+href="https?:\/\//i);
  });

  it("离线下载入口保持纯图标结构", () => {
    const button = indexHtml.match(/<button[^>]*id="exportHtml"[\s\S]*?<\/button>/)?.[0];
    expect(button).toBeDefined();
    expect(button).toContain("data-lucide");
    expect(button).not.toContain("<span");
  });

  it("离线序列化完整保留当前动态数据并转义脚本结束标签", () => {
    const serialized = serializeEmbeddedAppData({
      ...data,
      materials: [{ ...(materials[0] as Material), body: "</script>" }, ...materials.slice(1)],
    });
    const restored = JSON.parse(serialized) as AppData;
    expect(restored.essentials).toEqual(data.essentials);
    expect(restored.examFocus).toEqual(data.examFocus);
    expect(restored.terms).toEqual(data.terms);
    expect(restored.templates).toEqual(data.templates);
    expect(restored.experienceNotes).toEqual(data.experienceNotes);
    expect(restored.jingNotes).toEqual(data.jingNotes);
    expect(restored.experienceImage).toBe(data.experienceImage);
    expect(serialized).not.toContain("</script>");
  });
});
