import type { AnswerExample, TermDefinition, Topic } from "../types";
import { escapeHtml } from "../core/text";

const anchorGroups = [
  { label: "安全主线", ids: ["two-focus-one-prevention", "group-safety-battle", "seven-safety-systems"] },
  { label: "发展主线", ids: ["1314-strategy", "global-flight", "high-quality-development"] },
];

export function renderSuperView(terms: TermDefinition[], topics: Topic[], templates: AnswerExample[]): string {
  const topicMap = new Map(topics.map((topic) => [topic.id, topic]));
  const priorityTopics = topics.slice(0, 8);
  const firstTerm = terms[0];
  return `
    <section class="super-view">
      <div class="super-content">
        <header class="super-header">
          <div><span class="eyebrow">超能模式</span><h1>5 分钟冲刺</h1><p>先记名词和总纲，再过重点，最后背答题顺序。</p></div>
          <div class="super-timing" aria-label="五分钟复习安排">
            <span><b>01:00</b> 名词总纲</span>
            <span><b>01:30</b> 八个重点</span>
            <span><b>02:30</b> 五类题型</span>
          </div>
        </header>

        <section class="super-section super-notes">
          <div class="super-section__heading"><div><span>01</span><h2>孟哥重点</h2></div><small>手写重点总览</small></div>
          <a class="super-notes__image" href="./assets/meng-key-points.jpg" target="_blank" rel="noopener" title="打开孟哥重点原图">
            <img src="./assets/meng-key-points.jpg" width="1746" height="1440" loading="lazy" decoding="async" alt="孟哥手写重点总览">
          </a>
        </section>

        ${firstTerm ? `
          <section class="super-section super-term">
            <div class="super-section__heading"><div><span>02</span><h2>先记“一三一四”</h2></div><a href="#/terms/${encodeURIComponent(firstTerm.id)}" data-open-normal>完整解释 <i data-lucide="arrow-up-right"></i></a></div>
            <p>${escapeHtml(firstTerm.summary)}</p>
            <div class="super-term-grid">
              ${firstTerm.sections.map((section) => `<div><small>${escapeHtml(section.heading)}</small><strong>${escapeHtml(section.key)}</strong></div>`).join("")}
            </div>
          </section>
        ` : ""}

        <section class="super-section">
          <div class="super-section__heading"><div><span>03</span><h2>两条主线</h2></div></div>
          <div class="super-anchor-grid">
            ${anchorGroups.map((group) => `
              <div class="super-anchor"><strong>${group.label}</strong><div>${group.ids.map((id, index) => {
                const topic = topicMap.get(id);
                if (!topic) return "";
                return `${index ? `<i data-lucide="arrow-right"></i>` : ""}<a href="#/keywords/${encodeURIComponent(topic.id)}" data-open-normal>${escapeHtml(topic.label)}</a>`;
              }).join("")}</div></div>
            `).join("")}
          </div>
        </section>

        <section class="super-section">
          <div class="super-section__heading"><div><span>04</span><h2>八个优先关键词</h2></div><small>点开即看原文上下文</small></div>
          <div class="super-keywords">
            ${priorityTopics.map((topic) => `<a href="#/keywords/${encodeURIComponent(topic.id)}" data-open-normal><strong>${escapeHtml(topic.label)}</strong><span>${topic.mappings.length} 处原文</span><i data-lucide="arrow-up-right"></i></a>`).join("")}
          </div>
        </section>

        <section class="super-section">
          <div class="super-section__heading"><div><span>05</span><h2>五类题只记顺序</h2></div></div>
          <div class="super-templates">
            ${templates.map((template, index) => `
              <a href="#/templates/${encodeURIComponent(template.id)}" data-open-normal>
                <span>${String(index + 1).padStart(2, "0")}</span>
                <div><strong>${escapeHtml(template.label)}</strong><p>${template.memory.sequence.map(escapeHtml).join(" → ")}</p></div>
                <i data-lucide="arrow-up-right"></i>
              </a>
            `).join("")}
          </div>
        </section>

        <section class="super-section super-fallback">
          <div class="super-section__heading"><div><span>06</span><h2>记不住就按这个答</h2></div></div>
          <div class="super-fallback-grid">
            <div><small>论述题</small><strong>业务痛点 / 岗位难题 → 原因分析 → 解决思路 → 岗位落实</strong></div>
            <div><small>自拟题</small><strong>主体理解 → 反面案例 → 困难分析 → 解决思路 → 岗位落实</strong></div>
          </div>
        </section>
      </div>
    </section>
  `;
}
