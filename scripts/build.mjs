// Builds the static site into dist/.
//   DATA_URL : Apps Script web app URL (…/exec). Without it, data/sample.json is used.
//   SITE_URL : public base URL, for share previews. Default https://kbbivoices.github.io
// Usage: node scripts/build.mjs
import { readFile, writeFile, mkdir, rm, cp } from 'node:fs/promises';
import { join } from 'node:path';

const DATA_URL = (process.env.DATA_URL || '').trim();
const SITE_URL = (process.env.SITE_URL || 'https://kbbivoices.github.io').replace(/\/+$/, '');
const OUT = 'dist';

async function loadData() {
  if (!DATA_URL) {
    console.warn('DATA_URL belum diisi: memakai data/sample.json');
    return JSON.parse(await readFile('data/sample.json', 'utf8'));
  }
  const res = await fetch(DATA_URL, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Gagal mengambil data (${res.status}) dari DATA_URL`);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch {
    throw new Error('DATA_URL tidak mengembalikan JSON. Pastikan Web app di-deploy dengan akses "Anyone". Awal respons: ' + text.slice(0, 120));
  }
  if (data.error) throw new Error('Apps Script error: ' + data.error);
  if (!Array.isArray(data.talents)) throw new Error('Format data salah: "talents" tidak ditemukan');
  return data;
}

const escAttr = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const jsonForScript = v => JSON.stringify(v).replace(/</g, '\\u003c').split('\u2028').join('\\u2028').split('\u2029').join('\\u2029');
const slugOk = s => /^[a-z0-9-]+$/.test(s);

const MARK = '<span class="logo-mark" aria-hidden="true"><svg width="20" height="16" viewBox="0 0 20 16"><g fill="#221E12"><rect x="0" y="6" width="2.6" height="4" rx="1.3"/><rect x="4.3" y="3" width="2.6" height="10" rx="1.3"/><rect x="8.7" y="0" width="2.6" height="16" rx="1.3"/><rect x="13.1" y="4" width="2.6" height="8" rx="1.3"/><rect x="17.4" y="6.5" width="2.6" height="3" rx="1.3"/></g></svg></span>';
const KBBI_BRAND = `    <a class="logo" href="/" aria-label="KBBI">
      ${MARK}
      <span><b>KBBI</b><small data-i="brandSub">Voice Talent Collective</small></span>
    </a>
    <nav class="main" aria-label="Menu">
      <a href="/" data-route="home" data-i="navHome">Beranda</a>
      <a href="/#talents" data-route="talents" data-i="navTalents">Talent</a>
      <a href="/#how" data-route="how" data-i="navHow">Cara Booking</a>
    </nav>`;

// solo = nama talent → halaman mandiri: tanpa menu, tanpa merek KBBI.
function page(tpl, { route, title, desc, url, image, data, version, solo }) {
  const year = String(new Date().getFullYear());
  const vals = {
    SITE_NAME: escAttr(solo || 'KBBI Voice Talent'),
    BRAND: solo ? `    <span class="logo">${MARK}<span><b>${escAttr(solo)}</b><small data-i="soloSub">Voice Talent</small></span></span>` : KBBI_BRAND,
    FOOT: solo ? `<span>© ${year} ${escAttr(solo)}</span><span data-i="footNote"></span>`
      : `<span>© ${year} KBBI · <span data-i="brandSub">Voice Talent Collective</span></span><span data-i="footNote"></span>`,
    TITLE: escAttr(title), DESC: escAttr(desc), URL: escAttr(url),
    OG_IMAGE: image ? `<meta property="og:image" content="${escAttr(image)}">` : '',
    ROUTE: JSON.stringify(route), DATA: jsonForScript(data), VERSION: version, YEAR: year,
  };
  return tpl.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vals ? vals[k] : m));
}

// Isian "-" / "—" di form berarti kosong: buang supaya baris itu tidak tampil.
const isDash = s => /^\s*[-–—.]+\s*$/.test(s);
const isTr = o => Object.keys(o).length > 0 && Object.keys(o).every(k => ['id', 'en', 'zh'].includes(k));
function clean(v) {
  if (typeof v === 'string') return isDash(v) ? '' : v;
  if (Array.isArray(v)) return v.map(clean).filter(x => x !== '' && x != null);
  if (v && typeof v === 'object') {
    const o = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clean(x)]));
    return isTr(o) && Object.values(o).every(x => !x) ? null : o;
  }
  return v;
}

const data = clean(await loadData());
data.talents = data.talents.filter(t => t && t.slug && slugOk(t.slug));
// Label "Editor video" otomatis untuk talent yang punya portofolio editing (dipakai di kartu & filter beranda).
const EDITOR_TAG = { k: 'editor', id: 'Editor video', en: 'Video editor', zh: '视频剪辑' };
for (const t of data.talents) {
  t.tags = t.tags || [];
  if ((t.works || []).some(w => w.cast === 'editor') && !t.tags.some(g => g.k === 'editor')) t.tags.push(EDITOR_TAG);
}
// Supaya halaman tetap ringan walau talent & portofolio banyak:
//   beranda / 404 → ringkasan semua talent (portofolio hanya kategori & type cast, untuk hitungan)
//   halaman talent → data lengkap talent itu saja
const summary = t => ({
  slug: t.slug, name: t.name, ig: t.ig, photo: t.photo, tagline: t.tagline, tags: t.tags,
  works: (t.works || []).map(w => ({ cat: w.cat, cast: w.cast })),
});
const homeData = { updated: data.updated, talents: data.talents.map(summary) };

const tpl = await readFile('site/template.html', 'utf8');
const version = Date.now().toString(36);
const homeDesc = 'Kolektif pengisi suara Indonesia untuk dubbing short drama, animasi, commercial, audiobook, buku interaktif, dan narasi. Rekaman remote.';

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
await cp('site/assets', join(OUT, 'assets'), { recursive: true });
await writeFile(join(OUT, 'data.json'), JSON.stringify(data));
await writeFile(join(OUT, '.nojekyll'), '');

await writeFile(join(OUT, 'index.html'), page(tpl, {
  route: 'home', title: 'KBBI Voice Talent', desc: homeDesc, url: SITE_URL + '/', data: homeData, version,
}));
await writeFile(join(OUT, '404.html'), page(tpl, {
  route: 'notfound', title: 'Halaman tidak ditemukan · KBBI Voice Talent', desc: homeDesc, url: SITE_URL + '/', data: homeData, version,
}));
for (const t of data.talents) {
  const dir = join(OUT, 'talent', t.slug);
  await mkdir(dir, { recursive: true });
  const tagline = (t.tagline && (t.tagline.id || t.tagline.en)) || '';
  await writeFile(join(dir, 'index.html'), page(tpl, {
    route: 'talent:' + t.slug,
    title: `${t.name} · KBBI Voice Talent`,
    desc: tagline ? `${tagline}. Portofolio, voice sample & kontak.` : 'Portofolio, voice sample & kontak.',
    url: `${SITE_URL}/talent/${t.slug}/`, image: t.photo, data: { updated: data.updated, talents: [t] }, version,
  }));
  // Versi mandiri untuk dibagikan sendiri oleh talent: kbbivoices.github.io/p/<slug>/
  const soloDir = join(OUT, 'p', t.slug);
  await mkdir(soloDir, { recursive: true });
  await writeFile(join(soloDir, 'index.html'), page(tpl, {
    route: 'solo:' + t.slug,
    title: `${t.name} · Portofolio`,
    desc: tagline ? `${tagline}. Portofolio, voice sample & kontak.` : 'Portofolio, voice sample & kontak.',
    url: `${SITE_URL}/p/${t.slug}/`, image: t.photo, data: { updated: data.updated, talents: [t] }, version, solo: t.name,
  }));
}
// Link pendek ke Google Form: kbbivoices.github.io/profil, /portofolio
const SHORT_LINKS = {
  profil: ['KBBI – Profil Talent', 'Isi profil talent untuk website KBBI Voice Talent.',
    'https://docs.google.com/forms/d/e/1FAIpQLSfC75eH5HPUzkjt7YLV9cT_u1hcty6FbrkLRt5slWajiJZIQQ/viewform'],
  portofolio: ['KBBI – Tambah Portofolio', 'Tambahkan judul portofolio ke website KBBI Voice Talent.',
    'https://docs.google.com/forms/d/e/1FAIpQLSfD5wzbG2X4NPGLe9FO7T6q3Qi-btYRw0JnFB3qAui639hmcA/viewform'],
};
for (const [path, [title, desc, target]] of Object.entries(SHORT_LINKS)) {
  await mkdir(join(OUT, path), { recursive: true });
  const t = escAttr(title), d = escAttr(desc), u = escAttr(target);
  await writeFile(join(OUT, path, 'index.html'), `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t}</title><meta name="description" content="${d}">
<meta property="og:title" content="${t}"><meta property="og:description" content="${d}"><meta property="og:url" content="${SITE_URL}/${path}/">
<meta name="robots" content="noindex"><meta http-equiv="refresh" content="0; url=${u}">
<script>location.replace(${JSON.stringify(target)})</script>
<style>body{font-family:system-ui,sans-serif;background:#FFFBEA;color:#2A2416;display:grid;place-items:center;min-height:100vh;margin:0;padding:16px;text-align:center}a{color:#8A5A00}</style>
</head><body><p>Membuka form…<br><a href="${u}">Klik di sini kalau tidak terbuka otomatis</a></p></body></html>
`);
}

console.log(`Selesai: ${data.talents.length} talent, ${data.talents.reduce((n, t) => n + (t.works || []).length, 0)} portofolio → ${OUT}/`);
