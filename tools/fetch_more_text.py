#!/usr/bin/env python3
"""
Unduh terjemahan & tafsir tambahan dari API quran.com (open).

Hasil:
  data/translation_<slug>.json.gz   { "1:1": "teks", ... }
  data/tafsir_<slug>.json.gz        { "1:1": "teks", ... }

Pemakaian:
  python tools/fetch_more_text.py [slug ...]
"""
import concurrent.futures as cf
import gzip
import json
import pathlib
import sys
import time
import urllib.request

API = ("https://api.qurancdn.com/api/v4/verses/by_chapter/{ch}"
       "?per_page=300&fields=text_uthmani")
ROOT = pathlib.Path(__file__).resolve().parent.parent / "data"
UA = {"User-Agent": "alkalam-pwa/1.0"}

# slug -> (jenis, id, nama)
ITEMS = {
    # terjemahan
    "kemenag":   ("translations", 33,  "Kemenag RI"),
    "kfh":       ("translations", 134, "King Fahad Quran Complex"),
    "saheeh":    ("translations", 20,  "Saheeh International"),
    "pickthall": ("translations", 19,  "M. Pickthall"),
    "urdu":      ("translations", 234, "Fatah Muhammad Jalandhari (Urdu)"),
    "turkish":   ("translations", 77,  "Diyanet (Turki)"),
    "translit":  ("translations", 57,  "Transliterasi Latin"),
    # tafsir
    "muyassar":  ("tafsirs", 16,  "Tafsir Muyassar (Arab)"),
    "sadi":      ("tafsirs", 91,  "Tafsir As-Sa'di (Arab)"),
    "ibnkathir_en": ("tafsirs", 169, "Ibn Kathir (Inggris, ringkas)"),
}


def get(url: str, tries: int = 4):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=90) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception:
            if i == tries - 1:
                raise
            time.sleep(1.2 * (i + 1))


def chapter(kind: str, rid: int, ch: int):
    param = "translations" if kind == "translations" else "tafsirs"
    d = get(API.format(ch=ch) + f"&{param}={rid}")
    out = {}
    for v in d.get("verses", []):
        items = v.get(param) or []
        text = ""
        for it in items:
            t = (it.get("text") or "").strip()
            if t:
                text = t
                break
        if text:
            out[v["verse_key"]] = text
    return out


def build(slug: str):
    kind, rid, name = ITEMS[slug]
    t0 = time.time()
    data = {}
    with cf.ThreadPoolExecutor(max_workers=6) as pool:
        for part in pool.map(lambda c: chapter(kind, rid, c), range(1, 115)):
            data.update(part)
    prefix = "translation" if kind == "translations" else "tafsir"
    dst = ROOT / f"{prefix}_{slug}.json.gz"
    with gzip.open(dst, "wt", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{prefix}_{slug:14} id={rid:<4} ayat={len(data):5}  {dst.stat().st_size/1024:8.1f} KB  {time.time()-t0:4.0f}s  {name}")


if __name__ == "__main__":
    for slug in (sys.argv[1:] or list(ITEMS)):
        try:
            build(slug)
        except Exception as e:
            print(f"{slug}: GAGAL {e}")
