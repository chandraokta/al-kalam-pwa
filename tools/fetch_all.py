#!/usr/bin/env python3
"""
Al-Kalam Digital PWA — data fetcher
Mengambil seluruh data Qur'an dari quran.com API (teks, tajwid, terjemahan, tafsir, audio URL)
dan menghasilkan file JSON terkompresi untuk PWA.
"""
import json
import urllib.request
import gzip
import time
from pathlib import Path

# ── config ──────────────────────────────────────────────────────────────
BASE_API = "https://api.qurancdn.com"
# ID terjemahan Indonesia: 33 = Kemenag, 134 = King Fahad, 141 = Sabiq Company
TRANSLATION_ID = 33
# ID tafsir Indonesia: kita pakai Tafsir Muyassar (16) — arab; 
# tafsir Indonesia tidak tersedia di quran.com, akan diambil dari sumber lain
TAFSIR_ID = 16  # arabic Muyassar sebagai fallback
# Audio: quran.com field audio=6 (Husary 64kbps via mirrors), 
# tapi kita pakai everyayah Alafasy 64kbps karena URL polanya konsisten & cepat
AUDIO_RECITER = "Alafasy_64kbps"
AUDIO_URL_TEMPLATE = f"https://everyayah.com/data/{AUDIO_RECITER}/{{surah:03d}}{{ayah:03d}}.mp3"

OUT_DIR = Path(__file__).parent.parent / "data"
OUT_DIR.mkdir(parents=True, exist_ok=True)

HEADERS = {"User-Agent": "alkalam-pwa/1.0 (+https://github.com/your-org/alkalam)"}

def fetch(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=40) as resp:
        return json.loads(resp.read().decode("utf-8"))

def fetch_all(url, key):
    """Fetch paginated list until empty."""
    items = []
    page = 1
    per_page = 300
    while True:
        data = fetch(f"{url}&page={page}&per_page={per_page}")
        batch = data.get(key, [])
        if not batch:
            break
        items.extend(batch)
        if len(batch) < per_page:
            break
        page += 1
        time.sleep(0.05)
    return items

def save_gzip(obj, filename):
    path = OUT_DIR / filename
    with gzip.open(path, "wt", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    print(f"  → {path.name} ({path.stat().st_size/1024:.1f} KB)")

# ═══════════════════════════════════════════════════════════════════════
# 1) Meta surat (114)
# ═══════════════════════════════════════════════════════════════════════
print("📥 Fetching chapters...")
chapters = fetch(f"{BASE_API}/api/qdc/chapters?language=id")["chapters"]
for c in chapters:
    c["name_id"] = c["translated_name"]["name"]
    c["revelation"] = c["revelation_place"]
    # hitung range ayat
    c["verse_range"] = None  # diisi nanti
save_gzip(chapters, "chapters.json.gz")

# ═══════════════════════════════════════════════════════════════════════
# 2) Ayat per surat + tajwid + terjemahan + audio URL template
# ═══════════════════════════════════════════════════════════════════════
print("📥 Fetching verses per chapter...")
all_verses = {}
verse_count = 0
for ch in chapters:
    surah = ch["id"]
    n = ch["verses_count"]
    fields = "text_uthmani,text_uthmani_tajweed,verse_key,page_number,juz_number,hizb_number,rub_el_hizb_number,ruku_number"
    data = fetch(f"{BASE_API}/api/qdc/verses/by_chapter/{surah}?fields={fields}&per_page={n}&translation={TRANSLATION_ID}")
    verses = data.get("verses", [])
    for v in verses:
        v["surah"] = surah
        # buat audio URL manual
        ayah = v["verse_number"]
        v["audio_url"] = AUDIO_URL_TEMPLATE.format(surah=surah, ayah=ayah)
        # tambahkan terjemahan (sudah dalam response karena translation=)
        # struktur: v["translations"] = [{"text": "..."}]
    all_verses[surah] = verses
    verse_count += len(verses)
    ch["verse_range"] = f"1-{n}" if n > 1 else "1"
    time.sleep(0.08)

print(f"  total verses: {verse_count}")
save_gzip(all_verses, "verses_by_chapter.json.gz")

# ═══════════════════════════════════════════════════════════════════════
# 3) Peta halaman: 604 halaman → list verse_keys per halaman
# ═══════════════════════════════════════════════════════════════════════
print("📥 Building page map...")
page_map = {}
for surah, verses in all_verses.items():
    for v in verses:
        pg = v["page_number"]
        page_map.setdefault(pg, []).append({
            "verse_key": v["verse_key"],
            "surah": surah,
            "ayah": v["verse_number"],
            "juz": v.get("juz_number")
        })
# urutkan halaman 1–604
page_list = [{"page": pg, "verses": page_map[pg]} for pg in range(1, 605)]
save_gzip(page_list, "page_map.json.gz")

# ═══════════════════════════════════════════════════════════════════════
# 4) Juz map (30 juz)
# ═══════════════════════════════════════════════════════════════════════
print("📥 Building juz map...")
juz_map = {}
for surah, verses in all_verses.items():
    for v in verses:
        j = v.get("juz_number")
        if j:
            juz_map.setdefault(j, []).append(v["verse_key"])
juz_list = [{"juz": j, "verses": juz_map[j]} for j in range(1, 31)]
save_gzip(juz_list, "juz_map.json.gz")

# ═══════════════════════════════════════════════════════════════════════
# 5) Terjemahan per ayat (sudah dalam verses, tapi ekstrak ringkas)
# ═══════════════════════════════════════════════════════════════════════
print("📥 Extracting translation map...")
trans_map = {}
for surah, verses in all_verses.items():
    for v in verses:
        vk = v["verse_key"]
        # ambil teks terjemahan
        tr = v.get("translations", [{}])[0]
        if tr.get("text"):
            trans_map[vk] = tr["text"]
save_gzip(trans_map, "translation_id.json.gz")

# ═══════════════════════════════════════════════════════════════════════
# 6) Tajwid per ayat (sudah dalam verses, ekstrak ringkas)
# ═══════════════════════════════════════════════════════════════════════
print("📥 Extracting tajwid map...")
tajwid_map = {}
for surah, verses in all_verses.items():
    for v in verses:
        vk = v["verse_key"]
        tj = v.get("text_uthmani_tajweed")
        if tj:
            tajwid_map[vk] = tj
save_gzip(tajwid_map, "tajwid.json.gz")

# ═══════════════════════════════════════════════════════════════════════
# 7) Meta index (untuk load cepat di PWA)
# ═══════════════════════════════════════════════════════════════════════
meta = {
    "chapters": len(chapters),
    "verses": verse_count,
    "pages": 604,
    "juz": 30,
    "translation_id": TRANSLATION_ID,
    "tafsir_id": TAFSIR_ID,
    "audio_reciter": AUDIO_RECITER,
    "audio_template": AUDIO_URL_TEMPLATE,
    "generated_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
    "source_api": BASE_API,
}
save_gzip(meta, "meta.json.gz")

print("\n✅ Semua file disimpan ke:", OUT_DIR)
for f in sorted(OUT_DIR.glob("*.gz")):
    print(f"   {f.name}  {f.stat().st_size/1024:.1f} KB")