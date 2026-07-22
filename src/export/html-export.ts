import type { AppData } from "../data";
import { serializeEmbeddedAppData } from "../data";

const EMBEDDED_DATA_ID = "embeddedAppData";

async function fetchText(url: string, label: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`无法读取${label}（${response.status}）`);
  return response.text();
}

function blobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("资源编码结果无效")));
    reader.addEventListener("error", () => reject(reader.error ?? new Error("资源编码失败")));
    reader.readAsDataURL(blob);
  });
}

async function resourceAsDataUrl(url: string): Promise<string> {
  if (url.startsWith("data:")) return url;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`无法读取图片（${response.status}）`);
  return blobAsDataUrl(await response.blob());
}

async function readAppShell(): Promise<{ node: Document; baseUrl: string }> {
  const parser = new DOMParser();
  if (window.location.protocol !== "file:") {
    try {
      const pageUrl = new URL(window.location.href);
      pageUrl.hash = "";
      const response = await fetch(pageUrl);
      if (response.ok) {
        return {
          node: parser.parseFromString(await response.text(), "text/html"),
          baseUrl: response.url,
        };
      }
    } catch {
      // An already exported file can use its current DOM as the source shell.
    }
  }
  return {
    node: parser.parseFromString(document.documentElement.outerHTML, "text/html"),
    baseUrl: document.baseURI,
  };
}

async function inlineStyleSheets(node: Document, baseUrl: string): Promise<void> {
  await Promise.all([...node.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href]')].map(async (link) => {
    const url = new URL(link.getAttribute("href") ?? "", baseUrl).href;
    const style = node.createElement("style");
    style.textContent = await fetchText(url, "页面样式");
    link.replaceWith(style);
  }));
  node.querySelectorAll('link[rel="modulepreload"]').forEach((link) => link.remove());
}

async function inlineModuleScripts(node: Document, baseUrl: string): Promise<void> {
  await Promise.all([...node.querySelectorAll<HTMLScriptElement>('script[type="module"][src]')].map(async (script) => {
    const url = new URL(script.getAttribute("src") ?? "", baseUrl).href;
    if (/\/src\/[^?#]+\.(?:ts|tsx)(?:[?#]|$)/i.test(url)) {
      throw new Error("开发服务器模块无法直接内嵌，请使用 start_index.py 打开的构建版本导出。");
    }
    const replacement = node.createElement("script");
    replacement.type = "module";
    replacement.textContent = (await fetchText(url, "应用脚本")).replace(/<\/script/gi, "<\\/script");
    script.replaceWith(replacement);
  }));
}

async function inlineVisibleImages(node: Document, baseUrl: string): Promise<void> {
  const cache = new Map<string, Promise<string>>();
  await Promise.all([...node.images].map(async (image) => {
    const source = image.getAttribute("src");
    if (!source || source.startsWith("data:")) return;
    const absoluteUrl = new URL(source, baseUrl).href;
    let encoded = cache.get(absoluteUrl);
    if (!encoded) {
      encoded = resourceAsDataUrl(absoluteUrl);
      cache.set(absoluteUrl, encoded);
    }
    const dataUrl = await encoded;
    image.src = dataUrl;
    const imageLink = image.closest<HTMLAnchorElement>("a[href]");
    if (imageLink && new URL(imageLink.getAttribute("href") ?? "", baseUrl).href === absoluteUrl) imageLink.href = dataUrl;
  }));
}

function resetShell(node: Document): void {
  const main = node.getElementById("appMain");
  if (main) main.innerHTML = `<div class="loading-state"><span></span><p>正在整理材料</p></div>`;
  node.getElementById("appSidebar")?.classList.remove("is-open");
  node.getElementById("studyGuide")?.removeAttribute("open");
  const backdrop = node.getElementById("sidebarBackdrop");
  if (backdrop) backdrop.setAttribute("hidden", "");
  const search = node.getElementById("globalSearch") as HTMLInputElement | null;
  if (search) search.value = "";
  const results = node.getElementById("searchResults");
  if (results) {
    results.innerHTML = "";
    results.setAttribute("hidden", "");
  }
}

function embedData(node: Document, data: AppData): void {
  node.getElementById(EMBEDDED_DATA_ID)?.remove();
  const script = node.createElement("script");
  script.id = EMBEDDED_DATA_ID;
  script.type = "application/json";
  script.textContent = serializeEmbeddedAppData(data);
  const appScript = node.querySelector('script[type="module"]');
  if (appScript) appScript.before(script);
  else node.head.append(script);
}

export async function buildSelfContainedAppHtml(data: AppData): Promise<string> {
  const { node, baseUrl } = await readAppShell();
  const embeddedData: AppData = { ...data, overviewImage: await resourceAsDataUrl(data.overviewImage) };
  resetShell(node);
  embedData(node, embeddedData);
  await Promise.all([
    inlineStyleSheets(node, baseUrl),
    inlineModuleScripts(node, baseUrl),
    inlineVisibleImages(node, baseUrl),
  ]);
  return `<!doctype html>\n${node.documentElement.outerHTML}`;
}

function exportFileName(): string {
  const now = new Date();
  const localDate = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
  return `777plus-完整离线版-${localDate}.html`;
}

export async function downloadOfflineHtml(data: AppData): Promise<void> {
  const html = await buildSelfContainedAppHtml(data);
  const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = exportFileName();
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
