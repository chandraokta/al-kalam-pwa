/**
 * Al-Kalam · Model cakupan hafalan + program murajaah pekan
 * ---------------------------------------------------------------------------
 * Bagian data (bukan UI). Hook: AlKalamScopeModel.init({ getS, save, loadPageMap }).
 */
(function () {
  let H = null;

  function init(hooks) { H = hooks; }

  function scopeKey() {
    const S = H.getS();
    const j = [...(S.scope.juz || [])].sort((a, b) => a - b).join(',');
    const u = [...(S.scope.surah || [])].sort((a, b) => a - b).join(',');
    const r = (S.scope.ranges || []).map((x) => `${x.surah}:${x.from}-${x.to}`).sort().join(',');
    return `${j}|${u}|${r}`;
  }

  function scopeEmpty() {
    const S = H.getS();
    return !(S.scope.juz || []).length && !(S.scope.surah || []).length && !(S.scope.ranges || []).length;
  }

  async function computeScope() {
    const S = H.getS();
    const pm = await H.loadPageMap();
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

  function weekKey(d = new Date()) {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((t - y0) / 86400000) + 1) / 7);
    return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
  }

  async function buildProgram() {
    const S = H.getS();
    const { pages } = await computeScope();
    if (!pages.length) { S.program = null; H.save(); return null; }
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
    S.program = { days, total: n, perDay: Math.ceil(n / 7), key: scopeKey(), at: Date.now() };
    H.save();
    return S.program;
  }

  async function ensureProgram() {
    const S = H.getS();
    if (!scopeEmpty() && S.program && S.program.key === scopeKey() && Array.isArray(S.program.days)) return S.program;
    if (scopeEmpty()) { S.program = null; return null; }
    return buildProgram();
  }

  window.AlKalamScopeModel = { init, scopeKey, scopeEmpty, computeScope, weekKey, buildProgram, ensureProgram };
})();
