import type { AppData } from "../data";
import { downloadOfflineHtml } from "./html-export";

type RefreshIcons = () => void;

function setIcon(button: HTMLButtonElement, icon: "check" | "download" | "loader-circle", refreshIcons: RefreshIcons): void {
  button.innerHTML = `<i data-lucide="${icon}"></i>`;
  refreshIcons();
}

export function bindOfflineExport(data: AppData, refreshIcons: RefreshIcons): void {
  const button = document.getElementById("exportHtml") as HTMLButtonElement | null;
  button?.addEventListener("click", async () => {
    if (button.disabled) return;
    button.disabled = true;
    button.classList.add("is-busy");
    button.title = "正在生成完整离线版";
    setIcon(button, "loader-circle", refreshIcons);
    try {
      await downloadOfflineHtml(data);
      button.classList.add("is-success");
      setIcon(button, "check", refreshIcons);
    } catch (error) {
      console.error("导出完整离线版失败", error);
      window.alert(error instanceof Error ? error.message : "导出失败，请稍后重试。");
      setIcon(button, "download", refreshIcons);
    } finally {
      button.disabled = false;
      button.classList.remove("is-busy");
      button.title = "导出完整离线版";
      window.setTimeout(() => {
        button.classList.remove("is-success");
        setIcon(button, "download", refreshIcons);
      }, 1_200);
    }
  });
}
