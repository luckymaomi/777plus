import type { Material, ResolvedContext, Topic } from "../types";
import { normalizeText, splitMarkdownBlocks, stripMarkdown } from "./text";

export function resolveTopicContexts(topic: Topic, materials: Material[]): ResolvedContext[] {
  const materialMap = new Map(materials.map((material) => [material.id, material]));
  return topic.mappings.flatMap((mapping) => {
    const material = materialMap.get(mapping.materialId);
    if (!material) return [];
    const normalizedNeedle = normalizeText(mapping.needle);
    const blocks = splitMarkdownBlocks(material.body);
    const index = blocks.findIndex((block) => normalizeText(stripMarkdown(block)).includes(normalizedNeedle));
    if (index < 0) return [];
    let heading = "原文";
    for (let cursor = index; cursor >= 0; cursor -= 1) {
      const block = blocks[cursor];
      if (block?.startsWith("#")) {
        heading = stripMarkdown(block);
        break;
      }
    }
    const contextIndexes = [index - 1, index, index + 1].filter((cursor) => {
      const block = blocks[cursor];
      return block && (cursor === index || !block.startsWith("#"));
    });
    return [{
      ...mapping,
      material,
      block: contextIndexes.map((cursor) => blocks[cursor]).join("\n\n"),
      targetBlock: blocks[index] ?? "",
      heading,
    }];
  });
}

export function unresolvedMappings(topic: Topic, materials: Material[]): string[] {
  const resolved = resolveTopicContexts(topic, materials);
  const keys = new Set(resolved.map((item) => `${item.materialId}\u0000${item.needle}`));
  return topic.mappings
    .filter((mapping) => !keys.has(`${mapping.materialId}\u0000${mapping.needle}`))
    .map((mapping) => `${topic.label}: ${mapping.materialId} -> ${mapping.needle}`);
}
