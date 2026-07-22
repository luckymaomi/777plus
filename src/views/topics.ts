import type { Material, Topic } from "../types";
import { resolveTopicContexts } from "../core/topics";
import { renderMarkdown } from "../core/markdown";
import { escapeHtml, normalizeText } from "../core/text";

interface TopicViewOptions {
  topics: Topic[];
  materials: Material[];
  selected: Topic;
  query: string;
}

export function renderTopicsView(options: TopicViewOptions): string {
  const query = normalizeText(options.query);
  const visible = options.topics.filter((topic) => !query || normalizeText(topic.label).includes(query));
  const contexts = resolveTopicContexts(options.selected, options.materials);
  const module = "keywords";
  const moduleName = "关键词";
  return `
    <section class="workspace workspace--topics">
      <aside class="collection-pane" id="collectionPane">
        <div class="collection-tools">
          <label class="compact-search">
            <i data-lucide="search" aria-hidden="true"></i>
            <input id="topicFilter" type="search" value="${escapeHtml(options.query)}" placeholder="搜索${moduleName}" autocomplete="off">
          </label>
        </div>
        <div class="collection-count">${visible.length} 个${moduleName}</div>
        <nav class="collection-list" aria-label="${moduleName}目录">
          ${visible.map((topic) => `
            <a class="collection-item collection-item--topic ${topic.id === options.selected.id ? "is-active" : ""}" href="#/${module}/${encodeURIComponent(topic.id)}">
              <span class="collection-item__title">${escapeHtml(topic.label)}</span>
              <span class="topic-count">${topic.mappings.length}</span>
            </a>
          `).join("") || `<div class="empty-compact">没有匹配内容</div>`}
        </nav>
      </aside>
      <main class="topic-pane">
        <header class="topic-header">
          <div class="reader-heading">
            <button class="icon-button reader-list-trigger" type="button" data-toggle-collection aria-label="打开${moduleName}目录" title="${moduleName}目录"><i data-lucide="panel-left-open"></i></button>
            <div><div class="eyebrow">${moduleName}</div><h1>${escapeHtml(options.selected.label)}</h1></div>
          </div>
          <span class="result-count">${contexts.length} 处原文</span>
        </header>
        <div class="context-list">
          ${contexts.map((context, index) => `
            <article class="context-record">
              <header>
                <div>
                  <span class="context-index">${String(index + 1).padStart(2, "0")}</span>
                  <h2>${escapeHtml(context.material.title)}</h2>
                  <p>${escapeHtml(context.heading)}</p>
                </div>
                <a class="source-link" href="#/materials/${encodeURIComponent(context.materialId)}?needle=${encodeURIComponent(context.needle)}" title="打开原文">
                  <i data-lucide="arrow-up-right" aria-hidden="true"></i><span>原文</span>
                </a>
              </header>
              <div class="context-body markdown-body" data-context-needle="${escapeHtml(context.needle)}">${renderMarkdown(context.block)}</div>
            </article>
          `).join("") || `<div class="empty-state"><i data-lucide="inbox"></i><strong>暂无已确认材料</strong></div>`}
        </div>
      </main>
    </section>
  `;
}
