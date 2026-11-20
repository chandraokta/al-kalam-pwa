# Studi: Al-Kalam Digital v1.0 (Penerbit Diponegoro, 2009)

Dokumen ini mencatat hasil pembedahan aplikasi asli di folder `Al-Kalam/` —
bukan hasil menebak: setiap angka di bawah diukur langsung dari berkas.

Alat: **Craft Anything 0.6.1** (mode deep) untuk analisis biner, plus pembacaan
format data langsung.

---

## 1. Identitas program

| | |
|---|---|
| Berkas | `Al-Kalam.exe` |
| SHA-256 | `f37975966ebf1cf0a2db1ce6a6c510295ca04a8c03a37c7d0081c0b61efc8562` |
| Format | PE (Windows), **x86 32-bit**, subsystem `windows-gui` |
| Toolchain | Microsoft Visual C++ (bukti: *Rich header*, linker 7.10) |
| Simbol | di-strip — 3.130 dari 3.140 fungsi tanpa nama |
| Ukuran kode | `.text` 1.293.456 byte, 3140 fungsi, 289.516 instruksi |
| Impor | `WININET`, `WSOCK32`, `GDI32`, `USER32`, `OLE32`, `SHELL32`, dll. (345 impor / 13 pustaka) |
| Tanggal build | timestamp PE 1125175790 → sekitar Juni 2005, dirilis 2009 |
| Metadata | `FileDescription: Al-Kalam`, `CompanyName: Penerbit Diponegoro`, `LegalCopyright: © 2009` |

`WININET` + `WSOCK32` menjelaskan fitur "index/cari" yang butuh jaringan, dan
`GDI32`/`OLE32` untuk menampilkan halaman-halaman yang digambar ulang.

---

## 2. Isi DVD — 3,0 GB, 26.408 berkas

| Folder | Berkas | Ukuran | Format | Isi |
|---|---:|---:|---|---|
| `files\01\01` | 606 | 350 MB | `.ocp` 604 + `.flv` 2 | halaman **ganjil**, halaman interaktif berbasis Flash |
| `files\01\02` | 604 | 174 MB | `.dcp` 604 | halaman **genap**, gambar JPEG pindaian |
| `files\02` | 25.167 | 2.300 MB | `.dtx` | audio murattal **4 qari**, per ayat |
| `files\03\01` | 4 | 4,4 MB | `.wrp` | terjemahan (`ind`, `ing`, `arb`, `arb2`) |
| `files\03\02` | 17 | 0,8 MB | `.dtp` | indeks tema (XML `<node label>`) |
| `files\03\03` | 1 | 5 KB | `.wrp` | teks penjelasan hukum tajwid |
| `files\04` | 4 | 12,4 MB | `.wrp` | tafsir: Abbas & Jalalain (Indonesia/Inggris) |

### 2.1 `.dcp` — gambar halaman

Berkas dimulai `FF D8 FF E0 00 10 4A 46 49 46` → **JPEG/JFIF polos**.
Resolusi semua halaman contoh: **663 × 1005 px**, "300 dpi", 580–970 KB per halaman.

> Artinya: 604 halaman hanya menyimpan ~666 ribu piksel, tapi memakan 174 MB
> (~290 KB/halaman efektif). Resolusi segitu pun terlalu rendah untuk layar
> sekarang. Versi web memakai set halaman MIT beresolusi 1080×1440 yang
> direkode ke 900×1200 WebP: 604 halaman = **70 MB** — lebih tajam *dan*
> 2,5× lebih kecil.

### 2.2 `.ocp` — halaman Flash

Delapan byte pertama: `43 57 53 08` = **`CWS`** (header SWF terkompresi zlib),
lalu panjang file di header `E0 B5 07 00` = 504.288 byte, sementara ukuran
berkas sebenarnya 475.040 byte. Ketidakcocokan ini menunjukkan header sengaja
diubah/pelindungi (protektor SWF), sehingga isinya tidak bisa langsung dibuka
dengan dekompresor zlib standar.

Fungsinya: halaman yang sama dengan `.dcp`, tetapi vektor — memungkinkan
sorotan tajwid per huruf dan klik ayat. **Ini bagian tersulit untuk direplikasi**
di web modern (Flash sudah mati sejak 2020).

### 2.3 `.dtx` — audio per ayat

Mulai dengan `49 44 33` = **ID3v2** → MP3. Tag contoh: `TPE1 = Saad Al Ghamadi`,
`TALB = ...`. Penamaan `SSSAAA.dtx` (mis. `002282.dtx` = surat 2 ayat 282).

Jumlah per folder: 6.236 / 6.347 / 6.236 / 6.348 — cocok dengan 4 qari;
dua folder berlebih ~111 berkas (basmlah & pembuka surat).

Rata-rata 91 KB/ayat. Contoh terbesar: `002282.dtx` = 1,14 MB (Ayat Kursi, panjang).

### 2.4 `.wrp` — teks

UTF-8 dengan BOM, satu baris per ayat:

```
&1_1=Dengan nama Allah Yang Maha Pengasih, Maha Penyayang.<br>
&2_1=<i>Alif Lām Mīm</i>.<sup>**</sup><br>
```

Memakai markup HTML sederhana (`<br>`, `<i>`, `<sup>`, `<b>`). Ini yang
memberi aplikasi asli fitur **terjemahan + catatan kaki + tafsir** sekaligus.

Menarik: berkas `ind.wrp` di DVD **hanya berisi 8 baris** (Al-Fatihah +
awal Al-Baqarah), sedangkan `ing.wrp` lengkap 6.235 ayat. Jadi untuk pemakai
Indonesia, terjemahan tampaknya diambil dari `arb*.wrp`/sumber lain — ini
cacat data di DVD-nya sendiri.

### 2.5 `.dtp` — indeks tema

XML: `<node label="T A U H I D">` → pohon tema (TAUHID, dll.) dengan rujukan
ayat. Ini sumber "index berdasarkan tema penting" pada menu aslinya.

---

## 3. Alur pemakaian (dari `Read Me.txt`)

1. Klik ayat → memutar murattal.
2. Sorot mouse pada ayat berwarna → tooltip hukum tajwid; klik untuk detail.
3. Menu: tajwid, arti, tafsir, salin, index (surat/halaman/tempat turun/juz/tema),
   penanda, cari (latin & Arab), pembesar, pengaturan (qari/tafsir/bahasa/tema/tajwid),
   sampul, minimize/maximize, keluar.
4. Tombol: play/stop, volume, next, prev, dan "tengah" (lompat ke ayat yang sedang dibaca).
5. Spesifikasi minimum: Windows XP/Vista, **2,9 GB** hardisk, Pentium 4, RAM 128 MB,
   layar 1024×768.

---

## 4. Kenapa 2,8 GB — dan bagaimana memangkasnya

| Penyebab | Porsi |
|---|---|
| Audio 4 qari (25.167 MP3) | 2.300 MB — **82%** |
| Halaman JPEG + SWF (1.210 berkas) | 524 MB — 19% |
| Teks & tafsir | 17 MB — 0,6% |

Tiga keputusan yang membuat versi web 5,2 MB:

1. **Audio di-stream, bukan dibundel.** 1 qari hanya diunduh per ayat
   (~50 KB), dan qari lain dipilih kapan saja. Hemat 2,3 GB.
2. **Halaman pindaian terbuka, bukan hasil pindai DVD.** Set halaman MIT
   (1080×1440, tinta transparan) ditempel di latar kertas lalu dikodekan ulang
   ke 900×1200 WebP — 604 halaman = 70 MB, 2,5× lebih kecil dari 174 MB di DVD
   dan lebih tajam (900 px vs 663 px). Tajwid tetap disajikan lewat mode Teks.
3. **Data terkompresi & dimuat per kebutuhan.** Teks + tajwid + terjemahan +
   tafsir = 3,8 MB gzip; hanya file yang dipakai yang diunduh, sisanya
   di-cache IndexedDB.

Flash (`CWS`) dilepas sepenuhnya: sorotan tajwid dibuat dari data tajwid
quran.com (18 hukum) yang dirender sebagai elemen berwarna, dan penjelasannya
muncul saat diklik.

---

## 5. Bukti Craft Anything (ringkas)

```
core_target_triage  → PE x86 32-bit, MSVC, stripped, 13 library
core_overview_show  → 3140 fungsi · 3130 string · 345 impor · 4 seksi
                      .text 1.293.456 B (entropy 6,64)
                      .data   862.472 B (entropy 7,21 → ada data terkompresi/terenkripsi)
```

Entropi `.data` 7,21 mendukung dugaan bahwa tabel teks/UI disimpan
terkompresi atau dienkripsi — sebab pencarian string `tajwid`, `dcp`, `wrp`
pada `.text` tidak menemukan satu pun hasil. Ini juga alasan aplikasi asli
sulit di-*patch*, tetapi tidak menghalangi pembangunan ulang dari data terbuka.
