import type { AppData } from "../data";
import { downloadOfflineHtml } from "./html-export";

type RefreshIcons = () => void;

function setState(
  button: HTMLButtonElement,
  icon: "check" | "download" | "loader-circle",
  label: string,
  refreshIcons: RefreshIcons,
): void {
  button.innerHTML = `<i data-lucide="${icon}"></i><span>${label}</span>`;
  button.ariaLabel = label;
  refreshIcons();
}

export function bindOfflineExport(data: AppData, refreshIcons: RefreshIcons): void {
  const button = document.getElementById("exportHtml") as HTMLButtonElement | null;
  button?.addEventListener("click", async () => {
    if (button.disabled) return;
    button.disabled = true;
    button.classList.add("is-busy");
    button.title = "正在生成完整离线版";
    setState(button, "loader-circle", "正在生成", refreshIcons);
    try {
      await downloadOfflineHtml(data);
      button.classList.add("is-success");
      setState(button, "check", "已下载", refreshIcons);
    } catch (error) {
      console.error("导出完整离线版失败", error);
      window.alert(error instanceof Error ? error.message : "导出失败，请稍后重试。");
      setState(button, "download", "完整离线版", refreshIcons);
    } finally {
      button.disabled = false;
      button.classList.remove("is-busy");
      button.title = "下载完整离线版";
      window.setTimeout(() => {
        button.classList.remove("is-success");
        setState(button, "download", "完整离线版", refreshIcons);
      }, 1_200);
    }
  });
}
