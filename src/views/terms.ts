import type { TermDefinition } from "../types";
import { escapeHtml } from "../core/text";

export function renderTermsView(definitions: TermDefinition[], selected: TermDefinition): string {
  return `
    <section class="workspace workspace--terms">
      <aside class="collection-pane" id="collectionPane">
        <div class="collection-count">${definitions.length} 个名词</div>
        <nav class="collection-list" aria-label="名词解释目录">
          ${definitions.map((definition) => `
            <a class="collection-item collection-item--topic ${definition.id === selected.id ? "is-active" : ""}" href="#/terms/${encodeURIComponent(definition.id)}">
              <span class="collection-item__title">${escapeHtml(definition.label)}</span>
            </a>
          `).join("")}
        </nav>
      </aside>
      <article class="term-pane">
        <header class="reader-header">
          <div class="reader-heading">
            <button class="icon-button reader-list-trigger" type="button" data-toggle-collection aria-label="打开名词解释目录" title="名词解释目录"><i data-lucide="panel-left-open"></i></button>
            <div><div class="eyebrow">名词解释</div><h1>${escapeHtml(selected.label)}</h1></div>
          </div>
        </header>
        <div class="term-definition">
          <p>${escapeHtml(selected.summary)}</p>
          ${selected.sections.map((section) => `
            <h2>${escapeHtml(section.number)}、${escapeHtml(section.heading)}</h2>
            ${section.key || section.body ? `<p>${section.key ? `<strong>${escapeHtml(section.key)}：</strong>` : ""}${escapeHtml(section.body)}</p>` : ""}
          `).join("")}
          ${selected.closing ? `<p>${escapeHtml(selected.closing)}</p>` : ""}
          <a href="#/keywords/${encodeURIComponent(selected.sourceTopicId)}">查看相关原文 <i data-lucide="arrow-right"></i></a>
        </div>
      </article>
    </section>
  `;
}
