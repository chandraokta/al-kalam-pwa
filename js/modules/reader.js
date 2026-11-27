/**
 * Al-Kalam · Controller mode Baca
 * ---------------------------------------------------------------------------
 * Membungkus pemutaran audio baca dan memastikan mode 'baca' aktif saat user
 * membuka mushaf. Modul lain memakai AlKalamAudioLock sehingga audio tidak
 * dobel.
 */
(function () {
  function play(verseKey) {
    if (window.AlKalamMode) window.AlKalamMode.set('baca');
    if (window.AlKalamAudioLock) {
      window.AlKalamAudioLock.acquire('baca', () => window.AlKalam.stopAudio());
    }
    return window.AlKalam.playAyah(verseKey);
  }

  function stop() {
    window.AlKalam.stopAudio();
    if (window.AlKalamAudioLock) window.AlKalamAudioLock.release('baca');
  }

  window.AlKalamReader = { play, stop };
})();
