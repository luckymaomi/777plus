import type { AnswerExample, Material } from "../types";
import { escapeHtml } from "../core/text";

function materialTitle(materials: Material[], materialId: string): string {
  return materials.find((material) => material.id === materialId)?.title ?? materialId;
}

function materialSource(materials: Material[], materialId: string): string {
  return materials.find((material) => material.id === materialId)?.source ?? materialId;
}

export function buildAnswerText(example: AnswerExample, materials: Material[]): string {
  const sections = example.sections.map((section, index) => {
    const paragraphs = section.paragraphs.join("\n\n");
    const citations = section.citations.map((citation) => (
      `原文：《${materialTitle(materials, citation.materialId)}》${citation.quote}`
    )).join("\n");
    return `${index + 1}. ${section.heading}\n${paragraphs}${citations ? `\n\n${citations}` : ""}`;
  }).join("\n\n");
  return `${example.question}\n\n临时抱佛脚：${example.memory.sequence.join(" -> ")}\n${example.memory.tip}\n\n${example.opening}\n\n${sections}\n\n${example.closing}`;
}

export function renderTemplatesView(examples: AnswerExample[], selected: AnswerExample, materials: Material[]): string {
  return `
    <section class="workspace workspace--answers">
      <aside class="collection-pane" id="collectionPane">
        <div class="answer-collection-heading">
          <span class="eyebrow">完整示例</span>
          <strong>${examples.length} 个答题方向</strong>
        </div>
        <nav class="collection-list" aria-label="答题模板目录">
          ${examples.map((example, index) => `
            <a class="collection-item collection-item--answer ${example.id === selected.id ? "is-active" : ""}" href="#/templates/${encodeURIComponent(example.id)}">
              <span class="answer-list-number">${String(index + 1).padStart(2, "0")}</span>
              <span class="collection-item__title">${escapeHtml(example.label)}</span>
            </a>
          `).join("")}
        </nav>
      </aside>
      <article class="answer-reader">
        <header class="answer-header">
          <div class="reader-heading">
            <button class="icon-button reader-list-trigger" type="button" data-toggle-collection aria-label="打开答题模板目录" title="答题模板目录"><i data-lucide="panel-left-open"></i></button>
            <div><div class="eyebrow">答题模板 · 完整示例</div><h1>${escapeHtml(selected.label)}</h1></div>
          </div>
          <button class="icon-button" type="button" data-copy-answer aria-label="复制示例答案" title="复制示例答案"><i data-lucide="copy"></i></button>
        </header>
        <div class="answer-document">
          <section class="answer-question">
            <span>题目</span>
            <h2>${escapeHtml(selected.question)}</h2>
          </section>
          <section class="memory-aid">
            <div class="memory-aid__heading"><span>临时抱佛脚</span><strong>记不住全文，就按这个顺序答</strong></div>
            <div class="memory-sequence">
              ${selected.memory.sequence.map((item, index) => `${index ? `<i data-lucide="arrow-right"></i>` : ""}<b>${escapeHtml(item)}</b>`).join("")}
            </div>
            <p>${escapeHtml(selected.memory.tip)}</p>
          </section>
          <div class="answer-prose">
            <p class="answer-opening">${escapeHtml(selected.opening)}</p>
            ${selected.sections.map((section, index) => `
              <section class="answer-section">
                <header><span>${String(index + 1).padStart(2, "0")}</span><h2>${escapeHtml(section.heading)}</h2></header>
                ${section.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
                ${section.citations.length ? `
                  <div class="answer-evidence">
                    ${section.citations.map((citation) => `
                      <blockquote>
                        <a href="#/materials/${encodeURIComponent(citation.materialId)}?needle=${encodeURIComponent(citation.needle)}" title="跳转到原文">
                          <p>“${escapeHtml(citation.quote)}”</p>
                        </a>
                        <footer>
                          <a href="#/materials/${encodeURIComponent(citation.materialId)}?needle=${encodeURIComponent(citation.needle)}">${escapeHtml(materialSource(materials, citation.materialId))} <i data-lucide="arrow-up-right"></i></a>
                        </footer>
                      </blockquote>
                    `).join("")}
                  </div>
                ` : ""}
              </section>
            `).join("")}
            <p class="answer-closing">${escapeHtml(selected.closing)}</p>
          </div>
        </div>
      </article>
    </section>
  `;
}
