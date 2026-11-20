#!/usr/bin/env python3
"""
Bangun data layout mushaf 604 halaman + font halaman QCF.

Sumber kata  : quran.com API v4 (words=true) — line_number, position, code_v2, char_type_name
Sumber font  : CDN QUL  .../quran_fonts/v2/woff2/p{1..604}.woff2

Hasil:
  data/layout.json.gz   { "pages": { "1": { "lines": [ [ [vk,w,glyph,end], … ], … ] }, … },
                          "surahs": { "1": {"page":1,"name":"…","ayahs":7}, … } }
  data/fonts/p1.woff2 … p604.woff2
"""
import concurrent.futures as cf
import gzip
import json
import pathlib
import re
import sys
import time
import urllib.request

API = ("https://api.qurancdn.com/api/v4/verses/by_chapter/{ch}"
       "?words=true&word_fields=code_v2,line_number,page_number,position,char_type_name"
       "&fields=text_uthmani&per_page=300")
FONT = "https://static-cdn.tarteel.ai/qul/fonts/quran_fonts/v2/woff2/p{n}.woff2?v=3.2"
ROOT = pathlib.Path(__file__).resolve().parent.parent / "data"
UA = {"User-Agent": "alkalam-pwa/1.0"}


def get(url: str, tries: int = 4):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=90) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception:
            if i == tries - 1:
                raise
            time.sleep(1.5 * (i + 1))


def chapter_words(ch: int):
    d = get(API.format(ch=ch))
    out = []
    for v in d["verses"]:
        for w in v["words"]:
            out.append({
                "vk": v["verse_key"],
                "pos": w["position"],
                "page": w.get("page_number"),
                "line": w.get("line_number"),
                "glyph": w.get("code_v2") or w.get("code_v1") or w.get("text"),
                "end": 1 if w.get("char_type_name") == "end" else 0,
            })
    return ch, out


def build_layout():
    pages = {}
    surahs = {}
    t0 = time.time()
    with cf.ThreadPoolExecutor(max_workers=6) as pool:
        for ch, words in pool.map(chapter_words, range(1, 115)):
            for w in words:
                if not w["page"] or not w["line"] or not w["glyph"]:
                    continue
                page = pages.setdefault(str(w["page"]), {"lines": {}})
                line = page["lines"].setdefault(str(w["line"]), [])
                line.append([w["vk"], w["pos"], w["glyph"], w["end"]])
    # rapikan: dict -> list baris 1..15, tiap baris list entri
    out_pages = {}
    for p, data in pages.items():
        maxline = max(int(k) for k in data["lines"])
        lines = []
        for ln in range(1, maxline + 1):
            lines.append(data["lines"].get(str(ln), []))
        out_pages[p] = {"lines": lines}

    # surat mana di halaman mana
    chapters = get("https://api.qurancdn.com/api/qdc/chapters?language=id")["chapters"]
    for c in chapters:
        surahs[str(c["id"])] = {
            "page": c["pages"][0],
            "page_end": c["pages"][1],
            "name": c["name_arabic"],
            "name_simple": c["name_simple"],
            "ayahs": c["verses_count"],
            "bismillah": bool(c.get("bismillah_pre")),
        }

    dst = ROOT / "layout.json.gz"
    with gzip.open(dst, "wt", encoding="utf-8") as f:
        json.dump({"pages": out_pages, "surahs": surahs}, f, ensure_ascii=False, separators=(",", ":"))
    total_words = sum(len(l) for p in out_pages.values() for l in p["lines"])
    print(f"layout: {len(out_pages)} halaman · {total_words} kata · {dst.stat().st_size/1024:.0f} KB · {time.time()-t0:.0f}s")


def fetch_font(n: int):
    dst = ROOT / "fonts" / f"p{n}.woff2"
    if dst.exists() and dst.stat().st_size > 3000:
        return n, dst.stat().st_size, "ada"
    for attempt in range(4):
        try:
            data = urllib.request.urlopen(urllib.request.Request(FONT.format(n=n), headers=UA), timeout=90).read()
            if len(data) < 3000:
                raise ValueError("font terlalu kecil")
            dst.write_bytes(data)
            return n, len(data), "ok"
        except Exception as e:
            if attempt == 3:
                return n, 0, f"gagal: {e}"
            time.sleep(1.5 * (attempt + 1))
    return n, 0, "gagal"


def build_fonts():
    (ROOT / "fonts").mkdir(parents=True, exist_ok=True)
    t0, total, bad = time.time(), 0, []
    with cf.ThreadPoolExecutor(max_workers=6) as pool:
        for n, size, st in pool.map(fetch_font, range(1, 605)):
            total += size
            if st.startswith("gagal"):
                bad.append((n, st))
            if n % 100 == 0:
                print(f"  font {n}/604 … {total/1024/1024:.1f} MB", flush=True)
    print(f"font: {604 - len(bad)}/604 · {total/1024/1024:.1f} MB · {time.time()-t0:.0f}s")
    if bad:
        print("gagal:", bad[:8])
        return 1
    return 0


INDOPAK_FONT = ("https://static-cdn.tarteel.ai/qul/fonts/nastaleeq/"
                "indopak-nastaleeq-waqf-lazim.woff2?v=3.2")


def fetch_indopak_font():
    """Satu font nastaleeq untuk seluruh mushaf IndoPak."""
    (ROOT / "fonts").mkdir(parents=True, exist_ok=True)
    dst = ROOT / "fonts" / "indopak.woff2"
    if dst.exists() and dst.stat().st_size > 20000:
        print(f"indopak.woff2 sudah ada ({dst.stat().st_size/1024:.0f} KB)")
        return 0
    data = urllib.request.urlopen(urllib.request.Request(INDOPAK_FONT, headers=UA), timeout=90).read()
    dst.write_bytes(data)
    print(f"indopak.woff2 tersimpan ({len(data)/1024:.0f} KB)")
    return 0


if __name__ == "__main__":
    what = sys.argv[1] if len(sys.argv) > 1 else "all"
    rc = 0
    if what in ("all", "layout"):
        build_layout()
    if what in ("all", "fonts"):
        rc = build_fonts()
        fetch_indopak_font()
    sys.exit(rc)
