import type { ExamFocusData, Material, OfficialEvidence } from "../types";
import { escapeHtml } from "../core/text";

export function resolveEvidence(ids: string[], focus: ExamFocusData): OfficialEvidence[] {
  const byId = new Map(focus.evidence.map((item) => [item.id, item]));
  return ids.flatMap((id) => {
    const evidence = byId.get(id);
    return evidence ? [evidence] : [];
  });
}

export function evidenceSource(evidence: OfficialEvidence, materials: Material[]): string {
  return `${evidenceMaterial(evidence, materials)} · ${evidence.heading}`;
}

function evidenceMaterial(evidence: OfficialEvidence, materials: Material[]): string {
  const material = materials.find((item) => item.id === evidence.materialId);
  if (!material) return evidence.materialId;
  return `《${material.title}》${material.status ? ` · ${material.status}` : ""}`;
}

export function renderEvidenceList(ids: string[], focus: ExamFocusData, materials: Material[]): string {
  return `
    <div class="evidence-list">
      ${resolveEvidence(ids, focus).map((evidence) => `
        <figure class="evidence-item">
          <figcaption>
            <strong>${escapeHtml(evidence.heading)}</strong>
            <span>${escapeHtml(evidenceMaterial(evidence, materials))}</span>
          </figcaption>
          <blockquote>${escapeHtml(evidence.quote)}</blockquote>
        </figure>
      `).join("")}
    </div>
  `;
}
