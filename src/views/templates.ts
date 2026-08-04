import type { AnswerTemplate, ExamFocusData, Material } from "../types";
import { escapeHtml } from "../core/text";
import { evidenceSource, resolveEvidence, renderEvidenceList } from "./evidence";

export function buildAnswerText(template: AnswerTemplate, focus: ExamFocusData, materials: Material[]): string {
  const sections = template.sections.map((section, index) => {
    const evidence = resolveEvidence(section.evidenceIds, focus).map((item) => (
      `原文依据：${evidenceSource(item, materials)}\n“${item.quote}”`
    )).join("\n");
    return `${index + 1}. ${section.heading}\n${section.body.join("\n\n")}${evidence ? `\n\n${evidence}` : ""}`;
  }).join("\n\n");
  return `${template.question}\n\n大标题：${template.title}\n\n主观题通用表述：\n${template.universal}\n\n${template.opening}\n\n${sections}\n\n${template.closing}`;
}

export function renderTemplatesNavigation(templates: AnswerTemplate[], selected: AnswerTemplate): string {
  return `
    <section class="collection-pane" id="collectionPane">
      <div class="collection-heading">
        <span class="sidebar-label">论述目录</span>
        <small>${templates.length} 套模板</small>
      </div>
      <nav class="collection-list" aria-label="答题模板目录">
        ${templates.map((template, index) => `
          <a class="collection-item ${template.id === selected.id ? "is-active" : ""}" href="#/templates/${encodeURIComponent(template.id)}">
            <span class="collection-index">${String(index + 1).padStart(2, "0")}</span>
            <span class="collection-item__title">${escapeHtml(template.label)}</span>
          </a>
        `).join("")}
      </nav>
    </section>
  `;
}

export function renderTemplatesView(selected: AnswerTemplate, focus: ExamFocusData, materials: Material[]): string {
  return `
    <article class="document-page answer-reader content-page">
      <nav class="page-breadcrumb" aria-label="面包屑">
        <span>复习资料</span><i data-lucide="chevron-right"></i><strong>答题模板</strong>
      </nav>
      <header class="page-header answer-header">
        <div class="page-heading-row">
          <button class="icon-button reader-list-trigger" type="button" data-toggle-collection aria-label="打开论述目录" title="论述目录"><i data-lucide="panel-left-open"></i></button>
          <div>
            <h1>${escapeHtml(selected.label)}</h1>
          </div>
        </div>
        <button class="icon-button" type="button" data-copy-answer aria-label="复制论述模板" title="复制论述模板"><i data-lucide="copy"></i></button>
      </header>

      <section class="content-section universal-statement answer-universal">
        <div class="section-label">主观题通用表述</div>
        <p>${escapeHtml(selected.universal)}</p>
      </section>

      <section class="answer-question">
        <span>示例题目</span>
        <h2>${escapeHtml(selected.question)}</h2>
      </section>

      <section class="answer-title-block">
        <span>大标题</span>
        <h2>${escapeHtml(selected.title)}</h2>
      </section>

      <div class="answer-prose">
        <section class="answer-opening">
          <div class="section-label">开头立论</div>
          <p>${escapeHtml(selected.opening)}</p>
        </section>
        ${selected.sections.map((section, index) => `
          <section class="answer-section">
            <header><span>${String(index + 1).padStart(2, "0")}</span><h2>${escapeHtml(section.heading)}</h2></header>
            ${section.body.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
            ${section.evidenceIds.length ? `
              <div class="answer-evidence">
                <div class="section-label">材料原文</div>
                ${renderEvidenceList(section.evidenceIds, focus, materials)}
              </div>
            ` : ""}
          </section>
        `).join("")}
        <section class="answer-closing">
          <div class="section-label">结尾收束</div>
          <p>${escapeHtml(selected.closing)}</p>
        </section>
      </div>
    </article>
  `;
}
