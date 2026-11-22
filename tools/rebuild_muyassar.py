#!/usr/bin/env python3
"""Bangun ulang tafsir Muyassar penuh (6.236 ayat) dari API quran.com, teks dibersihkan."""
import concurrent.futures as cf
import gzip
import html as htmllib
import json
import pathlib
import re
import time
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent / "data"
PATH = ROOT / "tafsir_muyassar.json.gz"
API = "https://api.quran.com/api/v4/tafsirs/16/by_ayah/{vk}"
UA = {"User-Agent": "alkalam/1.0", "Accept": "application/json"}
TAG = re.compile(r"<[^>]+>")


def clean(text: str) -> str:
    text = TAG.sub("", text or "")
    text = htmllib.unescape(text)
    return re.sub(r"[ \t]+", " ", text).strip()


def fetch(vk):
    for attempt in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(API.format(vk=vk), headers=UA), timeout=30) as r:
                d = json.loads(r.read().decode())
            return vk, clean(d.get("tafsir", {}).get("text") or "")
        except Exception:
            time.sleep(1 + attempt)
    return vk, None


def main():
    with gzip.open(ROOT / "verses_by_chapter.json.gz", "rt", encoding="utf-8") as f:
        verses = json.load(f)
    keys = [f"{s}:{v['verse_number']}" for s, arr in verses.items() for v in arr]
    print("ayat:", len(keys))

    out, failed = {}, []
    t0 = time.time()
    with cf.ThreadPoolExecutor(max_workers=10) as pool:
        for vk, text in pool.map(fetch, keys):
            if text:
                out[vk] = text
            else:
                failed.append(vk)
            if len(out) % 500 == 0 and out:
                print(f"  {len(out)}/{len(keys)} …", flush=True)

    with gzip.open(PATH, "wt", encoding="utf-8", compresslevel=9) as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print(f"selesai: {len(out)} ayat | gagal {len(failed)} | {PATH.stat().st_size/1024:.0f} KB | {time.time()-t0:.0f}s")
    if failed:
        print("gagal:", failed[:20])


if __name__ == "__main__":
    main()
