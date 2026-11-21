#!/usr/bin/env python3
"""
Bangun indeks ayat serupa (mutashabihat) dari teks Uthmani.

Metode: normalkan teks (buang harakat), pecah jadi shingle 3-kata,
kumpulkan kandidat lewat inverted index, hitung Jaccard, simpan top-5.

Hasil: data/similar.json.gz  {"2:255": [["3:2", 0.82], …], …}
"""
import gzip
import json
import pathlib
import re
from collections import defaultdict

ROOT = pathlib.Path(__file__).resolve().parent.parent / "data"
AR_DIACRITICS = re.compile(r"[\u064B-\u0652\u0670\u06D6-\u06ED\u0640]")
NORM = str.maketrans({
    "أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا", "ؤ": "و", "ئ": "ي", "ى": "ي", "ة": "ه",
})


def norm(text: str) -> list[str]:
    t = AR_DIACRITICS.sub("", text or "").translate(NORM)
    t = re.sub(r"[^\u0600-\u06FF\s]", " ", t)
    return [w for w in t.split() if w]


def shingles(words: list[str], k: int = 3) -> set[str]:
    if len(words) < k:
        return {" ".join(words)} if words else set()
    return {" ".join(words[i:i + k]) for i in range(len(words) - k + 1)}


def main():
    with gzip.open(ROOT / "verses_by_chapter.json.gz", "rt", encoding="utf-8") as f:
        data = json.load(f)

    verses, sh = {}, {}
    for surah, arr in data.items():
        for v in arr:
            key = v["verse_key"]
            words = norm(v.get("text_uthmani") or "")
            if len(words) < 3:
                continue
            verses[key] = words
            sh[key] = shingles(words)

    index = defaultdict(list)
    for key, s in sh.items():
        for sg in s:
            index[sg].append(key)

    out = {}
    for key, s in sh.items():
        counts = defaultdict(int)
        for sg in s:
            for other in index[sg]:
                if other != key:
                    counts[other] += 1
        cands = []
        need = min(3, len(s))
        for other, n in counts.items():
            if n < need:
                continue
            inter = len(s & sh[other])
            smaller = min(len(s), len(sh[other]))
            score = inter / smaller if smaller else 0      # containment
            if score >= 0.6:
                cands.append((score, other))
        if not cands:
            continue
        cands.sort(reverse=True)
        out[key] = [[k2, round(sc, 3)] for sc, k2 in cands[:5]]

    dst = ROOT / "similar.json.gz"
    with gzip.open(dst, "wt", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print(f"ayat berpasangan={len(out)} pasangan={sum(len(v) for v in out.values())} "
          f"{dst.stat().st_size/1024:.1f} KB")


if __name__ == "__main__":
    main()
