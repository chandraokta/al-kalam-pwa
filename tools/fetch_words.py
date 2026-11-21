#!/usr/bin/env python3
"""
Unduh arti & transliterasi per kata dari API quran.com.

Hasil: data/words.json.gz
  { "1:1": [ {"p":1,"ar":"بِسْمِ","tr":"In the name of Allah","tl":"bismi"}, … ], … }
"""
import concurrent.futures as cf
import gzip
import json
import pathlib
import time
import urllib.request

API = ("https://api.qurancdn.com/api/v4/verses/by_chapter/{ch}"
       "?per_page=300&words=true&word_fields=text_uthmani,translation,transliteration")
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
            time.sleep(1.2 * (i + 1))


def chapter(ch: int):
    d = get(API.format(ch=ch))
    out = {}
    for v in d.get("verses", []):
        words = []
        for w in v.get("words") or []:
            if w.get("char_type_name") != "word":
                continue
            words.append({
                "p": w.get("position"),
                "ar": (w.get("text_uthmani") or "").strip(),
                "tr": ((w.get("translation") or {}).get("text") or "").strip(),
                "tl": ((w.get("transliteration") or {}).get("text") or "").strip(),
            })
        if words:
            out[v["verse_key"]] = words
    return out


def main():
    t0 = time.time()
    data = {}
    with cf.ThreadPoolExecutor(max_workers=6) as pool:
        for part in pool.map(chapter, range(1, 115)):
            data.update(part)
    dst = ROOT / "words.json.gz"
    with gzip.open(dst, "wt", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    n = sum(len(v) for v in data.values())
    print(f"ayat={len(data)} kata={n} {dst.stat().st_size/1024:.1f} KB {time.time()-t0:.0f}s")


if __name__ == "__main__":
    main()
