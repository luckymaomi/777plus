import type { Material } from "../types";
import { renderMarkdown } from "../core/markdown";
import { escapeHtml, normalizeText } from "../core/text";

interface MaterialViewOptions {
  materials: Material[];
  selected: Material;
  query: string;
  category: string;
}

export function renderMaterialsView(options: MaterialViewOptions): string {
  const categories = [...new Set(options.materials.map((material) => material.category))];
  const query = normalizeText(options.query);
  const visible = options.materials.filter((material) => {
    const categoryMatch = !options.category || material.category === options.category;
    const queryMatch = !query || normalizeText(`${material.title}${material.plainText}`).includes(query);
    return categoryMatch && queryMatch;
  });
  return `
    <section class="workspace workspace--materials">
      <aside class="collection-pane" id="collectionPane">
        <div class="collection-tools">
          <label class="compact-search">
            <i data-lucide="search" aria-hidden="true"></i>
            <input id="materialFilter" type="search" value="${escapeHtml(options.query)}" placeholder="搜索素材" autocomplete="off">
          </label>
          <select id="categoryFilter" class="compact-select" aria-label="素材分类">
            <option value="">全部分类</option>
            ${categories.map((category) => `<option value="${escapeHtml(category)}" ${category === options.category ? "selected" : ""}>${escapeHtml(category)}</option>`).join("")}
          </select>
        </div>
        <div class="collection-count">${visible.length} / ${options.materials.length} 份</div>
        <nav class="collection-list" aria-label="素材目录">
          ${visible.map((material) => `
            <a class="collection-item ${material.id === options.selected.id ? "is-active" : ""}" href="#/materials/${encodeURIComponent(material.id)}" data-material-id="${material.id}">
              <span class="collection-item__title">${escapeHtml(material.title)}</span>
              <span class="collection-item__meta"><b>${escapeHtml(material.category)}</b><span>${material.characters.toLocaleString("zh-CN")} 字</span></span>
            </a>
          `).join("") || `<div class="empty-compact">没有匹配素材</div>`}
        </nav>
      </aside>
      <article class="reader-pane">
        <header class="reader-header">
          <div class="reader-heading">
            <button class="icon-button reader-list-trigger" type="button" data-toggle-collection aria-label="打开素材目录" title="素材目录"><i data-lucide="panel-left-open"></i></button>
            <div>
              <div class="eyebrow">${escapeHtml(options.selected.category)} · ${escapeHtml(options.selected.format.toUpperCase())}</div>
              <h1>${escapeHtml(options.selected.title)}</h1>
            </div>
          </div>
          <div class="reader-actions">
            <button class="icon-button" type="button" data-copy-source="${escapeHtml(options.selected.source)}" aria-label="复制来源" title="复制来源"><i data-lucide="copy"></i></button>
            <button class="icon-button" type="button" data-toggle-toc aria-label="文内目录" title="文内目录"><i data-lucide="list-tree"></i></button>
          </div>
        </header>
        <div class="reader-body">
          <div class="markdown-body" id="markdownBody">${renderMarkdown(options.selected.body)}</div>
        </div>
      </article>
      <aside class="toc-pane" id="tocPane">
        <div class="toc-title">文内目录</div>
        <nav id="tocList" class="toc-list"></nav>
      </aside>
    </section>
  `;
}
