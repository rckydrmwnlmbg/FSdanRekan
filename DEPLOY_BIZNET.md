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

## B. Mengimpor Skema & Seed Data Awal (Pilih Jalur Tanpa Terminal atau Dengan Terminal)

Kami menyediakan **dua jalur migrasi** yang sama-sama **idempoten** (aman dijalankan berulang tanpa menggandakan data):

### Jalur 1 — Tanpa Terminal / Tanpa SSH (Lewat phpMyAdmin — Paling Mudah)
Gunakan jalur ini bila paket cPanel Anda tidak mengaktifkan menu Terminal/SSH. Seluruh skema 14 tabel **sekaligus seluruh data seed awal** dari `content/*.json` (pengaturan situs, kategori, 10 bidang layanan, 6 profil advokat, 4 artikel hukum, rekam jejak perkara, dan galeri Instagram) sudah digabungkan ke dalam satu file SQL siap impor: **`database/phpmyadmin_bootstrap.sql`**.

1. Buka menu **phpMyAdmin** di cPanel.
2. Klik nama database Anda (`cpaneluser_fsdanrekan`) di panel kiri.
3. Klik tab **Import** di bagian atas.
4. Klik **Choose File**, pilih file **`database/phpmyadmin_bootstrap.sql`** (tersedia di folder proyek maupun di dalam `fsdanrekan-deploy.zip`), lalu klik **Go / Import** di bagian bawah.
5. Pastikan muncul pesan hijau *Import has been successfully finished* dan 14 tabel telah terisi konten awal situs.

#### Mekanisme Keamanan Akun Admin Pertama pada Jalur Tanpa Terminal
- Demi keamanan (`SEC-001` & `SEC-003`), file `database/phpmyadmin_bootstrap.sql` **tidak menyimpan password atau hash password apa pun** di dalam repositori (tabel `users` sengaja dibiarkan kosong saat impor SQL).
- Saat Anda mengisi `ADMIN_INITIAL_EMAIL` dan `ADMIN_INITIAL_PASSWORD` di **Setup Node.js App -> Environment variables** (Bagian D), lalu melakukan **login pertama kali** di `https://fsdanrekan.com/admin`:
  1. Server mendeteksi bahwa tabel `users` masih kosong (`COUNT(*) = 0`).
  2. Server memvalidasi kredensial Anda terhadap `ADMIN_INITIAL_EMAIL` dan `ADMIN_INITIAL_PASSWORD` dari environment variable, melakukan hashing `scrypt` (`N=16384, r=8, p=1`), dan menyimpan akun Admin pertama ke tabel `users` dengan penanda `must_change_password = 1`.
  3. Begitu login berhasil, layar **Wajib Ganti Kata Sandi Awal** langsung muncul sehingga Anda segera mengganti kata sandi awal tersebut dengan kata sandi permanen.
  4. Setelah tabel `users` memiliki minimal 1 akun (`COUNT(*) > 0`), mekanisme auto-bootstrap ini otomatis terkunci dan tidak akan pernah jalan lagi.

---

### Jalur 2 — Menggunakan Terminal cPanel / SSH (`migrate_mysql.mjs`)
Jika Anda memiliki akses **Terminal cPanel** atau **SSH**, Anda dapat menjalankan skrip migrasi otomatis setelah mengunggah aplikasi dan mengisi environment variable:

```bash
source /home/<user_cpanel>/nodevenv/fsdanrekan_app/24/bin/activate && cd /home/<user_cpanel>/fsdanrekan_app
node scripts/migrate_mysql.mjs
```
Skrip ini akan mengeksekusi `database/schema.sql`, menyalin seluruh data dari `content/*.json` dan `content/cms_state.json`, serta membuat akun admin awal dengan `must_change_password = 1`.

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
   - **Node.js version:** Pilih **`24.22.1`** (Node 24 LTS).  
     *(Jika suatu saat aplikasi gagal start pada Node `24.22.1` di cPanel, ubah pilihan ini ke fallback **`20.20.2`** lalu klik **Save** & **Restart** — paket `fsdanrekan-deploy.zip` yang sama **bisa langsung dipakai tanpa build ulang** karena 100% pure JavaScript tanpa binary native C++).*
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

> **Peringatan Penting Pengisian Environment Variables di cPanel:**
> 1. **Jangan Pernah Menyisakan Baris Variabel dengan Nama (`Name`) Kosong:** Jika Anda terlanjur menekan *Add Variable* namun tidak jadi mengisi, **hapus baris tersebut** dengan ikon tempat sampah sebelum klik *Save*. Baris dengan nama kosong di CloudLinux Node.js Selector akan merusak konfigurasi `.htaccess` Passenger dan memicu error `503`.
> 2. **Hindari Spasi, Tanda Kutip (`"` / `'`), dan Karakter `$` di Nilai Variabel:** Antarmuka cPanel meneruskan Environment Variables ke konfigurasi Apache/Passenger `PassEnv`/`SetEnv`. Nilai yang mengandung spasi atau tanda kutip dapat terpotong, dan karakter `$` dapat diekspansi sebagai variabel shell kosong.
>    - Untuk `SESSION_SECRET`, `PAYLOAD_SECRET`, dan `CRON_SECRET`: gunakan string heksadesimal/alfanumerik murni tanpa spasi (mis. `a9f8e7d6c5b4...`).
>    - Untuk `ADMIN_INITIAL_PASSWORD` dan `SMTP_PASS`: gunakan huruf besar, huruf kecil, angka, dan simbol aman tanpa spasi seperti `!`, `@`, `_`, `-` (mis. `AdminFSdanRekan2026!_`).
>    - Untuk `DATABASE_URL`: jika password database MySQL mengandung karakter khusus (`@`, `#`, `:`, `/`, `%`, spasi), **wajib di-URL-encode** (`@` $\rightarrow$ `%40`, `#` $\rightarrow$ `%23`, `%` $\rightarrow$ `%25`, spasi $\rightarrow$ `%20`).

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

### Struktur Folder Produksi yang Benar di Server (`app_modules/` Anti-Bentrok CloudLinux)
CloudLinux Node.js Selector di cPanel secara otomatis mengganti folder bernama `node_modules` di dalam Application Root (`fsdanrekan_app`) menjadi symlink ke `/home/<user_cpanel>/nodevenv/fsdanrekan_app/24/lib/node_modules`. Agar dependensi bawaan Next.js standalone tidak tertimpa oleh symlink kosong tersebut, skrip `npm run package:deploy` menempatkan seluruh modul produksi di dalam folder **`app_modules/`** (tidak ada folder `node_modules` di dalam file zip) dan `server.js` otomatis mendaftarkan `app_modules/` ke `NODE_PATH` serta resolver internal Node.js saat startup:

```text
/home/<user_cpanel>/
├── fsdanrekan_uploads/                  <-- Folder persisten gambar upload (UPLOAD_DIR)
└── fsdanrekan_app/                      <-- Application Root Node.js cPanel
    ├── .next/
    │   ├── BUILD_ID
    │   ├── server/
    │   └── static/                      <-- Aset CSS/JS hasil build
    ├── app_modules/                     <-- Dependensi runtime produksi (100% pure JS, bebas bentrok symlink cPanel)
    ├── content/                         <-- Seed JSON resmi (team, practice_areas, articles, dll.)
    ├── database/
    │   ├── schema.sql                   <-- Skema SQL 14 tabel MySQL/MariaDB
    │   └── phpmyadmin_bootstrap.sql     <-- Skema + Seed lengkap siap impor lewat phpMyAdmin
    ├── node_modules -> /home/.../nodevenv/... <-- Symlink otomatis milik cPanel (dibiarkan apa adanya)
    ├── public/                          <-- Aset statis bawaan (foto advokat, logo, favicon)
    ├── scripts/
    │   └── migrate_mysql.mjs            <-- Skrip migrasi & seed database idempoten (opsional CLI)
    ├── .env.example
    ├── package.json                     <-- Hanya berisi dependencies runtime (cadangan Opsi c)
    ├── server.js                        <-- Startup file Passenger (memuat app_modules & diagnostik stderr)
    └── standalone-server.js             <-- Server internal Next.js standalone
```

### Aturan Penting: Kapan BOLEH dan TIDAK BOLEH Menekan "Run NPM Install" di cPanel
- **Anda TIDAK PERLU menekan tombol "Run NPM Install" saat menggunakan `fsdanrekan-deploy.zip`:**
  1. Seluruh modul produksi (`next`, `react`, `mysql2`, `nodemailer`, `zod`, dll.) sudah tersedia lengkap di dalam folder **`app_modules/`** dan otomatis dimuat oleh `server.js` tanpa menyentuh symlink `node_modules` milik cPanel.
  2. Cukup ekstrak `fsdanrekan-deploy.zip` ke `/home/<user_cpanel>/fsdanrekan_app`, lalu klik tombol **Restart** pada halaman **Setup Node.js App**.
- **Cadangan `package.json` Runtime (Bila Tombol "Run NPM Install" Ditekan):**  
  File `package.json` di dalam `fsdanrekan-deploy.zip` sudah dibersihkan dari seluruh `devDependencies` berat (`payload`, `@playwright/test`, `typescript`, `eslint`, `vitest`). Jika suatu saat Anda menekan *Run NPM Install* di cPanel sebagai cadangan, ukuran unduhan hanya ~45–60 MB dengan puncak memori instalasi ~220–280 MB RAM (masih di bawah batas 1 GB RAM), dan tetap tidak akan mengganggu folder `app_modules/`.

### Cara Menghapus `ADMIN_INITIAL_PASSWORD` Setelah Login Pertama
Setelah Anda login pertama kali di `https://fsdanrekan.com/admin` dan mengganti kata sandi awal menjadi kata sandi permanen:
1. Buka **cPanel -> Software -> Setup Node.js App**.
2. Klik ikon **Pensil (Edit)** pada baris aplikasi `fsdanrekan_app`.
3. Gulir ke bagian **Environment variables**, cari variabel bernama `ADMIN_INITIAL_PASSWORD`.
4. Klik ikon **Tempat Sampah (Delete)** di sebelah kanan variabel `ADMIN_INITIAL_PASSWORD`, lalu konfirmasi penghapusan.
5. Klik tombol **Save** di kanan atas, kemudian klik tombol **Restart** agar proses Node.js memuat ulang konfigurasi tanpa menyimpan password awal di memori environment.

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

## H. Jadwal Cron Retensi Data (UU PDP) & Prosedur Backup / Restore Rutin

### 1. Mendaftarkan Cron Retensi Data 12 Bulan di cPanel (`CRON_SECRET`)
Sesuai Kebijakan Privasi & `SECURITY.md` (`SEC-014`), data permohonan janji temu (`inquiries`) dan sesi chat (`chat_sessions`) yang berusia lebih dari **12 bulan (365 hari)** serta sesi login/rate-limit yang sudah kedaluwarsa harus dibersihkan secara berkala melalui endpoint `/api/cron/retention`:

1. Pastikan Anda sudah mengisi variabel `CRON_SECRET` di **Setup Node.js App -> Environment variables** (misalnya string acak 32 karakter).
2. Buka **cPanel -> Advanced -> Cron Jobs**.
3. Pada bagian **Add New Cron Job**:
   - Pilih **Common Settings**: `Once Per Day (0 0 * * *)` lalu ubah jamnya menjadi pukul `03:00` dini hari (`Minute: 0`, `Hour: 3`, `Day: *`, `Month: *`, `Weekday: *`).
   - Pada kolom **Command**, masukkan perintah berikut (ganti `<ISI_CRON_SECRET_ANDA>` dengan nilai `CRON_SECRET` Anda):
     ```bash
     curl -sS -X POST https://fsdanrekan.com/api/cron/retention -H "Authorization: Bearer <ISI_CRON_SECRET_ANDA>" >/dev/null 2>&1
     ```
4. Klik **Add New Cron Job**.

---

### 2. Backup Database MySQL/MariaDB Secara Rutin
- **Metode A — Manual lewat phpMyAdmin (Mingguan & Sebelum Update Kode):**
  1. Buka **cPanel -> Databases -> phpMyAdmin**.
  2. Klik database `cpaneluser_fsdanrekan` di panel kiri, lalu klik tab **Export** di bagian atas.
  3. Pilih **Custom — display all possible options**:
     - Pastikan seluruh 14 tabel terpilih.
     - Pada bagian *Object creation options*, centang **Add DROP TABLE / VIEW / PROCEDURE / FUNCTION / EVENT / TRIGGER statement**.
  4. Klik **Go / Export** dan simpan file `cpaneluser_fsdanrekan_YYYY-MM-DD.sql` di penyimpanan lokal/cloud kantor.
- **Metode B — Otomatis lewat Cron Jobs cPanel (Harian):**
  1. Buat folder `/home/<user_cpanel>/backups` melalui **File Manager** (di luar `public_html` agar tidak dapat diakses publik).
  2. Buka **cPanel -> Advanced -> Cron Jobs**, tambahkan jadwal harian (`0 2 * * *` — pukul 02.00 WIB) dengan perintah:
     ```bash
     mysqldump --single-transaction --routines --triggers -u cpaneluser_appuser -p'PASSWORD_DB_ANDA' cpaneluser_fsdanrekan | gzip > /home/<user_cpanel>/backups/db_$(date +\%F).sql.gz && find /home/<user_cpanel>/backups -name "db_*.sql.gz" -mtime +30 -delete
     ```
     *(Perintah di atas menyimpan backup harian terkompresi `.sql.gz` dan otomatis menghapus backup yang berusia lebih dari 30 hari agar SSD 60 GB tidak penuh).*

---

### 3. Backup Folder Gambar Persisten (`UPLOAD_DIR`)
Seluruh gambar yang diunggah dari panel `/admin` berada di `/home/<user_cpanel>/fsdanrekan_uploads`:
- **Manual lewat File Manager (Mingguan):**  
  Buka **File Manager** -> masuk ke `/home/<user_cpanel>/` -> klik kanan pada folder `fsdanrekan_uploads` -> klik **Compress** -> pilih **Zip Archive** -> unduh file `fsdanrekan_uploads.zip` ke komputer Anda.
- **Otomatis lewat Cron Jobs (Mingguan — Setiap Minggu Pukul 02.30 WIB `30 2 * * 0`):**
  ```bash
  tar -czf /home/<user_cpanel>/backups/uploads_$(date +\%F).tar.gz -C /home/<user_cpanel> fsdanrekan_uploads && find /home/<user_cpanel>/backups -name "uploads_*.tar.gz" -mtime +30 -delete
  ```

---

### 4. Prosedur Restore (Pemulihan Saat Darurat)
1. **Restore Database MySQL/MariaDB:**
   - Buka **phpMyAdmin** -> pilih database `cpaneluser_fsdanrekan` -> klik tab **Import**.
   - Klik **Choose File** dan pilih file backup `.sql` atau `.sql.gz` terbaru Anda -> klik **Go**.
   - Buka `https://fsdanrekan.com/api/health` untuk memastikan koneksi database kembali `ok`.
2. **Restore Folder Gambar (`UPLOAD_DIR`):**
   - Buka **File Manager** -> masuk ke `/home/<user_cpanel>/`.
   - Unggah file backup `fsdanrekan_uploads.zip` (atau `uploads_YYYY-MM-DD.tar.gz`), klik kanan -> **Extract** ke `/home/<user_cpanel>/` sehingga seluruh file kembali berada di `/home/<user_cpanel>/fsdanrekan_uploads/`.
   - Buka salah satu gambar artikel/galeri di website untuk memastikan route `/uploads/[...path]` berhasil menyajikan gambar kembali.

---

## I. Troubleshooting Umum & Cara Melihat Log

### 1. Cara Melihat Log Error di cPanel
- Log aplikasi Node.js (Phusion Passenger) tersimpan otomatis di:
  `/home/<user_cpanel>/fsdanrekan_app/stderr.log`
- Anda juga dapat memantau error server melalui menu **Metrics -> Errors** di cPanel.

### 2. Masalah Umum & Solusinya
| Gejala / Error | Penyebab Umum | Solusi Langkah demi Langkah |
|---|---|---|
| **`Error: Cannot find module '.../node_modules/next/dist/server/next.js' (MODULE_NOT_FOUND)`** | CloudLinux Node.js Selector mengganti folder `node_modules` di Application Root menjadi symlink ke `nodevenv` kosong, atau arsip zip lama diekstrak dengan separator backslash Windows. | 1. Gunakan `fsdanrekan-deploy.zip` terbaru yang menempatkan seluruh dependensi di dalam folder **`app_modules/`** (bukan `node_modules/`) dengan format path POSIX (`/`).<br>2. Sebelum mengekstrak zip baru, hapus file/folder lama di `/home/<user>/fsdanrekan_app` **kecuali** symlink `node_modules` milik cPanel, lalu ekstrak `fsdanrekan-deploy.zip`.<br>3. Pastikan folder `/home/<user>/fsdanrekan_app/app_modules/next/dist/server/next.js` dan `/home/<user>/fsdanrekan_app/.next/BUILD_ID` ada.<br>4. Jika ada modul yang belum terunggah, `server.js` akan menulis daftar path yang dicari secara jelas ke `/home/<user>/fsdanrekan_app/stderr.log`. |
| **Error 503 Service Unavailable / Phusion Passenger Error** | File `standalone-server.js` belum terunggah, ada baris Environment Variable kosong di cPanel, atau ketidakcocokan modul Passenger pada Node 24. | 1. Cek `/home/<user>/fsdanrekan_app/stderr.log`.<br>2. Periksa daftar **Environment variables** di Setup Node.js App: pastikan tidak ada baris variabel dengan nama kosong dan tidak ada spasi/karakter khusus tanpa encoding di `DATABASE_URL`.<br>3. **Fallback Versi Node.js (Tanpa Build Ulang):** Jika aplikasi gagal start pada **Node `24.22.1`** di cPanel, buka **Setup Node.js App**, ganti *Node.js version* ke **`20.20.2`**, klik **Save**, lalu klik **Restart**. Anda **tidak perlu** melakukan `next build` atau `package:deploy` ulang di laptop karena `fsdanrekan-deploy.zip` sudah 100% pure JavaScript (bebas binary native C++ `.node`/`.so` yang terikat versi ABI Node). |
| **`/api/health` mengembalikan `503 degraded` (Koneksi DB gagal)** | `DATABASE_URL` salah ketik, karakter spesial password belum di-encode, atau user belum diberi *ALL PRIVILEGES*. | 1. Pastikan host di `DATABASE_URL` menggunakan `127.0.0.1:3306` (bukan nama domain).<br>2. Pastikan karakter `@` atau `#` di password diubah menjadi `%40` atau `%23`.<br>3. Cek kembali bagian *Add User To Database* di menu **MySQL Databases**. |
| **Email Janji Temu tidak terkirim (`email_failed = 1`)** | `SMTP_USER` / `SMTP_PASS` salah, atau port `465` diblokir keluar. | 1. Tenang: data permohonan klien **tetap tersimpan aman** di tab Inquiries `/admin` dengan label peringatan kuning.<br>2. Pastikan akun `noreply@fsdanrekan.com` sudah dibuat di **Email Accounts** dan password-nya cocok dengan `SMTP_PASS`.<br>3. Jika port `465` tidak terhubung dari `mail.fsdanrekan.com`, coba ubah `SMTP_HOST` menjadi `127.0.0.1` di cPanel yang sama. |
| **Kehabisan Memori (`Out of Memory` / `ENOMEM` pada paket 1 GB RAM)** | Menjalankan `npm run build` di server cPanel atau terlalu banyak proses worker. | 1. **Jangan pernah** menjalankan `next build` di dalam server cPanel.<br>2. Selalu jalankan `npm run package:deploy` di komputer lokal dan unggah `fsdanrekan-deploy.zip`.<br>3. Koneksi pool MySQL sudah dibatasi ke `5` koneksi (`connectionLimit: 5`) agar hemat RAM. |
| **Catatan Batasan Rate-Limit pada Multi-Proses Passenger** | Bagaimana rate-limiter bekerja bila Passenger menjalankan lebih dari satu proses Node.js. | Aplikasi ini menggunakan **Rate Limiter Hibrida**: jika database MySQL aktif, hitungan rate-limit (`5 req/10 menit` untuk form janji temu dan `10 req/15 menit` untuk login admin) disimpan secara atomik di tabel MySQL `rate_limits` (`INSERT ... ON DUPLICATE KEY UPDATE`), sehingga **tetap sinkron meskipun Passenger menjalankan lebih dari satu proses**. Jika koneksi MySQL sedang terputus sementara, sistem otomatis beralih ke fallback memori per-proses (`Map`). |

---

## J. Daftar Pertanyaan Konfirmasi ke Tim Support Biznet Gio

Sebelum atau saat melakukan setup pertama kali, Anda dapat mengirimkan tiket/chat ke tim Support **Biznet Gio** dengan daftar pertanyaan berikut:

1. **Fitur Setup Node.js App (CloudLinux Passenger):**  
   *"Apakah pada paket Web Hosting Personal Large untuk domain `fsdanrekan.com`, fitur **Setup Node.js App** (Phusion Passenger) sudah aktif dengan versi **Node.js `24.22.1`** (dan fallback **`20.20.2`**)?"*
2. **Batas Memori (RAM) & Jumlah Proses (LVE Limits):**  
   *"Berapa batas maksimum Physical Memory (RAM), Entry Processes (EP), dan Number of Processes (NPROC) untuk akun cPanel paket Personal Large kami, dan apakah Passenger dikonfigurasi 1 proses worker secara default?"*
3. **Akses Terminal / SSH:**  
   *"Apakah akses **Terminal cPanel** atau **SSH** diaktifkan pada paket Personal Large agar kami dapat menjalankan skrip migrasi database (`node scripts/migrate_mysql.mjs`)?"*
4. **Koneksi SMTP Lokal Loopback:**  
   *"Untuk pengiriman email aplikasi Node.js di server cPanel yang sama, apakah disarankan menggunakan host `mail.fsdanrekan.com` port `465` (SSL) atau `127.0.0.1` port `465`/`587`?"*
5. **Konfirmasi Python Tidak Dibutuhkan di Produksi:**  
   *"Kami menggunakan Next.js Node.js standalone penuh di produksi (skrip Python di repositori kami hanya untuk alat pratinjau lokal). Mohon konfirmasi bahwa tidak ada layanan Python yang perlu diaktifkan di cPanel."*

---

## K. Prosedur Pembaruan Aplikasi Live & Migrasi Inkremental (Admin UX Update)

Ketika website sudah berjalan live di cPanel Biznet dan database sudah memuat data asli, ikuti langkah berurutan di bawah ini untuk memperbarui aplikasi tanpa downtime dan tanpa kehilangan data:

### Langkah 1 — Cadangkan (Backup) Database & Berkas Aplikasi
1. **Ekspor Database Live via phpMyAdmin:**
   - Masuk ke **cPanel -> Databases -> phpMyAdmin**.
   - Pilih database aplikasi (`cpaneluser_fsdanrekan`).
   - Klik tab **Export** -> pilih metode **Quick** (atau **Custom** dengan *Add DROP TABLE*) -> klik **Export** dan simpan file `.sql` di laptop Anda.
2. **Cadangkan Folder Kode Aplikasi:**
   - Masuk ke **cPanel -> Files -> File Manager**.
   - Masuk ke folder `/home/<user_cpanel>/`.
   - Klik kanan pada `fsdanrekan_app`, pilih **Compress** -> simpan sebagai `fsdanrekan_app_backup.zip`.
3. **Pastikan Folder Upload Aman:**
   - Folder `/home/<user_cpanel>/fsdanrekan_uploads` berada di luar `fsdanrekan_app` dan **TIDAK PERLU disentuh atau dihapus**. Seluruh gambar yang sudah diunggah klien tetap aman di tempatnya.

---

### Langkah 2 — Impor SQL Migrasi Inkremental via phpMyAdmin
File migrasi inkremental tersedia di:
- `database/migrations/001_case_records_photos.sql` (Universal untuk MySQL 5.7+ & MariaDB 10.3+)
- `database/migrations/001_case_records_photos_mariadb.sql` (Sintaks khusus MariaDB `ADD COLUMN IF NOT EXISTS`)

**Cara Impor:**
1. Di phpMyAdmin, pastikan database `cpaneluser_fsdanrekan` sedang aktif terpilih.
2. Klik tab **Import** di bagian atas.
3. Klik **Choose File**, pilih file `database/migrations/001_case_records_photos.sql`.
4. Klik tombol **Import / Go** di bagian bawah.
5. Pesan hijau akan muncul: *Import has been successfully finished*.
   > **Keamanan Data:** Skrip migrasi ini dirancang dinamis dan idempoten: memeriksa keberadaan kolom `photos_json` terlebih dahulu sebelum melakukan penambahan, dan melakukan backfill data gambar lama ke format galeri hanya jika kolom masih kosong. Data lama Anda dijamin tidak tertimpa dan tidak terhapus.

---

### Langkah 3 — Buat Paket Deploy di Komputer Lokal & Unggah ke cPanel
1. Di komputer lokal Anda (cabang `admin-ux`), jalankan:
   ```bash
   npm run package:deploy
   ```
2. Salin atau unggah file **`fsdanrekan-deploy.zip`** ke cPanel via **File Manager** ke dalam folder `/home/<user_cpanel>/fsdanrekan_app`.
3. Klik kanan pada `fsdanrekan-deploy.zip` -> pilih **Extract** ke `/fsdanrekan_app`.
4. Hapus file `fsdanrekan-deploy.zip` setelah selesai diekstrak.

---

### Langkah 4 — Muat Ulang (Restart) Aplikasi Node.js
1. Masuk ke cPanel -> bagian **Software** -> klik **Setup Node.js App**.
2. Pada baris aplikasi `fsdanrekan_app`, klik tombol **Restart**.
3. Tunggu 5–10 detik hingga status kembali hijau.

---

### Langkah 5 — Verifikasi Hasil Migrasi & Status Sistem
Buka tautan health check di peramban Anda:
```text
https://fsdanrekan.com/api/health
```
Pastikan respons berstatus `200 OK` dengan format:
```json
{
  "ok": true,
  "status": "healthy",
  "database": {
    "configured": true,
    "connected": true,
    "latencyMs": 5,
    "migrations": {
      "photosJsonReady": true
    }
  }
}
```
Indikator `"photosJsonReady": true` membuktikan database telah mengenali fitur galeri banyak foto secara penuh. Jika migrasi SQL belum diimpor, aplikasi tetap berjalan normal dengan fallback tanpa error.

---

## L. Panduan Klien: Cara Cek Hasil Pembaruan Panel Admin (10 Langkah Sederhana)

Berikan panduan singkat ini kepada tim staf kantor hukum untuk memeriksa dan membiasakan diri dengan antarmuka baru:

1. **Masuk ke Panel Pengelolaan (`/admin`):**
   Buka `https://fsdanrekan.com/admin` dan masuk menggunakan akun email serta kata sandi Anda seperti biasa.

2. **Periksa Beranda Panel Pengelolaan:**
   Perhatikan ringkasan data kantor hukum dan status penyimpanan. Istilah teknis asing dan kode internal telah dibersihkan menjadi Bahasa Indonesia yang mudah dipahami.

3. **Uji Pengunggahan Foto pada Formulir Artikel:**
   Buka tab **Artikel** -> klik artikel atau buat baru. Gunakan tombol **Pilih Foto** atau tarik foto langsung ke kotak dropzone. Foto akan otomatis diperkecil agar cepat dibuka di ponsel dan metadata lokasi (GPS) langsung disamarkan demi privasi.

4. **Uji Fitur Banyak Foto pada Rekam Jejak Perkara:**
   Buka tab **Rekam Jejak** -> buat atau edit perkara. Anda kini dapat memilih **hingga 10 foto dokumentasi sekaligus**. Setiap foto memiliki kolom keterangan, tombol urutkan naik/turun, dan foto pertama otomatis menjadi foto sampul.

5. **Periksa Peringatan Kerahasiaan Klien di Formulir Perkara:**
   Perhatikan pengingat ramah di atas formulir: *"Demi menjaga kerahasiaan klien, identitas perkara secara otomatis disamarkan..."*. Jika opsi "Tampilkan Nama Klien" dipilih, sistem mengingatkan staf untuk mengisi nomor dokumen izin tertulis dari klien.

6. **Uji Pengunggahan Foto Profil Tim:**
   Buka tab **Profil Tim** -> buat atau edit profil advokat. Unggah foto profil, sistem otomatis mencocokkan teks penjelas foto (alt text) sesuai nama advokat.

7. **Buka Pustaka Foto:**
   Buka tab **Pustaka Foto**. Seluruh foto yang pernah diunggah kini tersusun rapi dengan pratinjau gambar, ukuran berkas, dan tombol satu klik **Salin Tautan** untuk memudahkan penggunaan ulang.

8. **Periksa Hak Akses Pengguna & Riwayat Aktivitas:**
   Buka tab **Pengguna & Riwayat**. Pilihan hak akses akun kini jelas: **Pengelola (Akses Penuh Seluruh Menu)** dan **Penyunting (Artikel, Kategori, Pustaka Foto)**. Riwayat aktivitas mencatat tindakan dalam bahasa sehari-hari.

9. **Periksa Keamanan Alat Pengembang (Khusus Pengelola):**
   Pada tab Beranda, bagian **Alat Pengembang** kini dilipat rapi. Jika tombol "Muat Ulang Data Bawaan" ditekan, muncul jendela konfirmasi 2 langkah yang aman (wajib mencentang pemahaman dan mengetik kata "MUAT ULANG") agar data asli kantor tidak terhapus tanpa sengaja.

10. **Periksa Tampilan Galeri Foto di Halaman Publik:**
    Buka beranda publik `https://fsdanrekan.com` dan gulir ke bagian **Rekam Jejak Perkara**. Klik salah satu perkara untuk membuka galeri dokumentasi foto interaktif lengkap dengan navigasi foto, keterangan, serta komitmen perlindungan kerahasiaan advokat.

---

## M. Cache Aset Statis, Pengujian Header, dan Cara Membatalkan (`.htaccess` & `next.config.ts`)

Pada hosting cPanel Biznet Gio berbasis LiteSpeed + CloudLinux Passenger, sebagian aset statis di `public/` dapat dilayani langsung oleh LiteSpeed sebelum mencapai proses Node.js. Karena itu, aturan cache aset statis diterapkan pada dua lapis yang saling melengkapi:

1. **Lapis Next.js (`next.config.ts`):**
   - `/_next/static/:path*` → `Cache-Control: public, max-age=31536000, immutable` (aman memakai `immutable` karena nama berkas mengandung hash isi).
   - `/images/:path*`, `/team/:path*`, `/logo-seal.webp`, `/logo-seal-transparent.png`, `/og-default.webp`, `/favicon.ico`, `/icon.png` → `Cache-Control: public, max-age=2592000, stale-while-revalidate=86400` (**tanpa `immutable`**, karena nama berkas statis ini bisa dipakai ulang jika gambar diganti).
   - `/uploads/:path*` → sudah dilayani oleh route handler khusus dengan nama berkas unik berbasis timestamp + hash acak (`immutable`).
   - `/admin`, `/admin/:path*`, `/api/admin/:path*`, `/api/inquiry`, `/api/chat`, `/api/instagram/sync` → dipaksa `Cache-Control: private, no-store, no-cache, must-revalidate` dan `Pragma: no-cache` agar panel admin dan formulir konsultasi tidak pernah di-cache.

2. **Lapis LiteSpeed / Apache (`public/.htaccess`):**
   - Berkas minimal `public/.htaccess` hanya mengatur `Cache-Control: public, max-age=2592000, stale-while-revalidate=86400` untuk ekstensi gambar/ikon/font (`webp|png|jpe?g|ico|woff2`) tanpa `immutable` dan tanpa aturan rewrite apa pun agar tidak bentrok dengan Passenger.
   - **Catatan cPanel:** Apabila hasil uji `curl -I` terhadap `/images/hero-bg.webp` di server produksi belum menampilkan header `Cache-Control` (karena konfigurasi VirtualHost LiteSpeed hanya membaca `.htaccess` di `public_html`), tambahkan blok minimal berikut di **paling atas** `public_html/.htaccess` (tepat **di atas** `# DO NOT REMOVE. CLOUDLINUX PASSENGER CONFIGURATION`):

```apache
<IfModule mod_headers.c>
  SetEnvIfNoCase Request_URI "^/(images/|team/|logo-seal\.webp|logo-seal-transparent\.png|og-default\.webp|favicon\.ico|icon\.png)" FS_STATIC_ASSET=1
  Header set Cache-Control "public, max-age=2592000, stale-while-revalidate=86400" env=FS_STATIC_ASSET
</IfModule>
```

### Cara Menguji Header Setelah Deploy

Jalankan perintah berikut dari terminal lokal atau SSH cPanel:

```bash
# 1. Aset gambar statis (harus ada max-age=2592000 dan TANPA immutable)
curl -sI https://fsdanrekan.com/images/hero-bg.webp | grep -i "cache-control"
curl -sI https://fsdanrekan.com/team/ferdinan-hasiholan-silalahi.webp | grep -i "cache-control"

# 2. Bundle Next.js ber-hash (harus max-age=31536000, immutable)
STATIC_CSS=$(curl -s https://fsdanrekan.com/ | grep -o '/_next/static/[^"]*\.css' | head -n 1)
curl -sI "https://fsdanrekan.com${STATIC_CSS}" | grep -i "cache-control"

# 3. Halaman publik (ISR cache aktif, berubah cepat setelah simpan di /admin)
curl -sI https://fsdanrekan.com/ | grep -iE "cache-control|x-nextjs-cache"

# 4. Panel admin dan API form (wajib no-store, tidak boleh public cache)
curl -sI https://fsdanrekan.com/admin | grep -i "cache-control"
```

### Cara Membatalkan (Rollback) Bila Terjadi Kendala

Jika ada aset lama yang tertahan cache atau ada perilaku header yang tidak sesuai:

1. **Membatalkan `.htaccess` (langsung aktif tanpa restart Node.js):**
   - Hapus atau ubah nama `/home/<user_cpanel>/apps/fsdanrekan/public/.htaccess` menjadi `.htaccess.bak` melalui File Manager cPanel.
   - Jika Anda menambahkan blok `FS_STATIC_ASSET` di `public_html/.htaccess`, hapus 4 baris blok tersebut (biarkan blok `# DO NOT REMOVE. CLOUDLINUX PASSENGER CONFIGURATION` tetap utuh).
2. **Membatalkan sementara lewat peramban:**
   - Lakukan hard refresh (`Ctrl+Shift+R`) atau ganti nama file aset jika ingin memaksa semua pengunjung mengambil gambar terbaru seketika.
3. **Membatalkan perubahan `next.config.ts`:**
   - Kembalikan fungsi `headers()` di `next.config.ts` agar hanya mengembalikan `securityHeaders`, jalankan ulang `npm run build`, unggah hasil build, lalu klik **Restart** di menu **Setup Node.js App** cPanel.


