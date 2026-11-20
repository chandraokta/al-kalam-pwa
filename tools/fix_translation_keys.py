#!/usr/bin/env python3
import json
import gzip
import re

with gzip.open(r"C:\CO\pemrograman\AL KALAM\data\translation_indo_gading.json.gz", "rt", encoding="utf-8") as f:
    data = json.load(f)

print("Original keys sample:", list(data.keys())[:3])

fixed = {}
for k, v in data.items():
    # k looks like "100:{'inQuran': 6147, 'inSurah': 1}"
    # extract the dict part
    if "{" in k:
        dict_part = k[k.index("{"):]
        # parse as python dict (it's a repr)
        try:
            d = eval(dict_part)
            surah = d["inQuran"]
            ayah = d["inSurah"]
            fixed[f"{surah}:{ayah}"] = v
        except:
            pass
    else:
        # maybe already simple
        fixed[k] = v

print(f"Fixed count: {len(fixed)}")
for k in sorted(fixed.keys())[:5]:
    print(f"  {k}: {fixed[k][:80]}")

with gzip.open(r"C:\CO\pemrograman\AL KALAM\data\translation_indo.json.gz", "wt", encoding="utf-8") as f:
    json.dump(fixed, f, ensure_ascii=False, separators=(",", ":"))
print("Saved translation_indo.json.gz")