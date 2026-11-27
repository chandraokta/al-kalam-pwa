/**
 * Al-Kalam · Mode aplikasi
 * ---------------------------------------------------------------------------
 * Membaca, menghafal, setoran, dan murajaah memakai tampilan mushaf yang sama,
 * tetapi berbeda controller. Mode aktif menentukan siapa yang boleh:
 *   - menerima event halaman/kata,
 *   - memakai audio (lihat core/audio-lock.js),
 *   - menampilkan kontrol khusus.
 */
(function () {
  const MODES = ['baca', 'hafal', 'setoran', 'murajaah'];
  let current = 'baca';
  const listeners = new Set();

  function apply() {
    document.documentElement.dataset.mode = current;
    if (document.body) document.body.dataset.mode = current;
  }

  function set(mode) {
    const next = MODES.includes(mode) ? mode : 'baca';
    if (next === current) { apply(); return current; }
    current = next;
    apply();
    for (const fn of [...listeners]) {
      try { fn(current); } catch { /* abaikan */ }
    }
    document.dispatchEvent(new CustomEvent('alkalam:mode', { detail: { mode: current } }));
    return current;
  }

  window.AlKalamMode = {
    MODES,
    set,
    get: () => current,
    on: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    off: (fn) => listeners.delete(fn),
  };
  apply();
})();
