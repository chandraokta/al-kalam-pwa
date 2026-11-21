/**
 * Al-Kalam Digital — Konfigurasi
 * ---------------------------------------------------------------------------
 * Ubah di sini kalau aset (data + audio) mau ditaruh di repositori GitHub
 * terpisah, bukan di repo aplikasi ini.
 *
 * Contoh 1 — semua di repo ini (default, paling sederhana):
 *   dataBase:  './data/'
 *   audioBase: 'https://everyayah.com/data/'
 *
 * Contoh 2 — data di repo lain, disajikan lewat jsDelivr (gratis, ada CDN):
 *   dataBase:  'https://cdn.jsdelivr.net/gh/USERNAME/REPO-DATA@main/data/'
 *
 * Contoh 3 — data di repo lain lewat raw.githubusercontent.com:
 *   dataBase:  'https://raw.githubusercontent.com/USERNAME/REPO-DATA/main/data/'
 *
 * Catatan: raw.githubusercontent.com tidak mengirim header CORS untuk
 * sebagian kasus dan tanpa cache; jsDelivr lebih dianjurkan.
 * ---------------------------------------------------------------------------
 */
window.ALKALAM_CONFIG = {
  // Folder tempat file *.json.gz berada (harus diakhiri garis miring)
  dataBase: './data/',

  // true = pakai font dari folder lokal (./data/fonts/) supaya jalan tanpa internet.
  // Jalankan sekali:  python tools/fetch_layout.py fonts
  // Bisa juga dipaksa lewat URL:  index.html?offline=1
  offline: false,

  // Mushaf yang dipakai: 'madani' (QCF per halaman) atau 'indopak' (nastaleeq).
  mushaf: 'madani',

  mushafs: {
    madani: {
      label: 'Madani · QCF 604 halaman',
      layout: 'layout.json.gz',
      pageCount: 604,
      fontPerPage: true,
      fontsBase: 'https://static-cdn.tarteel.ai/qul/fonts/quran_fonts/v2/woff2/',
      fontQuery: '?v=3.2',
      // font berwarna: huruf sudah diwarnai menurut hukum tajwid
      fontsTajweedBase: 'https://static-cdn.tarteel.ai/qul/fonts/quran_fonts/v4-tajweed/woff2/',
      fontsLocal: ''      // isi './data/fonts/' bila font disimpan lokal
    },
    'kfgqpc-v1': {
      label: 'KFGQPC V1 · 604 halaman (1405H)',
      layout: 'layout-kfgqpc-v1.json.gz',
      pageCount: 604,
      fontPerPage: true,
      fontsBase: 'https://static-cdn.tarteel.ai/qul/fonts/quran_fonts/v1/woff2/',
      fontQuery: '?v=3.2',
      fontsLocal: ''
    },
    'kfgqpc-v4': {
      label: 'KFGQPC V4 · 604 halaman (1441H)',
      layout: 'layout-kfgqpc-v4.json.gz',
      pageCount: 604,
      fontPerPage: true,
      fontsBase: 'https://static-cdn.tarteel.ai/qul/fonts/quran_fonts/v4/woff2/',
      fontQuery: '?v=3.2',
      fontsLocal: ''
    },
    indopak: {
      label: 'IndoPak · 15 baris (Qudratullah)',
      layout: 'layout-indopak.json.gz',
      pageCount: 610,
      fontPerPage: false,
      fontFamily: 'indopak-nastaleeq',
      fontUrl: 'https://static-cdn.tarteel.ai/qul/fonts/nastaleeq/indopak-nastaleeq-waqf-lazim.woff2?v=3.4',
      // varian huruf: qul = font resmi QUL, light = goresan lebih tipis,
      // compact = huruf lebih ramping/rapat
      fontVariants: {
        qul:     { label: 'Seperti QUL', family: 'indopak-nastaleeq',
                   url: 'https://static-cdn.tarteel.ai/qul/fonts/nastaleeq/indopak-nastaleeq-waqf-lazim.woff2?v=3.4' },
        light:   { label: 'Ringan (goresan tipis)', family: 'indopak-nastaleeq-light',
                   url: 'https://static-cdn.tarteel.ai/qul/fonts/nastaleeq/KFGQPCNastaleeq-Regular.woff2?v=3.4' },
        compact: { label: 'Rapat (compact)', family: 'indopak-nastaleeq-compact',
                   url: 'https://static-cdn.tarteel.ai/qul/fonts/nastaleeq/Hanafi/compact-v4.2.2/with-waqf-lazmi/font.woff2?v=3.4' }
      },
      fontsLocal: ''      // './data/fonts/' untuk mode offline
    }
  },

  // dipertahankan agar kode lama tidak pecah
  fontsBase: 'https://static-cdn.tarteel.ai/qul/fonts/quran_fonts/v2/woff2/',
  fontQuery: '?v=3.2',
  fontsLocal: '',

  // Folder audio per ayat; URL akhir: {audioBase}{sss}{aaa}.mp3
  // Bisa diganti ke folder audio di repo Anda sendiri.
  audioBase: 'https://everyayah.com/data/',

  // Daftar qari.
  // `audioBase` = file MP3 satu surat penuh (001.mp3 … 114.mp3).
  // `qul` = id rekaman di Quranic Universal Library (TarteelAI), sumber
  //         timing kata per ayat; harus cocok dengan audio di atas.
  reciters: [
    { key: 'alafasy', name: 'Mishari Rashid Alafasy', qul: 7, audioBase: 'https://audio-cdn.tarteel.ai/quran/surah/alafasy/murattal/mp3/' },
    { key: 'abdulbasit', name: 'Abdul Basit Murattal', qul: 2, audioBase: 'https://audio-cdn.tarteel.ai/quran/surah/abdulBasit/murattal/mp3/' },
    { key: 'husary', name: 'Mahmoud Khalil Al-Husary', qul: 6, audioBase: 'https://audio-cdn.tarteel.ai/quran/surah/husary/murattal/mp3/' },
    { key: 'sudais', name: 'Abdur-Rahman As-Sudais', qul: 3, audioBase: 'https://audio-cdn.tarteel.ai/quran/surah/abdulrahmanAlSudais/murattal/mp3/' },
  { key: 'shatri', name: 'Abu Bakr Al-Shatri', qul: 4, audioBase: 'https://audio-cdn.tarteel.ai/quran/surah/abuBakrAlShatri/murattal/mp3/' },
  { key: 'minshawi', name: 'Muhammad Siddiq Al-Minshawi', qul: 9, audioBase: 'https://audio-cdn.tarteel.ai/quran/surah/minshawy/murattal/mp3/' },
  { key: 'shuraym', name: "Sa'ud Ash-Shuraym", qul: 10, audioBase: 'https://audio-cdn.tarteel.ai/quran/surah/saudAlShuraim/murattal/mp3/' }
  ]
};
