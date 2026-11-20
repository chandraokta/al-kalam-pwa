#!/usr/bin/env python3
"""
Bangun halaman mushaf untuk repo kita:
  sumber : Miftah-Fentaw/Quran-Images (MIT) — webp/001..604.webp, 1080x1440, tinta transparan
  hasil  : data/pages/001.webp .. 604.webp — tinta di atas latar kertas, WebP q≈82

Pemakaian:
  python tools/fetch_pages.py            # semua 604 halaman
  python tools/fetch_pages.py 1 2 3      # halaman tertentu (untuk uji)
"""
import concurrent.futures as cf
import io
import pathlib
import sys
import time
import urllib.request

from PIL import Image

SRC = "https://raw.githubusercontent.com/Miftah-Fentaw/Quran-Images/main/webp/{n:03d}.webp"
OUT = pathlib.Path(__file__).resolve().parent.parent / "data" / "pages"
PAPER = (255, 253, 246)  # warna kertas (krem terang)
WIDTH = 900              # lebar akhir (px); 1080 = asli, 700 = paling kecil
QUALITY = 78
UA = {"User-Agent": "alkalam-pwa/1.0"}


def build(n: int) -> tuple[int, int, str]:
    dst = OUT / f"{n:03d}.webp"
    if dst.exists() and dst.stat().st_size > 3000:
        return n, dst.stat().st_size, "ada"
    for attempt in range(4):
        try:
            raw = urllib.request.urlopen(urllib.request.Request(SRC.format(n=n), headers=UA), timeout=90).read()
            ink = Image.open(io.BytesIO(raw)).convert("RGBA")
            if WIDTH and ink.width != WIDTH:
                h = round(WIDTH * ink.height / ink.width)
                ink = ink.resize((WIDTH, h), Image.LANCZOS)
            paper = Image.new("RGB", ink.size, PAPER)
            paper.paste(ink, mask=ink.split()[3])
            buf = io.BytesIO()
            paper.save(buf, "WEBP", quality=QUALITY, method=6)
            data = buf.getvalue()
            dst.write_bytes(data)
            return n, len(data), "ok"
        except Exception as e:
            if attempt == 3:
                return n, 0, f"gagal: {e}"
            time.sleep(1.5 * (attempt + 1))
    return n, 0, "gagal"


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    pages = [int(a) for a in sys.argv[1:]] or list(range(1, 605))
    t0 = time.time()
    total = 0
    bad = []
    with cf.ThreadPoolExecutor(max_workers=6) as pool:
        for n, size, status in pool.map(build, pages):
            total += size
            if status.startswith("gagal"):
                bad.append((n, status))
            if len(pages) > 20 and n % 50 == 0:
                print(f"  {n}/604 ... {total/1024/1024:.1f} MB", flush=True)
    done = len(pages) - len(bad)
    print(f"\n{done}/{len(pages)} halaman · {total/1024/1024:.1f} MB · "
          f"rata-rata {total/max(done,1)/1024:.0f} KB · {time.time()-t0:.0f} s")
    if bad:
        print("gagal:", bad[:10])
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
