import {
  ArrowUpRight,
  BookMarked,
  BookOpenCheck,
  Check,
  ChevronRight,
  CircleHelp,
  Copy,
  createIcons,
  Download,
  FileText,
  Image,
  Library,
  ListChecks,
  LoaderCircle,
  Menu,
  NotebookPen,
  PanelLeftOpen,
  Quote,
  Search,
  Target,
  X,
} from "lucide";
import type { AppData } from "./data";
import type { Material, ModuleId, Route, SearchResult } from "./types";
import { parseRoute, routeHref } from "./core/routes";
import { searchAll } from "./core/search";
import { readStorage, removeStorage, writeStorage } from "./core/storage";
import { prepareMarkdown } from "./core/markdown";
import { writeClipboardText } from "./core/clipboard";
import { escapeHtml } from "./core/text";
import { renderFocusNavigation, renderFocusView } from "./views/focus";
import { renderMaterialsNavigation, renderMaterialsView } from "./views/materials";
import { renderTermsNavigation, renderTermsView } from "./views/terms";
import { buildAnswerText, renderTemplatesNavigation, renderTemplatesView } from "./views/templates";
import { renderExperienceNavigation, renderExperienceView } from "./views/experience";
import { renderEssentialsNavigation, renderEssentialsView } from "./views/essentials";
import { bindOfflineExport } from "./export/controller";

const iconSet = {
  ArrowUpRight,
  BookMarked,
  BookOpenCheck,
  Check,
  ChevronRight,
  CircleHelp,
  Copy,
  Download,
  FileText,
  Image,
  Library,
  ListChecks,
  LoaderCircle,
  Menu,
  NotebookPen,
  PanelLeftOpen,
  Quote,
  Search,
  Target,
  X,
};

const moduleNames: Record<ModuleId, string> = {
  essentials: "没招了，就只看这一个",
  focus: "考试通告",
  materials: "文献综述",
  terms: "名词解释",
  templates: "答题模板",
  experience: "大神经验",
};

export class App {
  private route: Route = parseRoute(window.location.hash);
  private materialQuery = "";

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
    bindOfflineExport(this.data, () => createIcons({ icons: iconSet }));

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
  }

  private render(): void {
    if (this.route.module === "essentials") this.renderEssentials(this.route);
    if (this.route.module === "focus") this.renderFocus();
    if (this.route.module === "materials") this.renderMaterials(this.route);
    if (this.route.module === "terms") this.renderTerms(this.route);
    if (this.route.module === "templates") this.renderTemplates(this.route);
    if (this.route.module === "experience") this.renderExperience();
    this.refreshShell();
    createIcons({ icons: iconSet });
  }

  private renderFocus(): void {
    this.setNavigation(renderFocusNavigation());
    this.main.innerHTML = renderFocusView(this.data.examFocus);
    this.bindWorkspaceControls();
    window.scrollTo({ top: 0 });
  }

  private renderEssentials(route: Route): void {
    this.setNavigation(renderEssentialsNavigation(route.itemId));
    this.main.innerHTML = renderEssentialsView(this.data.essentials);
    this.bindWorkspaceControls();
    if (route.itemId) {
      requestAnimationFrame(() => document.getElementById(`essentials-${route.itemId}`)?.scrollIntoView({ block: "start" }));
    } else {
      window.scrollTo({ top: 0 });
    }
  }

  private renderMaterials(route: Route): void {
    const selected = this.findMaterial(route.itemId);
    const options = { materials: this.data.materials, selected, query: this.materialQuery };
    this.setNavigation(renderMaterialsNavigation(options));
    this.main.innerHTML = renderMaterialsView(options);
    const filter = document.getElementById("materialFilter") as HTMLInputElement | null;
    filter?.addEventListener("input", () => {
      this.materialQuery = filter.value;
      this.renderMaterials(this.route);
      (document.getElementById("materialFilter") as HTMLInputElement | null)?.focus();
    });
    this.bindWorkspaceControls();
    const body = document.getElementById("markdownBody");
    if (body) prepareMarkdown(body, route.needle);
    window.scrollTo({ top: 0 });
  }

  private renderTerms(route: Route): void {
    const selected = this.data.terms.find((definition) => definition.id === route.itemId) ?? this.data.terms[0];
    if (!selected) return;
    this.setNavigation(renderTermsNavigation(this.data.terms, selected));
    this.main.innerHTML = renderTermsView(selected, this.data.examFocus, this.data.materials);
    this.bindWorkspaceControls();
    window.scrollTo({ top: 0 });
  }

  private renderTemplates(route: Route): void {
    const selected = this.data.templates.find((template) => template.id === route.itemId) ?? this.data.templates[0];
    if (!selected) return;
    this.setNavigation(renderTemplatesNavigation(this.data.templates, selected));
    this.main.innerHTML = renderTemplatesView(selected, this.data.examFocus, this.data.materials);
    this.bindWorkspaceControls();
    document.querySelector("[data-copy-answer]")?.addEventListener("click", () => {
      void writeClipboardText(buildAnswerText(selected, this.data.examFocus, this.data.materials))
        .then(() => this.flashButton(document.querySelector("[data-copy-answer]")));
    });
    window.scrollTo({ top: 0 });
  }

  private renderExperience(): void {
    this.setNavigation(renderExperienceNavigation(this.data.experienceNotes));
    this.main.innerHTML = renderExperienceView(this.data.experienceImage, this.data.experienceNotes);
    this.bindWorkspaceControls();
    window.scrollTo({ top: 0 });
  }

  private bindWorkspaceControls(): void {
    document.querySelector("[data-toggle-collection]")?.addEventListener("click", () => this.openSidebar());
    document.querySelector("[data-copy-source]")?.addEventListener("click", (event) => {
      const button = event.currentTarget as HTMLElement;
      void writeClipboardText(button.dataset.copySource ?? "").then(() => this.flashButton(button));
    });
  }

  private setNavigation(html: string): void {
    const navigation = document.getElementById("sectionNavigation");
    if (!navigation) throw new Error("缺少模块导航入口");
    navigation.innerHTML = html;
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
    if (this.route.module !== "focus" || this.route.itemId || readStorage("777plus-guide-dismissed") === "1") return;
    const dialog = document.getElementById("studyGuide") as HTMLDialogElement | null;
    requestAnimationFrame(() => dialog?.showModal());
  }

  private closeGuide(dialog: HTMLDialogElement | null): void {
    const remember = document.getElementById("guideRemember") as HTMLInputElement | null;
    if (remember?.checked) writeStorage("777plus-guide-dismissed", "1");
    else removeStorage("777plus-guide-dismissed");
    dialog?.close();
  }

  private renderSearchResults(query: string): void {
    const panel = document.getElementById("searchResults");
    if (!panel) return;
    const results = searchAll(query, this.data);
    if (!query.trim()) {
      panel.hidden = true;
      return;
    }
    panel.innerHTML = results.length
      ? results.map((result) => this.searchResultHtml(result)).join("")
      : `<div class="search-empty">没有匹配内容</div>`;
    panel.hidden = false;
    createIcons({ icons: iconSet });
  }

  private searchResultHtml(result: SearchResult): string {
    const href = routeHref({ module: result.module, itemId: result.id, needle: result.needle });
    const icon = {
      material: "file-text",
      essential: "book-open-check",
      focus: "target",
      term: "book-marked",
      template: "notebook-pen",
      experience: "file-text",
    }[result.type];
    return `<a class="search-result" href="${href}"><i data-lucide="${icon}"></i><span><b>${escapeHtml(result.title)}</b><small>${escapeHtml(result.meta)} · ${escapeHtml(result.snippet)}</small></span><i data-lucide="arrow-up-right"></i></a>`;
  }

  private refreshShell(): void {
    document.querySelectorAll<HTMLElement>("[data-module-link]").forEach((link) => {
      link.classList.toggle("is-active", link.dataset.moduleLink === this.route.module);
    });
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
  }

  private hideSearchResults(): void {
    const panel = document.getElementById("searchResults");
    if (panel) panel.hidden = true;
  }

}
