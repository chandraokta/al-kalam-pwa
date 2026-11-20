import json
import urllib.request

UA = {"User-Agent": "alkalam-pwa/1.0"}


def get(u):
    return json.loads(urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=60).read().decode("utf-8"))


FIELDS = "code_v1,code_v2,text_uthmani,line_number,page_number,position,char_type_name"
u = ("https://api.qurancdn.com/api/v4/verses/by_chapter/1?words=true"
     f"&word_fields={FIELDS}&fields=text_uthmani&per_page=50")
d = get(u)
v = d["verses"][0]
print("ayat:", v["verse_key"], "| jumlah kata:", len(v["words"]))
for w in v["words"][:8]:
    print(f"  pos={w['position']:2} line={w.get('line_number')} page={w.get('page_number')} "
          f"type={w.get('char_type_name')} code_v1={w.get('code_v1')!r} text={w.get('text')!r}")

print("\n== halaman berbeda dalam satu surah ==")
u2 = ("https://api.qurancdn.com/api/v4/verses/by_chapter/2?words=true"
      f"&word_fields={FIELDS}&per_page=5")
d2 = get(u2)
for vv in d2["verses"][:3]:
    lines = sorted({w.get("line_number") for w in vv["words"] if w.get("line_number")})
    print(f"  {vv['verse_key']}: baris {lines} page={vv['words'][0].get('page_number')}")
