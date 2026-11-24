// Phone-friendly copies of the pictures a room loads (made on the server by studio/app/texopt/texopt.py): GPU-compressed
// KTX2 (Basis UASTC for works, ETC1S for walls and floors where it measured as good), with mipmaps: a work's 768 px copy for
// afar (up close the original is loaded), a room's surfaces at the size a phone holds them, and a WebP for a browser that can't read KTX2. A picture with no copies loads as before.
// Compressed, a picture takes a quarter (UASTC) or an eighth (ETC1S) of the memory a decoded JPEG does, and the browser
// keeps no decoded copy of it beside the GPU's.
//   const opt = await texOpt({ THREE, renderer, src });
//   opt.load(url, color, edge)  -> a texture (compressed when it can be), at the smallest copy of at least `edge` px (0: the full one)
//   opt.small(url)              -> `url#768` when a 768 px copy exists (load() reads the hint), else null
//   opt.relief(url, done)       -> the work's varnish relief (normal map), when the server made one
//   opt.bytes(texture)          -> what it holds in graphics memory
const APP = new URL('../', import.meta.url);
const BUCKET = 'https://hlpzqeosdavfuzjgpwhy.supabase.co/storage/v1/object/public/works/';
let manifests = null;

const getJson = (u, ms) => Promise.race([fetch(u, { cache: 'no-cache' }).then(r => (r.ok ? r.json() : null)).catch(() => null), new Promise(r => setTimeout(() => r(null), ms))]);

// a picture's key in the manifests: its path in the app ('data/spaces/ritual/wall-x0.jpg'), on the site ('media/works/x.jpg'),
// or in the artists' bucket ('works' + '<uid>/x.jpg')
function keyOf(url) {
  const u = String(url || '').split('#')[0].split('?')[0];
  const b = u.indexOf('/storage/v1/object/public/works/');
  if (b >= 0) return ['bucket', decodeURIComponent(u.slice(b + '/storage/v1/object/public/works/'.length))];
  let p = u;
  if (/^https?:/.test(u)) { const x = new URL(u); if (x.origin !== location.origin && !/eladamsalem\.com$/.test(x.hostname)) return null; p = x.pathname; }
  p = p.replace(/^\/+/, '');
  for (const root of ['open-studio/', 'studio/app/']) { const i = p.indexOf(root); if (i >= 0 && !p.startsWith('media/')) { p = p.slice(i + root.length); break; } }
  return ['site', decodeURIComponent(p)];
}

export async function texOpt({ THREE, renderer, src = u => u }) {
  const off = new URLSearchParams(location.search).has('notexopt');      // (?notexopt: the room as it loaded before, for comparing)
  if (!manifests) manifests = getJson(new URL('data/tex.json', APP), 4000).then(async s => {      // (the artists' manifest only once the site's says it exists)
    const b = s && s.bucket ? await getJson(BUCKET + 'opt/manifest.json', 4000) : null;
    return { site: (s && s.tex) || {}, bucket: (b && b.tex) || {} };
  });
  const man = off ? { site: {}, bucket: {} } : await manifests;
  const plain = new THREE.TextureLoader(), aniso = renderer.capabilities.getMaxAnisotropy();
  let ktx = null;
  if (!off && (Object.keys(man.site).length || Object.keys(man.bucket).length)) {
    try {
      const { KTX2Loader } = await import('three/addons/loaders/KTX2Loader.js');
      ktx = new KTX2Loader().setTranscoderPath(new URL('vendor/basis/', APP).href).detectSupport(renderer);
      const w = ktx.workerConfig || {};
      if (!(w.astcSupported || w.etc2Supported || w.etc1Supported || w.bptcSupported || w.dxtSupported || w.pvrtcSupported)) ktx = null;   // (a GPU with no compressed format: the WebP and JPEG copies)
    } catch (e) { console.warn('texopt: no KTX2 loader', e); ktx = null; }
  }
  const entry = url => { const k = keyOf(url); return k ? [k[0], man[k[0]][k[1]]] : [null, null]; };
  const at = (where, p) => (where === 'bucket' ? BUCKET + p : new URL(p, APP).href);
  const hint = url => { const m = /#(\d+)$/.exec(String(url || '')); return m ? +m[1] : 0; };

  const loadPlain = (u, color) => new Promise(res => plain.load(u, t => { t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = aniso; res(t); }, undefined, () => res(null)));
  const loadKtx = (u, color) => new Promise(res => ktx.load(u, t => {
    if (t.image.width % 4 || t.image.height % 4) { t.dispose(); return res(null); }      // (a GPU refuses a block-compressed picture of any other size, and it draws black: the original instead)
    t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = aniso;
    t.userData.bytes = (t.mipmaps || []).reduce((s, m) => s + (m.data ? m.data.byteLength : 0), 0);
    res(t);
  }, undefined, () => res(null)));

  async function load(url, color = true, edge = 0) {
    if (!url) return null;
    edge = edge || hint(url);
    const bare = String(url).replace(/#\d+$/, '');
    const [where, e] = entry(bare);
    if (e) {
      const vs = e.v || [], v = (edge && vs.find(x => x[0] >= edge)) || vs[vs.length - 1];
      const fullAsked = !edge && v && v[0] < Math.max(e.w, e.h);      // (the whole picture asked for (a work up close, a room on a computer): no copy is as large, so the original)
      if (ktx && v && !fullAsked) { const t = await loadKtx(at(where, v[1]), color); if (t) return t; }
      if (edge && edge <= 768 && e.fb) { const t = await loadPlain(at(where, e.fb), color); if (t) return t; }
    }
    return loadPlain(src(bare), color);
  }
  return {
    load,
    small: url => { const [, e] = entry(url); return e && ((ktx && (e.v || []).some(v => v[0] === 768)) || e.fb) ? `${url}#768` : null; },
    relief: (url, done) => { const [where, e] = entry(url); if (!ktx || !e || !e.r) return false; loadKtx(at(where, e.r), false).then(t => t && done(t)); return true; },
    bytes: t => (!t ? 0 : t.isCompressedTexture ? t.userData.bytes || 0 : t.image ? (t.image.width || 0) * (t.image.height || 0) * 4 * (t.generateMipmaps === false ? 1 : 1.34) : 0),
    on: !!ktx,
  };
}

// a picture's size as the server measured it ([w, h]), with no download: null when it has no copies. synth.js asks before it
// loads a whole original only to read its proportions or to see whether it needs shrinking
export async function sizeKnown(url) {
  if (new URLSearchParams(location.search).has('notexopt')) return null;
  if (!manifests) manifests = getJson(new URL('data/tex.json', APP), 4000).then(async s => {      // (the artists' manifest only once the site's says it exists)
    const b = s && s.bucket ? await getJson(BUCKET + 'opt/manifest.json', 4000) : null;
    return { site: (s && s.tex) || {}, bucket: (b && b.tex) || {} };
  });
  const m = await manifests, k = keyOf(url), e = k && m[k[0]][k[1]];
  return e && e.w ? [e.w, e.h] : null;
}
