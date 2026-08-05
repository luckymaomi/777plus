import type { ExamFocusData, Material, TermDefinition } from "../types";
import { escapeHtml } from "../core/text";
import { renderEvidenceList } from "./evidence";

export function renderTermsNavigation(definitions: TermDefinition[], selected: TermDefinition): string {
  return `
    <section class="collection-pane" id="collectionPane">
      <div class="collection-heading">
        <span class="sidebar-label">名词目录</span>
        <small>${definitions.length} 个名词</small>
      </div>
      <nav class="collection-list" aria-label="名词解释目录">
        ${definitions.map((definition, index) => `
          <a class="collection-item ${definition.id === selected.id ? "is-active" : ""}" href="#/terms/${encodeURIComponent(definition.id)}">
            <span class="collection-index">${String(index + 1).padStart(2, "0")}</span>
            <span class="collection-item__title">${escapeHtml(definition.label)}</span>
          </a>
        `).join("")}
      </nav>
    </section>
  `;
}

export function renderTermsView(selected: TermDefinition, focus: ExamFocusData, materials: Material[]): string {
  return `
    <article class="document-page term-pane content-page">
      <nav class="page-breadcrumb" aria-label="面包屑">
        <span>复习资料</span><i data-lucide="chevron-right"></i><strong>名词解释</strong>
      </nav>
      <header class="page-header">
        <div class="page-heading-row">
          <button class="icon-button reader-list-trigger" type="button" data-toggle-collection aria-label="打开名词目录" title="名词目录"><i data-lucide="panel-left-open"></i></button>
          <div>
            <h1>${escapeHtml(selected.label)}</h1>
          </div>
        </div>
      </header>

      <section class="content-section universal-statement term-universal">
        <p><mark class="inline-anchor">主观题通用表述</mark>${escapeHtml(selected.universal)}</p>
      </section>

      <section class="content-section term-definition">
        <p><mark class="inline-anchor">名词解释</mark>${escapeHtml(selected.summary)}</p>
      </section>

      ${selected.facts?.length ? `
        <section class="content-section term-facts" aria-label="关键数据">
          <h2>关键数据</h2>
          <dl>
            ${selected.facts.map((fact) => `
              <div>
                <dt>${escapeHtml(fact.value)}</dt>
                <dd>${escapeHtml(fact.label)}<small>${escapeHtml(fact.asOf)}</small></dd>
              </div>
            `).join("")}
          </dl>
        </section>
      ` : ""}

      <section class="content-section term-points">
        <div class="section-label"><i data-lucide="list-checks"></i>必记要点</div>
        <ol>${selected.points.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ol>
      </section>

      <section class="content-section term-evidence">
        <div class="section-label"><i data-lucide="quote"></i>材料原文</div>
        ${renderEvidenceList(selected.evidenceIds, focus, materials)}
      </section>
    </article>
  `;
}
