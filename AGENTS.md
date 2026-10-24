# AGENTS.md — Aturan Kerja Agent

**Proyek:** Website Ferdinan Silalahi dan Rekan Law Firm
**Pemilik proyek:** Ricky Darmawan Lambogo
**Baca dulu, berurutan:** `PRD.md` → `CONTENT_PROFILES.md` → `DESIGN.md` → `TECH_STACK.md` → `SECURITY.md` → `SKILLS.md`

File ini adalah aturan utama. Jika instruksi di percakapan bertentangan dengan file ini, **hentikan dan tanyakan** pemilik proyek; jangan menebak.

---

## 1. Konteks Singkat

Website kantor hukum (Bahasa Indonesia) dengan tema premium hitam-emas: beranda, tentang, tim (5 profil), 10 bidang layanan, artikel dengan panel admin, kontak dengan form konsultasi ke email, dan tombol WhatsApp. Dibangun dengan Next.js, TypeScript, Tailwind, Payload CMS, dan PostgreSQL. Detail ada di `TECH_STACK.md`.

Ada kontrak (SPK) yang membatasi ruang lingkup. Fitur **v2 dan Nanti** di `PRD.md` **tidak boleh dibangun** tanpa instruksi eksplisit dari pemilik proyek.

## 2. Peran Agent

| Peran | Tugas | Dilarang |
|---|---|---|
| **Builder** | Menulis kode fitur MVP sesuai `PRD.md` | Menambah fitur di luar PRD, mengubah konten |
| **Reviewer** | Meninjau diff dan menjalankan audit `SECURITY.md` | Memperbaiki sambil meninjau tanpa mencatat temuan |
| **Content Steward** | Memasukkan konten dari `CONTENT_PROFILES.md` ke seed dan CMS | Menulis ulang, mempersingkat, atau mengarang konten |

Satu sesi memegang satu peran dan menyebutkan perannya di awal.

## 3. Aturan Keras (Tidak Boleh Dilanggar)

1. **Jangan mengarang konten.** Teks profil, nama bidang layanan, angka statistik, testimoni, alamat, nomor telepon, dan email hanya dari `CONTENT_PROFILES.md` atau instruksi tertulis pemilik proyek. Jika data belum ada, tulis `TODO(client): <apa yang dibutuhkan>` dan lanjutkan dengan placeholder yang jelas, **bukan** isian tiruan yang tampak nyata.
2. **Nama kantor:** `Ferdinan Silalahi dan Rekan Law Firm` (formal). Nama pendek brand: `FS dan Rekan`, monogram `FS`. Dilarang "FHSP", "FHSP Law Office", "& Partners", dan singkatan buatan sendiri.
3. **Tidak ada klaim hasil.** Dilarang menulis persentase keberhasilan, "terbaik", "menang", atau jaminan hasil perkara.
4. **Nama klien tidak tampil di publik.** Rekam jejak perkara (v2) default anonim.
5. **Tidak ada secret di kode, log, commit, atau bundel klien.** Detail: `SECURITY.md` SEC-003.
6. **Semua input eksternal divalidasi di server** dengan Zod. Tidak ada pengecualian.
7. **Jangan menjalankan perintah destruktif** (`rm -rf`, `DROP`, `git push --force`, `git reset --hard` pada branch bersama) tanpa persetujuan.
8. **Jangan mengakses, membaca, atau mengirim data klien nyata.** Pakai data uji.
9. **Jangan memasang dependensi baru** tanpa menjelaskan alasan, ukuran, lisensi, dan status pemeliharaannya, dan tanpa persetujuan.
10. **Jangan mematikan** lint, tes, atau pemeriksaan keamanan agar build lolos. Perbaiki penyebabnya.
11. **Jangan membuat alamat atau kontak contoh** yang tampak nyata. Alamat resmi: Gedung Mandira Lt. 4, Jl. RP Soeroso No. 33, RT 002 RW 002, Gondangdia, Menteng, Jakarta Pusat.
12. **Jangan menyentuh DNS, email domain (MX/SPF/DKIM/DMARC), atau akun hosting** lewat otomasi. Hanya dokumentasikan langkah manual.

## 4. Perintah Standar

```bash
npm ci                # pasang dependensi dari lockfile
npm run dev           # pengembangan
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit
npm run test          # Vitest
npm run test:e2e      # Playwright
npm run build         # build produksi
npm audit --omit=dev --audit-level=high
gitleaks detect --redact
```

Jika sebuah skrip belum ada di `package.json`, buat dan dokumentasikan; jangan melewatinya.

## 5. Konvensi

- **Bahasa:** kode, identifier, nama commit, dan komentar teknis dalam Bahasa Inggris. Teks yang dilihat pengguna dan konten dalam Bahasa Indonesia.
- **Commit:** Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `security:`, `test:`). Satu perubahan logis per commit.
- **Branch:** `main` (produksi, dilindungi), `feat/<nama>`, `fix/<nama>`. Tidak ada commit langsung ke `main`.
- **PR:** wajib berisi ringkasan, tangkapan layar (UI), hasil tes, dan centang checklist di Bagian 7.
- **TypeScript:** `strict`, tanpa `any` tanpa alasan tertulis.
- **UI:** ikuti `DESIGN.md`; ekstrak token dari demo sebelum membuat komponen, jangan menebak nilai warna atau font. Komponen aksesibel (keyboard, fokus, label), kontras AA, teks isi ≥ 16px di ponsel.
- **Gambar:** `alt` wajib; gunakan komponen gambar yang dioptimalkan.
- **Teks antarmuka:** Bahasa Indonesia baku dan sopan, tanpa singkatan gaul.

## 6. Cara Menangani Ketidakpastian

1. Cek `PRD.md` (bagian Open Questions) dan `CONTENT_PROFILES.md` (daftar TODO).
2. Jika jawabannya belum ada: tulis asumsi satu kalimat di deskripsi PR, beri tanda `TODO(client)`, dan lanjutkan hanya jika aman dan mudah dibalik.
3. Jika keputusan menyangkut biaya, hukum, etika, keamanan, atau ruang lingkup kontrak: **berhenti dan tanya**.

## 7. Definition of Done (Checklist PR)

- [ ] Sesuai `PRD.md` (sebutkan ID FR yang dipenuhi)
- [ ] Tidak menyentuh fitur v2 atau Nanti
- [ ] Konten sesuai `CONTENT_PROFILES.md`, tanpa isian yang dikarang
- [ ] `lint`, `typecheck`, `test`, `build` hijau
- [ ] Input server tervalidasi (Zod); error generik; tidak ada PII di log
- [ ] Tidak ada secret atau `NEXT_PUBLIC_` rahasia (`gitleaks` bersih)
- [ ] Tes baru untuk perilaku baru, termasuk kasus gagal
- [ ] Aksesibilitas dicek (keyboard, kontras, alt)
- [ ] Responsif diuji pada lebar 360, 768, 1280
- [ ] Dokumentasi diperbarui bila perilaku berubah
- [ ] Untuk perubahan keamanan: dicatat sesuai format `SECURITY.md` Bagian A

## 8. Pelaporan

Setiap sesi diakhiri dengan ringkasan pendek:

```
Selesai : <apa yang dikerjakan, ID FR>
Tes     : <perintah dan hasil>
Belum   : <hal yang belum atau butuh keputusan>
Risiko  : <temuan keamanan atau ruang lingkup, bila ada>
```

Jangan melaporkan "selesai" jika tes belum dijalankan. Katakan apa adanya.

## 9. Eskalasi ke Pemilik Proyek

Wajib tanya sebelum melanjutkan jika: ada permintaan fitur baru, perubahan platform atau hosting, penambahan dependensi besar, perubahan skema data yang menghapus data, penayangan nama klien, penambahan angka klaim, atau apa pun yang terkait pembayaran atau kontrak.
