# KBBI Voice Talent

Website portofolio kolektif pengisi suara KBBI → https://kbbivoices.github.io

Data talent diisi lewat Google Form dan tersimpan di Google Sheet. Website membaca data itu
secara otomatis, jadi tidak ada yang perlu mengedit kode untuk menambah talent atau portofolio.

## Cara kerja

```
Google Form ──► Google Sheet ──► Apps Script (alamat data /exec)
                                        │
                     GitHub Actions (tiap 6 jam / manual)
                                        │
                     halaman statis ──► kbbivoices.github.io
```

| Folder | Isi |
|---|---|
| `apps-script/` | Script Google Sheet + Form. Panduan: `apps-script/SETUP.md` |
| `site/` | Tampilan website (`template.html`, `assets/app.css`, `assets/app.js`) |
| `scripts/build.mjs` | Mengambil data dan membuat halaman per talent (`/talent/<nama>/`) |
| `data/sample.json` | Data contoh, dipakai kalau `DATA_URL` belum diisi |
| `.github/workflows/deploy.yml` | Build & publish otomatis |

## Setup GitHub (sekali)

1. Repository ini ada di organization **kbbivoices** dengan nama **kbbivoices.github.io** (Public).
2. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. **Settings → Secrets and variables → Actions → tab Variables → New repository variable**
   - Name: `DATA_URL`
   - Value: Web app URL dari Apps Script (berakhiran `/exec`)
4. **Actions → Build & deploy → Run workflow**. Setelah centang hijau, website aktif di https://kbbivoices.github.io

## Sehari-hari

- **Data baru tampil** otomatis maksimal 6 jam setelah form diisi.
  Mau langsung? **Actions → Build & deploy → Run workflow**.
- **Talent baru** tampil setelah admin mengisi `status (admin)` = `aktif` di sheet.
- **Link profil**: `https://kbbivoices.github.io/talent/<nama-panggilan>/`
- **Tambah `?lang=zh`** di akhir link untuk mengirim versi Mandarin ke klien China
  (atau `?lang=en` untuk English).

## Catatan

- GitHub menghentikan jadwal otomatis kalau repository tidak ada aktivitas selama 60 hari.
  Kalau data berhenti ter-update, buka tab **Actions** lalu aktifkan lagi workflow-nya.
- Kalau build gagal (misalnya Apps Script error), website tetap menampilkan versi terakhir yang berhasil.

## Preview di laptop

```bash
node scripts/build.mjs          # pakai data/sample.json
npx serve dist                  # buka http://localhost:3000
```
Pakai data asli: `DATA_URL="https://script.google.com/macros/s/…/exec" node scripts/build.mjs`
