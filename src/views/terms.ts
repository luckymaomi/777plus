import type { TermDefinition } from "../types";
import { escapeHtml } from "../core/text";

export function renderTermsView(selected: TermDefinition): string {
  return `
    <section class="terms-page">
      <article class="term-definition">
        <header><span>名词解释</span><h1>${escapeHtml(selected.label)}</h1></header>
        <p>${escapeHtml(selected.summary)}</p>
        ${selected.sections.map((section) => `
          <h2>${escapeHtml(section.number)}. ${escapeHtml(section.heading)}</h2>
          <p><strong>${escapeHtml(section.key)}：</strong>${escapeHtml(section.body)}</p>
        `).join("")}
        <p>${escapeHtml(selected.closing)}</p>
        <a href="#/keywords/${encodeURIComponent(selected.sourceTopicId)}">查看相关原文 <i data-lucide="arrow-right"></i></a>
      </article>
    </section>
  `;
}
