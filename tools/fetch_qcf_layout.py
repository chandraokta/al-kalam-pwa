#!/usr/bin/env python3
"""
Ambil layout QCF (halaman berglyph, seperti Madani) dari QUL.

Pemakaian: python tools/fetch_qcf_layout.py <layout_id> <nama_keluaran.json.gz>

Hasil sama dengan data/layout.json.gz: {"pages": {"1": {"lines": [[[ayah, pos, glyph, isEnd], ...], ...]}}, "surahs": {...}}
"""
import concurrent.futures as cf
import gzip
import json
import pathlib
import re
import sys
import time
import urllib.request

LAYOUT_ID = int(sys.argv[1])
OUT_NAME = sys.argv[2]
BASE = "https://qul.tarteel.ai/resources/mushaf_layout/{id}?page={page}"
ROOT = pathlib.Path(__file__).resolve().parent.parent / "data"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120 Safari/537.36"}

LINE_SPLIT = re.compile(r'<div class="line-container" data-line="(\d+)">')
SPAN = re.compile(r'<span class="char[^"]*(char-word|char-end)[^"]*"([^>]*)>(.*?)</span>', re.S)
ATTR_AYAH = re.compile(r'data-ayah="([^"]+)"')
ATTR_POS = re.compile(r'data-position="(\d+)"')
TAG = re.compile(r"<[^>]+>")
SURAH_IN_LINE = re.compile(r"surah(\d{3})")


def fetch(page: int):
    for attempt in range(4):
        try:
            url = BASE.format(id=LAYOUT_ID, page=page)
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=90) as r:
                return page, r.read().decode("utf-8", "ignore")
        except Exception:
            if attempt == 3:
                return page, None
            time.sleep(1.5 * (attempt + 1))
    return page, None


def parse_page(page: int, html: str):
    if not html or f'id="page-{page}"' not in html:
        return page, None
    start = html.index(f'id="page-{page}"')
    end = html.find('<div class="page-', start + 10)
    body = html[start:end if end > 0 else len(html)]

    parts = LINE_SPLIT.split(body)
    lines = []
    for i in range(1, len(parts) - 1, 2):
        chunk = parts[i + 1]
        if "line--surah-name" in chunk:
            m = SURAH_IN_LINE.search(chunk)
            lines.append({"kind": "surah", "surah": int(m.group(1)) if m else None})
            continue
        if "line--bismillah" in chunk:
            lines.append({"kind": "bismillah"})
            continue
        words = []
        for cls, attrs, inner in SPAN.findall(chunk):
            ma = ATTR_AYAH.search(attrs)
            if not ma:
                continue
            text = re.sub(r"\s+", " ", TAG.sub("", inner)).strip()
            if not text:
                continue
            mp = ATTR_POS.search(attrs)
            words.append([ma.group(1), int(mp.group(1)) if mp else 0, text, 1 if cls == "char-end" else 0])
        lines.append({"kind": "words", "words": words})
    return page, lines


def page_count() -> int:
    for candidate in (620, 615, 611, 610, 609, 608, 607, 606, 605, 604):
        _, html = fetch(candidate)
        if html and f'id="page-{candidate}"' in html:
            return candidate
    return 604


def main():
    n = page_count()
    print(f"layout {LAYOUT_ID}: {n} halaman")
    pages, surahs = {}, {}
    t0 = time.time()
    with cf.ThreadPoolExecutor(max_workers=6) as pool:
        for page, lines in pool.map(lambda p: parse_page(p, fetch(p)[1]), range(1, n + 1)):
            if not lines:
                continue
            out = []
            for ln in lines:
                if ln["kind"] == "words":
                    out.append(ln["words"])
                else:
                    out.append(ln)
                    if ln["kind"] == "surah" and ln.get("surah"):
                        surahs.setdefault(str(ln["surah"]), {"page": page})
            pages[str(page)] = {"lines": out}

    data = {"pages": pages, "surahs": surahs}
    path = ROOT / OUT_NAME
    with gzip.open(path, "wt", encoding="utf-8", compresslevel=9) as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    print(f"selesai: {path} ({path.stat().st_size/1024:.0f} KB) dalam {time.time()-t0:.0f}s")


if __name__ == "__main__":
    main()
