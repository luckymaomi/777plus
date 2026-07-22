import type { AnswerExample, Material, MaterialCatalogItem, Topic } from "./types";
import { stripFrontmatter, stripMarkdown } from "./core/text";

export interface AppData {
  materials: Material[];
  topics: Topic[];
  templates: AnswerExample[];
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
  const [catalog, topics, templates] = await Promise.all([
    fetchJson<MaterialCatalogItem[]>("catalog.json"),
    fetchJson<Topic[]>("topics.json"),
    fetchJson<AnswerExample[]>("templates.json"),
  ]);
  const materials = await Promise.all(catalog.map(async (item) => {
    const markdown = await fetchText(item.path);
    const body = stripFrontmatter(markdown);
    return { ...item, markdown, body, plainText: stripMarkdown(body) };
  }));
  return { materials, topics, templates };
}
