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
  ExperienceNotesData,
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
const experienceNotes = JSON.parse(readFileSync(resolve(content, "experience-notes.json"), "utf8")) as ExperienceNotesData;
const externalEvidenceSources = new Set(["safety-production-law-2021"]);
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
  experienceImage: "data:image/jpeg;base64,bWVuZw==",
};

describe("材料与考试通告", () => {
  it("目录只保留当前8份文献并使用新版年中运行报告", () => {
    expect(catalog).toHaveLength(8);
    expect(catalog).toContainEqual(expect.objectContaining({
      id: "midyear-operations-report-2026",
      source: "南货航2026年中运行工作报告V3.docx",
      sha256: "49e02aa3e1388a3d9eb019325d047491547b315c1e01ae9e0665a295ae8fb939",
    }));
    expect(catalog).toContainEqual(expect.objectContaining({
      id: "correct-performance-view-2026",
      source: "树立和践行正确政绩观.txt",
      category: "党建教育",
      sha256: "28570c254c279f567f9ddeae3b5f7f257fffb6d54d837939eb08ef290601c922",
    }));
    expect(catalog.some((item) => item.id === "flight-team-midyear-report-2026")).toBe(false);
    [
      "four-explanations-group-logistics-2026",
      "ccar-398r1-2026",
      "four-explanations-notice-2026",
      "logistics-reform",
    ].forEach((id) => expect(catalog.some((item) => item.id === id)).toBe(false));
    expect(catalog.some((item) => item.id.includes("2024"))).toBe(false);
    expect(catalog.filter((item) => item.id.includes("2025")).every((item) => item.status === "旧材料")).toBe(true);
  });

  it("正确政绩观材料保留二十七节正文和文末说明", () => {
    const material = materials.find((item) => item.id === "correct-performance-view-2026") as Material;
    expect(material.body.match(/^## /gm)).toHaveLength(27);
    expect(material.body).toContain("树立和践行正确政绩观，起决定性作用的是党性");
    expect(material.body).toContain("为民造福是最大政绩");
    expect(material.body).toContain("※这是习近平总书记2012年12月至2026年2月期间有关树立和践行正确政绩观重要论述的节录。");
    expect(material.body).not.toContain("首页|简|繁|EN");
    expect(material.body).not.toContain("中国政府网 | 关于本网");
  });

  it("完整保留考试通告", () => {
    expect(examFocus.notice).toBe("考试分为主观题客观题两部分，内容包括但不限于民航安全生产基础知识，南航集团、物流公司、南货航的公司战略、发展情况、企业文化，发展规划，以及南货航安全运行的基本情况等。");
  });

  it("每条材料引文都能在指定材料中核对", () => {
    const materialMap = new Map(materials.map((material) => [material.id, material]));
    const noteSource = experienceNotes.sections.flatMap((section) => (
      section.entries.flatMap((entry) => [entry.heading, ...entry.paragraphs])
    )).join("");
    const errors = examFocus.evidence.flatMap((evidence) => {
      const material = materialMap.get(evidence.materialId);
      if (!material && evidence.materialId === experienceNotes.id) {
        return normalizeText(noteSource).includes(normalizeText(evidence.quote))
          ? []
          : [`${evidence.id}: 笔记引文无法核对`];
      }
      if (!material && externalEvidenceSources.has(evidence.materialId)) {
        return evidence.sourceLabel === "《中华人民共和国安全生产法》（2021年修正版）"
          ? []
          : [`${evidence.id}: 外部材料来源标识缺失`];
      }
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

  it("考试通告只输出通告正文", () => {
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

  it("关键词按考试通告六项范围展开对应下级词语", () => {
    expect(essentials.keywordGroups.map((group) => group.label)).toEqual([
      "民航安全生产基础知识",
      "公司战略（南航集团、物流公司、南货航）",
      "发展情况",
      "企业文化",
      "发展规划",
      "南货航安全运行的基本情况",
    ]);
    const strategy = essentials.keywordGroups[1];
    expect(strategy?.keywords).toEqual(expect.arrayContaining([
      "南航集团：五五六六",
      "物流公司：一三一四",
      "南货航：全球飞 飞全球",
      "南货航：建设世界一流航空货运承运人",
    ]));
    expect(strategy?.keywords.join(" ")).toContain("安全发展、高质量发展、创新发展、合作发展、共享发展");
    expect(strategy?.keywords.join(" ")).toContain("由粗放型管理向精细化管理转变");
    expect(essentials.keywordGroups[3]?.keywords).toContain("经营理念：为客户创造价值");
    expect(essentials.keywordGroups[3]?.keywords).toContain("品牌口号：飞向美好未来");
    expect(essentials.keywordGroups[5]?.keywords).toContain("一线一策、一场一策");
    expect(essentials.keywordGroups[0]?.keywords).toContain("SMS四大支柱：安全政策与目标、安全风险管理、安全保证、安全促进");
    expect(essentials.keywordGroups[0]?.keywords).toContain("南航安全七大体系：规章手册体系、安全责任体系、风险管控体系、过程控制体系、训练培训体系、科技创新体系、安全文化体系");
    expect(essentials.keywordGroups[0]?.keywords).toEqual(expect.arrayContaining([
      "三管三必须：管行业必须管安全、管业务必须管安全、管生产经营必须管安全",
      "生产经营单位主体责任、政府监管责任",
      "全员安全生产责任制：各岗位责任人员、责任范围、考核标准",
      "主要负责人：本单位安全生产第一责任人，对本单位的安全生产工作全面负责",
      "其他负责人：对职责范围内的安全生产工作负责",
      "主要负责人七项职责：责任制、规章制度、教育培训、投入、双重预防、应急预案、事故报告",
      "岗位员工责任：落实岗位安全责任，遵守规章制度和操作规程，服从管理，正确佩戴和使用劳动防护用品",
      "岗位员工能力：接受安全生产教育和培训，掌握安全生产知识，提高安全生产技能，增强事故预防和应急处理能力",
      "岗位员工报告义务：发现事故隐患或者其他不安全因素，应当立即报告",
      "岗位危险告知：危险因素、防范措施、事故应急措施",
    ]));
  });
});

describe("名词解释与答题模板", () => {
  it("名词解释包含考试范围六项及九个专项名词", () => {
    expect(terms.map((term) => term.id)).toEqual([
      "safety-basics",
      "three-management-three-musts",
      "all-staff-safety-responsibility",
      "responsible-person-safety-duties",
      "employee-position-safety-duties",
      "sms-four-pillars",
      "csair-seven-safety-systems",
      "company-strategy",
      "five-five-six-six",
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
    expect(renderTermsNavigation(terms, terms[0] as TermDefinition)).toContain("15 个名词");
    expect(indexHtml).toContain("掌握十五个名词及其必记要点");
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

  it("五五六六保留通用表述并按原文展示完整构成", () => {
    const strategy = terms.find((term) => term.id === "five-five-six-six") as TermDefinition;
    expect(strategy.universal).toContain("五五六六");
    expect(strategy.summary).toBe("坚持五大发展、实施五大战略、推进六大行动、实现六大转变。");
    expect(strategy.points).toHaveLength(4);
    expect(strategy.points[0]).toBe("五大发展：安全发展、高质量发展、创新发展、合作发展、共享发展。");
    expect(strategy.points[1]).toBe("五大战略：枢纽网络战略、创新驱动战略、生态圈战略、精益管控战略、品牌经营战略。");
    expect(strategy.points[2]).toContain("全面打造“五化”服务行动");
    expect(strategy.points[3]).toContain("由粗放型管理向精细化管理转变");
    const html = renderTermsView(strategy, examFocus, materials);
    expect(html).toContain("主观题通用表述");
    expect(html).toContain(strategy.universal);
  });

  it("SMS四大支柱和南航安全七大体系逐项完整", () => {
    const sms = terms.find((term) => term.id === "sms-four-pillars") as TermDefinition;
    const systems = terms.find((term) => term.id === "csair-seven-safety-systems") as TermDefinition;
    expect(sms.summary).toBe("SMS四大支柱是安全政策与目标、安全风险管理、安全保证、安全促进。");
    expect(sms.points).toEqual(["安全政策与目标。", "安全风险管理。", "安全保证。", "安全促进。"]);
    expect(systems.points).toEqual([
      "规章手册体系。",
      "安全责任体系。",
      "风险管控体系。",
      "过程控制体系。",
      "训练培训体系。",
      "科技创新体系。",
      "安全文化体系。",
    ]);
    expect(renderTermsView(sms, examFocus, materials)).toContain("帆姐《考点梳理2025》 · 2025笔记");
    expect(renderTermsView(systems, examFocus, materials)).toContain("2026年纵深推进安全七大体系建设");
  });

  it("安全生产法四个名词区分责任主体并展示法条原文", () => {
    const threeMusts = terms.find((term) => term.id === "three-management-three-musts") as TermDefinition;
    const allStaff = terms.find((term) => term.id === "all-staff-safety-responsibility") as TermDefinition;
    const responsiblePerson = terms.find((term) => term.id === "responsible-person-safety-duties") as TermDefinition;
    const employee = terms.find((term) => term.id === "employee-position-safety-duties") as TermDefinition;

    expect(threeMusts.summary).toContain("管行业必须管安全、管业务必须管安全、管生产经营必须管安全");
    expect(allStaff.points).toEqual(expect.arrayContaining([
      "责任内容必须明确各岗位的责任人员、责任范围和考核标准。",
      "生产经营单位应建立相应机制，加强责任制落实情况的监督考核。",
    ]));
    expect(responsiblePerson.points).toHaveLength(9);
    expect(responsiblePerson.points[0]).toContain("第一责任人");
    expect(responsiblePerson.points[1]).toContain("其他负责人");
    expect(responsiblePerson.points.at(-1)).toBe("第七项：及时、如实报告生产安全事故。");
    expect(employee.points).toHaveLength(4);
    expect(employee.points[0]).toContain("严格落实岗位安全责任");
    expect(employee.points[2]).toContain("立即向现场安全生产管理人员或者本单位负责人报告");
    expect(employee.points[3]).toContain("单位保障责任");

    [threeMusts, allStaff, responsiblePerson, employee].forEach((term) => {
      const html = renderTermsView(term, examFocus, materials);
      expect(html).toContain("《中华人民共和国安全生产法》（2021年修正版）");
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

  it("答题模板包含六个专项方向和现状问题解决通用模板", () => {
    expect(templates.map((template) => template.label)).toEqual([
      "安全生产与安全运行",
      "战略定力与高质量发展",
      "全球运行体系与专业能力",
      "精益运行与降本增效",
      "企业文化与岗位落实",
      "党建引领与正确政绩观",
      "通用：现状—问题—解决方案—岗位落实",
    ]);
    const general = templates[6] as AnswerTemplate;
    expect(general.sections.map((section) => section.heading)).toEqual([
      "第一部分：讲现状，成绩与形势都要写",
      "第二部分：讲问题，短板要具体且有原因",
      "第三部分：讲方案，逐项回应前文问题",
      "第四部分：回到岗位，写出个人可执行动作",
    ]);
    expect(templates.every((template) => template.universal.length > 100)).toBe(true);
    expect(templates.every((template) => template.structureAnchor.length > 0)).toBe(true);
    expect(templates.every((template) => template.sections.every((section) => section.anchor.length > 0))).toBe(true);
  });

  it("党建模板同时使用正确政绩观和四个讲明原文", () => {
    const template = templates.find((item) => item.id === "party-building-performance-view") as AnswerTemplate;
    expect(template.structureAnchor).toBe("总分总·党建引领");
    expect(template.sections.map((section) => section.anchor)).toEqual([
      "政治方向",
      "为民实干",
      "党建融合",
      "岗位落实",
    ]);
    const evidence = template.sections.flatMap((section) => section.evidenceIds);
    expect(evidence).toEqual(expect.arrayContaining([
      "performance-view-party-spirit",
      "performance-view-people",
      "performance-view-practice",
      "cargo-party-building-2026",
    ]));
    const answer = buildAnswerText(template, examFocus, materials);
    expect(answer).toContain("原文依据：《习近平：树立和践行正确政绩观》");
    expect(answer).toContain("原文依据：《2026年“四个讲明”形势任务教育宣讲提纲（南货航）》");
  });

  it("模板具备大标题、小标题、正文、材料原文和复制文本", () => {
    const template = templates[0] as AnswerTemplate;
    const html = renderTemplatesView(template, examFocus, materials);
    const answer = buildAnswerText(template, examFocus, materials);
    expect(html).toContain("大标题");
    expect(html).toContain("材料原文");
    expect(html).toContain("主观题通用表述");
    expect(html).toContain(template.universal);
    expect(html).toContain('<mark class="inline-anchor">主观题通用表述</mark>');
    expect(html).toContain(`<mark class="inline-anchor">${template.structureAnchor}</mark>`);
    expect(html).toContain(`<mark class="inline-anchor">${template.sections[0]?.anchor}</mark>`);
    expect(html).not.toContain("结构总览");
    expect(html).not.toContain("结构路径");
    expect(html).not.toContain("适用范围");
    expect(html).not.toContain("#/materials/");
    expect(answer).toContain(`大标题：${template.title}`);
    expect(answer).toContain(`【主观题通用表述】${template.universal}`);
    expect(answer).toContain(`【${template.structureAnchor}】${template.opening}`);
    expect(answer).toContain(`【${template.sections[0]?.anchor}】`);
    expect(answer).toContain("原文依据：《南货航2026年中运行工作报告》");
    expect(answer).not.toContain("适用范围");
  });

  it("大神经验单页展示帆姐文字笔记和孟哥原图", () => {
    const imagePath = resolve(content, "assets/meng-key-points.jpg");
    expect(existsSync(imagePath)).toBe(true);
    const html = renderExperienceView("data:image/jpeg;base64,bWVuZw==", experienceNotes);
    expect(html).toContain("帆姐考点梳理");
    expect(html).toContain("孟哥的笔记");
    expect(html).toContain("仍有效");
    expect(html).toContain("2025口径");
    expect(html).toContain("已过时");
    expect(html).toContain("<s>安全生产专项整治");
    expect(html).toContain("安全政策与目标、安全风险管理、安全保证、安全促进");
    expect(html).toContain("data:image/jpeg;base64,bWVuZw==");
    expect(html).not.toContain("原样展示");
  });
});

describe("路由、搜索与模块边界", () => {
  it("默认进入考试通告，旧路由不再成立", () => {
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
    expect(searchAll("R8补充合格审定", data)).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "material", module: "materials" }),
    ]));
    expect(searchAll("R8补充合格审定", data)).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "focus", module: "focus" }),
    ]));
    expect(searchAll("公司战略", data)).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "term", id: "company-strategy" }),
    ]));
    expect(searchAll("负责人安全生产责任", data)).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "term", id: "responsible-person-safety-duties" }),
    ]));
    expect(searchAll("岗位员工安全生产责任", data)).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "term", id: "employee-position-safety-duties" }),
    ]));
    expect(searchAll("基业长青", data)).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "term", id: "corporate-culture" }),
    ]));
    expect(searchAll("现状—问题—解决方案", data)).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "template", id: "current-problem-solution" }),
    ]));
    expect(searchAll("正确政绩观", data)).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "material", id: "correct-performance-view-2026" }),
      expect.objectContaining({ type: "template", id: "party-building-performance-view" }),
    ]));
    expect(searchAll("安全运行的确定性", data)).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "template", id: "safety-production" }),
    ]));
    expect(searchAll("15.72小时", data)).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "essential", module: "essentials", id: "numbers" }),
    ]));
    expect(searchAll("由粗放型管理向精细化管理转变", data)).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "essential", module: "essentials", id: "keywords" }),
    ]));
    expect(searchAll("一图一册一平台", data)).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "experience", module: "experience" }),
    ]));
  });

  it("文献目录没有分类筛选", () => {
    const html = renderMaterialsNavigation({ materials, selected: materials[0] as Material, query: "" });
    expect(html).toContain("文献目录");
    expect(html).not.toContain("categoryFilter");
    expect(html).not.toContain("全部分类");
  });

  it("主导航只保留当前六个模块并保持指定顺序", () => {
    const links = ["focus", "materials", "terms", "templates", "experience", "essentials"]
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

  it("四份排除材料及其原始素材已经删除", () => {
    [
      "content/materials/four-explanations-group-logistics-2026.md",
      "content/materials/ccar-398r1-2026.md",
      "content/materials/four-explanations-notice-2026.md",
      "content/materials/logistics-reform.md",
      "考试素材合集/2026年“四个讲明”形势任务教育宣讲提纲（含集团和物流公司）.pptx",
      "考试素材合集/CCAR-398R1规章宣贯 202606V2.pdf",
      "考试素材合集/关于印发《2026年“四个讲明”形势任务教育宣讲提纲》的通知.pdf",
      "考试素材合集/南航物流改革发展.pptx",
    ].forEach((path) => expect(existsSync(resolve(root, path))).toBe(false));
  });

  it("安全内嵌同一应用所需的全部数据、文字笔记和图片", () => {
    const serialized = serializeEmbeddedAppData({
      ...data,
      materials: [{ ...(materials[0] as Material), body: "原文 </script> 仍需保留" }, ...materials.slice(1)],
    });
    const restored = JSON.parse(serialized) as AppData;
    expect(restored.materials).toHaveLength(8);
    expect(restored.essentials.knowledge).toHaveLength(8);
    expect(restored.essentials.answerSteps).toHaveLength(5);
    expect(restored.terms).toHaveLength(15);
    expect(restored.templates).toHaveLength(7);
    expect(restored.experienceNotes.id).toBe("fan-key-points-2025");
    expect(restored.experienceNotes.sections).toHaveLength(10);
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
