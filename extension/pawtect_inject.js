(() => {
  const backend = 'https://backend.wplace.live';

  // --- detect which .wasm actually loads (prefers pawtect_wasm_bg*.wasm) ---
  function createWasmDetector(matchers = [/pawtect_wasm_bg.*\.wasm$/i, /\.wasm$/i], timeout = 8000) {
    let resolved = false, resolve, reject;
    const p = new Promise((res, rej) => { resolve = res; reject = rej; });

    const seen = new Set();
    const maybe = (url) => {
      if (resolved || !url) return;
      try {
        const u = new URL(url, location.href).href;
        if (seen.has(u)) return;
        if (matchers.some(rx => rx.test(u))) {
          seen.add(u);
          const filename = new URL(u).pathname.split("/").pop()
          console.log(filename)
          resolved = true;
          try { window.__PAWTECT_WASM_URL__ = u; } catch {}
          try { window.postMessage({ type: 'WPLACER_PAWTECT_WASM_URL', url: u }, '*'); } catch {}
          resolve(u);
        }
      } catch {}
    };

    // fetch
    const _fetch = window.fetch;
    window.fetch = async (...a) => {
      const r = await _fetch(...a);
      maybe(r?.url);
      return r;
    };

    // XHR
    const _open = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (m, url, ...rest) {
      this.addEventListener('loadend', () => maybe(this.responseURL));
      return _open.call(this, m, url, ...rest);
    };

    // WebAssembly streaming
    ['instantiateStreaming', 'compileStreaming'].forEach((k) => {
      if (!WebAssembly[k]) return;
      const orig = WebAssembly[k];
      WebAssembly[k] = function (src, ...rest) {
        Promise.resolve(src).then((resp) => maybe(resp?.url)).catch(() => {});
        return orig.call(WebAssembly, src, ...rest);
      };
    });

    // Performance entries, including already-loaded resources
    try {
      const po = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) maybe(e.name);
      });
      po.observe({ type: 'resource', buffered: true });
    } catch {}

    // timeout
    setTimeout(() => { if (!resolved) reject(new Error('wasm not detected')); }, timeout);
    return { promise: p, maybe };
  }
  const wasmDet = createWasmDetector();

  // --- extension base helpers (unchanged) ---
  const EXT_BASE = (() => {
    try {
      const sc = document.currentScript || Array.from(document.scripts || []).find(s => (s && typeof s.src === 'string' && s.src.includes('pawtect_inject.js')));
      if (sc && sc.src) return new URL('.', sc.src).href;
    } catch {}
    return null;
  })();
  const extUrl = (p) => {
    try { return EXT_BASE ? new URL(p, EXT_BASE).href : null; } catch { return null; }
  };

  const importModule = async () => {
    const candidates = [
      extUrl('solver.wasm/immutable/chunks/BBb1ALhY.js'),
      new URL('/_app/immutable/chunks/BBb1ALhY.js', location.origin).href,
      'https://wplace.live/_app/immutable/chunks/BBb1ALhY.js'
    ];
    let lastErr;
    for (const url of candidates) {
      try { return await import(url); } catch (e) { lastErr = e; }
    }
    console.error('pawtect: failed to import module', lastErr?.message || lastErr);
    return null;
  };

  const run = async (url, body) => {
    try {
      const mod = await importModule();
      if (!mod || typeof mod._ !== 'function') return;

      // 1) use detected wasm if any, else 2) packaged paths, else 3) default
      let wasmUrl;
      try { wasmUrl = await Promise.race([wasmDet.promise, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 1500))]); } catch {}
      wasmUrl = wasmUrl || extUrl('solver.wasm/pawtect_wasm_bg.wasm') || extUrl('solver.wasm/immutable/assets/pawtect_wasm_bg.BvxCe1S1.wasm');

      let wasm;
      try {
        if (wasmUrl) wasm = await mod._(wasmUrl);
        else throw new Error('no wasmUrl');
      } catch {
        try { wasm = await mod._(extUrl('solver.wasm/immutable/assets/pawtect_wasm_bg.BvxCe1S1.wasm')); }
        catch { wasm = await mod._(); }
      }

      try {
        const me = await fetch(`${backend}/me`, { credentials: 'include' }).then(r => r.ok ? r.json() : null);
        if (me?.id && typeof mod.i === 'function') mod.i(me.id);
      } catch {}

      if (typeof mod.r === 'function') mod.r(url);

      const enc = new TextEncoder();
      const dec = new TextDecoder();
      const bytes = enc.encode(JSON.stringify(body));
      const inPtr = wasm.__wbindgen_malloc(bytes.length, 1);
      new Uint8Array(wasm.memory.buffer, inPtr, bytes.length).set(bytes);
      const out = wasm.get_pawtected_endpoint_payload(inPtr, bytes.length);
      const outPtr = Array.isArray(out) ? out[0] : out.ptr || out;
      const outLen = Array.isArray(out) ? out[1] : out.len || 0;
      const token = dec.decode(new Uint8Array(wasm.memory.buffer, outPtr, outLen));
      try { wasm.__wbindgen_free(outPtr, outLen, 1); } catch {}

      console.log('x-pawtect-token:', token);
      try { window.postMessage({ type: 'WPLACER_PAWTECT_TOKEN', token, fp: body.fp || null }, '*'); } catch {}
      return token;
    } catch (e) {
      console.error('pawtect run error:', e?.message || e);
    }
  };

  // DevTools helper
  window.wplacerRunPawtect = (urlOverride, bodyOverride) => {
    const url = urlOverride || `${backend}/s0/pixel/1663/1069`;
    const body = bodyOverride || { colors: [0,1,2], coords: [10,20,11,21], t: 'REPLACE_T', fp: 'REPLACE_FP' };
    return run(url, body);
  };

  console.log('pawtect helper ready.');
})();
