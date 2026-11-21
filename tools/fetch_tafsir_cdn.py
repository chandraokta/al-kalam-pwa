#!/usr/bin/env python3
"""
Unduh tafsir dari dataset terbuka spa5k/tafsir_api (jsDelivr).

Struktur per surat: [{surah, ayah, text}, …]
Hasil: data/tafsir_<slug>.json.gz  { "1:1": "teks", … }
"""
import concurrent.futures as cf
import gzip
import json
import pathlib
import sys
import time
import urllib.request

BASE = "https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/{slug}/{ch}.json"
ROOT = pathlib.Path(__file__).resolve().parent.parent / "data"
UA = {"User-Agent": "alkalam-pwa/1.0"}

EDITIONS = {
    "muyassar":   "ar-tafsir-muyassar",
    "sadi":       "ar-tafsir-as-saadi",
    "ibnkathir":  "ar-tafsir-ibn-kathir",
    "ibnkathir_en": "en-tafisr-ibn-kathir",
    "jalalayn_id": "in-tafsir-jalalayn",
    "sadi_id":    "id-tafsir-as-saadi",
}


def get(url: str, tries: int = 3):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=90) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception:
            if i == tries - 1:
                raise
            time.sleep(1.0 * (i + 1))


def chapter(slug: str, ch: int):
    try:
        d = get(BASE.format(slug=slug, ch=ch))
    except Exception:
        return {}
    out = {}
    for row in d or []:
        text = (row.get("text") or "").strip()
        ayah = row.get("ayah")
        if text and ayah:
            out[f"{row.get('surah') or ch}:{ayah}"] = text
    return out


def build(key: str):
    slug = EDITIONS[key]
    t0 = time.time()
    data = {}
    with cf.ThreadPoolExecutor(max_workers=6) as pool:
        for part in pool.map(lambda c: chapter(slug, c), range(1, 115)):
            data.update(part)
    dst = ROOT / f"tafsir_{key}.json.gz"
    with gzip.open(dst, "wt", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{key:14} {slug:26} ayat={len(data):5} {dst.stat().st_size/1024:9.1f} KB {time.time()-t0:4.0f}s")


if __name__ == "__main__":
    for k in (sys.argv[1:] or list(EDITIONS)):
        try:
            build(k)
        except Exception as e:
            print(f"{k}: GAGAL {e}")
