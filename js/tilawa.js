/**
 * Al-Kalam · Pembungkus Tilawa (modul tersendiri)
 * ---------------------------------------------------------------------------
 * Menyimak bacaan user lewat mikrofon dan memberi tahu kata yang sedang dibaca.
 * Dipakai modul Setoran, tapi bisa dipanggil dari fitur lain:
 *
 *   await AlKalamTilawa.start({
 *     surah: 2, fromAyah: 6, toAyah: 16,          // opsional (passage)
 *     onProgress(p) { ... },                      // unduh model
 *     onPosition(e) { e.observed[0].word },       // {surah,ayah,word}
 *     onChecker(e) { ... }                        // salah/terlewat/lebih
 *   });
 *   await AlKalamTilawa.stop();
 *
 * Audio tidak dikirim ke server (on-device, model ONNX di Cache API).
 */
(function () {
  const CDN = 'https://esm.sh/@tilawa/core@next/web';
  let mod = null;
  let engine = null;
  let loading = null;
  let session = null;
  let mic = null;
  let handlers = {};

  function ensure() {
    if (engine) return Promise.resolve(engine);
    if (loading) return loading;
    loading = (async () => {
      mod = await import(CDN);
      engine = await mod.createTilawa({
        onProgress: (p) => { if (handlers.onProgress) handlers.onProgress(p); },
      });
      return engine;
    })();
    loading.catch(() => { loading = null; });
    return loading;
  }

  async function start(opts = {}) {
    handlers = opts;
    try {
      const t = await ensure();
      if (opts.fromAyah && opts.surah) {
        session = t.startMemorization(
          { surah: Number(opts.surah), fromAyah: Number(opts.fromAyah), toAyah: Number(opts.toAyah || opts.fromAyah) },
          { confirm: { after: 'next-word' } },
        );
      } else {
        session = t.startFreeRecitation();
      }
      session.subscribe((e) => {
        if (e.type === 'position' && handlers.onPosition) handlers.onPosition(e);
        if (e.type === 'checker' && handlers.onChecker) handlers.onChecker(e);
        if (handlers.onEvent) handlers.onEvent(e);
      });
      mic = await t.listen(session);
      if (handlers.onState) handlers.onState('listening');
      return { ok: true };
    } catch (err) {
      const reason = (err && err.reason) || '';
      const msg = String((err && err.message) || err);
      if (handlers.onState) handlers.onState('error', msg, reason);
      return { ok: false, error: msg, reason };
    }
  }

  async function stop() {
    try { if (mic) await mic.stop(); } catch { /* abaikan */ }
    mic = null;
    session = null;
    if (handlers.onState) handlers.onState('stopped');
  }

  window.AlKalamTilawa = {
    ensure,
    start,
    stop,
    isReady: () => !!engine,
  };
})();
