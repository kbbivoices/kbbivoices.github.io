# Setup Google Sheet + Form KBBI

Sekali jalan, kira-kira 10 menit. Pakai akun Google pribadi (yang akan jadi admin).

## 1. Buat project Apps Script
1. Buka https://script.google.com → **New project** (Proyek baru).
2. Ganti nama project (kiri atas) jadi **KBBI Backend**.
3. Hapus isi `Code.gs` yang ada, lalu tempel seluruh isi file `Code.gs` dari folder ini → **Save** (ikon disket / Ctrl+S).

## 2. Jalankan setup (sekali saja)
1. Di toolbar atas, pilih fungsi **setup** → klik **Run**.
2. Muncul "Authorization required" → **Review permissions** → pilih akunmu.
3. Muncul "Google hasn't verified this app" → klik **Advanced** → **Go to KBBI Backend (unsafe)** → **Allow**.
   (Aman: ini script buatanmu sendiri. Izin dipakai untuk membuat sheet & form, dan mengirim email link edit.)
4. Tunggu sampai selesai (±1 menit). Di **Execution log** muncul 5 link:
   - Spreadsheet
   - Form Profil Talent (link untuk dibagikan)
   - Form Tambah Portofolio (link untuk dibagikan)
   - Link edit kedua form (untuk kamu)

   Lupa link-nya? Pilih fungsi **showLinks** → Run.

Hasilnya:
- Spreadsheet **KBBI – Data Website** dengan tab `talents`, `portfolio`, `terjemahan`.
- Profil dan 17 portofolio Aini sudah terisi.

## 3. Aktifkan alamat data untuk website
1. Klik **Deploy** (kanan atas) → **New deployment**.
2. Ikon gerigi di sebelah "Select type" → **Web app**.
3. Execute as: **Me** · Who has access: **Anyone** → **Deploy**.
4. Salin **Web app URL** (berakhiran `/exec`). Link ini yang nanti dipasang di website.
5. Coba buka link itu di browser. Harus muncul teks data berisi profil Aini.
   Pembukaan pertama agak lama (±30 detik) karena terjemahan English & Mandarin dibuat dulu.

Yang tampil di data ini hanya info publik. Email pengisi form **tidak** ikut.

## 4. Bagikan ke teman-teman
Kirim dua link form ke grup:
1. **Form Profil Talent** → diisi sekali per orang.
2. **Form Tambah Portofolio** → satu kiriman = satu judul.

Setiap pengirim otomatis menerima email berisi **link untuk mengedit jawabannya**.

## Tugas admin (kamu)
- **Profil baru masuk** → buka tab `talents`, isi kolom **status (admin)** = `aktif`.
  Profil hanya tampil di website kalau statusnya `aktif`. Isi `nonaktif` untuk menyembunyikan.
- **Sembunyikan satu portofolio** → tab `portfolio`, kolom **tampilkan (admin)** = `tidak`.
- **Terjemahan aneh** → tab `terjemahan`, perbaiki langsung di kolom `en` / `zh`.
  Contoh: nama peran "Dia" bisa diterjemahkan jadi "She" — ganti kembali jadi "Dia".
- **Ubah data Aini** → edit langsung di sheet (data awal Aini tidak punya link edit form).

## Jangan dilakukan
- Mengganti **judul pertanyaan** di form. Judul pertanyaan = judul kolom yang dibaca website.
  Mengubah teks bantuan (deskripsi di bawah pertanyaan) dan menambah pilihan jawaban boleh.
- Mengganti nama tab `talents`, `portfolio`, `terjemahan`.
- Menjalankan **setup** lagi (akan ditolak, supaya tidak dobel).

## Kalau mengubah Code.gs nanti
Form yang sudah ada tidak ikut berubah otomatis. Setelah menempel Code.gs baru, pilih fungsi **updateForms** → **Jalankan**
untuk menyamakan pilihan Type cast dan teks bantuan di form.

Setelah Save, buka **Deploy → Manage deployments → ikon pensil → Version: New version → Deploy**.
Kalau langkah ini dilewati, alamat data tetap memakai kode lama.
