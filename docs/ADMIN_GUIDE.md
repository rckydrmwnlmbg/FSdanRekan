# Panduan Pengelola Konten (Panel Admin) — Ferdinan Silalahi dan Rekan Law Firm

**Dokumen Serah Terima (`FR-11.4` & `SK-06`)**  
**Sasaran Pembaca:** Staf Administrasi Hukum / Legal Administrator (`editor` dan `admin`)

---

## 1. Masuk ke Panel Admin (`/admin`)

1. Buka peramban (Chrome, Edge, atau Safari) dan akses alamat `https://<domain-resmi>/admin`.
2. Masukkan **Alamat Email** dan **Kata Sandi** akun Anda sendiri (minimal 12 karakter).
   - **Penting:** Jangan berbagi akun dengan orang lain.
   - Untuk akun dengan peran **`admin`**, wajib mengaktifkan autentikasi dua faktor (**MFA**).
   - Jika terjadi **5 kali percobaan login gagal berturut-turut**, akun akan dikunci otomatis selama **15 menit** demi keamanan (`SEC-001`).

---

## 2. Menerbitkan Artikel Hukum Baru (`SK-06`)

1. Pada menu sebelah kiri di `/admin`, pilih koleksi **Articles** → klik **Create New**.
2. Isi kolom-kolom berikut:
   - **Title (Judul):** Judul artikel yang jelas (disarankan ≤ 60 karakter). Kolom `slug` akan terisi otomatis; jika ada judul serupa, sistem otomatis menambahkan angka di belakangnya.
   - **Excerpt (Ringkasan):** Ringkasan 1–2 kalimat yang tampil pada kartu daftar artikel.
   - **Category (Kategori):** Pilih kategori yang sesuai. Jika kategori belum ada, buat terlebih dahulu di menu **Categories**.
   - **Cover Image (Gambar Sampul):** Unggah gambar berformat **JPEG, PNG, atau WebP** dengan ukuran maksimal **5 MB** (`FR-6.8`). Berkas `.svg` ditolak demi keamanan. Wajib mengisi kolom **`alt`** (deskripsi singkat gambar untuk aksesibilitas).
   - **Body (Isi Artikel):** Tulis isi artikel menggunakan *headings* (`H2`, `H3`), paragraf, dan daftar poin.
   - **SEO Title & SEO Description:** Isi judul SEO (≤ 60 karakter) dan deskripsi meta (≤ 155 karakter) agar optimal di mesin pencari (`SK-07`).
3. **Simpan sebagai Draf & Pratinjau:**
   - Ubah status ke **Draft** lalu klik **Save**.
   - Klik tombol **Preview** dan periksa tampilan artikel pada layar ponsel maupun desktop. (Artikel berstatus *Draft* tidak akan muncul di halaman publik maupun di `sitemap.xml`).
4. **Menerbitkan atau Menjadwalkan Artikel:**
   - Jika sudah siap tayang, ubah status menjadi **Published** (atau atur tanggal/waktu tayang pada kolom `publishedAt`).
   - Buka halaman publik `/artikel` untuk memastikan artikel sudah tampil beserta kotak *Disclaimer* standar di bagian bawah.

---

## 3. Memperbarui Profil Tim & Bidang Layanan (`FR-6.5`)

1. Buka koleksi **Team Members** untuk memperbarui foto, jabatan (`roleTitle`), gelar (`honorific`), `shortBio` (maksimal 200 karakter), `fullBio`, atau urutan tampil (`displayOrder`).
2. Gunakan foto formal berasio **4:5** (format WebP/JPEG/PNG, maks. 5 MB) dan isi atribut `alt` dengan format `"Foto <Nama Lengkap dan Gelar>"`.
3. Buka koleksi **Practice Areas** untuk memperbarui ringkasan dan cakupan pada ke-10 bidang layanan.

---

## 4. Mengelola Permohonan Konsultasi Masuk (`FR-6.7` — Khusus `admin`)

1. Setiap kali calon klien mengirim formulir di beranda, data disimpan ke koleksi **Inquiries** terlebih dahulu, lalu notifikasi dikirim ke email kantor.
2. Jika pengiriman email mengalami gangguan teknis, data **tetap tersimpan aman** di menu **Inquiries** dengan penanda `emailFailed = true` (`FR-7.4`).
3. Admin dapat memperbarui status permohonan menjadi:
   - `baru` (permohonan baru masuk)
   - `dihubungi` (sudah ditindaklanjuti via WhatsApp/email/telepon)
   - `selesai` (jadwal konsultasi selesai)
   - `spam` (kiriman tidak relevan)
4. Setiap pembacaan data `Inquiry` dicatat secara otomatis pada **Audit Logs** tanpa menyertakan isi data pribadi (`SEC-014`). Data permohonan akan dihapus otomatis setelah masa retensi **12 bulan**.

---

## 5. Larangan Etik & Kerahasiaan (Wajib Dipatuhi Staf)

- **Dilarang mengunggah dokumen perkara rahasia** atau berkas identitas klien ke dalam artikel maupun galeri media (`SK-06`).
- **Dilarang menyebutkan nama klien atau perusahaan** pada artikel atau rekam jejak perkara tanpa bukti persetujuan tertulis (`consentRef`) yang sah (`AGENTS.md` Aturan #4 & `SK-14`).
- **Dilarang menuliskan klaim persentase keberhasilan**, jaminan menang perkara, atau kata superlatif ("terbaik", "nomor satu") sesuai Kode Etik Advokat Indonesia (`AGENTS.md` Aturan #3).
