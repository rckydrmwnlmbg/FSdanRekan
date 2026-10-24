# SKILLS.md — Prosedur Kerja Berulang untuk Agent

**Fungsi:** kumpulan prosedur baku ("skill") agar pekerjaan yang sering diulang dilakukan dengan cara yang sama setiap kali. Setiap skill punya pemicu, masukan, langkah, keluaran, dan kriteria selesai.
**Aturan:** ikuti `AGENTS.md` lebih dulu. Skill tidak boleh melonggarkan aturan keras di sana atau standar di `SECURITY.md`.

> Jika agent mendukung folder skill khusus (misalnya satu `SKILL.md` per folder), setiap bagian di bawah dapat dipisah menjadi satu file. Isinya tetap sama. Cek dokumentasi agent yang dipakai sebelum memindahkan.

---

## Daftar Skill

| ID | Nama | Peran | Fase |
|---|---|---|---|
| SK-01 | Seed konten profil tim | Content Steward | MVP |
| SK-02 | Membuat halaman atau bagian baru | Builder | MVP |
| SK-03 | Membuat koleksi dan akses CMS | Builder | MVP |
| SK-04 | Implementasi form konsultasi | Builder | MVP |
| SK-05 | Tombol dan tautan WhatsApp | Builder | MVP |
| SK-06 | Penerbitan artikel (panduan admin) | Content Steward | MVP |
| SK-07 | SEO per halaman | Builder | MVP |
| SK-08 | Tinjauan keamanan (audit) | Reviewer | MVP |
| SK-09 | Pembaruan dependensi | Builder | MVP |
| SK-10 | Checklist rilis dan peluncuran | Builder dan Reviewer | MVP |
| SK-11 | Widget chat pemandu | Builder | v2 |
| SK-12 | Ringkasan chat ke WhatsApp | Builder | v2 |
| SK-13 | Galeri Instagram | Builder | v2 |
| SK-14 | Rekam jejak perkara | Content Steward | v2 |

---

## SK-01 Seed konten profil tim

- **Pemicu:** menambah atau mengubah profil anggota tim.
- **Masukan:** `CONTENT_PROFILES.md` (sumber tunggal).
- **Langkah:**
  1. Baca bagian "Aturan Konten" dan data profil terkait.
  2. Petakan field: `slug`, `fullName`, `honorific`, `roleTitle`, `group`, `shortBio`, `fullBio`, `education[]`, `languages[]`, `tags[]`, `displayOrder`.
  3. Salin `shortBio` dan `fullBio` **apa adanya**. Jangan merapikan, merangkum, atau menambah kalimat.
  4. Untuk `TODO(client)` (foto, gelar, jabatan), isi placeholder yang jelas (monogram, teks "Segera hadir") dan jangan dikarang.
  5. Tulis skrip seed yang idempoten (jalan dua kali, hasil sama).
  6. Verifikasi dengan tes: jumlah profil, urutan, tidak ada kata "FHSP", dan panjang `shortBio` ≤ 200 karakter.
- **Keluaran:** skrip seed, tes, dan daftar TODO yang tersisa.
- **Selesai bila:** kelima profil tampil dengan teks identik dengan sumber, dan tes lulus.

## SK-02 Membuat halaman atau bagian baru

- **Pemicu:** implementasi F1 sampai F4, F7, F10.
- **Langkah:**
  1. Cari FR terkait di `PRD.md` dan catat ID-nya. Baca spesifikasi komponen di `DESIGN.md` Bagian 6 dan penyesuaian wajib di Bagian 9.
  2. Buat komponen dari token di `tokens.css` (hasil ekstraksi `DESIGN.md` Bagian 2); jangan menulis warna atau ukuran acak.
  3. Mobile-first: rancang di 360px lalu perlebar.
  4. Gunakan elemen semantik (`header`, `main`, `section`, `h1` tunggal).
  5. Data dari CMS atau seed, bukan hardcode.
  6. Tambahkan tes e2e untuk alur utama dan tes aksesibilitas (axe).
  7. Cek Lighthouse pada ponsel.
- **Selesai bila:** FR terpenuhi, 0 pelanggaran axe serius, tampilan 360/768/1280 diperiksa, tidak ada konten karangan.

## SK-03 Membuat koleksi dan akses CMS

- **Pemicu:** menambah entitas data (TeamMember, Article, dan seterusnya).
- **Langkah:**
  1. Ambil field dari "Sketsa Data Model" di `PRD.md`.
  2. Tulis koleksi dengan `access` **eksplisit** per operasi (create, read, update, delete). Default tertutup.
  3. Konten publik hanya membaca data berstatus terbit (`SECURITY.md` SEC-008).
  4. Validasi field (panjang, format) di tingkat koleksi.
  5. Tulis tes otorisasi: anonim, `editor`, `admin` terhadap setiap operasi.
- **Selesai bila:** matriks peran × operasi lulus dan tidak ada `overrideAccess: true` yang tidak berdasar.

## SK-04 Implementasi form konsultasi

- **Pemicu:** F7.
- **Langkah:**
  1. Buat skema Zod bersama (klien dan server), `.strict()`.
  2. Route `POST /api/inquiry` mengikuti urutan: cek Origin → rate limit → cek Content-Type → validasi → Turnstile → simpan → email.
  3. Simpan dulu, baru kirim email; bila email gagal, tandai `emailFailed`.
  4. Pesan error pengguna dalam Bahasa Indonesia dan generik.
  5. Tampilkan peringatan "Jangan menuliskan data rahasia" dan checkbox persetujuan.
  6. Tes: valid → 201; tanpa consent → 400; kolom ekstra → 400; tanpa token → 400; 6 permintaan cepat → 429; email gagal → data tetap tersimpan.
- **Rujukan keamanan:** SEC-004, SEC-005, SEC-006, SEC-007, SEC-012, SEC-014.
- **Selesai bila:** semua tes lulus dan tidak ada PII di log.

## SK-05 Tombol dan tautan WhatsApp

- **Pemicu:** F8.
- **Langkah:**
  1. Nomor dan pesan default dibaca dari `SiteSettings` (bukan hardcode).
  2. Bentuk tautan dengan fungsi tunggal:

```ts
export function waLink(e164Digits: string, message: string) {
  const n = e164Digits.replace(/\D/g, '')           // hanya digit, format internasional tanpa +
  return `https://wa.me/${n}?text=${encodeURIComponent(message)}`
}
```
  3. Nomor Indonesia disimpan dalam format `62...` (bukan `0...`). Validasi di admin.
  4. Tambahkan `rel="noopener noreferrer"` dan `target="_blank"`.
  5. Tombol melayang punya label aksesibel dan tidak menutupi konten atau CTA lain di ponsel.
- **Selesai bila:** klik membuka WhatsApp dengan pesan terisi, uji di ponsel dan desktop.

## SK-06 Penerbitan artikel (panduan admin)

- **Pemicu:** pembuatan panduan PDF serah terima, atau staf meminta bantuan.
- **Langkah panduan (untuk staf):**
  1. Masuk ke `/admin` dengan akun sendiri.
  2. Artikel → Buat baru → isi judul, ringkasan, isi, gambar sampul, kategori.
  3. Isi SEO title dan description (panduan panjang: judul ≤ 60, deskripsi ≤ 155 karakter).
  4. Simpan sebagai **Draf** → klik **Pratinjau** → periksa di ponsel.
  5. Ubah status ke **Terbit** (atau jadwalkan).
  6. Buka halaman publik dan pastikan tampil.
- **Larangan untuk staf (tulis di panduan):** jangan menempel dokumen perkara, jangan menyebut nama klien tanpa persetujuan tertulis, jangan menjanjikan hasil.
- **Selesai bila:** panduan PDF dengan tangkapan layar, diuji oleh satu staf tanpa bantuan.

## SK-07 SEO per halaman

- **Langkah:** `title` dan `description` unik; satu `h1`; canonical; Open Graph (judul, deskripsi, gambar); data terstruktur `LegalService` atau `Organization` dengan alamat resmi; `sitemap.xml` dan `robots.txt`; pengalihan 301 dari alamat lama.
- **Selesai bila:** Lighthouse SEO ≥ 95, sitemap valid, tidak ada halaman draf di sitemap.

## SK-08 Tinjauan keamanan (audit)

- **Peran:** Reviewer (bukan penulis kode yang ditinjau).
- **Langkah:** jalankan Protokol Audit `SECURITY.md` Bagian C secara berurutan.
- **Aturan keras:**
  - Setiap temuan memakai Format A: severity, **file:baris nyata**, eksploitasi, fix kode, verifikasi.
  - Dilarang mengarang baris atau temuan. Jika tidak menemukan apa pun pada suatu kategori, tulis "tidak ditemukan" beserta bukti pemeriksaan (perintah dan hasil).
  - Jangan memperbaiki diam-diam; catat dulu, lalu perbaiki dalam commit `security:` terpisah.
- **Keluaran:** Bagian E `SECURITY.md` terisi dan daftar commit perbaikan.
- **Selesai bila:** gerbang rilis Bagian D hijau.

## SK-09 Pembaruan dependensi

- **Langkah:** baca changelog; perbarui satu kelompok per PR; `npm ci` → tes penuh; `npm audit`; jangan memasang versi yang baru terbit kurang dari beberapa hari tanpa alasan; catat versi di `TECH_STACK.md` Bagian 10.
- **Selesai bila:** CI hijau dan tidak ada High/Critical baru.

## SK-10 Checklist rilis dan peluncuran

1. Gerbang rilis `SECURITY.md` Bagian D hijau.
2. Konten final disetujui client tertulis (profil, bidang layanan, nomor kontak).
3. Salinan konten website lama disimpan dan diserahkan.
4. Catat **seluruh record DNS** saat ini (terutama MX, SPF, DKIM, DMARC) sebelum mengubah apa pun.
5. Tetapkan TTL DNS rendah 24 jam sebelum pemindahan.
6. Ubah hanya record yang mengarah ke website (A/CNAME). **MX tidak disentuh.**
7. Verifikasi HTTPS, pengalihan 301, form, tombol WhatsApp, dan email kantor (kirim dan terima uji).
8. Aktifkan monitoring uptime dan Sentry.
9. Serahkan: akses admin, repositori, aset desain, panduan PDF, daftar kredensial (lewat pengelola kata sandi, bukan chat).
10. Mulai hitung masa garansi 30 hari.

## SK-11 Widget chat pemandu *(v2)*

- **Prasyarat:** persetujuan tertulis dan invoice terpisah.
- **Langkah:** alur berbasis skrip (nama, bidang hukum, jadwal, kontak) dengan consent di awal; teks pengguna disanitasi dan dibatasi panjangnya; ID sesi acak 128-bit di cookie `HttpOnly`; batas pesan per sesi dan per IP; **tidak ada** jawaban hukum otomatis.
- **Rujukan:** SEC-008, SEC-014, SEC-015.

## SK-12 Ringkasan chat ke WhatsApp *(v2)*

- **Prasyarat:** akun Meta Business terverifikasi, template pesan disetujui, nomor penerima admin dikonfirmasi, keputusan pemakaian nomor (coexistence atau nomor terpisah).
- **Langkah:** webhook dengan verifikasi tanda tangan HMAC (SEC-011); idempoten; ringkasan dikirim saat sesi selesai atau tidak aktif 15 menit; transkrip lengkap disimpan sebagai arsip dengan masa simpan; error pengiriman dicatat tanpa PII.
- **Catatan:** pengiriman dari sistem ke WhatsApp memakai template yang disetujui Meta dan dikenai biaya per pesan menurut ketentuan terbaru. Cek tarif dan aturan sebelum menjanjikan ke client.

## SK-13 Galeri Instagram *(v2)*

- **Prasyarat:** akun Instagram Business atau Creator; keputusan memakai API resmi atau widget pihak ketiga.
- **Langkah:** token hanya di server; cache hasil (revalidate berkala); tangani token kedaluwarsa dengan menyembunyikan galeri atau memakai cache dan memberi peringatan ke admin; gambar dimuat dengan `alt` dan lazy loading; tautan "Ikuti di Instagram".
- **Alternatif ringan:** 6 sampai 9 foto pilihan yang dikurasi manual lewat admin.

## SK-14 Rekam jejak perkara *(v2)*

- **Prasyarat:** keputusan client (anonim atau bernama) dan bukti persetujuan untuk setiap penyebutan nama.
- **Langkah:** tampilkan hanya jenis perkara dan wilayah; `clientName` hanya disimpan internal; mode `named` hanya bila `consentRef` terisi; tanpa status menang atau kalah, tanpa nilai perkara.
- **Selesai bila:** tes memastikan `clientName` tidak pernah muncul pada respons publik.
