import type { Material } from "../types";
import { renderMarkdown } from "../core/markdown";
import { escapeHtml, normalizeText } from "../core/text";

export interface MaterialViewOptions {
  materials: Material[];
  selected: Material;
  query: string;
}

function visibleMaterials(options: MaterialViewOptions): Material[] {
  const query = normalizeText(options.query);
  return options.materials.filter((material) => (
    !query || normalizeText(`${material.title}${material.source}${material.plainText}`).includes(query)
  ));
}

export function renderMaterialsNavigation(options: MaterialViewOptions): string {
  const visible = visibleMaterials(options);
  return `
    <section class="collection-pane" id="collectionPane">
      <div class="collection-heading">
        <span class="sidebar-label">文献目录</span>
        <small>${visible.length} / ${options.materials.length}</small>
      </div>
      <div class="collection-tools">
        <label class="compact-search">
          <i data-lucide="search" aria-hidden="true"></i>
          <input id="materialFilter" type="search" value="${escapeHtml(options.query)}" placeholder="搜索文献" autocomplete="off">
        </label>
      </div>
      <nav class="collection-list" aria-label="文献目录">
        ${visible.map((material) => `
          <a class="collection-item collection-item--material ${material.id === options.selected.id ? "is-active" : ""}" href="#/materials/${encodeURIComponent(material.id)}">
            <span class="collection-item__title">${escapeHtml(material.title)}</span>
            <span class="collection-item__meta">${escapeHtml(material.format.toUpperCase())}${material.status ? ` · ${escapeHtml(material.status)}` : ""}</span>
          </a>
        `).join("") || `<div class="empty-compact">没有匹配文献</div>`}
      </nav>
    </section>
  `;
}

export function renderMaterialsView(options: MaterialViewOptions): string {
  return `
    <article class="document-page reader-pane content-page">
      <nav class="page-breadcrumb" aria-label="面包屑">
        <span>复习资料</span><i data-lucide="chevron-right"></i><strong>文献综述</strong>
      </nav>
      <header class="page-header reader-header">
        <div class="page-heading-row">
          <button class="icon-button reader-list-trigger" type="button" data-toggle-collection aria-label="打开文献目录" title="文献目录"><i data-lucide="panel-left-open"></i></button>
          <div>
            <span class="page-kicker">${escapeHtml(options.selected.format.toUpperCase())}${options.selected.status ? ` · ${escapeHtml(options.selected.status)}` : ""}</span>
            <h1>${escapeHtml(options.selected.title)}</h1>
            <p>${escapeHtml(options.selected.source)}</p>
          </div>
        </div>
        <button class="icon-button" type="button" data-copy-source="${escapeHtml(options.selected.source)}" aria-label="复制来源" title="复制来源"><i data-lucide="copy"></i></button>
      </header>
      <div class="reader-body">
        <div class="markdown-body" id="markdownBody">${renderMarkdown(options.selected.body)}</div>
      </div>
    </article>
  `;
}
