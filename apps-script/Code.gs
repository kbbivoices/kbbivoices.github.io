/**
 * KBBI Voice Talent — backend data website (Google Apps Script)
 *
 * Isi file ini:
 *  - setup()            : jalankan SEKALI. Membuat spreadsheet, 2 Google Form, trigger, dan data awal Aini.
 *  - doGet()            : alamat data (JSON) untuk website. Aktif setelah di-Deploy sebagai Web app.
 *  - handleFormSubmit() : otomatis jalan saat form dikirim. Mengirim link edit ke email pengisi.
 *
 * Panduan lengkap: SETUP.md
 */

const CFG = {
  sheetTitle: 'KBBI – Data Website',
  defaultTalents: ['Aini', 'Ica', 'Dian', 'Sharon', 'Puji', 'Alice', 'Yeshiva'],
};

/* Judul pertanyaan = judul kolom di sheet. Jangan ganti judul pertanyaan di form setelah setup. */
const Q = {
  name: 'Nama panggilan', ig: 'Username Instagram', photo: 'Link foto profil', tagline: 'Deskripsi singkat', bio: 'Bio',
  avail: 'Status ketersediaan', tz: 'Zona waktu',
  tags: 'Voice tag', lang: 'Bahasa yang dikuasai', accent: 'Aksen daerah', age: 'Rentang usia suara', skills: 'Kemampuan khusus',
  reel: 'Link demo reel', raw: 'Link raw sample',
  s1t: 'Sample 1 – judul', s1l: 'Sample 1 – link', s2t: 'Sample 2 – judul', s2l: 'Sample 2 – link', s3t: 'Sample 3 – judul', s3l: 'Sample 3 – link',
  allS: 'Link daftar lengkap voice sample', vids: 'Link video / reels',
  mic: 'Mikrofon', iface: 'Audio interface', hp: 'Headphone', pc: 'Komputer / laptop', daw: 'DAW', room: 'Room treatment', acc: 'Aksesoris',
  file: 'Format file', sess: 'Sesi live-directed', sync: 'Bisa rekam sambil menonton video (lip-sync)?', studioPhoto: 'Link foto home studio',
  clients: 'PH / agency / klien', comm: 'Pelatihan & komunitas',
};
const P = {
  talent: 'Nama talent', cat: 'Kategori', title: 'Judul', orig: 'Judul asli', role: 'Peran', cast: 'Type cast',
  platform: 'Platform tayang', link: 'Link tonton', img: 'Link gambar', note: 'Catatan',
};
const ADMIN = { status: 'status (admin)', show: 'tampilkan (admin)' };

const TAGS = [
  ['kid', 'Suara anak', 'Kid', '童声'], ['teen', 'Remaja', 'Teen', '少年音'],
  ['adultF', 'Wanita dewasa', 'Adult female', '成年女声'], ['adultM', 'Pria dewasa', 'Adult male', '成年男声'],
  ['cheerful', 'Ceria', 'Cheerful', '活泼'], ['soft', 'Lembut', 'Soft', '温柔'], ['cute', 'Imut', 'Cute', '可爱'],
  ['deep', 'Berat', 'Deep', '低沉'], ['elder', 'Lansia', 'Elderly', '老年'], ['narrator', 'Narator', 'Narrator', '旁白'],
  ['villain', 'Antagonis', 'Villain', '反派'], ['toon', 'Karakter animasi', 'Animated character', '动画角色'],
  ['singer', 'Bisa bernyanyi', 'Singer', '会唱歌'],
];
const CATS = [
  ['drama', 'Short Drama'], ['animation', 'Animasi'], ['commercial', 'Commercial'],
  ['audiobook', 'Audiobook & Dongeng'], ['interactive', 'Edukasi & Interaktif'], ['narration', 'Narasi'],
];
const CASTS = [['main', 'Pemeran Utama'], ['support', 'Pemeran Pendukung'], ['extra', 'Figuran'], ['editor', 'Editor video'], ['', 'Tidak ada (iklan / narasi)']];

/* Terjemahan tetap untuk pilihan jawaban (lebih rapi dari terjemahan mesin). */
const FIXED = {
  'Bahasa Indonesia': ['Indonesian', '印尼语'], 'English': ['English', '英语'], 'Mandarin': ['Mandarin', '普通话'],
  'Jawa': ['Javanese', '爪哇语'], 'Sunda': ['Sundanese', '巽他语'],
  'Anak (4–10 th)': ['Kids (4–10)', '儿童（4–10 岁）'], 'Remaja': ['Teens', '青少年'], 'Dewasa muda': ['Young adult', '青年'],
  'Dewasa': ['Adult', '成年'], 'Lansia': ['Elderly', '老年'],
  'Bernyanyi': ['Singing', '唱歌'], 'Akting menangis & berteriak': ['Crying & screaming', '哭戏与尖叫'],
  'Efek suara / suara makhluk': ['Sound effects / creature voices', '音效 / 生物音'], 'Suara sistem / AI': ['System / AI voice', '系统音 / AI'],
  'Banyak karakter (multi-voice)': ['Multiple characters (multi-voice)', '一人多角'],
  'Tersedia untuk proyek baru': ['Available for new projects', '可接新项目'], 'Sedang penuh': ['Fully booked', '档期已满'],
};

/* ============================== SETUP ============================== */

function setup() {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('SS_ID')) {
    throw new Error('Setup sudah pernah dijalankan. Jalankan showLinks() untuk melihat link-nya lagi.');
  }
  const ss = SpreadsheetApp.create(CFG.sheetTitle);
  const first = ss.getSheets()[0];

  const fProfile = buildProfileForm_();
  const shTalents = linkForm_(ss, fProfile, 'talents');
  const fPortfolio = buildPortfolioForm_();
  const shPortfolio = linkForm_(ss, fPortfolio, 'portfolio');

  first.setName('terjemahan');
  first.getRange(1, 1, 1, 3).setValues([['id', 'en', 'zh']]).setFontWeight('bold');
  first.setFrozenRows(1);
  first.getRange('E1').setValue('Terjemahan otomatis tersimpan di sini. Kalau hasilnya aneh, perbaiki langsung di kolom en / zh.');

  addAdminColumn_(shTalents, ADMIN.status, ['aktif', 'nonaktif']);
  addAdminColumn_(shPortfolio, ADMIN.show, ['ya', 'tidak']);

  props.setProperties({ SS_ID: ss.getId(), FORM_PROFILE: fProfile.getId(), FORM_PORTFOLIO: fPortfolio.getId() });
  ScriptApp.newTrigger('handleFormSubmit').forForm(fProfile).onFormSubmit().create();
  ScriptApp.newTrigger('handleFormSubmit').forForm(fPortfolio).onFormSubmit().create();

  seedAini_(shTalents, shPortfolio);
  refreshTalentChoices_();
  showLinks();
}

function showLinks() {
  const p = PropertiesService.getScriptProperties();
  const ss = SpreadsheetApp.openById(p.getProperty('SS_ID'));
  const fp = FormApp.openById(p.getProperty('FORM_PROFILE'));
  const fw = FormApp.openById(p.getProperty('FORM_PORTFOLIO'));
  Logger.log('Spreadsheet               : ' + ss.getUrl());
  Logger.log('Form Profil Talent (bagikan) : ' + fp.getPublishedUrl());
  Logger.log('Form Tambah Portofolio (bagikan): ' + fw.getPublishedUrl());
  Logger.log('Edit form Profil          : ' + fp.getEditUrl());
  Logger.log('Edit form Portofolio      : ' + fw.getEditUrl());
}

function linkForm_(ss, form, name) {
  const before = ss.getSheets().map(s => s.getSheetId());
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  for (let i = 0; i < 20; i++) {
    SpreadsheetApp.flush();
    const sh = SpreadsheetApp.openById(ss.getId()).getSheets().find(s => before.indexOf(s.getSheetId()) < 0);
    if (sh && sh.getLastColumn() > 1) {
      sh.setName(name);
      sh.setFrozenRows(1);
      return sh;
    }
    Utilities.sleep(1500);
  }
  throw new Error('Sheet jawaban untuk form "' + form.getTitle() + '" tidak muncul. Coba jalankan setup lagi.');
}

function addAdminColumn_(sh, header, values) {
  const col = sh.getLastColumn() + 1;
  sh.getRange(1, col).setValue(header).setFontWeight('bold').setBackground('#FFF3C4');
  const rule = SpreadsheetApp.newDataValidation().requireValueInList(values, true).setAllowInvalid(false).build();
  sh.getRange(2, col, 999, 1).setDataValidation(rule);
}

/* ============================== FORMS ============================== */

function baseForm_(title, desc, confirm) {
  const f = FormApp.create(title);
  f.setDescription(desc);
  try { f.setEmailCollectionType(FormApp.EmailCollectionType.RESPONDER_INPUT); } catch (e) { f.setCollectEmail(true); }
  f.setAllowResponseEdits(true);
  f.setProgressBar(true);
  f.setConfirmationMessage(confirm);
  return f;
}
function text_(f, t, help, req) { return f.addTextItem().setTitle(t).setHelpText(help || '').setRequired(!!req); }
function para_(f, t, help, req) { return f.addParagraphTextItem().setTitle(t).setHelpText(help || '').setRequired(!!req); }
function choice_(f, t, help, opts, req, other) { const i = f.addMultipleChoiceItem().setTitle(t).setHelpText(help || '').setChoiceValues(opts).setRequired(!!req); if (other) i.showOtherOption(true); return i; }
function checks_(f, t, help, opts, req, other) { const i = f.addCheckboxItem().setTitle(t).setHelpText(help || '').setChoiceValues(opts).setRequired(!!req); if (other) i.showOtherOption(true); return i; }
function page_(f, t, help) { f.addPageBreakItem().setTitle(t).setHelpText(help || ''); }

const DRIVE_HELP = 'Upload ke Google Drive → klik Bagikan → ubah akses jadi "Siapa saja yang memiliki link" → Salin link.';

function buildProfileForm_() {
  const f = baseForm_('KBBI – Profil Talent',
    'Isi profilmu untuk website KBBI. Cukup diisi sekali. Setelah dikirim, kamu menerima email berisi link untuk mengedit jawaban kapan saja.\n\n' +
    'Semua link Google Drive harus bisa dibuka "Siapa saja yang memiliki link". Kolom yang tidak wajib boleh dikosongkan.',
    'Terima kasih! Link untuk mengedit profil sudah dikirim ke email kamu. Profil tampil di website setelah dicek admin.');

  text_(f, Q.name, 'Dipakai di website dan link profil (contoh: Aini → …/talent-aini). Jangan diganti-ganti supaya link tidak berubah.', true);
  text_(f, Q.ig, 'Tanpa @. Klien akan DM ke akun ini untuk tanya rate card.', true);
  text_(f, Q.photo, 'Foto persegi, wajah di tengah. ' + DRIVE_HELP);
  text_(f, Q.tagline, 'Satu baris. Contoh: Suara anak, karakter animasi & iklan', true);
  para_(f, Q.bio, '2–4 kalimat tentang pengalamanmu. Cukup Bahasa Indonesia, terjemahan English & Mandarin dibuat otomatis.');
  choice_(f, Q.avail, '', ['Tersedia untuk proyek baru', 'Sedang penuh'], true);
  choice_(f, Q.tz, '', ['WIB (UTC+7)', 'WITA (UTC+8)', 'WIT (UTC+9)'], false, true);

  page_(f, 'Suara', 'Bantu klien menemukan suaramu lewat filter di website.');
  checks_(f, Q.tags, 'Pilih yang paling sesuai (maks. 5).', TAGS.map(t => t[1]), true);
  checks_(f, Q.lang, '', ['Bahasa Indonesia', 'English', 'Mandarin', 'Jawa', 'Sunda'], false, true);
  text_(f, Q.accent, 'Contoh: Jawa, Betawi, Medan. Kosongkan kalau tidak ada.');
  checks_(f, Q.age, 'Usia karakter yang bisa kamu suarakan.', ['Anak (4–10 th)', 'Remaja', 'Dewasa muda', 'Dewasa', 'Lansia']);
  checks_(f, Q.skills, '', ['Bernyanyi', 'Akting menangis & berteriak', 'Efek suara / suara makhluk', 'Suara sistem / AI', 'Banyak karakter (multi-voice)'], false, true);

  page_(f, 'Voice sample & video', 'Link YouTube atau Google Drive. Voice sample di Drive: matikan opsi download untuk viewer.');
  text_(f, Q.reel, 'Video/audio 60–90 detik berisi potongan terbaikmu. Tampil paling atas di profil. Mau pakai gambar sampul sendiri? Format: link video | link gambar (YouTube & video Drive: sampul otomatis).');
  text_(f, Q.raw, 'Rekaman langsung dari mic tanpa noise reduction & EQ, supaya klien bisa menilai kualitas ruangan.');
  text_(f, Q.s1t, 'Contoh: Anak perempuan · ceria');
  text_(f, Q.s1l, DRIVE_HELP);
  text_(f, Q.s2t, '');
  text_(f, Q.s2l, '');
  text_(f, Q.s3t, '');
  text_(f, Q.s3l, '');
  text_(f, Q.allS, 'Link Google Sheet atau folder Drive berisi semua voice sample-mu.');
  para_(f, Q.vids, 'Satu video per baris, maksimal 10. Format: Judul | link video | link gambar sampul. Judul & gambar boleh dikosongkan (YouTube: sampul otomatis). Contoh: Kun Kun eps. 3 | https://youtu.be/xxxx. Bisa YouTube, TikTok, Instagram Reels, atau Google Drive.');

  page_(f, 'Home studio', 'Klien perlu yakin kualitas rekaman remote-mu.');
  text_(f, Q.mic, 'Pisahkan dengan koma kalau lebih dari satu. Contoh: Audio-Technica AT2035, Rode NT1');
  text_(f, Q.iface, '');
  text_(f, Q.hp, 'Pisahkan dengan koma kalau lebih dari satu.');
  text_(f, Q.pc, 'Contoh: Asus Vivobook S14 · Ryzen 9 · RAM 32 GB · Windows');
  text_(f, Q.daw, 'Contoh: Reaper, Audacity, Adobe Audition');
  text_(f, Q.room, 'Contoh: Panel absorber (6 panel)');
  text_(f, Q.acc, 'Contoh: Stand mic, pop filter, shock mount');
  checks_(f, Q.file, '', ['WAV', 'MP3', 'FLAC'], false, true);
  checks_(f, Q.sess, 'Aplikasi yang bisa dipakai saat klien/sutradara ikut mendengarkan rekaman.', ['Zoom', 'Google Meet', 'Discord', 'Cleanfeed', 'Source-Connect'], false, true);
  choice_(f, Q.sync, '', ['Ya', 'Tidak']);
  text_(f, Q.studioPhoto, 'Opsional. ' + DRIVE_HELP);

  page_(f, 'Kredibilitas', '');
  text_(f, Q.clients, 'Pisahkan dengan koma. Tulis hanya yang boleh disebut (cek NDA / izin PH).');
  text_(f, Q.comm, 'Pelatihan, kelas, atau komunitas voice acting. Pisahkan dengan koma.');
  return f;
}

function buildPortfolioForm_() {
  const f = baseForm_('KBBI – Tambah Portofolio',
    'Satu pengiriman = satu judul. Kirim lagi untuk menambah judul berikutnya. Link edit dikirim ke email setelah submit.',
    'Tersimpan! Judul ini tampil di website pada update berikutnya. Kirim lagi untuk menambah judul lain.');
  f.addListItem().setTitle(P.talent).setChoiceValues(CFG.defaultTalents).setRequired(true)
    .setHelpText('Namamu tidak ada? Isi dulu form Profil Talent.');
  choice_(f, P.cat, '', CATS.map(c => c[1]), true);
  text_(f, P.title, 'Judul yang tayang (Bahasa Indonesia, atau judul aslinya kalau tidak ada versi Indonesia).', true);
  text_(f, P.orig, 'Opsional. Judul asli, misalnya judul Mandarin. Tampil di versi 中文 website.');
  text_(f, P.role, 'Nama karakter atau peran. Contoh: Yaya, Gadis 1, Narator. Untuk editor: yang dikerjakan, contoh: Cutting, subtitle, sync audio.', true);
  choice_(f, P.cast, '', CASTS.map(c => c[1]), true);
  text_(f, P.platform, 'Opsional. Contoh: Melolo, YouTube · LOF KUN Indonesia');
  text_(f, P.link, 'Opsional. Link YouTube/Drive bisa langsung diputar di website.');
  text_(f, P.img, 'Opsional. Screenshot karakter (potret/tegak lebih bagus). ' + DRIVE_HELP);
  text_(f, P.note, 'Opsional. Contoh: 8 episode, belum rilis, dry dubbing');
  return f;
}

/* ========================= SAAT FORM DIKIRIM ========================= */

function handleFormSubmit(e) {
  const p = PropertiesService.getScriptProperties();
  const isProfile = e.source.getId() === p.getProperty('FORM_PROFILE');
  const email = e.response.getRespondentEmail();
  if (email) {
    MailApp.sendEmail({
      to: email,
      subject: isProfile ? 'KBBI – link edit profil kamu' : 'KBBI – link edit portofolio',
      body: 'Halo!\n\nTerima kasih sudah mengisi ' + (isProfile ? 'profil' : 'portofolio') + ' untuk website KBBI.\n' +
        'Simpan email ini. Kalau mau mengubah jawaban, buka link berikut:\n\n' + e.response.getEditResponseUrl() + '\n\n' +
        (isProfile ? 'Profil baru tampil setelah dicek admin. ' : '') +
        'Perubahan muncul di website pada update berikutnya (maksimal 6 jam).\n\n— KBBI',
    });
  }
  if (isProfile) refreshTalentChoices_();
}

function refreshTalentChoices_() {
  const p = PropertiesService.getScriptProperties();
  const ss = SpreadsheetApp.openById(p.getProperty('SS_ID'));
  const names = CFG.defaultTalents.slice();
  readRows_(ss.getSheetByName('talents')).forEach(r => {
    const n = str_(r[Q.name]);
    if (n && !names.some(x => slugify_(x) === slugify_(n))) names.push(n);
  });
  const form = FormApp.openById(p.getProperty('FORM_PORTFOLIO'));
  const item = form.getItems(FormApp.ItemType.LIST).find(i => i.getTitle() === P.talent);
  if (item) item.asListItem().setChoiceValues(names);
}

/* ============================ DATA (JSON) ============================ */

function doGet() {
  let out;
  try { out = buildData_(); } catch (err) { out = { error: String(err) }; }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function buildData_() {
  const ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SS_ID'));
  const T = new Translator_(ss.getSheetByName('terjemahan'));

  // Profil terbaru per talent. Status = status terakhir yang diisi admin untuk talent itu.
  const latest = {}, status = {}, order = [];
  readRows_(ss.getSheetByName('talents')).sort((a, b) => a._ts - b._ts).forEach(r => {
    const name = str_(r[Q.name]);
    if (!name) return;
    const slug = slugify_(name);
    if (!latest[slug]) order.push(slug);
    latest[slug] = r;
    const st = str_(r[ADMIN.status]).toLowerCase();
    if (st) status[slug] = st;
  });

  const talents = order.filter(s => status[s] === 'aktif').map(s => talentObj_(s, latest[s], T));
  const bySlug = {};
  talents.forEach(t => { bySlug[t.slug] = t; });

  readRows_(ss.getSheetByName('portfolio')).forEach(r => {
    if (str_(r[ADMIN.show]).toLowerCase() === 'tidak') return;
    const t = bySlug[slugify_(str_(r[P.talent]))];
    const w = t && workObj_(r, T);
    if (w) t.works.push(w);
  });

  T.save();
  return { updated: new Date().toISOString(), talents: talents };
}

function talentObj_(slug, r, T) {
  const tags = list_(r[Q.tags]).map(l => {
    const t = TAGS.find(x => x[1] === l);
    return t ? { k: t[0], id: t[1], en: t[2], zh: t[3] } : Object.assign({ k: slugify_(l) }, T.all(l));
  });
  const samples = [];
  if (str_(r[Q.raw])) samples.push({ raw: true, url: str_(r[Q.raw]) });
  [[Q.s1t, Q.s1l], [Q.s2t, Q.s2l], [Q.s3t, Q.s3l]].forEach(([a, b]) => {
    if (str_(r[b])) samples.push({ title: T.all(str_(r[a]) || 'Voice sample'), url: str_(r[b]) });
  });
  const voice = [];
  if (list_(r[Q.lang]).length) voice.push({ k: 'fLang', v: T.join(list_(r[Q.lang])) });
  if (str_(r[Q.accent])) voice.push({ k: 'fAccent', v: T.all(str_(r[Q.accent])) });
  if (list_(r[Q.age]).length) voice.push({ k: 'fAge', v: T.join(list_(r[Q.age])) });
  if (str_(r[Q.tz])) voice.push({ k: 'fTz', v: str_(r[Q.tz]) });

  return {
    slug: slug,
    name: str_(r[Q.name]),
    ig: str_(r[Q.ig]).replace(/^@/, ''),
    photo: img_(r[Q.photo]),
    tagline: T.all(str_(r[Q.tagline])),
    bio: T.all(str_(r[Q.bio])),
    tags: tags,
    avail: str_(r[Q.avail]) === 'Tersedia untuk proyek baru',
    voice: voice,
    skills: list_(r[Q.skills]).map(s => T.all(s)),
    reel: reel_(r[Q.reel]),
    samples: samples,
    samplesAll: str_(r[Q.allS]) || null,
    videos: videos_(r[Q.vids], T),
    clients: list_(r[Q.clients]),
    community: list_(r[Q.comm]).map(n => ({ n: n })),
    studio: {
      photo: img_(r[Q.studioPhoto]),
      mic: list_(r[Q.mic]), iface: str_(r[Q.iface]), hp: list_(r[Q.hp]), pc: str_(r[Q.pc]), daw: str_(r[Q.daw]),
      room: T.all(str_(r[Q.room])), acc: T.all(str_(r[Q.acc])), file: list_(r[Q.file]).join(', '),
      session: list_(r[Q.sess]), sync: str_(r[Q.sync]) === 'Ya',
    },
    works: [],
  };
}

function workObj_(r, T) {
  const title = str_(r[P.title]);
  if (!title) return null;
  const cat = (CATS.find(c => c[1] === str_(r[P.cat])) || ['drama'])[0];
  const cast = (CASTS.find(c => c[1] === str_(r[P.cast])) || [''])[0];
  return {
    cat: cat,
    title: T.all(title),
    orig: str_(r[P.orig]) || null,
    role: T.all(str_(r[P.role])),
    cast: cast || null,
    platform: str_(r[P.platform]) || null,
    link: str_(r[P.link]) || null,
    img: img_(r[P.img]),
    note: T.all(str_(r[P.note])),
  };
}

/* ============================== HELPERS ============================== */

function Translator_(sh) {
  this.sh = sh;
  this.map = {};
  this.added = [];
  const v = sh.getDataRange().getValues();
  for (let i = 1; i < v.length; i++) {
    if (v[i][0] !== '') this.map[String(v[i][0])] = { en: String(v[i][1] || ''), zh: String(v[i][2] || '') };
  }
}
Translator_.prototype.all = function (s) {
  s = str_(s);
  if (!s) return null;
  if (FIXED[s]) return { id: s, en: FIXED[s][0], zh: FIXED[s][1] };
  let m = this.map[s];
  if (!m) {
    m = { en: translate_(s, 'en'), zh: translate_(s, 'zh-CN') };
    this.map[s] = m;
    this.added.push([s, m.en, m.zh]);
  }
  return { id: s, en: m.en || s, zh: m.zh || s };
};
Translator_.prototype.join = function (arr) {
  const parts = arr.map(a => this.all(a));
  return { id: parts.map(p => p.id).join(', '), en: parts.map(p => p.en).join(', '), zh: parts.map(p => p.zh).join('、') };
};
Translator_.prototype.save = function () {
  if (this.added.length) this.sh.getRange(this.sh.getLastRow() + 1, 1, this.added.length, 3).setValues(this.added);
};
function translate_(s, to) {
  try { return LanguageApp.translate(s, '', to); } catch (e) { return ''; }
}

function readRows_(sh) {
  const v = sh.getDataRange().getValues();
  if (v.length < 2) return [];
  const h = v[0].map(String);
  return v.slice(1).filter(row => row.some(c => c !== '')).map(row => {
    const o = { _ts: row[0] instanceof Date ? row[0].getTime() : 0 };
    h.forEach((k, i) => { o[k] = row[i]; });
    return o;
  });
}
function str_(v) { return v == null ? '' : String(v).trim(); }
function list_(v) { return str_(v).split(/\s*[,\n]\s*/).filter(Boolean); }
function slugify_(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
/* Demo reel: "link video" atau "link video | link gambar sampul". */
function reel_(v) {
  const urls = str_(v).split('|').map(s => s.trim()).filter(s => /^https?:\/\//.test(s));
  if (!urls.length) return null;
  return urls[1] ? { url: urls[0], img: img_(urls[1]) } : { url: urls[0] };
}
/* Satu video per baris: "Judul | link video | link gambar sampul". Judul & gambar opsional; link saja juga boleh. */
function videos_(v, T) {
  const out = [];
  str_(v).split(/\n+/).forEach(line => {
    if (line.indexOf('|') >= 0) {
      const parts = line.split('|').map(s => s.trim()).filter(Boolean);
      const urls = parts.filter(s => /^https?:\/\//.test(s));
      const title = parts.find(s => !/^https?:\/\//.test(s));
      if (!urls.length) return;
      const o = { url: urls[0] };
      if (title) o.title = T.all(title);
      if (urls[1]) o.img = img_(urls[1]);
      out.push(o);
      return;
    }
    const urls = line.match(/https?:\/\/[^\s,|]+/g) || [];
    const title = urls.length === 1 ? line.replace(urls[0], '').replace(/^[\s|,:;–—-]+|[\s|,:;–—-]+$/g, '') : '';
    urls.forEach(u => out.push(title ? { url: u, title: T.all(title) } : { url: u }));
  });
  return out.slice(0, 10);
}
function img_(v) {
  const s = str_(v);
  if (!s) return null;
  const m = s.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:.*&)?id=)([\w-]+)/);
  if (m) return 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w800';
  return /^https?:\/\//.test(s) ? s : null;
}

/* ============================ DATA AWAL AINI ============================ */

function writeRow_(sh, obj) {
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  const row = headers.map((h, i) => (i === 0 ? new Date() : (obj[h] !== undefined ? obj[h] : '')));
  sh.appendRow(row);
}

function seedAini_(shTalents, shPortfolio) {
  writeRow_(shTalents, {
    [Q.name]: 'Aini', [Q.ig]: 'rainaini.voices', [Q.tagline]: 'Suara anak, karakter animasi & iklan',
    [Q.bio]: 'Pengisi suara yang berpengalaman di short drama, serial animasi YouTube, animasi, dan iklan. Paling sering memerankan anak perempuan dan anak laki-laki, juga karakter animasi yang ceria. Merekam secara remote.',
    [Q.avail]: 'Tersedia untuk proyek baru', [Q.tz]: 'WIB (UTC+7)',
    [Q.tags]: 'Suara anak, Imut, Ceria, Karakter animasi, Bisa bernyanyi',
    [Q.lang]: 'Bahasa Indonesia', [Q.age]: 'Anak (4–10 th), Remaja, Dewasa muda',
    [Q.skills]: 'Bernyanyi, Akting menangis & berteriak, Suara sistem / AI',
    [Q.vids]: 'https://www.youtube.com/watch?v=w6TqP6ojKas&t=28s\nhttps://drive.google.com/file/d/1Vzzdca0AiWH6oGEOBGNGEdKoCMuJhds5/view?usp=sharing',
    [Q.mic]: 'Audio-Technica ATR2100x, Audio-Technica AT2035, Marantz Professional MPM-2000U',
    [Q.iface]: 'Arturia MiniFuse 4', [Q.hp]: 'Sony MDR-7506, Dolphin Sound DS-50',
    [Q.pc]: 'Asus Vivobook S14 · Ryzen 9 · RAM 32 GB · Windows', [Q.daw]: 'Reaper',
    [Q.room]: 'Panel absorber (6 panel)', [Q.acc]: 'Stand mic Samson & pop filter Samson',
    [Q.file]: 'WAV, MP3', [Q.sess]: 'Zoom, Google Meet', [Q.sync]: 'Ya',
    [Q.clients]: 'Kolam Susu', [Q.comm]: 'Echo-Lab Voice Acting Club',
    [ADMIN.status]: 'aktif',
  });
  const KUNKUN = 'https://www.youtube.com/watch?v=w6TqP6ojKas&t=28s';
  const FINNA = 'https://drive.google.com/file/d/1Vzzdca0AiWH6oGEOBGNGEdKoCMuJhds5/view?usp=sharing';
  const MELOLO = 'https://www.melolo.org/page/share-drama?sid=7284644875541150922&vid=7284498350638890234&lang=id&did=7369489688081282795';
  const NONE = 'Tidak ada (iklan / narasi)';
  [ // kategori, judul, judul asli, peran, type cast, platform, link, catatan
    ['Short Drama', 'Putri Hoki Sang Jendral', '督军,你家小福包有祖传乌鸦嘴', 'Yaya', 'Pemeran Utama', 'Melolo', MELOLO, ''],
    ['Short Drama', 'Mantan Istriku Memohon Rujuk', '', 'Gadis dalam Lukisan', 'Figuran', '', '', ''],
    ['Short Drama', 'Ghar Wapsi', '', 'Little Ajju', 'Figuran', '', '', ''],
    ['Short Drama', 'Anjing Desa Jadi Raja Anjing', '农家犬登顶成犬王', 'Perempuan 1 (Sistem)', 'Pemeran Pendukung', '', '', ''],
    ['Short Drama', 'Bangkit Dari Luka', '', 'Gadis 1 (Melati)', 'Figuran', '', '', ''],
    ['Short Drama', 'Mommy, Daddy is the Supreme Dragonrider', '', 'Aurora', 'Pemeran Pendukung', '', '', ''],
    ['Short Drama', 'Setelah Surat Cerai, Aku Bawa Keluarga Ibuku Kaya Raya', '一纸休书后-我带娘家暴富', 'Putra', 'Figuran', '', '', ''],
    ['Short Drama', 'Gadis Bisu dengan Kekuatan Sakti', '言灵一诺,岁岁静安', 'Putri Nirmala Kecil', 'Figuran', '', '', ''],
    ['Short Drama', 'Gadis Bisu dengan Kekuatan Sakti', '言灵一诺,岁岁静安', 'Gadis 1', 'Figuran', '', '', ''],
    ['Short Drama', "Don't Touch the Legendary Lawyer's Grandson", '', 'Theo', 'Figuran', '', '', ''],
    ['Short Drama', 'Boss Biwi Dabangg Pati', '', 'Amayra', 'Pemeran Pendukung', '', '', ''],
    ['Short Drama', 'Akhiri Rasta', '', 'Dia', 'Figuran', '', '', ''],
    ['Animasi', 'Petualangan ke Planet Susu Jeli Kun Kun', '', 'Talka / Bawel', 'Pemeran Utama', 'YouTube · LOF KUN Indonesia', KUNKUN, '8 episode'],
    ['Animasi', 'Lili Putih', '', 'Mika', 'Pemeran Utama', '', '', 'Proyek mahasiswa ISI'],
    ['Commercial', 'Iklan Finna Food (Sambel Uleg Spesial Lebaran)', '', 'Nina', NONE, 'YouTube / Instagram', FINNA, ''],
    ['Commercial', 'VO Dongeng', '', 'Pomi', NONE, '', '', 'Belum rilis'],
    ['Edukasi & Interaktif', 'Baby Bus Encyclopedia', '', 'Lia', 'Pemeran Utama', '', '', 'Buku bunyi interaktif · dry dubbing'],
  ].forEach(w => writeRow_(shPortfolio, {
    [P.talent]: 'Aini', [P.cat]: w[0], [P.title]: w[1], [P.orig]: w[2], [P.role]: w[3], [P.cast]: w[4],
    [P.platform]: w[5], [P.link]: w[6], [P.note]: w[7],
  }));
}
