#!/usr/bin/env python3
"""
Bangun data morfologi kata dari Quranic Arabic Corpus (dataset terbuka).

Sumber: mustafa0x/quran-morphology (quran-morphology.txt)
Baris: surah:ayah:kata:segmen \t bentuk \t POS \t fitur

Hasil: data/morphology.json.gz
  { "1:1": { "1": [ {"f":"بِ","pos":"P","root":"","lem":"ب"}, … ], … }, … }
"""
import gzip
import json
import pathlib
import urllib.request

SRC = "https://raw.githubusercontent.com/mustafa0x/quran-morphology/master/quran-morphology.txt"
ROOT = pathlib.Path(__file__).resolve().parent.parent / "data"
UA = {"User-Agent": "alkalam-pwa/1.0"}


def parse_feats(raw: str) -> dict:
    out = {"root": "", "lem": ""}
    for part in raw.split("|"):
        if part.startswith("ROOT:"):
            out["root"] = part[5:]
        elif part.startswith("LEM:"):
            out["lem"] = part[4:]
    return out


def main():
    with urllib.request.urlopen(urllib.request.Request(SRC, headers=UA), timeout=180) as r:
        lines = r.read().decode("utf-8", "ignore").splitlines()

    data: dict[str, dict[str, list]] = {}
    for line in lines:
        if not line.strip() or line.startswith("#"):
            continue
        parts = line.split("\t")
        if len(parts) < 3:
            continue
        loc = parts[0].split(":")
        if len(loc) != 4:
            continue
        s, a, w, _seg = loc
        form = parts[1].strip()
        pos = parts[2].strip()
        feats = parse_feats(parts[3] if len(parts) > 3 else "")
        verse = f"{int(s)}:{int(a)}"
        data.setdefault(verse, {}).setdefault(w, []).append(
            {"f": form, "pos": pos, "root": feats["root"], "lem": feats["lem"]}
        )

    dst = ROOT / "morphology.json.gz"
    with gzip.open(dst, "wt", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    n = sum(len(ws) for ws in data.values())
    print(f"ayat={len(data)} kata={n} {dst.stat().st_size/1024:.0f} KB")


if __name__ == "__main__":
    main()
