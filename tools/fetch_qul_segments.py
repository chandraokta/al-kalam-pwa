#!/usr/bin/env python3
"""
Ambil segmen kata dari Quranic Universal Library (QUL, TarteelAI) — MIT.

Endpoint : GET https://qul.tarteel.ai/api/v1/audio/surah_segments/{recitation_id}?chapter={n}&per_page=286
Isi      : audio.url (mp3 per surat), audio.duration, dan per ayat:
           time_from / time_to (ms, absolut dalam file surat)
           segments: [[kata_ke (1-based), mulai_ms, selesai_ms], …]

Hasil    : data/qul/<key>.json.gz
           { "recitation": 7,
             "audio": { "1": {"u": "...001.mp3", "d": 46}, … },
             "verses": { "1:1": {"f": 0, "t": 5896, "s": [[1,0,591], …]}, … } }
"""
import concurrent.futures as cf
import gzip
import json
import pathlib
import sys
import time
import urllib.request

API = "https://qul.tarteel.ai/api/v1/audio/surah_segments/{rid}?chapter={ch}&per_page=286"
OUT = pathlib.Path(__file__).resolve().parent.parent / "data" / "qul"
UA = {"User-Agent": "alkalam-pwa/1.0", "Accept": "application/json"}

# key aplikasi -> recitation_id QUL
RECITERS = {
    "alafasy": 7,
    "abdulbasit": 2,
    "husary": 6,
    "sudais": 3,
}


def get(url: str, tries: int = 4):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=90) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception:
            if i == tries - 1:
                raise
            time.sleep(1.5 * (i + 1))


def chapter(rid: int, ch: int):
    d = get(API.format(rid=rid, ch=ch))
    verses = {}
    for vk, v in (d.get("segments") or {}).items():
        segs = v.get("segments") or []
        if not segs:
            continue
        verses[vk] = {
            "f": int(v["time_from"]),
            "t": int(v["time_to"]),
            "s": [[int(w), int(a), int(b)] for w, a, b in segs],
        }
    return ch, {"u": (d.get("audio") or {}).get("url", ""), "d": (d.get("audio") or {}).get("duration", 0)}, verses


def build(key: str, rid: int) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    dst = OUT / f"{key}.json.gz"
    t0 = time.time()
    audio, verses = {}, {}
    with cf.ThreadPoolExecutor(max_workers=5) as pool:
        for ch, a, v in pool.map(lambda c: chapter(rid, c), range(1, 115)):
            if a.get("u"):
                audio[str(ch)] = a
            verses.update(v)
    payload = {"recitation": rid, "source": "QUL (TarteelAI/quranic-universal-library)", "audio": audio, "verses": verses}
    with gzip.open(dst, "wt", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
    words = sum(len(v["s"]) for v in verses.values())
    print(f"{key:12} rid={rid:<3} ayat={len(verses):5} kata={words:6} surat={len(audio):3} "
          f"{dst.stat().st_size/1024:7.1f} KB  {time.time()-t0:4.0f} s")


if __name__ == "__main__":
    for k in (sys.argv[1:] or list(RECITERS)):
        try:
            build(k, RECITERS[k])
        except Exception as e:
            print(f"{k}: GAGAL {e}")
