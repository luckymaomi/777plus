import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseRoute, routeHref } from "../src/core/routes";
import { searchAll } from "../src/core/search";
import { resolveTopicContexts, unresolvedMappings } from "../src/core/topics";
import { normalizeText, stripFrontmatter, stripMarkdown } from "../src/core/text";
import type { AnswerExample, Material, MaterialCatalogItem, Topic } from "../src/types";
import { buildAnswerText } from "../src/views/templates";

const root = resolve(import.meta.dirname, "..");
const catalog = JSON.parse(readFileSync(resolve(root, "content/catalog.json"), "utf8")) as MaterialCatalogItem[];
const topics = JSON.parse(readFileSync(resolve(root, "content/topics.json"), "utf8")) as Topic[];
const templates = JSON.parse(readFileSync(resolve(root, "content/templates.json"), "utf8")) as AnswerExample[];
const materials: Material[] = catalog.map((item) => {
  const markdown = readFileSync(resolve(root, "content", item.path), "utf8");
  const body = stripFrontmatter(markdown);
  return { ...item, markdown, body, plainText: stripMarkdown(body) };
});

describe("人工重点映射", () => {
  it("目录只保留当前文献并标明旧材料", () => {
    expect(catalog).toHaveLength(11);
    expect(catalog.some((item) => item.id === "cargo-report-2026")).toBe(true);
    expect(catalog.some((item) => item.id.includes("2024"))).toBe(false);
    expect(catalog.filter((item) => item.id.includes("2025")).every((item) => item.status === "旧材料")).toBe(true);
  });

  it("每条已配置映射都能定位到真实原文", () => {
    const unresolved = topics.flatMap((topic) => unresolvedMappings(topic, materials));
    expect(unresolved).toEqual([]);
  });

  it("上下文包含命中段落及相邻段落", () => {
    const topic = topics.find((item) => item.id === "two-focus-one-prevention");
    expect(topic).toBeDefined();
    const contexts = resolveTopicContexts(topic as Topic, materials);
    expect(contexts.length).toBeGreaterThan(0);
    expect(contexts[0]?.block).toContain(contexts[0]?.needle);
    expect(contexts[0]?.targetBlock).toContain(contexts[0]?.needle);
  });

  it("没有材料的重点保持空态", () => {
    const empty: Topic = { id: "empty", label: "未确认", kind: "keyword", mappings: [] };
    expect(resolveTopicContexts(empty, materials)).toEqual([]);
  });
});

describe("通用搜索", () => {
  it("分别返回素材命中与人工重点命中", () => {
    const materialResults = searchAll("政绩观", materials, []);
    expect(materialResults.some((item) => item.type === "material")).toBe(true);

    const topicResults = searchAll("一三一四", [], topics);
    expect(topicResults).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "topic", id: "1314-strategy" }),
    ]));
  });
});

describe("路由与模板", () => {
  it("保留原文定位参数", () => {
    const route = parseRoute("#/materials/flight-report-2025?needle=安全是发展的前提");
    expect(route).toEqual({
      module: "materials",
      itemId: "flight-report-2025",
      needle: "安全是发展的前提",
    });
    expect(parseRoute(routeHref(route))).toEqual(route);
  });

  it("旧方向路由不再成立", () => {
    expect(parseRoute("#/directions/safety")).toEqual({
      module: "materials",
      itemId: "safety",
      needle: undefined,
    });
  });

  it("每条答案引文都能在指定文献中核对", () => {
    const materialMap = new Map(materials.map((material) => [material.id, material]));
    const errors = templates.flatMap((template) => template.sections.flatMap((section) => (
      section.citations.flatMap((citation) => {
        const material = materialMap.get(citation.materialId);
        if (!material) return [`${template.label}: missing ${citation.materialId}`];
        const source = normalizeText(material.plainText);
        const missing = [citation.needle, citation.quote].filter((value) => !source.includes(normalizeText(value)));
        return missing.map((value) => `${template.label}: ${citation.materialId} -> ${value}`);
      })
    )));
    expect(errors).toEqual([]);
  });

  it("完整示例同时提供可复制正文和速记顺序", () => {
    const template = templates.find((item) => item.id === "safety") as AnswerExample;
    const answer = buildAnswerText(template, materials);
    expect(template.memory.sequence.length).toBeGreaterThanOrEqual(5);
    expect(answer).toContain("临时抱佛脚：安全底线 -> 风险变化 -> 体系责任 -> 能力训练 -> 岗位落实");
    expect(answer).toContain("原文：《南货航飞行部2025年工作报告 V7（终稿）》安全是发展的前提");
  });
});
