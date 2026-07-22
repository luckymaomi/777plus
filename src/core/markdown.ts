import DOMPurify from "dompurify";
import { marked } from "marked";
import { normalizeText } from "./text";

marked.setOptions({ gfm: true, breaks: false });

export function renderMarkdown(markdown: string): string {
  return DOMPurify.sanitize(marked.parse(markdown) as string, {
    USE_PROFILES: { html: true },
  });
}

export function prepareMarkdown(container: HTMLElement, needle?: string, scrollToMatch = true): void {
  const usedIds = new Set<string>();
  container.querySelectorAll<HTMLElement>("h1, h2, h3").forEach((heading, index) => {
    const base = heading.textContent?.trim().replace(/\s+/g, "-").slice(0, 48) || `section-${index + 1}`;
    let id = base;
    let suffix = 2;
    while (usedIds.has(id)) id = `${base}-${suffix++}`;
    usedIds.add(id);
    heading.id = id;
  });
  container.querySelectorAll("table").forEach((table) => {
    if (table.parentElement?.classList.contains("table-scroll")) return;
    const wrapper = document.createElement("div");
    wrapper.className = "table-scroll";
    table.parentNode?.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  });
  if (!needle) return;
  const normalizedNeedle = normalizeText(needle);
  const target = [...container.querySelectorAll<HTMLElement>("p, li, h1, h2, h3, td")]
    .find((node) => normalizeText(node.textContent ?? "").includes(normalizedNeedle));
  if (target) {
    target.classList.add("evidence-hit");
    if (scrollToMatch) requestAnimationFrame(() => target.scrollIntoView({ block: "center", behavior: "smooth" }));
  }
}

export function collectHeadings(container: HTMLElement): Array<{ id: string; text: string; level: number }> {
  return [...container.querySelectorAll<HTMLElement>("h1, h2, h3")].map((heading) => ({
    id: heading.id,
    text: heading.textContent?.trim() ?? "",
    level: Number(heading.tagName.slice(1)),
  }));
}
