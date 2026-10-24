# serve.py — LAN dev server for phone testing

Five Server equivalent in one stdlib-only Python file. Serves the repo over
your WiFi so real Android Chrome can test it. No install, no build.

## Quick start

```bash
python serve.py
```

Open the printed **Phone** URL on your mobile (same WiFi required):

```
Phone (same WiFi): http://192.168.x.x:8000/kgb/map/
```

Stop with `Ctrl+C`.

## Per-repo ports (`serve.json`)

Each repo keeps its own port in `serve.json` next to `serve.py`, so phone
bookmarks stay valid and two repos never clash:

```json
{"pages": ["/kgb/map/", "/kgb/map/?debug=1", "/kgb/bus-stop/"], "port": 8000}
```

| Field   | Meaning                                                  |
|---------|----------------------------------------------------------|
| `port`  | Stable dev port for this repo (default `8000`)           |
| `pages` | Exact URLs printed at startup. Omit → auto-detected from `index.html` files (top 2 levels, max 8) |

Copy `serve.py` + `serve.json` into another repo, change the port once
(e.g. `8001`), done. Or skip copying: `python <path>\serve.py --dir <other-repo>`.

## Flags (override the file)

| Flag             | Example                              |
|------------------|--------------------------------------|
| `--port`         | `python serve.py --port 8001`        |
| `--page` (repeat)| `python serve.py --page /docs/`      |
| `--dir`          | `python serve.py --dir C:\other-repo`|

## Troubleshooting

- **Phone can't reach it** — same WiFi on both devices; check Windows
  Firewall allowed Python (allow on first-run prompt, private networks).
- **`Address already in use`** — another server owns that port. Use a
  different `--port`, or stop the other server.
- **Stale code on phone** — the server sends `Cache-Control: no-store` on
  html/css/js/json, but production still relies on the `?v=` bumps in
  `index.html` (bump on every CSS/JS edit).
- **Debug views** — append `?debug=1` (camera chip) or open `?debugpage`
  (full state overlay) instead of guessing.
