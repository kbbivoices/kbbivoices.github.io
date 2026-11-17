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

function page(tpl, { route, title, desc, url, image, data, version }) {
  const vals = {
    TITLE: escAttr(title), DESC: escAttr(desc), URL: escAttr(url),
    OG_IMAGE: image ? `<meta property="og:image" content="${escAttr(image)}">` : '',
    ROUTE: JSON.stringify(route), DATA: jsonForScript(data), VERSION: version, YEAR: String(new Date().getFullYear()),
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
const tpl = await readFile('site/template.html', 'utf8');
const version = Date.now().toString(36);
const homeDesc = 'Kolektif pengisi suara Indonesia untuk dubbing short drama, animasi, commercial, audiobook, buku interaktif, dan narasi. Rekaman remote.';

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
await cp('site/assets', join(OUT, 'assets'), { recursive: true });
await writeFile(join(OUT, 'data.json'), JSON.stringify(data));
await writeFile(join(OUT, '.nojekyll'), '');

await writeFile(join(OUT, 'index.html'), page(tpl, {
  route: 'home', title: 'KBBI Voice Talent', desc: homeDesc, url: SITE_URL + '/', data, version,
}));
await writeFile(join(OUT, '404.html'), page(tpl, {
  route: 'notfound', title: 'Halaman tidak ditemukan · KBBI Voice Talent', desc: homeDesc, url: SITE_URL + '/', data, version,
}));
for (const t of data.talents) {
  const dir = join(OUT, 'talent', t.slug);
  await mkdir(dir, { recursive: true });
  const tagline = (t.tagline && (t.tagline.id || t.tagline.en)) || '';
  await writeFile(join(dir, 'index.html'), page(tpl, {
    route: 'talent:' + t.slug,
    title: `${t.name} · KBBI Voice Talent`,
    desc: tagline ? `${tagline}. Portofolio, voice sample & kontak.` : 'Portofolio, voice sample & kontak.',
    url: `${SITE_URL}/talent/${t.slug}/`, image: t.photo, data, version,
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
