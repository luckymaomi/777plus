import { readStorage, writeStorage } from "./storage";

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "777plus-theme";

const themeColors: Record<Theme, string> = {
  light: "#ffffff",
  dark: "#121315",
};

export function resolveTheme(value: string | null): Theme {
  return value === "dark" ? "dark" : "light";
}

export function applyTheme(theme: Theme, persist = false): void {
  document.documentElement.dataset.theme = theme;
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute("content", themeColors[theme]);

  const button = document.getElementById("themeToggle") as HTMLButtonElement | null;
  if (button) {
    const dark = theme === "dark";
    const label = dark ? "切换至白天模式" : "切换至夜间模式";
    button.innerHTML = `<i data-lucide="${dark ? "sun" : "moon"}" aria-hidden="true"></i>`;
    button.ariaLabel = label;
    button.title = label;
    button.setAttribute("aria-pressed", String(dark));
  }

  if (persist) writeStorage(THEME_STORAGE_KEY, theme);
}

export function initializeTheme(): void {
  applyTheme(resolveTheme(readStorage(THEME_STORAGE_KEY)));
}

export function toggleTheme(): void {
  const nextTheme: Theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(nextTheme, true);
}
