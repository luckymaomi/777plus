import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseRoute, routeHref } from "../src/core/routes";
import { searchAll } from "../src/core/search";
import { resolveTopicContexts, unresolvedMappings } from "../src/core/topics";
import { stripFrontmatter, stripMarkdown } from "../src/core/text";
import type { AnswerTemplate, Material, MaterialCatalogItem, Topic } from "../src/types";
import { buildAnswerOutline } from "../src/views/templates";

const root = resolve(import.meta.dirname, "..");
const catalog = JSON.parse(readFileSync(resolve(root, "content/catalog.json"), "utf8")) as MaterialCatalogItem[];
const topics = JSON.parse(readFileSync(resolve(root, "content/topics.json"), "utf8")) as Topic[];
const templates = JSON.parse(readFileSync(resolve(root, "content/templates.json"), "utf8")) as AnswerTemplate[];
const materials: Material[] = catalog.map((item) => {
  const markdown = readFileSync(resolve(root, "content", item.path), "utf8");
  const body = stripFrontmatter(markdown);
  return { ...item, markdown, body, plainText: stripMarkdown(body) };
});

describe("人工重点映射", () => {
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

  it("生成可复制的答案骨架", () => {
    const template = templates.find((item) => item.id === "argument") as AnswerTemplate;
    const outline = buildAnswerOutline(template, { problem: "运行痛点", cause: "原因" });
    expect(outline).toContain("1. 业务痛点 / 岗位难题\n运行痛点");
    expect(outline).toContain("2. 原因分析\n原因");
    expect(outline).toContain("4. 本岗位落点");
  });
});
