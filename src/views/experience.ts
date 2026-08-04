import { escapeHtml } from "../core/text";

export function renderExperienceNavigation(): string {
  return `
    <section class="collection-pane">
      <div class="collection-heading">
        <span class="sidebar-label">内容</span>
        <small>1 张原图</small>
      </div>
      <div class="collection-static">
        <i data-lucide="image"></i>
        <span>孟哥笔记</span>
      </div>
    </section>
  `;
}

export function renderExperienceView(imageUrl: string): string {
  return `
    <article class="document-page experience-page content-page">
      <nav class="page-breadcrumb" aria-label="面包屑">
        <span>复习资料</span><i data-lucide="chevron-right"></i><strong>大神经验</strong>
      </nav>
      <header class="page-header">
        <div class="page-heading-row">
          <button class="icon-button reader-list-trigger" type="button" data-toggle-collection aria-label="打开导航" title="导航"><i data-lucide="panel-left-open"></i></button>
          <div>
            <h1>孟哥的笔记</h1>
          </div>
        </div>
      </header>
      <figure class="experience-figure">
        <img src="${escapeHtml(imageUrl)}" alt="孟哥的考试重点笔记原图">
        <figcaption>孟哥重点整理原图</figcaption>
      </figure>
    </article>
  `;
}
