/**
 * Al-Kalam Digital — Main Application
 * PWA Al-Qur'an Interaktif
 */
(() => {
  'use strict';
  
  // ═══════════════════════════════════════════════════════════════
  // State
  // ═══════════════════════════════════════════════════════════════
  const state = {
    currentView: 'mushaf',
    currentPage: 1,
    currentSurah: 1,
    currentAyah: 1,
    pageMode: 'scan',      // 'scan' = halaman mushaf (layout), 'text' = teks Uthmani
    spreadMode: 'auto',    // 'auto' | 'one' | 'two' — dua halaman seperti buku
    pageFontScale: 100,    // 80–120%: pengali ukuran huruf halaman mushaf
    indopakFont: 'qul',    // 'qul' | 'light' | 'compact'
    pageBorder: 'simple',  // 'simple' = garis ganda tipis | 'none' = tanpa bingkai
    _renderSeq: 0,         // penjaga agar render lama tidak menimpa render baru
    mushaf: 'madani',      // 'madani' (QCF 604 hal.) atau 'indopak' (610 hal.)
    showArabic: true,
    showTranslation: false,
    showTajwid: false,
    showTafsir: false,
    fontSizeArabic: 28,
    fontSizeTrans: 15,
    theme: 'auto',
    qari: 'alafasy',
    segments: null,          // penanda waktu per kata untuk ayat yang diputar
    autoPlayNext: true,
    repeatAyah: false,
    offlinePages: true,
    bookmarks: new Set(),
    audioPlaying: false,
    audioCurrent: null, // {surah, ayah, element}
    searchQuery: '',
    searchResults: [],
  };
  
  // ═══════════════════════════════════════════════════════════════
  // DOM Refs
  // ═══════════════════════════════════════════════════════════════
  const els = {};
  function $(id) { return document.getElementById(id); }
  function initRefs() {
    // Header
    els.btnMenu = $('btnMenu');
    els.btnSettings = $('btnSettings');
    els.btnBookmark = $('btnBookmark');
    els.surahNav = $('surahNav');
    els.surahLabel = $('surahLabel');
    els.pageNav = $('pageNav');
    els.pageLabel = $('pageLabel');
    // Drawer
    els.drawer = $('drawer');
    els.drawerOverlay = $('drawerOverlay');
    els.btnCloseDrawer = $('btnCloseDrawer');
    els.drawerItems = document.querySelectorAll('.drawer-item');
    // Views
    els.views = document.querySelectorAll('.view');
    els.viewMushaf = $('viewMushaf');
    els.viewJuz = $('viewJuz');
    els.viewSearch = $('viewSearch');
    els.viewBookmarks = $('viewBookmarks');
    els.viewSettings = $('viewSettings');
    // Mushaf
    els.mushafContainer = $('mushafContainer');
    els.btnPrevPage = $('btnPrevPage');
    els.btnNextPage = $('btnNextPage');
    els.pageIndicator = $('pageIndicator');
    els.toggleArabic = $('toggleArabic');
    els.toggleTranslation = $('toggleTranslation');
    els.toggleTajwid = $('toggleTajwid');
    els.toggleTafsir = $('toggleTafsir');
    els.modeScan = $('modeScan');
    els.modeText = $('modeText');
    // Audio
    els.audioBar = $('audioBar');
    els.audioSurah = $('audioSurah');
    els.audioAyah = $('audioAyah');
    els.audioPlay = $('audioPlay');
    els.audioPause = $('audioPause');
    els.audioPrev = $('audioPrev');
    els.audioNext = $('audioNext');
    els.progressBar = $('progressBar');
    els.progressFill = $('progressFill');
    els.audioTime = $('audioTime');
    els.volumeSlider = $('volumeSlider');
    els.audioMute = $('audioMute');
    // Search
    els.searchInput = $('searchInput');
    els.btnClearSearch = $('btnClearSearch');
    els.searchResults = $('searchResults');
    // Bookmarks
    els.bookmarksList = $('bookmarksList');
    // Settings
    els.fontSizeArabic = $('fontSizeArabic');
    els.fontSizeArabicVal = $('fontSizeArabicVal');
    els.fontSizeTrans = $('fontSizeTrans');
    els.fontSizeTransVal = $('fontSizeTransVal');
    els.themeSelect = $('themeSelect');
    els.showAyahNumbers = $('showAyahNumbers');
    els.pageModeSelect = $('pageModeSelect');
    els.mushafSelect = $('mushafSelect');
    els.mushafSelectSetting = $('mushafSelectSetting');
    els.spreadSelect = $('spreadSelect');
    els.pageFontScale = $('pageFontScale');
    els.pageFontScaleVal = $('pageFontScaleVal');
    els.indopakFontSelect = $('indopakFontSelect');
    els.pageBorderSelect = $('pageBorderSelect');
    els.qariSelect = $('qariSelect');
    els.autoPlayNext = $('autoPlayNext');
    els.repeatAyah = $('repeatAyah');
    els.offlinePages = $('offlinePages');
    els.btnClearCache = $('btnClearCache');
    els.btnReloadApp = $('btnReloadApp');
    els.btnFullscreen = $('btnFullscreen');
    els.btnHomeTop = $('btnHomeTop');
    els.btnQuickMushaf = $('btnQuickMushaf');
    els.btnToolbarHome = $('btnToolbarHome');
    els.viewNav = $('viewNav');
    els.navBackMushaf = $('navBackMushaf');
    els.navHome = $('navHome');
    els.navPrevView = $('navPrevView');
    els.viewNavLabel = $('viewNavLabel');
    els.btnCenter = $('btnCenter');
    els.viewHome = $('viewHome');
    els.viewTajwid = $('viewTajwid');
    els.tajwidGrid = $('tajwidGrid');
    els.homeResume = $('homeResume');
    els.homeResumeText = $('homeResumeText');
    els.homeNote = $('homeNote');
    els.homeGreeting = $('homeGreeting');
    els.homeHijri = $('homeHijri');
    els.homeResumeJuz = $('homeResumeJuz');
    els.homeResumeBar = $('homeResumeBar');
    els.cardMushafHint = $('cardMushafHint');
    els.cardBookmarkHint = $('cardBookmarkHint');
    els.btnResume = $('btnResume');
    els.homeCards = document.querySelectorAll('.home-card');
    els.surahPlaceFilter = $('surahPlaceFilter');
    // Modals
    els.surahModal = $('surahModal');
    els.surahList = $('surahList');
    els.surahSearch = $('surahSearch');
    els.btnCloseSurahModal = $('btnCloseSurahModal');
    els.pageModal = $('pageModal');
    els.pageInput = $('pageInput');
    els.pageQuick = $('pageQuick');
    els.btnClosePageModal = $('btnClosePageModal');
    // Juz
    els.juzGrid = $('juzGrid');
    // Toast
    els.toastContainer = $('toastContainer');
  }
  
  // ── Versi build (tanda bahwa browser memakai bundel terbaru) ────────
  const BUILD = '2026-11-23-trans-page';

  function showBuildTag() {
    const el = document.getElementById('buildTag');
    if (el) el.textContent = `build ${BUILD}`;
  }

  // Paksa ambil ulang seluruh berkas: lepas service worker, buang cache, reload
  async function forceUpdate() {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
      if (typeof caches !== 'undefined') {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
    } catch (e) { console.warn('forceUpdate:', e); }
    const url = new URL(location.href);
    url.searchParams.set('v', Date.now().toString());
    location.replace(url.toString());
  }

  // Bila service worker baru mengambil alih, muat ulang sekali
  function watchSwUpdate() {
    if (!('serviceWorker' in navigator)) return;
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloaded) return;
      reloaded = true;
      location.reload();
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // Utils
  // ═══════════════════════════════════════════════════════════════
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    els.toastContainer.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
  }

  // ── Hukum tajwid: nama + penjelasan singkat (Indonesia) ──────────────
  const TAJWID_RULES = {
    ham_wasl:        ['Hamzah Washal', 'Hamzah yang dibaca ketika di awal kalimat dan tidak dibaca ketika di tengah.'],
    slnt:            ['Huruf Tidak Dibaca', 'Huruf yang tidak dilafalkan karena bertemu huruf lain atau karena waqaf.'],
    madda_normal:    ['Mad Thabi\u2019i', 'Panjang 2 harakat (1 alif) karena huruf mad bertemu tanpa sebab lain.'],
    madda_permissible:['Mad Jaiz Munfashil', 'Panjang 2\u20135 harakat; huruf mad di akhir kata bertemu hamzah di kata berikutnya.'],
    madda_obligatory:['Mad Wajib Muttashil', 'Panjang 4\u20135 harakat; huruf mad bertemu hamzah dalam satu kata.'],
    madda_necessary: ['Mad Lazim', 'Panjang 6 harakat karena setelah huruf mad ada sukun tetap atau huruf bertasydid.'],
    qalaqah:         ['Qalqalah', 'Pantulan suara pada huruf \u0642 \u0637 \u0628 \u062c \u062f, dibaca lebih jelas saat berhenti.'],
    ikhafa:          ['Ikhfa Hakiki', 'Nun sukun\/tanwin bertemu salah satu dari 15 huruf ikhfa: dibaca samar dengan dengung.'],
    ikhafa_shafawi:  ['Ikhfa Syafawi', 'Mim sukun bertemu ba: dibaca samar dengan dengung di bibir.'],
    idgham_ghunnah:  ['Idgham Bighunnah', 'Nun sukun\/tanwin bertemu \u064a \u0646 \u0645 \u0648: dilebur dengan dengung.'],
    idgham_wo_ghunnah:['Idgham Bilaghunnah', 'Nun sukun\/tanwin bertemu lam atau ra: dilebur tanpa dengung.'],
    idgham_shafawi:  ['Idgham Mitslain', 'Mim sukun bertemu mim: dilebur dengan dengung.'],
    idgham_mutajanisayn:['Idgham Mutajanisain', 'Dua huruf berdekatan makhrajnya, berbeda sifat: dilebur.'],
    idgham_mutaqaribayn:['Idgham Mutqaribain', 'Dua huruf berdekatan makhraj dan sifatnya: dilebur.'],
    iqlab:           ['Iqlab', 'Nun sukun\/tanwin bertemu ba: berubah menjadi mim dengan dengung.'],
    ghunnah:         ['Ghunnah', 'Dengung pada nun atau mim bertasydid, sekitar 2 harakat.'],
    tafkhim:         ['Tafkhim', 'Membaca huruf tebal, mulut dibuka membulat.'],
    tarqiq:          ['Tarqiq', 'Membaca huruf tipis, mulut tidak dibulatkan.'],
  };

  // ── Tooltip hukum tajwid (muncul saat kursor di atas sorotan) ─────────
  let tajTipEl = null;
  function tajTip() {
    if (!tajTipEl) {
      tajTipEl = document.createElement('div');
      tajTipEl.className = 'taj-tip';
      tajTipEl.setAttribute('role', 'tooltip');
      document.body.appendChild(tajTipEl);
    }
    return tajTipEl;
  }
  function showTajTip(rule, x, y) {
    const many = String(rule || '').split('|').filter(Boolean);
    let name, desc;
    if (many.length > 1) {
      name = many.map(r => (TAJWID_RULES[r] ? TAJWID_RULES[r][0] : r)).join(' · ');
      desc = many.map(r => (TAJWID_RULES[r] ? TAJWID_RULES[r][1] : '')).filter(Boolean).join(' ');
    } else {
      const one = many[0] || rule;
      const info = TAJWID_RULES[one];
      name = info ? info[0] : (one || 'Tajwid');
      desc = info ? info[1] : '';
    }
    const el = tajTip();
    if (el.dataset.rule === rule && el.classList.contains('on')) {
      el.style.left = `${Math.min(x + 14, window.innerWidth - 280)}px`;
      el.style.top = `${Math.max(8, y + 16)}px`;
      return;
    }
    el.dataset.rule = rule;
    el.innerHTML = `<strong>${name}</strong><span>${desc}</span>`;
    el.style.left = `${Math.min(x + 14, window.innerWidth - 280)}px`;
    el.style.top = `${Math.max(8, y + 16)}px`;
    el.classList.add('on');
  }
  function hideTajTip() {
    if (tajTipEl) tajTipEl.classList.remove('on');
  }

  function showTajwidRule(rule) {
    const info = TAJWID_RULES[rule];
    const name = info ? info[0] : rule;
    const desc = info ? info[1] : 'Keterangan belum tersedia untuk hukum ini.';
    let box = document.getElementById('tajwidTip');
    if (box) box.remove();
    box = document.createElement('div');
    box.id = 'tajwidTip';
    box.className = 'tajwid-tip';
    box.innerHTML = `<strong>${name}</strong><span>${desc}</span><button aria-label="Tutup">\u00d7</button>`;
    document.body.appendChild(box);
    const close = () => box.remove();
    box.querySelector('button').addEventListener('click', close);
    setTimeout(close, 8000);
  }
  
  function setTheme(theme) {
    state.theme = theme;
    const root = document.documentElement;
    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', theme);
    }
    localStorage.setItem('alkalam_theme', theme);
  }
  
  function saveSettings() {
    const settings = {
      theme: state.theme,
      pageMode: state.pageMode,
      mushaf: state.mushaf,
      fontSizeArabic: state.fontSizeArabic,
      fontSizeTrans: state.fontSizeTrans,
      qari: state.qari,
      autoPlayNext: state.autoPlayNext,
      repeatAyah: state.repeatAyah,
      offlinePages: state.offlinePages,
      showAyahNumbers: state.showAyahNumbers,
      spreadMode: state.spreadMode,
      pageFontScale: state.pageFontScale,
      indopakFont: state.indopakFont,
      pageBorder: state.pageBorder,
    };
    localStorage.setItem('alkalam_settings', JSON.stringify(settings));
  }
  
  function loadSettings() {
    // Isi pilihan qari dari konfigurasi
    const reciters = (window.ALKALAM_CONFIG && window.ALKALAM_CONFIG.reciters) || [];
    if (reciters.length && els.qariSelect) {
      els.qariSelect.innerHTML = reciters
        .map(r => `<option value="${r.key}">${r.name}</option>`)
        .join('');
    }
    try {
      const s = JSON.parse(localStorage.getItem('alkalam_settings') || '{}');
      Object.assign(state, s);
    } catch {}
    // Apply
    setTheme(state.theme || 'auto');
    state.fontSizeArabic = state.fontSizeArabic || 28;
    state.fontSizeTrans = state.fontSizeTrans || 15;
    state.qari = state.qari || 'alafasy';
    if (!DataManager.getReciter(state.qari)) state.qari = 'alafasy';
    state.autoPlayNext = state.autoPlayNext !== false;
    state.repeatAyah = state.repeatAyah || false;
    state.offlinePages = state.offlinePages !== false;
    state.showAyahNumbers = state.showAyahNumbers !== false;
    state.spreadMode = ['auto', 'one', 'two'].includes(state.spreadMode) ? state.spreadMode : 'auto';
    state.pageFontScale = Math.min(120, Math.max(80, Number(state.pageFontScale) || 100));
    state.indopakFont = ['qul', 'light', 'compact'].includes(state.indopakFont) ? state.indopakFont : 'qul';
    // 'classic'/'green' (versi lama) dipetakan ke 'simple'
    if (!['simple', 'none'].includes(state.pageBorder)) state.pageBorder = 'simple';
    state.pageMode = state.pageMode === 'text' ? 'text' : 'scan';
    state.mushaf = state.mushaf === 'indopak' ? 'indopak' : 'madani';
    if (els.mushafSelect) els.mushafSelect.value = state.mushaf;
    setPageMode(state.pageMode, false);
    // Update UI
    els.fontSizeArabic.value = state.fontSizeArabic;
    els.fontSizeArabicVal.textContent = `${state.fontSizeArabic}px`;
    els.fontSizeTrans.value = state.fontSizeTrans;
    els.fontSizeTransVal.textContent = `${state.fontSizeTrans}px`;
    els.themeSelect.value = state.theme || 'auto';
    els.showAyahNumbers.checked = state.showAyahNumbers;
    if (els.pageModeSelect) els.pageModeSelect.value = state.pageMode;
    if (els.mushafSelectSetting) els.mushafSelectSetting.value = state.mushaf;
    if (els.spreadSelect) els.spreadSelect.value = state.spreadMode;
    if (els.pageFontScale) els.pageFontScale.value = state.pageFontScale;
    if (els.pageFontScaleVal) els.pageFontScaleVal.textContent = `${state.pageFontScale}%`;
    if (els.indopakFontSelect) els.indopakFontSelect.value = state.indopakFont;
    if (els.pageBorderSelect) els.pageBorderSelect.value = state.pageBorder;
    if (els.mushafSelect) els.mushafSelect.value = state.mushaf;
    els.qariSelect.value = state.qari;
    els.autoPlayNext.checked = state.autoPlayNext;
    els.repeatAyah.checked = state.repeatAyah;
    els.offlinePages.checked = state.offlinePages;
    // CSS variables
    document.documentElement.style.setProperty('--font-size-arabic', `${state.fontSizeArabic}px`);
    document.documentElement.style.setProperty('--font-size-trans', `${state.fontSizeTrans}px`);
  }
  
  function saveBookmarks() {
    localStorage.setItem('alkalam_bookmarks', JSON.stringify([...state.bookmarks]));
  }
  
  function loadBookmarks() {
    try {
      const b = JSON.parse(localStorage.getItem('alkalam_bookmarks') || '[]');
      state.bookmarks = new Set(b);
    } catch {}
  }
  
  function toggleBookmark(verseKey) {
    if (state.bookmarks.has(verseKey)) {
      state.bookmarks.delete(verseKey);
      showToast('Penanda dihapus');
    } else {
      state.bookmarks.add(verseKey);
      showToast('Penanda ditambahkan', 'success');
    }
    saveBookmarks();
    renderBookmarks();
    updateBookmarkButtons();
  }
  
  function isBookmarked(verseKey) {
    return state.bookmarks.has(verseKey);
  }
  
  // ═══════════════════════════════════════════════════════════════
  // Tajwid: grup warna (mengikuti standar KFGQPC / font v4-tajweed)
  // ═══════════════════════════════════════════════════════════════
  const TAJWID_GROUPS = [
    ['mad', 'Mad (panjang)', ['madda_normal', 'madda_permissible', 'madda_obligatory', 'madda_necessary']],
    ['ghunnah', 'Ghunnah (dengung)', ['ghunnah']],
    ['idgham', 'Idgham', ['idgham_ghunnah', 'idgham_wo_ghunnah', 'idgham_shafawi', 'idgham_mutajanisayn', 'idgham_mutaqaribayn']],
    ['ikhfa', 'Ikhfa', ['ikhafa', 'ikhafa_shafawi']],
    ['iqlab', 'Iqlab', ['iqlab']],
    ['qalqalah', 'Qalqalah', ['qalaqah']],
    ['silent', 'Tidak dibaca', ['ham_wasl', 'slnt']],
  ];

  const RULE_TO_GROUP = (() => {
    const map = {};
    for (const [g, , rules] of TAJWID_GROUPS) for (const r of rules) map[r] = g;
    return map;
  })();

  // legenda khusus mushaf Madani: warna mengikuti font QCF v4-tajweed (KFGQPC)
  const KFGQPC_LEGEND = [
    ['mad', 'Mad'],
    ['ghunnah', 'Ghunnah'],
    ['idgham', 'Idgham (dengung)'],
    ['idgham_wo', 'Idgham (tanpa dengung)'],
    ['ikhfa', 'Ikhfa'],
    ['ikhfa_shafawi', 'Ikhfa syafawi'],
    ['iqlab', 'Iqlab'],
    ['qalqalah', 'Qalqalah'],
    ['silent', 'Tidak dibaca'],
  ];

  function tajwidLegendHtml() {
    // Madani memakai font berwarna (v4-tajweed) → palet KFGQPC
    const isKfgqpc = mushafKey() === 'madani';
    const items = isKfgqpc
      ? KFGQPC_LEGEND
      : TAJWID_GROUPS.map(([g, label]) => [g, label]);
    const html = items.map(([g, label]) =>
      `<span class="tajwid-legend-item"><span class="tajwid-legend-dot ${g}"></span>${label}</span>`
    ).join('');
    return html + (isKfgqpc
      ? '<span class="tajwid-legend-item tajwid-legend-note">warna font KFGQPC</span>'
      : '');
  }

  const wordRuleCache = new Map();

  // ── Pewarnaan per HURUF (IndoPak) ──────────────────────────────────
  const AR_MARKS_RE = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640\u200C\u200D\u0653-\u0655]/;
  const AR_MARKS_G = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640\u200C\u200D\u0653-\u0655]/g;
  const baseLetters = (t) => String(t).replace(AR_MARKS_G, "");

  /** Pecah markup jadi kata, tiap kata berisi potongan { text, rule }. */
  function tajwidSegments(html) {
    if (!html) return [];
    let src = String(html).replace(/<span\s+class=["']?end["']?\s*>[\s\S]*?<\/span>/g, "");
    const words = [];
    let segs = [];
    let text = "";
    let rule = null;

    const push = (t, r) => {
      if (!t) return;
      const last = segs[segs.length - 1];
      if (last && last.rule === r) last.text += t;
      else segs.push({ text: t, rule: r });
    };
    const flush = () => {
      if (text) words.push({ text, segments: segs });
      text = "";
      segs = [];
    };

    let i = 0;
    while (i < src.length) {
      if (src[i] === "<") {
        const close = src.indexOf(">", i);
        if (close === -1) break;
        const tag = src.slice(i + 1, close);
        if (/^tajweed\b/i.test(tag)) {
          rule = (tag.match(/class\s*=\s*["']?([a-z_]+)/i) || [])[1] || null;
        } else if (/^\/tajweed/i.test(tag)) {
          rule = null;
        }
        i = close + 1;
        continue;
      }
      const ch = src[i];
      if (/[\s\u00a0]/.test(ch)) { flush(); i += 1; continue; }
      text += ch;
      push(ch, rule);
      i += 1;
    }
    flush();
    return words;
  }

  /** Aturan per huruf dasar untuk satu kata markup. */
  function wordLetterRules(word) {
    const out = [];
    for (const seg of word.segments || []) {
      // simpan aturan spesifik: untuk warna dipetakan ke grup, untuk tooltip dipakai apa adanya
      for (const ch of seg.text) if (!AR_MARKS_RE.test(ch)) out.push(seg.rule || null);
    }
    return out;
  }

  const verseLettersCache = new Map();

  /** ayat → daftar kata { base, rules } sesuai markup tajwid. */
  async function verseLetterData(verseKey) {
    if (verseLettersCache.has(verseKey)) return verseLettersCache.get(verseKey);
    const all = await DataManager.load('tajwid');
    const words = tajwidSegments((all && all[verseKey]) || '');
    const data = words.map(w => ({ text: w.text, base: baseLetters(w.text), rules: wordLetterRules(w) }));
    verseLettersCache.set(verseKey, data);
    return data;
  }

  /**
   * HTML satu kata IndoPak dengan warna per huruf.
   * null bila jumlah huruf dasar tidak sama (pemanggil pakai cadangan per kata).
   */
  /** Selaraskan aturan markup ke huruf dasar IndoPak (tahan beda ortografi). */
  function alignLetterRules(base, markupBase, rules) {
    if (!rules || !rules.length) return null;
    if (base === markupBase) return rules.slice();
    const n = base.length, m = markupBase.length;
    if (!n) return null;
    // LCS sederhana: tabel (n+1) x (m+1)
    const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        dp[i][j] = base[i] === markupBase[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
    const out = new Array(n).fill(undefined);
    let i = 0, j = 0;
    while (i < n && j < m) {
      if (base[i] === markupBase[j]) {
        out[i] = rules[j] ?? null;
        i++; j++;
      } else if (dp[i + 1][j] >= dp[i][j + 1]) {
        i++;                      // huruf IndoPak tanpa pasangan (dibiarkan kosong)
      } else {
        j++;
      }
    }
    // huruf kosong yang diapit dua huruf beraturan sama ikut diwarnai
    for (let k = 0; k < n; k++) {
      if (out[k] !== undefined) continue;
      let a = k - 1; while (a >= 0 && out[a] === undefined) a--;
      let b = k + 1; while (b < n && out[b] === undefined) b++;
      const left = a >= 0 ? out[a] : null;
      const right = b < n ? out[b] : null;
      out[k] = (left && right && left === right) ? left : null;
    }
    // cadangan terakhir: sebar menurut proporsi (mis. kata yang bentuknya jauh berbeda)
    if (!out.some(Boolean) && m > 0 && rules.length) {
      for (let k = 0; k < n; k++) {
        const j = n > 1 ? Math.round(k * (m - 1) / (n - 1)) : 0;
        out[k] = rules[Math.min(j, rules.length - 1)] || null;
      }
    }
    return out;
  }

  /** Kemiripan dua kata (0..1) untuk penyejajaran kata. */
  function wordSimilarity(a, b) {
    if (!a || !b) return -0.5;
    if (a === b) return 1;
    const n = a.length, m = b.length;
    if (!n || !m) return -0.4;
    let prev = new Array(m + 1).fill(0);
    for (let i = 1; i <= n; i++) {
      const cur = new Array(m + 1).fill(0);
      for (let j = 1; j <= m; j++) {
        cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
      }
      prev = cur;
    }
    const r = prev[m] / Math.max(n, m);
    return r >= 0.95 ? 1 : r >= 0.7 ? 0.7 : r >= 0.5 ? 0.4 : -0.4;
  }

  /**
   * Sejajarkan daftar kata IndoPak dengan kata markup (Needleman-Wunsch).
   * Dipakai saat jumlah kata berbeda (217 ayat) agar tetap bisa diwarnai.
   */
  function alignWords(indo, markup) {
    const n = indo.length, m = markup.length;
    const GAP = -0.55;
    const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = n; i >= 0; i--) {
      for (let j = m; j >= 0; j--) {
        if (i === n && j === m) dp[i][j] = 0;
        else if (i === n) dp[i][j] = dp[i][j + 1] + GAP;
        else if (j === m) dp[i][j] = dp[i + 1][j] + GAP;
        else dp[i][j] = Math.max(
          dp[i + 1][j + 1] + wordSimilarity(indo[i], markup[j]),
          dp[i + 1][j] + GAP,
          dp[i][j + 1] + GAP);
      }
    }
    const out = new Array(n).fill(-1);
    let i = 0, j = 0;
    while (i < n && j < m) {
      const diag = dp[i + 1][j + 1] + wordSimilarity(indo[i], markup[j]);
      if (Math.abs(dp[i][j] - diag) < 1e-9) { out[i] = j; i++; j++; }
      else if (Math.abs(dp[i][j] - (dp[i + 1][j] + GAP)) < 1e-9) i++;
      else j++;
    }
    return out;
  }

  /**
   * HTML satu kata IndoPak dengan warna per huruf, mengacu pada markup tajwid
   * yang sama dengan mode Teks (sumber kebenaran).
   */
  function tintedWordHtml(text, markupWord) {
    if (!markupWord) return null;
    const base = baseLetters(text);
    const rules = alignLetterRules(base, markupWord.base, markupWord.rules);
    if (!rules || !rules.some(Boolean)) return null;
    const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    let html = "";
    let buf = "";
    let cur = null;          // aturan spesifik yang sedang dikumpulkan
    let idx = 0;
    const flush = () => {
      if (!buf) return;
      const g = cur ? RULE_TO_GROUP[cur] : null;
      if (g) html += `<span class="tj tj-${g}" data-rule="${cur}">${esc(buf)}</span>`;
      else html += esc(buf);
      buf = "";
    };
    for (const ch of text) {
      const isMark = AR_MARKS_RE.test(ch);
      const g = isMark ? cur : (rules[idx] || null);
      if (!isMark) {
        if (g !== cur) { flush(); cur = g; }
        idx += 1;
      }
      buf += ch;
    }
    flush();
    return html;
  }

  // ═══════════════════════════════════════════════════════════════
  // Fitur: salin ayat, tajwid, sampul, layar penuh, tombol tengah
  // ═══════════════════════════════════════════════════════════════

  /** Salin ayat (Arab + terjemahan + rujukan) ke papan klip. */
  async function copyAyah(verseKey) {
    const [surah, ayah] = verseKey.split(':').map(Number);
    const verses = await DataManager.getVerses(surah);
    const verse = verses.find(v => v.verse_number === ayah);
    const info = await DataManager.getSurah(surah);
    const tr = await DataManager.getTranslation(verseKey, 'indo');
    const lines = [
      verse ? verse.text_uthmani : '',
      '',
      tr || '',
      '',
      `(${surahName(surah)} : ${ayah}) — ${surah}:${ayah}`,
    ];
    const text = lines.join('\n').trim();
    const legacyCopy = () => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, text.length);
      let ok = false;
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      ta.remove();
      return ok;
    };

    let done = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        done = true;
      }
    } catch { /* jatuh ke cara lama */ }
    if (!done) done = legacyCopy();
    if (done) showToast('Ayat disalin', 'success');
    else showToast('Gagal menyalin ayat', 'error');
  }

  function surahName(surahId) {
    const list = state.chapters || [];
    const c = list.find(x => x.id === surahId);
    return c ? c.name_simple : String(surahId);
  }

  /** Tampilkan tafsir lengkap untuk satu ayat (data sudah tersedia). */
  async function showFullTafsir(verseKey) {
    const full = await DataManager.getTafsir(verseKey, 'long');
    if (!full) { showToast('Tafsir lengkap tidak tersedia', 'error'); return; }
    showTafsirPanel(verseKey, full);
  }

  /** Panel tafsir lengkap (dialog sederhana, bisa digulir). */
  function showTafsirPanel(verseKey, text) {
    let dlg = document.getElementById('tafsirDialog');
    if (!dlg) {
      dlg = document.createElement('dialog');
      dlg.id = 'tafsirDialog';
      dlg.className = 'modal tafsir-dialog';
      dlg.innerHTML = `<div class="modal-content">
          <header class="modal-header"><h3>Tafsir</h3>
            <button class="icon-btn" data-close aria-label="Tutup">×</button></header>
          <div class="modal-body"><p class="tafsir-ref"></p><div class="tafsir-full"></div></div>
        </div>`;
      document.body.appendChild(dlg);
      dlg.querySelector('[data-close]').addEventListener('click', () => dlg.close());
    }
    const [surah, ayah] = verseKey.split(':');
    dlg.querySelector('.tafsir-ref').textContent = `${surahName(Number(surah))} : ${ayah}`;
    dlg.querySelector('.tafsir-full').innerHTML = text.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
    dlg.showModal();
  }

  /** Halaman referensi 18 hukum tajwid. */
  function renderTajwidGrid() {
    if (!els.tajwidGrid) return;
    els.tajwidGrid.innerHTML = Object.entries(TAJWID_RULES)
      .map(([key, [name, desc]]) => `
        <div class="tajwid-card" data-rule="${key}">
          <div class="tajwid-card-name">${name}</div>
          <div class="tajwid-card-desc">${desc}</div>
          <button class="tajwid-card-link" data-find-rule="${key}">Cari contoh di mushaf</button>
        </div>`)
      .join('');
    els.tajwidGrid.querySelectorAll('[data-find-rule]').forEach(btn => {
      btn.addEventListener('click', () => {
        setPageMode('text');
        state.showTajwid = true;
        els.toggleTajwid.classList.add('active');
        showView('mushaf');
        showToast('Mode teks + tajwid aktif — warna menandai hukumnya');
      });
    });
  }

  /** Simpan posisi terakhir dibaca, tampilkan di sampul. */
  function saveLastRead() {
    try {
      localStorage.setItem('alkalam_last', JSON.stringify({
        page: state.currentPage,
        mushaf: state.mushaf,
        surah: state.currentSurah,
        at: Date.now(),
      }));
    } catch {}
  }

  function greetingFor(hour) {
    if (hour < 4) return 'Selamat malam';
    if (hour < 11) return 'Selamat pagi';
    if (hour < 15) return 'Selamat siang';
    if (hour < 18) return 'Selamat sore';
    return 'Selamat malam';
  }

  function hijriToday() {
    try {
      return new Intl.DateTimeFormat('id-ID-u-ca-islamic-umalqura', {
        day: 'numeric', month: 'long', year: 'numeric',
      }).format(new Date());
    } catch {
      try {
        return new Intl.DateTimeFormat('id-ID-u-ca-islamic', {
          day: 'numeric', month: 'long', year: 'numeric',
        }).format(new Date());
      } catch { return ''; }
    }
  }

  function renderHome() {
    let last = state.lastRead || null;
    if (!last) { try { last = JSON.parse(localStorage.getItem('alkalam_last') || 'null'); } catch {} }

    if (els.homeGreeting) els.homeGreeting.textContent = `${greetingFor(new Date().getHours())}, selamat membaca`;
    if (els.homeHijri) els.homeHijri.textContent = hijriToday();

    if (last && last.page) {
      els.homeResume.hidden = false;
      els.homeResumeText.textContent =
        `${surahName(last.surah || state.currentSurah)} · halaman ${last.page}` +
        (last.mushaf === 'indopak' ? ' · IndoPak' : ' · Madani');
      // juz dari peta juz (madani) atau perkiraan proporsional untuk mushaf lain
      let juz = null;
      if (DataManager) {
        DataManager.load('juzMap').then(map => {
          if (!map) return;
          const idx = map.findIndex(j => j.verses.some(vk => vk.startsWith(`${last.surah}:`)));
          if (els.homeResumeJuz && idx >= 0) els.homeResumeJuz.textContent = `Juz ${map[idx].juz}`;
        }).catch(() => {});
      }
      if (els.homeResumeBar) {
        const pct = Math.max(2, Math.min(100, (last.page / pageCount()) * 100));
        els.homeResumeBar.style.width = `${pct}%`;
      }
      if (els.homeResumeJuz) els.homeResumeJuz.textContent = juz || `Juz ±${Math.ceil(last.page / (pageCount() / 30))}`;
    } else {
      els.homeResume.hidden = true;
    }

    const marks = state.bookmarks ? state.bookmarks.size : 0;
    if (els.cardBookmarkHint) els.cardBookmarkHint.textContent = `${marks} ayat`;
    if (els.cardMushafHint) els.cardMushafHint.textContent = `${pageCount()} halaman`;
    if (els.homeNote) {
      els.homeNote.textContent =
        `${marks} penanda · ${state.mushaf === 'indopak' ? 'IndoPak' : 'Madani'} · ${pageCount()} halaman`;
    }

    els.btnResume.onclick = () => {
      if (!last) return;
      if (last.mushaf && last.mushaf !== state.mushaf) {
        setMushaf(last.mushaf);
      }
      renderPage(last.page);
      showView('mushaf');
    };
  }

  /** Layar penuh (minimize/maximize versi DVD).
   *  Bila browser menolak Fullscreen API, pakai "mode zen": header & drawer disembunyikan. */
  async function toggleFullscreen() {
    const zen = document.body.classList.contains('is-fullscreen');
    try {
      if (!zen && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        document.body.classList.add('is-fullscreen');
        return;
      }
      if (zen && document.fullscreenElement) {
        await document.exitFullscreen();
        document.body.classList.remove('is-fullscreen');
        return;
      }
    } catch { /* lanjut ke mode zen */ }
    // fallback / keluar dari mode zen
    document.body.classList.toggle('is-fullscreen');
    showToast(document.body.classList.contains('is-fullscreen')
      ? 'Mode layar penuh (zen) aktif'
      : 'Kembali ke tampilan normal');
  }

  /** Kembali ke ayat yang sedang dibaca ("tengah" pada DVD). */
  function scrollToPlaying() {
    const cur = state.audioCurrent;
    if (!cur) { showToast('Belum ada bacaan yang diputar'); return; }
    const target = document.querySelector(`.mw[data-v="${cur.verseKey}"].ayah-on`)
      || document.querySelector(`.ayah-row[data-verse="${cur.verseKey}"]`)
      || document.querySelector(`.scan-text-row[data-verse="${cur.verseKey}"]`);
    if (!target) { showToast('Ayat tidak ada di halaman ini'); return; }
    target.scrollIntoView({ block: 'center', behavior: 'smooth' });
    target.classList.add('flash');
    setTimeout(() => target.classList.remove('flash'), 1200);
  }

  // ═══════════════════════════════════════════════════════════════
  // View Management
  // ═══════════════════════════════════════════════════════════════
  const VIEW_LABELS = {
    home: 'Sampul', mushaf: 'Mushaf', juz: 'Daftar Juz', search: 'Cari Ayat',
    bookmarks: 'Penanda', settings: 'Pengaturan', tajwid: 'Hukum Tajwid',
  };

  function showView(viewName) {
    if (state.currentView && state.currentView !== viewName) {
      state.prevView = state.currentView;
    }
    state.currentView = viewName;
    els.views.forEach(v => v.hidden = v.dataset.view !== viewName);
    els.drawerItems.forEach(item => {
      item.classList.toggle('active', item.dataset.view === viewName);
    });
    if (els.viewNav) {
      const isMushaf = viewName === 'mushaf';
      els.viewNav.hidden = isMushaf;
      if (els.viewNavLabel) els.viewNavLabel.textContent = VIEW_LABELS[viewName] || '';
      if (els.navHome) els.navHome.hidden = viewName === 'home';
      if (els.navPrevView) {
        const back = state.prevView && state.prevView !== viewName ? state.prevView : 'mushaf';
        // jangan dobel dengan tombol Mushaf/Sampul yang sudah ada
        const redundant = back === 'home' || back === 'mushaf' || viewName === 'home';
        els.navPrevView.hidden = redundant;
        els.navPrevView.lastChild.textContent = ' ' + (VIEW_LABELS[back] || 'Kembali');
        els.navPrevView.dataset.target = back;
      }
    }
    closeDrawer();
    // Scroll to top
    window.scrollTo(0, 0);
    // Load view-specific data
    if (viewName === 'home') renderHome();
    else if (viewName === 'tajwid') renderTajwidGrid();
    else if (viewName === 'juz') renderJuzGrid();
    else if (viewName === 'bookmarks') renderBookmarks();
    else if (viewName === 'search') focusSearch();
  }
  
  function closeDrawer() {
    els.drawer.classList.remove('open');
    els.drawerOverlay.classList.remove('visible');
    els.btnMenu.setAttribute('aria-expanded', 'false');
  }
  
  function openDrawer() {
    els.drawer.classList.add('open');
    els.drawerOverlay.classList.add('visible');
    els.btnMenu.setAttribute('aria-expanded', 'true');
  }
  
  // ═══════════════════════════════════════════════════════════════
  // Mushaf Rendering
  // ═══════════════════════════════════════════════════════════════
  // ── Mode halaman: pindaian (gambar) / teks ───────────────────────────
  function setPageMode(mode, rerender = true) {
    state.pageMode = mode === 'text' ? 'text' : 'scan';
    if (els.modeScan && els.modeText) {
      els.modeScan.classList.toggle('active', state.pageMode === 'scan');
      els.modeText.classList.toggle('active', state.pageMode === 'text');
      els.modeScan.setAttribute('aria-pressed', state.pageMode === 'scan');
      els.modeText.setAttribute('aria-pressed', state.pageMode === 'text');
      // Di mode pindaian, tombol Arab tidak berlaku (Arab sudah ada di gambar)
      els.toggleArabic.classList.toggle('hidden-mode', state.pageMode === 'scan');
      if (els.pageModeSelect) els.pageModeSelect.value = state.pageMode;
    if (els.mushafSelect) els.mushafSelect.value = state.mushaf;
    if (els.mushafSelectSetting) els.mushafSelectSetting.value = state.mushaf;
    }
    if (rerender) renderPage(state.currentPage);
  }

  // ── Render mushaf: Madani (QCF per halaman) atau IndoPak (nastaleeq) ──
  const loadedFonts = new Set();

  function mushafKey() { return state.mushaf || 'madani'; }

  /** Peta ayat → halaman untuk mushaf aktif (604 atau 610 halaman). */
  async function rebuildVersePage() {
    const layout = await DataManager.getLayout(mushafKey());
    const map = new Map();
    if (layout && layout.pages) {
      for (const [p, pageData] of Object.entries(layout.pages)) {
        const pageNo = Number(p);
        const rows = Array.isArray(pageData) ? pageData : (pageData.lines || []);
        const typed = rows.length && !Array.isArray(rows[0]) && rows[0].kind;
        if (typed) {
          for (const row of rows) {
            if (row.kind !== 'words') continue;
            for (const [vk] of row.words) if (!map.has(vk)) map.set(vk, pageNo);
          }
        } else {
          for (const line of rows) {
            if (!Array.isArray(line)) continue;
            for (const entry of line) if (!map.has(entry[0])) map.set(entry[0], pageNo);
          }
        }
      }
    }
    state.versePage = map;
    return map;
  }

  /** Ganti mushaf (Madani ↔ IndoPak): layout, peta halaman, font. */
  async function setMushaf(key) {
    if (key !== 'indopak' && key !== 'madani') key = 'madani';
    if (state.mushaf === key && state.versePage && state.versePage.size) return;
    state.mushaf = key;
    saveSettings();
    await rebuildVersePage();
    const max = pageCount();
    if (state.currentPage > max) state.currentPage = max;
    renderPage(state.currentPage);
  }

  function mushafConf() { return DataManager.mushafCfg(mushafKey()); }
  function pageCount() { return mushafConf().pageCount || 604; }

  async function ensureMushafFont(page, tajweed = false) {
    const mc = mushafConf();
    const tryLoad = async (family, url) => {
      const face = new FontFace(family, `url("${url}")`, { display: 'swap' });
      await face.load();
      document.fonts.add(face);
      return family;
    };

    if (!mc.fontPerPage) {
      // IndoPak: satu font untuk semua halaman, bisa pilih varian (QUL / ringan / rapat)
      const variants = mc.fontVariants || {};
      const chosen = variants[state.indopakFont] || variants.qul || null;
      const fam = (chosen && chosen.family) || mc.fontFamily || 'indopak-nastaleeq';
      if (loadedFonts.has(fam)) return fam;
      const urls = [chosen && chosen.url, DataManager.getPageFontUrl(page, mushafKey()), mc.fontUrl].filter(Boolean);
      for (const u of [...new Set(urls)]) {
        try { await tryLoad(fam, u); loadedFonts.add(fam); return fam; } catch (e) { /* coba berikutnya */ }
      }
      // varian gagal → kembali ke font standar
      if (chosen && chosen.family !== mc.fontFamily) {
        console.warn('varian font indopak gagal, memakai font standar');
        state.indopakFont = 'qul';
        return ensureMushafFont(page, tajweed);
      }
      console.warn('font indopak gagal dimuat');
      return null;
    }

    // Madani: font per halaman — v2 biasa, atau v4-tajweed (huruf berwarna)
    const wantTajweed = tajweed && !!mc.fontsTajweedBase;
    const name = wantTajweed ? `p${page}v4` : `p${page}`;
    if (loadedFonts.has(name)) return name;

    const cfg = window.ALKALAM_CONFIG || {};
    const local = (mc.fontsLocal || cfg.fontsLocal || '').trim();
    const urls = [];
    if (wantTajweed) {
      urls.push(`${mc.fontsTajweedBase}p${page}.woff2${mc.fontQuery || cfg.fontQuery || ''}`);
    } else {
      urls.push(DataManager.getPageFontUrl(page, mushafKey()));
      if (local) {
        const cdn = `${mc.fontsBase || cfg.fontsBase || ''}p${page}.woff2${mc.fontQuery || cfg.fontQuery || ''}`;
        urls.push(cdn);
      }
    }
    for (const u of [...new Set(urls)]) {
      try { await tryLoad(name, u); loadedFonts.add(name); return name; } catch (e) { /* coba berikutnya */ }
    }
    // kalau font tajwid gagal, jatuh ke font biasa
    if (wantTajweed) {
      console.warn('font tajwid halaman gagal, memakai font biasa:', page);
      return ensureMushafFont(page, false);
    }
    console.warn('font halaman gagal dimuat:', page);
    return null;
  }

  function prefetchPageFonts(page) {
    if (!mushafConf().fontPerPage) return;
    const tajweed = !!state.showTajwid && mushafKey() === 'madani';
    for (const p of [page + 1, page + 2, page - 1]) {
      if (p < 1 || p > pageCount()) continue;
      const key = tajweed ? `p${p}v4` : `p${p}`;
      if (!loadedFonts.has(key)) ensureMushafFont(p, tajweed);
    }
  }

  /** Normalisasi layout apa pun menjadi baris: {kind:'surah'|'bismillah'|'words'|'empty'}. */
  function buildRows(layout, page, chapters) {
    const pageData = layout && layout.pages ? layout.pages[String(page)] : null;
    if (!pageData) return null;
    const surahs = layout.surahs || {};
    const rows = [];

    // ── IndoPak: baris sudah bertipe ──
    if (pageData.length && !Array.isArray(pageData[0]) && pageData[0].kind) {
      for (const line of pageData) {
        if (line.kind === 'surah') {
          const meta = surahs[String(line.surah)] || {};
          const full = (chapters || []).find(c => String(c.id) === String(line.surah)) || {};
          rows.push({ kind: 'surah', info: {
            name: meta.name || full.name_arabic || '',
            name_simple: meta.name_simple || full.name_simple || '',
            ayahs: meta.ayahs || full.verses_count || 0,
            bismillah: meta.bismillah !== undefined ? meta.bismillah : !!full.bismillah_pre
          } });
        } else if (line.kind === 'bismillah') {
          rows.push({ kind: 'bismillah' });
        } else {
          rows.push({ kind: 'words', words: line.words || [] });
        }
      }
      return rows;
    }

    // ── Madani: array kata; baris kosong = slot judul/basmalah ──
    const lines = pageData.lines || pageData;
    const surahStartAt = new Map();
    lines.forEach((line, idx) => {
      if (!line.length) return;
      const [vk] = line[0];
      const [sid, ayah] = vk.split(':').map(Number);
      const prevFirst = idx > 0 && lines[idx - 1].length ? lines[idx - 1][0][0] : null;
      const prevSid = prevFirst ? Number(prevFirst.split(':')[0]) : null;
      if (ayah === 1 && prevSid !== sid) surahStartAt.set(idx, sid);
    });

    const emptyOrder = new Map();
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].length) continue;
      let j = i;
      while (j < lines.length && !lines[j].length) j++;
      for (let k = i; k < j; k++) emptyOrder.set(k, k - i + 1);
      i = j - 1;
    }

    lines.forEach((line, idx) => {
      if (!line.length) {
        let j = idx;
        while (j < lines.length && !lines[j].length) j++;
        const sid = surahStartAt.get(j);
        const order = emptyOrder.get(idx) || 1;
        const info = sid ? (surahs[String(sid)] || {}) : null;
        if (sid && order === 1) rows.push({ kind: 'surah', info });
        else if (sid && order === 2 && info && info.bismillah) rows.push({ kind: 'bismillah' });
        else rows.push({ kind: 'empty' });
        return;
      }
      const sid = surahStartAt.get(idx);
      const prevHadWords = idx > 0 && lines[idx - 1].length > 0;
      if (sid && prevHadWords) rows.push({ kind: 'surah', info: surahs[String(sid)] || {}, inline: true });
      rows.push({ kind: 'words', words: line });
    });
    return rows;
  }

  /** Apakah tampilan dua halaman aktif? */
  function spreadWanted() {
    const mode = state.spreadMode || 'auto';
    if (mode === 'one') return false;
    if (mode === 'two') return true;
    return window.innerWidth >= 1100;      // otomatis: layar lebar
  }

  /** Pasangan halaman (ganjil di kanan, genap di kiri) seperti mushaf cetak. */
  function spreadPair(page) {
    if (!spreadWanted() || pageCount() < 2) return [page];
    const start = page % 2 === 0 ? page - 1 : page;
    const pair = [start];
    if (start + 1 <= pageCount()) pair.push(start + 1);
    return pair;
  }

  /** Nomor juz untuk sebuah ayat (dari juz_map, dihitung sekali). */
  let verseJuzMap = null;
  async function juzOf(verseKey) {
    if (!verseJuzMap) {
      verseJuzMap = new Map();
      const juzMap = await DataManager.load('juzMap');
      for (const j of juzMap || []) {
        for (const vk of j.verses || []) verseJuzMap.set(vk, j.juz);
      }
    }
    return verseJuzMap.get(verseKey) || null;
  }

  /** Lembar terjemahan untuk menggantikan halaman sebelah pada mode dua halaman. */
  async function buildTranslationSheetHtml(page, chapters) {
    const pd = await resolvePageData(page);
    const versesData = await DataManager.load('verses');
    const items = ((pd && pd.verses) || [])
      .map(v => ({ meta: v, verse: versesData[v.surah]?.find(x => x.verse_number === v.ayah) }))
      .filter(x => x.verse);

    const first = items[0] && items[0].meta;
    const info = first ? chapters.find(c => c.id === first.surah) : null;
    const juz = first ? await juzOf(`${first.surah}:${first.ayah}`) : null;

    let rows = '';
    let currentSurah = null;
    for (const { meta } of items) {
      const verseKey = `${meta.surah}:${meta.ayah}`;
      const tr = await DataManager.getTranslation(verseKey, 'indo') ||
                 await DataManager.getTranslation(verseKey, 'eng');
      const taf = state.showTafsir ? await DataManager.getTafsir(verseKey, 'short') : '';
      if (meta.surah !== currentSurah) {
        currentSurah = meta.surah;
        const ch = chapters.find(c => c.id === meta.surah);
        rows += `<div class="scan-surah-sep"><span dir="rtl">${ch?.name_arabic || ''}</span> ${ch?.name_simple || ''}</div>`;
      }
      rows += `<div class="scan-text-row" data-verse="${verseKey}">`;
      rows += `<button class="scan-num" data-play="${verseKey}" aria-label="Putar ayat ${meta.ayah}">${toArabicDigits(meta.ayah)}</button>`;
      rows += `<div class="scan-text-body">`;
      if (state.showTranslation && tr) rows += `<div class="scan-tr">${tr}</div>`;
      if (state.showTafsir && taf) rows += `<div class="scan-taf"><span>Tafsir:</span> ${taf}</div>`;
      rows += `</div></div>`;
    }
    if (!rows) rows = `<div class="scan-text-row"><div class="scan-text-body"><div class="scan-tr">Terjemahan tidak tersedia.</div></div></div>`;

    const borderVariant = state.pageBorder === 'none' ? 'none' : 'simple';
    const borderHtml = `<div class="page-border ${borderVariant}" aria-hidden="true">` +
      `<span class="pb-edge h top"></span><span class="pb-edge h bottom"></span>` +
      `<span class="pb-edge v left"></span><span class="pb-edge v right"></span>` +
      `<span class="pb-corner tl"></span><span class="pb-corner tr"></span>` +
      `<span class="pb-corner bl"></span><span class="pb-corner br"></span>` +
      `</div>`;

    return `<div class="scan-sheet-box" data-sheet="trans-${page}">` +
      `<div class="scan-sheet trans-sheet pb-${borderVariant === 'none' ? 'none' : 'simple'}">` +
      borderHtml +
      `<div class="trans-head"><strong>Terjemahan${state.showTafsir ? ' & Tafsir' : ''}</strong>` +
      `<span>${info ? info.name_simple : ''} · halaman ${toArabicDigits(page)}${juz ? ' · Juz ' + juz : ''}</span></div>` +
      `<div class="trans-body">${rows}</div>` +
      `</div></div>`;
  }


  /** Bangun HTML satu lembar halaman (dipakai mode satu & dua halaman). */
  async function buildSheetHtml(page, chapters, layout) {
    // Madani selalu memakai font QCF asli (warna dari font v4-tajweed)
    const tajweedPage = !!state.showTajwid && mushafKey() === 'madani';
    const fontFamily = await ensureMushafFont(page, tajweedPage);

    // IndoPak tidak punya font berwarna → warnai per kata dengan data tajwid
    const wordTintOn = !!state.showTajwid && mushafKey() === 'indopak';
    const letterByVerse = new Map();      // vk -> Map(ordinal → kata markup)
    const wordOrdinal = new Map();        // vk -> nomor kata teks yang sedang ditulis
    // peta: ayat → (posisi kata → grup tajwid). Hanya kata teks (penanda nomor
    // ayat tidak dihitung), supaya indeks sejajar dengan markup tajwid.
    const tintByVerse = new Map();
    if (wordTintOn || tajweedPage) {
      const textPos = new Map();                 // vk -> [{ pos, base }] urut
      for (const row of buildRows(layout, page, chapters) || []) {
        if (row.kind !== 'words') continue;
        for (const [vk, pos, glyph, isEnd] of row.words) {
          if (isEnd) continue;
          const txt = String(glyph).replace(/[\uE000-\uF8FF]/g, '').trim();
          if (!textPos.has(vk)) textPos.set(vk, []);
          textPos.get(vk).push({ pos, base: baseLetters(txt) });
        }
      }
      for (const [vk, items] of textPos) {
        const markupWords = await verseLetterData(vk);   // [{ base, rules }]
        if (!markupWords.length) continue;

        // petakan kata IndoPak → kata markup (jumlah sama: langsung; beda: disejajarkan)
        let mapping;
        if (markupWords.length === items.length) {
          mapping = items.map((_, i) => i);
        } else {
          mapping = alignWords(items.map(x => x.base), markupWords.map(w => w.base));
        }

        const byOrdinal = new Map();               // ordinal → kata markup
        const m = new Map();                       // posisi → grup dominan (cadangan)
        items.forEach((it, i) => {
          const j = mapping[i];
          if (j == null || j < 0) return;
          const word = markupWords[j];
          if (!word) return;
          byOrdinal.set(i, word);
          const firstRule = (word.rules || []).find(Boolean) || null;
          const g = firstRule ? (RULE_TO_GROUP[firstRule] || null) : null;
          if (g) m.set(it.pos, g);
        });
        if (byOrdinal.size) {
          tintByVerse.set(vk, m);
          letterByVerse.set(vk, byOrdinal);
        }
      }
    }

    const rows = buildRows(layout, page, chapters);
    let htm = '';
    if (!rows) {
      htm = `<div class="mline mline-empty">Layout halaman tidak tersedia</div>`;
    } else {
      for (const row of rows) {
        if (row.kind === 'surah') {
          const info = row.info || {};
          if (row.inline) {
            htm += `<div class="msurah-inline">۞ ${info.name || ''} · ${info.name_simple || ''}</div>`;
            if (info.bismillah) htm += `<div class="mbasmalah-inline">بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ</div>`;
          } else {
            htm += `<div class="mline mline-head"><div class="msurah-band">` +
                   `<span class="msurah-orn">۞</span>` +
                   `<span class="msurah-name">${info.name || ''}</span>` +
                   `<span class="msurah-meta">${info.ayahs ? info.ayahs + ' ayat' : (info.name_simple || '')}</span>` +
                   `</div></div>`;
          }
        } else if (row.kind === 'bismillah') {
          htm += `<div class="mline mline-basmalah"><span class="mbasmalah">بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ</span></div>`;
        } else if (row.kind === 'words') {
          const short = (row.words || []).length < 3 ? ' mline-short' : '';
          htm += `<div class="mline${short}">`;
          for (const [vk, pos, glyph, isEnd] of row.words) {
            if (mushafKey() === 'indopak') {
              // IndoPak: buang glyph PUA (waqf/penanda QCF) yang tak ada di font nastaleeq
              const clean = String(glyph).replace(/[\uE000-\uF8FF]/g, '').trim();
              if (isEnd) {
                const ayahNo = vk.split(':')[1];
                htm += `<span class="mw mw-end-badge" data-v="${vk}" data-w="${pos}">${toArabicDigits(Number(ayahNo))}</span>`;
              } else if (clean) {
                let tint = '';
                let inner = clean;
                if (wordTintOn) {
                  const ord = wordOrdinal.get(vk) || 0;
                  wordOrdinal.set(vk, ord + 1);
                  const markupWord = letterByVerse.get(vk)?.get(ord);
                  const perLetter = markupWord ? tintedWordHtml(clean, markupWord) : null;
                  if (perLetter !== null) {
                    inner = perLetter;
                  } else {
                    const g = tintByVerse.get(vk)?.get(pos);
                    if (g) tint = ` taj-${g}`;
                  }
                }
                htm += `<span class="mw${tint}" data-v="${vk}" data-w="${pos}">${inner}</span> `;
              }
            } else {
              let attrs = '';
              if (tajweedPage && !isEnd) {
                const ord = wordOrdinal.get(vk) || 0;
                wordOrdinal.set(vk, ord + 1);
                const mw = letterByVerse.get(vk)?.get(ord);
                if (mw) {
                  const names = [...new Set((mw.rules || []).filter(Boolean))];
                  if (names.length) attrs = ` data-rules="${names.join(' ')}"`;
                }
              }
              htm += `<span class="mw${isEnd ? ' mw-end' : ''}" data-v="${vk}" data-w="${pos}"${attrs}>${glyph}</span> `;
            }
          }
          htm += `</div>`;
        } else {
          htm += `<div class="mline mline-empty"></div>`;
        }
      }
    }

    const style = fontFamily ? ` style="font-family:'${fontFamily}', serif"` : '';
    const mushafClass = mushafKey() === 'indopak' ? ' mushaf-indopak' : '';
    // kepala halaman gaya cetakan: nama surat · nomor halaman · juz
    const rows0 = buildRows(layout, page, chapters) || [];
    let firstVk = null;
    for (const r of rows0) {
      if (r.kind === 'words' && r.words.length) { firstVk = r.words[0][0]; break; }
    }
    let headHtml = '';
    if (firstVk) {
      const [surahNo] = firstVk.split(':').map(Number);
      const ch = chapters.find(c => c.id === surahNo);
      const juz = await juzOf(firstVk);
      headHtml = `<div class="page-head" aria-hidden="true">` +
        `<span class="ph-surah">${surahNo}. ${ch ? (ch.name_simple || '') : ''}</span>` +
        `<span class="ph-page">${toArabicDigits(page)}</span>` +
        `<span class="ph-juz">${juz ? 'Juz ' + juz : ''}</span>` +
        `</div>`;
    }

    const borderVariant = state.pageBorder === 'none' ? 'none' : 'simple';
    const sheetVariant = borderVariant === 'none' ? ' pb-none' : ' pb-simple';
    const borderHtml = `<div class="page-border ${borderVariant}" aria-hidden="true">` +
      `<span class="pb-edge h top"></span><span class="pb-edge h bottom"></span>` +
      `<span class="pb-edge v left"></span><span class="pb-edge v right"></span>` +
      `<span class="pb-corner tl"></span><span class="pb-corner tr"></span>` +
      `<span class="pb-corner bl"></span><span class="pb-corner br"></span>` +
      `</div>`;
    return `<div class="scan-sheet-box" data-sheet="${page}">` +
      `<div class="scan-sheet${mushafClass}${sheetVariant}">` +
      borderHtml + headHtml +
      `<div class="mushaf-page-lines"${style}>${htm}</div></div></div>`;
  }

  async function renderScanPage(page, pageData, surahInfo, lastSurahInfo, chapters, seq) {
    const layout = await DataManager.getLayout(mushafKey());
    const versesData = await DataManager.load('verses');
    prefetchPageFonts(page);

    // satu atau dua halaman (buku)
    const pair = spreadPair(page);
    const metaSeen = new Set();
    const allMeta = [];
    for (const p of pair) {
      const pd = p === page ? pageData : await resolvePageData(p);
      for (const v of (pd && pd.verses) || []) {
        const key = `${v.surah}:${v.ayah}`;
        if (metaSeen.has(key)) continue;
        metaSeen.add(key);
        allMeta.push(v);
      }
    }

    const verses = allMeta
      .map(v => ({ meta: v, verse: versesData[v.surah]?.find(x => x.verse_number === v.ayah) }))
      .filter(x => x.verse);

    // kelompokkan per surat untuk strip nomor ayat
    const groups = [];
    for (const item of verses) {
      let g = groups.find(x => x.surah === item.meta.surah);
      if (!g) {
        const info = chapters.find(c => c.id === item.meta.surah);
        g = { surah: item.meta.surah, info, items: [] };
        groups.push(g);
      }
      g.items.push(item);
    }

    // bila terjemahan/tafsir aktif pada dua halaman, lembar kiri jadi halaman terjemahan
    const showText = state.showTranslation || state.showTafsir;
    const transOnPage = showText && pair.length > 1;
    const sheets = [];
    for (let idx = 0; idx < pair.length; idx++) {
      const p = pair[idx];
      let html;
      if (transOnPage && idx === 1) {
        html = await buildTranslationSheetHtml(pair[0], chapters);
      } else {
        html = await buildSheetHtml(p, chapters, layout);
      }
      if (seq !== undefined && seq !== state._renderSeq) return;   // render sudah basi
      sheets.push(html);
    }

    let html = `<div class="scan-page" data-page="${page}">`;
    html += pair.length > 1
      ? `<div class="scan-spread">${sheets.join('')}</div>`
      : sheets[0];

    // legenda warna tajwid (tampil saat tajwid aktif)
    if (state.showTajwid) {
      html += `<div class="tajwid-legend${mushafKey() === 'madani' ? ' kfgqpc' : ''}" aria-label="Legenda warna tajwid">${tajwidLegendHtml()}</div>`;
    }

    // strip nomor ayat
    html += `<div class="scan-bar">`;
    for (const g of groups) {
      html += `<div class="chip-group"><span class="chip-group-label" dir="rtl">${g.info?.name_arabic || ''}</span>`;
      for (const { meta } of g.items) {
        html += `<button class="ayah-chip" data-play="${meta.surah}:${meta.ayah}" ` +
                `title="Putar ${g.info?.name_simple || meta.surah} ayat ${meta.ayah}">${toArabicDigits(meta.ayah)}</button>`;
      }
      html += `</div>`;
    }
    html += `</div>`;

    // terjemahan / tafsir di bawah halaman (hanya mode satu halaman)
    if ((state.showTranslation || state.showTafsir) && !transOnPage) {
      const rowsHtml = async (items) => {
        let out = '';
        let currentSurah = null;
        for (const { meta } of items) {
          const verseKey = `${meta.surah}:${meta.ayah}`;
          const tr = await DataManager.getTranslation(verseKey, 'indo') ||
                     await DataManager.getTranslation(verseKey, 'eng');
          const taf = state.showTafsir ? await DataManager.getTafsir(verseKey, 'short') : '';
          const marked = isBookmarked(verseKey);
          if (meta.surah !== currentSurah) {
            currentSurah = meta.surah;
            const info = chapters.find(c => c.id === meta.surah);
            out += `<div class="scan-surah-sep"><span dir="rtl">${info?.name_arabic || ''}</span> ${info?.name_simple || ''}</div>`;
          }
          out += `<div class="scan-text-row" data-verse="${verseKey}">`;
          out += `<button class="scan-num" data-play="${verseKey}" aria-label="Putar ayat ${meta.ayah}">${toArabicDigits(meta.ayah)}</button>`;
          out += `<div class="scan-text-body">`;
          if (state.showTranslation && tr) out += `<div class="scan-tr">${tr}</div>`;
          if (state.showTafsir && taf) out += `<div class="scan-taf"><span>Tafsir:</span> ${taf}` +
            ` <button class="link-btn" data-long-tafsir="${verseKey}">lengkap</button></div>`;
          out += `</div>`;
          out += `<button class="action-btn" data-action="copy" data-verse="${verseKey}" aria-label="Salin ayat" title="Salin ayat">` +
                  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg></button>` +
                  `<button class="action-btn ${marked ? 'active' : ''}" data-action="bookmark" data-verse="${verseKey}" aria-label="Penanda">` +
                  `<svg width="16" height="16" viewBox="0 0 24 24" fill="${marked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg></button>`;
          out += `</div>`;
        }
        return out;
      };

      if (pair.length > 1) {
        // kelompokkan ayat menurut halamannya, lalu tampilkan dua kolom
        const byPage = new Map(pair.map(p => [p, []]));
        for (const item of verses) {
          const vk = `${item.meta.surah}:${item.meta.ayah}`;
          const pg = (state.versePage && state.versePage.get(vk)) || pair[0];
          (byPage.get(pg) || byPage.get(pair[0])).push(item);
        }
        html += `<div class="scan-texts scan-texts-2">`;
        for (const p of pair) {
          html += `<div class="scan-col" data-page="${p}">` + await rowsHtml(byPage.get(p) || []) + `</div>`;
        }
        html += `</div>`;
      } else {
        html += `<div class="scan-texts">` + await rowsHtml(verses) + `</div>`;
      }
    }
    html += `</div>`;
    if (seq !== undefined && seq !== state._renderSeq) return;    // dibatalkan render baru
    els.mushafContainer.innerHTML = html;

    // satu halaman atau dua halaman (buku): skalakan tiap lembar
    const sheetEls = [...els.mushafContainer.querySelectorAll('.scan-sheet')];
    for (const sheet of sheetEls) {
      applyPageScale(sheet);
      // font halaman dimuat asinkron: ukur ulang setelah siap
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => applyPageScale(sheet)).catch(() => {});
      }
      new ResizeObserver(() => applyPageScale(sheet)).observe(sheet);
    }
    state._spreadRendered = sheetEls.length > 1;

    els.mushafContainer.querySelectorAll('[data-play]').forEach(btn => {
      btn.addEventListener('click', () => playAyah(btn.dataset.play));
    });
    els.mushafContainer.querySelectorAll('.mw').forEach(el => {
      el.addEventListener('click', () => playAyah(el.dataset.v));
    });
    els.mushafContainer.querySelectorAll('[data-action="copy"]').forEach(btn => {
      btn.addEventListener('click', () => copyAyah(btn.dataset.verse));
    });
    els.mushafContainer.querySelectorAll('[data-long-tafsir]').forEach(btn => {
      btn.addEventListener('click', () => showFullTafsir(btn.dataset.longTafsir));
    });
    els.mushafContainer.querySelectorAll('[data-action="bookmark"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.verse;
        toggleBookmark(key);
        const on = isBookmarked(key);
        btn.classList.toggle('active', on);
        const svg = btn.querySelector('svg');
        if (svg) svg.setAttribute('fill', on ? 'currentColor' : 'none');
      });
    });
    updatePlayingHighlight();
  }

  function updatePlayingHighlight() {
    const cur = state.audioCurrent ? state.audioCurrent.verseKey : null;
    document.querySelectorAll('.ayah-chip').forEach(el => {
      el.classList.toggle('playing', el.dataset.play === cur);
    });
    document.querySelectorAll('.scan-text-row').forEach(el => {
      el.classList.toggle('playing', el.dataset.verse === cur);
    });
  }

  /**
   * Data ayat untuk sebuah halaman.
   * Madani memakai page_map (604 halaman); IndoPak (610 halaman) diturunkan dari
   * layout-nya sendiri supaya halaman 605–610 tetap ketemu.
   */
  async function resolvePageData(page) {
    const layout = await DataManager.getLayout(mushafKey());
    const raw = layout && layout.pages ? layout.pages[String(page)] : null;
    const rows = Array.isArray(raw) ? raw : (raw && raw.lines) || [];
    const typed = rows.length && !Array.isArray(rows[0]) && rows[0].kind;

    if (typed) {
      const seq = [];
      for (const row of rows) {
        if (row.kind !== 'words') continue;
        for (const [vk] of row.words) {
          const [surah, ayah] = vk.split(':').map(Number);
          const last = seq[seq.length - 1];
          if (!last || last.surah !== surah || last.ayah !== ayah) {
            seq.push({ verse_key: vk, surah, ayah });
          }
        }
      }
      if (seq.length) return { page: Number(page), verses: seq };
    }

    const pageMap = await DataManager.load('pageMap');
    return (pageMap || []).find(p => p.page === Number(page)) || null;
  }

  /**
   * Hitung ukuran font halaman: lebar lembar / em teks, lalu perkecil bila ada
   * baris yang lebih lebar dari kotaknya. Dipakai saat render, resize, dan
   * setelah font selesai dimuat.
   */
  /**
   * Skalakan halaman.
   * Lebar alami tiap halaman IndoPak berbeda (16–21 em), jadi ukuran font
   * dihitung dari baris terlebar halaman itu: font = 720 / (lebarEm + 1,8 padding).
   * Dengan begitu baris terlebar tepat selebar halaman, baris lain dijustify
   * mengisi sisa — tidak ada yang terpotong dan ujung baris tetap sama.
   */
  function applyPageScale(sheet) {
    if (!sheet || !sheet.isConnected) return;
    // lembar terjemahan: cukup diskalakan, tidak perlu mengukur font mushaf
    if (sheet.classList.contains('trans-sheet')) {
      const stageT = sheet.parentElement;
      const DESIGN_WT = 720;
      sheet.style.setProperty('--design-w', `${DESIGN_WT}px`);
      const boxWT = stageT ? stageT.clientWidth : DESIGN_WT;
      const topYT = stageT ? stageT.getBoundingClientRect().top : 0;
      const availHT = Math.max(320, window.innerHeight - topYT - 20);
      const scaleT = Math.min(1, boxWT / DESIGN_WT, availHT / (sheet.offsetHeight || 1)) || 1;
      sheet.style.setProperty('--page-scale', String(scaleT));
      if (stageT) stageT.style.height = `${Math.round(sheet.offsetHeight * scaleT)}px`;
      return;
    }
    const stage = sheet.parentElement;
    const DESIGN_W = 720;
    const pageLines = sheet.querySelector('.mushaf-page-lines');
    if (!pageLines) return;

    sheet.style.setProperty('--design-w', `${DESIGN_W}px`);

    // 1) ukur lebar alami baris terlebar (em) pada font referensi 100px
    const rows = [...sheet.querySelectorAll('.mline')].filter(l => (l.textContent || '').trim());
    let maxEm = mushafKey() === 'indopak' ? 18.8 : 19.1;   // nilai aman bila tak terukur
    if (rows.length) {
      const REF = 100;
      const saved = rows.map(r => [r.style.whiteSpace, r.style.display, r.style.width]);
      sheet.style.setProperty('--msize', `${REF}px`);
      rows.forEach(r => {
        r.style.whiteSpace = 'nowrap';
        r.style.display = 'inline-block';
        r.style.width = 'max-content';
      });
      maxEm = Math.max(...rows.map(r => r.getBoundingClientRect().width), 1) / REF;
      rows.forEach((r, i) => { [r.style.whiteSpace, r.style.display, r.style.width] = saved[i]; });
    }

    // 2) ukuran font: acuan tetap seperti QUL; hanya mengecil bila halaman lebih padat
    const padEm = state.pageBorder === 'none' ? 2.0 : 3.0;   /* 1,5em per sisi: beri ruang ekor huruf */
    const baseEm = mushafKey() === 'indopak' ? 17.4 : 19.1;   // lebar acuan (em)
    maxEm = Math.max(maxEm, baseEm);
    sheet.style.setProperty('--page-pad', String(padEm / 2));   /* per sisi, dalam em huruf halaman */
    const userScale = Math.min(120, Math.max(80, Number(state.pageFontScale) || 100)) / 100;
    let font = (DESIGN_W / (maxEm + padEm)) * userScale;
    font = Math.max(20, Math.min(44, font));
    sheet.style.setProperty('--msize', `${font}px`);

    // 3) jaring pengaman: isi halaman harus berada di dalam KOTAK ISI
    //    (bukan hanya di dalam lembar) supaya margin kiri & kanan sama
    for (let i = 0; i < 8; i++) {
      const cs2 = getComputedStyle(sheet);
      const sr2 = sheet.getBoundingClientRect();
      const k = sr2.width / (sheet.offsetWidth || 1);          // skala transform
      const innerL = sr2.left + parseFloat(cs2.paddingLeft) * k;
      const innerR = sr2.right - parseFloat(cs2.paddingRight) * k;
      if (!(innerR > innerL)) break;
      let worst = 0;
      for (const el of pageLines.querySelectorAll('.mw, .msurah-band, .mbasmalah')) {
        const r = el.getBoundingClientRect();
        if (!r.width) continue;
        worst = Math.max(worst,
          Math.ceil(r.right - innerR) + 1,
          Math.ceil(innerL - r.left) + 1);
      }
      if (worst <= 1) break;
      const avail = pageLines.clientWidth || 1;
      const fs = parseFloat(getComputedStyle(sheet).getPropertyValue('--msize')) || font;
      sheet.style.setProperty('--msize', `${Math.max(10, fs * (avail / (avail + worst)) * 0.995)}px`);
    }

    // 4) skala utuh: muat lebar DAN tinggi layar agar halaman terlihat penuh
    const boxW = stage ? stage.clientWidth : DESIGN_W;
    const topY = stage ? stage.getBoundingClientRect().top : 0;
    const availH = Math.max(320, window.innerHeight - topY - 20);
    const designH = sheet.offsetHeight || 1;
    const scale = Math.min(1, boxW / DESIGN_W, availH / designH) || 1;
    sheet.style.setProperty('--page-scale', String(scale));
    if (stage) stage.style.height = `${Math.round(sheet.offsetHeight * scale)}px`;
  }

  async function renderPage(page) {
    const seq = ++state._renderSeq;
    const maxPage = pageCount();
    if (page < 1 || page > maxPage) return;
    // mode dua halaman: selalu mulai dari halaman ganjil (kanan)
    const pair = spreadPair(page);
    page = pair[0];
    state.currentPage = page;
    els.pageIndicator.textContent = pair.length > 1
      ? `${pair[0]}–${pair[1]} / ${maxPage}`
      : `${page} / ${maxPage}`;
    els.pageLabel.textContent = pair.length > 1
      ? `Halaman ${pair[0]}–${pair[1]}`
      : `Halaman ${page}`;
    els.btnPrevPage.disabled = page <= 1;
    els.btnNextPage.disabled = page + pair.length - 1 >= maxPage;
    state._pageStep = pair.length;

    saveLastRead();

    // Keep the URL shareable (no reload)
    try {
      const url = new URL(location.href);
      url.searchParams.set('page', String(page));
      history.replaceState(null, '', url);
    } catch {}
    
    els.mushafContainer.innerHTML = '<div class="loading">Memuat halaman...</div>';
    
    try {
      const pageData = await resolvePageData(page);
      if (!pageData) throw new Error('Page not found');
      
      const versesData = await DataManager.load('verses');
      const chapters = await DataManager.load('chapters');

      // Determine surah for header
      const firstVerse = pageData.verses[0];
      const lastVerse = pageData.verses[pageData.verses.length - 1];
      const surahInfo = chapters.find(c => c.id === firstVerse.surah);
      const lastSurahInfo = chapters.find(c => c.id === lastVerse.surah);

      // Update header labels
      els.surahLabel.textContent = surahInfo?.name_simple || `Surat ${firstVerse.surah}`;
      state.currentSurah = firstVerse.surah;

      // ═══ Mode pindaian: tampilkan gambar halaman mushaf ═══
      if (state.pageMode === 'scan') {
        await renderScanPage(page, pageData, surahInfo, lastSurahInfo, chapters, seq);
        return;
      }

      // Build page HTML
      let html = `<div class="mushaf-page">`;
      html += `<div class="page-header">`;
      html += `<div class="page-surah-name">${surahInfo?.name_arabic || ''} — ${surahInfo?.name_simple || ''}</div>`;
      html += `<div class="page-meta">Halaman ${page} · Juz ${firstVerse.juz} · ${surahInfo?.name_simple || ''}${lastSurahInfo && lastSurahInfo.id !== surahInfo?.id ? ' s.d. ' + lastSurahInfo.name_simple : ''}</div>`;
      html += `</div>`;
      // Basmalah pembuka surat (bukan Al-Fatihah & bukan At-Taubah)
      if (firstVerse.ayah === 1 && firstVerse.surah !== 1 && firstVerse.surah !== 9 && surahInfo?.bismillah_pre) {
        html += `<div class="basmalah" dir="rtl">بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ</div>`;
      }
      
      for (const v of pageData.verses) {
        const verse = versesData[v.surah]?.find(vv => vv.verse_number === v.ayah);
        if (!verse) continue;
        
        const verseKey = `${v.surah}:${v.ayah}`;
        const translation = await DataManager.getTranslation(verseKey, 'indo');
        const translationEng = translation ? '' : await DataManager.getTranslation(verseKey, 'eng');
        const tafsir = state.showTafsir ? await DataManager.getTafsir(verseKey, 'short') : '';
        const tajwidRaw = state.showTajwid ? await DataManager.getTajwid(verseKey) : '';
        // Buang penanda nomor ayat bawaan API, kita pakai badge sendiri
        const tajwidHtml = tajwidRaw ? tajwidRaw.replace(/<span class=end>.*?<\/span>/g, '') : '';
        const displayArabic = state.showTajwid && tajwidHtml ? tajwidHtml : verse.text_uthmani;
        const bookmarked = isBookmarked(verseKey);
        
        html += `<div class="ayah-row" data-verse="${verseKey}">`;
        html += `<div class="ayah-content">`;
        if (state.showArabic) {
          html += `<div class="ayah-arabic" dir="rtl" title="Klik untuk memutar ayat">${wordsToSpans(displayArabic)}</div>`;
        }
        if (state.showTranslation) {
          const tr = translation || translationEng || '';
          if (tr) html += `<div class="ayah-translation" dir="ltr">${tr}</div>`;
        }
        if (state.showTafsir && tafsir) {
          html += `<div class="ayah-tafsir"><div class="tafsir-title">Tafsir:</div>${tafsir}</div>`;
        }
        html += `</div>`;
        if (state.showAyahNumbers) {
          html += `<div class="ayah-marker"><span class="ayah-number">${toArabicDigits(v.ayah)}</span></div>`;
        }
        html += `<div class="ayah-actions">`;
        html += `<button class="action-btn" data-action="play" data-verse="${verseKey}" aria-label="Putar ayat" title="Putar"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg></button>`;
        html += `<button class="action-btn" data-action="copy" data-verse="${verseKey}" aria-label="Salin ayat" title="Salin ayat"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg></button>`;
        html += `<button class="action-btn ${bookmarked ? 'active' : ''}" data-action="bookmark" data-verse="${verseKey}" aria-label="${bookmarked ? 'Hapus penanda' : 'Tambah penanda'}" title="${bookmarked ? 'Hapus penanda' : 'Tambah penanda'}"><svg width="18" height="18" viewBox="0 0 24 24" fill="${bookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg></button>`;
        html += `</div>`;
        html += `</div>`;
      }
      
      html += `</div>`;
      if (state.showTajwid) {
        html += `<div class="tajwid-legend${mushafKey() === 'madani' ? ' kfgqpc' : ''}" aria-label="Legenda warna tajwid">${tajwidLegendHtml()}</div>`;
      }
      els.mushafContainer.innerHTML = html;
      
      // Attach event listeners
      attachVerseActions();
      
      // Cache for offline if enabled
      if (state.offlinePages) {
        cachePage(page, html);
      }
      
    } catch (err) {
      console.error('Render page error:', err);
      els.mushafContainer.innerHTML = `<div class="error-state">Gagal memuat halaman ${page}<br><button class="btn btn-primary" data-retry="${page}">Coba Lagi</button></div>`;
      const retry = els.mushafContainer.querySelector('[data-retry]');
      if (retry) retry.addEventListener('click', () => renderPage(page));
    }
  }
  
  function attachVerseActions() {
    // Play buttons
    els.mushafContainer.querySelectorAll('[data-action="play"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const verseKey = e.currentTarget.dataset.verse;
        playAyah(verseKey);
      });
    });
    // Click on Arabic text → play this ayah (like the original app)
    els.mushafContainer.querySelectorAll('.ayah-arabic').forEach(el => {
      el.addEventListener('click', (e) => {
        // if the click landed on a tajweed span, show its rule instead
        if (e.target.matches('tajweed, tajweed *')) return;
        const row = e.currentTarget.closest('.ayah-row');
        if (row) playAyah(row.dataset.verse);
      });
    });
    // Click on a tajweed span → show the rule explanation
    els.mushafContainer.querySelectorAll('tajweed').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const rule = [...e.currentTarget.classList].find(c => c !== 'tajweed');
        showTajwidRule(rule || e.currentTarget.className);
      });
    });
    // Bookmark buttons
    els.mushafContainer.querySelectorAll('[data-action="copy"]').forEach(btn => {
      btn.addEventListener('click', (e) => copyAyah(e.currentTarget.dataset.verse));
    });
    els.mushafContainer.querySelectorAll('[data-long-tafsir]').forEach(btn => {
      btn.addEventListener('click', () => showFullTafsir(btn.dataset.longTafsir));
    });
    els.mushafContainer.querySelectorAll('[data-action="bookmark"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const verseKey = e.currentTarget.dataset.verse;
        toggleBookmark(verseKey);
        // Update button visual
        const isNowBookmarked = isBookmarked(verseKey);
        e.currentTarget.classList.toggle('active', isNowBookmarked);
        const svg = e.currentTarget.querySelector('svg');
        svg.setAttribute('fill', isNowBookmarked ? 'currentColor' : 'none');
        e.currentTarget.setAttribute('aria-label', isNowBookmarked ? 'Hapus penanda' : 'Tambah penanda');
        e.currentTarget.title = isNowBookmarked ? 'Hapus penanda' : 'Tambah penanda';
      });
    });
  }
  
  async function cachePage(page, html) {
    try {
      const cache = await caches.open('alkalam-pages');
      await cache.put(`page-${page}`, new Response(html, { headers: { 'Content-Type': 'text/html' } }));
    } catch (e) { console.warn('Cache page failed:', e); }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // Highlight per kata (mengikuti bacaan)
  // ═══════════════════════════════════════════════════════════════

  /** Pecah HTML ayat menjadi kata-kata, dengan tag (mis. <tajweed>) tetap seimbang. */
  function splitWords(html) {
    const tokens = html.match(/<[^>]+>|[^<]+/g) || [];
    const words = [];
    let cur = '';
    const open = [];

    const nameOf = (tag) => (tag.match(/^<\s*\/?\s*([\w:-]+)/) || [, ''])[1];
    const closeTags = (tags) => tags.slice().reverse().map(t => `</${nameOf(t)}>`).join('');
    const openTags = (tags) => tags.join('');

    for (const t of tokens) {
      if (t.startsWith('<')) {
        if (t.startsWith('</')) {
          const name = nameOf(t);
          const i = open.map(nameOf).lastIndexOf(name);
          if (i >= 0) open.splice(i, 1);
          cur += t;
        } else {
          open.push(t);
          cur += t;
        }
      } else {
        for (const part of t.split(/(\s+)/)) {
          if (!part) continue;
          if (/^\s+$/.test(part)) {
            if (cur.replace(/<[^>]+>/g, '').trim()) {
              words.push(cur + closeTags(open));   // tutup tag di akhir kata
              cur = openTags(open);                // buka lagi di kata berikutnya
            }
          } else {
            cur += part;
          }
        }
      }
    }
    if (cur.replace(/<[^>]+>/g, '').trim()) words.push(cur + closeTags(open));
    return words;
  }

  function wordsToSpans(html, cls = 'w') {
    return splitWords(html)
      .map((w, i) => `<span class="${cls}" data-w="${i}">${w}</span>`)
      .join(' ');
  }

  // ═══════════════════════════════════════════════════════════════
  // Audio Player
  // ═══════════════════════════════════════════════════════════════
  let audioEl = null;
  let audioTimeUpdateHandler = null;

  function initAudio() {
    audioEl = new Audio();
    audioEl.preload = 'auto';
    audioEl.volume = 0.8;

    audioTimeUpdateHandler = () => onTimeUpdate();
    audioEl.addEventListener('timeupdate', audioTimeUpdateHandler);
    audioEl.addEventListener('ended', () => onAudioEnded());
    audioEl.addEventListener('error', () => {
      showToast('Gagal memuat audio', 'error');
      stopAudio();
    });
  }

  // ── Data QUL untuk qari aktif (audio per surat + timing kata) ───────
  async function ensureQul() {
    if (state.qul && state.qulKey === state.qari) return state.qul;
    const qul = await DataManager.getQul(state.qari);
    state.qul = qul;
    state.qulKey = state.qari;
    return qul;
  }

  function surahVerseKeys(surah) {
    const verses = state.qul?.verses || {};
    const prefix = `${surah}:`;
    return Object.keys(verses)
      .filter(k => k.startsWith(prefix))
      .sort((a, b) => Number(a.split(':')[1]) - Number(b.split(':')[1]));
  }

  async function loadSurahAudio(surah) {
    const qul = await ensureQul();
    const url = (qul && qul.audio && qul.audio[String(surah)] && qul.audio[String(surah)].u) ||
                DataManager.getSurahAudioUrl(surah, state.qari);
    if (!url) return false;
    const sameFile = audioEl.src && audioEl.src.split('/').pop() === url.split('/').pop();
    if (state.playerSurah !== surah || !sameFile) {
      state.playerSurah = surah;
      state.surahKeys = surahVerseKeys(surah);
      audioEl.src = url;
      await new Promise((resolve) => {
        if (audioEl.readyState >= 1) return resolve();
        const done = () => { audioEl.removeEventListener('loadedmetadata', done); resolve(); };
        audioEl.addEventListener('loadedmetadata', done);
        setTimeout(resolve, 2000);          // jangan menggantung bila metadata lambat
      });
    }
    state.surahKeys = state.surahKeys && state.surahKeys.length ? state.surahKeys : surahVerseKeys(surah);
    return true;
  }

  // ayat yang sedang berbunyi pada posisi ms tertentu
  function ayahAt(ms) {
    const keys = state.surahKeys || [];
    const verses = state.qul?.verses || {};
    for (let i = keys.length - 1; i >= 0; i--) {
      const v = verses[keys[i]];
      if (v && ms >= v.f - 60) return keys[i];   // toleransi 60 ms
    }
    return keys[0] || null;
  }

  function ayahTimes(verseKey) {
    const v = state.qul?.verses?.[verseKey];
    return v ? { from: v.f, to: v.t, segs: v.s || [] } : null;
  }

  // ── Playback ────────────────────────────────────────────────────────
  async function playAyah(verseKey) {
    if (!audioEl) initAudio();

    const [surah, ayah] = verseKey.split(':').map(Number);
    els.audioBar.hidden = false;
    els.audioPlay.hidden = false;
    els.audioPause.hidden = true;

    const ok = await loadSurahAudio(surah);
    if (!ok) {
      showToast('Audio qari ini tidak tersedia', 'error');
      return;
    }
    if (!state.qul) {
      showToast('Data timing QUL belum termuat — highlight kata nonaktif', 'error');
    }

    const t = ayahTimes(verseKey);
    if (t) {
      try { audioEl.currentTime = t.from / 1000; } catch {}
    }

    await setCurrentAyah(verseKey, { force: true });

    try {
      await audioEl.play();
      state.audioPlaying = true;
      els.audioPlay.hidden = true;
      els.audioPause.hidden = false;
    } catch (err) {
      if (err && err.name === 'NotAllowedError') {
        showToast('Tekan tombol putar untuk memulai audio');
        state.audioPlaying = false;
        return;
      }
      showToast('Gagal memutar audio', 'error');
      stopAudio();
    }
  }

  // Perbarui seluruh UI untuk ayat yang sedang dibaca
  async function setCurrentAyah(verseKey, { force = false } = {}) {
    if (!force && state.audioCurrent && state.audioCurrent.verseKey === verseKey) return;
    const [surah, ayah] = verseKey.split(':').map(Number);
    state.audioCurrent = { surah, ayah, verseKey };

    const info = await DataManager.getSurah(surah);
    els.audioSurah.textContent = `${info?.name_simple || surah} (${surah})`;
    els.audioAyah.textContent = `Ayat ${ayah}`;

    // sorot baris/ayat yang sedang dibaca
    document.querySelectorAll('.ayah-row.playing').forEach(el => el.classList.remove('playing'));
    document.querySelectorAll('.mw.ayah-on').forEach(el => el.classList.remove('ayah-on'));
    document.querySelectorAll('.mw[data-v]').forEach(el => {
      if (el.dataset.v === verseKey) el.classList.add('ayah-on');
    });
    const row = document.querySelector(`.ayah-row[data-verse="${verseKey}"]`);
    if (row) {
      row.classList.add('playing');
      if (state.pageMode === 'text') row.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    updatePlayingHighlight();

    // ikuti halaman mushaf kalau ayat ada di halaman lain
    const targetPage = state.versePage && state.versePage.get(verseKey);
    if (targetPage && targetPage !== state.currentPage) {
      const playing = audioEl && !audioEl.paused;
      await renderPage(targetPage);
      if (playing) { /* renderPage tidak menyentuh audio */ }
      document.querySelectorAll('.ayah-row.playing').forEach(el => el.classList.remove('playing'));
      const row2 = document.querySelector(`.ayah-row[data-verse="${verseKey}"]`);
      if (row2) row2.classList.add('playing');
      updatePlayingHighlight();
    }

    await prepareFollowLine(verseKey);
  }

  // Baris teks ayat yang sedang dibaca (mode pindaian)
  async function prepareFollowLine(verseKey) {
    const bar = document.getElementById('followBar');
    if (!bar) return;
    const [surah, ayah] = verseKey.split(':').map(Number);
    const verses = await DataManager.getVerses(surah);
    const verse = verses.find(v => v.verse_number === ayah);
    if (!verse) { bar.hidden = true; return; }
    const info = await DataManager.getSurah(surah);
    bar.hidden = false;
    bar.innerHTML =
      `<div class="follow-head"><span dir="rtl">${info?.name_arabic || ''}</span>` +
      `<span>${info?.name_simple || surah} : ${ayah}</span></div>` +
      `<div class="follow-words" dir="rtl">${wordsToSpans(verse.text_uthmani)}</div>`;
  }

  function clearFollowLine() {
    const bar = document.getElementById('followBar');
    if (bar) { bar.hidden = true; bar.innerHTML = ''; }
  }

  // Sorot kata sesuai posisi waktu (timing QUL, kata 1-based)
  function highlightWordAt(ms) {
    const cur = state.audioCurrent;
    if (!cur) return;
    const t = ayahTimes(cur.verseKey);
    if (!t || !t.segs.length) return;

    let word = -1;
    for (const [w, start, end] of t.segs) {
      if (ms >= start && ms < end) { word = w; break; }
    }

    // halaman layout: sorot langsung di halaman
    const pageWords = document.querySelectorAll(`.mw[data-v="${cur.verseKey}"]`);
    if (pageWords.length) {
      pageWords.forEach(el => el.classList.add('ayah-on'));
      document.querySelectorAll('.mw.word-on').forEach(el => el.classList.remove('word-on'));
      if (word > 0) {
        const target = document.querySelector(`.mw[data-v="${cur.verseKey}"][data-w="${word}"]`);
        if (target) target.classList.add('word-on');
      }
      return;
    }

    // mode teks: sorot di dalam ayat
    const scope = document.querySelector('.ayah-row.playing');
    if (!scope) return;
    const nodes = scope.querySelectorAll('.w');
    if (!nodes.length) return;
    const maxWord = Math.max(...t.segs.map(s => s[0]));
    const scale = maxWord > 0 && nodes.length !== maxWord ? nodes.length / maxWord : 1;
    const idx = word > 0 ? Math.min(nodes.length - 1, Math.round(word * scale) - 1) : -1;
    nodes.forEach((n, i) => n.classList.toggle('on', i === idx));
  }

  function clearWordHighlight() {
    document.querySelectorAll('.w.on').forEach(n => n.classList.remove('on'));
    document.querySelectorAll('.mw.word-on').forEach(n => n.classList.remove('word-on'));
    document.querySelectorAll('.mw.ayah-on').forEach(n => n.classList.remove('ayah-on'));
  }

  function onTimeUpdate() {
    if (!audioEl) return;
    const ms = audioEl.currentTime * 1000;

    if (state.qul && state.playerSurah) {
      const vk = ayahAt(ms);
      if (vk) setCurrentAyah(vk);        // hanya berubah bila ayat berganti
    }
    highlightWordAt(ms);
    updateAudioProgress();
  }

  function updateAudioProgress() {
    if (!audioEl || !audioEl.duration) return;
    const pct = (audioEl.currentTime / audioEl.duration) * 100;
    els.progressFill.style.width = `${pct}%`;
    const cur = formatTime(audioEl.currentTime);
    const dur = formatTime(audioEl.duration);
    els.audioTime.textContent = `${cur} / ${dur}`;
  }

  function pauseAudio() {
    if (audioEl && !audioEl.paused) {
      audioEl.pause();
      state.audioPlaying = false;
      els.audioPlay.hidden = false;
      els.audioPause.hidden = true;
      clearWordHighlight();
    }
  }

  function resumeAudio() {
    if (audioEl && audioEl.paused && audioEl.src) {
      audioEl.play();
      state.audioPlaying = true;
      els.audioPlay.hidden = true;
      els.audioPause.hidden = false;
    }
  }

  function stopAudio() {
    if (!audioEl) return;
    audioEl.pause();
    audioEl.removeAttribute('src');
    audioEl.load();
    state.audioPlaying = false;
    state.audioCurrent = null;
    state.playerSurah = null;
    state.surahKeys = [];
    els.audioPlay.hidden = false;
    els.audioPause.hidden = true;
    els.progressFill.style.width = '0%';
    els.audioTime.textContent = '0:00 / 0:00';
    document.querySelectorAll('.playing').forEach(el => el.classList.remove('playing'));
    clearWordHighlight();
    clearFollowLine();
    updatePlayingHighlight();
  }

  function onAudioEnded() {
    const cur = state.audioCurrent;
    if (!cur) return;
    if (state.repeatAyah) { playAyah(cur.verseKey); return; }
    if (!state.autoPlayNext) { stopAudio(); return; }
    if (cur.surah < 114) playAyah(`${cur.surah + 1}:1`);
    else stopAudio();
  }

  function formatTime(sec) {
    if (!isFinite(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function seekAudio(pct) {
    if (audioEl && audioEl.duration) {
      audioEl.currentTime = audioEl.duration * (pct / 100);
    }
  }

  function stepAyah(delta) {
    const cur = state.audioCurrent;
    if (!cur) return;
    const keys = state.surahKeys || [];
    const i = keys.indexOf(cur.verseKey);
    if (i >= 0) {
      const next = keys[i + delta];
      if (next) { playAyah(next); return; }
      // pindah surat
      if (delta > 0 && cur.surah < 114) { playAyah(`${cur.surah + 1}:1`); return; }
      if (delta < 0 && cur.surah > 1) {
        DataManager.getVerses(cur.surah - 1).then(vs => {
          if (vs.length) playAyah(`${cur.surah - 1}:${vs.length}`);
        });
        return;
      }
    }
    playAyah(cur.verseKey);
  }

  function prevAyah() { stepAyah(-1); }
  function nextAyah() { stepAyah(1); }

  // ═══════════════════════════════════════════════════════════════
  // Juz Grid
  // ═══════════════════════════════════════════════════════════════
  async function renderJuzGrid() {
    const chapters = await DataManager.load('chapters');
    els.juzGrid.innerHTML = '';
    for (let j = 1; j <= 30; j++) {
      const juzMap = await DataManager.load('juzMap');
      const juzData = juzMap.find(jd => jd.juz === j);
      let range = '';
      if (juzData && juzData.verses.length) {
        const first = juzData.verses[0];
        const last = juzData.verses[juzData.verses.length - 1];
        range = `${first.split(':')[0]}:${first.split(':')[1]} – ${last.split(':')[0]}:${last.split(':')[1]}`;
      }
      const card = document.createElement('div');
      card.className = 'juz-card';
      card.innerHTML = `
        <div class="juz-number">${j}</div>
        <div class="juz-label">Juz</div>
        <div class="juz-range">${range}</div>
      `;
      card.addEventListener('click', () => {
        // Go to first page of this juz
        if (juzData && juzData.verses.length) {
          const first = juzData.verses[0].split(':').map(Number);
          const pageMap = DataManager.load('pageMap').then(pm => {
            const pg = pm.find(p => p.verses.some(v => v.surah === first[0] && v.ayah === first[1]));
            if (pg) renderPage(pg.page);
          });
        }
        showView('mushaf');
      });
      els.juzGrid.appendChild(card);
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // Search
  // ═══════════════════════════════════════════════════════════════
  let searchDebounce = null;
  
  function focusSearch() {
    setTimeout(() => els.searchInput.focus(), 100);
  }
  
  async function performSearch(query) {
    if (!query.trim()) {
      els.searchResults.innerHTML = '';
      return;
    }
    state.searchQuery = query;
    els.searchResults.innerHTML = '<div class="loading">Mencari...</div>';
    
    try {
      const [versesData, chapters, translationIndo, translationEng] = await Promise.all([
        DataManager.load('verses'),
        DataManager.load('chapters'),
        DataManager.load('translation_indo'),
        DataManager.load('translation_eng'),
      ]);
      
      const results = [];
      const q = query.toLowerCase();
      
      for (const surahVerses of Object.values(versesData)) {
        for (const verse of surahVerses) {
          const verseKey = `${verse.surah}:${verse.verse_number}`;
          const arabic = verse.text_uthmani;
          const indo = translationIndo?.[verseKey] || '';
          const eng = translationEng?.[verseKey] || '';
          
          if (arabic.includes(query) || indo.toLowerCase().includes(q) || eng.toLowerCase().includes(q)) {
            const surahInfo = chapters.find(c => c.id === verse.surah);
            results.push({ verse, surahInfo, verseKey, arabic, indo, eng });
            if (results.length >= 50) break;
          }
        }
        if (results.length >= 50) break;
      }
      
      state.searchResults = results;
      renderSearchResults(results, query);
      
    } catch (err) {
      console.error('Search error:', err);
      els.searchResults.innerHTML = '<div class="error-state">Gagal mencari</div>';
    }
  }
  
  function renderSearchResults(results, query) {
    if (!results.length) {
      els.searchResults.innerHTML = '<div class="empty-state">Tidak ada hasil untuk "' + escapeHtml(query) + '"</div>';
      return;
    }
    const q = query.toLowerCase();
    els.searchResults.innerHTML = results.map(r => {
      const surah = r.surahInfo?.name_simple || r.verse.surah;
      const ayah = r.verse.verse_number;
      const verseKey = `${r.verse.surah}:${ayah}`;
      const arabic = highlightMatch(r.arabic, query);
      const indo = highlightMatch(r.indo, query);
      const eng = highlightMatch(r.eng, query);
      const translation = r.indo || r.eng || '';
      return `
        <div class="search-result" data-verse="${verseKey}">
          <div class="search-result-header">
            <span class="search-result-surah">${surah} : ${ayah}</span>
            <span class="search-result-ayah">${verseKey}</span>
          </div>
          <div class="search-result-arabic" dir="rtl">${arabic}</div>
          ${translation ? `<div class="search-result-translation">${indo || eng}</div>` : ''}
        </div>
      `;
    }).join('');
    
    // Attach click to go to page
    els.searchResults.querySelectorAll('.search-result').forEach(el => {
      el.addEventListener('click', async () => {
        const verseKey = el.dataset.verse;
        const [surah, ayah] = verseKey.split(':').map(Number);
        const page = state.versePage && state.versePage.get(verseKey);
        if (page) {
          renderPage(page);
          showView('mushaf');
          // Highlight verse
          setTimeout(() => {
            const ve = document.querySelector(`[data-verse="${verseKey}"]`);
            if (ve) { ve.scrollIntoView({ behavior: 'smooth', block: 'center' }); ve.classList.add('playing'); setTimeout(() => ve.classList.remove('playing'), 2000); }
          }, 100);
        }
      });
    });
  }
  
  function highlightMatch(text, query) {
    if (!text || !query) return escapeHtml(text);
    const escaped = escapeHtml(text);
    const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
    return escaped.replace(regex, '<mark class="search-result-match">$1</mark>');
  }
  
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  // ═══════════════════════════════════════════════════════════════
  // Bookmarks
  // ═══════════════════════════════════════════════════════════════
  async function renderBookmarks() {
    if (!state.bookmarks.size) {
      els.bookmarksList.innerHTML = '<p class="empty-state">Belum ada penanda. Tekan ikon bintang pada ayat untuk menandai.</p>';
      return;
    }
    const [chapters, translationIndo, pageMap] = await Promise.all([
      DataManager.load('chapters'),
      DataManager.load('translation_indo'),
      DataManager.load('pageMap'),
    ]);

    // verseKey -> {page, juz}
    const locator = new Map();
    for (const p of pageMap) {
      for (const v of p.verses) locator.set(`${v.surah}:${v.ayah}`, { page: p.page, juz: v.juz });
    }

    const sorted = [...state.bookmarks].sort((a, b) => {
      const [sa, aa] = a.split(':').map(Number);
      const [sb, ab] = b.split(':').map(Number);
      return sa - sb || aa - ab;
    });

    els.bookmarksList.innerHTML = sorted.map(key => {
      const [surah, ayah] = key.split(':').map(Number);
      const surahInfo = chapters.find(c => c.id === surah);
      const tr = translationIndo?.[key] || '';
      const loc = locator.get(key) || {};
      return `
        <div class="bookmark-item" data-verse="${key}">
          <div class="bookmark-ayah">${surah}:${ayah}</div>
          <div class="bookmark-content">
            <div class="bookmark-surah">${surahInfo?.name_simple || surah} : ${ayah}</div>
            <div class="bookmark-text">${tr}</div>
            <div class="bookmark-meta">Halaman: ${loc.page ?? '—'} · Juz: ${loc.juz ?? '—'}</div>
          </div>
          <div class="bookmark-actions">
            <button class="action-btn" data-action="goto" data-verse="${key}" aria-label="Buka ayat"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg></button>
            <button class="action-btn active" data-action="remove" data-verse="${key}" aria-label="Hapus penanda"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg></button>
          </div>
        </div>
      `;
    }).join('');
    
    // Attach events
    els.bookmarksList.querySelectorAll('[data-action="goto"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const verseKey = btn.dataset.verse;
        const [surah, ayah] = verseKey.split(':').map(Number);
        const page = state.versePage && state.versePage.get(verseKey);
        if (page) { renderPage(page); showView('mushaf'); }
      });
    });
    els.bookmarksList.querySelectorAll('[data-action="remove"]').forEach(btn => {
      btn.addEventListener('click', () => {
        toggleBookmark(btn.dataset.verse);
      });
    });
  }
  
  function updateBookmarkButtons() {
    document.querySelectorAll('[data-action="bookmark"]').forEach(btn => {
      const key = btn.dataset.verse;
      const marked = isBookmarked(key);
      btn.classList.toggle('active', marked);
      const svg = btn.querySelector('svg');
      if (svg) svg.setAttribute('fill', marked ? 'currentColor' : 'none');
    });
  }
  
  // Helper: Arabic-Indic digits for ayah markers (mushaf style)
  function toArabicDigits(n) {
    const map = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
    return String(n).replace(/\d/g, d => map[+d]);
  }
  
  // ═══════════════════════════════════════════════════════════════
  // Surah Modal
  // ═══════════════════════════════════════════════════════════════
  let surahPlaceFilter = 'all';

  function applySurahFilters() {
    const q = (els.surahSearch.value || '').toLowerCase();
    els.surahList.querySelectorAll('.surah-item').forEach(item => {
      const okPlace = surahPlaceFilter === 'all' || item.dataset.place === surahPlaceFilter;
      const okText = !q || item.textContent.toLowerCase().includes(q);
      item.style.display = okPlace && okText ? '' : 'none';
    });
  }

  async function openSurahModal() {
    const chapters = await DataManager.load('chapters');
    els.surahList.innerHTML = chapters.map(c => `
      <div class="surah-item" data-surah="${c.id}" data-place="${c.revelation_place || ''}" role="option">
        <div class="surah-item-name">${c.name_arabic}</div>
        <div class="surah-item-meta">${c.name_simple} · ${c.verses_count} ayat · hal. ${c.pages?.[0] ?? '—'}</div>
        <div class="surah-item-tags">${c.revelation_place === 'makkah' ? 'Makkiyah' : 'Madaniyah'}${c.revelation_order ? ` · turun ke-${c.revelation_order}` : ''}</div>
      </div>
    `).join('');
    
    els.surahList.querySelectorAll('.surah-item').forEach(item => {
      item.addEventListener('click', () => {
        const surah = parseInt(item.dataset.surah);
        goToSurah(surah);
        els.surahModal.close();
      });
    });
    
    els.surahModal.showModal();
  }
  
  function goToSurah(surah) {
    state.currentSurah = surah;
    const page = state.versePage && state.versePage.get(`${surah}:1`);
    if (page) renderPage(page);
    showView('mushaf');
  }
  
  // ═══════════════════════════════════════════════════════════════
  // Page Modal
  // ═══════════════════════════════════════════════════════════════
  function openPageModal() {
    // Quick jump buttons: every 10 pages
    const btns = [];
    const maxPage = pageCount();
    for (let p = 1; p <= maxPage; p += 10) {
      btns.push(`<button class="page-quick-btn" data-page="${p}">${p}</button>`);
    }
    const lastQuick = 1 + Math.floor((maxPage - 1) / 10) * 10;
    if (lastQuick !== maxPage) {
      btns.push(`<button class="page-quick-btn" data-page="${maxPage}">${maxPage}</button>`);
    }
    els.pageQuick.innerHTML = btns.join('');
    els.pageQuick.querySelectorAll('.page-quick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        renderPage(parseInt(btn.dataset.page));
        els.pageModal.close();
      });
    });
    els.pageModal.showModal();
  }
  
  // ═══════════════════════════════════════════════════════════════
  // Event Listeners
  // ═══════════════════════════════════════════════════════════════
  function bindEvents() {
    // Drawer
    els.btnMenu.addEventListener('click', openDrawer);
    els.btnCloseDrawer.addEventListener('click', closeDrawer);
    els.drawerOverlay.addEventListener('click', closeDrawer);
    els.drawerItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        showView(item.dataset.view);
      });
    });
    
    // Header nav
    els.surahNav.addEventListener('click', openSurahModal);
    els.pageNav.addEventListener('click', openPageModal);
    els.btnSettings.addEventListener('click', () => showView('settings'));
    if (els.btnFullscreen) els.btnFullscreen.addEventListener('click', toggleFullscreen);
    if (els.btnHomeTop) els.btnHomeTop.addEventListener('click', () => showView('home'));
    if (els.btnQuickMushaf) els.btnQuickMushaf.addEventListener('click', () => showView('mushaf'));
    if (els.btnToolbarHome) els.btnToolbarHome.addEventListener('click', () => showView('home'));
    if (els.navBackMushaf) els.navBackMushaf.addEventListener('click', () => showView('mushaf'));
    if (els.navHome) els.navHome.addEventListener('click', () => showView('home'));
    if (els.navPrevView) {
      els.navPrevView.addEventListener('click', () => {
        const target = els.navPrevView.dataset.target || 'mushaf';
        showView(target === state.currentView ? 'mushaf' : target);
      });
    }
    if (els.btnCenter) els.btnCenter.addEventListener('click', scrollToPlaying);
    els.homeCards.forEach(card => card.addEventListener('click', () => showView(card.dataset.go)));
    document.addEventListener('fullscreenchange', () => {
      document.body.classList.toggle('is-fullscreen', !!document.fullscreenElement);
    });
    els.btnBookmark.addEventListener('click', () => showView('bookmarks'));
    
    // Mushaf toolbar
    els.btnPrevPage.addEventListener('click', () => renderPage(state.currentPage - (state._pageStep || 1)));
    els.btnNextPage.addEventListener('click', () => renderPage(state.currentPage + (state._pageStep || 1)));
    els.mushafSelect.addEventListener('change', (e) => setMushaf(e.target.value));
    els.mushafSelectSetting.addEventListener('change', (e) => setMushaf(e.target.value));
    if (els.pageFontScale) {
      els.pageFontScale.addEventListener('input', (e) => {
        state.pageFontScale = Number(e.target.value) || 100;
        if (els.pageFontScaleVal) els.pageFontScaleVal.textContent = `${state.pageFontScale}%`;
        for (const sheet of els.mushafContainer.querySelectorAll('.scan-sheet')) applyPageScale(sheet);
      });
      els.pageFontScale.addEventListener('change', () => saveSettings());
    }
    if (els.indopakFontSelect) {
      els.indopakFontSelect.addEventListener('change', (e) => {
        state.indopakFont = e.target.value;
        saveSettings();
        renderPage(state.currentPage);
      });
    }
    if (els.pageBorderSelect) {
      els.pageBorderSelect.addEventListener('change', (e) => {
        state.pageBorder = e.target.value;
        saveSettings();
        renderPage(state.currentPage);
      });
    }
    if (els.spreadSelect) {
      els.spreadSelect.addEventListener('change', (e) => {
        state.spreadMode = e.target.value;
        saveSettings();
        renderPage(state.currentPage);
      });
    }
    els.modeScan.addEventListener('click', () => { setPageMode('scan'); saveSettings(); });
    els.modeText.addEventListener('click', () => { setPageMode('text'); saveSettings(); });
    els.toggleArabic.addEventListener('click', () => {
      state.showArabic = !state.showArabic;
      els.toggleArabic.classList.toggle('active', state.showArabic);
      els.toggleArabic.setAttribute('aria-pressed', state.showArabic);
      renderPage(state.currentPage);
    });
    els.toggleTranslation.addEventListener('click', () => {
      state.showTranslation = !state.showTranslation;
      els.toggleTranslation.classList.toggle('active', state.showTranslation);
      els.toggleTranslation.setAttribute('aria-pressed', state.showTranslation);
      renderPage(state.currentPage);
    });
    els.toggleTajwid.addEventListener('click', () => {
      state.showTajwid = !state.showTajwid;
      els.toggleTajwid.classList.toggle('active', state.showTajwid);
      els.toggleTajwid.setAttribute('aria-pressed', state.showTajwid);
      saveSettings();

      if (state.showTajwid && state.pageMode === 'scan') {
        showToast(mushafKey() === 'madani'
          ? 'Tajwid berwarna aktif di halaman mushaf'
          : 'Tajwid IndoPak: kata diwarnai menurut hukumnya');
      }
      renderPage(state.currentPage);
    });
    els.toggleTafsir.addEventListener('click', () => {
      state.showTafsir = !state.showTafsir;
      els.toggleTafsir.classList.toggle('active', state.showTafsir);
      els.toggleTafsir.setAttribute('aria-pressed', state.showTafsir);
      renderPage(state.currentPage);
    });
    
    // Audio
    els.audioPlay.addEventListener('click', () => {
      if (state.audioCurrent) resumeAudio();
    });
    els.audioPause.addEventListener('click', pauseAudio);
    els.audioPrev.addEventListener('click', prevAyah);
    els.audioNext.addEventListener('click', nextAyah);
    els.progressBar.addEventListener('click', (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      seekAudio(pct);
    });
    els.volumeSlider.addEventListener('input', (e) => {
      if (audioEl) audioEl.volume = parseFloat(e.target.value);
    });
    els.audioMute.addEventListener('click', () => {
      if (audioEl) {
        audioEl.muted = !audioEl.muted;
        els.audioMute.querySelector('svg').innerHTML = audioEl.muted 
          ? '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>'
          : '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>';
      }
    });
    
    // Search
    els.searchInput.addEventListener('input', (e) => {
      clearTimeout(searchDebounce);
      els.btnClearSearch.hidden = !e.target.value;
      searchDebounce = setTimeout(() => performSearch(e.target.value), 300);
    });
    els.btnClearSearch.addEventListener('click', () => {
      els.searchInput.value = '';
      els.btnClearSearch.hidden = true;
      performSearch('');
    });
    
    // Settings
    els.fontSizeArabic.addEventListener('input', (e) => {
      state.fontSizeArabic = parseInt(e.target.value);
      els.fontSizeArabicVal.textContent = `${state.fontSizeArabic}px`;
      document.documentElement.style.setProperty('--font-size-arabic', `${state.fontSizeArabic}px`);
      saveSettings();
    });
    els.fontSizeTrans.addEventListener('input', (e) => {
      state.fontSizeTrans = parseInt(e.target.value);
      els.fontSizeTransVal.textContent = `${state.fontSizeTrans}px`;
      document.documentElement.style.setProperty('--font-size-trans', `${state.fontSizeTrans}px`);
      saveSettings();
    });
    els.themeSelect.addEventListener('change', (e) => {
      setTheme(e.target.value);
      saveSettings();
    });
    els.pageModeSelect.addEventListener('change', (e) => {
      setPageMode(e.target.value);
      saveSettings();
    });
    els.showAyahNumbers.addEventListener('change', (e) => {
      state.showAyahNumbers = e.target.checked;
      saveSettings();
    });
    els.qariSelect.addEventListener('change', (e) => {
      state.qari = e.target.value;
      saveSettings();
      // Qari berganti: buang timing & audio lama, muat ulang
      state.qul = null;
      state.qulKey = null;
      state.playerSurah = null;
      state.surahKeys = [];
      if (state.audioCurrent) playAyah(state.audioCurrent.verseKey);
    });
    els.autoPlayNext.addEventListener('change', (e) => {
      state.autoPlayNext = e.target.checked;
      saveSettings();
    });
    els.repeatAyah.addEventListener('change', (e) => {
      state.repeatAyah = e.target.checked;
      saveSettings();
    });
    els.offlinePages.addEventListener('change', (e) => {
      state.offlinePages = e.target.checked;
      saveSettings();
    });
    if (els.btnReloadApp) els.btnReloadApp.addEventListener('click', forceUpdate);
    els.btnClearCache.addEventListener('click', async () => {
      if (confirm('Bersihkan semua cache? Halaman offline akan dihapus.')) {
        await caches.delete('alkalam-pages');
        await caches.delete('alkalam-data');
        DataManager.clearCache();
        showToast('Cache dibersihkan', 'success');
      }
    });
    
    // Modals
    els.btnCloseSurahModal.addEventListener('click', () => els.surahModal.close());
    els.btnClosePageModal.addEventListener('click', () => els.pageModal.close());
    els.surahSearch.addEventListener('input', applySurahFilters);
    if (els.surahPlaceFilter) {
      els.surahPlaceFilter.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
          els.surahPlaceFilter.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          surahPlaceFilter = chip.dataset.place;
          applySurahFilters();
        });
      });
    }
    els.pageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const page = parseInt(els.pageInput.value);
        if (page >= 1 && page <= pageCount()) {
          renderPage(page);
          els.pageModal.close();
        }
      }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      switch (e.key) {
        case 'ArrowLeft': renderPage(state.currentPage + 1); break; // RTL: left = next
        case 'ArrowRight': renderPage(state.currentPage - 1); break;
        case ' ': e.preventDefault(); if (state.audioPlaying) pauseAudio(); else if (state.audioCurrent) resumeAudio(); break;
        case 'ArrowUp': if (audioEl) audioEl.volume = Math.min(1, audioEl.volume + 0.1); els.volumeSlider.value = audioEl.volume; break;
        case 'ArrowDown': if (audioEl) audioEl.volume = Math.max(0, audioEl.volume - 0.1); els.volumeSlider.value = audioEl.volume; break;
        case 'Escape': closeDrawer(); els.surahModal.close(); els.pageModal.close(); break;
        case 's': if (!e.ctrlKey && !e.metaKey) { e.preventDefault(); els.searchInput.focus(); } break;
      }
    });
    
    // PWA install prompt
    let deferredPrompt;
    // tooltip hukum tajwid di halaman (hover & sentuh)
    const tajTarget = (e) => (e.target && e.target.closest ? e.target.closest('.tj[data-rule], .mw[data-rules]') : null);
    const tajRuleOf = (el) => el.dataset.rule
      || (el.dataset.rules || '').split(/\s+/).filter(Boolean).join('|');
    document.addEventListener('mouseover', (e) => {
      const t = tajTarget(e);
      if (t) showTajTip(tajRuleOf(t), e.clientX, e.clientY);
    });
    document.addEventListener('mousemove', (e) => {
      const t = tajTarget(e);
      if (t) showTajTip(tajRuleOf(t), e.clientX, e.clientY);
    });
    document.addEventListener('mouseout', (e) => {
      if (tajTarget(e)) hideTajTip();
    });
    document.addEventListener('pointerdown', (e) => {
      const t = tajTarget(e);
      if (t) {
        showTajTip(tajRuleOf(t), e.clientX, e.clientY);
        clearTimeout(showTajTip._t);
        showTajTip._t = setTimeout(hideTajTip, 3000);
      }
    });

    // jendela berubah ukuran (atau ponsel diputar): hitung ulang skala halaman
    let resizeTimer = null;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        // lebar melewati ambang dua-halaman → render ulang
        if (state.pageMode === 'scan' && spreadWanted() !== !!state._spreadRendered) {
          renderPage(state.currentPage);
          return;
        }
        for (const sheet of els.mushafContainer.querySelectorAll('.scan-sheet')) applyPageScale(sheet);
      }, 150);
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      // Could show custom install button
    });
  }
  
  // ═══════════════════════════════════════════════════════════════
  // Service Worker Registration
  // ═══════════════════════════════════════════════════════════════
  async function registerSW() {
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.register('./sw.js');
        reg.update().catch(() => {});
        console.log('SW registered:', reg.scope);
      } catch (err) {
        console.warn('SW registration failed:', err);
      }
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // Init
  // ═══════════════════════════════════════════════════════════════
  async function init() {
    initRefs();
    showBuildTag();
    watchSwUpdate();
    loadSettings();
    loadBookmarks();
    bindEvents();
    await registerSW();

    // Deep-link support: ?page=12&tajwid=1&tafsir=1
    const params = new URLSearchParams(location.search);
    if (params.get('tajwid') === '1') {
      state.showTajwid = true;
      els.toggleTajwid.classList.add('active');
      els.toggleTajwid.setAttribute('aria-pressed', 'true');
    }
    if (params.get('tafsir') === '1') {
      state.showTafsir = true;
      els.toggleTafsir.classList.add('active');
      els.toggleTafsir.setAttribute('aria-pressed', 'true');
    }
    // Tajwid selalu butuh mode teks
    if (state.showTajwid) setPageMode('text', false);
    if (params.get('translation') === '0') {
      state.showTranslation = false;
      els.toggleTranslation.classList.remove('active');
      els.toggleTranslation.setAttribute('aria-pressed', 'false');
    }
    const maxStart = pageCount();
    // Halaman awal: ?page=… → terakhir dibaca → halaman 1
    let initialPage = parseInt(params.get('page') || '', 10);
    if (!Number.isFinite(initialPage)) {
      try {
        const last = JSON.parse(localStorage.getItem('alkalam_last') || 'null');
        if (last && last.page) initialPage = last.page;
      } catch { /* abaikan */ }
    }
    const startPage = Math.min(maxStart, Math.max(1, initialPage || 1));
    if (params.get('offline') === '1' && window.ALKALAM_CONFIG) {
      const cfg = window.ALKALAM_CONFIG;
      cfg.offline = true;
      cfg.fontsLocal = cfg.fontsLocal || './data/fonts/';
      Object.values(cfg.mushafs || {}).forEach(m => { m.fontsLocal = m.fontsLocal || './data/fonts/'; });
    }

    // Load required data first
    try {
      await DataManager.loadAll(true);
      state.mushaf = state.mushaf === 'indopak' ? 'indopak' : 'madani';
      state.chapters = await DataManager.load('chapters');
      await rebuildVersePage();
    } catch (err) {
      console.error('Initial load failed:', err);
      showToast('Gagal memuat data utama', 'error');
    }

    // Simpan posisi terakhir SEBELUM render pertama menimpanya
    try { state.lastRead = JSON.parse(localStorage.getItem('alkalam_last') || 'null'); } catch { state.lastRead = null; }

    // Render first page
    await renderPage(startPage);
    // Langsung ke mushaf: ukuran layar menentukan 1 atau 2 halaman (spreadWanted)
    const wantHome = params.get('home') === '1';
    showView(wantHome ? 'home' : 'mushaf');

    // Listen for theme change
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (state.theme === 'auto') setTheme('auto');
    });
  }
  
  // Start when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // Expose for debugging
  window.AlKalam = {
    state,
    DataManager,
    playAyah,
    stopAudio,
    audio: () => audioEl,
    goPage: (p) => renderPage(p),
  };
})();