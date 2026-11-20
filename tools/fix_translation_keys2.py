#!/usr/bin/env python3
import json
import gzip

# load chapters untuk mapping global_ayah -> (surah, ayah_in_surah)
with gzip.open(r"C:\CO\pemrograman\AL KALAM\data\chapters.json.gz", "rt", encoding="utf-8") as f:
    chapters = json.load(f)

ayah_to_surah = {}
global_ayah = 0
for ch in chapters:
    surah = ch["id"]
    n = ch["verses_count"]
    for ayah in range(1, n + 1):
        global_ayah += 1
        ayah_to_surah[global_ayah] = (surah, ayah)

print(f"Total global ayah mapped: {global_ayah}")

# load broken translation
with gzip.open(r"C:\CO\pemrograman\AL KALAM\data\translation_indo_gading.json.gz", "rt", encoding="utf-8") as f:
    data = json.load(f)

fixed = {}
for k, v in data.items():
    # k = "1:{'inQuran': 1, 'inSurah': 1}"
    # extract inQuran (global ayah number)
    import re
    m = re.search(r"inQuran': (\d+)", k)
    if m:
        g = int(m.group(1))
        if g in ayah_to_surah:
            surah, ayah = ayah_to_surah[g]
            fixed[f"{surah}:{ayah}"] = v
        else:
            print(f"  WARNING: global ayah {g} not in map")
    else:
        # fallback
        fixed[k] = v

print(f"Fixed count: {len(fixed)}")
for k in sorted(fixed.keys(), key=lambda x: (int(x.split(":")[0]), int(x.split(":")[1])))[:5]:
    print(f"  {k}: {fixed[k][:80]}")
# check last
last = sorted(fixed.keys(), key=lambda x: (int(x.split(":")[0]), int(x.split(":")[1])))[-1]
print(f"  {last}: {fixed[last][:80]}")

with gzip.open(r"C:\CO\pemrograman\AL KALAM\data\translation_indo.json.gz", "wt", encoding="utf-8") as f:
    json.dump(fixed, f, ensure_ascii=False, separators=(",", ":"))
print("Saved translation_indo.json.gz")