# Panduan Deploy Produksi ke Biznet Gio (cPanel — Paket Personal Large)

**Proyek:** Website Resmi **Ferdinan Silalahi dan Rekan Law Firm** (`FS dan Rekan`)  
**Domain Produksi:** `https://fsdanrekan.com`  
**Target Hosting:** Biznet Gio Web Hosting — Paket **Personal Large** (cPanel, Node.js via Phusion Passenger, 1 GB RAM, 60 GB SSD, MySQL/MariaDB)

---

## Ringkasan Arsitektur Produksi

Agar stabil dan hemat memori di batas **1 GB RAM**:
1. **Next.js Standalone (`output: 'standalone'`)**: Aplikasi di-build di komputer lokal Anda menggunakan `npm run package:deploy`, lalu diunggah sebagai satu paket siap jalan (`fsdanrekan-deploy.zip`). Anda **tidak perlu** menjalankan `next build` di server cPanel yang berisiko gagal karena batas memori 1 GB.
2. **MySQL / MariaDB (`mysql2/promise`)**: Semua data panel `/admin` (pengguna admin, sesi login, artikel, kategori, 10 bidang layanan, profil tim, rekam jejak perkara, permohonan janji temu, galeri Instagram, log audit, dan pengaturan situs) disimpan di database MySQL/MariaDB cPanel dengan pool hemat memori (`connectionLimit: 5`).
3. **Penyimpanan Gambar Persisten (`UPLOAD_DIR`)**: Gambar yang diunggah lewat `/admin` disimpan di folder persisten di luar hasil build (misalnya `/home/<user_cpanel>/fsdanrekan_uploads`) dan disajikan melalui route `/uploads/[...path]` dengan validasi magic-byte (JPEG/PNG/WebP, maks. 5 MB, blokir SVG/script, anti path-traversal).
4. **Email SMTP cPanel (`nodemailer`)**: Form janji temu mengirim email melalui mailbox resmi cPanel (`mail.fsdanrekan.com`, port `465` SSL/TLS). Jika SMTP mengalami gangguan sementara, data janji temu tetap tersimpan di tabel `inquiries` dengan penanda `email_failed = 1` sehingga tidak ada permohonan klien yang hilang.

---

## Pra-Deploy: Panduan Pengujian MySQL Lokal (XAMPP atau Docker)

Sebelum mengunggah ke Biznet Gio, Anda dapat menguji seluruh fitur database dan panel `/admin` di komputer lokal:

### Opsi 1 — Menggunakan XAMPP / Laragon (Windows)
1. Buka **XAMPP Control Panel**, klik **Start** pada modul **MySQL**.
2. Buka `http://localhost/phpmyadmin` di browser, buat database baru bernama `fsdanrekan_db` dengan Collation `utf8mb4_unicode_ci`.
3. Salin `.env.example` menjadi `.env` di folder proyek, lalu isi minimal variabel berikut:
   ```env
   DATABASE_URL=mysql://root:@127.0.0.1:3306/fsdanrekan_db
   SESSION_SECRET=ganti_dengan_string_acak_minimal_32_karakter_aman
   PAYLOAD_SECRET=ganti_dengan_string_acak_minimal_32_karakter_aman
   ADMIN_INITIAL_EMAIL=admin@fsdanrekan.com
   ADMIN_INITIAL_PASSWORD=PasswordAwalAdmin2026!#
   UPLOAD_DIR=./uploads
   ```
4. Jalankan migrasi skema dan seed data awal (idempoten, aman dijalankan berulang):
   ```bash
   npm run db:migrate
   ```
5. Jalankan server pengembangan dan buka `http://localhost:3000/admin`:
   ```bash
   npm run dev
   ```

### Opsi 2 — Menggunakan Docker
1. Jalankan container MariaDB 10.11 di latar belakang:
   ```bash
   docker run --name fsdanrekan-mysql -e MYSQL_ROOT_PASSWORD=rootpass -e MYSQL_DATABASE=fsdanrekan_db -p 3306:3306 -d mariadb:10.11 --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci
   ```
2. Atur `DATABASE_URL=mysql://root:rootpass@127.0.0.1:3306/fsdanrekan_db` di `.env`, lalu jalankan `npm run db:migrate`.

---

## A. Membuat Database MySQL/MariaDB di cPanel

1. Login ke **cPanel Biznet Gio** (`https://fsdanrekan.com:2083` atau melalui portal pelanggan Biznet Gio).
2. Pada bagian **Databases**, klik **MySQL® Databases** (atau **MySQL Database Wizard**).
3. **Buat Database Baru:**
   - Pada kolom *Create New Database*, ketik `fsdanrekan` lalu klik **Create Database**.
   - Catat nama lengkap database yang memiliki prefix akun cPanel Anda, misalnya: `cpaneluser_fsdanrekan`.
4. **Buat Pengguna Database (MySQL User):**
   - Gulir ke bagian *MySQL Users -> Add New User*.
   - Ketik Username (mis. `appuser`) dan buat Password kuat melalui **Password Generator**.
   - Catat username lengkap (mis. `cpaneluser_appuser`) dan password-nya di tempat aman.
   - Klik **Create User**.
5. **Hubungkan User ke Database:**
   - Gulir ke bagian *Add User To Database*.
   - Pilih User `cpaneluser_appuser` dan Database `cpaneluser_fsdanrekan`, lalu klik **Add**.
   - Centang **ALL PRIVILEGES**, lalu klik **Make Changes**.
6. **Cara Menyusun `DATABASE_URL`:**
   Format standar koneksi MySQL adalah:
   ```text
   mysql://<USERNAME_DB>:<PASSWORD_DB>@127.0.0.1:3306/<NAMA_DB>
   ```
   > **Penting:** Jika password database mengandung karakter khusus seperti `@`, `#`, `:`, `/`, atau `%`, ubah karakter tersebut ke URL-encoding (contoh: `@` menjadi `%40`, `#` menjadi `%23`).  
   > Contoh hasil akhir:
   > `mysql://cpaneluser_appuser:SandiKuat%402026@127.0.0.1:3306/cpaneluser_fsdanrekan`

---

## B. Mengimpor Skema & Menjalankan Migrasi Data Awal

Anda dapat membuat 14 tabel database menggunakan **phpMyAdmin** maupun **skrip migrasi otomatis**.

### Langkah 1 — Impor `database/schema.sql` lewat phpMyAdmin (Opsional namun Direkomendasikan)
1. Buka menu **phpMyAdmin** di cPanel.
2. Klik nama database Anda (`cpaneluser_fsdanrekan`) di panel kiri.
3. Klik tab **Import** di bagian atas.
4. Klik **Choose File**, pilih file `database/schema.sql` dari proyek ini, lalu klik **Go / Import** di bagian bawah.
5. Pastikan 14 tabel berhasil dibuat (`users`, `sessions`, `categories`, `articles`, `practice_areas`, `team_members`, `case_records`, `inquiries`, `site_settings`, `media_assets`, `audit_logs`, `instagram_gallery`, `chat_sessions`, `rate_limits`).

### Langkah 2 — Menjalankan Migrasi & Seed Idempoten (`migrate_mysql.mjs`)
Skrip `scripts/migrate_mysql.mjs` akan memastikan seluruh tabel ada, menyalin konten awal dari `content/*.json` (dan `cms_state.json` bila ada) tanpa menimpa data yang sudah ada (`INSERT IGNORE` / `ON DUPLICATE KEY UPDATE`), serta membuat akun Admin pertama dari environment variable `ADMIN_INITIAL_EMAIL` dan `ADMIN_INITIAL_PASSWORD`.

Setelah aplikasi diunggah dan environment variable diatur di cPanel (lihat Bagian D & E), jalankan perintah berikut melalui **Terminal cPanel** (atau tombol **Run JS Script**):
```bash
node scripts/migrate_mysql.mjs
```
> **Keamanan Akun Admin Awal:** Akun admin pertama dibuat dengan status `must_change_password = 1`. Saat Anda login pertama kali di `https://fsdanrekan.com/admin`, sistem akan **mewajibkan Anda mengganti kata sandi** sebelum dapat mengelola konten. Setelah migrasi pertama selesai, Anda disarankan menghapus variabel `ADMIN_INITIAL_PASSWORD` dari pengaturan cPanel.

---

## C. Membuat Akun Email di cPanel & Konfigurasi SPF/DKIM

1. Buka cPanel -> bagian **Email** -> klik **Email Accounts**.
2. Klik tombol **+ Create** untuk membuat tiga mailbox resmi berikut pada domain `fsdanrekan.com`:
   - `kontak@fsdanrekan.com` (email kontak resmi firma di footer & halaman publik)
   - `noreply@fsdanrekan.com` (akun pengirim SMTP otomatis aplikasi, digunakan pada `SMTP_USER` dan `MAIL_FROM`)
   - `konsultasi@fsdanrekan.com` (penerima notifikasi form janji temu klien, digunakan pada `INQUIRY_TO`)
3. Simpan password akun `noreply@fsdanrekan.com` untuk diisi ke environment variable `SMTP_PASS`.
4. **Konfigurasi Teknis SMTP cPanel:**
   - **SMTP Host:** `mail.fsdanrekan.com`
   - **SMTP Port:** `465` (SSL/TLS)
   - **SMTP Username:** `noreply@fsdanrekan.com`
   - **SMTP Password:** *(password mailbox `noreply@fsdanrekan.com`)*
5. **Mengaktifkan SPF, DKIM, dan DMARC (Agar Email Tidak Masuk Spam):**
   - Kembali ke halaman utama cPanel -> bagian **Email** -> klik **Email Deliverability**.
   - Pada baris `fsdanrekan.com`, pastikan statusnya **Valid**. Jika tertulis *Problems Exist*, klik **Repair** atau **Manage**, lalu klik **Install The Suggested Record** untuk **DKIM** dan **SPF**.
   - Buka menu **Zone Editor** di cPanel -> klik **Manage** pada `fsdanrekan.com` -> pastikan terdapat TXT record `_dmarc.fsdanrekan.com` dengan nilai:
     ```text
     v=DMARC1; p=quarantine; rua=mailto:kontak@fsdanrekan.com; pct=100; adkim=s; aspf=s
     ```

---

## D. Setup Node.js App di cPanel (Phusion Passenger)

1. Sebelum membuka Setup Node.js App, buka **File Manager** di cPanel dan buat dua folder di dalam `/home/<user_cpanel>/` (di **luar** `public_html`):
   - `/home/<user_cpanel>/fsdanrekan_app` (folder kode aplikasi / Application Root)
   - `/home/<user_cpanel>/fsdanrekan_uploads` (folder persisten gambar upload admin agar tidak pernah terhapus saat update kode)
2. Kembali ke cPanel -> bagian **Software** -> klik **Setup Node.js App** -> klik **Create Application**:
   - **Node.js version:** Pilih **20.x** (LTS, minimal `20.11+` atau `22.x`).
   - **Application mode:** `Production`
   - **Application root:** `fsdanrekan_app`
   - **Application URL:** `fsdanrekan.com` (biarkan kolom path di sebelahnya kosong)
   - **Application startup file:** `server.js`
3. Pada bagian **Environment variables**, klik **Add Variable** untuk menambahkan variabel berikut:

| Nama Variabel | Contoh / Panduan Nilai | Wajib? |
|---|---|---|
| `NODE_ENV` | `production` | Wajib |
| `NEXT_PUBLIC_SITE_URL` | `https://fsdanrekan.com` | Wajib |
| `NEXT_PUBLIC_WA_NUMBER` | `62811830991` (nomor WhatsApp resmi E.164 tanpa `+`) | Wajib |
| `DATABASE_URL` | `mysql://cpaneluser_appuser:Password@127.0.0.1:3306/cpaneluser_fsdanrekan` | Wajib |
| `SESSION_SECRET` | String acak minimal 32 karakter (mis. hasil `openssl rand -hex 32`) | Wajib |
| `PAYLOAD_SECRET` | String acak minimal 32 karakter (berbeda dari `SESSION_SECRET`) | Wajib |
| `ADMIN_INITIAL_EMAIL` | `admin@fsdanrekan.com` | Wajib saat migrasi awal |
| `ADMIN_INITIAL_PASSWORD` | Password kuat minimal 12 karakter (huruf besar, kecil, angka, simbol) | Wajib saat migrasi awal |
| `UPLOAD_DIR` | `/home/<user_cpanel>/fsdanrekan_uploads` | Wajib |
| `SMTP_HOST` | `mail.fsdanrekan.com` | Wajib |
| `SMTP_PORT` | `465` | Wajib |
| `SMTP_USER` | `noreply@fsdanrekan.com` | Wajib |
| `SMTP_PASS` | Password mailbox `noreply@fsdanrekan.com` | Wajib |
| `MAIL_FROM` | `noreply@fsdanrekan.com` | Wajib |
| `INQUIRY_TO` | `konsultasi@fsdanrekan.com` | Wajib |
| `CRON_SECRET` | String acak minimal 24 karakter untuk endpoint cron retensi & sync | Opsional (Disarankan) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Site key Cloudflare Turnstile untuk `fsdanrekan.com` | Opsional (Disarankan) |
| `TURNSTILE_SECRET_KEY` | Secret key Cloudflare Turnstile | Opsional (Disarankan) |

4. Klik **Create** di kanan atas, lalu klik **Stop App** sementara sebelum mengunggah file hasil build.

---

## E. Membuat Paket Build di Lokal & Mengupload ke cPanel

Karena paket Personal Large memiliki batas **1 GB RAM**, selalu jalankan proses build di komputer lokal Anda:

### Langkah 1 — Jalankan `package:deploy` di Komputer Lokal
Di terminal komputer lokal Anda (folder proyek `FSdanRekan`), jalankan:
```bash
npm run package:deploy
```
Perintah ini akan menjalankan `next build` (mode `standalone`), lalu menghasilkan:
- Folder `dist-deploy/`
- File arsip **`fsdanrekan-deploy.zip`** yang sudah bersih (tanpa `devDependencies`, tanpa folder `tests/`, tanpa `.git/`, tanpa `.env`, dan tanpa skrip Python).

### Langkah 2 — Unggah `fsdanrekan-deploy.zip` ke cPanel
1. Buka **File Manager** di cPanel, masuk ke folder `/home/<user_cpanel>/fsdanrekan_app`.
2. Klik **Upload** di bagian atas, lalu pilih file `fsdanrekan-deploy.zip` dari komputer Anda.
3. Setelah selesai diunggah, kembali ke `/home/<user_cpanel>/fsdanrekan_app`, klik kanan pada `fsdanrekan-deploy.zip`, lalu pilih **Extract** ke `/fsdanrekan_app`.
4. Hapus file `fsdanrekan-deploy.zip` setelah berhasil diekstrak.

### Struktur Folder Produksi yang Benar di Server
Pastikan isi `/home/<user_cpanel>/fsdanrekan_app` tampak seperti berikut:
```text
/home/<user_cpanel>/
├── fsdanrekan_uploads/          <-- Folder persisten gambar upload (UPLOAD_DIR)
└── fsdanrekan_app/              <-- Application Root Node.js cPanel
    ├── .next/
    │   ├── server/
    │   └── static/              <-- Aset CSS/JS hasil build
    ├── content/                 <-- Seed JSON resmi (team, practice_areas, articles, dll.)
    ├── database/
    │   └── schema.sql           <-- Skema SQL 14 tabel MySQL/MariaDB
    ├── node_modules/            <-- Hanya dependensi runtime produksi (standalone)
    ├── public/                  <-- Aset statis bawaan (foto advokat, logo, favicon)
    ├── scripts/
    │   └── migrate_mysql.mjs    <-- Skrip migrasi & seed database idempoten
    ├── package.json
    ├── server.js                <-- Startup file untuk Phusion Passenger
    └── standalone-server.js     <-- Server internal Next.js standalone
```
> **Catatan Penting:** Karena `node_modules` produksi sudah disertakan di dalam paket standalone `fsdanrekan-deploy.zip`, Anda **tidak perlu** menekan tombol *Run NPM Install* di cPanel jika semua modul ter-bundle. Namun, jika cPanel mewajibkan inisialisasi virtual environment Node.js, masuk ke terminal virtual environment cPanel (`source /home/<user>/nodevenv/fsdanrekan_app/20/bin/activate && cd /home/<user>/fsdanrekan_app`), jalankan `node scripts/migrate_mysql.mjs`, lalu klik **Restart** pada halaman **Setup Node.js App**.

---

## F. Pengaturan Domain `fsdanrekan.com`, AutoSSL, HTTPS, & Redirect `www`

1. **Mengarahkan Domain ke Biznet Gio:**
   - Ubah Nameserver di registrar domain `fsdanrekan.com` ke Nameserver Biznet Gio yang tertera di email aktivasi hosting Anda (atau arahkan `A Record` `@` dan `www` ke alamat IP server cPanel Biznet Gio).
2. **Mengaktifkan SSL Gratis (AutoSSL):**
   - Buka cPanel -> bagian **Security** -> klik **SSL/TLS Status**.
   - Centang `fsdanrekan.com`, `www.fsdanrekan.com`, dan `mail.fsdanrekan.com`, lalu klik **Run AutoSSL**. Tunggu hingga ikon gembok berubah menjadi hijau (*AutoSSL Domain Validated*).
3. **Memaksa HTTPS:**
   - Buka cPanel -> bagian **Domains** -> klik **Domains**.
   - Aktifkan sakelar **Force HTTPS Redirect** pada `fsdanrekan.com`.
4. **Redirect `www.fsdanrekan.com` ke `https://fsdanrekan.com` (Non-WWW Canonical):**
   - Di menu **Redirects** cPanel (atau di bagian paling atas file `public_html/.htaccess` sebelum blok `# DO NOT REMOVE. CLOUDLINUX PASSENGER CONFIGURATION`), tambahkan aturan berikut:
     ```apache
     RewriteEngine On
     RewriteCond %{HTTP_HOST} ^www\.fsdanrekan\.com$ [NC]
     RewriteRule ^(.*)$ https://fsdanrekan.com/$1 [L,R=301]
     ```

---

## G. Checklist Verifikasi Setelah Live (Post-Deployment Checklist)

Jalankan pemeriksaan berikut satu per satu setelah website aktif di `https://fsdanrekan.com`:

- [ ] **Health Check Database & Aplikasi (`GET /api/health`):**  
  Buka `https://fsdanrekan.com/api/health`. Pastikan respons berstatus `200 OK` dengan JSON `{"status":"ok","database":{"status":"ok"}}`.
- [ ] **Canonical & Redirect:**  
  Buka `http://fsdanrekan.com` dan `https://www.fsdanrekan.com`; pastikan keduanya otomatis mengarah (`301`) ke `https://fsdanrekan.com`.
- [ ] **Sitemap & Robots:**  
  - Buka `https://fsdanrekan.com/sitemap.xml` dan pastikan seluruh URL halaman layanan, profil advokat, dan artikel terbit tampil dengan domain `https://fsdanrekan.com`.
  - Buka `https://fsdanrekan.com/robots.txt` dan pastikan terdapat `Disallow: /admin` serta `Disallow: /api/`.
- [ ] **Login Panel Admin & Wajib Ganti Password Pertama:**  
  - Buka `https://fsdanrekan.com/admin`.
  - Login menggunakan `ADMIN_INITIAL_EMAIL` dan `ADMIN_INITIAL_PASSWORD`.
  - Pastikan layar **Wajib Ganti Kata Sandi Awal** muncul, lalu ganti dengan kata sandi baru minimal 12 karakter.
  - Hapus variabel `ADMIN_INITIAL_PASSWORD` dari cPanel Setup Node.js App setelah password berhasil diganti.
- [ ] **Uji Upload Gambar (`/uploads/[...path]`):**  
  - Di dalam `/admin`, unggah satu gambar `.webp` atau `.jpg` (maks. 5 MB).
  - Pastikan gambar berhasil tampil melalui URL `/uploads/media-...` dan tetap ada meskipun Anda menekan tombol **Restart** pada Node.js App di cPanel.
- [ ] **Uji Form Janji Temu & Email SMTP:**  
  - Kirim satu permohonan uji dari form `#janji-temu` di halaman beranda.
  - Pastikan kotak masuk `konsultasi@fsdanrekan.com` menerima email notifikasi dan data permohonan muncul di tab **Janji Temu (Inquiries)** pada `/admin` dengan status `baru`.

---

## H. Prosedur Backup & Restore Rutin

### 1. Backup Database MySQL/MariaDB
- **Manual lewat phpMyAdmin (Mingguan):**  
  Buka **phpMyAdmin** -> pilih database `cpaneluser_fsdanrekan` -> klik tab **Export** -> pilih metode **Quick** dengan format **SQL** -> klik **Go** dan simpan file `.sql` di komputer Anda.
- **Otomatis lewat Cron Jobs cPanel (Harian):**  
  Buka cPanel -> **Advanced** -> **Cron Jobs** -> atur jadwal harian (`0 2 * * *` / pukul 02.00 WIB) dengan perintah:
  ```bash
  mysqldump -u cpaneluser_appuser -p'PASSWORD_DB_ANDA' cpaneluser_fsdanrekan | gzip > /home/<user_cpanel>/backups/db_$(date +\%F).sql.gz
  ```
  *(Pastikan folder `/home/<user_cpanel>/backups` sudah dibuat terlebih dahulu di luar `public_html`).*

### 2. Backup Folder Gambar (`UPLOAD_DIR`)
- Buka **File Manager** cPanel -> klik kanan pada folder `/home/<user_cpanel>/fsdanrekan_uploads` -> pilih **Compress** (`.tar.gz` atau `.zip`) -> unduh ke penyimpanan lokal atau cloud kantor minimal 1 kali seminggu.

### 3. Cara Restore (Pemulihan)
1. **Restore Database:** Buka **phpMyAdmin** -> pilih database `cpaneluser_fsdanrekan` -> klik tab **Import** -> pilih file backup `.sql` atau `.sql.gz` -> klik **Go**.
2. **Restore Gambar Upload:** Unggah arsip backup `fsdanrekan_uploads.zip` ke `/home/<user_cpanel>/` lalu ekstrak kembali ke `/home/<user_cpanel>/fsdanrekan_uploads`.

---

## I. Troubleshooting Umum & Cara Melihat Log

### 1. Cara Melihat Log Error di cPanel
- Log aplikasi Node.js (Phusion Passenger) tersimpan otomatis di:
  `/home/<user_cpanel>/fsdanrekan_app/stderr.log`
- Anda juga dapat memantau error server melalui menu **Metrics -> Errors** di cPanel.

### 2. Masalah Umum & Solusinya
| Gejala / Error | Penyebab Umum | Solusi Langkah demi Langkah |
|---|---|---|
| **Error 503 Service Unavailable / Phusion Passenger Error** | File `standalone-server.js` belum terunggah atau memori penuh saat startup. | 1. Cek `/home/<user>/fsdanrekan_app/stderr.log`.<br>2. Pastikan seluruh isi `fsdanrekan-deploy.zip` (termasuk folder tersembunyi `.next/`) sudah diekstrak langsung di dalam `/home/<user>/fsdanrekan_app`.<br>3. Klik **Restart** di Setup Node.js App. |
| **`/api/health` mengembalikan `503 degraded` (Koneksi DB gagal)** | `DATABASE_URL` salah ketik, karakter spesial password belum di-encode, atau user belum diberi *ALL PRIVILEGES*. | 1. Pastikan host di `DATABASE_URL` menggunakan `127.0.0.1:3306` (bukan nama domain).<br>2. Pastikan karakter `@` atau `#` di password diubah menjadi `%40` atau `%23`.<br>3. Cek kembali bagian *Add User To Database* di menu **MySQL Databases**. |
| **Email Janji Temu tidak terkirim (`email_failed = 1`)** | `SMTP_USER` / `SMTP_PASS` salah, atau port `465` diblokir keluar. | 1. Tenang: data permohonan klien **tetap tersimpan aman** di tab Inquiries `/admin` dengan label peringatan kuning.<br>2. Pastikan akun `noreply@fsdanrekan.com` sudah dibuat di **Email Accounts** dan password-nya cocok dengan `SMTP_PASS`.<br>3. Jika port `465` tidak terhubung dari `mail.fsdanrekan.com`, coba ubah `SMTP_HOST` menjadi `127.0.0.1` di cPanel yang sama. |
| **Kehabisan Memori (`Out of Memory` / `ENOMEM` pada paket 1 GB RAM)** | Menjalankan `npm run build` di server cPanel atau terlalu banyak proses worker. | 1. **Jangan pernah** menjalankan `next build` di dalam server cPanel.<br>2. Selalu jalankan `npm run package:deploy` di komputer lokal dan unggah `fsdanrekan-deploy.zip`.<br>3. Koneksi pool MySQL sudah dibatasi ke `5` koneksi (`connectionLimit: 5`) agar hemat RAM. |
| **Catatan Batasan Rate-Limit pada Multi-Proses Passenger** | Bagaimana rate-limiter bekerja bila Passenger menjalankan lebih dari satu proses Node.js. | Aplikasi ini menggunakan **Rate Limiter Hibrida**: jika database MySQL aktif, hitungan rate-limit (`5 req/10 menit` untuk form janji temu dan `10 req/15 menit` untuk login admin) disimpan secara atomik di tabel MySQL `rate_limits` (`INSERT ... ON DUPLICATE KEY UPDATE`), sehingga **tetap sinkron meskipun Passenger menjalankan lebih dari satu proses**. Jika koneksi MySQL sedang terputus sementara, sistem otomatis beralih ke fallback memori per-proses (`Map`). |

---

## J. Daftar Pertanyaan Konfirmasi ke Tim Support Biznet Gio

Sebelum atau saat melakukan setup pertama kali, Anda dapat mengirimkan tiket/chat ke tim Support **Biznet Gio** dengan daftar pertanyaan berikut:

1. **Fitur Setup Node.js App (CloudLinux Passenger):**  
   *"Apakah pada paket Web Hosting Personal Large untuk domain `fsdanrekan.com`, fitur **Setup Node.js App** (Phusion Passenger) sudah aktif dengan versi **Node.js 20 LTS** atau **22 LTS**?"*
2. **Batas Memori (RAM) & Jumlah Proses (LVE Limits):**  
   *"Berapa batas maksimum Physical Memory (RAM), Entry Processes (EP), dan Number of Processes (NPROC) untuk akun cPanel paket Personal Large kami, dan apakah Passenger dikonfigurasi 1 proses worker secara default?"*
3. **Akses Terminal / SSH:**  
   *"Apakah akses **Terminal cPanel** atau **SSH** diaktifkan pada paket Personal Large agar kami dapat menjalankan skrip migrasi database (`node scripts/migrate_mysql.mjs`)?"*
4. **Koneksi SMTP Lokal Loopback:**  
   *"Untuk pengiriman email aplikasi Node.js di server cPanel yang sama, apakah disarankan menggunakan host `mail.fsdanrekan.com` port `465` (SSL) atau `127.0.0.1` port `465`/`587`?"*
5. **Konfirmasi Python Tidak Dibutuhkan di Produksi:**  
   *"Kami menggunakan Next.js Node.js standalone penuh di produksi (skrip Python di repositori kami hanya untuk alat pratinjau lokal). Mohon konfirmasi bahwa tidak ada layanan Python yang perlu diaktifkan di cPanel."*

