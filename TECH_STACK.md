# TECH_STACK.md — Teknologi dan Arsitektur

**Versi:** 1.0 (Draft)
**Prinsip:** sederhana, mudah dipelihara oleh satu developer, aman secara bawaan, murah di biaya berjalan, dan sesuai SPK (hosting terpisah, panel admin artikel, domain baru).

> **Aturan versi.** Dokumen ini sengaja **tidak mengunci nomor versi**. Saat inisialisasi, agent memasang versi stabil terbaru, mencatatnya di `package.json` dan lockfile, lalu memperbarui tabel "Versi Terpasang" di bawah. Cek dokumentasi resmi sebelum memakai API yang sensitif versi.

## 1. Ringkasan Keputusan

| Lapisan | Pilihan | Alasan |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | SSR/ISR untuk SEO, route handler untuk API, ekosistem besar, sudah cocok dengan Vercel (demo sudah di sana) |
| Styling | **Tailwind CSS** + design token CSS variable | Tema hitam-emas konsisten, mudah dipertahankan |
| UI primitif | **Radix UI / shadcn/ui** | Dialog, accordion, dan komponen aksesibel (panel "Selengkapnya") |
| CMS dan admin | **Payload CMS (embedded di Next.js)** | Panel admin, auth, role, media, draft/publish, dan access control siap pakai; mengurangi kode keamanan buatan sendiri |
| Basis data | **PostgreSQL** (Neon atau Supabase), region Singapura | Relasional, mudah dibackup, latensi baik untuk Indonesia |
| Penyimpanan media | **Vercel Blob** atau **Cloudflare R2** | Tidak menyimpan file di disk server |
| Email transaksional | **Resend** (atau SMTP penyedia lain) | Notifikasi form; SPF/DKIM terkonfigurasi |
| Anti-spam | **Cloudflare Turnstile** | Gratis, ramah privasi, tanpa CAPTCHA mengganggu |
| Rate limit | **Upstash Redis + `@upstash/ratelimit`** | Bekerja di lingkungan serverless |
| Validasi | **Zod** | Skema tunggal untuk klien dan server |
| Sanitasi HTML | **sanitize-html** | Untuk konten rich text yang dirender sebagai HTML |
| Peta | Embed Google Maps (lazy) | Sesuai demo |
| Hosting | **Vercel** (paket komersial) | Deploy otomatis, CDN, HTTPS |
| Monitoring | **Sentry** (dengan scrubbing PII) dan uptime monitor | Deteksi error tanpa membocorkan data |
| Analytics | Plausible atau GA4 (pilih satu) | Ukur klik WhatsApp dan form |
| CI/CD | **GitHub Actions** | Lint, test, audit dependensi, scan secret, deploy |

### Catatan Penting Hosting
- Paket gratis (Hobby) pada Vercel setahu saya dibatasi untuk penggunaan non-komersial. Karena ini website bisnis, **verifikasi syarat terbaru** dan siapkan paket berbayar atau alternatif (VPS dengan Docker, atau penyedia lain). Biaya ditanggung client (SPK Pasal 4 dan 8).
- Akun hosting, domain, basis data, dan penyimpanan dibuat **atas nama client**. Developer diundang sebagai anggota dengan hak minimal yang cukup.
- Jika Payload CMS tidak cocok dengan batasan hosting yang dipilih, fallback: Next.js + Postgres + Auth.js + panel admin buatan sendiri (dengan beban pengujian keamanan lebih besar) atau Sanity sebagai CMS eksternal.

## 2. Arsitektur

```
Pengunjung ──► CDN (Vercel) ──► Next.js (halaman statis/ISR + route handler)
                                   │
                                   ├── Payload CMS (admin /admin, auth, access control)
                                   │       └── PostgreSQL (Neon/Supabase)
                                   │       └── Blob/R2 (media)
                                   ├── POST /api/inquiry ──► Turnstile ► Zod ► DB ► Resend (email)
                                   └── (v2) POST /api/chat, GET/POST /api/webhooks/whatsapp
                                              └── WhatsApp Business Platform (Cloud API)
```

- Halaman publik dibuat statis atau ISR dengan revalidation saat konten admin berubah.
- Satu-satunya mutasi publik: `POST /api/inquiry` (dan v2: chat dan webhook).
- Admin berjalan di `/admin` dengan kebijakan keamanan sendiri.

## 3. Struktur Repositori

```
/
├─ AGENTS.md  PRD.md  TECH_STACK.md  SECURITY.md  SKILLS.md  CONTENT_PROFILES.md
├─ src/
│  ├─ app/
│  │  ├─ (site)/            # halaman publik: beranda, tentang, tim, layanan, artikel, kontak
│  │  ├─ (payload)/         # admin dan API Payload
│  │  └─ api/
│  │     ├─ inquiry/route.ts
│  │     └─ webhooks/whatsapp/route.ts   # v2
│  ├─ collections/          # Payload: Users, TeamMembers, PracticeAreas, Articles, Categories, Media, Inquiries
│  ├─ globals/              # SiteSettings
│  ├─ components/           # UI
│  ├─ lib/
│  │  ├─ env.ts             # validasi env (Zod), server-only
│  │  ├─ security/          # origin, ratelimit, sanitize, signature
│  │  ├─ email.ts  whatsapp.ts  seo.ts
│  │  └─ logger.ts
│  └─ styles/
├─ content/                 # seed dari CONTENT_PROFILES.md
├─ tests/                   # unit (Vitest), e2e (Playwright)
├─ .github/workflows/       # ci.yml
└─ .env.example             # nama variabel tanpa nilai
```

## 4. Variabel Lingkungan

`.env.example` hanya berisi nama. Nilai asli di pengelola secret hosting. Hanya variabel berawalan `NEXT_PUBLIC_` yang boleh publik, dan **tidak boleh** berisi rahasia.

| Variabel | Publik? | Keterangan |
|---|---|---|
| `SITE_URL` | Ya (non-rahasia) | URL kanonik, dipakai cek Origin |
| `DATABASE_URI` | Tidak | Koneksi Postgres |
| `PAYLOAD_SECRET` | Tidak | Kunci penandatangan sesi |
| `RESEND_API_KEY`, `MAIL_FROM`, `INQUIRY_TO` | Tidak | Email |
| `TURNSTILE_SITE_KEY` | Ya | Kunci situs (publik) |
| `TURNSTILE_SECRET_KEY` | Tidak | Verifikasi server |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Tidak | Rate limit |
| `BLOB_READ_WRITE_TOKEN` | Tidak | Media |
| `SENTRY_DSN` | Boleh publik terbatas | Gunakan scrubbing |
| *(v2)* `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `META_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN` | Tidak | Cloud API |
| *(v2)* `INSTAGRAM_ACCESS_TOKEN` | Tidak | Hanya di server |

## 5. Standar Kode

- TypeScript `strict: true`, tanpa `any` kecuali dengan komentar alasan.
- ESLint (termasuk plugin keamanan dan aksesibilitas), Prettier.
- Penamaan: kode, variabel, dan commit dalam Bahasa Inggris; teks antarmuka dan konten dalam Bahasa Indonesia.
- Komponen kecil, satu tanggung jawab, tanpa logika bisnis di komponen UI.
- Semua input eksternal divalidasi Zod di batas sistem.
- Tidak ada `console.log` data pribadi; gunakan `logger` dengan redaksi.
- Commit mengikuti Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `security:`).

## 6. Desain dan Token

> Nilai di tabel ini hanya usulan awal. **Sumber resmi: `DESIGN.md`** (token diekstrak dari demo yang sudah disetujui client).

| Token | Nilai awal (usulan, sesuaikan dengan logo) |
|---|---|
| `--bg` | Hitam pekat (mis. `#0b0b0c`) |
| `--surface` | Abu gelap (mis. `#141416`) |
| `--text` | Putih gading |
| `--accent` | Emas (diambil dari logo; uji kontras AA) |
| Font | Satu serif untuk judul, satu sans untuk isi; self-host agar cepat dan privasi terjaga |

## 7. Kualitas dan Pengujian

| Jenis | Alat | Ambang |
|---|---|---|
| Unit | Vitest | Fungsi keamanan (sanitasi, validasi, signature) wajib 100% jalur utama |
| E2E | Playwright | Alur form konsultasi, tombol WhatsApp, login admin, terbit artikel, 404 draf |
| Aksesibilitas | axe (di Playwright) | 0 pelanggaran serius |
| Performa | Lighthouse CI | Sesuai target di PRD |
| Keamanan | gitleaks, `npm audit`, osv-scanner, tinjauan manual `SECURITY.md` | 0 Critical/High |

## 8. Pipeline CI (ringkas)

1. `npm ci`
2. `tsc --noEmit`, `eslint`, `vitest`
3. `gitleaks detect` (gagal jika ada secret)
4. `npm audit --omit=dev --audit-level=high`
5. Build
6. Playwright dan Lighthouse CI pada preview
7. Deploy produksi hanya dari `main` setelah semua hijau dan tinjauan manusia

## 9. Backup dan Pemulihan

- Basis data: backup otomatis harian penyedia, uji pemulihan sebelum rilis dan tiap kuartal.
- Media: replikasi atau versioning bucket.
- Kode: repositori di akun GitHub atas nama client (atau transfer saat serah terima).
- Salinan konten website lama diserahkan sebelum peluncuran.

## 10. Versi Terpasang *(diisi agent saat inisialisasi)*

| Paket | Versi | Tanggal dipasang |
|---|---|---|
| Next.js | `^15.2.3` | 2026-10-24 |
| Payload | `^3.29.0` | 2026-10-24 |
| Tailwind | `^3.4.17` | 2026-10-24 |
| Zod | `^3.24.2` | 2026-10-24 |
| Node.js | `>=20.11.0` (LTS) | 2026-10-24 |
