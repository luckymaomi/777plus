import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/markdown.css";
import "./styles/responsive.css";
import { createIcons, ArrowUpRight, Crosshair, Github, Highlighter, Library, Menu, Moon, NotebookPen, Search } from "lucide";
import { App } from "./app";
import { loadAppData } from "./data";

createIcons({ icons: { ArrowUpRight, Crosshair, Github, Highlighter, Library, Menu, Moon, NotebookPen, Search } });

const main = document.getElementById("appMain");
if (!main) throw new Error("缺少应用入口");

loadAppData()
  .then((data) => new App(data, main))
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "未知错误";
    main.innerHTML = `<div class="fatal-state"><strong>材料加载失败</strong><p>${message}</p></div>`;
  });
