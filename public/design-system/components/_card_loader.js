// Card fallback: uses the compiled bundle namespace when present, otherwise transpiles the sibling .jsx sources in-page.
window.loadNS = async function(base, paths){
  let found = null;
  for (const k of Object.keys(window)) { try { const v = window[k]; if (v && typeof v === 'object' && typeof v.Button === 'function' && typeof v.EvidencePill === 'function') { found = v; break; } } catch (e) {} }
  if (found) { window.NS = found; return found; }
  window.NS = window.NS || {};
  for (const p of paths) {
    try {
      const src = await (await fetch(base + p)).text();
      const own = [...src.matchAll(/export function (\w+)/g)].map(m => m[1]);
      const deps = Object.keys(window.NS).filter(n => !own.includes(n));
      const body = src.replace(/^import[^\n]*\n/gm, '').replace(/export function/g, 'function');
      const code = (deps.length ? 'const {' + deps.join(',') + '} = window.NS;\n' : '') + body + '\n' + own.map(n => 'window.NS.' + n + ' = ' + n + ';').join('');
      const out = Babel.transform(code, { presets: [['react', { runtime: 'classic' }]] }).code;
      new Function('React', out)(window.React);
    } catch (e) { console.error('loadNS failed for ' + p, e); }
  }
  return window.NS;
};
