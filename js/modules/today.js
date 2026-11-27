/**
 * Al-Kalam · Modul Target Hari Ini ("Hafal apa kita hari ini?")
 * ---------------------------------------------------------------------------
 * Pemilik setelan target: S.modules.today. Hook:
 *   AlKalamToday.init({ getS, save, render, flash, esc, getChapters, pageOfVerse, openPage, getActivePage });
 */
(function () {
  let H = null;

  function init(hooks) { H = hooks; }

  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function current() {
    const S = H.getS();
    const m = (S.modules && S.modules.today) || null;
    return m && m.date ? m : null;
  }

  function setTarget(t) {
    const S = H.getS();
    S.hafalHariIni = t;                       // kompatibilitas modul lain
    S.modules = S.modules || {};
    S.modules.today = Object.assign({}, t);   // pemilik tunggal
    H.save();
  }

  function html() {
    const chapters = H.getChapters() || [];
    const t = current();
    const kind = t ? t.kind : 'ayat';
    const chName = (id) => (chapters.find((c) => c.id === Number(id)) || {}).name_simple || `Surah ${id}`;
    const label = t ? (t.kind === 'page' ? `Halaman ${t.page}` : `${chName(t.surah)} ${t.from}–${t.to}`) : '';
    return `<div class="hifz-card">
      <strong class="hifz-title">Hafal apa kita hari ini?</strong>
      <span class="hifz-muted">Tentukan target hari ini: satu halaman, atau surat & ayat tertentu.</span>
      ${t ? `<strong class="hifz-v">Target hari ini: ${H.esc(label)}</strong>
      <div class="hifz-actions" style="margin-top:6px">
        <button class="btn btn-sm btn-primary" data-today-open>Buka target</button>
        <button class="btn btn-sm" data-today-clear>Hapus target</button>
      </div>` : ''}
      <div class="hifz-actions" style="margin:8px 0">
        <button class="btn btn-sm${kind === 'page' ? ' btn-primary' : ''}" data-today-mode="page">Halaman</button>
        <button class="btn btn-sm${kind === 'ayat' ? ' btn-primary' : ''}" data-today-mode="ayat">Surat &amp; ayat</button>
      </div>
      <div class="range-form" id="todayForm">
        <input id="todayPage" type="number" min="1" max="604" value="${t && t.kind === 'page' ? t.page : H.getActivePage()}" aria-label="Halaman" style="width:90px" ${kind === 'ayat' ? 'hidden' : ''}>
        <select id="todaySurah" aria-label="Surah" ${kind === 'page' ? 'hidden' : ''}>
          ${chapters.slice().sort((a, b) => a.id - b.id).map((c) => `<option value="${c.id}"${t && t.kind === 'ayat' && Number(t.surah) === c.id ? ' selected' : ''}>${c.id}. ${H.esc(c.name_simple || '')}</option>`).join('')}
        </select>
        <input id="todayFrom" type="number" min="1" value="${t && t.kind === 'ayat' ? t.from : 1}" aria-label="Dari ayat" style="width:80px" ${kind === 'page' ? 'hidden' : ''}>
        <input id="todayTo" type="number" min="1" value="${t && t.kind === 'ayat' ? t.to : 5}" aria-label="Sampai ayat" style="width:80px" ${kind === 'page' ? 'hidden' : ''}>
        <button class="btn btn-sm btn-primary" data-today-save>Simpan</button>
      </div>
    </div>`;
  }

  function bind(view) {
    let mode = current() ? current().kind : 'ayat';
    view.querySelectorAll('[data-today-mode]').forEach((b) => b.addEventListener('click', () => {
      mode = b.dataset.todayMode;
      view.querySelectorAll('[data-today-mode]').forEach((x) => x.classList.toggle('btn-primary', x === b));
      const showPage = mode === 'page';
      ['todayPage'].forEach((id) => { const el = view.querySelector('#' + id); if (el) el.hidden = !showPage; });
      ['todaySurah', 'todayFrom', 'todayTo'].forEach((id) => { const el = view.querySelector('#' + id); if (el) el.hidden = showPage; });
    }));

    view.querySelector('[data-today-save]')?.addEventListener('click', async () => {
      if (H.getS().methods.newMem) {
        try { window.AlKalamMethodPlayer.stop(); } catch { /* abaikan */ }
        H.getS().methods.newMem = null;
        H.flash('Metode sebelumnya dihentikan — target baru disiapkan');
      }
      if (mode === 'page') {
        const page = Number(view.querySelector('#todayPage')?.value);
        if (!page || page < 1 || page > 604) return H.flash('Nomor halaman 1–604');
        setTarget({ date: todayStr(), kind: 'page', page });
        window.AlKalam.state.activePage = page;
      } else {
        const surah = Number(view.querySelector('#todaySurah')?.value) || 1;
        const from = Number(view.querySelector('#todayFrom')?.value) || 1;
        const to = Number(view.querySelector('#todayTo')?.value) || from;
        if (to < from) return H.flash('Ayat akhir harus ≥ ayat awal');
        setTarget({ date: todayStr(), kind: 'ayat', surah, from, to });
        window.AlKalam.state.activePage = H.pageOfVerse(surah, from) || 1;
      }
      await H.render();
      H.flash('Target disimpan — Metode 20× sudah terisi. Tekan Mulai menghafal di kartu bawah.');
    });

    view.querySelector('[data-today-open]')?.addEventListener('click', async () => {
      const t = current();
      if (!t) return;
      if (t.kind === 'page') await window.AlKalam.openPage(Number(t.page));
      else await window.AlKalam.openPage(H.pageOfVerse(t.surah, t.from) || 1);
    });

    view.querySelector('[data-today-clear]')?.addEventListener('click', () => {
      const S = H.getS();
      S.hafalHariIni = null;
      S.modules.today = { kind: null, page: null, surah: null, from: null, to: null, date: null };
      H.save();
      H.render();
      H.flash('Target hari ini dihapus');
    });
  }

  window.AlKalamToday = { init, html, bind, current, setTarget, todayStr };
})();
