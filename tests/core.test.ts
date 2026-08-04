import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { AppData } from "../src/data";
import { serializeEmbeddedAppData } from "../src/data";
import { parseRoute, routeHref } from "../src/core/routes";
import { searchAll } from "../src/core/search";
import { normalizeText, stripFrontmatter, stripMarkdown } from "../src/core/text";
import type {
  AnswerTemplate,
  EssentialsData,
  ExamFocusData,
  Material,
  MaterialCatalogItem,
  TermDefinition,
} from "../src/types";
import { renderExperienceView } from "../src/views/experience";
import { renderEssentialsNavigation, renderEssentialsView } from "../src/views/essentials";
import { renderFocusView } from "../src/views/focus";
import { renderMaterialsNavigation } from "../src/views/materials";
import { buildAnswerText, renderTemplatesView } from "../src/views/templates";
import { renderTermsNavigation, renderTermsView } from "../src/views/terms";

const root = resolve(import.meta.dirname, "..");
const content = resolve(root, "content");
const indexHtml = readFileSync(resolve(root, "index.html"), "utf8");
const catalog = JSON.parse(readFileSync(resolve(content, "catalog.json"), "utf8")) as MaterialCatalogItem[];
const essentials = JSON.parse(readFileSync(resolve(content, "essentials.json"), "utf8")) as EssentialsData;
const examFocus = JSON.parse(readFileSync(resolve(content, "exam-focus.json"), "utf8")) as ExamFocusData;
const terms = JSON.parse(readFileSync(resolve(content, "terms.json"), "utf8")) as TermDefinition[];
const templates = JSON.parse(readFileSync(resolve(content, "templates.json"), "utf8")) as AnswerTemplate[];
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
  experienceImage: "data:image/jpeg;base64,bWVuZw==",
};

describe("材料与考前重点", () => {
  it("目录只保留当前11份文献并使用新版年中运行报告", () => {
    expect(catalog).toHaveLength(11);
    expect(catalog).toContainEqual(expect.objectContaining({
      id: "midyear-operations-report-2026",
      source: "南货航2026年中运行工作报告V3.docx",
      sha256: "49e02aa3e1388a3d9eb019325d047491547b315c1e01ae9e0665a295ae8fb939",
    }));
    expect(catalog.some((item) => item.id === "flight-team-midyear-report-2026")).toBe(false);
    expect(catalog.some((item) => item.id.includes("2024"))).toBe(false);
    expect(catalog.filter((item) => item.id.includes("2025")).every((item) => item.status === "旧材料")).toBe(true);
  });

  it("完整保留考试通告", () => {
    expect(examFocus.notice).toBe("考试分为主观题客观题两部分，内容包括但不限于民航安全生产基础知识，南航集团、物流公司、南货航的公司战略、发展情况、企业文化，发展规划，以及南货航安全运行的基本情况等。");
  });

  it("每条材料引文都能在指定材料中核对", () => {
    const materialMap = new Map(materials.map((material) => [material.id, material]));
    const errors = examFocus.evidence.flatMap((evidence) => {
      const material = materialMap.get(evidence.materialId);
      if (!material) return [`${evidence.id}: 缺少材料 ${evidence.materialId}`];
      return normalizeText(material.plainText).includes(normalizeText(evidence.quote))
        ? []
        : [`${evidence.id}: 引文无法核对`];
    });
    expect(errors).toEqual([]);
  });

  it("冲刺资料、名词和模板引用的证据ID全部存在", () => {
    const evidenceIds = new Set(examFocus.evidence.map((item) => item.id));
    const references = [
      ...essentials.knowledge.flatMap((item) => item.evidenceIds),
      ...terms.flatMap((term) => term.evidenceIds),
      ...templates.flatMap((template) => template.sections.flatMap((section) => section.evidenceIds)),
    ];
    expect(references.filter((id) => !evidenceIds.has(id))).toEqual([]);
  });

  it("考前重点只输出通告正文", () => {
    const html = renderFocusView(examFocus);
    expect(html).toContain(examFocus.notice);
    expect(html).toContain("考试范围通告");
    examFocus.evidence.forEach((evidence) => expect(html).not.toContain(evidence.quote));
    expect(html).not.toContain("重点目录");
    expect(html).not.toContain("evidence-item");
    expect(html).not.toContain("#/materials/");
  });
});

describe("没招了，就只看这一个", () => {
  it("单页完整包含知识、数字、关键词、答题骨架和万能表述", () => {
    expect(essentials.title).toBe("没招了，就只看这一个");
    expect(essentials.knowledge).toHaveLength(8);
    expect(essentials.numbers).toHaveLength(15);
    expect(essentials.keywordGroups).toHaveLength(6);
    expect(essentials.answerSteps).toHaveLength(5);
    expect(essentials.phrases).toHaveLength(6);
    const html = renderEssentialsView(essentials);
    ["核心知识", "数字速记", "关键词", "五步答题骨架", "万能表述"].forEach((heading) => {
      expect(html).toContain(heading);
    });
    expect(renderEssentialsNavigation()).toContain("冲刺目录");
    expect(html).not.toContain("#/materials/");
  });

  it("量化数据保留材料时点和目标口径", () => {
    expect(essentials.numbers).toEqual(expect.arrayContaining([
      { value: "2019年12月24日", label: "南货航成立", asOf: "当前口径" },
      { value: "2021年8月13日", label: "南货航取得运营许可证", asOf: "当前口径" },
      { value: "33条", label: "物流公司运营航线", asOf: "当前口径" },
      { value: "19架", label: "物流公司飞机数量", asOf: "当前口径" },
      { value: "14架", label: "南货航飞机数量", asOf: "当前口径" },
      { value: "5架", label: "总队777飞机数量", asOf: "当前口径" },
      { value: "22条", label: "南货航运营国际航线", asOf: "2025年口径" },
      { value: "15.72小时", label: "南货航飞机日利用率", asOf: "2026年上半年" },
      { value: "不低于87%", label: "航班正常率目标", asOf: "2026年下半年工作目标" },
    ]));
  });
});

describe("名词解释与答题模板", () => {
  it("名词解释包含考试范围六项、一三一四和七场硬仗", () => {
    expect(terms.map((term) => term.id)).toEqual([
      "safety-basics",
      "company-strategy",
      "one-three-one-four",
      "seven-battles",
      "development-status",
      "corporate-culture",
      "development-plan",
      "cargo-safety-operations",
    ]);
    expect(terms.every((term) => !term.summary.includes("民间理解：") && term.points.length >= 3)).toBe(true);
    const html = renderTermsView(terms[0] as TermDefinition, examFocus, materials);
    expect(html).toContain("主观题通用表述");
    expect(html).toContain("必记要点");
    expect(html).toContain("材料原文");
    expect(html).not.toContain("#/materials/");
    expect(html).not.toContain("#/keywords/");
    expect(renderTermsNavigation(terms, terms[0] as TermDefinition)).toContain("8 个名词");
  });

  it("每个名词在解释前提供包含该名词的通用表述", () => {
    terms.forEach((term) => {
      expect(term.universal.length).toBeGreaterThan(100);
      expect(term.universal).toContain(term.label);
      const html = renderTermsView(term, examFocus, materials);
      expect(html).toContain(term.universal);
      expect(html.indexOf("term-universal")).toBeLessThan(html.indexOf("term-definition"));
    });
  });

  it("一三一四和七场硬仗保留完整构成", () => {
    const strategy = terms.find((term) => term.id === "one-three-one-four") as TermDefinition;
    const battles = terms.find((term) => term.id === "seven-battles") as TermDefinition;
    expect(strategy.points).toEqual([
      "一个使命：智联全球产业，赋能美好生活。",
      "三个转变：协同化、国际化、智能化。",
      "一个平台：一体化智慧物流系统平台。",
      "四大业务板块：航空货运、现代仓储、供应链管理、电商贸易。",
    ]);
    expect(battles.points).toHaveLength(7);
    expect(battles.points.at(-1)).toBe("七是加强思想政治工作，全面提高党建水平。");
  });

  it("发展情况使用明确时点展示量化数据", () => {
    const development = terms.find((term) => term.id === "development-status") as TermDefinition;
    expect(development.facts).toEqual([
      { value: "2019年12月24日", label: "南货航成立", asOf: "当前口径" },
      { value: "2021年8月13日", label: "南货航取得运营许可证", asOf: "当前口径" },
      { value: "33条", label: "物流公司运营航线", asOf: "当前口径" },
      { value: "19架", label: "物流公司飞机数量", asOf: "当前口径" },
      { value: "14架", label: "南货航飞机数量", asOf: "当前口径" },
      { value: "5架", label: "总队777飞机数量", asOf: "当前口径" },
      { value: "22条", label: "国际航线", asOf: "2025年口径" },
      { value: "第一个五年", label: "正式投入运行", asOf: "材料对2025年的表述" },
    ]);
    const html = renderTermsView(development, examFocus, materials);
    expect(html).toContain("关键数据");
    expect(html).toContain("2026年上半年");
    expect(html).toContain("2025年口径");
  });

  it("答题模板包含五个专项方向和现状问题解决通用模板", () => {
    expect(templates.map((template) => template.label)).toEqual([
      "安全生产与安全运行",
      "战略定力与高质量发展",
      "全球运行体系与专业能力",
      "精益运行与降本增效",
      "企业文化与岗位落实",
      "通用：现状—问题—解决方案—岗位落实",
    ]);
    const general = templates[5] as AnswerTemplate;
    expect(general.sections.map((section) => section.heading)).toEqual([
      "第一部分：讲现状，成绩与形势都要写",
      "第二部分：讲问题，短板要具体且有原因",
      "第三部分：讲方案，逐项回应前文问题",
      "第四部分：回到岗位，写出个人可执行动作",
    ]);
    expect(templates.every((template) => template.universal.length > 100)).toBe(true);
  });

  it("模板具备大标题、小标题、正文、材料原文和复制文本", () => {
    const template = templates[0] as AnswerTemplate;
    const html = renderTemplatesView(template, examFocus, materials);
    const answer = buildAnswerText(template, examFocus, materials);
    expect(html).toContain("大标题");
    expect(html).toContain("材料原文");
    expect(html).toContain("主观题通用表述");
    expect(html).toContain(template.universal);
    expect(html).not.toContain("适用范围");
    expect(html).not.toContain("#/materials/");
    expect(answer).toContain(`大标题：${template.title}`);
    expect(answer).toContain(`主观题通用表述：\n${template.universal}`);
    expect(answer).toContain("原文依据：《南货航2026年中运行工作报告》");
    expect(answer).not.toContain("适用范围");
  });

  it("大神经验展示孟哥笔记图片", () => {
    const imagePath = resolve(content, "assets/meng-key-points.jpg");
    expect(existsSync(imagePath)).toBe(true);
    const html = renderExperienceView("data:image/jpeg;base64,bWVuZw==");
    expect(html).toContain("孟哥的笔记");
    expect(html).toContain("data:image/jpeg;base64,bWVuZw==");
    expect(html).not.toContain("原样展示");
  });
});

describe("路由、搜索与模块边界", () => {
  it("默认进入考前重点，旧路由不再成立", () => {
    expect(parseRoute("")).toEqual({ module: "focus" });
    expect(parseRoute("#/keywords/safety")).toEqual({ module: "focus" });
    expect(parseRoute("#/super")).toEqual({ module: "focus" });
    expect(parseRoute("#/essentials/keywords")).toEqual({ module: "essentials", itemId: "keywords", needle: undefined });
  });

  it("材料路由保留原文定位参数", () => {
    const route = parseRoute("#/materials/midyear-operations-report-2026?needle=机队规模达14架");
    expect(parseRoute(routeHref(route))).toEqual(route);
  });

  it("通用搜索覆盖重点、文献、名词和模板", () => {
    expect(searchAll("主观题客观题", data)).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "focus", module: "focus" }),
    ]));
    expect(searchAll("民航生产经营单位", data)).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "material", module: "materials" }),
    ]));
    expect(searchAll("民航生产经营单位", data)).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "focus", module: "focus" }),
    ]));
    expect(searchAll("公司战略", data)).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "term", id: "company-strategy" }),
    ]));
    expect(searchAll("基业长青", data)).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "term", id: "corporate-culture" }),
    ]));
    expect(searchAll("现状—问题—解决方案", data)).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "template", id: "current-problem-solution" }),
    ]));
    expect(searchAll("安全运行的确定性", data)).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "template", id: "safety-production" }),
    ]));
    expect(searchAll("15.72小时", data)).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "essential", module: "essentials", id: "numbers" }),
    ]));
  });

  it("文献目录没有分类筛选", () => {
    const html = renderMaterialsNavigation({ materials, selected: materials[0] as Material, query: "" });
    expect(html).toContain("文献目录");
    expect(html).not.toContain("categoryFilter");
    expect(html).not.toContain("全部分类");
  });

  it("主导航只保留当前六个模块并保持指定顺序", () => {
    const links = ["essentials", "focus", "materials", "terms", "templates", "experience"]
      .map((module) => indexHtml.indexOf(`data-module-link="${module}"`));
    expect(links.every((index) => index >= 0)).toBe(true);
    expect(links).toEqual([...links].sort((left, right) => left - right));
    expect(indexHtml).not.toContain("data-study-mode");
    expect(indexHtml).not.toContain("#/keywords");
    expect(indexHtml).not.toContain("超能模式");
    expect(indexHtml).not.toMatch(/[（(](?:官方|民间)[）)]/);
  });

  it("品牌区只有图标且不提供主题切换和外部代码托管入口", () => {
    expect(indexHtml).toContain('<a class="brand" href="#/focus"');
    expect(indexHtml).not.toContain("brand-edition");
    expect(indexHtml).not.toContain('id="themeToggle"');
    expect(indexHtml).not.toMatch(/href="https?:/i);
  });
});

describe("样式与离线版", () => {
  it("项目自有样式不存在单边框或伪元素侧边条", () => {
    const styleDir = resolve(root, "src/styles");
    const css = readdirSync(styleDir)
      .filter((name) => name.endsWith(".css"))
      .map((name) => readFileSync(resolve(styleDir, name), "utf8"))
      .join("\n");
    expect(css).not.toMatch(/border-(?:left|right|top|bottom)\s*:/i);
    expect(css).not.toMatch(/::(?:before|after)/i);
  });

  it("页面只保留白底深色字的浅色主题", () => {
    const styles = readdirSync(resolve(root, "src/styles"))
      .filter((name) => name.endsWith(".css"))
      .map((name) => readFileSync(resolve(root, "src/styles", name), "utf8"))
      .join("\n");
    expect(styles).not.toContain('data-theme="dark"');
    expect(styles).not.toMatch(/color-scheme:\s*dark/i);
    expect(styles).not.toMatch(/background:\s*#17191d/i);
    expect(indexHtml).toContain('<meta name="theme-color" content="#ffffff">');
  });

  it("应用页面不包含外部代码托管标识或链接", () => {
    const codeHostName = ["git", "hub"].join("");
    expect(indexHtml).not.toMatch(new RegExp(codeHostName, "i"));
  });

  it("README只保留徽章、GitHub Pages入口和逢考必过", () => {
    const readme = readFileSync(resolve(root, "README.md"), "utf8");
    expect(readme.match(/!\[/g)).toHaveLength(2);
    expect(readme).toContain("[🔗 打开资料库](https://luckymaomi.github.io/777plus/)");
    expect(readme.trim().endsWith("逢考必过。")).toBe(true);
    expect(readme).not.toContain("# ");
    expect(readme).not.toContain("```");
  });

  it("正式页面不包含需求说明式措辞", () => {
    const source = [
      indexHtml,
      readFileSync(resolve(root, "src/views/essentials.ts"), "utf8"),
      readFileSync(resolve(root, "src/views/focus.ts"), "utf8"),
      readFileSync(resolve(root, "src/views/terms.ts"), "utf8"),
      readFileSync(resolve(root, "src/views/templates.ts"), "utf8"),
      readFileSync(resolve(root, "src/views/experience.ts"), "utf8"),
      readFileSync(resolve(root, "content/terms.json"), "utf8"),
      readFileSync(resolve(root, "content/templates.json"), "utf8"),
      readFileSync(resolve(root, "content/essentials.json"), "utf8"),
    ].join("\n");
    ["民间理解：", "原样展示，不转写，不追加结论", "不是官方标准答案", "也不承诺得分", "适用于"].forEach((phrase) => {
      expect(source).not.toContain(phrase);
    });
  });

  it("废弃模块文件已经删除", () => {
    [
      "content/topics.json",
      "src/core/topics.ts",
      "src/core/study-mode.ts",
      "src/views/topics.ts",
      "src/views/super.ts",
      "src/styles/topics.css",
      "src/styles/super.css",
    ].forEach((path) => expect(existsSync(resolve(root, path))).toBe(false));
  });

  it("安全内嵌同一应用所需的全部数据和笔记图片", () => {
    const serialized = serializeEmbeddedAppData({
      ...data,
      materials: [{ ...(materials[0] as Material), body: "原文 </script> 仍需保留" }, ...materials.slice(1)],
    });
    const restored = JSON.parse(serialized) as AppData;
    expect(restored.materials).toHaveLength(11);
    expect(restored.essentials.knowledge).toHaveLength(8);
    expect(restored.essentials.answerSteps).toHaveLength(5);
    expect(restored.terms).toHaveLength(8);
    expect(restored.templates).toHaveLength(6);
    expect(restored.experienceImage).toMatch(/^data:image\/jpeg;base64,/);
    expect(serialized).not.toContain("</script>");
  });

  it("桌面端和移动端均保留纯图标离线下载入口", () => {
    const responsiveCss = readFileSync(resolve(root, "src/styles/responsive.css"), "utf8");
    const controller = readFileSync(resolve(root, "src/export/controller.ts"), "utf8");
    expect(indexHtml).toContain('id="exportHtml"');
    expect(indexHtml).toContain('class="icon-button export-button"');
    expect(indexHtml).toContain('aria-label="下载"');
    expect(indexHtml).not.toMatch(/id="exportHtml"[^>]*title=/);
    expect(indexHtml).not.toContain("<span>完整离线版</span>");
    expect(responsiveCss).not.toMatch(/\.export-button\s*\{[^}]*display:\s*none/is);
    expect(controller).toContain('"正在生成"');
    expect(controller).toContain('"下载完成"');
    expect(controller).not.toContain("<span>");
  });
});
