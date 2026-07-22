from __future__ import annotations

import argparse
import http.server
import os
import shutil
import socketserver
import subprocess
import sys
from functools import partial
from pathlib import Path
from typing import Iterable


DEFAULT_PORT = 7777
HOST = "127.0.0.1"


class LocalServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


def build_dist(project_root: Path) -> None:
    npm_command = "npm.cmd" if os.name == "nt" else "npm"
    print("[777plus] Building the local site...")
    subprocess.run([npm_command, "run", "build"], cwd=project_root, check=True)


def existing_paths(paths: Iterable[Path]) -> Iterable[str]:
    for path in paths:
        if path.is_file():
            yield str(path)


def windows_browser_commands(url: str) -> list[list[str]]:
    program_files = Path(os.environ.get("ProgramFiles", "C:/Program Files"))
    program_files_x86 = Path(os.environ.get("ProgramFiles(x86)", "C:/Program Files (x86)"))
    local_app_data = Path(os.environ.get("LOCALAPPDATA", "C:/Users/Default/AppData/Local"))
    edge_paths = [
        program_files_x86 / "Microsoft/Edge/Application/msedge.exe",
        program_files / "Microsoft/Edge/Application/msedge.exe",
    ]
    chrome_paths = [
        program_files / "Google/Chrome/Application/chrome.exe",
        program_files_x86 / "Google/Chrome/Application/chrome.exe",
        local_app_data / "Google/Chrome/Application/chrome.exe",
    ]
    firefox_paths = [
        program_files / "Mozilla Firefox/firefox.exe",
        program_files_x86 / "Mozilla Firefox/firefox.exe",
    ]
    commands: list[list[str]] = []
    edge = shutil.which("msedge")
    chrome = shutil.which("chrome") or shutil.which("chrome.exe")
    firefox = shutil.which("firefox") or shutil.which("firefox.exe")
    for executable in ([edge] if edge else []) + list(existing_paths(edge_paths)):
        commands.append([executable, "--inprivate", "--new-window", url])
    for executable in ([chrome] if chrome else []) + list(existing_paths(chrome_paths)):
        commands.append([executable, "--incognito", "--new-window", url])
    for executable in ([firefox] if firefox else []) + list(existing_paths(firefox_paths)):
        commands.append([executable, "-private-window", url])
    return commands


def browser_commands(url: str) -> list[list[str]]:
    if os.name == "nt":
        return windows_browser_commands(url)
    if sys.platform == "darwin":
        return [
            ["open", "-na", "Microsoft Edge", "--args", "--inprivate", "--new-window", url],
            ["open", "-na", "Google Chrome", "--args", "--incognito", "--new-window", url],
            ["open", "-na", "Firefox", "--args", "-private-window", url],
        ]
    commands: list[list[str]] = []
    for name in ("microsoft-edge", "microsoft-edge-stable"):
        executable = shutil.which(name)
        if executable:
            commands.append([executable, "--inprivate", "--new-window", url])
    for name in ("google-chrome", "google-chrome-stable", "chromium", "chromium-browser"):
        executable = shutil.which(name)
        if executable:
            commands.append([executable, "--incognito", "--new-window", url])
    firefox = shutil.which("firefox")
    if firefox:
        commands.append([firefox, "-private-window", url])
    return commands


def open_private_browser(url: str) -> None:
    commands = browser_commands(url)
    if not commands:
        raise OSError("No Edge, Chrome, or Firefox installation supports private browsing.")
    last_error: OSError | None = None
    for command in commands:
        try:
            subprocess.Popen(
                command,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            print(f"[777plus] Opened a private browser window: {url}")
            return
        except OSError as error:
            last_error = error
    raise OSError("Unable to open a private browser window.") from last_error


def create_server(directory: Path, preferred_port: int) -> tuple[LocalServer, int]:
    handler = partial(http.server.SimpleHTTPRequestHandler, directory=str(directory))
    for port in range(preferred_port, preferred_port + 50):
        try:
            return LocalServer((HOST, port), handler), port
        except OSError:
            continue
    raise OSError(f"No available port found from {preferred_port} to {preferred_port + 49}.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build and serve 777plus locally.")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help="Preferred local HTTP port.")
    parser.add_argument("--no-build", action="store_true", help="Skip npm build.")
    parser.add_argument("--no-open", action="store_true", help="Do not open a browser.")
    parser.add_argument("--check", action="store_true", help="Validate the local launcher and exit.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    project_root = Path(__file__).resolve().parent
    dist_dir = project_root / "dist"

    if args.check:
        if not (project_root / "package.json").is_file():
            print("[777plus] package.json not found.", file=sys.stderr)
            return 1
        print("[777plus] start_index.py check passed.")
        return 0

    try:
        if not args.no_build:
            build_dist(project_root)
        if not dist_dir.is_dir():
            print("[777plus] dist directory not found. Run without --no-build first.", file=sys.stderr)
            return 1
        server, port = create_server(dist_dir, args.port)
        url = f"http://localhost:{port}/"
        if not args.no_open:
            open_private_browser(url)
        print(f"[777plus] Serving {dist_dir} at {url}")
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\n[777plus] Server stopped.")
        finally:
            server.server_close()
        return 0
    except subprocess.CalledProcessError as error:
        print(f"[777plus] Build failed: {error}", file=sys.stderr)
        return error.returncode or 1
    except OSError as error:
        print(f"[777plus] Failed to start: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
