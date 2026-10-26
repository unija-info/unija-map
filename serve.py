"""LAN dev server — phone testing over the same WiFi (Five Server equivalent).

Stdlib only, no install. Run it in any repo root (or point it at one):

    python serve.py                       # uses serve.json, else auto-detect
    python serve.py --port 8001           # CLI overrides serve.json
    python serve.py --page /docs/         # CLI pages override everything
    python serve.py --dir C:\\other-repo  # serve another folder entirely

Per-repo defaults live in `serve.json` next to this file (commit one per repo
so each repo keeps a stable port and your phone bookmarks stay valid):

    {"port": 8000, "pages": ["/kgb/map/", "/kgb/map/?debug=1", "/kgb/bus-stop/"]}

- `port`: stable dev port for this repo (default 8000).
- `pages`: exact URLs printed at startup. Omit it and the script lists
  pages auto-detected from index.html files (top 2 levels, max 8).

The server binds 0.0.0.0 so a real Android Chrome on the same WiFi can
reach it, and sends `Cache-Control: no-store` for html/css/js/json so the
phone never runs stale code (complements the `?v=` bumps in index.html).
Stop with Ctrl+C.
"""

import argparse
import json
import os
import socket
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

NO_CACHE_EXTS = (".html", ".css", ".js", ".json")
DEFAULT_PORT = 8000
CONFIG_NAME = "serve.json"
MAX_AUTO_PAGES = 8


class DevHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        p = self.path.split("?")[0].lower()
        if p.endswith(NO_CACHE_EXTS) or p.endswith("/"):  # "/" serves index.html
            self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        # Single-range support (PMTiles spike: the client fetches byte ranges;
        # stock SimpleHTTPRequestHandler ignores them). Falls back to stdlib.
        rng = self.headers.get("Range")
        if rng and rng.startswith("bytes="):
            try:
                first, _, last = rng[6:].partition("-")
                start = int(first) if first else 0
            except ValueError:
                return super().do_GET()
            path = self.translate_path(self.path)
            if not os.path.isfile(path):
                return super().do_GET()
            size = os.path.getsize(path)
            end = min(int(last) if last else size - 1, size - 1)
            if start >= size or end < start:
                return super().do_GET()
            with open(path, "rb") as f:
                f.seek(start)
                data = f.read(end - start + 1)
            self.send_response(206)
            self.send_header("Content-Type", self.guess_type(path))
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Accept-Ranges", "bytes")
            self.end_headers()
            try:
                self.wfile.write(data)
            except (BrokenPipeError, ConnectionResetError):
                pass
            return
        return super().do_GET()


def lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()


def load_repo_config(directory):
    """Read serve.json from the served dir. Returns (dict, error|None)."""
    try:
        raw = (Path(directory) / CONFIG_NAME).read_text(encoding="utf-8")
    except OSError:
        return {}, None  # no config file: not an error
    try:
        data = json.loads(raw)
    except ValueError as e:
        return {}, f"{CONFIG_NAME}: invalid JSON ({e})"
    if not isinstance(data, dict):
        return {}, f"{CONFIG_NAME}: must be a JSON object"
    return data, None


def autodetect_pages(directory):
    """List index.html pages (top 2 levels), e.g. ['/', '/kgb/map/']."""
    root = Path(directory)
    pages = []
    for html in sorted(root.rglob("index.html")):
        rel = html.relative_to(root).parent.as_posix()
        if any(part.startswith(".") for part in html.relative_to(root).parts):
            continue  # skip .git, .vscode, ...
        if rel != "." and rel.count("/") > 1:
            continue  # deeper than 2 levels
        pages.append("/" + ("" if rel == "." else rel + "/"))
        if len(pages) >= MAX_AUTO_PAGES:
            break
    return pages or ["/"]


def normalize_pages(pages):
    out = []
    for p in pages:
        p = str(p).strip() or "/"
        if not p.startswith("/"):
            p = "/" + p
        out.append(p)
    return out


def main():
    ap = argparse.ArgumentParser(description="LAN dev server for phone testing")
    ap.add_argument("--port", type=int, default=None,
                    help="override serve.json port")
    ap.add_argument("--dir", default=".",
                    help="folder to serve (default: current dir)")
    ap.add_argument("--page", action="append", default=None, dest="pages",
                    help="page URL to print (repeatable, overrides config)")
    args = ap.parse_args()

    root = Path(args.dir).resolve()
    cfg, err = load_repo_config(root)
    if err:
        print(f"warning: {err}; using CLI/defaults")
        cfg = {}

    port = args.port or cfg.get("port") or DEFAULT_PORT
    try:
        port = int(port)
    except (TypeError, ValueError):
        print(f"warning: bad port {port!r}; using {DEFAULT_PORT}")
        port = DEFAULT_PORT

    if args.pages:
        pages = normalize_pages(args.pages)
    elif isinstance(cfg.get("pages"), list) and cfg["pages"]:
        pages = normalize_pages(cfg["pages"])
    else:
        pages = autodetect_pages(root)

    ip = lan_ip()
    print(f"Serving {root} on port {port}")
    for p in pages:
        print(f"  Phone:   http://{ip}:{port}{p}")
        print(f"  This PC: http://localhost:{port}{p}")
    print("Ctrl+C to stop.")

    handler = partial(DevHandler, directory=str(root))
    srv = ThreadingHTTPServer(("0.0.0.0", port), handler)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        srv.server_close()


if __name__ == "__main__":
    main()
