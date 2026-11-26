# Arsitektur Modul Al-Kalam

Dokumen ini menjadi aturan pemisahan modul agar fitur baru tidak menimpa
setelan fitur lain. Setiap setelan punya **pemilik tunggal**.

## Kondisi saat ini (masalah)

| Masalah | Contoh |
|---|---|
| Monolit | `js/hifz.js` ±3.600 baris: scope, metode, setoran, murajaah, rapor, UI. |
| Setelan bertumpuk | `settings.repeatCount`, `settings.audioRate`, `settings.pageTarget` dibaca beberapa fitur sekaligus. |
| Dua "setoran" | Catatan setoran ke guru (`methods.setoran`) dan setoran tersembunyi (Tilawa) tanpa penyimpanan sendiri. |
| Dua "target" | `hafalHariIni` dan `scope` bisa saling mengubah. |
| Audio bercampur | Dulu pemutar metode memakai audio mode baca (sudah dipisah ke `method-player.js`). |

## Peta modul (target)

```
js/
  core/
    store.js          # baca/tulis state, versi skema, migrasi
    settings.js        # definisi setelan per modul (pemilik + default)
    util.js            # fmt waktu, esc, tanggal
  modules/
    scope.js           # daftar hafalan (juz/surat/rentang) + ringkasan
    today.js           # target "Hafal apa kita hari ini?"
    method.js          # Metode 20×: langkah, estimasi waktu, UI
    method-player.js   # pemutar audio metode (SUDAH dipisah)
    tilawa.js          # pembungkus Tilawa (SUDAH terpisah)
    setoran.js         # setoran tersembunyi + catatan guru
    murajaah.js        # sesi harian, program pekan, retensi
    rapor.js           # grafik & riwayat
  hifz.js              # hanya perakitan tampilan (render + event)
```

## Aturan setelan

1. Setelan disimpan berkelompok: `S.modules.<modul>.<kunci>`.
2. Hanya modul pemilik yang boleh menulis kuncinya.
3. Setelan lama dipetakan sekali lewat migrasi (`schema: 2`):
   `settings.repeatCount` → `modules.method.repeat` (dibaca modul metode saja),
   `settings.audioRate` → `modules.reader.rate` (modul baca saja),
   `settings.pageTarget` → `modules.method.pageTarget`.
4. Setelan baru **wajib** mendaftar di `core/settings.js`:

```js
{ id: 'method.repeat', group: 'Metode 20×', owner: 'method',
  type: 'select', options: [3,5,10,20], default: 20 }
```

5. UI Pengaturan dirender dari daftar itu, dikelompokkan per modul, sehingga
   penambahan setelan tidak mengubah setelan lain.

## Urutan pengerjaan

1. **Selesai**: `tilawa.js`, `method-player.js` (modul mandiri).
2. `core/store.js` + `core/settings.js` + migrasi v1→v2 (tanpa mengubah UI).
3. Pindahkan `scope.js` + `today.js`.
4. Pindahkan `setoran.js` (catatan guru & Tilawa jadi satu pemilik).
5. Pindahkan `murajaah.js` + `rapor.js`; `hifz.js` tinggal render.
6. Uji ulang: target, metode, auto-lanjut, setoran tersembunyi, murajaah.
