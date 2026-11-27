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
    const key = `${active}|${boxes.map((b) => b.dataset.sheet).join(',')}`;
    if (key === lastKey && document.querySelector('.study-panel')) return;
    lastKey = key;
    for (const box of boxes) {
      const page = Number(box.dataset.sheet);
      const sheet = box.querySelector('.scan-sheet');
      const existing = box.querySelector('.study-panel');
      if (page === active) { if (existing) existing.remove(); box.classList.remove('study-on'); continue; }
      const pageInfo = pages.find((p) => Number(p.page) === page);
      const verses = (pageInfo && pageInfo.verses) || [];
      if (!verses.length) { if (existing) existing.remove(); continue; }
      const rows = verses.map((v) => {
        const vk = `${v.surah}:${v.ayah}`;
        const list = words[vk] || [];
        const chips = list.map((w) => `<div class="sp-word">
            <span class="sp-ar" dir="rtl">${w.ar || ''}</span>
            <span class="sp-tl">${w.tl || ''}</span>
            <span class="sp-tr">${w.tr || ''}</span>
          </div>`).join('');
        return `<div class="sp-verse"><div class="sp-vk">${vk}</div><div class="sp-words">${chips}</div></div>`;
      }).join('');
      const html = `<div class="study-panel">
        <div class="sp-head"><b>Halaman ${page}</b><span>Arab · transliterasi · arti kata</span></div>
        <div class="sp-body">${rows}</div>
      </div>`;
      if (existing) existing.outerHTML = html;
      else if (sheet) box.appendChild(new DOMParser().parseFromString(html, 'text/html').body.firstElementChild);
      box.classList.add('study-on');
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

  window.AlKalamStudy = { apply, refresh: schedule };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
