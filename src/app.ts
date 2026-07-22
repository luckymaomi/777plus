import { createIcons, ArrowRight, ArrowUpRight, CircleHelp, Copy, FileText, Github, Highlighter, Inbox, Library, Menu, Moon, NotebookPen, PanelLeftOpen, Plane, Search, Sun, X } from "lucide";
import type { AppData } from "./data";
import type { Material, ModuleId, Route, SearchResult } from "./types";
import { parseRoute, routeHref } from "./core/routes";
import { searchAll } from "./core/search";
import { prepareMarkdown } from "./core/markdown";
import { escapeHtml } from "./core/text";
import { renderMaterialsView } from "./views/materials";
import { renderTopicsView } from "./views/topics";
import { buildAnswerText, renderTemplatesView } from "./views/templates";

const iconSet = { ArrowRight, ArrowUpRight, CircleHelp, Copy, FileText, Github, Highlighter, Inbox, Library, Menu, Moon, NotebookPen, PanelLeftOpen, Plane, Search, Sun, X };
const moduleNames: Record<ModuleId, string> = { materials: "文献综述", keywords: "关键词", templates: "答题模板" };

export class App {
  private route: Route = parseRoute(window.location.hash);
  private materialQuery = "";
  private materialCategory = "";
  private topicQuery = "";

  constructor(private readonly data: AppData, private readonly main: HTMLElement) {
    this.bindShell();
    this.render();
    this.bindGuide();
    this.maybeOpenGuide();
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
    if (route.module === "keywords") this.renderTopicModule(route);
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
    if (body) prepareMarkdown(body, route.needle);
  }

  private renderTopicModule(route: Route): void {
    const topics = this.data.topics;
    const selected = topics.find((topic) => topic.id === route.itemId) ?? topics[0];
    if (!selected) return;
    this.main.innerHTML = renderTopicsView({
      topics,
      materials: this.data.materials,
      selected,
      query: this.topicQuery,
    });
    const filter = document.getElementById("topicFilter") as HTMLInputElement | null;
    filter?.addEventListener("input", () => {
      this.topicQuery = filter.value;
      this.renderTopicModule(this.route);
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
    this.main.innerHTML = renderTemplatesView(this.data.templates, selected, this.data.materials);
    this.bindWorkspaceControls();
    document.querySelector("[data-copy-answer]")?.addEventListener("click", () => {
      void navigator.clipboard.writeText(buildAnswerText(selected, this.data.materials));
      this.flashButton(document.querySelector("[data-copy-answer]"));
    });
  }

  private bindWorkspaceControls(): void {
    document.querySelector("[data-toggle-collection]")?.addEventListener("click", () => {
      document.getElementById("collectionPane")?.classList.toggle("is-open");
    });
    document.querySelector("[data-copy-source]")?.addEventListener("click", (event) => {
      const button = event.currentTarget as HTMLElement;
      void navigator.clipboard.writeText(button.dataset.copySource ?? "");
      this.flashButton(button);
    });
  }

  private bindGuide(): void {
    const dialog = document.getElementById("studyGuide") as HTMLDialogElement | null;
    document.getElementById("guideOpen")?.addEventListener("click", () => dialog?.showModal());
    document.getElementById("guideClose")?.addEventListener("click", () => this.closeGuide(dialog));
    document.getElementById("guideStart")?.addEventListener("click", () => this.closeGuide(dialog));
    dialog?.addEventListener("click", (event) => {
      if (event.target === dialog) this.closeGuide(dialog);
    });
  }

  private maybeOpenGuide(): void {
    if (this.route.module !== "materials" || localStorage.getItem("777plus-guide-dismissed") === "1") return;
    const dialog = document.getElementById("studyGuide") as HTMLDialogElement | null;
    requestAnimationFrame(() => dialog?.showModal());
  }

  private closeGuide(dialog: HTMLDialogElement | null): void {
    const remember = document.getElementById("guideRemember") as HTMLInputElement | null;
    if (remember?.checked) localStorage.setItem("777plus-guide-dismissed", "1");
    else localStorage.removeItem("777plus-guide-dismissed");
    dialog?.close();
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
    document.title = `${moduleNames[this.route.module]} · 777plus`;
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
