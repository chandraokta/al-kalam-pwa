/**
 * Al-Kalam · Modul pemutar Metode 20× (hafalan)
 * ---------------------------------------------------------------------------
 * Dipisahkan dari js/hifz.js agar tidak bentrok dengan audio mode baca.
 * Modul ini memakai elemen Audio() sendiri dan hanya bergantung pada hook
 * yang diberikan hifz.js:
 *
 *   AlKalamMethodPlayer.setHooks({ methodsState, save, render, flash,
 *                                  raporBump, openVersePage });
 *   AlKalamMethodPlayer.play();   // mulai / hentikan (toggle)
 *   AlKalamMethodPlayer.stop();
 */
(function () {
  let H = null;
  const HP = { el: null, timer: null, surah: 0, token: 0 };

  function setHooks(h) { H = h; }

  function hooksReady() {
    if (!H) throw new Error('AlKalamMethodPlayer: hook belum dipasang');
    return H;
  }

  function paintStep(st) {
    document.querySelectorAll('.mw.mt-hl').forEach((e) => e.classList.remove('mt-hl'));
    for (let a = st.from; a <= st.to; a++) {
      document.querySelectorAll(`.mw[data-v="${st.surah}:${a}"]`).forEach((e) => e.classList.add('mt-hl'));
    }
    const first = document.querySelector(`.mw[data-v="${st.surah}:${st.from}"]`);
    if (first && first.scrollIntoView) first.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function clearStepPaint() {
    document.querySelectorAll('.mw.mt-hl').forEach((e) => e.classList.remove('mt-hl'));
    document.querySelectorAll('.mw.mt-word').forEach((e) => e.classList.remove('mt-word'));
  }

  function paintWord(segs, ms) {
    let hit = null;
    for (const s of segs) {
      if (ms >= s.from - 120 && ms <= s.to + 250) {
        for (const g of s.segs || []) {
          if (ms >= Number(g[1]) - 60 && ms <= Number(g[2]) + 120) hit = { vk: s.vk, w: Number(g[0]) };
        }
      }
    }
    document.querySelectorAll('.mw.mt-word').forEach((e) => e.classList.remove('mt-word'));
    if (!hit) return;
    const list = document.querySelectorAll(`.mw[data-v="${hit.vk}"]`);
    const el = list[hit.w - 1];
    if (el) el.classList.add('mt-word');
  }

  function hpAudio() {
    if (!HP.el) {
      HP.el = new Audio();
      HP.el.preload = 'auto';
    }
    return HP.el;
  }

  function hpClearTimer() {
    if (HP.timer) { clearInterval(HP.timer); HP.timer = null; }
  }

  function stop() {
    if (window.AlKalamAudioLock) window.AlKalamAudioLock.release('metode');
    HP.token += 1;
    clearStepPaint();
    hpClearTimer();
    if (HP.el) { try { HP.el.pause(); } catch { /* abaikan */ } }
    if (!H) return;
    const m = H.methodsState().newMem;
    if (m) {
      m.listening = false;
      m.timer = null;
      H.save();
      H.render();
    }
  }

  async function hpLoadSurah(surah) {
    const a = hpAudio();
    const qari = (window.AlKalam.state && window.AlKalam.state.qari) || 'alafasy';
    const url = window.AlKalam.DataManager.getSurahAudioUrl(surah, qari);
    if (!url) throw new Error('url audio tidak ada');
    if (HP.surah !== surah || !a.src) {
      HP.surah = surah;
      a.src = url;
      a.load();
    }
    await new Promise((resolve, reject) => {
      if (a.readyState >= 1) return resolve();
      const ok = () => { cleanup(); resolve(); };
      const bad = () => { cleanup(); reject(new Error('audio gagal dimuat')); };
      const cleanup = () => {
        a.removeEventListener('loadedmetadata', ok);
        a.removeEventListener('error', bad);
      };
      a.addEventListener('loadedmetadata', ok, { once: true });
      a.addEventListener('error', bad, { once: true });
      setTimeout(ok, 15000);
    });
  }

  async function hpPlayStep(m) {
    const h = hooksReady();
    const token = ++HP.token;
    hpClearTimer();
    const st = m.steps[m.step];
    if (!st) return;
    const t1 = window.AlKalam.ayahTimes && window.AlKalam.ayahTimes(`${st.surah}:${st.from}`);
    const t2 = window.AlKalam.ayahTimes && window.AlKalam.ayahTimes(`${st.surah}:${st.to}`);
    if (!t1 || !t2) { h.flash('Data timing ayat belum siap'); m.listening = false; h.save(); h.render(); return; }
    try { await hpLoadSurah(st.surah); } catch { h.flash('Audio surah gagal dimuat'); m.listening = false; h.save(); h.render(); return; }
    if (token !== HP.token) return;
    const a = hpAudio();
    a.playbackRate = 1;
    const repeat = Math.max(1, Number(st.repeat) || 20);
    const seek = () => { try { a.currentTime = Math.max(0, t1.from / 1000 + 0.01); } catch { /* abaikan */ } };
    seek();
    paintStep(st);
    try { await a.play(); } catch {
      h.flash('Ketuk sekali lagi untuk mengizinkan audio');
      m.listening = false; h.save(); h.render(); return;
    }
    m.listening = true;
    m.timer = 1;
    h.save();
    h.render();
    const paint = () => {
      const mm = h.methodsState().newMem;
      if (!mm) return;
      const cnt = document.getElementById('mtCounter');
      if (cnt) cnt.textContent = `${mm.listens || 0}/${repeat}`;
      const bar = document.getElementById('mtBar');
      if (bar) bar.style.width = `${Math.round(((mm.listens || 0) / repeat) * 100)}%`;
      const remain = document.getElementById('mtRemain');
      if (remain) remain.textContent = `${Math.max(0, Math.ceil((t2.to - a.currentTime * 1000) / 1000))} dtk`;
    };
    paint();
    const segs = [];
    for (let a = st.from; a <= st.to; a++) {
      const vk2 = `${st.surah}:${a}`;
      const tt = window.AlKalam.ayahTimes && window.AlKalam.ayahTimes(vk2);
      if (tt) segs.push({ vk: vk2, from: Number(tt.from), to: Number(tt.to), segs: tt.segs || [] });
    }
    const tick = () => {
      if (token !== HP.token) { hpClearTimer(); return; }
      const mm = h.methodsState().newMem;
      if (!mm || !mm.listening) { hpClearTimer(); return; }
      paint();
      paintWord(segs, a.currentTime * 1000);
      if (a.currentTime * 1000 >= t2.to - 60) {
        try { a.pause(); } catch { /* abaikan */ }
        hpClearTimer();
        mm.listens = (mm.listens || 0) + 1;
        h.save();
        if (mm.listens >= repeat) {
          h.raporBump('steps');
          if (mm.step < mm.steps.length - 1) {
            const next = mm.step + 1;
            mm.step = next;
            mm.listens = 0;
            mm.listening = false;
            h.save();
            h.render();
            h.flash(`Langkah ${next}/${mm.steps.length} selesai — lanjut otomatis`);
            setTimeout(() => {
              const m3 = h.methodsState().newMem;
              if (!m3 || m3.step !== next || m3.listening) return;
              hpPlayStep(m3);
            }, 800);
          } else {
            mm.listening = false;
            h.save();
            h.render();
            hpClearTimer();
            clearStepPaint();
            h.flash('Semua langkah selesai — tekan "Sudah hafal"');
          }
        } else {
          h.render();
          setTimeout(() => {
            if (token !== HP.token) return;
            const m3 = h.methodsState().newMem;
            if (!m3 || !m3.listening) return;
            seek();
            a.play().catch(() => {});
            HP.timer = setInterval(tick, 250);
          }, 650);
        }
      }
    };
    HP.timer = setInterval(tick, 250);
  }

  async function play() {
    const h = hooksReady();
    const m = h.methodsState().newMem;
    if (m && window.AlKalamAudioLock) window.AlKalamAudioLock.acquire('metode', () => stop());
    if (!m) { h.flash('Simpan target & susun langkah dulu'); return; }
    if (m.listening) { stop(); return; }
    try { window.AlKalam.stopAudio && window.AlKalam.stopAudio(); } catch { /* abaikan */ }
    try {
      const stt = window.AlKalam.state;
      if (stt && !stt.qul) {
        const q = await window.AlKalam.DataManager.getQul(stt.qari || 'alafasy');
        if (q) stt.qul = q;
      }
    } catch { /* abaikan */ }
    const st = m.steps[m.step];
    if (!st) return;
    try { await h.openVersePage(`${st.surah}:${st.from}`); } catch { /* abaikan */ }
    await hpPlayStep(m);
  }

  window.AlKalamMethodPlayer = { setHooks, play, stop };
})();
