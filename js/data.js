/**
 * Al-Kalam Digital — Data Layer
 * Memuat file JSON.gz via fetch + pako.deflate, caching di IndexedDB
 */
const DataManager = (() => {
  const DB_NAME = 'alkalam-data';
  const DB_VERSION = 1;
  const STORE_NAME = 'files';
  // Bisa diarahkan ke repo GitHub lain lewat js/config.js
  const CFG = (typeof window !== 'undefined' && window.ALKALAM_CONFIG) || {};
  const DATA_BASE = CFG.dataBase || './data/';
  const AUDIO_BASE = CFG.audioBase || 'https://everyayah.com/data/';
  
  let dbPromise = null;
  const memoryCache = new Map();
  
  // Daftar file yang perlu dimuat
  const FILES = [
    { id: 'chapters', file: 'chapters.json.gz', required: true },
    { id: 'verses', file: 'verses_by_chapter.json.gz', required: true },
    { id: 'pageMap', file: 'page_map.json.gz', required: true },
    { id: 'juzMap', file: 'juz_map.json.gz', required: true },
    { id: 'tajwid', file: 'tajwid.json.gz', required: false },
    { id: 'translation_indo', file: 'translation_indo.json.gz', required: true },
    { id: 'translation_eng', file: 'translation_eng_alkalam.json.gz', required: false },
    { id: 'tafsir_short', file: 'tafsir_id_short_fixed.json.gz', required: false },
    { id: 'tafsir_long', file: 'tafsir_id_long_fixed.json.gz', required: false },
    // terjemahan tambahan (QUL / quran.com)
    { id: 'translation_kemenag', file: 'translation_kemenag.json.gz', required: false },
    { id: 'translation_kfh', file: 'translation_kfh.json.gz', required: false },
    { id: 'translation_saheeh', file: 'translation_saheeh.json.gz', required: false },
    { id: 'translation_pickthall', file: 'translation_pickthall.json.gz', required: false },
    { id: 'translation_urdu', file: 'translation_urdu.json.gz', required: false },
    { id: 'translation_turkish', file: 'translation_turkish.json.gz', required: false },
    { id: 'translation_translit', file: 'translation_translit.json.gz', required: false },
    // tafsir tambahan
    { id: 'tafsir_muyassar', file: 'tafsir_muyassar.json.gz', required: false },
    { id: 'words', file: 'words.json.gz', required: false },
    { id: 'similar', file: 'similar.json.gz', required: false },
    { id: 'morphology', file: 'morphology.json.gz', required: false },
    { id: 'meta', file: 'meta.json.gz', required: true },
  ];
  
  // ═══════════════════════════════════════════════════════════════
  // IndexedDB
  // ═══════════════════════════════════════════════════════════════
  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
    });
    return dbPromise;
  }
  
  async function idbGet(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  
  async function idbPut(key, value) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
  
  // ═══════════════════════════════════════════════════════════════
  // Fetch & Decompress
  // ═══════════════════════════════════════════════════════════════
  async function fetchAndDecompress(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
    // DecompressionStream('gzip') is native in all modern browsers (Chrome 80+, Safari 16.4+, Firefox 113+)
    if (typeof DecompressionStream !== 'undefined') {
      const ds = new DecompressionStream('gzip');
      const text = await new Response(response.body.pipeThrough(ds)).text();
      return JSON.parse(text);
    }
    // Fallback: pako if present
    if (typeof pako !== 'undefined') {
      const buf = await response.arrayBuffer();
      return JSON.parse(pako.inflate(new Uint8Array(buf), { to: 'string' }));
    }
    throw new Error('Browser ini tidak mendukung DecompressionStream');
  }
  
  // ═══════════════════════════════════════════════════════════════
  // Public API
  // ═══════════════════════════════════════════════════════════════
  async function load(fileId) {
    // 1. Memory cache
    if (memoryCache.has(fileId)) return memoryCache.get(fileId);
    
    // 2. IndexedDB cache
    const cached = await idbGet(fileId);
    if (cached) {
      memoryCache.set(fileId, cached);
      return cached;
    }
    
    // 3. Fetch from network
    const fileInfo = FILES.find(f => f.id === fileId);
    if (!fileInfo) throw new Error(`Unknown file: ${fileId}`);
    
    const url = DATA_BASE + fileInfo.file;
    try {
      const data = await fetchAndDecompress(url);
      await idbPut(fileId, data);
      memoryCache.set(fileId, data);
      return data;
    } catch (err) {
      if (fileInfo.required) throw err;
      console.warn(`Optional file ${fileId} failed to load:`, err);
      return null;
    }
  }
  
  async function loadAll(requiredOnly = true) {
    const list = requiredOnly ? FILES.filter(f => f.required) : FILES;
    const results = await Promise.allSettled(list.map(f => load(f.id)));
    const data = {};
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') data[list[i].id] = r.value;
      else if (list[i].required) throw r.reason;
    });
    return data;
  }
  
  function getMemoryCache() { return memoryCache; }
  function clearCache() { memoryCache.clear(); }
  
  // Helper: get verses by surah
  async function getVerses(surah) {
    const verses = await load('verses');
    return verses?.[surah] || [];
  }
  
  // Helper: get page verses
  async function getPage(page) {
    const pageMap = await load('pageMap');
    const pageData = pageMap.find(p => p.page === page);
    if (!pageData) return [];
    const verses = await load('verses');
    return pageData.verses.map(v => verses[v.surah]?.find(vv => vv.verse_number === v.ayah)).filter(Boolean);
  }
  
  // Helper: get juz verses
  async function getJuz(juz) {
    const juzMap = await load('juzMap');
    const juzData = juzMap.find(j => j.juz === juz);
    if (!juzData) return [];
    const verses = await load('verses');
    return juzData.verses.map(vk => {
      const [s, a] = vk.split(':').map(Number);
      return verses[s]?.find(v => v.verse_number === a);
    }).filter(Boolean);
  }
  
  // Helper: get translation
  async function getTranslation(verseKey, lang = 'indo') {
    const key = `translation_${lang}`;
    const trans = await load(key);
    return trans?.[verseKey] || '';
  }
  
  // Helper: get tafsir
  async function getTafsir(verseKey, type = 'short') {
    const key = `tafsir_${type}`;
    const tafsir = await load(key);
    return tafsir?.[verseKey] || '';
  }
  
  // Helper: get tajwid
  async function getTajwid(verseKey) {
    const tajwid = await load('tajwid');
    return tajwid?.[verseKey] || '';
  }
  
  // Helper: get surah info
  async function getSurah(id) {
    const chapters = await load('chapters');
    return chapters.find(c => c.id === id);
  }
  
  // Helper: get all surahs
  async function getAllSurahs() {
    return load('chapters');
  }
  
  // Helper: daftar qari
  function getReciters() {
    return (CFG.reciters || []).slice();
  }

  function getReciter(key) {
    const list = getReciters();
    return list.find(r => r.key === key) || list[0] || null;
  }

  // Helper: audio URL per ayat
  function getAudioUrl(surah, ayah, qariKey = 'alafasy') {
    const rec = getReciter(qariKey);
    const base = (rec && rec.audioBase) || `${AUDIO_BASE}${qariKey}/`;
    return `${base}${String(surah).padStart(3, '0')}${String(ayah).padStart(3, '0')}.mp3`;
  }

  // Helper: URL audio satu surat penuh (fallback bila data QUL tidak memuat URL)
  function getSurahAudioUrl(surah, qariKey = 'alafasy') {
    const rec = getReciter(qariKey);
    const base = rec && rec.audioBase ? rec.audioBase : '';
    return base ? `${base}${String(surah).padStart(3, '0')}.mp3` : '';
  }

  // Helper: konfigurasi mushaf aktif
  function mushafCfg(key) {
    const list = CFG.mushafs || {};
    return list[key] || list.madani || {
      layout: 'layout.json.gz', pageCount: 604, fontPerPage: true,
      fontsBase: CFG.fontsBase, fontQuery: CFG.fontQuery, fontsLocal: CFG.fontsLocal
    };
  }

  // Helper: URL font halaman (madani) atau font tunggal (indopak)
  function getPageFontUrl(page, mushaf) {
    const mc = mushafCfg(mushaf || CFG.mushaf || 'madani');
    if (!mc.fontPerPage) {
      const loc = (mc.fontsLocal || CFG.fontsLocal || '').trim();
      return loc ? `${loc}indopak.woff2` : (mc.fontUrl || '');
    }
    const local = (mc.fontsLocal || CFG.fontsLocal || '').trim();
    if (local) return `${local}p${page}.woff2`;
    const base = mc.fontsBase || CFG.fontsBase || '';
    return `${base}p${page}.woff2${mc.fontQuery || CFG.fontQuery || ''}`;
  }

  // Helper: layout mushaf (baris + kata per halaman)
  async function getLayout(mushaf) {
    const key = `layout_${mushaf || CFG.mushaf || 'madani'}`;
    const mc = mushafCfg(mushaf || CFG.mushaf || 'madani');
    if (!FILES.some(f => f.id === key)) {
      FILES.push({ id: key, file: mc.layout, required: false });
    }
    try {
      return await load(key);
    } catch {
      return null;
    }
  }

  // Helper: data QUL (audio per surat + timing kata) untuk satu qari
  async function getQul(qariKey = 'alafasy') {
    const rec = getReciter(qariKey);
    if (!rec) return null;
    const id = `qul_${rec.key}`;
    if (!FILES.some(f => f.id === id)) {
      FILES.push({ id, file: `qul/${rec.key}.json.gz`, required: false });
    }
    try {
      return await load(id);
    } catch {
      return null;
    }
  }
  
  return {
    load,
    loadAll,
    getVerses,
    getPage,
    getJuz,
    getTranslation,
    getTafsir,
    getTajwid,
    getSurah,
    getAllSurahs,
    getAudioUrl,
    getReciters,
    getReciter,
    getQul,
    getSurahAudioUrl,
    getLayout,
    getPageFontUrl,
    mushafCfg,
    clearCache,
    getMemoryCache,
  };
})();

// Export for module usage
if (typeof module !== 'undefined') module.exports = DataManager;