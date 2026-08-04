import type {
  AnswerTemplate,
  EssentialsData,
  ExamFocusData,
  Material,
  MaterialCatalogItem,
  TermDefinition,
} from "./types";
import { stripFrontmatter, stripMarkdown } from "./core/text";

export interface AppData {
  materials: Material[];
  essentials: EssentialsData;
  examFocus: ExamFocusData;
  terms: TermDefinition[];
  templates: AnswerTemplate[];
  experienceImage: string;
}

const EMBEDDED_DATA_ID = "embeddedAppData";

function embeddedAppData(): AppData | null {
  const source = document.getElementById(EMBEDDED_DATA_ID)?.textContent;
  if (!source) return null;
  try {
    return JSON.parse(source) as AppData;
  } catch (error) {
    throw new Error("内嵌应用数据无效", { cause: error });
  }
}

export function serializeEmbeddedAppData(data: AppData): string {
  return JSON.stringify(data)
    .replace(/&/g, "\\u0026")
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function contentUrl(path: string): string {
  const base = new URL(import.meta.env.BASE_URL, window.location.href);
  return new URL(path, base).href;
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(contentUrl(path));
  if (!response.ok) throw new Error(`无法加载 ${path}（${response.status}）`);
  return response.json() as Promise<T>;
}

async function fetchText(path: string): Promise<string> {
  const response = await fetch(contentUrl(path));
  if (!response.ok) throw new Error(`无法加载 ${path}（${response.status}）`);
  return response.text();
}

export async function loadAppData(): Promise<AppData> {
  const embedded = embeddedAppData();
  if (embedded) return embedded;

  const [catalog, essentials, examFocus, terms, templates] = await Promise.all([
    fetchJson<MaterialCatalogItem[]>("catalog.json"),
    fetchJson<EssentialsData>("essentials.json"),
    fetchJson<ExamFocusData>("exam-focus.json"),
    fetchJson<TermDefinition[]>("terms.json"),
    fetchJson<AnswerTemplate[]>("templates.json"),
  ]);
  const materials = await Promise.all(catalog.map(async (item) => {
    const markdown = await fetchText(item.path);
    const body = stripFrontmatter(markdown);
    return { ...item, markdown, body, plainText: stripMarkdown(body) };
  }));

  return {
    materials,
    essentials,
    examFocus,
    terms,
    templates,
    experienceImage: contentUrl("assets/meng-key-points.jpg"),
  };
}
