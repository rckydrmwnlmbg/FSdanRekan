# PRD — Website Ferdinan Silalahi dan Rekan Law Firm

**Versi:** 1.0 (Draft)
**Pemilik produk:** Ricky Darmawan Lambogo (penyedia jasa)
**Client:** Ferdinan Silalahi dan Rekan Law Firm, Gedung Mandira Lt. 4, Jl. RP Soeroso No. 33, Gondangdia, Menteng, Jakarta Pusat
**Dasar kontrak:** Proposal No. 001/RDL/PNW/X/2026 dan SPK No. 001/SPK/RDL/X/2026
**Dokumen terkait:** `CONTENT_PROFILES.md`, `DESIGN.md`, `TECH_STACK.md`, `SECURITY.md`, `AGENTS.md`, `SKILLS.md`

> **Scope guard.** Fitur bertanda **MVP** = ruang lingkup SPK paket utama (Rp5.500.000). Fitur bertanda **v2** atau **Nanti** = di luar SPK, dikerjakan setelah ada persetujuan tertulis dan invoice terpisah (SPK Pasal 14). Agent tidak boleh membangun fitur v2 atau Nanti tanpa instruksi eksplisit.

---

## 1. Problem Statement

**Siapa yang dirugikan:**

1. **Calon klien** (individu dan pelaku usaha) yang mencari kantor hukum. Mereka menilai kredibilitas firma dari website, dan sulit menemukan jalur yang jelas untuk berkonsultasi. Website saat ini berupa satu halaman panjang, kontak WhatsApp di bagian bawah, bio tim panjang dengan teks kecil di ponsel, dan gambar yang tidak seragam.
2. **Firma hukum** yang kehilangan calon klien karena kesan kredibilitas rendah dan hambatan untuk menghubungi. Mereka juga bergantung pada pihak lain untuk memperbarui konten.
3. **Staf kantor** yang ingin menerbitkan artikel hukum tetapi tidak punya cara mandiri yang nyaman.

**Mengapa:** Kepercayaan dibangun di titik pertama kontak. Website yang konsisten, profesional, dan memudahkan janji temu mengurangi hambatan, dan konten artikel membantu ditemukan di mesin pencari.

## 2. Target User dan Persona

**Target user:** (a) calon klien individu dan korporasi di Jakarta dan sekitarnya, (b) staf internal kantor sebagai pengelola konten.

### Persona 1 — Calon Klien: "Bu Rina" *(persona hipotetis)*
- Pemilik usaha menengah, 42 tahun, Jakarta. Menghadapi sengketa kontrak dan perlu pendamping hukum.
- Mengakses lewat ponsel, sering saat jam istirahat.
- Kebutuhan: memastikan kantor kredibel, melihat siapa penanganinya, dan menghubungi dengan cepat tanpa mengisi form panjang.
- Frustrasi: halaman lambat, teks kecil, tidak jelas harus klik apa untuk membuat janji.

### Persona 2 — Pengelola Konten: "Mbak Delia" *(persona hipotetis, terinspirasi peran Legal Administrator)*
- Staf administrasi hukum, 28 tahun, terbiasa dengan dokumen dan arsip, bukan developer.
- Kebutuhan: menerbitkan artikel, mengganti foto atau bio, dan melihat permintaan konsultasi masuk, tanpa bantuan developer.
- Frustrasi: panel rumit, takut merusak tampilan, tidak tahu apakah artikel sudah terbit.

## 3. Goals dan Non-Goals

**Goals**
1. Tampilan premium, konsisten, dan selaras identitas visual firma di ponsel, tablet, dan desktop.
2. Jalur janji temu jelas dan langsung (WhatsApp dan form konsultasi ke email) di setiap bagian halaman.
3. Staf dapat mengelola artikel dan profil tanpa developer.
4. Fondasi SEO dasar agar mudah ditemukan.
5. Aman secara bawaan (lihat `SECURITY.md`) dan patuh pada etika iklan advokat dan pelindungan data pribadi.

**Non-Goals (MVP)**
1. Kalender booking online dan pembayaran online.
2. Chatbot dua arah, galeri Instagram, rekam jejak perkara, testimoni, video.
3. Multi-bahasa.
4. Portal klien (login klien, dokumen perkara).
5. SEO berkelanjutan, iklan berbayar, pengelolaan media sosial.
6. Konsultasi hukum otomatis atau jawaban hukum oleh sistem.

## 4. User Stories

| ID | Cerita |
|---|---|
| US-01 | Sebagai calon klien, saya ingin melihat siapa saja tim dan keahliannya, supaya saya yakin kantor ini kredibel. |
| US-02 | Sebagai calon klien, saya ingin menekan satu tombol untuk membuka WhatsApp dengan pesan yang sudah terisi, supaya saya tidak perlu mengetik dari awal. |
| US-03 | Sebagai calon klien, saya ingin mengisi form konsultasi singkat, supaya kantor menghubungi saya pada waktu yang cocok. |
| US-04 | Sebagai calon klien, saya ingin membaca artikel hukum, supaya saya memahami masalah saya sebelum berkonsultasi. |
| US-05 | Sebagai calon klien di ponsel, saya ingin teks mudah dibaca dan halaman cepat, supaya saya tidak meninggalkan halaman. |
| US-06 | Sebagai staf kantor, saya ingin menulis, menyimpan sebagai draf, dan menerbitkan artikel dari panel admin, supaya saya tidak bergantung pada developer. |
| US-07 | Sebagai staf kantor, saya ingin memperbarui foto dan bio anggota tim, supaya informasi selalu terkini. |
| US-08 | Sebagai staf kantor, saya ingin menerima email setiap ada permintaan konsultasi, supaya tidak ada yang terlewat. |
| US-09 | Sebagai Managing Partner, saya ingin nama kantor dan informasi kontak konsisten di seluruh website, supaya citra firma terjaga. |
| US-10 | Sebagai pemilik proyek, saya ingin website aman dan datanya dilindungi, supaya reputasi kantor hukum tidak tercoreng. |

## 5. Daftar Fitur

### MVP (ruang lingkup SPK)
| ID | Fitur |
|---|---|
| F1 | Beranda (hero, ajakan janji temu, ringkasan layanan dan tim) |
| F2 | Tentang kantor |
| F3 | Tim (**5 profil**, kartu plus panel "Selengkapnya") |
| F4 | Bidang Layanan (10 bidang) |
| F5 | Artikel publik (daftar, detail, kategori) |
| F6 | Panel admin artikel dan profil |
| F7 | Kontak, peta, form konsultasi diteruskan ke email |
| F8 | Tombol WhatsApp (pesan otomatis terisi) di header, hero, dan tombol melayang |
| F9 | SEO dasar (title, meta, sitemap, struktur judul, Open Graph) |
| F10 | Responsif, aksesibilitas dasar, performa |
| F11 | HTTPS, pengalihan alamat lama, serah terima, panduan admin PDF |

> **Perhatian:** SPK menyebut **empat** profil tim, data terbaru berisi **lima**. Profil kelima adalah perubahan ruang lingkup kecil; konfirmasi ke client dan catat tertulis sebelum rilis.

### v2 (di luar SPK, invoice terpisah)
| ID | Fitur |
|---|---|
| V1 | Widget chat pemandu di website yang membuka WhatsApp dengan pesan terisi |
| V2 | Ringkasan interaksi chatbot dikirim ke WhatsApp admin (WhatsApp Business Platform) dan arsip transkrip |
| V3 | Galeri Instagram |
| V4 | Rekam jejak perkara (anonim secara default) |
| V5 | Email domain baru dan pengaturan DNS |
| V6 | Pemeliharaan dan administrasi pasca-proyek (perjanjian terpisah) |

### Nanti
Halaman detail tiap bidang layanan, halaman profil lengkap per pengacara, testimoni, video, multi-bahasa, newsletter, balasan dua arah dari WhatsApp ke jendela chat.

## 6. Functional Requirements (MVP)

### F1 Beranda
- FR-1.1 Hero memuat judul, satu paragraf deskripsi, tombol "Jadwalkan Janji Temu" (menuju form) dan "Kontak WhatsApp".
- FR-1.2 Bagian ringkasan: bidang layanan (maks. 6 tampil, tautan ke seluruh daftar), tim, dan artikel terbaru (3 item).
- FR-1.3 Tidak menampilkan angka statistik (tahun pengalaman, jumlah perkara, tingkat keberhasilan) kecuali ada konfirmasi tertulis dan lolos tinjauan etika.
- FR-1.4 Alamat kantor memakai alamat resmi (Gedung Mandira Lt. 4, Jl. RP Soeroso No. 33, Gondangdia, Menteng). Jangan memakai alamat contoh dari demo.

### F3 Tim
- FR-3.1 Data dari `CONTENT_PROFILES.md`. Setiap profil: foto, nama, gelar, jabatan, `shortBio`, tags.
- FR-3.2 Tombol "Selengkapnya" membuka panel (dialog) berisi `fullBio` pada halaman yang sama. Tidak ada halaman terpisah per orang di MVP.
- FR-3.3 Panel dapat dibuka dengan keyboard, ditutup dengan tombol Esc, dan fokus kembali ke tombol pemicu.
- FR-3.4 Teks bio minimal 16px di ponsel, lebar baris maksimal 70 karakter.
- FR-3.5 Urutan tampil dari `displayOrder` dan dapat diubah di admin.

### F4 Bidang Layanan
- FR-4.1 Sepuluh bidang dengan nama, ikon, dan ringkasan 1 sampai 2 kalimat. Daftar bidang dari client (`TODO(client)`).
- FR-4.2 Tampilan interaktif (pilih bidang menampilkan ringkasannya) harus berfungsi tanpa JavaScript untuk konten dasar (progressive enhancement).

### F5 Artikel publik
- FR-5.1 Daftar artikel dengan pagination (9 per halaman), filter kategori, dan urutan terbaru.
- FR-5.2 Detail artikel: judul, tanggal, penulis, kategori, isi, gambar sampul, tombol bagikan, dan CTA janji temu.
- FR-5.3 Hanya artikel berstatus `published` dan `publishedAt <= sekarang` yang tampil. Draf tidak boleh dapat diakses lewat URL.
- FR-5.4 Isi artikel disanitasi sebelum ditampilkan.
- FR-5.5 Setiap artikel memiliki meta title, meta description, dan Open Graph image.
- FR-5.6 Disclaimer standar di bawah artikel: konten bersifat informasi umum dan bukan nasihat hukum.

### F6 Panel admin
- FR-6.1 Login dengan email dan kata sandi kuat, plus MFA untuk peran admin.
- FR-6.2 Peran: `admin` (seluruh akses) dan `editor` (artikel, tidak bisa mengelola pengguna atau pengaturan).
- FR-6.3 CRUD artikel (judul, slug otomatis, isi rich text, gambar sampul, kategori, status draf atau terbit, jadwal terbit opsional, SEO).
- FR-6.4 CRUD kategori. Kategori yang masih dipakai tidak bisa dihapus.
- FR-6.5 Edit profil tim dan bidang layanan.
- FR-6.6 Edit pengaturan situs (alamat, nomor WhatsApp, email penerima form, tautan sosial).
- FR-6.7 Daftar permintaan konsultasi (hanya `admin`), dengan status `baru`, `dihubungi`, `selesai`, `spam`.
- FR-6.8 Unggah media: JPEG, PNG, WebP, maks. 5 MB, SVG ditolak.
- FR-6.9 Pratinjau draf sebelum terbit (tautan pratinjau hanya untuk pengguna yang login).

### F7 Kontak dan form konsultasi
- FR-7.1 Kolom: nama lengkap, email, nomor WhatsApp, bidang hukum (dropdown), tanggal pilihan, sesi (pagi, siang, sore), metode (tatap muka atau daring), uraian singkat (maks. 1000 karakter), persetujuan data pribadi (wajib).
- FR-7.2 Validasi di klien dan **wajib** di server. Pesan kesalahan dalam Bahasa Indonesia.
- FR-7.3 Perlindungan spam: honeypot, Cloudflare Turnstile, dan rate limit.
- FR-7.4 Data disimpan lebih dulu, lalu email notifikasi dikirim ke penerima. Jika email gagal, data tetap tersimpan dan ditandai `emailFailed` untuk dicoba ulang.
- FR-7.5 Setelah berhasil, tampilkan pesan konfirmasi dan opsi lanjut lewat WhatsApp.
- FR-7.6 Formulir **tidak meminta** detail perkara sensitif. Tampilkan peringatan: "Jangan menuliskan data rahasia atau dokumen perkara di sini."
- FR-7.7 Peta (embed) dimuat setelah interaksi (lazy), dengan tautan alternatif "Buka di Maps".

### F8 Tombol WhatsApp
- FR-8.1 Tautan berbentuk `https://wa.me/<nomor internasional>?text=<pesan ter-encode>`.
- FR-8.2 Pesan default dapat dikonfigurasi di pengaturan situs dan mencantumkan halaman asal.
- FR-8.3 Tombol melayang tidak menutupi konten penting di ponsel dan memiliki label aksesibel.
- FR-8.4 Jika perangkat tidak punya WhatsApp, tetap bisa membuka WhatsApp Web.

### F9 SEO
- FR-9.1 `<title>` dan meta description unik per halaman, satu `<h1>` per halaman.
- FR-9.2 `sitemap.xml`, `robots.txt`, canonical URL, Open Graph, dan data terstruktur `LegalService` atau `Organization`.
- FR-9.3 Pengalihan 301 dari alamat lama ke baru (daftar dari audit situs lama).

### F10 Responsif, aksesibilitas, performa
- FR-10.1 Breakpoint: 360, 768, 1024, 1280.
- FR-10.2 Kontras warna minimal WCAG AA (teks emas di atas latar gelap harus diuji).
- FR-10.3 Seluruh gambar memiliki `alt`; elemen interaktif dapat dijangkau keyboard.
- FR-10.4 Target Core Web Vitals pada ponsel: LCP < 2,5 detik, CLS < 0,1.
- FR-10.5 Gambar dioptimalkan (WebP/AVIF, ukuran responsif, lazy loading).

### F11 Peluncuran
- FR-11.1 Salinan konten website lama disimpan dan diserahkan sebelum DNS diubah.
- FR-11.2 Catatan MX, SPF, DKIM, dan DMARC dicatat sebelum perubahan DNS dan **tidak diubah** kecuali diminta.
- FR-11.3 Akun hosting dan domain atas nama client; developer diberi akses terbatas.
- FR-11.4 Serah terima: akses admin, aset desain, repositori, panduan PDF.

## 7. Sketsa Data Model

| Entitas | Field kunci |
|---|---|
| **SiteSettings** | firmName, address, whatsappNumber, defaultWaMessage, inquiryRecipientEmail, instagramUrl, mapEmbedUrl, officeHours |
| **User** | id, email, passwordHash, role (`admin`/`editor`), mfaEnabled, lockedUntil, lastLoginAt |
| **TeamMember** | id, slug, fullName, honorific, roleTitle, group, shortBio, fullBio (rich text), education[], languages[], tags[], photo (Media), displayOrder, isPublished |
| **PracticeArea** | id, slug, name, summary, icon, displayOrder, isPublished |
| **Article** | id, slug, title, excerpt, body (rich text), coverImage (Media), category (Category), authorName, status (`draft`/`published`), publishedAt, seoTitle, seoDescription, createdBy (User) |
| **Category** | id, slug, name |
| **Media** | id, filename, mimeType, size, alt, url |
| **Inquiry** | id, name, email, phone, practiceAreaId, preferredDate, sessionSlot, method, summary, consentAt, status, emailFailed, ipHash, createdAt |
| **AuditLog** | id, userId, action, entity, entityId, createdAt (tanpa isi data pribadi) |
| *(v2)* **ChatSession** | id (acak 128-bit), startedAt, endedAt, visitorName, visitorPhone, consentAt, summarySentAt |
| *(v2)* **ChatMessage** | id, sessionId, sender (`visitor`/`bot`), text (disanitasi), createdAt |
| *(v2)* **CaseRecord** | id, caseType, region, displayMode (`anonymous`/`named`), clientName (internal), consentRef, isPublished |

Aturan data: `Inquiry.summary` dan `ChatMessage.text` berpotensi memuat data pribadi sensitif. Terapkan masa simpan (usulan: 12 bulan lalu dihapus), akses hanya `admin`, dan jangan dicatat di log.

## 8. Edge Case dan Failure State

| Situasi | Perilaku yang diharapkan |
|---|---|
| Form dikirim berulang kali (spam) | Honeypot, Turnstile, rate limit 5 kiriman per 10 menit per IP; respons 429 dengan pesan ramah |
| Email notifikasi gagal terkirim | Data tersimpan, `emailFailed = true`, pengguna tetap melihat konfirmasi, admin diberi tahu di panel |
| Pengguna menonaktifkan JavaScript | Konten, navigasi, dan tautan WhatsApp tetap terlihat |
| Foto anggota tim hilang | Tampilkan placeholder monogram, bukan gambar rusak |
| Bio sangat panjang di ponsel | Kartu menampilkan `shortBio`; panel penuh dapat di-scroll |
| Slug artikel bentrok | Tambahkan sufiks angka otomatis, tampilkan peringatan di admin |
| URL draf dibuka publik | Respons 404 |
| Artikel terjadwal | Tidak tampil sebelum `publishedAt`; halaman diperbarui lewat revalidation |
| Konten rich text berisi skrip | Disanitasi sebelum simpan dan sebelum tampil |
| Nomor WhatsApp tidak valid di pengaturan | Admin tidak bisa menyimpan; validasi format internasional |
| Peta gagal dimuat | Tampilkan alamat teks dan tautan "Buka di Maps" |
| Basis data tidak tersedia | Halaman statis tetap tampil dari cache; form menampilkan pesan "coba lagi nanti" |
| Percobaan login berulang | Akun terkunci sementara; pesan umum tanpa membocorkan apakah email ada |
| Pengunjung dari tautan lama | Dialihkan 301 ke halaman baru; jika tidak ada padanan, ke beranda |
| *(v2)* Token Instagram kedaluwarsa | Galeri disembunyikan atau memakai cache terakhir, admin mendapat peringatan |
| *(v2)* Webhook WhatsApp tanpa tanda tangan sah | Tolak 401, jangan diproses |
| *(v2)* Pengunjung menutup chat sebelum selesai | Kirim ringkasan sebagian setelah 15 menit tanpa aktivitas |

## 9. Success Metrics

> Angka adalah **usulan target**; validasi dengan client sebelum dijadikan komitmen.

| Metrik | Target usulan | Cara ukur |
|---|---|---|
| Klik tombol WhatsApp | Baseline diukur 30 hari pertama, lalu naik dari baseline | Event analytics |
| Form konsultasi terkirim | Baseline 30 hari, tren naik | Data `Inquiry` |
| Lighthouse (ponsel) | Performance ≥ 90, SEO ≥ 95, Accessibility ≥ 95 | Lighthouse CI |
| LCP | < 2,5 detik | Data lab dan lapangan |
| Waktu staf menerbitkan artikel pertama tanpa bantuan | < 15 menit setelah pelatihan | Uji penerimaan |
| Temuan keamanan Critical atau High saat rilis | 0 | `SECURITY.md` audit gate |
| Ketersediaan | ≥ 99,5% per bulan | Monitor uptime |
| Revisi dalam 3 putaran | Selesai dalam 3 putaran | Catatan proyek |

## 10. Open Questions

1. Platform final: custom code (sesuai SPK dan hosting baru). Apakah client sudah memahami dan menyetujui?
2. Domain baru: nama apa, terdaftar di mana, atas nama siapa? Apa nasib domain lama (fhspartner.com) dan email domain lama?
3. Layanan email kantor saat ini (Google Workspace atau lainnya) dan rencana email di domain baru.
4. Konfirmasi sepuluh bidang layanan dan deskripsinya (daftar dari demo tercantum di `DESIGN.md` Bagian 8) serta teks "Tentang kantor".
5. Profil kelima (Delia) di luar SPK empat profil: dimasukkan sebagai perubahan kecil atau ditagih terpisah?
6. Rekam jejak perkara: anonim atau bernama, dan apakah ada persetujuan klien?
7. Angka statistik pada demo: apakah dipakai, dan apakah lolos kode etik?
8. ~~Singkatan resmi dan logo~~ **Terjawab:** rebranding menjadi "FS dan Rekan" dengan logo seal biru tua-emas (lihat `DESIGN.md` Bagian 3A). Masih terbuka: berkas logo vektor atau PNG transparan resolusi tinggi, varian horizontal, dan keputusan palet situs (hitam-emas seperti demo atau menyesuaikan biru tua logo).
9. Nomor WhatsApp resmi (lengkap), email penerima form, nomor admin penerima ringkasan chat.
10. Akun Instagram: Business atau Creator? Terhubung ke Facebook Page?
11. Hosting: paket berbayar atau alternatif, dan siapa yang membayar dan memegang akun?
12. Kebijakan privasi dan masa simpan data permintaan konsultasi: siapa yang menyetujui isinya?
13. Pemeliharaan pasca-proyek: lingkup, biaya, SLA, dan kerahasiaan akses.
14. Apakah ada artikel lama di website sekarang yang harus dipindahkan, dan berapa jumlahnya?
