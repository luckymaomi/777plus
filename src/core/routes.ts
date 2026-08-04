import type { ModuleId, Route } from "../types";

const modules = new Set<ModuleId>(["focus", "materials", "terms", "templates", "experience"]);

export function parseRoute(hash: string): Route {
  const value = hash.replace(/^#\/?/, "");
  const [path, query = ""] = value.split("?");
  const [rawModule, rawItem] = (path ?? "").split("/");
  if (!modules.has(rawModule as ModuleId)) return { module: "focus" };
  const module = rawModule as ModuleId;
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
