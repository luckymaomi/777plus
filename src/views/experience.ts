import { MENG_NOTES_ID } from "../core/experience";
import { escapeHtml } from "../core/text";
import type { CuratedExperienceNotesData, ExperienceNoteEntry, ExperienceNotesData } from "../types";

type ExperienceNotesSelection = "jing" | "fan" | "meng";

export function renderExperienceNavigation(
  notes: ExperienceNotesData,
  jingNotes: CuratedExperienceNotesData,
  selectedId: string,
): string {
  const items = [
    { id: jingNotes.id, title: jingNotes.title },
    { id: notes.id, title: notes.title },
    { id: MENG_NOTES_ID, title: "孟哥笔记" },
  ];
  return `
    <section class="collection-pane" id="collectionPane">
      <div class="collection-heading">
        <span class="sidebar-label">大神经验目录</span>
        <small>${items.length} 份笔记</small>
      </div>
      <nav class="collection-list" aria-label="大神经验目录">
        ${items.map((item, index) => `
          <a class="collection-item ${item.id === selectedId ? "is-active" : ""}" href="#/experience/${encodeURIComponent(item.id)}">
            <span class="collection-index">${String(index + 1).padStart(2, "0")}</span>
            <span class="collection-item__title">${escapeHtml(item.title)}</span>
          </a>
        `).join("")}
      </nav>
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

function renderJingNotes(notes: CuratedExperienceNotesData): string {
  return `
    <section class="jing-notes" aria-label="静姐整理正文">
      <div class="jing-note-sections">
        ${notes.sections.map((section) => `
          <section class="jing-note-section" aria-labelledby="jing-${escapeHtml(section.id)}">
            <h2 id="jing-${escapeHtml(section.id)}">${escapeHtml(section.title)}</h2>
            <div class="jing-note-body">
              ${section.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
            </div>
          </section>
        `).join("")}
      </div>
    </section>
  `;
}

function renderFanNotes(notes: ExperienceNotesData): string {
  return `
    <section class="fan-notes" aria-label="帆姐考点梳理正文">
      <div class="note-legend" aria-label="有效性标记">
        <span class="note-status">仍有效</span>
        <span class="note-status is-legacy">2025口径</span>
        <span class="note-status is-outdated">已过时</span>
      </div>
      <div class="fan-note-sections">
        ${notes.sections.map((section) => `
          <section class="fan-note-section" aria-labelledby="fan-${escapeHtml(section.id)}">
            <h2 id="fan-${escapeHtml(section.id)}">${escapeHtml(section.title)}</h2>
            <div class="fan-note-entries">${section.entries.map(renderNoteEntry).join("")}</div>
          </section>
        `).join("")}
      </div>
    </section>
  `;
}

function renderMengNotes(imageUrl: string): string {
  return `
    <section class="meng-notes" aria-label="孟哥笔记正文">
      <figure class="experience-figure">
        <img src="${escapeHtml(imageUrl)}" alt="孟哥的考试重点笔记原图">
        <figcaption>孟哥重点整理原图</figcaption>
      </figure>
    </section>
  `;
}

function selectedNotes(selection: ExperienceNotesSelection, imageUrl: string, notes: ExperienceNotesData, jingNotes: CuratedExperienceNotesData): string {
  if (selection === "fan") return renderFanNotes(notes);
  if (selection === "meng") return renderMengNotes(imageUrl);
  return renderJingNotes(jingNotes);
}

export function renderExperienceView(
  imageUrl: string,
  notes: ExperienceNotesData,
  jingNotes: CuratedExperienceNotesData,
  selectedId: string,
): string {
  const selection: ExperienceNotesSelection = selectedId === notes.id ? "fan" : selectedId === MENG_NOTES_ID ? "meng" : "jing";
  const title = selection === "fan" ? notes.title : selection === "meng" ? "孟哥笔记" : jingNotes.title;
  const source = selection === "fan"
    ? `${notes.source} · ${notes.asOf}`
    : selection === "jing"
      ? `${jingNotes.source} · ${jingNotes.asOf}`
      : "孟哥重点整理原图";
  return `
    <article class="document-page experience-page content-page">
      <nav class="page-breadcrumb" aria-label="面包屑">
        <span>复习资料</span><i data-lucide="chevron-right"></i><strong>大神经验</strong>
      </nav>
      <header class="page-header">
        <div class="page-heading-row">
          <button class="icon-button reader-list-trigger" type="button" data-toggle-collection aria-label="打开大神经验目录" title="大神经验目录"><i data-lucide="panel-left-open"></i></button>
          <div>
            <h1>${escapeHtml(title)}</h1>
            <p>${escapeHtml(source)}</p>
          </div>
        </div>
      </header>

      ${selectedNotes(selection, imageUrl, notes, jingNotes)}
    </article>
  `;
}
