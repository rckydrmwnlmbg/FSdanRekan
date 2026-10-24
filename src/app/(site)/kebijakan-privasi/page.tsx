import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { buildPageMetadata, OFFICIAL_ADDRESS, OFFICIAL_FIRM_NAME } from '@/lib/seo'

export const metadata: Metadata = buildPageMetadata({
  title: `Kebijakan Privasi & Disclaimer | ${OFFICIAL_FIRM_NAME}`,
  description:
    'Kebijakan Pelindungan Data Pribadi (UU No. 27 Tahun 2022) dan Disclaimer informasi hukum pada website resmi Ferdinan Silalahi dan Rekan Law Firm.',
  path: '/kebijakan-privasi',
})

export default function PrivacyPolicyPage() {
  return (
    <section className="section-gap">
      <div className="container">
        <h1>Kebijakan Privasi &amp; Disclaimer Hukum</h1>
        <p className="section-subtitle">
          Komitmen pelindungan data pribadi pengunjung dan batas tanggung jawab informasi umum{' '}
          <strong>{OFFICIAL_FIRM_NAME}</strong>.
        </p>

        <div className="article-prose">
          <h2>1. Disclaimer Informasi Umum (Bukan Nasihat Hukum)</h2>
          <p>
            Seluruh konten, artikel, dan informasi yang ditayangkan pada situs web{' '}
            <strong>{OFFICIAL_FIRM_NAME}</strong> disusun semata-mata untuk tujuan informasi umum
            dan edukasi hukum. Tidak ada bagian dari situs ini yang dapat ditafsirkan sebagai
            nasihat hukum formal (<em>legal advice</em>) atau pendapat hukum (<em>legal opinion</em>
            ) bagi kasus spesifik Anda.
          </p>
          <p>
            Pengiriman formulir permohonan janji temu atau pesan melalui WhatsApp dari situs ini{' '}
            <strong>belum menciptakan hubungan advokat dan klien</strong>. Hubungan hukum antara
            advokat dan klien baru berlaku secara sah setelah adanya pemeriksaan benturan
            kepentingan serta penandatanganan Surat Kuasa Khusus dan/atau Perjanjian Jasa Hukum.
            Oleh karena itu, pengunjung diimbau keras untuk{' '}
            <strong>tidak mengirimkan dokumen rahasia atau detail sensitif perkara</strong> melalui
            formulir situs web ini.
          </p>

          <h2>2. Pengumpulan dan Tujuan Pemrosesan Data Pribadi</h2>
          <p>
            Sesuai Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP), kami
            hanya mengumpulkan data pribadi yang secara sukarela Anda berikan melalui formulir
            permohonan janji temu, meliputi: nama lengkap/instansi, alamat email, nomor WhatsApp,
            kategori bidang hukum, jadwal pilihan, dan uraian singkat kebutuhan konsultasi.
          </p>
          <p>
            Data tersebut diproses semata-mata untuk menghubungi Anda kembali guna mengonfirmasi
            jadwal konsultasi awal dan hanya dapat diakses oleh administrator resmi{' '}
            <strong>{OFFICIAL_FIRM_NAME}</strong>.
          </p>

          <h2>3. Masa Simpan (Retensi) dan Hak Subjek Data</h2>
          <p>
            Data permohonan janji temu disimpan paling lama <strong>12 (dua belas) bulan</strong>{' '}
            sejak tanggal pengiriman dan akan dihapus secara berkala. Sebagai Subjek Data Pribadi,
            Anda berhak meminta akses, perbaikan, atau penghapusan lebih awal atas data pribadi Anda
            dengan menghubungi kantor kami di:
          </p>
          <p>
            <strong>{OFFICIAL_FIRM_NAME}</strong>
            <br />
            {OFFICIAL_ADDRESS}
          </p>
        </div>

        <div className="hero-actions-row">
          <Link href="/" className="btn-outline">
            &larr; Kembali ke Beranda
          </Link>
        </div>
      </div>
    </section>
  )
}
