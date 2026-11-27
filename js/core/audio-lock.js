/**
 * Al-Kalam · Kunci audio
 * ---------------------------------------------------------------------------
 * Hanya satu modul boleh memutar audio pada satu waktu (baca, metode, setoran,
 * murajaah). Saat modul lain mengambil kunci, pemilik sebelumnya dihentikan
 * lewat stopper-nya sehingga tidak ada dua audio berbunyi bersamaan.
 */
(function () {
  let owner = null;
  let stopper = null;

  function acquire(name, stopFn) {
    if (owner && owner !== name) {
      const prev = stopper;
      owner = null;
      stopper = null;
      if (typeof prev === 'function') {
        try { prev(); } catch { /* abaikan */ }
      }
    }
    owner = name;
    stopper = typeof stopFn === 'function' ? stopFn : null;
    document.dispatchEvent(new CustomEvent('alkalam:audio-owner', { detail: { owner } }));
  }

  function release(name) {
    if (owner !== name) return;
    owner = null;
    stopper = null;
    document.dispatchEvent(new CustomEvent('alkalam:audio-owner', { detail: { owner } }));
  }

  window.AlKalamAudioLock = { acquire, release, current: () => owner };
})();
