/**
 * Al-Kalam · Modul Setoran (catatan guru + setoran tersembunyi/Tilawa)
 * ---------------------------------------------------------------------------
 * Dipisahkan dari hifz.js. Hook yang dibutuhkan:
 *   AlKalamSetoranModule.init({ getMethods, save, render, flash, esc, getPage, openPage });
 *
 * API luar: window.AlKalamSetoran.reveal(s,a,w) / wrong(...) / stop() / state()
 */
(function () {
  let H = null;
  const SET = { active: false, total: 0, open: 0, wrong: 0, els: new Map(), page: 0 };

  function init(hooks) { H = hooks; }

  function setStatus(msg) {
    const el = document.getElementById('setStatus');
    if (el) el.textContent = msg;
  }

  function html() {
    const st = (H.getMethods().setoran) || { teacher: '', date: '', note: '' };
    return `<div class="hifz-card">
      <strong class="hifz-title">Setoran tersembunyi (disimak)</strong>
      <span class="hifz-muted">Teks hafalan disembunyikan. Bacalah dari hafalan — kata akan terbuka bila bacaan sesuai. Disimak oleh Tilawa di perangkat (audio tidak dikirim).</span>
      <div class="hifz-actions" style="margin-top:8px">
        <button class="btn btn-sm btn-primary" data-set-start>Mulai setoran halaman ini</button>
        <button class="btn btn-sm" data-set-stop hidden>Hentikan</button>
      </div>
      <span class="hifz-muted" id="setStatus">Siap.</span>
    </div>
    <div class="hifz-card">
      <span class="hifz-k">Setoran ke guru</span>
      <span class="hifz-muted">Catatan bahwa hafalan sudah disetorkan (tidak diverifikasi sistem).</span>
      <div class="range-form" style="margin-top:8px">
        <input id="stTeacher" type="text" placeholder="Nama guru" value="${H.esc(st.teacher || '')}" aria-label="Nama guru" style="flex:1;min-width:140px">
        <input id="stDate" type="date" value="${H.esc(st.date || '')}" aria-label="Tanggal setoran">
        <input id="stNote" type="text" placeholder="Catatan (opsional)" value="${H.esc(st.note || '')}" aria-label="Catatan" style="flex:1;min-width:140px">
        <button class="btn btn-sm btn-primary" data-setoran-save>Simpan setoran</button>
      </div>
      <span class="hifz-muted">${st.date ? `Terakhir: ${H.esc(st.date)} · ${H.esc(st.teacher || 'guru')}` : 'Belum ada setoran dicatat.'}</span>
    </div>`;
  }

  function collectWords() {
    SET.els = new Map();
    const perVerse = new Map();
    document.querySelectorAll('.scan-sheet .mw[data-v]').forEach((el) => {
      const vk = el.dataset.v;
      if (!perVerse.has(vk)) perVerse.set(vk, []);
      perVerse.get(vk).push(el);
    });
    for (const [vk, list] of perVerse) {
      list.forEach((el, idx) => SET.els.set(`${vk}:${idx + 1}`, el));
    }
    SET.total = SET.els.size;
    SET.open = 0;
    SET.wrong = 0;
    return perVerse;
  }

  function reveal(surah, ayah, word) {
    const el = SET.els.get(`${surah}:${ayah}:${word}`);
    if (!el) return false;
    if (!el.classList.contains('st-on')) { el.classList.add('st-on'); SET.open += 1; }
    setStatus(`Terbuka ${SET.open}/${SET.total} kata · salah ${SET.wrong} · kata ${surah}:${ayah} #${word}`);
    return true;
  }

  function wrong(surah, ayah, word) {
    const el = SET.els.get(`${surah}:${ayah}:${word}`);
    if (el) el.classList.add('st-bad');
    SET.wrong += 1;
    setStatus(`Terbuka ${SET.open}/${SET.total} kata · salah ${SET.wrong}`);
  }

  function cleanup() {
    SET.active = false;
    document.querySelectorAll('.scan-sheet').forEach((s) => s.classList.remove('set-hidden'));
    document.querySelectorAll('.mw.st-on').forEach((e) => e.classList.remove('st-on'));
    document.querySelectorAll('.mw.st-bad').forEach((e) => e.classList.remove('st-bad'));
    SET.els = new Map();
  }

  async function start() {
    const page = H.getPage();
    SET.page = page;
    await H.openPage(page);
    for (let i = 0; i < 25; i++) {
      if (document.querySelectorAll('.scan-sheet .mw').length) break;
      await new Promise((r) => setTimeout(r, 150));
    }
    const perVerse = collectWords();
    if (!SET.total) { setStatus('Tidak ada teks di halaman ini.'); return; }
    document.querySelectorAll('.scan-sheet').forEach((s) => s.classList.add('set-hidden'));
    SET.active = true;
    if (window.AlKalamMode) window.AlKalamMode.set('setoran');
    if (window.AlKalamAudioLock) window.AlKalamAudioLock.acquire('setoran', () => { stop(); });
    const btnStop = document.querySelector('[data-set-stop]');
    if (btnStop) btnStop.hidden = false;
    document.querySelectorAll('.scan-sheet.set-hidden .mw').forEach((el) => {
      el.addEventListener('click', () => {
        if (!SET.active) return;
        if (!el.classList.contains('st-on')) { el.classList.add('st-on'); SET.open += 1; }
      });
    });
    setStatus(`Menyiapkan Tilawa… (${SET.total} kata disembunyikan)`);
    const verses = [...perVerse.keys()].map((vk) => {
      const [s, a] = vk.split(':').map(Number);
      return { surah: s, ayah: a };
    });
    const first = verses[0];
    const last = verses[verses.length - 1];
    const sameSurah = first.surah === last.surah;
    const res = await window.AlKalamTilawa.start({
      surah: sameSurah ? first.surah : undefined,
      fromAyah: sameSurah ? first.ayah : undefined,
      toAyah: sameSurah ? last.ayah : undefined,
      onProgress: (p) => setStatus(`Mengunduh model ${Math.round((p.fraction || 0) * 100)}%…`),
      onPosition: (e) => {
        const w = e.observed && e.observed[0] && e.observed[0].word;
        if (w) reveal(w.surah, w.ayah, w.word);
      },
      onChecker: (e) => {
        if (e.state === 'confirmed' && e.location) wrong(e.location.surah, e.location.ayah, e.location.word);
      },
      onState: (s, msg) => {
        if (s === 'error') setStatus(`Menyimak tidak aktif: ${msg}. Kata tetap bisa dibuka manual dengan mengetuk.`);
      },
    });
    if (!res.ok) setStatus(`Menyimak tidak aktif (${res.reason || res.error || 'mikrofon'}). Kata tetap bisa dibuka manual dengan mengetuk.`);
    else setStatus(`Menyimak… terbuka 0/${SET.total} kata.`);
  }

  async function stop() {
    if (window.AlKalamAudioLock) window.AlKalamAudioLock.release('setoran');
    if (window.AlKalamMode) window.AlKalamMode.set('hafal');
    try { await window.AlKalamTilawa.stop(); } catch { /* abaikan */ }
    cleanup();
    setStatus(`Setoran dihentikan · terbuka ${SET.open}/${SET.total} kata · salah ${SET.wrong}`);
  }

  function bind(view) {
    view.querySelector('[data-set-start]')?.addEventListener('click', () => { start(); });
    view.querySelector('[data-set-stop]')?.addEventListener('click', () => { stop(); });
  }

  window.AlKalamSetoran = {
    reveal: (a, b, c) => reveal(Number(a), Number(b), Number(c)),
    wrong: (a, b, c) => wrong(Number(a), Number(b), Number(c)),
    stop: () => stop(),
    start: () => start(),
    state: () => ({ ...SET, els: undefined }),
  };

  window.AlKalamSetoranModule = { init, html, bind, start, stop };
})();
