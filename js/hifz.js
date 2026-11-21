/* ==========================================================================
   Al-Kalam — modul Hafalan & Murajaah
   - penyimpanan lokal (localStorage) tanpa server
   - target harian, streak, status halaman, spaced repetition (SM-2 ringkas)
   - dashboard "Hari ini", Progres (grid juz + heatmap + kelemahan), ekspor/impor
   ========================================================================== */
(function () {
  'use strict';

  const KEY = 'alkalam_hifz_v1';
  const DAY = 86400000;

  // ── util ────────────────────────────────────────────────────────────────
  const todayKey = (d = new Date()) => {
    const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return z.toISOString().slice(0, 10);
  };
  const dayDiff = (a, b) => Math.round((new Date(b) - new Date(a)) / DAY);
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ── state ───────────────────────────────────────────────────────────────
  const emptyState = () => ({
    v: 1,
    settings: {
      pageTarget: 1,          // halaman baru per hari
      hideMode: 'off',        // off | kata | ayat
      repeatCount: 3,         // A-B repeat
      repeatPause: 1500,      // jeda antar ulangan (ms)
      audioRate: 1,
      recorder: false,
      tilawa: false,
    },
    days: {},                 // 'YYYY-MM-DD' -> { pages:[], ayahs:n, reviewed:n, flags:n }
    pages: {},                // '42' -> { status:'lancar'|'sedang'|'lemah', perfect:n, mistakes:n, last:ts }
    srs: {},                  // '2:255' -> { due:ts, ivl:1, ease:2.5, reps:0, lapses:0 }
    flagged: {},              // '2:255' -> [posisi kata…]
    log: [],                  // riwayat singkat (maks 500)
  });

  let S = emptyState();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d && typeof d === 'object') S = Object.assign(emptyState(), d,
          { settings: Object.assign(emptyState().settings, d.settings || {}) });
      }
    } catch { /* rusak: pakai bawaan */ }
    return S;
  }
  let saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* penuh */ }
    }, 200);
  }

  function dayRec(dateKey = todayKey()) {
    if (!S.days[dateKey]) S.days[dateKey] = { pages: [], ayahs: 0, reviewed: 0, flags: 0 };
    return S.days[dateKey];
  }

  // ── API publik untuk modul lain ─────────────────────────────────────────
  function markPageDone(page, ayahCount = 0) {
    const d = dayRec();
    if (!d.pages.includes(page)) d.pages.push(page);
    d.ayahs += ayahCount;
    S.pages[page] = Object.assign({ status: 'sedang', perfect: 0, mistakes: 0 }, S.pages[page], { last: Date.now() });
    log('hafal', `halaman ${page}`);
    save();
    return d.pages.length;
  }
  function markPageStatus(page, status, mistakes = 0) {
    const p = S.pages[page] || { perfect: 0, mistakes: 0 };
    S.pages[page] = { status, perfect: status === 'lancar' ? (p.perfect || 0) + 1 : (p.perfect || 0),
      mistakes, last: Date.now() };
    if (mistakes) S.days[todayKey()] && (S.days[todayKey()].flags = (S.days[todayKey()].flags || 0) + mistakes);
    save();
  }
  function flagWord(verseKey, pos) {
    const arr = S.flagged[verseKey] || [];
    if (!arr.includes(pos)) arr.push(pos);
    S.flagged[verseKey] = arr;
    dayRec().flags = (dayRec().flags || 0) + 1;
    save();
  }
  function unflagWord(verseKey, pos) {
    const arr = (S.flagged[verseKey] || []).filter((p) => p !== pos);
    if (arr.length) S.flagged[verseKey] = arr; else delete S.flagged[verseKey];
    save();
  }
  function isFlagged(verseKey, pos) {
    return (S.flagged[verseKey] || []).includes(pos);
  }

  // SM-2 ringkas: rating 0 lupa, 1 berat, 2 lancar
  function srsRate(verseKey, rating) {
    const c = S.srs[verseKey] || { due: Date.now(), ivl: 1, ease: 2.5, reps: 0, lapses: 0 };
    if (rating === 0) { c.lapses += 1; c.reps = 0; c.ivl = 1; c.ease = Math.max(1.3, c.ease - 0.2); }
    else {
      c.reps += 1;
      if (rating === 1) c.ease = Math.max(1.3, c.ease - 0.15);
      if (rating === 2) c.ease = Math.min(3.0, c.ease + 0.05);
      c.ivl = c.reps === 1 ? 1 : c.reps === 2 ? 3 : Math.round(Math.max(1, c.ivl) * c.ease);
    }
    c.due = Date.now() + c.ivl * DAY;
    S.srs[verseKey] = c;
    save();
    return c;
  }
  function dueVerses(limit = 20) {
    const now = Date.now();
    return Object.entries(S.srs)
      .filter(([, c]) => c.due <= now)
      .sort((a, b) => a[1].due - b[1].due)
      .slice(0, limit);
  }

  function log(kind, text) {
    S.log.unshift({ t: Date.now(), kind, text });
    if (S.log.length > 500) S.log.length = 500;
  }

  function streak() {
    const keys = Object.keys(S.days).filter((k) => (S.days[k].pages || []).length || S.days[k].ayahs || S.days[k].reviewed);
    if (!keys.length) return { current: 0, best: 0 };
    keys.sort();
    let best = 1, cur = 1;
    for (let i = 1; i < keys.length; i++) {
      const gap = dayDiff(keys[i - 1], keys[i]);
      if (gap === 1) cur += 1; else cur = 1;
      best = Math.max(best, cur);
    }
    // streak berjalan hanya jika hari ini atau kemarin ada aktivitas
    const t = todayKey();
    const last = keys[keys.length - 1];
    const gapToday = dayDiff(last, t);
    return { current: gapToday <= 1 ? cur : 0, best };
  }

  // ── data bantu dari aplikasi ────────────────────────────────────────────
  async function pageMapIndex() {
    const dm = window.AlKalam && window.AlKalam.DataManager;
    const pm = await dm.load('pageMap');
    return (pm && pm.pages) || [];
  }
  async function juzPages() {
    const pages = await pageMapIndex();
    const out = {};
    for (const p of pages) {
      for (const v of p.verses || []) {
        const j = v.juz;
        if (!j) continue;
        out[j] = out[j] || new Set();
        out[j].add(p.page);
      }
    }
    const res = {};
    for (const j of Object.keys(out)) res[j] = [...out[j]];
    return res;
  }

  // ── UI ──────────────────────────────────────────────────────────────────
  const el = (id) => document.getElementById(id);
  let tab = 'today';

  function pageStatusClass(st) {
    return st === 'lancar' ? 'ok' : st === 'lemah' ? 'bad' : st === 'sedang' ? 'mid' : 'none';
  }

  async function render() {
    const view = el('viewHifz');
    if (!view) return;
    const body = el('hifzBody');
    if (!body) return;
    if (tab === 'today') body.innerHTML = await renderToday();
    else if (tab === 'progress') body.innerHTML = await renderProgress();
    else if (tab === 'quiz') body.innerHTML = renderQuizHome();
    else body.innerHTML = renderSettings();
    bind();
  }

  async function renderToday() {
    const st = streak();
    const d = dayRec();
    const due = dueVerses(30);
    const target = Math.max(1, Number(S.settings.pageTarget) || 1);
    const doneToday = (d.pages || []).length;
    const pct = clamp(Math.round((doneToday / target) * 100), 0, 100);

    const dueHtml = due.length
      ? due.slice(0, 8).map(([vk, c]) => `<button class="hifz-due" data-open="${vk}">${vk}<span>ulang · ${Math.round(c.ivl)} hari</span></button>`).join('')
      : `<p class="hifz-muted">Belum ada antrean ulangan. Tandai halaman setelah murajaah agar masuk antrean.</p>`;

    const flaggedCount = Object.values(S.flagged).reduce((a, b) => a + b.length, 0);

    return `
      <div class="hifz-cards">
        <div class="hifz-card">
          <span class="hifz-k">Target hari ini</span>
          <strong class="hifz-v">${doneToday} / ${target} halaman</strong>
          <div class="hifz-bar"><i style="width:${pct}%"></i></div>
          <button class="btn btn-sm btn-primary" data-hifz="start">Mulai hafalan</button>
        </div>
        <div class="hifz-card">
          <span class="hifz-k">Streak</span>
          <strong class="hifz-v">${st.current} hari</strong>
          <span class="hifz-muted">terbaik ${st.best} hari</span>
        </div>
        <div class="hifz-card">
          <span class="hifz-k">Antrean ulangan</span>
          <strong class="hifz-v">${due.length} ayat</strong>
          <span class="hifz-muted">${Object.keys(S.srs).length} ayat terjadwal</span>
        </div>
        <div class="hifz-card">
          <span class="hifz-k">Kata ditandai</span>
          <strong class="hifz-v">${flaggedCount}</strong>
          <span class="hifz-muted">dari mode tandai salah</span>
        </div>
      </div>

      <h3 class="hifz-h">Ulangan hari ini</h3>
      <div class="hifz-list">${dueHtml}</div>

      <h3 class="hifz-h">Latihan lain</h3>
      <div class="hifz-list">
        <button class="hifz-due" data-hifz="listen">Dengar juz ini<span>putar berurutan sampai akhir juz</span></button>
        <button class="hifz-due" data-hifz="record">Rekam bacaan<span>rekam & putar ulang suara sendiri</span></button>
      </div>

      <h3 class="hifz-h">Aktivitas 7 hari</h3>
      ${renderWeekBars()}
    `;
  }

  function renderWeekBars() {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const dt = new Date(Date.now() - i * DAY);
      const k = todayKey(dt);
      const rec = S.days[k] || {};
      days.push({ k, n: (rec.pages || []).length, a: rec.ayahs || 0 });
    }
    const max = Math.max(1, ...days.map((d) => d.n));
    return `<div class="hifz-week">${days.map((d) => `
      <div class="hifz-weekcol" title="${d.k}: ${d.n} halaman">
        <i style="height:${Math.round((d.n / max) * 100)}%"></i>
        <span>${d.k.slice(8)}</span>
      </div>`).join('')}</div>`;
  }

  async function renderProgress() {
    const jp = await juzPages();
    const cells = [];
    for (let j = 1; j <= 30; j++) {
      const pages = jp[j] || [];
      let done = 0;
      for (const p of pages) if (S.pages[p] && S.pages[p].status !== 'lemah') done++;
      const ratio = pages.length ? done / pages.length : 0;
      cells.push(`<button class="hifz-juz ${ratio >= 1 ? 'full' : ratio > 0 ? 'part' : ''}" data-juz="${j}" title="Juz ${j} · ${done}/${pages.length} halaman">
        ${j}<i style="width:${Math.round(ratio * 100)}%"></i></button>`);
    }

    // heatmap 12 minggu
    const weeks = [];
    const start = new Date(Date.now() - 83 * DAY);
    for (let w = 0; w < 12; w++) {
      const col = [];
      for (let d = 0; d < 7; d++) {
        const dt = new Date(start.getTime() + (w * 7 + d) * DAY);
        const k = todayKey(dt);
        const rec = S.days[k] || {};
        const n = (rec.pages || []).length + (rec.reviewed || 0) * 0.5;
        const lvl = n >= 3 ? 4 : n >= 2 ? 3 : n >= 1 ? 2 : n > 0 ? 1 : 0;
        col.push(`<i class="hm l${lvl}" title="${k} · ${(rec.pages || []).length} halaman"></i>`);
      }
      weeks.push(`<div class="hm-col">${col.join('')}</div>`);
    }

    // halaman terlemah
    const weak = Object.entries(S.pages)
      .filter(([, v]) => v.status === 'lemah' || v.mistakes > 0)
      .sort((a, b) => (b[1].mistakes || 0) - (a[1].mistakes || 0))
      .slice(0, 10);

    return `
      <h3 class="hifz-h">Hafalan per juz</h3>
      <div class="hifz-juzgrid">${cells.join('')}</div>

      <h3 class="hifz-h">Kalender aktivitas (12 minggu)</h3>
      <div class="hifz-heat">${weeks.join('')}</div>

      <h3 class="hifz-h">Halaman perlu diulang</h3>
      ${weak.length ? `<div class="hifz-list">${weak.map(([p, v]) => `
        <button class="hifz-due" data-gopage="${p}">Halaman ${p}<span>${v.status === 'lemah' ? 'lemah' : (v.mistakes || 0) + ' kesalahan'}</span></button>`).join('')}</div>`
        : `<p class="hifz-muted">Belum ada data. Tandai hasil murajaah pada halaman untuk mengisi daftar ini.</p>`}

      <h3 class="hifz-h">Cadangan data</h3>
      <div class="hifz-actions">
        <button class="btn btn-sm" data-hifz="export">Ekspor JSON</button>
        <label class="btn btn-sm" for="hifzImport">Impor JSON</label>
        <input id="hifzImport" type="file" accept="application/json" hidden>
        <button class="btn btn-sm" data-hifz="reset">Hapus semua</button>
      </div>
    `;
  }

  function renderQuizHome() {
    return `
      <h3 class="hifz-h">Pilih jenis latihan</h3>
      <div class="hifz-list">
        <button class="hifz-due" data-quiz="next">Lanjutkan ayat<span>tebak kata berikutnya</span></button>
        <button class="hifz-due" data-quiz="blank">Lengkapi kata<span>satu kata dihilangkan</span></button>
        <button class="hifz-due" data-quiz="match">Cocokkan terjemahan<span>pilih ayat yang sesuai</span></button>
        <button class="hifz-due" data-quiz="similar">Ayat serupa<span>bedakan mutashabihat</span></button>
      </div>
      <p class="hifz-muted">Latihan memakai halaman yang sedang dibuka sebagai cakupan.</p>
    `;
  }

  function renderSettings() {
    const s = S.settings;
    const sel = (id, val, opts) => `<select id="${id}">${opts.map(([v, t]) => `<option value="${v}"${String(v) === String(val) ? ' selected' : ''}>${t}</option>`).join('')}</select>`;
    return `
      <h3 class="hifz-h">Setelan hafalan</h3>
      <label class="setting-row"><span>Target halaman/hari</span>
        <input id="hifzTarget" type="number" min="1" max="20" value="${s.pageTarget}"></label>
      <label class="setting-row"><span>Mode sembunyikan</span>
        ${sel('hifzHide', s.hideMode, [['off', 'Mati'], ['kata', 'Sembunyikan kata'], ['ayat', 'Sembunyikan ayat']])}</label>
      <label class="setting-row"><span>Ulangan A-B (kali)</span>
        <input id="hifzRepeat" type="number" min="1" max="20" value="${s.repeatCount}"></label>
      <label class="setting-row"><span>Jeda antar ulangan (ms)</span>
        <input id="hifzPause" type="number" min="0" max="10000" step="250" value="${s.repeatPause}"></label>
      <label class="setting-row"><span>Kecepatan audio</span>
        ${sel('hifzRate', s.audioRate, [['0.75', '0,75×'], ['0.9', '0,9×'], ['1', '1×'], ['1.25', '1,25×']])}</label>
      <p class="hifz-muted">Mode sembunyikan dan ulangan A-B aktif di tampilan mushaf.</p>

      <h3 class="hifz-h">Periksa bacaan (Tilawa · Beta)</h3>
      <div class="hifz-card">
        <span class="hifz-muted">Pengenal bacaan <b>on-device</b> (model ~68 MB, dimuat sekali). Menandai kata
        salah/terlewat saat Anda membaca. Ini <b>bukan penilaian</b> — anggap sebagai isyarat untuk diperiksa.</span>
        <div class="hifz-actions" style="margin-top:10px">
          <button class="btn btn-sm btn-primary" data-hifz="tilawa">Mulai periksa bacaan</button>
          <button class="btn btn-sm" data-hifz="tilawaStop" hidden>Hentikan</button>
        </div>
        <p class="hifz-muted" id="hifzTilawaStatus"></p>
        <div id="hifzTilawaLog" class="hifz-list"></div>
      </div>
    `;
  }

  // ── events ──────────────────────────────────────────────────────────────
  function bind() {
    const view = el('viewHifz');
    if (!view) return;

    view.querySelectorAll('[data-hifz-tab]').forEach((b) => {
      b.addEventListener('click', () => {
        tab = b.dataset.hifzTab;
        view.querySelectorAll('[data-hifz-tab]').forEach((x) => x.classList.toggle('active', x === b));
        render();
      });
    });

    view.querySelectorAll('[data-open]').forEach((b) => {
      b.addEventListener('click', () => openVerse(b.dataset.open));
    });
    view.querySelectorAll('[data-gopage]').forEach((b) => {
      b.addEventListener('click', () => window.AlKalam.goPage(Number(b.dataset.gopage)));
    });
    view.querySelectorAll('[data-juz]').forEach((b) => {
      b.addEventListener('click', () => startJuz(Number(b.dataset.juz)));
    });

    const start = view.querySelector('[data-hifz="start"]');
    if (start) start.addEventListener('click', () => {
      window.AlKalam.goPage(window.AlKalam.state.currentPage || 1);
      document.querySelector('.drawer-item[data-view="mushaf"]')?.click();
    });

    view.querySelector('[data-hifz="listen"]')?.addEventListener('click', listenJuz);
    view.querySelector('[data-hifz="record"]')?.addEventListener('click', toggleRecording);
    view.querySelector('[data-hifz="tilawa"]')?.addEventListener('click', startTilawa);
    view.querySelector('[data-hifz="tilawaStop"]')?.addEventListener('click', stopTilawa);

    const exp = view.querySelector('[data-hifz="export"]');
    if (exp) exp.addEventListener('click', exportJson);
    const imp = view.querySelector('#hifzImport');
    if (imp) imp.addEventListener('change', (e) => importJson(e.target.files[0]));
    const rst = view.querySelector('[data-hifz="reset"]');
    if (rst) rst.addEventListener('click', () => {
      if (confirm('Hapus seluruh data hafalan? Tindakan ini tidak bisa dibatalkan.')) {
        S = emptyState(); save(); render();
      }
    });

    // setelan
    const bindNum = (id, key, fn) => {
      const input = view.querySelector(`#${id}`);
      if (input) input.addEventListener('change', () => { S.settings[key] = fn(input.value); save(); render(); });
    };
    bindNum('hifzTarget', 'pageTarget', (v) => clamp(Number(v) || 1, 1, 20));
    bindNum('hifzRepeat', 'repeatCount', (v) => clamp(Number(v) || 3, 1, 20));
    bindNum('hifzPause', 'repeatPause', (v) => clamp(Number(v) || 0, 0, 10000));
    const hide = view.querySelector('#hifzHide');
    if (hide) hide.addEventListener('change', () => { S.settings.hideMode = hide.value; save(); window.AlKalamHifz?.applyHideMode?.(); });
    const rate = view.querySelector('#hifzRate');
    if (rate) rate.addEventListener('change', () => {
      S.settings.audioRate = Number(rate.value);
      const a = window.AlKalam.audio(); if (a) a.playbackRate = S.settings.audioRate;
      save();
    });

    // kuis
    view.querySelectorAll('[data-quiz]').forEach((b) => {
      b.addEventListener('click', () => startQuiz(b.dataset.quiz));
    });
  }

  async function startJuz(j) {
    const jp = await juzPages();
    const pages = (jp[j] || []).sort((a, b) => a - b);
    if (pages.length) window.AlKalam.goPage(pages[0]);
  }

  async function openVerse(vk) {
    const [s, a] = String(vk).split(':').map(Number);
    const dm = window.AlKalam.DataManager;
    const pm = await dm.load('pageMap');
    const pages = (pm && pm.pages) || [];
    const hit = pages.find((p) => (p.verses || []).some((v) => v.surah === s && v.ayah === a));
    if (hit) window.AlKalam.goPage(hit.page);
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `alkalam-hafalan-${todayKey()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  function importJson(file) {
    if (!file) return;
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const d = JSON.parse(String(fr.result));
        if (!d || typeof d !== 'object' || !d.settings) throw new Error('format');
        S = Object.assign(emptyState(), d, { settings: Object.assign(emptyState().settings, d.settings) });
        save();
        render();
        alert('Data hafalan berhasil diimpor.');
      } catch { alert('Berkas tidak valid.'); }
    };
    fr.readAsText(file);
  }

  // ── Tilawa (beta): pengenal bacaan on-device ────────────────────────────
  let tilawa = null;
  let tilawaSession = null;
  let tilawaMic = null;

  function tilawaStatus(text) {
    const el2 = document.getElementById('hifzTilawaStatus');
    if (el2) el2.textContent = text || '';
  }
  function tilawaLog(text, kind) {
    const box = document.getElementById('hifzTilawaLog');
    if (!box) return;
    const row = document.createElement('div');
    row.className = 'hifz-due' + (kind === 'bad' ? ' bad' : '');
    row.textContent = text;
    box.prepend(row);
  }

  async function startTilawa() {
    if (tilawaSession) { stopTilawa(); return; }
    tilawaStatus('Memuat mesin… (sekali unduh ~68 MB)');
    try {
      const mod = await import('https://esm.sh/@tilawa/core@next/web');
      tilawa = await mod.createTilawa({
        onProgress: (p) => tilawaStatus(`Mengunduh model… ${Math.round((p.fraction || 0) * 100)}%`),
      });
      const page = window.AlKalam.state.currentPage || 1;
      const pd = await window.AlKalam.resolvePageData(page);
      const vs = (pd && pd.verses) || [];
      if (!vs.length) { tilawaStatus('Ayat halaman belum siap'); return; }
      const from = { surah: vs[0].surah, fromAyah: vs[0].ayah, toAyah: vs[vs.length - 1].ayah };
      tilawaSession = tilawa.startMemorization(from, { confirm: { after: 'next-word' } });
      tilawaSession.subscribe((e) => {
        if (e.type === 'checker' && e.state === 'confirmed') {
          const loc = e.location || {};
          tilawaLog(`${e.errorClass} · ${loc.surah}:${loc.ayah} kata ${loc.word}`, 'bad');
        }
      });
      tilawaMic = await tilawa.listen(tilawaSession);
      document.querySelector('[data-hifz="tilawaStop"]')?.removeAttribute('hidden');
      tilawaStatus(`Mendengarkan halaman ${page}… bacalah dengan tenang.`);
    } catch (err) {
      const msg = String(err && err.message ? err.message : err);
      tilawaStatus('Tidak bisa memulai: ' + msg);
      tilawaSession = null;
    }
  }

  async function stopTilawa() {
    try { await tilawaMic?.stop?.(); } catch { /* abaikan */ }
    try { await tilawaSession?.end?.(); } catch { /* abaikan */ }
    try { tilawa?.dispose?.(); } catch { /* abaikan */ }
    tilawaSession = null; tilawaMic = null; tilawa = null;
    tilawaStatus('Dihentikan.');
    document.querySelector('[data-hifz="tilawaStop"]')?.setAttribute('hidden', '');
  }

  // ── dengar juz berurutan ────────────────────────────────────────────────
  let listening = null;

  async function listenJuz() {
    if (listening) { stopListen(); return; }
    const dm = window.AlKalam.DataManager;
    const page = window.AlKalam.state.currentPage || 1;
    const pm = await dm.load('pageMap');
    const pages = (pm && pm.pages) || [];
    const here = pages.find((p) => p.page === page);
    const juz = here && here.verses && here.verses[0] && here.verses[0].juz;
    if (!juz) { flash('Juz tidak diketahui'); return; }
    const keys = [];
    for (const p of pages) {
      for (const v of p.verses || []) if (v.juz === juz) keys.push(`${v.surah}:${v.ayah}`);
    }
    if (!keys.length) { flash('Tidak ada ayat'); return; }
    listening = { keys, i: 0, juz };
    flash(`Mendengar Juz ${juz}`);
    nextListen();
  }

  function nextListen() {
    if (!listening) return;
    if (listening.i >= listening.keys.length) { stopListen(); flash('Selesai'); return; }
    const vk = listening.keys[listening.i++];
    window.AlKalam.playAyah(vk);
    const a = window.AlKalam.audio();
    if (a) {
      a.playbackRate = S.settings.audioRate || 1;
      const onEnd = () => { a.removeEventListener('ended', onEnd); setTimeout(nextListen, 350); };
      a.addEventListener('ended', onEnd);
    }
  }

  function stopListen() {
    listening = null;
    window.AlKalam.stopAudio?.();
  }

  // ── perekam suara ───────────────────────────────────────────────────────
  let rec = null, recChunks = [], recBlob = null, recUrl = null;

  async function toggleRecording() {
    if (rec && rec.state === 'recording') { rec.stop(); return; }
    if (!navigator.mediaDevices || !window.MediaRecorder) { flash('Perekam tidak didukung'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recChunks = [];
      rec = new MediaRecorder(stream);
      rec.ondataavailable = (e) => { if (e.data.size) recChunks.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        recBlob = new Blob(recChunks, { type: 'audio/webm' });
        if (recUrl) URL.revokeObjectURL(recUrl);
        recUrl = URL.createObjectURL(recBlob);
        flash('Rekaman siap — tekan Sekali lagi untuk mendengar');
        const btn = document.querySelector('[data-hifz="record"]');
        if (btn && btn.querySelector('span')) btn.querySelector('span').textContent = 'putar rekaman · tekan untuk merekam lagi';
        const play = document.getElementById('hifzPlayRec');
        if (play) play.hidden = false;
        render();
      };
      rec.start();
      flash('Merekam… tekan lagi untuk berhenti');
    } catch (e) {
      flash('Mikrofon tidak bisa dibuka: ' + (e && e.name ? e.name : 'error'));
    }
  }

  function playRecording() {
    if (!recUrl) { flash('Belum ada rekaman'); return; }
    const a = new Audio(recUrl);
    a.play();
  }

  // ── kuis hafalan ────────────────────────────────────────────────────────
  const rnd = (n) => Math.floor(Math.random() * n);
  const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);

  async function pageVerseKeys() {
    const page = window.AlKalam.state.currentPage || 1;
    try {
      const pd = await window.AlKalam.resolvePageData(page);
      return { page, keys: ((pd && pd.verses) || []).map((v) => `${v.surah}:${v.ayah}`) };
    } catch { return { page, keys: [] }; }
  }

  async function startQuiz(kind) {
    const dm = window.AlKalam.DataManager;
    const { page, keys } = await pageVerseKeys();
    if (!keys.length) { window.AlKalamHifz.flash('Ayat halaman belum siap'); return; }
    const [verses, words, similar] = await Promise.all([
      dm.load('verses'), dm.load('words'), dm.load('similar').catch(() => null),
    ]);
    const body = el('hifzBody');
    if (!body) return;

    const vkOf = (vk) => {
      const [s2, a2] = vk.split(':').map(Number);
      return (verses[String(s2)] || []).find((v) => v.verse_number === a2) || {};
    };

    let q = null;

    if (kind === 'next' || kind === 'blank') {
      const usable = keys.filter((k) => (words[k] || []).length >= 3);
      if (!usable.length) { body.innerHTML = `<p class="hifz-muted">Halaman ini belum punya data kata.</p>`; return; }
      const vk = usable[rnd(usable.length)];
      const arr = words[vk];
      const idx = kind === 'next' ? arr.length - 1 : 1 + rnd(arr.length - 1);
      const shown = arr.map((w, i) => (i === idx ? '<span class="qz-blank">…</span>' : esc(w.ar))).join(' ');
      const answer = arr[idx].ar;
      const pool = [];
      for (const k2 of usable) for (const w of words[k2]) if (w.ar && w.ar !== answer) pool.push(w.ar);
      const opts = shuffle([answer, ...shuffle(pool).slice(0, 3)]);
      q = {
        prompt: kind === 'next' ? 'Kata berikutnya?' : 'Kata yang hilang?',
        arabic: shown, answer, options: opts,
        verse: vk, surah: vkOf(vk).surah,
      };
    } else if (kind === 'match') {
      const vk = keys[rnd(keys.length)];
      const tr = await dm.getTranslation(vk, S.settings.translationSlug || 'indo')
        || await dm.getTranslation(vk, 'indo') || '';
      const others = shuffle(keys.filter((k) => k !== vk)).slice(0, 3);
      const opts = shuffle([vk, ...others]).map((k) => ({ vk: k, ar: vkOf(k).text_uthmani || '' }));
      q = { prompt: 'Ayat mana yang sesuai terjemahan ini?', text: tr, answer: vk, options: opts.map((o) => o.vk), showArabic: opts, verse: vk };
    } else if (kind === 'similar') {
      const pairs = keys.filter((k) => similar && similar[k]);
      if (!pairs.length) { body.innerHTML = `<p class="hifz-muted">Tidak ada ayat serupa di halaman ini. Coba halaman lain (mis. Ar-Rahman).</p>`; return; }
      const vk = pairs[rnd(pairs.length)];
      const partner = similar[vk][0][0];
      const others = shuffle(Object.keys(similar).filter((k) => k !== vk && k !== partner)).slice(0, 3);
      const opts = shuffle([partner, ...others]).map((k) => ({ vk: k, ar: vkOf(k).text_uthmani || '' }));
      q = {
        prompt: `Manakah ayat yang paling mirip dengan ${vk}?`,
        arabic: vkOf(vk).text_uthmani || '', options: opts.map((o) => o.vk),
        showArabic: opts, answer: partner, verse: vk, arabicBig: true,
      };
    }
    if (!q) return;
    renderQuiz(q);
  }

  function renderQuiz(q) {
    const body = el('hifzBody');
    const optHtml = q.showArabic
      ? q.showArabic.map((o) => `<button class="qz-opt arabic" data-ans="${o.vk}" dir="rtl">${esc(o.ar)}</button>`).join('')
      : q.options.map((o) => `<button class="qz-opt arabic" data-ans="${o}" dir="rtl">${esc(o)}</button>`).join('');
    body.innerHTML = `
      <div class="qz-card">
        <p class="qz-prompt">${esc(q.prompt)}</p>
        ${q.text ? `<p class="qz-tr">${esc(q.text)}</p>` : ''}
        ${q.arabic ? `<p class="qz-ar${q.arabicBig ? ' big' : ''}" dir="rtl">${q.arabic}</p>` : ''}
        <div class="qz-opts">${optHtml}</div>
        <div class="qz-foot">
          <button class="btn btn-sm" data-quiz-back>Kembali</button>
          <span class="qz-result" id="qzResult"></span>
        </div>
      </div>`;

    const res = el('qzResult');
    body.querySelectorAll('[data-ans]').forEach((b) => {
      b.addEventListener('click', () => {
        const ok = b.dataset.ans === q.answer;
        body.querySelectorAll('[data-ans]').forEach((x) => {
          x.disabled = true;
          if (x.dataset.ans === q.answer) x.classList.add('right');
          else if (x === b) x.classList.add('wrong');
        });
        if (res) { res.textContent = ok ? 'Benar ✓' : 'Belum tepat'; res.className = 'qz-result ' + (ok ? 'ok' : 'bad'); }
        srsRate(q.verse, ok ? 2 : 0);
        const d = dayRec();
        d.reviewed = (d.reviewed || 0) + 1;
        log('uji', `${q.verse} ${ok ? 'benar' : 'salah'}`);
        save();
      });
    });
    body.querySelector('[data-quiz-back]')?.addEventListener('click', () => render());
  }

  // ── integrasi tampilan mushaf ───────────────────────────────────────────
  let marking = false;
  let ab = null;            // { list, i, left, timer }

  function mushafRoot() { return document.getElementById('mushafContainer'); }

  function injectToolbar() {
    const bar = document.querySelector('.mushaf-toolbar .toolbar-group');
    if (!bar || document.getElementById('btnHideMode')) return;
    const grow = document.createElement('div');
    grow.className = 'toolbar-group hifz-tools';
    grow.innerHTML = `
      <button class="btn btn-sm toggle-btn" id="btnHideMode" title="Mode hafalan: sembunyikan kata">Sembunyi</button>
      <button class="btn btn-sm toggle-btn" id="btnMark" title="Tandai kata yang sering salah">Tandai</button>
      <button class="btn btn-sm" id="btnPageOK" title="Tandai halaman ini lancar">Lancar</button>
      <button class="btn btn-sm" id="btnPageRepeat" title="Tandai halaman ini perlu diulang">Ulang</button>
      <button class="btn btn-sm" id="btnPageLoop" title="Ulangi audio halaman ini">A-B</button>`;
    bar.parentElement.appendChild(grow);

    grow.querySelector('#btnHideMode').addEventListener('click', () => {
      const on = S.settings.hideMode !== 'off';
      S.settings.hideMode = on ? 'off' : 'kata';
      save();
      syncButtons();
      decorate();
      render();
    });
    grow.querySelector('#btnMark').addEventListener('click', () => {
      marking = !marking;
      syncButtons();
    });
    grow.querySelector('#btnPageOK').addEventListener('click', () => {
      const p = window.AlKalam.state.currentPage || 1;
      markPageStatus(p, 'lancar');
      markPageDone(p, 0);
      flash('Halaman ' + p + ' ditandai lancar');
      render();
    });
    grow.querySelector('#btnPageRepeat').addEventListener('click', () => {
      const p = window.AlKalam.state.currentPage || 1;
      markPageStatus(p, 'lemah', 1);
      flash('Halaman ' + p + ' masuk daftar ulang');
      render();
    });
    grow.querySelector('#btnPageLoop').addEventListener('click', toggleLoop);
  }

  function syncButtons() {
    document.getElementById('btnHideMode')?.classList.toggle('active', S.settings.hideMode !== 'off');
    document.getElementById('btnMark')?.classList.toggle('active', marking);
  }

  function flash(msg) {
    let t = document.getElementById('hifzFlash');
    if (!t) {
      t = document.createElement('div');
      t.id = 'hifzFlash';
      t.className = 'hifz-flash';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(flash._t);
    flash._t = setTimeout(() => t.classList.remove('on'), 2200);
  }

  function decorate() {
    const root = mushafRoot();
    if (!root) return;
    const hide = S.settings.hideMode !== 'off';
    root.querySelectorAll('.mline').forEach((l) => l.classList.toggle('hide-mode', hide));
    root.querySelectorAll('.mw[data-v]').forEach((w) => {
      const flagged = isFlagged(w.dataset.v, Number(w.dataset.w));
      w.classList.toggle('is-flagged', flagged);
      if (!hide) w.classList.remove('revealed');
    });
  }

  // klik pada kata: buka sembunyian / tandai salah
  function onWordClick(e) {
    const root = mushafRoot();
    if (!root || !root.contains(e.target)) return;
    const w = e.target.closest && e.target.closest('.mw[data-v]');
    if (!w) return;
    const hide = S.settings.hideMode !== 'off';
    if (marking) {
      e.preventDefault(); e.stopPropagation();
      const vk = w.dataset.v; const pos = Number(w.dataset.w);
      if (isFlagged(vk, pos)) unflagWord(vk, pos); else flagWord(vk, pos);
      decorate(); render();
      return;
    }
    if (hide) {
      e.preventDefault(); e.stopPropagation();
      w.classList.add('revealed');
    }
  }

  // A-B: ulangi seluruh ayat halaman aktif N kali
  async function toggleLoop() {
    if (ab) {
      clearTimeout(ab.timer);
      ab = null;
      window.AlKalam.stopAudio?.();
      flash('Ulangan dihentikan');
      return;
    }
    const page = window.AlKalam.state.currentPage || 1;
    let list = [];
    try {
      const pd = await window.AlKalam.resolvePageData(page);
      list = ((pd && pd.verses) || []).map((v) => `${v.surah}:${v.ayah}`);
    } catch { list = []; }
    if (!list.length) { flash('Ayat halaman belum siap'); return; }
    ab = { list, i: 0, left: Math.max(1, S.settings.repeatCount) };
    flash('Mengulang halaman ' + page + ' · ' + ab.left + '×');
    playNextInLoop();
  }

  function playNextInLoop() {
    if (!ab) return;
    if (ab.i >= ab.list.length) {
      ab.left -= 1;
      ab.i = 0;
      if (ab.left <= 0) {
        ab = null;
        flash('Ulangan selesai');
        return;
      }
      ab.timer = setTimeout(playNextInLoop, Math.max(0, S.settings.repeatPause));
      return;
    }
    const vk = ab.list[ab.i++];
    window.AlKalam.playAyah(vk);
    const a = window.AlKalam.audio();
    if (a) {
      a.playbackRate = S.settings.audioRate || 1;
      const onEnd = () => { a.removeEventListener('ended', onEnd); setTimeout(playNextInLoop, 250); };
      a.addEventListener('ended', onEnd);
    }
  }

  function initMushaf() {
    injectToolbar();
    syncButtons();
    decorate();
    const root = mushafRoot();
    if (root) {
      root.addEventListener('click', onWordClick, true);
      new MutationObserver(() => { injectToolbar(); syncButtons(); decorate(); }).observe(root, { childList: true, subtree: false });
    }
  }

  // ── inisialisasi ────────────────────────────────────────────────────────
  function mount() {
    if (!el('viewHifz')) return;
    load();
    render();
    initMushaf();
    window.AlKalamHifz.applyHideMode = decorate;
  }

  window.AlKalamHifz = {
    get state() { return S; },
    save, markPageDone, markPageStatus, flagWord, unflagWord, isFlagged,
    srsRate, dueVerses, render, mount, todayKey,
    decorate, flash, startQuiz, listenJuz, toggleRecording, playRecording, startTilawa, stopTilawa,
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
