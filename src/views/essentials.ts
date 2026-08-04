import type { EssentialsData } from "../types";
import { escapeHtml } from "../core/text";

const sections = [
  { id: "knowledge", label: "核心知识" },
  { id: "numbers", label: "数字速记" },
  { id: "keywords", label: "关键词" },
  { id: "framework", label: "答题骨架" },
  { id: "phrases", label: "万能表述" },
] as const;

export function renderEssentialsNavigation(activeId?: string): string {
  return `
    <section class="collection-pane" id="collectionPane">
      <div class="collection-heading">
        <span class="sidebar-label">冲刺目录</span>
        <small>${sections.length} 部分</small>
      </div>
      <nav class="collection-list" aria-label="冲刺目录">
        ${sections.map((section, index) => `
          <a class="collection-item ${section.id === activeId ? "is-active" : ""}" href="#/essentials/${section.id}">
            <span class="collection-index">${String(index + 1).padStart(2, "0")}</span>
            <span class="collection-item__title">${section.label}</span>
          </a>
        `).join("")}
      </nav>
    </section>
  `;
}

export function renderEssentialsView(data: EssentialsData): string {
  return `
    <article class="document-page essentials-page content-page">
      <nav class="page-breadcrumb" aria-label="面包屑">
        <span>复习资料</span><i data-lucide="chevron-right"></i><strong>${escapeHtml(data.title)}</strong>
      </nav>
      <header class="page-header">
        <div class="page-heading-row">
          <button class="icon-button reader-list-trigger" type="button" data-toggle-collection aria-label="打开冲刺目录" title="冲刺目录"><i data-lucide="panel-left-open"></i></button>
          <div><h1>${escapeHtml(data.title)}</h1></div>
        </div>
      </header>

      <section class="essentials-section" id="essentials-knowledge">
        <header class="essentials-section__header"><span>01</span><h2>核心知识</h2></header>
        <div class="essentials-knowledge-list">
          ${data.knowledge.map((item) => `
            <article class="essentials-knowledge-item">
              <h3>${escapeHtml(item.title)}</h3>
              <p>${escapeHtml(item.summary)}</p>
              <ul>${item.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul>
            </article>
          `).join("")}
        </div>
      </section>

      <section class="essentials-section" id="essentials-numbers">
        <header class="essentials-section__header"><span>02</span><h2>数字速记</h2></header>
        <dl class="essentials-number-grid">
          ${data.numbers.map((item) => `
            <div>
              <dt>${escapeHtml(item.value)}</dt>
              <dd>${escapeHtml(item.label)}<small>${escapeHtml(item.asOf)}</small></dd>
            </div>
          `).join("")}
        </dl>
      </section>

      <section class="essentials-section" id="essentials-keywords">
        <header class="essentials-section__header"><span>03</span><h2>关键词</h2></header>
        <div class="essentials-keyword-list">
          ${data.keywordGroups.map((group) => `
            <section class="essentials-keyword-group">
              <h3>${escapeHtml(group.label)}</h3>
              <div>${group.keywords.map((keyword) => `<span>${escapeHtml(keyword)}</span>`).join("")}</div>
            </section>
          `).join("")}
        </div>
      </section>

      <section class="essentials-section" id="essentials-framework">
        <header class="essentials-section__header"><span>04</span><h2>五步答题骨架</h2></header>
        <ol class="essentials-answer-steps">
          ${data.answerSteps.map((step) => `
            <li><h3>${escapeHtml(step.heading)}</h3><p>${escapeHtml(step.body)}</p></li>
          `).join("")}
        </ol>
      </section>

      <section class="essentials-section" id="essentials-phrases">
        <header class="essentials-section__header"><span>05</span><h2>万能表述</h2></header>
        <div class="essentials-phrase-list">
          ${data.phrases.map((phrase) => `
            <section class="essentials-phrase">
              <h3>${escapeHtml(phrase.label)}</h3>
              <p>${escapeHtml(phrase.text)}</p>
            </section>
          `).join("")}
        </div>
      </section>
    </article>
  `;
}
