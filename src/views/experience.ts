import { escapeHtml } from "../core/text";
import type { ExperienceNoteEntry, ExperienceNotesData } from "../types";

export function renderExperienceNavigation(notes: ExperienceNotesData): string {
  return `
    <section class="collection-pane">
      <div class="collection-heading">
        <span class="sidebar-label">内容</span>
        <small>2 份笔记</small>
      </div>
      <div class="collection-static">
        <i data-lucide="file-text"></i>
        <span>${escapeHtml(notes.title)}</span>
      </div>
      <div class="collection-static experience-nav-item">
        <i data-lucide="image"></i>
        <span>孟哥笔记</span>
      </div>
    </section>
  `;
}

function renderNoteEntry(entry: ExperienceNoteEntry): string {
  const outdated = entry.status === "outdated";
  const status = entry.status === "current" ? "仍有效" : entry.status === "outdated" ? "已过时" : "2025口径";
  const paragraphs = entry.paragraphs.map((paragraph) => (
    `<p>${outdated ? `<s>${escapeHtml(paragraph)}</s>` : escapeHtml(paragraph)}</p>`
  )).join("");
  return `
    <article class="fan-note-entry is-${entry.status}">
      <header>
        <h3>${escapeHtml(entry.heading)}</h3>
        <span class="note-status">${status}</span>
      </header>
      <div>${paragraphs}</div>
    </article>
  `;
}

export function renderExperienceView(imageUrl: string, notes: ExperienceNotesData): string {
  return `
    <article class="document-page experience-page content-page">
      <nav class="page-breadcrumb" aria-label="面包屑">
        <span>复习资料</span><i data-lucide="chevron-right"></i><strong>大神经验</strong>
      </nav>
      <header class="page-header">
        <div class="page-heading-row">
          <button class="icon-button reader-list-trigger" type="button" data-toggle-collection aria-label="打开导航" title="导航"><i data-lucide="panel-left-open"></i></button>
          <div>
            <h1>大神经验</h1>
          </div>
        </div>
      </header>

      <section class="fan-notes" aria-labelledby="fanNotesTitle">
        <header class="experience-section-header">
          <div>
            <h2 id="fanNotesTitle">${escapeHtml(notes.title)}</h2>
            <p>${escapeHtml(notes.source)} · ${escapeHtml(notes.asOf)}</p>
          </div>
          <div class="note-legend" aria-label="有效性标记">
            <span class="note-status">仍有效</span>
            <span class="note-status is-legacy">2025口径</span>
            <span class="note-status is-outdated">已过时</span>
          </div>
        </header>
        <div class="fan-note-sections">
          ${notes.sections.map((section) => `
            <section class="fan-note-section" aria-labelledby="fan-${escapeHtml(section.id)}">
              <h2 id="fan-${escapeHtml(section.id)}">${escapeHtml(section.title)}</h2>
              <div class="fan-note-entries">${section.entries.map(renderNoteEntry).join("")}</div>
            </section>
          `).join("")}
        </div>
      </section>

      <section class="meng-notes" aria-labelledby="mengNotesTitle">
        <header class="experience-section-header">
          <h2 id="mengNotesTitle">孟哥的笔记</h2>
        </header>
        <figure class="experience-figure">
          <img src="${escapeHtml(imageUrl)}" alt="孟哥的考试重点笔记原图">
          <figcaption>孟哥重点整理原图</figcaption>
        </figure>
      </section>
    </article>
  `;
}
