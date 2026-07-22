import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/shell.css";
import "./styles/search.css";
import "./styles/guide.css";
import "./styles/collection.css";
import "./styles/reader.css";
import "./styles/mode.css";
import "./styles/terms.css";
import "./styles/super.css";
import "./styles/super-notes.css";
import "./styles/topics.css";
import "./styles/answers.css";
import "./styles/markdown.css";
import "./styles/responsive.css";
import { createIcons, ArrowRight, ArrowUpRight, BookMarked, CircleHelp, Github, Highlighter, Library, Menu, Moon, NotebookPen, Plane, Search, X } from "lucide";
import { App } from "./app";
import { loadAppData } from "./data";

createIcons({ icons: { ArrowRight, ArrowUpRight, BookMarked, CircleHelp, Github, Highlighter, Library, Menu, Moon, NotebookPen, Plane, Search, X } });

const main = document.getElementById("appMain");
if (!main) throw new Error("缺少应用入口");

loadAppData()
  .then((data) => new App(data, main))
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "未知错误";
    main.innerHTML = `<div class="fatal-state"><strong>材料加载失败</strong><p>${message}</p></div>`;
  });
