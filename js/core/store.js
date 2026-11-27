/**
 * Al-Kalam · Penyimpanan terpusat (core store)
 * ---------------------------------------------------------------------------
 * Satu pintu untuk membaca/menulis state hafalan, dengan versi skema dan
 * migrasi. Modul lain TIDAK boleh menyentuh localStorage secara langsung.
 *
 * Skema 2 menambahkan `modules` — setiap fitur memiliki kelompok setelannya
 * sendiri sehingga penambahan setelan baru tidak menimpa setelan fitur lain.
 */
(function () {
  const KEY = 'alkalam_hifz_v2';       // skema 2
  const LEGACY = 'alkalam_hifz_v1';    // skema 1 (dibaca sekali untuk migrasi)

  function migrateV1(input) {
    const s = (input && typeof input === 'object') ? input : {};
    const old = s.settings || {};
    s.schema = 2;
    s.modules = s.modules || {};
    const defaults = {
      method: {
        repeat: [3, 5, 10, 20].includes(Number(old.repeatCount)) ? Number(old.repeatCount) : 20,
        group: 4,
        pageTarget: [1, 2, 3, 5, 10, 20].includes(Number(old.pageTarget)) ? Number(old.pageTarget) : 1,
      },
      reader: {
        rate: Number(old.audioRate) || 1,
      },
      today: { kind: null, page: null, surah: null, from: null, to: null, date: null },
      setoran: {},
    };
    for (const id of Object.keys(defaults)) {
      s.modules[id] = Object.assign(defaults[id], s.modules[id] || {});
    }
    return s;
  }

  function load() {
    try {
      const rawV2 = localStorage.getItem(KEY);
      if (rawV2) {
        const d = JSON.parse(rawV2);
        if (d && typeof d === 'object') return migrateV1(d);
      }
      const rawV1 = localStorage.getItem(LEGACY);
      if (rawV1) {
        const d = JSON.parse(rawV1);
        if (d && typeof d === 'object') return migrateV1(d);
      }
    } catch { /* data rusak: pakai bawaan */ }
    return migrateV1({});
  }

  function save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch { /* kuota penuh */ }
  }

  window.AlKalamStore = { load, save, migrateV1, KEY, LEGACY };
})();
