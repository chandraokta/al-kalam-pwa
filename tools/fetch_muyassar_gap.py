#!/usr/bin/env python3
"""Lengkapi tafsir Muyassar yang bolong (999 ayat) dari API quran.com."""
import concurrent.futures as cf
import gzip
import json
import pathlib
import time
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent / "data"
PATH = ROOT / "tafsir_muyassar.json.gz"
API = "https://api.quran.com/api/v4/tafsirs/16/by_ayah/{vk}"
UA = {"User-Agent": "alkalam/1.0", "Accept": "application/json"}


def fetch(vk):
    for attempt in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(API.format(vk=vk), headers=UA), timeout=30) as r:
                d = json.loads(r.read().decode())
            return vk, (d.get("tafsir", {}).get("text") or "").strip()
        except Exception:
            time.sleep(1 + attempt)
    return vk, None


def main():
    with gzip.open(PATH, "rt", encoding="utf-8") as f:
        data = json.load(f)
    with gzip.open(ROOT / "verses_by_chapter.json.gz", "rt", encoding="utf-8") as f:
        verses = json.load(f)

    all_keys = []
    for s, arr in verses.items():
        for v in arr:
            all_keys.append(f"{s}:{v['verse_number']}")
    missing = [k for k in all_keys if k not in data]
    print(f"total {len(all_keys)} | sudah ada {len(data)} | bolong {len(missing)}")

    filled, failed = 0, []
    t0 = time.time()
    with cf.ThreadPoolExecutor(max_workers=8) as pool:
        for vk, text in pool.map(fetch, missing):
            if text:
                data[vk] = text
                filled += 1
            else:
                failed.append(vk)
            if filled % 200 == 0 and filled:
                print(f"  {filled}/{len(missing)} …", flush=True)

    with gzip.open(PATH, "wt", encoding="utf-8", compresslevel=9) as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    print(f"selesai: +{filled} ayat | gagal {len(failed)} | total {len(data)} | {time.time()-t0:.0f}s")
    if failed:
        print("gagal:", failed[:20])


if __name__ == "__main__":
    main()
