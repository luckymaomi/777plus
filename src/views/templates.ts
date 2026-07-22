import type { AnswerTemplate } from "../types";
import { escapeHtml } from "../core/text";

export type TemplateValues = Record<string, string>;

export function buildAnswerOutline(template: AnswerTemplate, values: TemplateValues): string {
  return template.fields
    .map((field, index) => `${index + 1}. ${field.label}\n${values[field.id]?.trim() || ""}`)
    .join("\n\n");
}

export function renderTemplatesView(templates: AnswerTemplate[], selected: AnswerTemplate, values: TemplateValues): string {
  return `
    <section class="template-workspace">
      <header class="template-header">
        <div><div class="eyebrow">答题模板</div><h1>${escapeHtml(selected.label)}</h1></div>
        <div class="template-switch" role="tablist" aria-label="模板类型">
          ${templates.map((template) => `<a href="#/templates/${template.id}" role="tab" aria-selected="${template.id === selected.id}" class="${template.id === selected.id ? "is-active" : ""}">${escapeHtml(template.label)}</a>`).join("")}
        </div>
      </header>
      <div class="template-grid">
        <form class="template-form" id="templateForm">
          ${selected.fields.map((field, index) => `
            <label class="answer-field">
              <span><b>${String(index + 1).padStart(2, "0")}</b>${escapeHtml(field.label)}</span>
              <textarea name="${field.id}" rows="4" placeholder="填写${escapeHtml(field.label)}">${escapeHtml(values[field.id] ?? "")}</textarea>
            </label>
          `).join("")}
        </form>
        <article class="answer-preview">
          <header><span>答案骨架</span><div><button class="icon-button" type="button" data-reset-template aria-label="清空" title="清空"><i data-lucide="rotate-ccw"></i></button><button class="icon-button" type="button" data-copy-template aria-label="复制答案骨架" title="复制"><i data-lucide="copy"></i></button></div></header>
          <div id="answerOutline" class="answer-outline">
            ${selected.fields.map((field, index) => `<section><span>${String(index + 1).padStart(2, "0")}</span><div><h2>${escapeHtml(field.label)}</h2><p>${escapeHtml(values[field.id]?.trim() || "待填写")}</p></div></section>`).join("")}
          </div>
        </article>
      </div>
    </section>
  `;
}
