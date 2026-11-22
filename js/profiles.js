/* Al-Kalam — profil anggota keluarga (satu perangkat, banyak pengguna).
   Strategi: kunci localStorage standar selalu berisi PROFIL AKTIF.
   Saat berganti profil, data profil lama disalin ke kunci ber-prefix
   `alkalam_p_<id>_<kunci>`, lalu data profil tujuan dipulihkan. */
(function () {
  'use strict';

  const KEYS = ['alkalam_hifz_v1', 'alkalam_settings', 'alkalam_bookmarks', 'alkalam_last', 'alkalam_theme'];
  const LIST_KEY = 'alkalam_profiles';
  const ACTIVE_KEY = 'alkalam_profile_active';
  const pfx = (id, k) => `alkalam_p_${id}_${k}`;
  const EMOJIS = ['🙂', '👨', '👩', '🧑', '👦', '👧', '🧕', '👴', '👵', '🕌', '📖', '⭐'];
  const PROMPT_OFF_KEY = 'alkalam_profile_prompt_off';

  /** reload bisa diganti saat pengujian (window.__pfReload) */
  const doReload = () => { try { (window.__pfReload || location.reload.bind(location))(); } catch { location.reload(); } };

  const read = (k, fb) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* penuh */ } };

  function list() {
    const arr = read(LIST_KEY, null);
    if (Array.isArray(arr) && arr.length) return arr;
    const first = [{ id: 'u1', name: 'Saya', emoji: '🙂' }];
    write(LIST_KEY, first);
    if (!localStorage.getItem(ACTIVE_KEY)) localStorage.setItem(ACTIVE_KEY, 'u1');
    return first;
  }

  function activeId() { list(); return localStorage.getItem(ACTIVE_KEY) || 'u1'; }
  function activeProfile() { return list().find((p) => p.id === activeId()) || list()[0]; }

  function snapshot(id) {
    for (const k of KEYS) {
      const v = localStorage.getItem(k);
      if (v === null) localStorage.removeItem(pfx(id, k));
      else localStorage.setItem(pfx(id, k), v);
    }
  }

  function restore(id) {
    for (const k of KEYS) {
      const v = localStorage.getItem(pfx(id, k));
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    }
  }

  function clearCurrent() { for (const k of KEYS) localStorage.removeItem(k); }

  function switchTo(id) {
    sessionStorage.setItem('alkalam_profile_picked', '1');
    if (!id || id === activeId()) return;
    snapshot(activeId());
    localStorage.setItem(ACTIVE_KEY, id);
    clearCurrent();
    restore(id);
    updateButton();
    doReload();
  }

  function create(name, emoji) {
    const arr = list();
    const id = 'u' + (Math.max(0, ...arr.map((p) => Number(String(p.id).replace(/\D/g, '') || 0))) + 1);
    snapshot(activeId());
    arr.push({ id, name, emoji: emoji || '🙂' });
    write(LIST_KEY, arr);
    localStorage.setItem(ACTIVE_KEY, id);
    clearCurrent();
    updateButton();
    doReload();
  }

  function remove(id) {
    const arr = list().filter((p) => p.id !== id);
    if (!arr.length) return false;
    for (const k of KEYS) localStorage.removeItem(pfx(id, k));
    write(LIST_KEY, arr);
    if (id === activeId()) {
      localStorage.setItem(ACTIVE_KEY, arr[0].id);
      clearCurrent();
      restore(arr[0].id);
      doReload();
    }
    return true;
  }

  function rename(id, name) {
    const arr = list();
    const p = arr.find((x) => x.id === id);
    if (!p || !name) return;
    p.name = name;
    write(LIST_KEY, arr);
    updateButton();
  }

  /** Ambil data satu profil (dari snapshot, atau data aktif bila profil itu aktif). */
  function profileData(id) {
    const out = {};
    const isActive = id === activeId();
    for (const k of KEYS) {
      let v = localStorage.getItem(pfx(id, k));
      if (v === null && isActive) v = localStorage.getItem(k);
      if (v !== null) out[k] = v;
    }
    return out;
  }

  function exportProfile(id) {
    const prof = list().find((p) => p.id === id) || { name: id, emoji: '🙂' };
    const payload = {
      app: 'Al-Kalam',
      type: 'profile',
      exportedAt: new Date().toISOString(),
      profile: { name: prof.name, emoji: prof.emoji },
      data: profileData(id),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alkalam-profil-${String(prof.name).replace(/[^\w-]+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return a.download;
  }

  /** Pilih profil saat aplikasi dibuka (bila lebih dari satu anggota). */
  function maybePrompt() {
    if (list().length < 2) return false;
    if (localStorage.getItem(PROMPT_OFF_KEY) === '1') return false;
    if (sessionStorage.getItem('alkalam_profile_picked') === '1') return false;
    modal(true);
    return true;
  }

  // ── UI ──────────────────────────────────────────────────────────────
  function updateButton() {
    const btn = document.getElementById('btnProfile');
    if (!btn) return;
    const p = activeProfile();
    btn.innerHTML = `<span class="pf-emoji">${p.emoji || '🙂'}</span><span class="pf-name">${p.name}</span>`;
    btn.title = `Profil: ${p.name} — ganti anggota keluarga`;
  }

  function modal(pickMode = false) {
    document.getElementById('profileModal')?.remove();
    const arr = list();
    const act = activeId();
    const ov = document.createElement('div');
    ov.id = 'profileModal';
    ov.className = 'modal-overlay';
    ov.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true" aria-label="Profil keluarga">
      <button class="modal-close" aria-label="Tutup">×</button>
      <h3 class="mi-name" style="margin-bottom:6px">${pickMode ? 'Siapa yang membaca?' : 'Profil anggota keluarga'}</h3>
      <p class="hifz-muted" style="margin:0 0 12px">${pickMode
        ? 'Pilih nama Anda. Setiap anggota punya hafalan, setelan, dan penanda sendiri.'
        : 'Hafalan, setelan, penanda, dan posisi baca disimpan terpisah untuk tiap anggota.'}</p>
      <div class="hifz-list">
        ${arr.map((p) => `<div class="hifz-due wp-row">
          <span><button class="pf-emoji pf-emoji-btn" data-pf-pick="${p.id}" title="Ganti emoji">${p.emoji || '🙂'}</button> ${p.name}
            <span class="wp-sub">${p.id === act ? 'sedang dipakai' : 'ketuk untuk ganti'}</span>
            <div class="pf-emoji-picker" data-pf-picker="${p.id}" hidden>
              ${EMOJIS.map((e) => `<button class="pf-emoji" data-pf-emoji="${p.id}:${e}">${e}</button>`).join('')}
            </div></span>
          <span class="wp-actions">
            ${p.id === act ? '<span class="wp-ok">✓</span>' : `<button class="btn btn-sm btn-primary" data-pf-switch="${p.id}">Pakai</button>`}
            <button class="btn btn-sm" data-pf-rename="${p.id}">Nama</button>
            <button class="btn btn-sm" data-pf-export="${p.id}">Ekspor</button>
            ${arr.length > 1 ? `<button class="btn btn-sm" data-pf-del="${p.id}">Hapus</button>` : ''}
          </span></div>`).join('')}
      </div>
      <div class="hifz-actions" style="margin-top:12px">
        <button class="btn btn-sm btn-primary" data-pf-add>Tambah anggota</button>
        ${pickMode ? '<button class="btn btn-sm" data-pf-noprompt>Jangan tanya lagi</button>' : ''}
      </div>
    </div>`;
    document.body.appendChild(ov);
    const close = () => ov.remove();
    ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
    ov.querySelector('.modal-close').addEventListener('click', close);

    ov.querySelectorAll('[data-pf-switch]').forEach((b) => b.addEventListener('click', () => switchTo(b.dataset.pfSwitch)));
    ov.querySelectorAll('[data-pf-rename]').forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.pfRename;
      const cur = arr.find((x) => x.id === id);
      const name = prompt('Nama anggota:', cur ? cur.name : '');
      if (name && name.trim()) { rename(id, name.trim()); close(); modal(); }
    }));
    ov.querySelectorAll('[data-pf-del]').forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.pfDel;
      const cur = arr.find((x) => x.id === id);
      if (!confirm(`Hapus profil "${cur ? cur.name : id}" beserta datanya?`)) return;
      remove(id);
      close();
    }));
    ov.querySelectorAll('[data-pf-pick]').forEach((b) => b.addEventListener('click', () => {
      const picker = ov.querySelector(`[data-pf-picker="${b.dataset.pfPick}"]`);
      if (picker) picker.hidden = !picker.hidden;
    }));
    ov.querySelectorAll('[data-pf-emoji]').forEach((b) => b.addEventListener('click', () => {
      const [id, emoji] = b.dataset.pfEmoji.split(':');
      const arr2 = list();
      const prof = arr2.find((x) => x.id === id);
      if (!prof) return;
      prof.emoji = emoji;
      write(LIST_KEY, arr2);
      updateButton();
      close();
      modal(pickMode);
    }));
    ov.querySelectorAll('[data-pf-export]').forEach((b) => b.addEventListener('click', () => {
      const name = exportProfile(b.dataset.pfExport);
      b.textContent = '✓ ' + (name ? 'tersimpan' : 'gagal');
    }));
    ov.querySelector('[data-pf-noprompt]')?.addEventListener('click', () => {
      localStorage.setItem(PROMPT_OFF_KEY, '1');
      sessionStorage.setItem('alkalam_profile_picked', '1');
      close();
    });
    ov.querySelector('[data-pf-add]')?.addEventListener('click', () => {
      const name = prompt('Nama anggota baru:');
      if (!name || !name.trim()) return;
      create(name.trim());
    });
  }

  function mount() {
    if (document.getElementById('btnProfile')) return;
    const right = document.querySelector('.header-right');
    if (!right) return;
    const btn = document.createElement('button');
    btn.className = 'icon-btn profile-btn';
    btn.id = 'btnProfile';
    btn.setAttribute('aria-label', 'Profil');
    const settings = document.getElementById('btnSettings');
    if (settings && settings.parentElement === right) right.insertBefore(btn, settings);
    else right.appendChild(btn);
    updateButton();
    btn.addEventListener('click', () => modal(false));
    setTimeout(maybePrompt, 900);
  }

  window.AlKalamProfiles = { list, activeId, switchTo, create, remove, rename, modal, maybePrompt, exportProfile, profileData };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
