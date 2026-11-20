#!/usr/bin/env python3
"""
Server lokal untuk Al-Kalam PWA.

Dipakai oleh tugas VS Code (.vscode/tasks.json) atau langsung:
    python tools/serve.py            # port 8080, buka browser
    python tools/serve.py 8090       # port lain
    python tools/serve.py 8090 --no-browser
"""
import argparse
import functools
import http.server
import pathlib
import socketserver
import threading
import webbrowser

ROOT = pathlib.Path(__file__).resolve().parent.parent


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".woff2": "font/woff2",
        ".webp": "image/webp",
        ".gz": "application/gzip",
        ".json": "application/json",
    }

    def end_headers(self):
        # supaya perubahan langsung terlihat saat pengembangan
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def log_message(self, fmt, *args):  # ringkas
        print("  " + (fmt % args))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("port", nargs="?", type=int, default=8080)
    ap.add_argument("--no-browser", action="store_true")
    ap.add_argument("--bind", default="127.0.0.1")
    args = ap.parse_args()

    url = f"http://{args.bind}:{args.port}/index.html"
    handler = functools.partial(Handler, directory=str(ROOT))

    class Server(socketserver.ThreadingTCPServer):
        allow_reuse_address = True
        daemon_threads = True

    with Server((args.bind, args.port), handler) as httpd:
        print(f"Al-Kalam berjalan di {url}")
        print(f"Akar folder: {ROOT}")
        print("Tekan Ctrl+C untuk berhenti.\n")
        if not args.no_browser:
            threading.Timer(1.0, lambda: webbrowser.open(url)).start()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nberhenti.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
