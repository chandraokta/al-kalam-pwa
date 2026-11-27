/**
 * Al-Kalam · Registry setelan per modul
 * ---------------------------------------------------------------------------
 * Setiap setelan punya PEMILIK tunggal. UI Pengaturan dirender dari daftar ini
 * (bertahap), dan modul lain hanya membaca — tidak menulis kunci milik modul
 * lain. Nilai disimpan di `S.modules.<modul>.<kunci>`.
 */
(function () {
  const DEFS = [
    { id: 'method.repeat', group: 'Metode 20×', owner: 'method', label: 'Ulangan per langkah',
      type: 'select', options: [3, 5, 10, 20], default: 20 },
    { id: 'method.group', group: 'Metode 20×', owner: 'method', label: 'Kelompok ayat',
      type: 'select', options: [2, 4, 6, 8], default: 4 },
    { id: 'method.pageTarget', group: 'Hafalan', owner: 'method', label: 'Halaman baru per hari',
      type: 'select', options: [1, 2, 3, 5, 10, 20], default: 1 },
    { id: 'reader.rate', group: 'Bacaan', owner: 'reader', label: 'Laju audio',
      type: 'select', options: [0.75, 0.9, 1, 1.25, 1.5], default: 1 },
    { id: 'today.kind', group: 'Target hari ini', owner: 'today', label: 'Jenis target',
      type: 'hidden', default: null },
  ];

  const byId = new Map(DEFS.map((d) => [d.id, d]));

  function moduleName(id) {
    return String(id).split('.')[0];
  }

  function get(state, id) {
    const def = byId.get(id);
    if (!def) throw new Error(`Setelan tidak terdaftar: ${id}`);
    const mod = state && state.modules && state.modules[def.owner];
    const key = String(id).split('.')[1];
    if (mod && mod[key] !== undefined) return mod[key];
    return def.default;
  }

  function set(state, id, value) {
    const def = byId.get(id);
    if (!def) throw new Error(`Setelan tidak terdaftar: ${id}`);
    state.modules = state.modules || {};
    state.modules[def.owner] = state.modules[def.owner] || {};
    state.modules[def.owner][String(id).split('.')[1]] = value;
    return value;
  }

  function groups() {
    const map = new Map();
    for (const d of DEFS) {
      if (!map.has(d.group)) map.set(d.group, []);
      map.get(d.group).push(d);
    }
    return [...map.entries()].map(([group, defs]) => ({ group, defs }));
  }

  window.AlKalamSettings = { DEFS, get, set, groups, moduleName };
})();
