#!/usr/bin/env python3
"""
Ambil layout mushaf IndoPak dari Quranic Universal Library (TarteelAI, MIT).

Sumber : https://qul.tarteel.ai/resources/mushaf_layout/{id}?page={n}
         (id 12 = Indopak 15 lines Qudratullah)
Isi    : per baris (data-line), per kata (data-ayah + data-position), termasuk
         baris judul surat (line--surah-name) dan basmalah (line--bismillah).

Hasil  : data/layout-indopak.json.gz  (skema sama dengan layout.json.gz Madani)
"""
import concurrent.futures as cf
import gzip
import json
import pathlib
import re
import sys
import time
import urllib.request

LAYOUT_ID = 12
BASE = "https://qul.tarteel.ai/resources/mushaf_layout/{id}?page={page}"
ROOT = pathlib.Path(__file__).resolve().parent.parent / "data"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120 Safari/537.36"}

LINE_SPLIT = re.compile(r'<div class="line-container" data-line="(\d+)">')
SPAN = re.compile(r'<span class="char[^"]*(char-word|char-end)[^"]*"([^>]*)>(.*?)</span>', re.S)
ATTR_AYAH = re.compile(r'data-ayah="([^"]+)"')
ATTR_POS = re.compile(r'data-position="(\d+)"')
TAG = re.compile(r"<[^>]+>")


def fetch(page: int):
    for attempt in range(4):
        try:
            url = BASE.format(id=LAYOUT_ID, page=page)
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=90) as r:
                return page, r.read().decode("utf-8", "ignore")
        except Exception as e:
            if attempt == 3:
                return page, None
            time.sleep(1.5 * (attempt + 1))
    return page, None


def parse_page(page: int, html: str):
    if not html or f'id="page-{page}"' not in html:
        return page, None
    # ambil hanya isi halaman ini
    start = html.index(f'id="page-{page}"')
    end = html.find('<div class="page-', start + 10)
    body = html[start:end if end > 0 else len(html)]

    parts = LINE_SPLIT.split(body)
    # parts = [pre, lineNo, chunk, lineNo, chunk, …]
    lines = []
    kinds = []
    for i in range(1, len(parts) - 1, 2):
        line_no = int(parts[i])
        chunk = parts[i + 1]
        if "line--surah-name" in chunk:
            m = re.search(r"surah(\d{3})", chunk)
            lines.append([])
            kinds.append(("surah", int(m.group(1)) if m else None))
            continue
        if "line--bismillah" in chunk:
            lines.append([])
            kinds.append(("bismillah", None))
            continue
        words = []
        for cls, attrs, inner in SPAN.findall(chunk):
            ma = ATTR_AYAH.search(attrs)
            mp = ATTR_POS.search(attrs)
            if not ma:
                continue
            text = TAG.sub("", inner)
            text = re.sub(r"\s+", "", text)
            if not text:
                continue
            words.append([ma.group(1), int(mp.group(1)) if mp else 0, text, 1 if cls == "char-end" else 0])
        lines.append(words)
        kinds.append(("words", None))
    return page, {"lines": lines, "kinds": kinds}


def page_count() -> int:
    """Cari jumlah halaman dengan mencoba beberapa kandidat akhir."""
    for candidate in (620, 615, 611, 610, 609, 608, 607, 606, 605, 604):
        _, html = fetch(candidate)
        if html and f'id="page-{candidate}"' in html:
            print("jumlah halaman:", candidate)
            return candidate
    return 604


def main():
    n = page_count()
    pages, surahs_meta = {}, {}
    t0 = time.time()
    with cf.ThreadPoolExecutor(max_workers=4) as pool:
        for page, data in pool.map(lambda p: parse_page(p, fetch(p)[1]), range(1, n + 1)):
            if data is None:
                continue
            lines = []
            for line, kind in zip(data["lines"], data["kinds"]):
                if kind[0] == "surah":
                    lines.append({"kind": "surah", "surah": kind[1]})
                elif kind[0] == "bismillah":
                    lines.append({"kind": "bismillah"})
                else:
                    lines.append({"kind": "words", "words": line})
            pages[str(page)] = lines
            for ln in lines:
                if ln["kind"] == "surah" and ln["surah"]:
                    surahs_meta.setdefault(str(ln["surah"]), {"page": page})
            if page % 100 == 0:
                print(f"  {page}/{n} … {time.time()-t0:.0f}s", flush=True)

    # lengkapi meta surat dari data ayat
    for p, lines in pages.items():
        for ln in lines:
            if ln["kind"] != "words":
                continue
            for vk, pos, glyph, end in ln["words"]:
                sid = vk.split(":")[0]
                surahs_meta.setdefault(sid, {}).setdefault("page", int(p))
                surahs_meta[sid]["page"] = min(surahs_meta[sid]["page"], int(p))

    payload = {"layout": LAYOUT_ID, "pages": pages, "surahs": surahs_meta, "pageCount": n}
    dst = ROOT / "layout-indopak.json.gz"
    with gzip.open(dst, "wt", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
    words = sum(len(ln["words"]) for lines in pages.values() for ln in lines if ln["kind"] == "words")
    print(f"\nlayout indopak: {len(pages)} halaman · {words} kata · {dst.stat().st_size/1024:.0f} KB · {time.time()-t0:.0f}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
