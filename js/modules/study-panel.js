/**
 * Al-Kalam · Panel studi halaman tidak aktif (mode Hafal)
 * ---------------------------------------------------------------------------
 * Saat menghafal satu halaman (mode hafal), halaman sebelahnya menampilkan
 * bacaan per kata: Arab, transliterasi, dan arti. Panel ikut berganti ketika
 * user berpindah halaman.
 */
(function () {
  let wordsCache = null;
  let pageMap = null;
  let timer = null;
  let lastKey = '';
  let currentAyah = null;
  let currentWord = 0;
  let range = null;

  async function data() {
    if (!wordsCache) {
      try { wordsCache = await window.AlKalam.DataManager.load('words'); } catch { wordsCache = {}; }
    }
    if (!pageMap) {
      try { pageMap = await window.AlKalam.DataManager.load('pageMap'); } catch { pageMap = []; }
    }
    return { words: wordsCache, pages: pageMap };
  }

  function removePanels() {
    lastKey = '';
    document.querySelectorAll('.study-panel').forEach((p) => p.remove());
    document.querySelectorAll('.scan-sheet-box.study-on').forEach((b) => b.classList.remove('study-on'));
  }

  async function apply() {
    if (!window.AlKalamMode || window.AlKalamMode.get() !== 'hafal') { removePanels(); return; }
    const boxes = [...document.querySelectorAll('.scan-sheet-box[data-sheet]')]
      .filter((b) => /^\d+$/.test(b.dataset.sheet || ''));
    const active = Number(window.AlKalam.state.activePage || window.AlKalam.state.currentPage || 1);
    if (boxes.length < 2) { removePanels(); return; }
    const { words, pages } = await data();
    const key = `${active}|${currentAyah || ''}|${boxes.map((b) => b.dataset.sheet).join(',')}`;
    if (key === lastKey && document.querySelector('.study-panel')) return;
    lastKey = key;
    for (const box of boxes) {
      const page = Number(box.dataset.sheet);
      const sheet = box.querySelector('.scan-sheet');
      const existing = box.querySelector('.study-panel');
      if (page === active) { if (existing) existing.remove(); box.classList.remove('study-on'); continue; }
      const pageInfo = pages.find((p2) => Number(p2.page) === page);
      const verses = (pageInfo && pageInfo.verses) || [];
      if (!verses.length) { if (existing) existing.remove(); continue; }
      // hanya SATU ayat: yang sedang dibaca; jika belum ada, ayat pertama halaman aktif
      let vk = currentAyah;
      if (!vk) {
        const actInfo = pages.find((p2) => Number(p2.page) === active);
        const av = (actInfo && actInfo.verses && actInfo.verses[0]) || null;
        if (av) vk = `${av.surah}:${av.ayah}`;
      }
      if (!vk) { if (existing) existing.remove(); continue; }
      const list = words[vk] || [];
      if (!list.length) { if (existing) existing.remove(); continue; }
      const chips = list.map((w, i) => `<div class="sp-word sp-word-lg" data-w="${i + 1}">
          <span class="sp-ar" dir="rtl">${w.ar || ''}</span>
          <span class="sp-tl">${w.tl || ''}</span>
          <span class="sp-tr">${w.tr || ''}</span>
        </div>`).join('');
      const html = `<div class="study-panel">
        <div class="sp-head"><b>Ayat ${vk}</b><span>Arab · transliterasi · arti kata</span></div>
        <div class="sp-body"><div class="sp-verse"><div class="sp-words sp-words-lg">${chips}</div></div></div>
      </div>`;
      if (existing) existing.outerHTML = html;
      else if (sheet) box.appendChild(new DOMParser().parseFromString(html, 'text/html').body.firstElementChild);
      box.classList.add('study-on');
    }
    paintPanel();
  }

  function paintPanel() {
    const panel = document.querySelector('.study-panel');
    if (!panel) return;
    panel.querySelectorAll('.sp-word').forEach((el) => el.classList.remove('sp-range', 'sp-on'));
    if (range && currentAyah && Number(range.surah) === Number(String(currentAyah).split(':')[0])) {
      const ayah = Number(String(currentAyah).split(':')[1]);
      if (ayah >= range.from && ayah <= range.to) {
        panel.querySelectorAll('.sp-word').forEach((el) => el.classList.add('sp-range'));
      }
    }
    if (currentWord) {
      const el = panel.querySelector(`.sp-word[data-w="${currentWord}"]`);
      if (el) el.classList.add('sp-on');
    }
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(() => { apply(); }, 150);
  }

  function start() {
    if (window.AlKalamMode) window.AlKalamMode.on(schedule);
    document.addEventListener('alkalam:activepage', schedule);
    const host = document.getElementById('mushafContainer') || document.body;
    new MutationObserver(schedule).observe(host, { childList: true, subtree: true });
    window.addEventListener('resize', schedule);
    schedule();
  }

  function setAyah(vk) {
    if (!vk || vk === currentAyah) return;
    currentAyah = vk;
    schedule();
  }

  window.AlKalamMode && window.AlKalamMode.on((m) => { if (m !== 'hafal') { currentAyah = null; currentWord = 0; range = null; } });

  function setWord(vk, w) {
    if (vk && vk !== currentAyah) currentAyah = vk;
    currentWord = Number(w) || 0;
    paintPanel();
  }

  function setRange(surah, from, to) {
    range = surah ? { surah: Number(surah), from: Number(from), to: Number(to) } : null;
    paintPanel();
  }

  window.AlKalamStudy = { apply, refresh: schedule, setAyah, setWord, setRange,
    currentAyah: () => currentAyah, currentWord: () => currentWord };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
