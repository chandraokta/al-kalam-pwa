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

trans = {}
for s in range(1, 115):
    url = f"https://api.quran.gading.dev/surah/{s}"
    try:
        data = get(url)
        for verse in data["data"]["verses"]:
            key = f"{s}:{verse['number']}"
            tr = verse.get("translation", {}).get("id")
            if tr:
                trans[key] = tr
        print(f"Surah {s:3d}: {len(data['data']['verses'])} ayat")
    except Exception as e:
        print(f"Surah {s:3d} FAIL: {e}")
    time.sleep(0.05)

print(f"\nTotal translated verses: {len(trans)}")

out_path = r"C:\CO\pemrograman\AL KALAM\data\translation_indo_gading.json.gz"
with gzip.open(out_path, "wt", encoding="utf-8") as f:
    json.dump(trans, f, ensure_ascii=False, separators=(",", ":"))
print(f"Saved to {out_path}")

# sample
for k in sorted(trans.keys())[:5]:
    print(f"  {k}: {trans[k][:80]}")