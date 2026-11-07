# CONTENT_TODO.md — Daftar TODO(client) Konten dan Aset

Dokumen ini mencatat seluruh item `TODO(client)` yang membutuhkan konfirmasi atau materi resmi dari **Ferdinan Silalahi dan Rekan Law Firm** sebelum penayangan final.

---

## 1. Profil Tim (`content/team.json` & `CONTENT_PROFILES.md`)

| No | Slug / Anggota Tim | Field | Status Saat Ini | Tindakan yang Dibutuhkan (`TODO(client)`) |
|---|---|---|---|---|
| 1 | `delia-zaizafun` (Delia Zaizafun) | `honorific` (Gelar) | `S.H., M.H.` | `TODO(client)`: Konfirmasi penulisan gelar resmi Delia Zaizafun (bio menyebut lulusan Magister Hukum UGM). |
| 2 | `farhah-tri-febriani` (Farhah Tri Febriani, S.H.) | `roleTitle` (Jabatan) | `Legal Administrator` | `TODO(client)`: Konfirmasi jabatan resmi Farhah Tri Febriani, S.H. |
| 3 | Seluruh 7 anggota tim | `photo` | Foto dari `/Images/*.png` telah dipetakan ke `/public/team/<slug>.webp` (rasio 4:5, tanpa EXIF) | `TODO(client)`: Konfirmasi akhir keseragaman foto formal seluruh 7 anggota tim (pencahayaan, latar, dan framing 4:5). |
| 4 | Seluruh 7 anggota tim | `displayOrder` | `1` Ferdinan, `2` Basit, `3` Haddy, `4` Benny, `5` Delia, `6` Farhah, `7` Kahlil | `TODO(client)`: Konfirmasi urutan tampil seluruh 7 profil tim (Ferdinan sang pendiri dan 6 anggota tim). |
| 5 | `basit-rezki` (Basit Rezki, S.H.) | `fullBio` | Teks salinan persis dari `CONTENT_PROFILES.md` | `TODO(client)`: Konfirmasi kerahasiaan dan kepatuhan kode etik terkait penyebutan "kasus tindak pidana kekerasan terhadap anak" pada `fullBio` Basit Rezki, S.H. |

---

## 2. Sepuluh Bidang Layanan (`content/practice_areas.json` & `DESIGN.md` Bagian 8)

Nama bidang dan label diambil dari `DESIGN.md` Bagian 8. Sesuai aturan, teks deskripsi dan "Cakupan Advokasi" dari demo **tidak disalin** karena memuat klaim lingkup praktik yang belum dikonfirmasi client.

| No | Slug | Nama Bidang | Label | Item `TODO(client)` |
|---|---|---|---|---|
| 1 | `litigasi-korporasi-dan-komersial` | Litigasi Korporasi & Komersial | `BISNIS` | `TODO(client)`: Konfirmasi nama bidang, ringkasan 1–2 kalimat (`summary`), deskripsi (`description`), butir `advocacyScope` ("Cakupan Advokasi"), dan `icon`. |
| 2 | `sengketa-pertanahan-dan-agraria` | Sengketa Pertanahan & Agraria | `PROPERTI` | `TODO(client)`: Konfirmasi nama bidang, ringkasan 1–2 kalimat (`summary`), deskripsi (`description`), butir `advocacyScope` ("Cakupan Advokasi"), dan `icon`. |
| 3 | `hukum-perdata-dan-perlindungan-aset` | Hukum Perdata & Perlindungan Aset | `ASET` | `TODO(client)`: Konfirmasi nama bidang, ringkasan 1–2 kalimat (`summary`), deskripsi (`description`), butir `advocacyScope` ("Cakupan Advokasi"), dan `icon`. |
| 4 | `hukum-pidana-umum-dan-tipikor` | Hukum Pidana Umum & Tipikor | `PIDANA` | `TODO(client)`: Konfirmasi nama bidang, ringkasan 1–2 kalimat (`summary`), deskripsi (`description`), butir `advocacyScope` ("Cakupan Advokasi"), dan `icon`. |
| 5 | `hak-kekayaan-intelektual-hki` | Hak Kekayaan Intelektual (HKI) | `HKI` | `TODO(client)`: Konfirmasi nama bidang, ringkasan 1–2 kalimat (`summary`), deskripsi (`description`), butir `advocacyScope` ("Cakupan Advokasi"), dan `icon`. |
| 6 | `ketenagakerjaan-dan-phi` | Ketenagakerjaan & PHI | `INDUSTRIAL` | `TODO(client)`: Konfirmasi nama bidang, ringkasan 1–2 kalimat (`summary`), deskripsi (`description`), butir `advocacyScope` ("Cakupan Advokasi"), dan `icon`. |
| 7 | `kepailitan-dan-pkpu-niaga` | Kepailitan & PKPU Niaga | `RESTRUKTURISASI` | `TODO(client)`: Konfirmasi nama bidang, ringkasan 1–2 kalimat (`summary`), deskripsi (`description`), butir `advocacyScope` ("Cakupan Advokasi"), dan `icon`. |
| 8 | `arbitrase-dan-mediasi-bisnis` | Arbitrase & Mediasi Bisnis | `ADR` | `TODO(client)`: Konfirmasi nama bidang, ringkasan 1–2 kalimat (`summary`), deskripsi (`description`), butir `advocacyScope` ("Cakupan Advokasi"), dan `icon`. |
| 9 | `hukum-perbankan-dan-pembiayaan` | Hukum Perbankan & Pembiayaan | `FINANSIAL` | `TODO(client)`: Konfirmasi nama bidang, ringkasan 1–2 kalimat (`summary`), deskripsi (`description`), butir `advocacyScope` ("Cakupan Advokasi"), dan `icon`. |
| 10 | `hukum-keluarga-dan-waris` | Hukum Keluarga & Waris | `WARIS` | `TODO(client)`: Konfirmasi nama bidang, ringkasan 1–2 kalimat (`summary`), deskripsi (`description`), butir `advocacyScope` ("Cakupan Advokasi"), dan `icon`. |

---

## 3. Rekam Jejak Perkara — Fitur v2 (`content/case_records.json` & `CONTENT_PROFILES.md` Bagian 4)

Data 7 perkara telah di-seed ke `content/case_records.json` sesuai prosedur `SK-14` dengan `displayMode: "anonymous"`, `clientName: null`, dan `consentRef: null` (tanpa nama klien/perusahaan, tanpa tahun, tanpa status menang/kalah, dan tanpa nilai perkara).

| No | ID | Jenis Perkara (`caseType`) | Wilayah (`region`) | Mode Tampil | Item `TODO(client)` |
|---|---|---|---|---|---|
| 1 | `case-record-1` | Perselisihan Hubungan Industrial | Jakarta | `anonymous` | `TODO(client)`: Konfirmasi tetap `anonymous` atau sertakan bukti persetujuan tertulis (`consentRef`) bila ingin ditampilkan bernama. |
| 2 | `case-record-2` | Tindak Pidana Korupsi | Semarang, Jawa Tengah | `anonymous` | `TODO(client)`: Risiko tinggi (perkara pidana). Wajib tetap `anonymous` kecuali ada `consentRef` tertulis sah dari pihak terkait. |
| 3 | `case-record-3` | Tindak Pidana Korupsi | Semarang, Jawa Tengah | `anonymous` | `TODO(client)`: Risiko tinggi (perkara pidana). Wajib tetap `anonymous` kecuali ada `consentRef` tertulis sah dari pihak terkait. |
| 4 | `case-record-4` | Tindak pidana penggelapan terkait hubungan kerja | Surabaya, Jawa Timur | `anonymous` | `TODO(client)`: Risiko tinggi (perkara pidana). Wajib tetap `anonymous` kecuali ada `consentRef` tertulis sah dari pihak terkait. |
| 5 | `case-record-5` | Kecelakaan lalu lintas | Bandung, Jawa Barat | `anonymous` | `TODO(client)`: Konfirmasi deskripsi jenis perkara dan wilayah. |
| 6 | `case-record-6` | Sengketa hak atas tanah | Gunung Putri, Bogor, Jawa Barat | `anonymous` | `TODO(client)`: Konfirmasi ejaan baku "Gunung Putri" (pada sumber awal tertulis "Gunung Puteri"). |
| 7 | `case-record-7` | Tindak Pidana Asuransi | Jakarta | `anonymous` | `TODO(client)`: Konfirmasi dokumentasi foto perkara tindak pidana asuransi (saat ini menggunakan gambar placeholder). |

---

## 4. Konten Situs Lainnya (`CONTENT_PROFILES.md`, `DESIGN.md`, `PRD.md`)

- [ ] `TODO(client)`: Teks bagian **Tentang Kantor**, butir kredibilitas yang dapat diverifikasi, dan konfirmasi kutipan Managing Partner (menggunakan motto resmi `"Life has to be meaningful"` atau kutipan tertulis yang disetujui).
- [ ] `TODO(client)`: Keputusan untuk pengganti **Kartu Fakta** di beranda (angka statistik demo dilarang tampil tanpa verifikasi tertulis dan tinjauan kode etik advokat; persentase keberhasilan dilarang mutlak).
- [ ] `TODO(client)`: Berkas vektor (**SVG/PDF**) logo seal resmi **Ferdinan Silalahi dan Rekan Law Firm** (`DESIGN.md` Bagian 3A & 11).
- [ ] `TODO(client)`: Konfirmasi nomor WhatsApp resmi lengkap (format internasional `62...`) dan alamat email resmi penerima form konsultasi (`INQUIRY_TO`).
- [ ] `TODO(client)`: Teks **Kebijakan Privasi**, masa simpan data permintaan konsultasi, dan persetujuan teks disclaimer.
