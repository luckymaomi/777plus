import type { ExamFocusData } from "../types";
import { escapeHtml } from "../core/text";

export function renderFocusNavigation(): string {
  return "";
}

export function renderFocusView(focus: ExamFocusData): string {
  return `
    <article class="document-page focus-page content-page">
      <nav class="page-breadcrumb" aria-label="面包屑">
        <span>复习资料</span><i data-lucide="chevron-right"></i><strong>考前重点</strong>
      </nav>
      <header class="page-header">
        <div class="page-heading-row">
          <div>
            <h1>考前重点</h1>
          </div>
        </div>
      </header>

      <section class="focus-notice" aria-labelledby="exam-notice-title">
        <h2 id="exam-notice-title">考试范围通告</h2>
        <p>${escapeHtml(focus.notice)}</p>
      </section>
    </article>
  `;
}
