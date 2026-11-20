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
    mushaf: 'madani',      // 'madani' (QCF 604 hal.) atau 'indopak' (610 hal.)
    showArabic: true,
    showTranslation: true,
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
  const BUILD = '2026-11-22-stage-fit';

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

  function tajwidLegendHtml() {
    return TAJWID_GROUPS.map(([g, label]) =>
      `<span class="tajwid-legend-item"><span class="tajwid-legend-dot ${g}"></span>${label}</span>`
    ).join('');
  }

  const wordRuleCache = new Map();

  /** Aturan tajwid dominan per kata sebuah ayat: hasil = array grup (indeks 1 = kata 1). */
  async function wordRuleGroups(verseKey) {
    if (wordRuleCache.has(verseKey)) return wordRuleCache.get(verseKey);
    const all = await DataManager.load('tajwid');
    const html = (all && all[verseKey]) || '';
    if (!html) { wordRuleCache.set(verseKey, []); return []; }
    // buang penanda nomor ayat, lalu pecah per kata
    const clean = html.replace(/<span class=end>.*?<\/span>/g, '');
    const words = clean.trim().split(/\s+/);
    const out = [];
    for (const w of words) {
      const rule = (w.match(/class=\s*"?([a-z_]+)/i) || [, ''])[1];
      out.push(RULE_TO_GROUP[rule] || null);
    }
    wordRuleCache.set(verseKey, out);
    return out;
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
      // IndoPak: satu font untuk semua halaman
      const fam = mc.fontFamily || 'indopak-nastaleeq';
      if (loadedFonts.has(fam)) return fam;
      const urls = [DataManager.getPageFontUrl(page, mushafKey()), mc.fontUrl].filter(Boolean);
      for (const u of [...new Set(urls)]) {
        try { await tryLoad(fam, u); loadedFonts.add(fam); return fam; } catch (e) { /* coba berikutnya */ }
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

  async function renderScanPage(page, pageData, surahInfo, lastSurahInfo, chapters) {
    const layout = await DataManager.getLayout(mushafKey());
    const versesData = await DataManager.load('verses');
    const tajweedPage = !!state.showTajwid && mushafKey() === 'madani';
    const fontFamily = await ensureMushafFont(page, tajweedPage);

    // IndoPak tidak punya font berwarna → warnai per kata dengan data tajwid
    const wordTintOn = !!state.showTajwid && mushafKey() === 'indopak';
    const ruleByVerse = new Map();
    if (wordTintOn) {
      for (const v of pageData.verses) {
        const vk = `${v.surah}:${v.ayah}`;
        if (!ruleByVerse.has(vk)) ruleByVerse.set(vk, await wordRuleGroups(vk));
      }
    }
    prefetchPageFonts(page);

    const verses = pageData.verses
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

    // ── baris halaman ──
    const rows = buildRows(layout, page, chapters);
    const filledLines = rows ? rows.filter(r => r.kind === 'words').length : 0;
    const sparsePage = false;                   // semua baris rata penuh (standar mushaf)
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
          const centered = sparsePage ? ' mline-center' : '';
          htm += `<div class="mline${short}${centered}">`;
          for (const [vk, pos, glyph, isEnd] of row.words) {
            if (mushafKey() === 'indopak') {
              // IndoPak: buang glyph PUA (waqf/penanda QCF) yang tak ada di font nastaleeq
              const clean = String(glyph).replace(/[\uE000-\uF8FF]/g, '').trim();
              if (isEnd) {
                const ayahNo = vk.split(':')[1];
                htm += `<span class="mw mw-end-badge" data-v="${vk}" data-w="${pos}">${toArabicDigits(Number(ayahNo))}</span>`;
              } else if (clean) {
                let tint = '';
                if (wordTintOn) {
                  const rules = ruleByVerse.get(vk) || [];
                  const g = rules[pos - 1];
                  if (g) tint = ` taj-${g}`;
                }
                htm += `<span class="mw${tint}" data-v="${vk}" data-w="${pos}">${clean}</span> `;
              }
            } else {
              htm += `<span class="mw${isEnd ? ' mw-end' : ''}" data-v="${vk}" data-w="${pos}">${glyph}</span> `;
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
    let html = `<div class="scan-page" data-page="${page}">`;
    html += `<div class="scan-sheet-box"><div class="scan-sheet${mushafClass}">`;
    html += `<div class="page-frame" aria-hidden="true">` +
            `<span class="page-corner tl"></span><span class="page-corner tr"></span>` +
            `<span class="page-corner bl"></span><span class="page-corner br"></span>` +
            `</div>`;
    html += `<div class="mushaf-page-lines"${style}>${htm}</div></div></div>`;

    // legenda warna tajwid (tampil saat tajwid aktif)
    if (state.showTajwid) {
      html += `<div class="tajwid-legend" aria-label="Legenda warna tajwid">${tajwidLegendHtml()}</div>`;
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

    // terjemahan / tafsir
    if (state.showTranslation || state.showTafsir) {
      html += `<div class="scan-texts">`;
      let currentSurah = null;
      for (const { meta } of verses) {
        const verseKey = `${meta.surah}:${meta.ayah}`;
        const tr = await DataManager.getTranslation(verseKey, 'indo') ||
                   await DataManager.getTranslation(verseKey, 'eng');
        const taf = state.showTafsir ? await DataManager.getTafsir(verseKey, 'short') : '';
        const marked = isBookmarked(verseKey);
        if (meta.surah !== currentSurah) {
          currentSurah = meta.surah;
          const info = chapters.find(c => c.id === meta.surah);
          html += `<div class="scan-surah-sep"><span dir="rtl">${info?.name_arabic || ''}</span> ${info?.name_simple || ''}</div>`;
        }
        html += `<div class="scan-text-row" data-verse="${verseKey}">`;
        html += `<button class="scan-num" data-play="${verseKey}" aria-label="Putar ayat ${meta.ayah}">${toArabicDigits(meta.ayah)}</button>`;
        html += `<div class="scan-text-body">`;
        if (state.showTranslation && tr) html += `<div class="scan-tr">${tr}</div>`;
        if (state.showTafsir && taf) html += `<div class="scan-taf"><span>Tafsir:</span> ${taf}` +
          ` <button class="link-btn" data-long-tafsir="${verseKey}">lengkap</button></div>`;
        html += `</div>`;
        html += `<button class="action-btn" data-action="copy" data-verse="${verseKey}" aria-label="Salin ayat" title="Salin ayat">` +
                `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg></button>` +
                `<button class="action-btn ${marked ? 'active' : ''}" data-action="bookmark" data-verse="${verseKey}" aria-label="Penanda">` +
                `<svg width="16" height="16" viewBox="0 0 24 24" fill="${marked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg></button>`;
        html += `</div>`;
      }
      html += `</div>`;
    }
    html += `</div>`;
    els.mushafContainer.innerHTML = html;

    const sheet = els.mushafContainer.querySelector('.scan-sheet');
    if (sheet) {
      // ukuran tetap seperti QUL: Madani 19,1em, IndoPak 15,89em (+0,75em padding)
      applyPageScale(sheet);
      // font halaman dimuat asinkron: ukur ulang setelah siap
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => applyPageScale(sheet)).catch(() => {});
      }
      new ResizeObserver(() => applyPageScale(sheet)).observe(sheet);
    }

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
  function applyPageScale(sheet) {
    if (!sheet || !sheet.isConnected) return;
    const stage = sheet.parentElement;
    const DESIGN_W = 720;
    const pageEm = mushafKey() === 'indopak' ? 17.69 : 20.6;
    sheet.style.setProperty('--design-w', `${DESIGN_W}px`);
    sheet.style.setProperty('--msize', `${DESIGN_W / pageEm}px`);
    const pageLines = sheet.querySelector('.mushaf-page-lines');
    const sheetRect0 = sheet.getBoundingClientRect();
    for (let i = 0; i < 4; i++) {
      const avail = pageLines.clientWidth || 1;
      let worst = 0;
      for (const el of sheet.querySelectorAll('.mline')) {
        worst = Math.max(worst, el.scrollWidth - el.clientWidth);
      }
      for (const el of sheet.querySelectorAll('.msurah-band, .msurah-name, .msurah-meta, .mw, .mbasmalah')) {
        const r = el.getBoundingClientRect();
        if (!r.width) continue;
        worst = Math.max(worst, Math.ceil(r.right - sheetRect0.right) + 2, Math.ceil(sheetRect0.left - r.left) + 2);
      }
      if (worst <= 1) break;
      const fs = parseFloat(getComputedStyle(sheet).getPropertyValue('--msize')) || 26;
      sheet.style.setProperty('--msize', `${Math.max(10, fs * (avail / (avail + worst)) * 0.994)}px`);
    }

    // skala utuh: halaman selebar layar (maks 720px), tinggi box ikut menyesuaikan
    const scale = Math.min(1, (stage ? stage.clientWidth : DESIGN_W) / DESIGN_W) || 1;
    sheet.style.setProperty('--page-scale', String(scale));
    if (stage) stage.style.height = `${Math.round(sheet.offsetHeight * scale)}px`;
  }

  async function renderPage(page) {
    const maxPage = pageCount();
    if (page < 1 || page > maxPage) return;
    state.currentPage = page;
    els.pageIndicator.textContent = `${page} / ${maxPage}`;
    els.pageLabel.textContent = `Halaman ${page}`;
    els.btnPrevPage.disabled = page === 1;
    els.btnNextPage.disabled = page === maxPage;

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
        await renderScanPage(page, pageData, surahInfo, lastSurahInfo, chapters);
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
        html += `<div class="tajwid-legend" aria-label="Legenda warna tajwid">${tajwidLegendHtml()}</div>`;
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
    els.btnPrevPage.addEventListener('click', () => renderPage(state.currentPage - 1));
    els.btnNextPage.addEventListener('click', () => renderPage(state.currentPage + 1));
    els.mushafSelect.addEventListener('change', (e) => setMushaf(e.target.value));
    els.mushafSelectSetting.addEventListener('change', (e) => setMushaf(e.target.value));
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
    // jendela berubah ukuran (atau ponsel diputar): hitung ulang skala halaman
    let resizeTimer = null;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const sheet = els.mushafContainer.querySelector('.scan-sheet');
        if (sheet) applyPageScale(sheet);
      }, 120);
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
    const startPage = Math.min(maxStart, Math.max(1, parseInt(params.get('page') || '1', 10) || 1));
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
    const hasDeepLink = params.has('page');
    showView(hasDeepLink ? 'mushaf' : 'home');

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