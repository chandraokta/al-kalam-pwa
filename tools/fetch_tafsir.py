#!/usr/bin/env python3
import json
import urllib.request
import gzip
import time

UA = {"User-Agent": "alkalam-pwa/1.0"}

def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=40) as resp:
        return json.loads(resp.read().decode("utf-8"))

tafsir_short = {}
tafsir_long = {}

for s in range(1, 115):
    url = f"https://api.quran.gading.dev/surah/{s}"
    try:
        data = get(url)
        for verse in data["data"]["verses"]:
            key = f"{s}:{verse['number']}"
            taf = verse.get("tafsir", {})
            id_taf = taf.get("id", {})
            short = id_taf.get("short")
            long = id_taf.get("long")
            if short:
                tafsir_short[key] = short
            if long:
                tafsir_long[key] = long
        print(f"Surah {s:3d}: {len(data['data']['verses'])} ayat")
    except Exception as e:
        print(f"Surah {s:3d} FAIL: {e}")
    time.sleep(0.05)

print(f"\nTotal tafsir short: {len(tafsir_short)}")
print(f"Total tafsir long:  {len(tafsir_long)}")

with gzip.open(r"C:\CO\pemrograman\AL KALAM\data\tafsir_id_short.json.gz", "wt", encoding="utf-8") as f:
    json.dump(tafsir_short, f, ensure_ascii=False, separators=(",", ":"))
with gzip.open(r"C:\CO\pemrograman\AL KALAM\data\tafsir_id_long.json.gz", "wt", encoding="utf-8") as f:
    json.dump(tafsir_long, f, ensure_ascii=False, separators=(",", ":"))
print("Saved tafsir_id_short.json.gz and tafsir_id_long.json.gz")

for k in sorted(tafsir_short.keys(), key=lambda x: (int(x.split(":")[0]), int(x.split(":")[1])))[:3]:
    print(f"  {k}: {tafsir_short[k][:100]}")