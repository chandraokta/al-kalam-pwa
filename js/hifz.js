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
      remind: true,            // banner pengingat bila belum murajaah
      remindHour: 20,          // jam notifikasi (0-23)
      notify: false,           // izin Notifikasi browser
      tilawaTier: 'auto',      // auto | full | lite
      tilawaMinConf: 0.6,      // ambang keyakinan
      quizScope: 'page',       // page | surah | juz
    },
    days: {},                 // 'YYYY-MM-DD' -> { pages:[], ayahs:n, reviewed:n, flags:n }
    pages: {},                // '42' -> { status:'lancar'|'sedang'|'lemah', perfect:n, mistakes:n, last:ts }
    srs: {},                  // '2:255' -> { due:ts, ivl:1, ease:2.5, reps:0, lapses:0 }
    pageSrs: {},              // '42' -> { due:ts, ivl:1, reps:0 }  (ulangan tingkat halaman)
    flagged: {},              // '2:255' -> [posisi kata…]
    verses: {},               // '2:255' -> { status:'lancar'|'lemah', last:ts }
    scope: { juz: [], surah: [], ranges: [] },   // hafalan: juz, surat, rentang ayat
    program: null,            // { chunks:[[pages]…], perDay, total, key }
    quizLog: [],              // riwayat hasil kuis
    planDone: {},             // 'YYYY-Www' -> { indexHari: timestamp }
    weekly: null,             // [[juz…] × 7] jadwal murajaah
    weeklyDone: {},           // 'YYYY-MM-DD' -> [juz…]
    log: [],                  // riwayat singkat (maks 500)
    newHafz: { active: null, log: [], target: 5 },  // mode hafalan baru
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
  function markVerse(verseKey, status) {
    if (!verseKey) return;
    S.verses[verseKey] = { status, last: Date.now() };
    if (status === 'lancar') srsRate(verseKey, 2); else srsRate(verseKey, 0);
    const d = dayRec();
    d.reviewed = (d.reviewed || 0) + 1;
    log('ayat', `${verseKey} ${status}`);
    save();
  }
  function verseStatus(verseKey) { return (S.verses[verseKey] || {}).status || null; }

  function markPageStatus(page, status, mistakes = 0) {
    const p = S.pages[page] || { perfect: 0, mistakes: 0 };
    S.pages[page] = { status, perfect: status === 'lancar' ? (p.perfect || 0) + 1 : (p.perfect || 0),
      mistakes, last: Date.now() };
    if (mistakes) S.days[todayKey()] && (S.days[todayKey()].flags = (S.days[todayKey()].flags || 0) + mistakes);

    // jadwalkan ulangan tingkat halaman
    const ps = S.pageSrs[page] || { reps: 0, ivl: 1 };
    if (status === 'lancar') {
      ps.reps = (ps.reps || 0) + 1;
      ps.ivl = ps.reps <= 1 ? 2 : ps.reps === 2 ? 5 : Math.min(60, Math.round((ps.ivl || 1) * 2.2));
    } else {
      ps.reps = 0;
      ps.ivl = 1;                      // besok diulang
    }
    ps.due = Date.now() + ps.ivl * DAY;
    S.pageSrs[page] = ps;
    log('halaman', `halaman ${page} ${status} · ulang ${ps.ivl} hari lagi`);
    save();
    return ps;
  }

  function duePages() {
    const now = Date.now();
    return Object.entries(S.pageSrs || {})
      .filter(([, c]) => c.due <= now)
      .sort((a, b) => a[1].due - b[1].due);
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
  function pageMapArray(pm) {
    return Array.isArray(pm) ? pm : ((pm && pm.pages) || []);
  }
  async function pageMapIndex() {
    const dm = window.AlKalam && window.AlKalam.DataManager;
    return pageMapArray(await dm.load('pageMap'));
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
    view.querySelectorAll('[data-hifz-tab]').forEach((x) => x.classList.toggle('active', x.dataset.hifzTab === tab));
    if (tab === 'today') body.innerHTML = await renderToday();
    else if (tab === 'progress') body.innerHTML = await renderProgress();
    else if (tab === 'quiz') body.innerHTML = renderQuizHome();
    else if (tab === 'scope') body.innerHTML = await renderScope();
    else body.innerHTML = renderSettings();
    bind();
  }

  // ── Cakupan hafalan + program murajaah ────────────────────────────────
  let pageMapCache = null;
  async function loadPageMap() {
    if (pageMapCache) return pageMapCache;
    try { pageMapCache = await window.AlKalam.DataManager.load('pageMap'); }
    catch { pageMapCache = []; }
    return pageMapCache || [];
  }

  function scopeKey() {
    const j = [...(S.scope.juz || [])].sort((a, b) => a - b).join(',');
    const u = [...(S.scope.surah || [])].sort((a, b) => a - b).join(',');
    const r = (S.scope.ranges || []).map((x) => `${x.surah}:${x.from}-${x.to}`).sort().join(',');
    return `${j}|${u}|${r}`;
  }

  function scopeEmpty() {
    return !(S.scope.juz || []).length && !(S.scope.surah || []).length;
  }

  /** Halaman & ayat yang termasuk cakupan hafalan. */
  async function computeScope() {
    const pm = await loadPageMap();
    const juzSet = new Set((S.scope.juz || []).map(Number));
    const surSet = new Set((S.scope.surah || []).map(Number));
    const pages = [];
    let ayahs = 0;
    for (const p of pm) {
      const verses = p.verses || [];
      if (!verses.length) continue;
      const ranges = S.scope.ranges || [];
    const inRange = (v) => ranges.some((r) =>
      Number(r.surah) === Number(v.surah) && Number(v.ayah) >= r.from && Number(v.ayah) <= r.to);
    const hit = verses.some((v) =>
      juzSet.has(Number(v.juz)) || surSet.has(Number(v.surah)) || inRange(v));
      if (hit) { pages.push(p.page); ayahs += verses.length; }
    }
    pages.sort((a, b) => a - b);
    return { pages, ayahs };
  }

  /** Kunci pekan ISO: 2026-W47 */
  function weekKey(d = new Date()) {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((t - y0) / 86400000) + 1) / 7);
    return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
  }

  /** Program murajaah 1 pekan: seluruh halaman cakupan dibagi rata ke 7 hari. */
  async function buildProgram() {
    const { pages } = await computeScope();
    if (!pages.length) { S.program = null; save(); return null; }
    const n = pages.length;
    const base = Math.floor(n / 7);
    const extra = n % 7;
    const days = [];
    let cursor = 0;
    for (let d = 0; d < 7; d++) {
      const size = base + (d < extra ? 1 : 0);
      days.push({ pages: pages.slice(cursor, cursor + size) });
      cursor += size;
    }
    S.program = {
      days,
      total: n,
      perDay: Math.ceil(n / 7),
      key: scopeKey(),
      at: Date.now(),
    };
    save();
    return S.program;
  }

  async function ensureProgram() {
    if (!scopeEmpty() && S.program && S.program.key === scopeKey() && Array.isArray(S.program.days)) return S.program;
    if (scopeEmpty()) { S.program = null; return null; }
    return buildProgram();
  }

  const DAY_NAMES = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  /** Halaman jatah hari ini menurut program pekan. */
  function programToday() {
    if (!S.program || !Array.isArray(S.program.days)) return [];
    const d = S.program.days[new Date().getDay()];
    return (d && d.pages) || [];
  }

  function planDone() {
    const wk = weekKey();
    S.planDone = S.planDone || {};
    const keys = Object.keys(S.planDone).sort();
    while (keys.length > 12) { delete S.planDone[keys.shift()]; }
    return (S.planDone[wk] = S.planDone[wk] || {});
  }

  function markPlanDayDone(idx) {
    const done = planDone();
    done[idx] = Date.now();
    // tandai semua halaman hari itu selesai hari ini
    const d = S.program && S.program.days && S.program.days[idx];
    if (d) {
      const rec = dayRec();
      for (const pg of d.pages) {
        if (!rec.pages.includes(pg)) rec.pages.push(pg);
        S.pages[pg] = Object.assign({ status: 'lancar', perfect: 0, mistakes: 0 }, S.pages[pg], { last: Date.now() });
      }
      rec.ayahs = (rec.ayahs || 0) + d.pages.length;
    }
    save();
  }

  function scopeSummaryText() {
    const juz = (S.scope.juz || []).slice().sort((a, b) => a - b);
    const sur = (S.scope.surah || []).slice().sort((a, b) => a - b);
    const ranges = S.scope.ranges || [];
    const chName = (id) => ((chaptersCache || []).find((c) => c.id === Number(id)) || {}).name_simple || `Surah ${id}`;
    const juzTxt = juz.length ? `Juz ${juz.join(', ')}` : '';
    const surTxt = sur.length ? `${sur.length} surat` : '';
    const rngTxt = ranges.length
      ? ranges.map((r) => `${chName(r.surah)} ${r.from}–${r.to}`).join(', ')
      : '';
    return [juzTxt, surTxt, rngTxt].filter(Boolean).join(' · ') || 'belum diatur';
  }

  // ── Tiga sesi harian: Sabaq (baru) · Sabqi (baru diulang) · Manzil (lama) ──
  const SESSION_LABEL = {
    sabaq: { name: 'Sabaq', sub: "ba'da Subuh · hafalan baru" },
    sabqi: { name: 'Sabqi', sub: "ba'da Asar · ulang 3 hari terakhir" },
    manzil: { name: 'Manzil', sub: "ba'da Isya · hafalan lama (rotasi 2 pekan)" },
  };

  function sessionDone() {
    const wk = weekKey();
    S.sessionDone = S.sessionDone || {};
    S.sessionDone[wk] = S.sessionDone[wk] || {};
    return S.sessionDone[wk];
  }

  function dailySessions() {
    if (!S.program || !Array.isArray(S.program.days)) return null;
    const idx = new Date().getDay();
    const day = (i) => S.program.days[(i + 7) % 7] || { pages: [] };
    const sabaq = (day(idx).pages || []).slice();
    const sabqiSet = new Set();
    for (let k = 1; k <= 3; k++) for (const pg of (day(idx - k).pages || [])) sabqiSet.add(pg);
    for (const pg of sabaq) sabqiSet.delete(pg);
    const sabqi = [...sabqiSet].sort((a, b) => a - b);

    const all = [...new Set(S.program.days.flatMap((d) => d.pages || []))].sort((a, b) => a - b);
    const used = new Set([...sabaq, ...sabqi]);
    const rest = all.filter((pg) => !used.has(pg));
    // manzil: sisa halaman dibagi rata ke 7 hari (siklus pekan)
    const n = rest.length;
    const from = Math.floor((idx * n) / 7);
    const to = Math.ceil(((idx + 1) * n) / 7);
    const manzil = rest.slice(from, to);

    return { idx, sabaq, sabqi, manzil, done: sessionDone()[idx] || {} };
  }

  function markSessionDone(key) {
    const idx = new Date().getDay();
    const bucket = sessionDone();
    bucket[idx] = bucket[idx] || {};
    bucket[idx][key] = Date.now();
    // tandai halaman sesi itu selesai hari ini
    const pages = (S.program.days[idx].pages || []).slice();
    const rec = dayRec();
    for (const pg of pages) {
      if (key !== 'sabaq' && !(S.program.days[idx].pages || []).includes(pg)) continue;
      S.pages[pg] = Object.assign({ status: 'lancar', perfect: 0, mistakes: 0 }, S.pages[pg], { last: Date.now() });
    }
    save();
  }

  async function programCardHtml() {
    if (scopeEmpty()) {
      return `<div class="hifz-card">
        <span class="hifz-k">Murajaah harian</span>
        <span class="hifz-muted">Masukkan hafalan Anda (juz / surat / rentang ayat), lalu aplikasi menyusun
          program murajaah 1 pekan: seluruh hafalan dibagi rata ke 7 hari.</span>
        <div class="hifz-actions"><button class="btn btn-sm btn-primary" data-goto-tab="scope">Masukkan hafalan</button></div>
      </div>`;
    }
    const prog = await ensureProgram();
    if (!prog) return '';
    const sess = await dailySessions();
    if (!sess) return '';
    const idx = sess.idx;
    const done = new Set(dayRec().pages || []);
    const doneCount = ['sabaq', 'sabqi', 'manzil'].filter((k) => sess.done[k]).length;
    const totalPages = sess.sabaq.length + sess.sabqi.length + sess.manzil.length;
    const sessionRow = (key) => {
      const pages = sess[key] || [];
      const marked = !!sess.done[key];
      const chips = pages.map((pg) => `<button class="prog-chip${done.has(pg) ? ' done' : ''}" data-gopage="${pg}">${done.has(pg) ? '✓ ' : ''}hal. ${pg}</button>`).join('');
      return `<div class="session-row${marked ? ' done' : ''}">
        <div class="sr-head"><strong>${SESSION_LABEL[key].name}</strong>
          <span class="hifz-muted">${SESSION_LABEL[key].sub} · ${pages.length} halaman</span></div>
        <div class="prog-chips">${chips || '<span class="hifz-muted">—</span>'}</div>
        ${pages.length ? `<div class="hifz-actions">
          <button class="btn btn-sm" data-session-start="${key}">Mulai</button>
          <button class="btn btn-sm ${marked ? '' : 'btn-primary'}" data-session-done="${key}" ${marked ? 'disabled' : ''}>${marked ? 'Selesai ✓' : 'Tandai selesai'}</button>
        </div>` : ''}
      </div>`;
    };
    const weekStrip = DAY_NAMES.map((nm, i) => {
      const d = prog.days[i] || { pages: [] };
      const ok = !!planDone()[i];
      return `<button class="week-day${i === idx ? ' today' : ''}${ok ? ' done' : ''}" data-plan-day="${i}">
        <span class="wd-name">${nm}</span>
        <span class="wd-pages">${d.pages.length} hlm</span>
        ${ok ? '<span class="wd-ok">✓</span>' : ''}</button>`;
    }).join('');
    return `<div class="hifz-card plan-today">
      <span class="hifz-k">Murajaah hari ini · ${DAY_NAMES[idx]}</span>
      <strong class="hifz-v">${doneCount}/3 sesi · ${totalPages} halaman</strong>
      <span class="hifz-muted">Sabaq ${sess.sabaq.length} · Sabqi ${sess.sabqi.length} · Manzil ${sess.manzil.length}
        · total ${prog.total} halaman/minggu</span>
      ${sessionRow('sabaq')}
      ${sessionRow('sabqi')}
      ${sessionRow('manzil')}
      <div class="hifz-actions"><button class="btn btn-sm" data-goto-tab="scope">Ubah hafalan</button></div>
      <div class="week-strip">${weekStrip}</div>
    </div>`;
  }

  /** Tabel program 1 pekan untuk tab Progres. */
  async function weekPlanHtml() {
    if (scopeEmpty()) return `<p class="hifz-muted">Masukkan hafalan dulu di tab Cakupan.</p>`;
    const prog = await ensureProgram();
    if (!prog) return `<p class="hifz-muted">Belum ada program.</p>`;
    const idx = new Date().getDay();
    const rows = DAY_NAMES.map((nm, i) => {
      const d = prog.days[i] || { pages: [] };
      const ok = !!planDone()[i];
      const range = d.pages.length ? `hal. ${d.pages[0]}–${d.pages[d.pages.length - 1]}` : '—';
      return `<div class="hifz-due wp-row${i === idx ? ' today' : ''}">
        <span>${nm}${i === idx ? ' · hari ini' : ''}
          <span class="wp-sub">${range} · ${d.pages.length} halaman</span></span>
        <span class="wp-actions">${ok ? '<span class="wp-ok">✓ selesai</span>' : ''}
          ${d.pages.length ? `<button class="btn btn-sm" data-gopage="${d.pages[0]}">Buka</button>` : ''}</span></div>`;
    }).join('');
    return `<div class="hifz-list">${rows}</div>
      <div class="hifz-actions"><button class="btn btn-sm" data-scope="rebuild">Susun ulang program pekan</button></div>`;
  }

  // ── Retensi halaman & risiko lupa ─────────────────────────────────────
  function flaggedPerPage() {
    const map = new Map();
    for (const [vk, arr] of Object.entries(S.flagged || {})) {
      const pg = pageByVerseHifz.get(vk);
      if (!pg) continue;
      map.set(pg, (map.get(pg) || 0) + (arr || []).length);
    }
    return map;
  }

  function retentionStats(pages) {
    const flags = flaggedPerPage();
    const now = Date.now();
    const rows = (pages || []).map((pg) => {
      const srs = S.pageSrs ? S.pageSrs[pg] : null;
      const info = S.pages[pg] || {};
      const ivl = srs ? Math.max(1, Number(srs.ivl) || 1) : 1;
      const last = info.last || (srs ? srs.due - ivl * DAY : 0);
      const daysSince = last ? (now - last) / DAY : 999;
      const overdue = srs ? Math.max(0, (now - srs.due) / DAY) : 0;
      const mistakes = Number(info.mistakes) || 0;
      const flagsN = flags.get(pg) || 0;
      const rated = !!(last || srs);
      const risk = (last ? daysSince / ivl : 2) + 0.3 * mistakes + 0.2 * flagsN + Math.min(2, overdue / 3);
      const score = Math.max(0, Math.min(100, Math.round(100 - risk * 35)));
      return { page: pg, score, rated, daysSince: Math.round(daysSince), overdue: Math.round(overdue), mistakes, flags: flagsN };
    });
    const rated = rows.filter((r) => r.rated);
    const sum = rated.reduce((a, b) => a + b.score, 0);
    return {
      rows,
      rated: rated.length,
      fresh: rows.length - rated.length,
      avg: rated.length ? Math.round(sum / rated.length) : null,
      strong: rated.filter((r) => r.score >= 75).length,
      fragile: rated.filter((r) => r.score >= 50 && r.score < 75).length,
      weak: rated.filter((r) => r.score < 50).length,
      atRisk: rated.filter((r) => r.score < 75 || r.overdue > 2).sort((a, b) => a.score - b.score),
    };
  }

  function retentionHtml() {
    const pages = (S.program && Array.isArray(S.program.days))
      ? [...new Set(S.program.days.flatMap((d) => d.pages || []))].sort((a, b) => a - b)
      : Object.keys(S.pages).map(Number).sort((a, b) => a - b);
    if (!pages.length) return '';
    const st = retentionStats(pages);
    const tone = st.avg === null ? 'mid' : st.avg >= 75 ? 'ok' : st.avg >= 50 ? 'mid' : 'bad';
    const avgText = st.avg === null ? '—' : `${st.avg}%`;
    const riskRows = st.atRisk.slice(0, 5).map((r) => `
      <div class="hifz-due wp-row">
        <span>Halaman ${r.page}
          <span class="wp-sub">${r.daysSince > 900 ? 'belum pernah diulang' : `${r.daysSince} hari sejak diulang`}${r.overdue > 2 ? ` · lewat ${r.overdue} hari` : ''}${r.mistakes ? ` · ${r.mistakes} kesalahan` : ''}${r.flags ? ` · ${r.flags} kata ditandai` : ''}</span></span>
        <span class="wp-actions"><button class="btn btn-sm btn-primary" data-jump="${pageFirstVerseOf(r.page) || ''}:${r.page}">Latih</button></span>
      </div>`).join('');
    return `
      <h3 class="hifz-h">Retensi & risiko</h3>
      <div class="hifz-cards">
        <div class="hifz-card">
          <span class="hifz-k">Retensi hafalan</span>
          <strong class="hifz-v ${tone}">${avgText}</strong>
          <span class="hifz-muted">${st.rated ? `${st.rated} halaman dinilai · kuat ${st.strong} · rapuh ${st.fragile} · lemah ${st.weak}` : 'belum ada halaman yang pernah diulang'}</span>
          ${st.fresh ? `<span class="hifz-muted">${st.fresh} halaman belum pernah diulang</span>` : ''}
          <div class="hifz-bar"><i style="width:${st.avg === null ? 0 : st.avg}%"></i></div>
        </div>
        <div class="hifz-card">
          <span class="hifz-k">Terancam lupa</span>
          <strong class="hifz-v ${st.atRisk.length ? 'bad' : 'ok'}">${st.atRisk.length} halaman</strong>
          <span class="hifz-muted">${st.atRisk.length ? 'prioritaskan halaman ini hari ini'
            : st.fresh ? 'belum ada halaman dinilai — mulai dari sesi Sabaq' : 'semua halaman masih segar'}</span>
        </div>
      </div>
      ${riskRows ? `<div class="hifz-list" style="margin-top:8px">${riskRows}</div>` : ''}`;
  }

  /** Ayat pertama pada halaman (dari pageMap). */
  function pageFirstVerseOf(page) {
    for (const [vk, pg] of pageByVerseHifz) if (pg === Number(page)) return vk;
    return null;
  }

  // ── Mode Hafalan Baru ────────────────────────────────────────────────
  function nhState() {
    S.newHafz = S.newHafz || { active: null, log: [], target: 5 };
    return S.newHafz;
  }

  function versePageOf(surah, ayah) {
    const pg = pageByVerseHifz.get(`${surah}:${ayah}`);
    if (pg) return Number(pg);
    for (const [vk, p2] of pageByVerseHifz) {
      const [s2, a2] = vk.split(':').map(Number);
      if (s2 === Number(surah) && a2 >= Number(ayah)) return Number(p2);
    }
    return null;
  }

  function nhTodayCount() {
    const t = todayKey();
    return (nhState().log || []).filter((x) => x.day === t)
      .reduce((a, b) => a + (b.ayahs || 0), 0);
  }

  function newHafzLogHtml() {
    const log = (nhState().log || []).slice(0, 6);
    if (!log.length) return '<p class="hifz-muted">Belum ada hafalan baru yang diselesaikan.</p>';
    const name = (id) => ((chaptersCache || []).find((c) => c.id === Number(id)) || {}).name_simple || `Surah ${id}`;
    return `<div class="hifz-list">${log.map((x) => `<div class="hifz-due wp-row">
      <span>${esc(name(x.surah))} ${x.from}–${x.to}
        <span class="wp-sub">${x.ayahs} ayat · ${x.day}</span></span></div>`).join('')}</div>`;
  }

  async function newHafzCardHtml() {
    await ensureVerseMeta();
    const nh = nhState();
    const chapters = chaptersCache || [];
    const today = nhTodayCount();
    const target = Math.max(1, Number(nh.target) || 5);
    const pct = Math.min(100, Math.round((today / target) * 100));

    if (!nh.active) {
      const cur = window.AlKalam.state.currentSurah || 1;
      return `<div class="hifz-card nh-card">
        <span class="hifz-k">Hafalan baru</span>
        <span class="hifz-muted">Hari ini: ${today}/${target} ayat · tambahkan hafalan, lalu aplikasi menjadwalkannya.</span>
        <div class="hifz-bar"><i style="width:${pct}%"></i></div>
        <div class="range-form" style="margin-top:10px">
          <select id="nhSurah" aria-label="Surah hafalan baru">
            ${chapters.map((c) => `<option value="${c.id}"${c.id === cur ? ' selected' : ''}>${c.id}. ${esc(c.name_simple || '')} (${c.verses_count} ayat)</option>`).join('')}
          </select>
          <input id="nhFrom" type="number" min="1" placeholder="dari ayat" aria-label="Dari ayat">
          <input id="nhTo" type="number" min="1" placeholder="sampai ayat" aria-label="Sampai ayat">
          <button class="btn btn-sm btn-primary" data-nh-start>Mulai hafalan</button>
        </div>
        <div class="hifz-actions">
          <button class="btn btn-sm" data-nh-target>Target harian: ${target} ayat</button>
          <button class="btn btn-sm" data-goto-tab="scope">Kelola cakupan</button>
        </div>
      </div>`;
    }

    const a = nh.active;
    const name = ((chapters.find((c) => c.id === Number(a.surah)) || {}).name_simple) || `Surah ${a.surah}`;
    const steps = [
      { n: 1, title: 'Dengar 3×', sub: 'putar ayat berulang, ikuti bacaan', act: 'nh-play', label: 'Putar' },
      { n: 2, title: 'Baca 3×', sub: 'baca sendiri mengikuti halaman', act: 'nh-open', label: 'Buka halaman' },
      { n: 3, title: 'Sembunyi', sub: 'uji dari hafalan tanpa teks', act: 'nh-hide', label: 'Aktifkan Sembunyi' },
      { n: 4, title: 'Uji', sub: 'baca ulang, lalu selesaikan', act: 'nh-open', label: 'Buka halaman' },
    ];
    return `<div class="hifz-card nh-card">
      <span class="hifz-k">Hafalan baru · ${esc(name)} ${a.from}–${a.to}</span>
      <strong class="hifz-v">Langkah ${Math.min(a.step, 4)}/4</strong>
      <div class="nh-steps">
        ${steps.map((st) => `<div class="nh-step${a.step > st.n ? ' done' : a.step === st.n ? ' now' : ''}">
          <span class="nh-no">${a.step > st.n ? '✓' : st.n}</span>
          <span class="nh-txt"><b>${st.title}</b><span class="hifz-muted">${st.sub}</span></span>
          <button class="btn btn-sm${a.step === st.n ? ' btn-primary' : ''}" data-${st.act}>${st.label}</button>
        </div>`).join('')}
      </div>
      ${a.step === 1 ? `<div class="nh-panel">
        <span class="hifz-muted">Didengar: ${a.listens || 0}/3 putaran</span>
        <span class="nh-count">${a.listens || 0}<i>/3</i></span>
      </div>` : ''}
      ${a.step === 3 ? `<div class="nh-panel">
        <span class="hifz-muted">Sembunyikan kata secara bertahap (${a.hides || 0}/4)</span>
        <div class="hifz-actions">
          ${[25, 50, 75, 100].map((p) => `<button class="btn btn-sm${a.hides === p / 25 ? ' btn-primary' : ''}" data-nh-hide-level="${p}">${p}%</button>`).join('')}
          <button class="btn btn-sm" data-nh-unhide>Buka semua</button>
        </div>
      </div>` : ''}
      <div class="hifz-actions">
        ${a.step >= 4
          ? '<button class="btn btn-sm btn-primary" data-nh-finish>Masukkan ke cakupan & selesai</button>'
          : `<button class="btn btn-sm btn-primary" data-nh-next ${a.step === 1 && (a.listens || 0) < 3 ? 'disabled' : ''}>Lanjut langkah berikutnya</button>`}
        <button class="btn btn-sm" data-nh-cancel>Batal</button>
      </div>
    </div>`;

  }

  async function nhStart() {
    const surah = Number(document.getElementById('nhSurah')?.value);
    const from = Number(document.getElementById('nhFrom')?.value) || 1;
    const to = Number(document.getElementById('nhTo')?.value) || from;
    if (!surah || to < from) { flash('Isi surah dan rentang ayat dengan benar'); return; }
    nhState().active = { surah, from, to, step: 1, listens: 0, hides: 0, startedAt: Date.now() };
    save();
    await openVersePage(`${surah}:${from}`);
    render();
    flash(`Hafalan baru dimulai: ${from}–${to}`);
  }

  async function openVersePage(vk) {
    const [s2, a2] = String(vk).split(':').map(Number);
    const pg = versePageOf(s2, a2);
    if (pg) await window.AlKalam.openPage(pg);
  }

  /** Putar ayat from..to sekali, hitung sebagai 1 putaran bila sampai akhir. */
  async function nhListen() {
    const a = nhState().active;
    if (!a) return;
    await openVersePage(`${a.surah}:${a.from}`);
    // putar dulu: playAyah() memuat audio + timing QUL
    await window.AlKalam.playAyah(`${a.surah}:${a.from}`);
    // timing QUL bisa selesai dimuat beberapa saat setelah playAyah()
    let t2 = null;
    for (let i = 0; i < 30 && !t2; i++) {
      t2 = window.AlKalam.ayahTimes ? window.AlKalam.ayahTimes(`${a.surah}:${a.to}`) : null;
      if (!t2) await new Promise((r) => setTimeout(r, 150));
    }
    if (!t2) { flash('Timing audio belum tersedia untuk qari ini'); return; }
    nhState().listening = true;
    if (nhState().timer) clearInterval(nhState().timer);
    nhState().timer = setInterval(() => {
      const nh = nhState();
      const au = window.AlKalam.audio && window.AlKalam.audio();
      if (!nh.listening || !au || !nh.active) { clearInterval(nh.timer); return; }
      if (au.currentTime * 1000 >= t2.to - 80) {
        au.pause();
        nh.listening = false;
        clearInterval(nh.timer);
        const act = nh.active;
        act.listens = Math.min(3, (act.listens || 0) + 1);
        save();
        render();
        flash(act.listens >= 3 ? 'Sudah 3× — lanjut ke langkah Baca' : `Putaran ${act.listens}/3 — ulangi lagi`);
      }
    }, 250);
  }

  /** Sembunyikan sebagian kata pada rentang hafalan baru. */
  async function nhHideLevel(pct) {
    const a = nhState().active;
    if (!a) return;
    await openVersePage(`${a.surah}:${a.from}`);
    const els = [...document.querySelectorAll('.mw')].filter((el) => {
      const [s2, a2] = String(el.dataset.v || '').split(':').map(Number);
      return s2 === Number(a.surah) && a2 >= Number(a.from) && a2 <= Number(a.to);
    });
    if (!els.length) { flash('Kata belum termuat — coba lagi'); return; }
    const n = Math.round((els.length * Number(pct)) / 100);
    els.forEach((el, i) => el.classList.toggle('nh-hidden', i < n));
    a.hides = Math.round(Number(pct) / 25);
    save();
    render();
    flash(`${pct}% kata disembunyikan (${n}/${els.length})`);
  }

  function nhUnhide() {
    document.querySelectorAll('.mw.nh-hidden').forEach((el) => el.classList.remove('nh-hidden'));
    const a = nhState().active;
    if (a) { a.hides = 0; save(); render(); }
  }

  async function nhFinish() {
    const a = nhState().active;
    if (!a) return;
    const ayahs = Math.max(1, a.to - a.from + 1);
    S.scope.ranges = S.scope.ranges || [];
    S.scope.ranges.push({ surah: a.surah, from: a.from, to: a.to });
    nhState().log.unshift({ at: Date.now(), day: todayKey(), surah: a.surah, from: a.from, to: a.to, ayahs });
    nhState().log = nhState().log.slice(0, 50);
    nhState().active = null;
    save();
    await buildProgram();
    render();
    flash(`Hafalan ${a.from}–${a.to} masuk cakupan & jadwal murajaah`);
  }

  async function renderScope() {
    await ensureVerseMeta();
    const chapters = chaptersCache || [];
    const { pages, ayahs } = await computeScope();
    const prog = await ensureProgram();

    const juzChips = Array.from({ length: 30 }, (_, i) => i + 1).map((j) =>
      `<button class="scope-chip${(S.scope.juz || []).includes(j) ? ' active' : ''}" data-scope-juz="${j}">Juz ${j}</button>`
    ).join('');

    const surahChips = chapters.map((c) =>
      `<button class="scope-chip${(S.scope.surah || []).includes(c.id) ? ' active' : ''}" data-scope-surah="${c.id}" data-name="${esc((c.name_simple || '').toLowerCase())}">
        ${c.id}. ${esc(c.name_simple || '')}</button>`
    ).join('');

    return `
      <h3 class="hifz-h">Hafalan yang sudah dikuasai</h3>
      <p class="hifz-muted">Pilih juz dan/atau surat yang sudah Anda hafal. Aplikasi akan menyusun program murajaah 1 pekan: seluruh hafalan dibagi rata ke 7 hari.</p>

      <div class="hifz-card">
        <span class="hifz-k">Juz</span>
        <div class="scope-grid">${juzChips}</div>
        <div class="hifz-actions"><button class="btn btn-sm" data-scope="all-juz">Pilih semua juz</button>
          <button class="btn btn-sm" data-scope="none-juz">Kosongkan juz</button></div>
      </div>

      <div class="hifz-card">
        <span class="hifz-k">Surat</span>
        <input type="search" id="scopeSearch" class="hifz-input" placeholder="Cari surat…" aria-label="Cari surat">
        <div class="scope-grid scope-grid-surah" id="scopeSurahGrid">${surahChips}</div>
        <div class="hifz-actions"><button class="btn btn-sm" data-scope="none-surah">Kosongkan surat</button></div>
      </div>

      <div class="hifz-card">
        <span class="hifz-k">Rentang ayat (opsional)</span>
        <p class="hifz-muted">Untuk hafalan sebagian, mis. Al-Baqarah ayat 1–20.</p>
        <div class="range-form">
          <select id="rangeSurah" aria-label="Surah">
            ${chapters.map((c) => `<option value="${c.id}">${c.id}. ${esc(c.name_simple || '')}</option>`).join('')}
          </select>
          <input id="rangeFrom" type="number" min="1" placeholder="dari ayat" aria-label="Dari ayat">
          <input id="rangeTo" type="number" min="1" placeholder="sampai ayat" aria-label="Sampai ayat">
          <button class="btn btn-sm btn-primary" data-scope="add-range">Tambah</button>
        </div>
        ${(S.scope.ranges || []).length ? `<div class="hifz-list">${S.scope.ranges.map((r, i) => `
          <div class="hifz-due wp-row"><span>${esc((chapters.find((c) => c.id === Number(r.surah)) || {}).name_simple || r.surah)} · ayat ${r.from}–${r.to}</span>
          <span class="wp-actions"><button class="btn btn-sm" data-range-del="${i}">Hapus</button></span></div>`).join('')}</div>` : ''}
      </div>

      <div class="hifz-card">
        <span class="hifz-k">Ringkasan</span>
        <strong class="hifz-v">${pages.length} halaman · ${ayahs} ayat</strong>
        <span class="hifz-muted">Cakupan: ${esc(scopeSummaryText())}${prog ? ` · program ${prog.total} halaman` : ''}</span>
        <div class="hifz-actions">
          <button class="btn btn-sm btn-primary" data-scope="build">Susun program 1 pekan</button>
          <button class="btn btn-sm" data-scope="clear">Hapus cakupan</button>
        </div>
      </div>`;
  }

  async function renderToday() {
    const st = streak();
    const d = dayRec();
    const due = dueVerses(30);
    const dPages = duePages();
    const target = Math.max(1, Number(S.settings.pageTarget) || 1);
    const doneToday = (d.pages || []).length;
    const pct = clamp(Math.round((doneToday / target) * 100), 0, 100);

    const pageHtml = dPages.slice(0, 6).map(([pg, c]) =>
      `<button class="hifz-due" data-gopage="${pg}">Halaman ${pg}<span>jatuh tempo · interval ${Math.round(c.ivl)} hari</span></button>`).join('');
    const verseHtml = due.slice(0, 6).map(([vk, c]) =>
      `<button class="hifz-due" data-open="${vk}">${vk}<span>ulang · ${Math.round(c.ivl)} hari</span></button>`).join('');
    const dueHtml = (pageHtml + verseHtml)
      || `<p class="hifz-muted">Belum ada antrean ulangan. Tandai halaman setelah murajaah agar masuk antrean.</p>`;

    const flaggedCount = Object.values(S.flagged).reduce((a, b) => a + b.length, 0);

    const needRemind = S.settings.remind && !doneToday && new Date().getHours() >= 17;
    const surahCard = await surahProgressCard();
    const juzCard = await juzProgressCard();

    return `
      ${needRemind ? `<div class="hifz-remind">Belum ada murajaah hari ini — sisihkan beberapa menit untuk mengulang hafalan.</div>` : ''}
      ${await programCardHtml()}
      ${await newHafzCardHtml()}
      ${retentionHtml()}
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
          <strong class="hifz-v">${due.length} ayat · ${dPages.length} hal</strong>
          <span class="hifz-muted">${Object.keys(S.srs).length} ayat · ${Object.keys(S.pageSrs || {}).length} halaman terjadwal</span>
        </div>
        <button class="hifz-card hifz-card-btn" data-goto-tab="progress">
          <span class="hifz-k">Kata ditandai</span>
          <strong class="hifz-v">${flaggedCount}</strong>
          <span class="hifz-muted">${flaggedCount ? flaggedPreview() : 'belum ada — aktifkan mode Tandai'}</span>
        </button>
        ${surahCard}
        ${juzCard}
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

  async function surahProgressCard() {
    try {
      const dm = window.AlKalam.DataManager;
      const [chapters, pm] = await Promise.all([dm.load('chapters'), dm.load('pageMap')]);
      const page = window.AlKalam.state.currentPage || 1;
      const pages = pageMapArray(pm);
      const here = pages.find((p) => p.page === page);
      const surahNo = here && here.verses && here.verses[0] && here.verses[0].surah;
      if (!surahNo) return '';
      const ch = chapters.find((c) => c.id === surahNo);
      if (!ch || !ch.pages) return '';
      const [a, b] = ch.pages;
      let done = 0;
      for (let p = a; p <= b; p++) if (S.pages[p] && S.pages[p].status !== 'none') done++;
      const total = b - a + 1;
      return `<div class="hifz-card">
        <span class="hifz-k">Surah ini</span>
        <strong class="hifz-v">${done} / ${total} hal</strong>
        <span class="hifz-muted">${esc(ch.name_simple || '')}</span>
        <div class="hifz-bar"><i style="width:${Math.round((done / total) * 100)}%"></i></div>
      </div>`;
    } catch { return ''; }
  }

  async function currentJuz() {
    const dm = window.AlKalam.DataManager;
    const pm = await dm.load('pageMap');
    const pages = pageMapArray(pm);
    const page = window.AlKalam.state.currentPage || 1;
    const here = pages.find((p) => p.page === page);
    return (here && here.verses && here.verses[0] && here.verses[0].juz) || null;
  }

  async function juzProgressCard() {
    try {
      const j = await currentJuz();
      if (!j) return '';
      const jp = await juzPages();
      const list = jp[j] || [];
      let done = 0;
      for (const p of list) if (S.pages[p] && S.pages[p].status !== 'none') done++;
      return `<div class="hifz-card">
        <span class="hifz-k">Juz ini</span>
        <strong class="hifz-v">${done} / ${list.length} hal</strong>
        <span class="hifz-muted">Juz ${j}</span>
        <div class="hifz-bar"><i style="width:${list.length ? Math.round((done / list.length) * 100) : 0}%"></i></div>
      </div>`;
    } catch { return ''; }
  }

  // ── notifikasi browser ──
  async function enableNotify() {
    if (!('Notification' in window)) { flash('Browser tidak mendukung notifikasi'); return; }
    try {
      const p = await Notification.requestPermission();
      S.settings.notify = p === 'granted';
      save();
      flash(S.settings.notify ? 'Notifikasi diaktifkan' : 'Izin notifikasi ditolak');
      render();
    } catch { flash('Gagal meminta izin notifikasi'); }
  }
  function maybeNotify() {
    if (!S.settings.notify || !('Notification' in window) || Notification.permission !== 'granted') return;
    const now = new Date();
    if (now.getHours() < Number(S.settings.remindHour || 20)) return;
    const d = S.days[todayKey()] || {};
    if ((d.pages || []).length || d.reviewed) return;
    if (S._notifiedOn === todayKey()) return;
    S._notifiedOn = todayKey();
    try {
      new Notification('Al-Kalam — murajaah', {
        body: (() => {
          const s3 = dailySessions();
          return s3
            ? `Murajaah hari ini: Sabaq ${s3.sabaq.length}, Sabqi ${s3.sabqi.length}, Manzil ${s3.manzil.length} halaman.`
            : 'Belum ada murajaah hari ini. Sisihkan beberapa menit untuk mengulang hafalan.';
        })(),
        icon: 'assets/icons/icon-192.png',
        tag: 'alkalam-murajaah',
      });
    } catch { /* abaikan */ }
  }

  function todayIndex() { return new Date().getDay(); }   // 0 = Ahad

  function ensureWeekly() {
    if (Array.isArray(S.weekly) && S.weekly.length === 7) return S.weekly;
    // sebar juz yang punya halaman hafal; kalau kosong pakai 1-30
    const memorized = new Set();
    for (const [p, info] of Object.entries(S.pages || {})) {
      if (info && info.status) memorized.add(Number(p));
    }
    const plan = [[], [], [], [], [], [], []];
    for (let j = 1; j <= 30; j++) plan[(j - 1) % 7].push(j);
    S.weekly = plan;
    save();
    return plan;
  }

  // cache data ayat & surat untuk keterangan juz/surat
  let versesCache = null;
  let chaptersCache = null;
  async function ensureVerseMeta() {
    if (versesCache && chaptersCache) return;
    try {
      const [vs, ch] = await Promise.all([
        window.AlKalam.DataManager.load('verses'),
        window.AlKalam.DataManager.load('chapters'),
      ]);
      versesCache = vs || {};
      chaptersCache = ch || [];
    } catch { versesCache = versesCache || {}; chaptersCache = chaptersCache || []; }
  }
  function metaFor(verseKey) {
    const [surah, ayah] = String(verseKey).split(':').map(Number);
    const arr = versesCache && versesCache[String(surah)];
    const v = arr && arr.find((x) => x.verse_number === ayah);
    const ch = chaptersCache && chaptersCache.find((c) => c.id === surah);
    return {
      surah, ayah,
      juz: v && v.juz_number ? v.juz_number : null,
      name: (ch && ch.name_simple) || `Surah ${surah}`,
      page: pageByVerseHifz.get(verseKey) || null,
    };
  }

  // cache arti kata (untuk menampilkan kata yang ditandai)
  let wordsCache = null;
  async function ensureWords() {
    if (wordsCache) return wordsCache;
    try { wordsCache = await window.AlKalam.DataManager.load('words'); }
    catch { wordsCache = {}; }
    return wordsCache;
  }
  function wordAt(verseKey, pos) {
    const arr = wordsCache && wordsCache[verseKey];
    if (!arr) return null;
    return arr.find((w) => Number(w.p) === Number(pos)) || arr[Number(pos) - 1] || null;
  }

  // peta ayat -> halaman (untuk indeks kata ditandai)
  const pageByVerseHifz = new Map();
  async function ensurePageIndexHifz() {
    if (pageByVerseHifz.size) return;
    try {
      const pm = await window.AlKalam.DataManager.load('pageMap');
      for (const page of pm || []) {
        for (const v of page.verses || []) pageByVerseHifz.set(v.verse_key, page.page);
      }
    } catch { /* diamkan */ }
  }

  function flaggedPreview() {
    const first = [];
    for (const [vk, arr] of Object.entries(S.flagged || {})) {
      for (const pos of arr) { first.push({ vk, pos }); if (first.length >= 2) break; }
      if (first.length >= 2) break;
    }
    const parts = first.map(({ vk, pos }) => {
      const w = wordAt(vk, pos);
      return w && w.ar ? `<span class="fw-ar" dir="rtl">${w.ar}</span>` : `${vk} kata ${pos}`;
    });
    return parts.length ? `terbaru: ${parts.join(' · ')} — tekan untuk lihat semua` : 'tekan untuk lihat daftar';
  }

  let flagFilter = 'all';

  function flaggedToolsHtml() {
    const surahs = [...new Set(Object.keys(S.flagged || {}).map((k) => Number(k.split(':')[0])))].sort((a, b) => a - b);
    if (!surahs.length) return '';
    return `<div class="range-form">
      <select id="flagFilter" aria-label="Saring kata ditandai">
        <option value="all">Semua surah</option>
        ${surahs.map((id) => `<option value="${id}"${String(flagFilter) === String(id) ? ' selected' : ''}>${esc((chaptersCache || []).find((c) => c.id === id)?.name_simple || ('Surah ' + id))}</option>`).join('')}
      </select>
      <button class="btn btn-sm" data-flag-del-all>Hapus semua tanda</button>
    </div>`;
  }

  function flaggedListHtml(filter) {
    const items = [];
    for (const [vk, arr] of Object.entries(S.flagged || {})) {
      if (filter && filter !== 'all' && Number(String(vk).split(':')[0]) !== Number(filter)) continue;
      for (const pos of arr) items.push({ vk, pos });
    }
    if (!items.length) return `<p class="hifz-muted">Belum ada kata ditandai. Aktifkan tombol "Tandai" lalu klik kata yang sering salah.</p>`;
    const rows = items.slice(0, 20).map(({ vk, pos }, i) => {
      const meta = metaFor(vk);
      const w = wordAt(vk, pos);
      const kata = w
        ? `<span class="fw-ar" dir="rtl">${w.ar || ''}</span>` +
          `${w.tl ? `<span class="fw-tl">${w.tl}</span>` : ''}` +
          `${w.tr ? `<span class="fw-tr">${w.tr}</span>` : ''}`
        : `<span class="fw-tr">kata ${pos}</span>`;
      const where = [
        meta.juz ? `Juz ${meta.juz}` : null,
        meta.name,
        `ayat ${meta.ayah}`,
        meta.page ? `hal. ${meta.page}` : null,
      ].filter(Boolean).join(' · ');
      return `<div class="hifz-due wp-row">
        <span><span class="wp-idx">${i + 1}</span>${kata}
        <span class="wp-sub">${where}</span></span>
        <span class="wp-actions">
          ${meta.page ? `<button class="btn btn-sm btn-primary" data-jump="${vk}:${meta.page}">Ke halaman ${meta.page}</button>` : ''}
          <button class="btn btn-sm" data-word-loop="${vk}:${pos}">Latih kata</button>
          <button class="btn btn-sm" data-open="${vk}">Ayat</button>
          <button class="btn btn-sm" data-unflag="${vk}:${pos}">Hapus</button>
        </span></div>`;
    }).join('');
    return `<div class="hifz-list">${rows}</div>`;
  }

  function weeklyPlanCard() {
    const plan = ensureWeekly();
    const day = todayIndex();
    const list = plan[day] || [];
    const done = (S.weeklyDone[todayKey()] || []);
    const label = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][day];
    return `<div class="hifz-card">
      <span class="hifz-k">Jadwal ${label}</span>
      <strong class="hifz-v">${done.length}/${list.length} juz</strong>
      <span class="hifz-muted">${list.map((j) => `Juz ${j}`).join(' · ')}</span>
    </div>`;
  }

  function markWeeklyJuz(j) {
    const key = todayKey();
    const arr = S.weeklyDone[key] || (S.weeklyDone[key] = []);
    const i = arr.indexOf(j);
    if (i >= 0) arr.splice(i, 1); else arr.push(j);
    save();
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
        <div class="hifz-due wp-row"><span>Halaman ${p}<span class="wp-sub">${v.status === 'lemah' ? 'lemah' : (v.mistakes || 0) + ' kesalahan'}${(S.pageSrs[p] ? ' · ulang ' + Math.max(0, Math.ceil((S.pageSrs[p].due - Date.now()) / DAY)) + ' hari' : '')}</span></span>
        <span class="wp-actions"><button class="btn btn-sm" data-gopage="${p}">Buka</button><button class="btn btn-sm btn-primary" data-train="${p}">Latih</button></span></div>`).join('')}</div>`
        : `<p class="hifz-muted">Belum ada data. Tandai hasil murajaah pada halaman untuk mengisi daftar ini.</p>`}

      <h3 class="hifz-h">Kata yang ditandai</h3>
      ${flaggedToolsHtml()}
      ${flaggedListHtml(flagFilter)}

      <h3 class="hifz-h">Program murajaah 1 pekan</h3>
      ${await weekPlanHtml()}

      <h3 class="hifz-h">Riwayat hafalan baru</h3>
      ${newHafzLogHtml()}

      <h3 class="hifz-h">Riwayat uji</h3>
      ${quizHistoryHtml()}

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
      <h3 class="hifz-h">Pilih jenis latihan (opsional)</h3>
      <p class="hifz-muted">Uji dipakai untuk mengecek hafalan. Untuk menjaga hafalan, gunakan program murajaah harian di tab Hari Ini.</p>
      <div class="hifz-list">
        <button class="hifz-due" data-quiz="next">Lanjutkan ayat<span>tebak kata berikutnya</span></button>
        <button class="hifz-due" data-quiz="blank">Lengkapi kata<span>satu kata dihilangkan</span></button>
        <button class="hifz-due" data-quiz="match">Cocokkan terjemahan<span>pilih ayat yang sesuai</span></button>
        <button class="hifz-due" data-quiz="similar">Ayat serupa<span>bedakan mutashihat</span></button>
        <button class="hifz-due" data-quiz="random">Acak<span>campur seluruh jenis soal</span></button>
      </div>
      <label class="setting-row" style="margin-top:14px"><span>Cakupan soal</span>
        <select id="hifzScope">
          <option value="page"${S.settings.quizScope === 'page' ? ' selected' : ''}>Halaman ini</option>
          <option value="surah"${S.settings.quizScope === 'surah' ? ' selected' : ''}>Surah ini</option>
          <option value="juz"${S.settings.quizScope === 'juz' ? ' selected' : ''}>Juz ini</option>
        </select>
      </label>
    `;
  }

  function quizHistoryHtml() {
    const log = (S.quizLog || []).slice(0, 5);
    if (!log.length) return `<p class="hifz-muted">Belum ada hasil uji. Buka tab Uji lalu jawab beberapa soal.</p>`;
    const kindName = { next: 'Lanjutkan ayat', blank: 'Lengkapi kata', match: 'Cocokkan terjemahan', similar: 'Ayat serupa', random: 'Acak' };
    return `<div class="hifz-list">${log.map((x) => {
      const d = new Date(x.at || Date.now());
      const pct = x.done ? Math.round((x.right / x.done) * 100) : 0;
      return `<div class="hifz-due wp-row"><span>${kindName[x.kind] || x.kind}
        <span class="wp-sub">${d.toLocaleDateString('id-ID')} · ${x.right}/${x.done} benar · ${pct}%</span></span></div>`;
    }).join('')}</div>`;
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
      <label class="setting-row"><span>Pengingat harian</span>
        ${sel('hifzRemind', s.remind ? '1' : '0', [['1', 'Aktif'], ['0', 'Mati']])}</label>
      <label class="setting-row"><span>Jam notifikasi</span>
        <input id="hifzRemindHour" type="number" min="0" max="23" value="${s.remindHour}"></label>
      ${(() => {
        const perm = (typeof Notification !== 'undefined') ? Notification.permission : 'unsupported';
        if (perm === 'denied') {
          return `<p class="hifz-muted" style="color:#e0b341">Notifikasi diblokir browser. Buka ikon gembok di bilah alamat → Notifikasi → Izinkan, lalu muat ulang aplikasi.</p>`;
        }
        if (perm === 'granted') {
          return `<div class="hifz-actions" style="margin:6px 0 4px"><button class="btn btn-sm" data-hifz="notify">Notifikasi aktif ✓</button></div>`;
        }
        if (perm === 'unsupported') {
          return `<p class="hifz-muted">Browser ini tidak mendukung notifikasi.</p>`;
        }
        return `<div class="hifz-actions" style="margin:6px 0 4px"><button class="btn btn-sm" data-hifz="notify">Aktifkan notifikasi browser</button></div>`;
      })()}
      <p class="hifz-muted">Pengingat tampil di tab Hari Ini bila sampai sore belum ada murajaah.</p>

      <h3 class="hifz-h">Periksa bacaan (Tilawa · Beta · Eksperimental)</h3>
      <div class="hifz-card">
        <span class="hifz-muted">Pengenal bacaan <b>on-device</b> (model ~68 MB, diunduh sekali lalu disimpan browser).
        Ia menandai kata yang salah atau terlewat saat Anda membaca — <b>bukan penilaian</b>, hanya isyarat untuk diperiksa.</span>
        <ol class="tilawa-steps">
          <li>Tekan <b>Mulai periksa bacaan</b>. Browser akan meminta izin mikrofon — pilih <b>Izinkan</b>.</li>
          <li>Tunggu status berubah menjadi <b>“Mendengarkan…”</b> (unduhan model hanya sekali).</li>
          <li>Bacalah halaman yang sedang terbuka di mushaf dengan tenang; halaman yang diperiksa ditampilkan di status.</li>
          <li>Kata bermasalah muncul di daftar di bawah dan <b>otomatis masuk “Kata ditandai”</b>, sehingga bisa dibuka lagi nanti.</li>
        </ol>
        <p class="hifz-muted" style="color:#e0b341">Eksperimental: akurasi belum tervalidasi dengan mikrofon nyata. Gunakan sebagai isyarat, bukan penilaian.</p>
        <div class="hifz-actions" style="margin-top:10px">
          <button class="btn btn-sm btn-primary" data-hifz="tilawa">Mulai periksa bacaan</button>
          <button class="btn btn-sm" data-hifz="tilawaStop" hidden>Hentikan</button>
          <button class="btn btn-sm" data-hifz="micTest">Uji mikrofon</button>
        </div>
        <label class="setting-row" style="margin-top:8px"><span>Model</span>
          ${sel('hifzTilawaTier', s.tilawaTier, [['auto', 'Otomatis'], ['full', 'Penuh (68 MB)'], ['lite', 'Ringan (25 MB)']])}</label>
        <label class="setting-row"><span>Ambang keyakinan</span>
          ${sel('hifzTilawaConf', String(s.tilawaMinConf), [['0.5', 'Longgar 0,5'], ['0.6', 'Sedang 0,6'], ['0.75', 'Ketat 0,75']])}</label>
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
    view.querySelectorAll('[data-train]').forEach((b) => {
      b.addEventListener('click', async () => {
        await window.AlKalam.openPage(Number(b.dataset.train));
        tab = 'quiz';
        view.querySelectorAll('[data-hifz-tab]').forEach((x) => x.classList.toggle('active', x.dataset.hifzTab === 'quiz'));
        render();
        setTimeout(() => startQuiz('next'), 400);
      });
    });
    view.querySelectorAll('[data-unflag]').forEach((b) => {
      b.addEventListener('click', () => {
        const [vk, pos] = b.dataset.unflag.split(':');
        unflagWord(vk, Number(pos));
        decorate();
        render();
      });
    });
    view.querySelectorAll('[data-goto-tab]').forEach((b) => {
      b.addEventListener('click', () => {
        tab = b.dataset.gotoTab;
        view.querySelectorAll('[data-hifz-tab]').forEach((x) => x.classList.toggle('active', x.dataset.hifzTab === tab));
        render();
      });
    });
    view.querySelector('[data-nh-start]')?.addEventListener('click', nhStart);
    view.querySelector('[data-nh-next]')?.addEventListener('click', () => {
      const nh = nhState();
      if (!nh.active) return;
      nh.active.step = Math.min(4, (nh.active.step || 1) + 1);
      save(); render();
    });
    view.querySelector('[data-nh-cancel]')?.addEventListener('click', () => {
      nhUnhide();
      nhState().active = null; save(); render();
    });
    view.querySelector('[data-nh-finish]')?.addEventListener('click', nhFinish);
    view.querySelector('[data-nh-play]')?.addEventListener('click', nhListen);
    view.querySelectorAll('[data-nh-open]').forEach((b) => b.addEventListener('click', async () => {
      const a = nhState().active; if (!a) return;
      await openVersePage(`${a.surah}:${a.from}`);
    }));
    view.querySelector('[data-nh-hide]')?.addEventListener('click', async () => {
      const a = nhState().active; if (!a) return;
      await openVersePage(`${a.surah}:${a.from}`);
      const hb = document.getElementById('btnHideMode');
      if (hb && !hb.classList.contains('active')) hb.click();
    });
    view.querySelectorAll('[data-nh-hide-level]').forEach((b) => b.addEventListener('click', () => nhHideLevel(b.dataset.nhHideLevel)));
    view.querySelector('[data-nh-unhide]')?.addEventListener('click', nhUnhide);
    view.querySelector('[data-nh-target]')?.addEventListener('click', () => {
      const cur = Number(nhState().target) || 5;
      const v = Number(prompt('Target hafalan baru per hari (ayat):', String(cur)));
      if (v && v > 0) { nhState().target = Math.min(50, v); save(); render(); }
    });
    view.querySelectorAll('[data-word-loop]').forEach((b) => {
      b.addEventListener('click', async () => {
        const parts = b.dataset.wordLoop.split(':');
        const pos = Number(parts.pop());
        const vk = parts.join(':');
        const page = pageByVerseHifz.get(vk);
        if (page) await window.AlKalam.openPage(page);
        setTimeout(() => window.AlKalam.startWordLoop(vk, pos), 700);
      });
    });
    view.querySelectorAll('[data-jump]').forEach((b) => {
      b.addEventListener('click', async () => {
        const parts = b.dataset.jump.split(':');
        const page = Number(parts.pop());
        const vk = parts.join(':');
        await window.AlKalam.openPage(page);
        setTimeout(() => {
          const el = document.querySelector(`.mw[data-v="${vk}"]`);
          if (el) {
            el.classList.add('flash');
            el.scrollIntoView({ block: 'center', behavior: 'smooth' });
            setTimeout(() => el.classList.remove('flash'), 3200);
          }
        }, 700);
      });
    });
    view.querySelectorAll('[data-scope-juz]').forEach((b) => {
      b.addEventListener('click', () => {
        const j = Number(b.dataset.scopeJuz);
        const arr = S.scope.juz || (S.scope.juz = []);
        const i = arr.indexOf(j);
        if (i >= 0) arr.splice(i, 1); else arr.push(j);
        save();
        buildProgram().then(() => render());
      });
    });
    view.querySelectorAll('[data-scope-surah]').forEach((b) => {
      b.addEventListener('click', () => {
        const id = Number(b.dataset.scopeSurah);
        const arr = S.scope.surah || (S.scope.surah = []);
        const i = arr.indexOf(id);
        if (i >= 0) arr.splice(i, 1); else arr.push(id);
        save();
        buildProgram().then(() => render());
      });
    });
    view.querySelectorAll('[data-session-start]').forEach((b) => {
      b.addEventListener('click', async () => {
        const sess = await dailySessions();
        const pages = sess ? sess[b.dataset.sessionStart] : [];
        if (!pages || !pages.length) { flash('Tidak ada halaman pada sesi ini'); return; }
        await window.AlKalam.openPage(pages[0]);
        try { await window.AlKalam.playPageOnce(pages[0]); } catch { /* abaikan */ }
      });
    });
    view.querySelectorAll('[data-session-done]').forEach((b) => {
      b.addEventListener('click', async () => {
        const sess = await dailySessions();
        const key = b.dataset.sessionDone;
        if (!sess) return;
        const bucket = sessionDone();
        bucket[sess.idx] = bucket[sess.idx] || {};
        bucket[sess.idx][key] = Date.now();
        const rec = dayRec();
        for (const pg of (sess[key] || [])) {
          if (!rec.pages.includes(pg)) rec.pages.push(pg);
          S.pages[pg] = Object.assign({ status: 'lancar', perfect: 0, mistakes: 0 }, S.pages[pg], { last: Date.now() });
        }
        save();
        render();
        flash(`${SESSION_LABEL[key].name} selesai`);
      });
    });
    view.querySelector('[data-plan-start]')?.addEventListener('click', async () => {
      const pages = programToday();
      if (!pages.length) { flash('Tidak ada jatah hari ini'); return; }
      await window.AlKalam.openPage(pages[0]);
      try { await window.AlKalam.playPageOnce(pages[0]); } catch { /* abaikan */ }
    });
    view.querySelector('[data-plan-done]')?.addEventListener('click', () => {
      markPlanDayDone(new Date().getDay());
      render();
      flash('Murajaah hari ini ditandai selesai');
    });
    view.querySelectorAll('[data-plan-day]').forEach((b) => {
      b.addEventListener('click', async () => {
        const prog = await ensureProgram();
        if (!prog) return;
        const i = Number(b.dataset.planDay);
        const d = prog.days[i] || { pages: [] };
        const chips = d.pages.map((pg) => `<button class="prog-chip" data-gopage="${pg}">hal. ${pg}</button>`).join('');
        const ov = window.AlKalam.openModal(`<div class="mi-head"><span class="mi-name">Murajaah ${DAY_NAMES[i]}</span></div>
          <p class="mi-sub">${d.pages.length} halaman${d.pages.length ? ` · hal. ${d.pages[0]}–${d.pages[d.pages.length - 1]}` : ''}</p>
          <div class="prog-chips">${chips || '<span class="hifz-muted">—</span>'}</div>`);
        ov.querySelectorAll('[data-gopage]').forEach((x) => x.addEventListener('click', () => {
          ov.remove();
          window.AlKalam.openPage(Number(x.dataset.gopage));
        }));
      });
    });
    view.querySelector('#flagFilter')?.addEventListener('change', (e) => {
      flagFilter = e.target.value;
      render();
    });
    view.querySelector('[data-flag-del-all]')?.addEventListener('click', () => {
      const n = Object.values(S.flagged || {}).reduce((a, b) => a + (b || []).length, 0);
      if (!n) return;
      if (!confirm(`Hapus semua ${n} tanda kata?`)) return;
      S.flagged = {};
      save();
      decorate();
      render();
      flash('Semua tanda kata dihapus');
    });
    view.querySelectorAll('[data-range-del]').forEach((b) => {
      b.addEventListener('click', () => {
        const i = Number(b.dataset.rangeDel);
        (S.scope.ranges || []).splice(i, 1);
        save();
        buildProgram().then(() => render());
      });
    });
    view.querySelectorAll('[data-scope]').forEach((b) => {
      b.addEventListener('click', async () => {
        const act = b.dataset.scope;
        if (act === 'all-juz') S.scope.juz = Array.from({ length: 30 }, (_, i) => i + 1);
        else if (act === 'none-juz') S.scope.juz = [];
        else if (act === 'none-surah') S.scope.surah = [];
        else if (act === 'clear') S.scope = { juz: [], surah: [] };
        else if (act === 'add-range') {
          const surah = Number(view.querySelector('#rangeSurah')?.value);
          const from = Number(view.querySelector('#rangeFrom')?.value);
          const to = Number(view.querySelector('#rangeTo')?.value);
          if (!surah || !from || !to || from < 1 || to < from) { flash('Isi surah dan rentang ayat dengan benar'); return; }
          S.scope.ranges = S.scope.ranges || [];
          S.scope.ranges.push({ surah, from, to });
          save();
          await buildProgram();
          render();
          flash(`Rentang ditambahkan: ${surah}:${from}–${to}`);
          return;
        }
        else if (act === 'build' || act === 'rebuild') {
          const prog = await buildProgram();
          flash(prog ? `Program dibuat: ${prog.total} halaman` : 'Pilih cakupan dulu');
          if (prog) { tab = 'today'; }
        }
        save();
        await (act === 'build' || act === 'rebuild' ? Promise.resolve() : buildProgram());
        render();
      });
    });
    const scopeSearch = view.querySelector('#scopeSearch');
    if (scopeSearch) {
      scopeSearch.addEventListener('input', () => {
        const q = scopeSearch.value.trim().toLowerCase();
        view.querySelectorAll('[data-scope-surah]').forEach((chip) => {
          const name = chip.dataset.name || '';
          const id = chip.dataset.scopeSurah;
          chip.hidden = !!q && !name.includes(q) && !id.startsWith(q);
        });
      });
    }
    view.querySelectorAll('[data-gopage]').forEach((b) => {
      b.addEventListener('click', () => window.AlKalam.openPage(Number(b.dataset.gopage)));
    });
    view.querySelectorAll('[data-juz]').forEach((b) => {
      b.addEventListener('click', () => {
        const j = Number(b.dataset.juz);
        if (b.classList.contains('wp-juz')) {
          markWeeklyJuz(j);
          b.classList.toggle('done');
        }
        startJuz(j);
      });
    });

    const start = view.querySelector('[data-hifz="start"]');
    if (start) start.addEventListener('click', async () => {
      const page = window.AlKalam.state.currentPage || 1;
      await window.AlKalam.openPage(page);
      if (S.settings.hideMode === 'off') S.settings.hideMode = 'kata';
      save();
      document.querySelector('.drawer-item[data-view="mushaf"]')?.click();
      setTimeout(() => { decorate(); syncButtons(); flash('Mode hafalan aktif — ketuk kata untuk membuka'); }, 260);
    });

    view.querySelector('[data-hifz="listen"]')?.addEventListener('click', listenJuz);
    view.querySelector('[data-hifz="record"]')?.addEventListener('click', toggleRecording);
    view.querySelector('[data-hifz="tilawa"]')?.addEventListener('click', startTilawa);
    view.querySelector('[data-hifz="tilawaStop"]')?.addEventListener('click', stopTilawa);
    view.querySelector('[data-hifz="micTest"]')?.addEventListener('click', testMic);

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
    if (hide) hide.addEventListener('change', () => { S.settings.hideMode = hide.value; save(); decorate(); syncButtons(); });
    const remindHour = view.querySelector('#hifzRemindHour');
    if (remindHour) remindHour.addEventListener('change', () => { S.settings.remindHour = clamp(Number(remindHour.value) || 20, 0, 23); save(); render(); });
    view.querySelector('[data-hifz="notify"]')?.addEventListener('click', enableNotify);
    const scope = view.querySelector('#hifzScope');
    if (scope) scope.addEventListener('change', () => { S.settings.quizScope = scope.value; save(); });
    const tier = view.querySelector('#hifzTilawaTier');
    if (tier) tier.addEventListener('change', () => { S.settings.tilawaTier = tier.value; save(); });
    const conf = view.querySelector('#hifzTilawaConf');
    if (conf) conf.addEventListener('change', () => { S.settings.tilawaMinConf = Number(conf.value) || 0.6; save(); });
    const remind = view.querySelector('#hifzRemind');
    if (remind) remind.addEventListener('change', () => { S.settings.remind = remind.value === '1'; save(); render(); });
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
    if (pages.length) window.AlKalam.openPage(pages[0]);
  }

  async function openVerse(vk) {
    const [s, a] = String(vk).split(':').map(Number);
    const dm = window.AlKalam.DataManager;
    const pm = await dm.load('pageMap');
    const pages = pageMapArray(pm);
    const hit = pages.find((p) => (p.verses || []).some((v) => v.surah === s && v.ayah === a));
    if (hit) window.AlKalam.openPage(hit.page);
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
        const nPages = Object.keys(d.pages || {}).length;
        const nFlag = Object.values(d.flagged || {}).reduce((a, b) => a + (b || []).length, 0);
        const nDays = Object.keys(d.days || {}).length;
        const ok = confirm('Impor data hafalan?\n\nData saat ini akan DIGANTI.\n' +
          `Halaman: ${nPages} · Kata ditandai: ${nFlag} · Hari tercatat: ${nDays}`);
        if (!ok) { render(); return; }
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

  /** Uji cepat: apakah mikrofon menghasilkan suara? */
  async function testMic() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      tilawaStatus('Browser tidak mendukung mikrofon');
      return;
    }
    tilawaStatus('Meminta izin mikrofon…');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = 1024;
      src.connect(an);
      const buf = new Float32Array(an.fftSize);
      let peak = 0;
      const t0 = performance.now();
      while (performance.now() - t0 < 2000) {
        an.getFloatTimeDomainData(buf);
        for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i]));
        await new Promise((r) => setTimeout(r, 50));
      }
      stream.getTracks().forEach((t) => t.stop());
      try { await ctx.close(); } catch { /* abaikan */ }
      if (peak > 0.02) tilawaStatus(`Mikrofon OK — level suara ${peak.toFixed(2)}`);
      else if (peak > 0.002) tilawaStatus(`Mikrofon terdeteksi, suara lemah (${peak.toFixed(3)})`);
      else tilawaStatus('Mikrofon terdeteksi tetapi senyap — periksa input perangkat');
    } catch (e) {
      tilawaStatus('Gagal mengakses mikrofon: ' + (e && e.message ? e.message : e));
    }
  }

  async function startTilawa() {
    if (tilawaSession) { stopTilawa(); return; }
    tilawaStatus('Memuat mesin… (sekali unduh ~68 MB)');
    try {
      const mod = await import('https://esm.sh/@tilawa/core@next/web');
      const tierOpt = S.settings.tilawaTier === 'auto' ? 'full' : S.settings.tilawaTier;
      // runtime onnxruntime-web diambil dari CDN (host bawaan tilawa.dev tidak tersedia)
      const wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/';
      const onProgress = (p) => tilawaStatus(`Mengunduh model… ${Math.round((p.fraction || 0) * 100)}%`);
      tilawa = await mod.createTilawa({ tier: tierOpt, wasmPaths, onProgress });
      const page = window.AlKalam.state.currentPage || 1;
      const pd = await window.AlKalam.resolvePageData(page);
      const vs = (pd && pd.verses) || [];
      if (!vs.length) { tilawaStatus('Ayat halaman belum siap'); return; }
      const from = { surah: vs[0].surah, fromAyah: vs[0].ayah, toAyah: vs[vs.length - 1].ayah };
      tilawaSession = tilawa.startMemorization(from, {
        confirm: { after: 'next-word' },
        minConfidence: Number(S.settings.tilawaMinConf) || 0.6,
      });
      let mistakes = 0;
      const inPassage = (loc) => loc && loc.surah === from.surah
        && loc.ayah >= from.fromAyah && loc.ayah <= from.toAyah;
      tilawaSession.subscribe((e) => {
        if (e.type === 'position' && e.observed && e.observed[0]) {
          const w = e.observed[0].word || {};
          if (w.surah) tilawaStatus(`Mendengarkan… posisi ${w.surah}:${w.ayah} kata ${w.word}`);
          return;
        }
        if (e.type === 'checker' && e.state === 'confirmed') {
          const loc = e.location || {};
          // hanya laporkan yang masih di dalam halaman yang diperiksa
          if (!inPassage(loc)) return;
          mistakes += 1;
          // simpan sebagai kata bermasalah agar masuk daftar & bisa diulang
          try { flagWord(`${loc.surah}:${loc.ayah}`, loc.word); decorate(); } catch { /* abaikan */ }
          tilawaLog(`${e.errorClass} · ${loc.surah}:${loc.ayah} kata ${loc.word}`, 'bad');
          tilawaStatus(`Mendengarkan… ${mistakes} isyarat sejauh ini (tersimpan di Kata ditandai)`);
        }
      });
      tilawaMic = await tilawa.listen(tilawaSession);
      document.querySelector('[data-hifz="tilawaStop"]')?.removeAttribute('hidden');
      tilawaStatus(`Mendengarkan halaman ${page} (${from.surah}:${from.fromAyah}-${from.toAyah})… bacalah dengan tenang.`);
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
    const pages = pageMapArray(pm);
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
    const dm = window.AlKalam.DataManager;
    const page = window.AlKalam.state.currentPage || 1;
    const scope = S.settings.quizScope || 'page';
    try {
      const pd = await window.AlKalam.resolvePageData(page);
      const here = ((pd && pd.verses) || []).map((v) => `${v.surah}:${v.ayah}`);
      if (scope === 'page' || !here.length) return { page, keys: here };

      const pm = pageMapArray(await dm.load('pageMap'));
      const cur = pm.find((p) => p.page === page);
      const info = (cur && cur.verses && cur.verses[0]) || {};
      const keys = [];
      for (const p of pm) {
        for (const v of p.verses || []) {
          if (scope === 'surah' && v.surah !== info.surah) continue;
          if (scope === 'juz' && v.juz !== info.juz) continue;
          keys.push(`${v.surah}:${v.ayah}`);
        }
      }
      return { page, keys: keys.length ? keys : here };
    } catch { return { page, keys: [] }; }
  }

  // sesi kuis: { kind, done, total, right, wrong }
  let quizSession = null;
  const QUIZ_TOTAL = 10;

  async function startQuiz(kind) {
    quizSession = { kind: kind || 'next', done: 0, total: QUIZ_TOTAL, right: 0, wrong: 0 };
    await nextQuizQuestion();
  }

  async function nextQuizQuestion() {
    if (quizSession && quizSession.done >= quizSession.total) { renderQuizResult(); return; }
    await buildQuizQuestion(quizSession ? quizSession.kind : 'next');
  }

  async function buildQuizQuestion(kind) {
    const wantRandom = kind === 'random';
    const dm = window.AlKalam.DataManager;
    const { page, keys } = await pageVerseKeys();
    if (!keys.length) { window.AlKalamHifz.flash('Ayat halaman belum siap'); return; }
    const [verses, words, similar] = await Promise.all([
      dm.load('verses'), dm.load('words'), dm.load('similar').catch(() => null),
    ]);
    const body = el('hifzBody');
    if (!body) return;

    // acak: pilih hanya jenis yang datanya tersedia di halaman ini
    if (wantRandom) {
      const pool = ['match'];
      if (keys.some((k) => (words[k] || []).length >= 3)) pool.push('next', 'blank');
      if (keys.some((k) => similar && similar[k])) pool.push('similar');
      kind = pool[rnd(pool.length)];
    }

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
      // tampilkan maksimal 10 kata di sekitar bagian yang ditanyakan
      const from = Math.max(0, idx - 9);
      const shown = arr.slice(from, idx + 1)
        .map((w, i) => (from + i === idx ? '<span class="qz-blank">…</span>' : esc(w.ar)))
        .join(' ');
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
        arabic: esc((vkOf(vk).text_uthmani || '').slice(0, 220)), options: opts.map((o) => o.vk),
        showArabic: opts, answer: partner, verse: vk, arabicBig: true,
      };
    }
    if (!q) return;
    renderQuiz(q);
  }

  function renderQuiz(q) {
    const body = el('hifzBody');
    const optHtml = q.showArabic
      ? q.showArabic.map((o) => `<button class="qz-opt arabic" data-ans="${o.vk}" dir="rtl">${esc(o.ar.length > 120 ? o.ar.slice(0, 120) + ' …' : o.ar)}</button>`).join('')
      : q.options.map((o) => `<button class="qz-opt arabic" data-ans="${o}" dir="rtl">${esc(o)}</button>`).join('');
    const prog = quizSession
      ? `<div class="qz-progress"><span>Soal ${Math.min(quizSession.done + 1, quizSession.total)}/${quizSession.total}</span>` +
        `<span>Benar ${quizSession.right} · Salah ${quizSession.wrong}</span></div>`
      : '';
    body.innerHTML = `
      <div class="qz-card">
        ${prog}
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
        if (quizSession) {
          quizSession.done += 1;
          if (ok) quizSession.right += 1; else quizSession.wrong += 1;
        }
        const last = quizSession ? quizSession.done >= quizSession.total : true;
        if (res) {
          res.textContent = (ok ? 'Benar ✓' : 'Belum tepat') +
            (quizSession ? ` · ${quizSession.right}/${quizSession.done} benar` : '');
          res.className = 'qz-result ' + (ok ? 'ok' : 'bad');
        }
        // tombol lanjut / lihat hasil
        const foot = body.querySelector('.qz-foot');
        if (foot && quizSession) {
          const nb = document.createElement('button');
          nb.className = 'btn btn-sm btn-primary';
          nb.textContent = last ? 'Lihat hasil' : 'Soal berikutnya';
          nb.addEventListener('click', () => { if (last) renderQuizResult(); else nextQuizQuestion(); });
          foot.appendChild(nb);
        }
        srsRate(q.verse, ok ? 2 : 0);
        const d = dayRec();
        d.reviewed = (d.reviewed || 0) + 1;
        log('uji', `${q.verse} ${ok ? 'benar' : 'salah'}`);
        save();
      });
    });
    body.querySelector('[data-quiz-back]')?.addEventListener('click', () => render());
  }

  function renderQuizResult() {
    const body = el('hifzBody');
    if (!body) return;
    const q = quizSession || { kind: 'next', done: 0, right: 0, wrong: 0, total: QUIZ_TOTAL };
    if (quizSession && q.done > 0) {
      S.quizLog = Array.isArray(S.quizLog) ? S.quizLog : [];
      S.quizLog.unshift({ at: Date.now(), kind: q.kind, done: q.done, right: q.right, wrong: q.wrong });
      S.quizLog = S.quizLog.slice(0, 20);
      save();
    }
    const pct = q.done ? Math.round((q.right / q.done) * 100) : 0;
    body.innerHTML = `
      <div class="qz-card qz-done">
        <p class="qz-progress"><span>Selesai</span><span>${q.done} soal</span></p>
        <p class="qz-score">${q.right} benar · ${q.wrong} salah · ${pct}%</p>
        <p class="hifz-muted">Setiap jawaban sudah masuk jadwal ulangan (SRS) ayat tersebut.</p>
        <div class="hifz-actions">
          <button class="btn btn-sm btn-primary" data-quiz-again>Ulangi 10 soal</button>
          <button class="btn btn-sm" data-quiz-back>Kembali</button>
        </div>
      </div>`;
    body.querySelector('[data-quiz-again]')?.addEventListener('click', () => startQuiz(q.kind));
    body.querySelector('[data-quiz-back]')?.addEventListener('click', () => { quizSession = null; render(); });
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
      <button class="btn btn-sm" id="btnPageOK" title="Tandai halaman aktif lancar">Lancar</button>
      <button class="btn btn-sm" id="btnPageRepeat" title="Tandai halaman aktif perlu diulang">Ulang</button>
      <button class="btn btn-sm" id="btnPageLoop" title="Putar halaman aktif sekali, berhenti di akhir halaman">Putar halaman</button>`;
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
      const p = window.AlKalam.activeSheetPage() || 1;
      markPageStatus(p, 'lancar');
      markPageDone(p, 0);
      flash('Halaman ' + p + ' ditandai lancar');
      render();
    });
    grow.querySelector('#btnPageRepeat').addEventListener('click', () => {
      const p = window.AlKalam.activeSheetPage() || 1;
      markPageStatus(p, 'lemah', 1);
      flash('Halaman ' + p + ' masuk daftar ulang');
      render();
    });
    grow.querySelector('#btnPageLoop').addEventListener('click', async () => {
      const st = window.AlKalam.state;
      if (st.pagePlayUntil) {
        st.pagePlayUntil = null;
        window.AlKalam.stopAudio();
        syncButtons();
        flash('Berhenti memutar halaman');
        return;
      }
      const page = window.AlKalam.activeSheetPage() || st.currentPage || 1;
      const ok = await window.AlKalam.playPageOnce(page);
      syncButtons();
      flash(ok ? `Memutar halaman ${page} — akan berhenti di akhir halaman` : 'Gagal memutar halaman');
    });
  }

  function syncButtons() {
    document.getElementById('btnHideMode')?.classList.toggle('active', S.settings.hideMode !== 'off');
    document.getElementById('btnMark')?.classList.toggle('active', marking);
    document.getElementById('btnPageLoop')?.classList.toggle('active', !!window.AlKalam.state.pagePlayUntil);
    updatePageTargets();
  }

  /** Tombol halaman menyebut halaman aktif; tidak ada pemilih terpisah. */
  function updatePageTargets() {
    const page = window.AlKalam.activeSheetPage ? window.AlKalam.activeSheetPage() : null;
    const ok = document.getElementById('btnPageOK');
    const rep = document.getElementById('btnPageRepeat');
    const loop = document.getElementById('btnPageLoop');
    if (ok) { ok.textContent = `Lancar ${page || ''}`.trim(); ok.title = `Tandai halaman ${page} lancar`; }
    if (rep) { rep.textContent = `Ulang ${page || ''}`.trim(); rep.title = `Tandai halaman ${page} perlu diulang`; }
    if (loop) { loop.textContent = `Putar hal. ${page || ''}`.trim(); loop.title = `Putar halaman ${page} sekali`; }
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
    const byAyah = S.settings.hideMode === 'ayat';
    root.querySelectorAll('.mline').forEach((l) => {
      l.classList.toggle('hide-mode', hide && !byAyah);
      l.classList.toggle('hide-ayah', hide && byAyah);
    });
    root.querySelectorAll('.mw-end, .mw-end-badge').forEach((b) => {
      if (b.dataset.v) b.classList.toggle('verse-ok', verseStatus(b.dataset.v) === 'lancar');
    });
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

    // nomor ayat: nilai ayat (lancar/lemah) saat mode tandai
    const badge = e.target.closest && e.target.closest('.mw-end[data-v], .mw-end-badge[data-v]');
    if (badge && (marking || S.settings.hideMode === 'off')) {
      e.preventDefault(); e.stopPropagation();
      const vk = badge.dataset.v;
      const next = verseStatus(vk) === 'lancar' ? 'lemah' : 'lancar';
      markVerse(vk, next);
      decorate();
      flash(`${vk} · ${next === 'lancar' ? 'lancar ✓' : 'perlu diulang'}`);
      render();
      return;
    }

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
      if (S.settings.hideMode === 'ayat') w.closest('.mline')?.classList.add('revealed');
      else w.classList.add('revealed');
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

  document.addEventListener('alkalam:activepage', () => updatePageTargets());

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
    ensurePageIndexHifz().then(() => render());
    ensureWords().then(() => render());
    ensureVerseMeta().then(() => render());
    render();
    initMushaf();
    window.AlKalamHifz.applyHideMode = decorate;
    maybeNotify();
    setInterval(maybeNotify, 5 * 60 * 1000);

    // gambar ulang setiap kali tampilan Hafalan dibuka (halaman bisa berubah)
    const view = el('viewHifz');
    if (view) {
      new MutationObserver(() => { if (!view.hidden) render(); })
        .observe(view, { attributes: true, attributeFilter: ['hidden'] });
      document.querySelector('.drawer-item[data-view="hifz"]')?.addEventListener('click', () => setTimeout(render, 60));
    }
  }

  window.AlKalamHifz = {
    get state() { return S; },
    save, markPageDone, markPageStatus, flagWord, unflagWord, isFlagged,
    srsRate, dueVerses, render, mount, todayKey,
    decorate, flash, startQuiz, markVerse, verseStatus, duePages, listenJuz, toggleRecording, playRecording, startTilawa, stopTilawa,
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
