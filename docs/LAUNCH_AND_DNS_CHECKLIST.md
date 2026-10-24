# Checklist Rilis, Migrasi DNS, dan Serah Terima (`F11`, `SEC-016`, `SK-10`)

Dokumen ini memandu langkah manual peluncuran produksi untuk **Ferdinan Silalahi dan Rekan Law Firm** sesuai aturan keras #12 di `AGENTS.md` (DNS, MX/SPF/DKIM/DMARC, dan akun hosting tidak disentuh oleh skrip otomasi).

---

## 1. Gerbang Pra-Rilis (`SECURITY.md` Bagian D)

- [ ] **0 temuan keamanan Critical atau High** yang berstatus `open`.
- [ ] Seluruh pengujian unit (`npm run test` & `npm run test:py`) dan E2E (`npm run test:e2e`) lulus.
- [ ] Header keamanan (`Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options: DENY`) terverifikasi aktif di `next.config.ts`.
- [ ] Pemindaian rahasia (`gitleaks detect --redact`) dan audit dependensi (`npm audit --omit=dev --audit-level=high`) bersih.
- [ ] Seluruh item `TODO(client)` di `CONTENT_TODO.md` telah dikonfirmasi tertulis oleh client.

---

## 2. Arsip Situs Lama & Pencatatan DNS (`FR-11.1`, `FR-11.2`, `SEC-016`)

1. **Arsip Konten Situs Lama (`FR-11.1`):**
   - Simpan salinan penuh HTML/aset dari situs lama sebelum perubahan DNS dan serahkan kepada client.
2. **Pencatatan Record DNS Saat Ini (`FR-11.2` & `SK-10`):**
   - Masuk ke panel registrar/DNS domain (pastikan MFA aktif pada akun registrar).
   - Ekspor/catat seluruh record DNS yang ada saat ini (`A`, `AAAA`, `CNAME`, `MX`, `TXT` untuk SPF/DKIM/DMARC, `NS`).
   - Turunkan nilai **TTL** record `A` dan `CNAME` website menjadi `300` detik minimal **24 jam sebelum** pemindahan.
3. **Perubahan Record Website Tanpa Menyentuh Email (`SEC-016`):**
   - Ubah **hanya** record `A` (`@`) dan `CNAME` (`www`) agar mengarah ke hosting baru (Vercel).
   - **JANGAN MENGUBAH RECORD `MX`**, SPF, DKIM, atau DMARC yang digunakan oleh layanan email kantor, kecuali ada instruksi tertulis eksplisit.
   - Pastikan record SPF, DKIM, dan DMARC (`v=DMARC1; p=quarantine; ...`) tetap valid dan pengiriman/penerimaan email kantor diuji setelah perubahan DNS.
   - Aktifkan fitur **Domain Transfer Lock** di registrar.

---

## 3. Verifikasi Pasca-Peluncuran & Serah Terima (`FR-11.3`, `FR-11.4`)

1. **Verifikasi Produksi:**
   - Pastikan sertifikat HTTPS aktif dan pengalihan `301` dari path lama berfungsi.
   - Uji pengiriman formulir konsultasi di `#janji-temu` → pastikan tersimpan di `/admin` (`Inquiries`) dan email notifikasi diterima di `INQUIRY_TO`.
   - Uji seluruh tombol WhatsApp di Header, Hero, Kontak, dan tombol melayang di ponsel maupun desktop.
   - Uji akses URL artikel draf saat tidak login → pastikan menghasilkan `404`.
2. **Paket Serah Terima (`FR-11.4`):**
   - Akun hosting, domain, basis data PostgreSQL, dan penyimpanan media atas nama client.
   - Repositori kode sumber dan aset desain (`public/logo-seal-transparent.png`, `public/team/*.webp`).
   - Dokumen panduan admin PDF (`docs/PANDUAN_ADMIN_FS_DAN_REKAN.pdf`).
   - Penyerahan kredensial awal melalui pengelola kata sandi (bukan melalui chat).
   - Mulai masa garansi pemeliharaan 30 hari pasca-serah terima.
