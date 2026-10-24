# DESIGN.md — Sistem Desain dan Spesifikasi Tampilan

**Versi:** 1.0 (Draft)
**Acuan visual:** https://fhspdemo.vercel.app/ (demo yang sudah dilihat dan disukai client) dan Gambar 1 sampai 4 pada Proposal Bagian 3.3.
**Dokumen terkait:** `PRD.md`, `CONTENT_PROFILES.md`, `TECH_STACK.md`, `AGENTS.md`

> **Tujuan:** hasil akhir tampil **sama dengan demo** dalam hal tata letak, nuansa, komponen, dan interaksi. Perbedaan hanya untuk hal yang sengaja diubah di Bagian 9 (nama kantor, konten, klaim, dan perbaikan teknis).

> **Batas informasi dokumen ini.** Spesifikasi di sini diturunkan dari **struktur, teks, dan interaksi** halaman demo serta dari gambar konsep di proposal. **Nilai visual persis** (kode warna, nama font, ukuran, jarak, radius) tidak terbaca dari sumber tersebut, jadi ditandai `≈` (perkiraan visual) atau `EXTRACT`. Agent **wajib mengekstrak nilai asli dari kode demo** (Bagian 2) sebelum menulis komponen, dan tidak boleh menebak.

---

## 1. Karakter Visual

| Aspek | Deskripsi |
|---|---|
| Kesan | Premium, tenang, berwibawa, eksklusif; firma hukum boutique |
| Tema | **Gelap** (hitam pekat) dengan **aksen emas**, teks putih gading |
| Judul | Tegas, huruf besar-kecil atau kapital; sebagian kata judul berwarna emas untuk penekanan |
| Label kecil | Kapital kecil berwarna emas (mis. "BISNIS", "PROPERTI", "KANTOR PUSAT RESMI") |
| Pembatas | Garis emas tipis di atas kartu dan bagian |
| Foto | Gelap, dominan nuansa ruang sidang, perpustakaan, palu hakim; diberi lapisan gelap agar teks terbaca |
| Aksen interaktif | Tombol emas solid dengan teks gelap, tombol sekunder berbingkai |
| Tombol WhatsApp | Lingkaran hijau melayang di kanan bawah |

**Prinsip:** (1) kepercayaan di atas dekorasi, (2) satu CTA utama yang jelas di setiap bagian (janji temu), (3) keterbacaan di ponsel lebih penting daripada efek, (4) konsisten: satu gaya foto, satu gaya kartu, satu gaya tombol.

## 2. Ekstraksi Token dari Demo (Langkah Pertama Wajib)

Agent menjalankan prosedur ini **sebelum** membangun UI. Kode demo milik pemilik proyek; minta akses repositori atau berkas sumbernya.

1. Buka sumber demo (repositori atau `view-source` dan berkas CSS yang dimuat).
2. Catat nilai asli: warna (latar, permukaan, teks, emas, status), font (famili, bobot, ukuran, tinggi baris), jarak, radius, bayangan, durasi dan easing transisi, breakpoint.
3. Tulis ke `src/styles/tokens.css` sebagai CSS variable dan petakan ke konfigurasi Tailwind. **Tidak ada nilai hardcode** di komponen.
4. Ambil tangkapan layar demo pada lebar 360, 768, 1280 sebagai **baseline visual** (`tests/visual/baseline/`).
5. Perbarui tabel Bagian 3 dengan nilai final dan hapus tanda `≈`.

## 3. Token

| Token | Peran | Nilai final hasil ekstraksi demo (`src/styles/tokens.css`) |
|---|---|---|
| `--color-bg` (`--bg-base`) | Latar halaman | `#08090C` (footer lebih gelap `--bg-darker`: `#050608`) |
| `--color-surface` (`--bg-surface`) | Kartu, panel, field | `#10121A` |
| `--color-surface-2` (`--bg-surface-elevated`) | Hover kartu, modal | `#181B26` |
| `--color-border` | Garis halus | `rgba(255, 255, 255, 0.14)` (subtle: `rgba(255, 255, 255, 0.08)`) |
| `--color-text` (`--text-primary`) | Teks utama | `#F0F2F5` (teks isi `--text-secondary`: `#D8DCE6`, kontras > 13,8:1) |
| `--color-text-muted` (`--text-muted`) | Teks sekunder | `#8E94A4` (kontras 6,3:1 di atas `#08090C`) |
| `--color-gold` (`--gold-primary`) | Aksen, tautan aktif, label | `#C5A880` (kontras 8,53:1 di atas `#08090C`; emas logo `--seal-gold`: `#DFB35D`) |
| `--color-gold-dark` (`--gold-muted`) | Garis, bayangan emas | `#8E7654` (tepi emas logo `--seal-gold-dark`: `#9D7A3F`) |
| `--color-navy` (`--seal-navy`) | Warna merek dari logo; permukaan sekunder, lencana | `#071E38` |
| `--color-gold-strong` (`--gold-light`) | Hover tombol emas, angka & subjudul emas | `#DFCEB8` (kontras > 10,5:1 di atas `#10121A`) |
| `--color-on-gold` | Teks di atas emas | `#08090C` |
| `--color-whatsapp` | Tombol WhatsApp | `#25D366` |
| `--color-danger` | Error form | `#F87171` (kontras > 6,8:1 di atas `#08090C`) |
| `--font-heading` (`--font-serif`) | Judul (`h1`–`h4`) | `'Cormorant Garamond', Garamond, Georgia, serif` (weight `500`, `600`, `700`, italic `500`, `600`) |
| `--font-body` (`--font-sans`) | Isi & tombol | `'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` (weight `400`, `500`, `600`, `700`) |
| `--radius-sm/md/lg` | Sudut | `0px` (kartu & tombol sudut tegas; `9999px` untuk lencana bundar & tombol WA) |
| `--space-*` | Skala jarak | `4px` s.d. `64px`; `--container-max: 1320px`; `--section-gap: clamp(96px, 9vw, 144px)` |
| `--shadow-*` | Bayangan | `0 4px 16px rgba(5,6,8,0.4)` / `0 12px 32px rgba(5,6,8,0.6)` / `0 24px 64px rgba(5,6,8,0.82)` |
| `--ease`, `--dur-fast/normal` | Animasi | `cubic-bezier(0.16, 1, 0.3, 1)`, `0.2s` / `0.25s` (reveal: `0.65s`–`0.75s`) |

**Aturan warna:** teks emas di atas latar gelap dan teks gelap di atas tombol emas **harus lolos kontras WCAG AA** (4,5:1 untuk teks normal). Jika emas demo gagal pada ukuran kecil, perbaiki dengan menaikkan terang emas **hanya untuk teks kecil** dan catat selisihnya di sini.

**Font:** self-host (tanpa permintaan ke CDN font pihak ketiga), `font-display: swap`, hanya bobot yang dipakai.

## 3A. Identitas Merek dan Logo Baru

**Rebranding:** nama pendek **FS dan Rekan**, monogram **FS**. Nama formal tetap "Ferdinan Silalahi dan Rekan Law Firm".

**Logo (berkas yang diterima):** seal bundar biru tua dengan bingkai emas. Cincin teks "FERDINAN SILALAHI DAN REKAN" di atas dan "LAW FIRM" di bawah, dua bintang, perisai berisi monogram "FS", timbangan keadilan, buku terbuka, dan karangan daun laurel. Warna terukur dari berkas: biru tua ≈ `#071e38`, emas ≈ `#dfb35d` (tepi lebih gelap ≈ `#9d7a3f`).

**Dampak desain:**

| Isu | Penjelasan | Keputusan default (perlu persetujuan client) |
|---|---|---|
| Palet logo vs demo | Logo biru tua dan emas; demo hitam dan emas. Seal biru tua di atas latar hitam pekat tampak seperti lencana bergaris emas, masih terbaca karena bingkai emas, tapi biru tua hampir menyatu dengan hitam | **Pertahankan tata letak dan nuansa gelap demo** (yang sudah disukai client). Tampilkan seal sebagai lencana bundar utuh; pakai `--color-navy` secara hemat untuk permukaan sekunder (footer, kartu, lencana) agar selaras dengan logo. Siapkan satu variasi latar biru tua pekat untuk ditunjukkan ke client sebelum final |
| Keterbacaan kecil | Teks pada cincin logo hampir pasti tidak terbaca di bawah sekitar 150 px | Di header gunakan **seal hanya sebagai lambang (48 sampai 56 px)** dan tulis nama sebagai teks HTML di sampingnya: "FS dan Rekan" dan sub-baris "Law Firm" (atau nama lengkap di footer). Seal penuh dipakai di Hero atau Tentang dan footer pada ukuran besar |
| Favicon | Cincin teks tidak terbaca di 16 sampai 32 px | Buat favicon dari **perisai dengan monogram FS** saja (potong dari logo), latar biru tua |
| Format berkas | Logo diterima sebagai JPG dengan latar putih (raster, 1254 px) | Gunakan versi **PNG transparan** (sudah dibuat: `logo-seal-transparent.png`). Untuk hasil terbaik minta **SVG atau PDF vektor** dari desainer logo. Jangan memperbesar PNG melebihi ukuran aslinya |
| Nama di teks | Nama brand baru | Perbarui semua teks, meta, data terstruktur, pesan WhatsApp default ("Halo FS dan Rekan, saya ingin konsultasi hukum"), dan alt gambar |

**Aturan pemakaian logo:**
- Jangan diregangkan, diputar, diberi bayangan tambahan, atau diubah warnanya.
- Ruang bebas minimum di sekeliling seal = 10% diameter.
- Di atas latar gelap, seal tampil apa adanya. Di atas latar terang, tetap pakai seal (bingkai emas dan isi biru tua cukup kontras).
- `alt` logo: "Logo Ferdinan Silalahi dan Rekan Law Firm".

## 4. Tata Letak dan Responsif

| Breakpoint | Lebar | Perilaku |
|---|---|---|
| Ponsel | 360 sampai 767 | Satu kolom; menu menjadi tombol hamburger; CTA konsultasi tetap terlihat di header |
| Tablet | 768 sampai 1023 | Dua kolom untuk kartu |
| Desktop | 1024 sampai 1279 | Layout penuh |
| Lebar | ≥ 1280 | Kontainer maksimum `1320px` (`--container-max`), konten terpusat |

- Navigasi lengket (sticky) dengan latar gelap semi-transparan setelah scroll.
- Satu halaman beranda dengan jangkar bagian (`#beranda`, `#keahlian`, `#tentang`, `#tim-advokat`, `#artikel`, `#janji-temu`), ditambah halaman terpisah untuk daftar dan detail artikel (`/artikel`, `/artikel/[slug]`).
- Teks isi minimal 16px di ponsel; lebar baris maksimal 70 karakter.

## 5. Urutan Bagian Halaman Beranda (Mengikuti Demo)

1. **Header:** logo + nama kantor dua baris (nama dan sub-baris), menu (Beranda, Keahlian, Tentang, Tim Advokat, Wawasan, Janji Temu), tombol emas "Konsultasi".
2. **Hero:** gambar latar gelap, judul besar, paragraf pendek, tombol utama "Jadwalkan Konsultasi →" dan tautan "10 Bidang Praktik ↓".
3. **Baris kartu fakta** (empat kartu bergaris emas): dalam demo berisi tiga angka dan lokasi. Lihat Bagian 9 untuk perubahan wajib.
4. **Bidang Praktik (10 bidang):** pemilih interaktif.
5. **Tentang:** potret Managing Partner, kutipan, paragraf pengantar, dua butir kredibilitas, tautan "Konsultasi dengan Partner →".
6. **Tim Advokat:** kartu tim dengan foto seragam.
7. **Banner CTA:** gambar palu hakim, judul, tombol "Konsultasikan Perkara Anda →".
8. **Wawasan (artikel):** satu artikel utama besar dan dua artikel kecil, tautan "Baca ... →".
9. **Janji Temu dan Kontak:** kolom informasi (alamat, hotline, tombol WhatsApp) dan form.
10. **Footer:** logo, nama kantor, alamat, telepon/WhatsApp, hak cipta, tautan "Kebijakan Kerahasiaan & Disclaimer".
11. **Elemen global:** tombol WhatsApp melayang, modal disclaimer, modal sukses.

## 6. Spesifikasi Komponen

### 6.1 Header
- Lambang: seal logo baru (lihat Bagian 3A) 48 sampai 56 px, plus nama teks dua baris: "FS dan Rekan" dan "Law Firm". Berkas vektor atau PNG transparan resolusi tinggi dari client (`TODO(client)` untuk SVG).
- Tautan aktif berwarna emas (mengikuti posisi scroll).
- Ponsel: menu geser atau overlay, bisa ditutup dengan Esc, fokus terkunci di dalam menu saat terbuka.
- Tombol "Konsultasi": emas solid, teks `--color-on-gold`, menuju `#janji-temu`.

### 6.2 Hero
- Gambar latar dioptimalkan (WebP/AVIF), lapisan gradien gelap agar judul terbaca; LCP < 2,5 detik, gambar hero diprioritaskan (preload).
- Judul `h1` tunggal. Penekanan sebagian kata dengan warna emas bersifat opsional dan mengikuti demo.
- Dua CTA: utama (emas solid) dan sekunder (tautan dengan panah).

### 6.3 Kartu Fakta
- Kartu bergaris emas di atas, angka besar, judul kecil, deskripsi pendek.
- **Wajib mengikuti keputusan konten di Bagian 9** sebelum ditayangkan.

### 6.4 Pemilih Bidang Praktik
- **Desktop:** daftar sepuluh bidang di satu sisi (nama + label kategori kapital kecil), panel detail di sisi lain (gambar, judul, ringkasan, "Cakupan Advokasi", CTA). Memilih bidang mengganti panel.
- **Ponsel:** berubah menjadi **accordion** (satu bidang terbuka pada satu waktu).
- **Progressive enhancement:** tanpa JavaScript, seluruh bidang dan ringkasannya tetap terbaca.
- **Aksesibilitas:** pola tabs yang benar (`role="tablist"`, `tab`, `tabpanel`, panah kiri/kanan atau atas/bawah, `aria-selected`), atau pola accordion yang benar di ponsel.
- Daftar sepuluh bidang bersumber dari satu berkas data (lihat Bagian 8), dipakai juga untuk dropdown form.

### 6.5 Tentang
- Dua kolom di desktop (foto di satu sisi, teks di sisi lain), satu kolom di ponsel (foto dahulu).
- Kutipan dengan penanda kutip besar emas. **Isi kutipan wajib diperbarui** (Bagian 9).
- Dua butir kredibilitas dengan ikon kecil dan judul tebal.

### 6.6 Kartu Tim dan Panel "Selengkapnya"
- Kartu: foto rasio 4:5 dengan perlakuan warna **seragam**, nama, jabatan (label emas), `shortBio`, tautan "Selengkapnya".
- Panel (dialog modal): foto, nama, gelar, jabatan, `fullBio`, pendidikan, bahasa, tags. Aksesibel: `role="dialog"`, `aria-modal`, judul berlabel, Esc menutup, fokus kembali ke pemicu, teks dapat di-scroll di dalam panel.
- Foto belum tersedia: monogram dengan latar `--color-surface-2` dan inisial emas. **Jangan** memakai foto contoh dari orang lain.
- Di demo kartu bertuliskan "Lihat Rekam Jejak →". Pada MVP tautan ini menjadi "Selengkapnya" (membuka panel profil). Rekam jejak perkara adalah fitur v2.

### 6.7 Banner CTA
- Gambar latar gelap dengan lapisan, judul, satu tombol. Tinggi dibatasi agar tidak menggeser konten penting di ponsel.

### 6.8 Kartu Artikel
- Satu kartu unggulan (gambar besar, kategori, judul, ringkasan, tautan) dan dua kartu kecil.
- Kategori sebagai label emas kapital kecil. Gambar rasio konsisten. Pada ponsel semuanya satu kolom.

### 6.9 Kontak dan Form
- Kolom kiri: judul, deskripsi, kartu alamat, hotline, tombol "Kirim via WhatsApp Langsung →".
- Kolom kanan: form dengan kolom sebagai berikut (mengikuti demo): Nama Lengkap atau Instansi, Alamat Email, Nomor WhatsApp, Kategori Perkara (dropdown, sumber Bagian 8), Pilihan Tanggal, Waktu Pertemuan (tiga sesi), Metode Pertemuan (tatap muka atau daring), Ringkasan Pokok Permasalahan Hukum, tombol "Kirim Permohonan Janji Temu →".
- Tambahan wajib (tidak ada di demo): checkbox persetujuan data pribadi, peringatan "Jangan menuliskan data rahasia atau dokumen perkara di sini", Cloudflare Turnstile.
- **Status field:** normal, fokus (garis emas), terisi, error (pesan di bawah field, `aria-describedby`, tidak hanya warna), nonaktif. Tombol punya status memuat (spinner dan teks "Mengirim...") dan dinonaktifkan saat mengirim.
- Sukses: modal "Permohonan Janji Temu Diterima". **Teks harus jujur** (Bagian 9). Gagal: pesan umum dan opsi lanjut lewat WhatsApp.

### 6.10 Modal Disclaimer
- Dibuka dari footer. Isi dari demo (informasi umum bukan nasihat hukum, hubungan advokat dan klien baru sah setelah Surat Kuasa Khusus dan Perjanjian Jasa Hukum, komitmen kerahasiaan), dengan nama kantor yang diperbarui. Tombol "Saya Mengerti". Aksesibel seperti dialog lain.
- Tautan ke halaman Kebijakan Privasi lengkap ditambahkan (lihat `SECURITY.md` SEC-014).

### 6.11 Tombol WhatsApp Melayang
- Lingkaran hijau di kanan bawah, ikon chat, label aksesibel "Hubungi lewat WhatsApp". Aman terhadap area gestur ponsel (`env(safe-area-inset-bottom)`), tidak menutupi tombol kirim form.
- Tautan dibuat oleh fungsi `waLink()` (`SKILLS.md` SK-05) dengan nomor dan pesan dari pengaturan situs.

### 6.12 Footer
- Logo, nama kantor, alamat, telepon/WhatsApp, hak cipta tahun berjalan (otomatis), tautan disclaimer dan kebijakan privasi.

## 7. Interaksi dan Animasi

- Transisi halus untuk hover, fokus, dan pergantian panel (`--dur-fast`/`--dur-normal`).
- Animasi muncul saat scroll bersifat **opsional dan ringan**; dilarang menyebabkan pergeseran tata letak (CLS).
- **Wajib menghormati** `prefers-reduced-motion: reduce` (matikan animasi non-esensial).
- Fokus keyboard selalu terlihat (cincin emas berkontras cukup).
- Scroll ke jangkar memakai offset tinggi header sticky.

## 8. Data Bersama (Satu Sumber Kebenaran)

**Sepuluh bidang praktik** (nama dan label dari demo; **konfirmasi dengan client sebelum final**, termasuk deskripsi dan klaim lingkup di tiap bidang):

| No | Nama bidang | Label |
|---|---|---|
| 1 | Litigasi Korporasi & Komersial | BISNIS |
| 2 | Sengketa Pertanahan & Agraria | PROPERTI |
| 3 | Hukum Perdata & Perlindungan Aset | ASET |
| 4 | Hukum Pidana Umum & Tipikor | PIDANA |
| 5 | Hak Kekayaan Intelektual (HKI) | HKI |
| 6 | Ketenagakerjaan & PHI | INDUSTRIAL |
| 7 | Kepailitan & PKPU Niaga | RESTRUKTURISASI |
| 8 | Arbitrase & Mediasi Bisnis | ADR |
| 9 | Hukum Perbankan & Pembiayaan | FINANSIAL |
| 10 | Hukum Keluarga & Waris | WARIS |

- Daftar ini disimpan **sekali** (koleksi `PracticeArea`) dan dipakai oleh pemilih bidang **dan** dropdown form. Di demo, dropdown form memakai nama sedikit berbeda (mis. "Hukum Perdata & Kontrak", "Hukum Perbankan & Keuangan", "Hukum Keluarga & Perlindungan Aset"); **jangan** mempertahankan perbedaan itu.
- **Sesi pertemuan** (dari demo): Pagi 09.30–12.00 WIB, Siang 13.30–15.30 WIB, Sore 16.00–18.00 WIB. Disimpan di pengaturan situs agar bisa diubah.

## 9. Penyesuaian Wajib dari Demo

| # | Di demo | Perubahan wajib | Alasan |
|---|---|---|---|
| 1 | "FHSP Law Office", "Ferdinan Hasiholan Silalahi & Partners" (header, judul, meta, footer, pesan WhatsApp, modal) | Nama formal **Ferdinan Silalahi dan Rekan Law Firm**; nama pendek **FS dan Rekan** di header dan teks ringkas; logo seal baru menggantikan logo lama | Rebranding client |
| 2 | Kartu fakta: "12+ Tahun", "120+ Perkara", "98.4% Tingkat Keberhasilan" | Hapus atau ganti dengan fakta terverifikasi **tertulis** dari client. **Dilarang** menampilkan persentase keberhasilan | Risiko etika iklan dan jaminan hasil; angka belum dikonfirmasi |
| 3 | "firma hukum boutique terkemuka di Jakarta" | Hapus kata "terkemuka" dan klaim superlatif lain | `AGENTS.md` aturan 3 |
| 4 | Kutipan atas nama Ferdinan: "Integritas bukan sekadar slogan..." | Ganti dengan motto resmi "Life must have meaning" **atau** minta persetujuan tertulis Ferdinan untuk kutipan | Kutipan tidak ada di data profil dan tidak boleh dikarang |
| 5 | "Berita Acara Sumpah ... hak beracara di seluruh peradilan Indonesia" dan "standar enkripsi kerahasiaan" | Verifikasi dengan client; tulis hanya yang benar dan dapat dibuktikan. Jangan mengklaim enkripsi yang tidak diterapkan | Klaim hukum dan keamanan harus akurat |
| 6 | Tim: Basit, Farhoh, Jessica (tiga orang) | Lima profil sesuai `CONTENT_PROFILES.md`: Ferdinan, Adina, Basit, Delia, Farhah (nama "Farhah", bukan "Farhoh"). Jessica **dihapus** | Data client terbaru |
| 7 | Deskripsi bidang dan Ferdinan (mis. "gugatan derivative shareholder", "lintas yurisdiksi") | Konfirmasi ke client atau gunakan deskripsi yang disetujui | Klaim lingkup praktik |
| 8 | Alamat "RT 002/RW 02" | "RT 002 RW 002" sesuai pesan client; kode pos 10350 dikonfirmasi | Konsistensi data |
| 9 | Nomor WhatsApp +62 811-830-991 | Konfirmasi nomor lengkap (terlihat pendek) sebelum tayang | Pastikan tautan wa.me benar |
| 10 | Modal sukses: "dicatat dalam sistem kami" | Hanya tampil setelah server mengonfirmasi data tersimpan; teks sesuai perilaku nyata | Jujur kepada pengguna; tidak boleh sekadar tampilan |
| 11 | Form tanpa persetujuan data pribadi | Tambahkan checkbox consent, peringatan data rahasia, Turnstile | `SECURITY.md` SEC-006, SEC-014 |
| 12 | Gambar stok dan foto tim contoh | Pastikan **lisensi** gambar jelas; foto tim asli dari client dengan gaya seragam | Hak cipta dan konsistensi |
| 13 | "Riwayat Perkara & Profil Lengkap →" dan "Lihat Rekam Jejak →" | MVP: "Selengkapnya" (panel profil). Rekam jejak perkara menunggu keputusan v2 | Ruang lingkup SPK dan kerahasiaan |
| 14 | Jangkar tunggal untuk artikel | Tambahkan halaman `/artikel` dan `/artikel/[slug]` sesuai PRD F5 | Kebutuhan SEO dan panel admin |

## 10. Aksesibilitas

- Target WCAG 2.2 AA untuk halaman publik.
- Semua gambar bermakna punya `alt`; gambar dekoratif `alt=""`.
- Seluruh fungsi dapat dipakai dengan keyboard; urutan fokus logis.
- Dialog, tab, dan accordion memakai pola ARIA yang benar dan sudah diuji dengan axe.
- Ukuran target sentuh minimal 44×44 px.
- Pesan error terhubung ke field dan tidak hanya mengandalkan warna.
- Uji pada pembaca layar minimal satu kali sebelum rilis.

## 11. Aset yang Dibutuhkan

| Aset | Sumber | Status |
|---|---|---|
| Logo seal (PNG transparan) | Client (JPG diterima, PNG transparan dibuat) | Ada; SVG/vektor `TODO(client)` |
| Favicon dari perisai FS | Dibuat dari logo | Dibuat saat implementasi |
| Foto tim (5 orang, gaya seragam, rasio 4:5) | Client | `TODO(client)` |
| Foto Managing Partner untuk bagian Tentang | Client | `TODO(client)` |
| Gambar hero, palu hakim, bidang praktik, artikel | Demo (cek lisensi) atau penggantian | Verifikasi |
| Favicon dan gambar Open Graph | Dibuat dari logo | Setelah logo ada |
| Font (berkas lisensi/self-host) | Hasil ekstraksi demo | `EXTRACT` |

## 12. Kriteria Penerimaan Visual

- [ ] Token hasil ekstraksi ada di `tokens.css`; tidak ada nilai hardcode di komponen.
- [ ] Perbandingan tangkapan layar dengan baseline demo pada 360, 768, 1280: perbedaan hanya pada butir yang disebut di Bagian 9 (gunakan tes visual Playwright dengan ambang yang disepakati).
- [ ] Pemilih bidang, panel tim, dan dua modal berfungsi dengan keyboard dan pembaca layar.
- [ ] Lighthouse ponsel: Performance ≥ 90, Accessibility ≥ 95, SEO ≥ 95.
- [ ] Tidak ada pergeseran tata letak yang terlihat saat memuat (CLS < 0,1).
- [ ] `prefers-reduced-motion` dihormati.
- [ ] Client menyetujui hasil pada tahap desain (Bab IV Proposal) sebelum pengembangan penuh.
