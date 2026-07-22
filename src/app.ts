import { createIcons, ArrowUpRight, Copy, Crosshair, FileText, Github, Highlighter, Inbox, Library, ListTree, Menu, Moon, NotebookPen, PanelLeftOpen, RotateCcw, Search, Sun } from "lucide";
import type { AppData } from "./data";
import type { AnswerTemplate, Material, ModuleId, Route, SearchResult } from "./types";
import { parseRoute, routeHref } from "./core/routes";
import { searchAll } from "./core/search";
import { collectHeadings, prepareMarkdown } from "./core/markdown";
import { escapeHtml } from "./core/text";
import { renderMaterialsView } from "./views/materials";
import { renderTopicsView } from "./views/topics";
import { buildAnswerOutline, renderTemplatesView, type TemplateValues } from "./views/templates";

const iconSet = { ArrowUpRight, Copy, Crosshair, FileText, Github, Highlighter, Inbox, Library, ListTree, Menu, Moon, NotebookPen, PanelLeftOpen, RotateCcw, Search, Sun };
const moduleNames: Record<ModuleId, string> = { materials: "原材料", keywords: "重点词", directions: "重点方向", templates: "答题模板" };

export class App {
  private route: Route = parseRoute(window.location.hash);
  private materialQuery = "";
  private materialCategory = "";
  private topicQueries: Record<"keyword" | "direction", string> = { keyword: "", direction: "" };

  constructor(private readonly data: AppData, private readonly main: HTMLElement) {
    this.bindShell();
    this.render();
  }

  private bindShell(): void {
    window.addEventListener("hashchange", () => {
      this.route = parseRoute(window.location.hash);
      this.closeSidebar();
      this.render();
    });
    document.getElementById("mobileMenu")?.addEventListener("click", () => this.openSidebar());
    document.getElementById("sidebarBackdrop")?.addEventListener("click", () => this.closeSidebar());
    document.getElementById("themeToggle")?.addEventListener("click", () => this.toggleTheme());
    const search = document.getElementById("globalSearch") as HTMLInputElement | null;
    search?.addEventListener("input", () => this.renderSearchResults(search.value));
    search?.addEventListener("focus", () => this.renderSearchResults(search.value));
    document.addEventListener("keydown", (event) => {
      if (event.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        event.preventDefault();
        search?.focus();
      }
      if (event.key === "Escape") this.closeOverlays();
    });
    document.addEventListener("click", (event) => {
      const target = event.target as Node;
      if (!document.getElementById("searchResults")?.contains(target) && target !== search) this.hideSearchResults();
    });
    const storedTheme = localStorage.getItem("777plus-theme");
    if (storedTheme === "dark") document.documentElement.dataset.theme = "dark";
    this.refreshThemeIcon();
  }

  private render(): void {
    const route = this.route;
    if (route.module === "materials") this.renderMaterials(route);
    if (route.module === "keywords") this.renderTopicModule("keyword", route);
    if (route.module === "directions") this.renderTopicModule("direction", route);
    if (route.module === "templates") this.renderTemplates(route);
    this.refreshShell();
    createIcons({ icons: iconSet });
  }

  private renderMaterials(route: Route): void {
    const selected = this.findMaterial(route.itemId);
    this.main.innerHTML = renderMaterialsView({
      materials: this.data.materials,
      selected,
      query: this.materialQuery,
      category: this.materialCategory,
    });
    const filter = document.getElementById("materialFilter") as HTMLInputElement | null;
    filter?.addEventListener("input", () => {
      this.materialQuery = filter.value;
      this.renderMaterials(this.route);
      (document.getElementById("materialFilter") as HTMLInputElement | null)?.focus();
    });
    document.getElementById("categoryFilter")?.addEventListener("change", (event) => {
      this.materialCategory = (event.target as HTMLSelectElement).value;
      this.renderMaterials(this.route);
    });
    this.bindWorkspaceControls();
    const body = document.getElementById("markdownBody");
    if (body) {
      prepareMarkdown(body, route.needle);
      this.renderToc(body);
    }
  }

  private renderTopicModule(kind: "keyword" | "direction", route: Route): void {
    const topics = this.data.topics.filter((topic) => topic.kind === kind);
    const selected = topics.find((topic) => topic.id === route.itemId) ?? topics[0];
    if (!selected) return;
    this.main.innerHTML = renderTopicsView({
      topics,
      materials: this.data.materials,
      selected,
      query: this.topicQueries[kind],
    });
    const filter = document.getElementById("topicFilter") as HTMLInputElement | null;
    filter?.addEventListener("input", () => {
      this.topicQueries[kind] = filter.value;
      this.renderTopicModule(kind, this.route);
      (document.getElementById("topicFilter") as HTMLInputElement | null)?.focus();
    });
    this.bindWorkspaceControls();
    document.querySelectorAll<HTMLElement>(".context-body").forEach((context) => {
      prepareMarkdown(context, context.dataset.contextNeedle, false);
    });
  }

  private renderTemplates(route: Route): void {
    const selected = this.data.templates.find((template) => template.id === route.itemId) ?? this.data.templates[0];
    if (!selected) return;
    const values = this.readTemplateValues(selected);
    this.main.innerHTML = renderTemplatesView(this.data.templates, selected, values);
    const form = document.getElementById("templateForm") as HTMLFormElement | null;
    form?.addEventListener("input", () => {
      const next = Object.fromEntries(new FormData(form).entries()) as TemplateValues;
      localStorage.setItem(this.templateStorageKey(selected), JSON.stringify(next));
      this.updateAnswerPreview(selected, next);
    });
    document.querySelector("[data-copy-template]")?.addEventListener("click", () => {
      void navigator.clipboard.writeText(buildAnswerOutline(selected, this.readFormValues(form)));
      this.flashButton(document.querySelector("[data-copy-template]"));
    });
    document.querySelector("[data-reset-template]")?.addEventListener("click", () => {
      localStorage.removeItem(this.templateStorageKey(selected));
      this.renderTemplates(this.route);
    });
  }

  private bindWorkspaceControls(): void {
    document.querySelector("[data-toggle-collection]")?.addEventListener("click", () => {
      document.getElementById("collectionPane")?.classList.toggle("is-open");
    });
    document.querySelector("[data-toggle-toc]")?.addEventListener("click", () => {
      document.getElementById("tocPane")?.classList.toggle("is-open");
    });
    document.querySelector("[data-copy-source]")?.addEventListener("click", (event) => {
      const button = event.currentTarget as HTMLElement;
      void navigator.clipboard.writeText(button.dataset.copySource ?? "");
      this.flashButton(button);
    });
  }

  private renderToc(body: HTMLElement): void {
    const toc = document.getElementById("tocList");
    if (!toc) return;
    const headings = collectHeadings(body);
    toc.innerHTML = headings.map((heading) => `<a href="#${escapeHtml(heading.id)}" data-level="${heading.level}">${escapeHtml(heading.text)}</a>`).join("");
    toc.querySelectorAll("a").forEach((link) => link.addEventListener("click", (event) => {
      event.preventDefault();
      body.querySelector(`#${CSS.escape(link.getAttribute("href")?.slice(1) ?? "")}`)?.scrollIntoView({ behavior: "smooth" });
    }));
  }

  private renderSearchResults(query: string): void {
    const panel = document.getElementById("searchResults");
    if (!panel) return;
    const results = searchAll(query, this.data.materials, this.data.topics);
    if (!query.trim()) {
      panel.hidden = true;
      return;
    }
    panel.innerHTML = results.length ? results.map((result) => this.searchResultHtml(result)).join("") : `<div class="search-empty">没有匹配内容</div>`;
    panel.hidden = false;
    createIcons({ icons: iconSet });
  }

  private searchResultHtml(result: SearchResult): string {
    const href = routeHref({ module: result.module, itemId: result.id, needle: result.needle });
    const icon = result.type === "material" ? "file-text" : "highlighter";
    return `<a class="search-result" href="${href}"><i data-lucide="${icon}"></i><span><b>${escapeHtml(result.title)}</b><small>${escapeHtml(result.meta)} · ${escapeHtml(result.snippet)}</small></span><i data-lucide="arrow-up-right"></i></a>`;
  }

  private refreshShell(): void {
    document.querySelectorAll<HTMLElement>("[data-module-link]").forEach((link) => link.classList.toggle("is-active", link.dataset.moduleLink === this.route.module));
    const context = document.getElementById("headerContext");
    if (context) context.textContent = moduleNames[this.route.module];
    const status = document.getElementById("sourceStatus");
    if (status) status.textContent = `${this.data.materials.length} 份材料`;
    document.title = `${moduleNames[this.route.module]} · 777plus`;
  }

  private updateAnswerPreview(template: AnswerTemplate, values: TemplateValues): void {
    const outline = document.getElementById("answerOutline");
    if (!outline) return;
    outline.innerHTML = template.fields.map((field, index) => `<section><span>${String(index + 1).padStart(2, "0")}</span><div><h2>${escapeHtml(field.label)}</h2><p>${escapeHtml(values[field.id]?.trim() || "待填写")}</p></div></section>`).join("");
  }

  private readTemplateValues(template: AnswerTemplate): TemplateValues {
    try {
      return JSON.parse(localStorage.getItem(this.templateStorageKey(template)) ?? "{}") as TemplateValues;
    } catch {
      return {};
    }
  }

  private readFormValues(form: HTMLFormElement | null): TemplateValues {
    return form ? Object.fromEntries(new FormData(form).entries()) as TemplateValues : {};
  }

  private templateStorageKey(template: AnswerTemplate): string {
    return `777plus-template-${template.id}`;
  }

  private findMaterial(id?: string): Material {
    return this.data.materials.find((material) => material.id === id) ?? this.data.materials[0] as Material;
  }

  private flashButton(target: Element | null): void {
    target?.classList.add("is-success");
    window.setTimeout(() => target?.classList.remove("is-success"), 900);
  }

  private openSidebar(): void {
    document.getElementById("appSidebar")?.classList.add("is-open");
    const backdrop = document.getElementById("sidebarBackdrop") as HTMLButtonElement | null;
    if (backdrop) backdrop.hidden = false;
  }

  private closeSidebar(): void {
    document.getElementById("appSidebar")?.classList.remove("is-open");
    const backdrop = document.getElementById("sidebarBackdrop") as HTMLButtonElement | null;
    if (backdrop) backdrop.hidden = true;
  }

  private closeOverlays(): void {
    this.closeSidebar();
    this.hideSearchResults();
    document.getElementById("collectionPane")?.classList.remove("is-open");
    document.getElementById("tocPane")?.classList.remove("is-open");
  }

  private hideSearchResults(): void {
    const panel = document.getElementById("searchResults");
    if (panel) panel.hidden = true;
  }

  private toggleTheme(): void {
    const dark = document.documentElement.dataset.theme !== "dark";
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("777plus-theme", dark ? "dark" : "light");
    this.refreshThemeIcon();
  }

  private refreshThemeIcon(): void {
    const button = document.getElementById("themeToggle");
    if (!button) return;
    button.innerHTML = `<i data-lucide="${document.documentElement.dataset.theme === "dark" ? "sun" : "moon"}"></i>`;
    createIcons({ icons: iconSet });
  }
}
