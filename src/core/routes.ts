import type { ModuleId, Route } from "../types";

const modules = new Set<ModuleId>(["materials", "keywords", "templates"]);

export function parseRoute(hash: string): Route {
  const value = hash.replace(/^#\/?/, "");
  const [path, query = ""] = value.split("?");
  const [rawModule, rawItem] = (path ?? "").split("/");
  const module = modules.has(rawModule as ModuleId) ? (rawModule as ModuleId) : "materials";
  const params = new URLSearchParams(query);
  return {
    module,
    itemId: rawItem ? decodeURIComponent(rawItem) : undefined,
    needle: params.get("needle") ?? undefined,
  };
}

export function routeHref(route: Route): string {
  const item = route.itemId ? `/${encodeURIComponent(route.itemId)}` : "";
  const query = route.needle ? `?needle=${encodeURIComponent(route.needle)}` : "";
  return `#/${route.module}${item}${query}`;
}
