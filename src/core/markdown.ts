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
