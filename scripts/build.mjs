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

const data = await loadData();
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
console.log(`Selesai: ${data.talents.length} talent, ${data.talents.reduce((n, t) => n + (t.works || []).length, 0)} portofolio → ${OUT}/`);
