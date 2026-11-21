#!/usr/bin/env python3
"""
Ambil topik/tema ayat dari QUL (halaman publik /topics).

Hasil: data/topics.json.gz
{
  "topics": { "102": {"n": "Abel", "ar": "هابيل", "d": "…", "a": ["5:27", …] } },
  "byAyah": { "5:27": [102, …] }
}
"""
import concurrent.futures as cf
import gzip
import html as htmllib
import json
import pathlib
import re
import sys
import time
import urllib.request

BASE = "https://qul.tarteel.ai"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120 Safari/537.36"}
ROOT = pathlib.Path(__file__).resolve().parent.parent / "data"

ID_LINK = re.compile(r'href="/topics/(\d+)"')
NAME = re.compile(r"<dt[^>]*>\s*Name\s*</dt>\s*<dd[^>]*>(.*?)</dd>", re.S)
ARNAME = re.compile(r"<dt[^>]*>\s*Arabic name\s*</dt>\s*<dd[^>]*>(.*?)</dd>", re.S)
DESC = re.compile(r'<div class="mt-4 text-gray-800">(.*?)</div>\s*</div>', re.S)
AYAHS = re.compile(r">\s*(\d{1,3}:\d{1,3})\s*<div class=\"text-xs text-gray-500\"")
TAG = re.compile(r"<[^>]+>")


def get(url, timeout=45):
    for attempt in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
                return r.read().decode("utf-8", "ignore")
        except Exception:
            if attempt == 3:
                return None
            time.sleep(1.2 * (attempt + 1))
    return None


def clean(s: str, limit: int = 320) -> str:
    s = TAG.sub(" ", s or "")
    s = htmllib.unescape(s)
    s = re.sub(r"\s+", " ", s).strip()
    return s[:limit]


def list_ids():
    ids = []
    seen = set()
    for page in range(1, 80):
        html = get(f"{BASE}/topics?per_page=100&page={page}")
        if not html:
            break
        found = [int(x) for x in ID_LINK.findall(html)]
        new = [i for i in found if i not in seen]
        if not new:
            break
        for i in new:
            seen.add(i)
            ids.append(i)
        print(f"  halaman {page}: +{len(new)} (total {len(ids)})", flush=True)
        if len(found) < 10:
            break
    return ids


def parse_topic(tid: int):
    html = get(f"{BASE}/topics/{tid}")
    if not html:
        return tid, None
    name = clean(NAME.search(html).group(1), 120) if NAME.search(html) else ""
    ar = clean(ARNAME.search(html).group(1), 80) if ARNAME.search(html) else ""
    desc = clean(DESC.search(html).group(1)) if DESC.search(html) else ""
    ayahs = []
    for a in AYAHS.findall(html):
        if a not in ayahs:
            ayahs.append(a)
    return tid, {"n": name, "ar": ar, "d": desc, "a": ayahs}


def main():
    t0 = time.time()
    print("daftar topik…", flush=True)
    ids = list_ids()
    print(f"{len(ids)} topik ditemukan", flush=True)

    topics, by_ayah = {}, {}
    done = 0
    with cf.ThreadPoolExecutor(max_workers=8) as pool:
        for tid, data in pool.map(parse_topic, ids):
            done += 1
            if not data or not data["n"]:
                continue
            topics[str(tid)] = data
            for a in data["a"]:
                by_ayah.setdefault(a, []).append(tid)
            if done % 400 == 0:
                print(f"  {done}/{len(ids)}…", flush=True)

    out = {"topics": topics, "byAyah": by_ayah}
    path = ROOT / "topics.json.gz"
    with gzip.open(path, "wt", encoding="utf-8", compresslevel=9) as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print(f"selesai: {path} ({path.stat().st_size/1024:.0f} KB) "
          f"| {len(topics)} topik | {len(by_ayah)} ayat | {time.time()-t0:.0f}s")


if __name__ == "__main__":
    main()
