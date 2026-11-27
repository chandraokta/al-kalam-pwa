/**
 * Al-Kalam · Adaptor tampilan mushaf
 * ---------------------------------------------------------------------------
 * Satu API tipis di atas renderer halaman yang sudah ada, supaya controller
 * (baca, hafal, setoran, murajaah) memakai jalur yang sama tanpa menduplikasi
 * kode render.
 */
(function () {
  function wordsOnPage() {
    const map = new Map(); // "s:a" -> [el, ...]
    document.querySelectorAll('.scan-sheet .mw[data-v]').forEach((el) => {
      const vk = el.dataset.v;
      if (!map.has(vk)) map.set(vk, []);
      map.get(vk).push(el);
    });
    return map;
  }

  function openPage(page) {
    return window.AlKalam.openPage(Number(page));
  }

  function activePage() {
    return window.AlKalam.state.activePage || window.AlKalam.state.currentPage || 1;
  }

  function highlight(verseKey, wordIndex) {
    const list = wordsOnPage().get(verseKey) || [];
    const el = list[Number(wordIndex) - 1];
    if (!el) return false;
    el.classList.add('mushaf-hl');
    return true;
  }

  function clearHighlight() {
    document.querySelectorAll('.mushaf-hl').forEach((el) => el.classList.remove('mushaf-hl'));
  }

  window.AlKalamMushaf = { openPage, activePage, wordsOnPage, highlight, clearHighlight };
})();
