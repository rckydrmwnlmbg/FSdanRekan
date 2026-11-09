import type { RowDataPacket } from 'mysql2/promise'
import teamSeed from '../../content/team.json'
import practiceAreasSeed from '../../content/practice_areas.json'
import caseRecordsSeed from '../../content/case_records.json'
import articlesSeed from '../../content/articles.json'
import { getDbPool } from '@/lib/db'
import { OFFICIAL_ADDRESS, OFFICIAL_FIRM_NAME, SHORT_BRAND_NAME } from '@/lib/seo'

export interface TeamPhotoData {
  id: string
  filename: string
  sourceFilename: string
  mimeType: string
  size: number
  width: number
  height: number
  aspectRatio: string
  url: string
  sizes: {
    sm: string
    md: string
    lg: string
  }
  srcSet: string
  alt: string
}

export interface TeamMemberData {
  id: string
  slug: string
  fullName: string
  honorific: string
  displayName: string
  roleTitle: string
  group: string
  motto: string | null
  shortBio: string
  fullBio: string
  education: string[]
  credentials: string[]
  languages: string[]
  tags: string[]
  photo: TeamPhotoData
  displayOrder: number
  isPublished: boolean
}

export interface PracticeAreaData {
  id: string
  slug: string
  name: string
  label: string
  summary: string
  description: string
  advocacyScope: string[]
  icon: string
  image?: string
  displayOrder: number
  isPublished: boolean
}

export interface CaseDocumentationPhoto {
  url: string
  caption?: string
  alt?: string
}

export interface CaseRecordInternal {
  id: string
  caseType: string
  region: string
  displayMode: 'anonymous' | 'named'
  clientName: string | null
  consentRef: string | null
  scope?: string
  displayOrder: number
  isPublished: boolean
  imageUrl?: string
  imageAlt?: string
  photos?: CaseDocumentationPhoto[]
}

export interface PublicCaseRecord {
  id: string
  caseType: string
  region: string
  displayMode: 'anonymous' | 'named'
  clientName?: string
  displayOrder: number
  imageUrl?: string
  imageAlt?: string
  photos?: CaseDocumentationPhoto[]
}

export interface ArticlePublicData {
  id: string
  slug: string
  title: string
  excerpt: string
  bodyHtml: string
  coverImage: {
    url: string
    alt: string
  }
  category: {
    slug: string
    name: string
  }
  authorName: string
  status: 'draft' | 'published'
  publishedAt: string
  seoTitle: string
  seoDescription: string
}

export interface SiteSettingsData {
  firmName: string
  shortBrandName: string
  address: string
  whatsappNumber: string
  whatsappDisplay: string
  defaultWaMessage: string
  inquiryRecipientEmail: string
  instagramUrl: string
  mapEmbedUrl: string
  mapsDirectUrl: string
  officeHours: {
    pagi: string
    siang: string
    sore: string
  }
}

const PRACTICE_PRESENTATION_BY_SLUG: Record<
  string,
  {
    image: string
    summary: string
    description: string
    advocacyScope: string[]
  }
> = {
  'litigasi-korporasi-dan-komersial': {
    image: '/images/practice-corporate.webp',
    summary:
      'Pendampingan penyelesaian sengketa korporasi, perjanjian komersial, tata kelola perusahaan, serta perlindungan kepentingan hukum pelaku usaha.',
    description:
      'Penyelesaian Sengketa Kontrak & Tata Kelola Perusahaan',
    advocacyScope: [
      'Penanganan sengketa pemegang saham, RUPS, dan organ perseroan',
      'Penyusunan, peninjauan, dan negosiasi kontrak bisnis komersial',
      'Representasi litigasi perdata dan komersial di pengadilan',
    ],
  },
  'sengketa-pertanahan-dan-agraria': {
    image: '/images/article-land.webp',
    summary:
      'Pendampingan sengketa hak atas tanah, pemeriksaan keabsahan dokumen pertanahan (legal due diligence), dan penyelesaian klaim penguasaan lahan.',
    description: 'Kepastian Alas Hak & Penanganan Sengketa Pertanahan',
    advocacyScope: [
      'Uji tuntas hukum (legal due diligence) sebelum transaksi aset properti',
      'Pendampingan sengketa tumpang tindih sertifikat dan riwayat kepemilikan',
      'Mediasi dan litigasi sengketa hak atas tanah di peradilan',
    ],
  },
  'hukum-perdata-dan-perlindungan-aset': {
    image: '/images/lady-justice.webp',
    summary:
      'Penanganan gugatan wanprestasi, perbuatan melawan hukum (PMH), permohonan sita jaminan, serta perancangan instrumen perlindungan aset.',
    description: 'Penegakan Hak Perdata & Perlindungan Aset Klien',
    advocacyScope: [
      'Penyusunan somasi, gugatan wanprestasi, dan perbuatan melawan hukum',
      'Permohonan sita jaminan dan pelaksanaan putusan pengadilan',
      'Pendampingan negosiasi pemulihan hak keperdataan',
    ],
  },
  'hukum-pidana-umum-dan-tipikor': {
    image: '/images/hero-slide-courtroom.webp',
    summary:
      'Pendampingan hukum pada tahap pelaporan, penyelidikan, penyidikan, hingga pembelaan di persidangan perkara pidana umum dan tindak pidana korupsi.',
    description: 'Pendampingan Proses Hukum & Pembelaan di Persidangan',
    advocacyScope: [
      'Pendampingan saksi, pelapor, maupun tersangka dalam pemeriksaan',
      'Penyusunan eksepsi, pledoi, memori banding, kasasi, dan PK',
      'Penanganan perkara tindak pidana umum dan tindak pidana khusus/korupsi',
    ],
  },
  'hak-kekayaan-intelektual-hki': {
    image: '/images/practice-ip.webp',
    summary:
      'Perlindungan hukum atas merek, hak cipta, paten, desain industri, rahasia dagang, serta penyelesaian sengketa kekayaan intelektual.',
    description: 'Perlindungan Kekayaan Intelektual & Perjanjian Lisensi',
    advocacyScope: [
      'Konsultasi pendaftaran dan pengelolaan portofolio HKI',
      'Penyusunan perjanjian lisensi, waralaba, dan kerahasiaan (NDA)',
      'Penanganan sengketa pelanggaran merek dan hak cipta di Pengadilan Niaga',
    ],
  },
  'ketenagakerjaan-dan-phi': {
    image: '/images/practice-labor.webp',
    summary:
      'Pendampingan hubungan industrial, perundingan bipartit dan tripartit, penyusunan kontrak kerja, serta penyelesaian sengketa di Pengadilan Hubungan Industrial.',
    description: 'Kepatuhan Ketenagakerjaan & Penyelesaian Perselisihan Hubungan Industrial',
    advocacyScope: [
      'Penyusunan Perjanjian Kerja, Peraturan Perusahaan (PP), dan PKB',
      'Pendampingan perundingan bipartit dan mediasi tripartit',
      'Representasi sengketa Perselisihan Hubungan Industrial (PHI)',
    ],
  },
  'kepailitan-dan-pkpu-niaga': {
    image: '/images/practice-bankruptcy.webp',
    summary:
      'Pendampingan perkara Penundaan Kewajiban Pembayaran Utang (PKPU) dan kepailitan bagi kreditur maupun debitur di Pengadilan Niaga.',
    description: 'Restrukturisasi Kewajiban Utang & Perkara Pengadilan Niaga',
    advocacyScope: [
      'Penyusunan permohonan PKPU dan kepailitan di Pengadilan Niaga',
      'Pendampingan rapat kreditur, verifikasi tagihan, dan proposal perdamaian',
      'Pengelolaan dokumen restrukturisasi utang korporasi',
    ],
  },
  'arbitrase-dan-mediasi-bisnis': {
    image: '/images/gavel-banner.webp',
    summary:
      'Penyelesaian sengketa komersial di luar pengadilan melalui mekanisme negosiasi, mediasi, dan forum arbitrase secara efektif dan terjaga kerahasiaannya.',
    description: 'Penyelesaian Sengketa Alternatif (ADR) & Mediasi Komersial',
    advocacyScope: [
      'Perumusan strategi negosiasi dan fasilitasi mediasi bisnis',
      'Pendampingan proses beracara pada forum arbitrase',
      'Pendaftaran dan pelaksanaan putusan perdamaian atau arbitrase',
    ],
  },
  'hukum-perbankan-dan-pembiayaan': {
    image: '/images/practice-banking.webp',
    summary:
      'Pendampingan hukum di bidang perbankan dan pembiayaan, termasuk penanganan kredit bermasalah (Non-Performing Loan/NPL), restrukturisasi, dan eksekusi agunan.',
    description: 'Kepatuhan Perbankan, Restrukturisasi Kredit & Penanganan NPL',
    advocacyScope: [
      'Penanganan pemulihan kredit bermasalah (Non-Performing Loan / NPL)',
      'Koordinasi restrukturisasi fasilitas kredit dan pengelolaan dokumen jaminan',
      'Pendampingan proses eksekusi hak tanggungan dan jaminan fidusia',
    ],
  },
  'hukum-keluarga-dan-waris': {
    image: '/images/article-family.webp',
    summary:
      'Konsultasi dan pendampingan perkara hukum keluarga, penyusunan perjanjian perkawinan, penataan harta keluarga, serta penyelesaian sengketa waris.',
    description: 'Pendampingan Hukum Keluarga & Penyelesaian Waris',
    advocacyScope: [
      'Penyusunan dan peninjauan perjanjian perkawinan',
      'Konsultasi pembagian waris dan penataan harta keluarga',
      'Pendampingan penyelesaian sengketa keperdataan keluarga di pengadilan',
    ],
  },
}

export const DEFAULT_SITE_SETTINGS: SiteSettingsData = {
  firmName: OFFICIAL_FIRM_NAME,
  shortBrandName: SHORT_BRAND_NAME,
  address: OFFICIAL_ADDRESS,
  whatsappNumber: '62811830991',
  whatsappDisplay: '+62 811-830-991',
  defaultWaMessage: 'Halo FS dan Rekan, saya ingin konsultasi hukum.',
  inquiryRecipientEmail: 'kontak@fsdanrekan.id',
  instagramUrl: 'https://instagram.com/fhspartners',
  mapEmbedUrl:
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3966.5357334624136!2d106.83636290000001!3d-6.192815!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e69f43e979ba7b9%3A0x367501a082936e59!2sJl.%20RP.%20Soeroso%20No.33%2C%20RT.2%2FRW.2%2C%20Cikini%2C%20Kec.%20Menteng%2C%20Kota%20Jakarta%20Pusat%2C%20Daerah%20Khusus%20Ibukota%20Jakarta%2010350!5e0!3m2!1sen!2sid!4v1793080293609!5m2!1sen!2sid',
  mapsDirectUrl:
    'https://www.google.com/maps/search/?api=1&query=Gedung+Mandira+Jl.+RP+Soeroso+No.+33+Menteng+Jakarta+Pusat',
  officeHours: {
    pagi: 'Pagi (09.30 – 12.00 WIB)',
    siang: 'Siang (13.30 – 15.30 WIB)',
    sore: 'Sore (16.00 – 18.00 WIB)',
  },
}

function cleanUiTeamMember(member: TeamMemberData): TeamMemberData {
  const cleanHonorific = member.honorific.startsWith('TODO(client)') ? '' : member.honorific
  const cleanDisplayName = cleanHonorific ? `${member.fullName}, ${cleanHonorific}` : member.fullName
  const cleanRoleTitle = member.roleTitle.startsWith('TODO(client)')
    ? member.group
    : member.roleTitle
  const cleanAlt = `Foto ${cleanDisplayName}`

  return {
    ...member,
    honorific: cleanHonorific,
    displayName: cleanDisplayName,
    roleTitle: cleanRoleTitle,
    photo: {
      ...member.photo,
      alt: cleanAlt,
    },
  }
}

export function getPublishedTeamMembers(): TeamMemberData[] {
  return (teamSeed as TeamMemberData[])
    .filter((m) => m.isPublished)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map(cleanUiTeamMember)
}

export function getTeamMemberBySlug(slug: string): TeamMemberData | null {
  const found = getPublishedTeamMembers().find((m) => m.slug === slug)
  return found ?? null
}

export function getPublishedPracticeAreas(): PracticeAreaData[] {
  return (practiceAreasSeed as PracticeAreaData[])
    .filter((p) => p.isPublished)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((area) => {
      const pres = PRACTICE_PRESENTATION_BY_SLUG[area.slug]
      return {
        ...area,
        icon: area.icon.startsWith('TODO(client)') ? '' : area.icon,
        image: pres?.image ?? '/images/practice-corporate.webp',
        summary: area.summary.startsWith('TODO(client)') && pres ? pres.summary : area.summary,
        description:
          area.description.startsWith('TODO(client)') && pres
            ? pres.description
            : area.description,
        advocacyScope:
          area.advocacyScope.some((s) => s.startsWith('TODO(client)')) && pres
            ? pres.advocacyScope
            : area.advocacyScope,
      }
    })
}

export function getPracticeAreaBySlug(slug: string): PracticeAreaData | null {
  const found = getPublishedPracticeAreas().find((p) => p.slug === slug)
  return found ?? null
}

export interface InstagramGalleryItem {
  id: string
  imageUrl: string
  alt: string
  category: string
  caption: string
  publishedDate: string
  permalink: string
  displayOrder: number
  isPublished: boolean
}

export const INITIAL_INSTAGRAM_GALLERY: InstagramGalleryItem[] = [
  {
    id: 'ig-real-1',
    imageUrl: 'https://www.instagram.com/p/DbTC57rEjrA/media/?size=l',
    alt: 'Postingan Instagram Resmi @fhspartners (DbTC57rEjrA)',
    category: 'Publikasi Resmi',
    caption: 'Lobby dan mediasi sebagai langkah penyelesaian sengketa dari akun resmi @fhspartners.',
    publishedDate: 'Instagram Live',
    permalink: 'https://www.instagram.com/p/DbTC57rEjrA/',
    displayOrder: 1,
    isPublished: true,
  },
  {
    id: 'ig-real-2',
    imageUrl: 'https://www.instagram.com/p/DdGbn5YyKb_/media/?size=l',
    alt: 'Postingan Instagram Resmi @fhspartners (DdGbn5YyKb_)',
    category: 'Publikasi Resmi',
    caption: 'Ucapan ulang tahun kepada Managing Partner dari akun resmi @fhspartners.',
    publishedDate: 'Instagram Live',
    permalink: 'https://www.instagram.com/p/DdGbn5YyKb_/',
    displayOrder: 2,
    isPublished: true,
  },
  {
    id: 'ig-real-3',
    imageUrl: 'https://www.instagram.com/p/Dbp3d5PEuLe/media/?size=l',
    alt: 'Postingan Instagram Resmi @fhspartners (Dbp3d5PEuLe)',
    category: 'Publikasi Resmi',
    caption: 'Pembahasan materi praperadilan dalam KUHAP baru dari akun resmi @fhspartners.',
    publishedDate: 'Instagram Live',
    permalink: 'https://www.instagram.com/p/Dbp3d5PEuLe/',
    displayOrder: 3,
    isPublished: true,
  },
  {
    id: 'ig-real-4',
    imageUrl: 'https://www.instagram.com/p/Dc3H8MaGM_D/media/?size=l',
    alt: 'Postingan Instagram Resmi @fhspartners (Dc3H8MaGM_D)',
    category: 'Publikasi Resmi',
    caption: 'Pembahasan mekanisme Plea Bargaining dalam hukum acara pidana dari akun resmi @fhspartners.',
    publishedDate: 'Instagram Live',
    permalink: 'https://www.instagram.com/p/Dc3H8MaGM_D/',
    displayOrder: 4,
    isPublished: true,
  },
  {
    id: 'ig-real-5',
    imageUrl: 'https://www.instagram.com/p/DawrpvRxxY7/media/?size=l',
    alt: 'Postingan Instagram Resmi @fhspartners (DawrpvRxxY7)',
    category: 'Publikasi Resmi',
    caption: 'Advokasi dan wawasan kepemimpinan dari akun resmi @fhspartners.',
    publishedDate: 'Instagram Live',
    permalink: 'https://www.instagram.com/p/DawrpvRxxY7/',
    displayOrder: 5,
    isPublished: true,
  },
]

export function getInstagramGalleryItems(): InstagramGalleryItem[] {
  return INITIAL_INSTAGRAM_GALLERY.filter((item) => item.isPublished).sort(
    (a, b) => a.displayOrder - b.displayOrder,
  )
}

export function serializePublicCaseRecord(record: CaseRecordInternal): PublicCaseRecord {
  const allowNamed =
    record.displayMode === 'named' &&
    typeof record.consentRef === 'string' &&
    record.consentRef.trim().length > 0

  const defaultPhotoUrl = record.imageUrl ?? '/images/hero-slide-courtroom.webp'
  const defaultPhotoAlt =
    record.imageAlt ??
    `Dokumentasi penanganan perkara ${record.caseType} di wilayah ${record.region}`

  const photos: CaseDocumentationPhoto[] =
    Array.isArray(record.photos) && record.photos.length > 0
      ? record.photos
      : [
          {
            url: defaultPhotoUrl,
            caption: `Dokumentasi penanganan perkara ${record.caseType} wilayah ${record.region}`,
            alt: defaultPhotoAlt,
          },
        ]

  const pub: PublicCaseRecord = {
    id: record.id,
    caseType: record.caseType,
    region: record.region,
    displayMode: allowNamed ? 'named' : 'anonymous',
    displayOrder: record.displayOrder,
    imageUrl: photos[0]?.url ?? defaultPhotoUrl,
    imageAlt: photos[0]?.alt ?? defaultPhotoAlt,
    photos,
  }
  if (allowNamed && record.clientName) {
    pub.clientName = record.clientName
  }
  return pub
}

export function getPublicCaseRecords(): PublicCaseRecord[] {
  return (caseRecordsSeed as CaseRecordInternal[])
    .filter((c) => c.isPublished)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map(serializePublicCaseRecord)
}

export const INITIAL_ARTICLES: ArticlePublicData[] = [
  {
    id: 'article-1',
    slug: 'strategi-mitigasi-risiko-litigasi-perjanjian-bisnis',
    title: 'Strategi Mitigasi Risiko Litigasi dalam Perjanjian Bisnis Komersial',
    excerpt:
      'Penyusunan klausul penyelesaian sengketa, pembatasan tanggung jawab, dan klausul keadaan kahar guna mengantisipasi wanprestasi mitra usaha.',
    bodyHtml: `
      <p>Dalam dinamika bisnis komersial, sengketa antar mitra sering kali berakar dari perumusan klausul kontrak yang multitafsir. Penyusunan perjanjian yang cermat harus memperhitungkan mekanisme pencegahan dan penyelesaian sengketa sejak tahap negosiasi.</p>
      <h2>1. Klausul Pilihan Forum dan Penyelesaian Sengketa</h2>
      <p>Menentukan forum penyelesaian sengketa secara tegas—baik melalui Pengadilan Negeri maupun forum alternatif seperti mediasi dan arbitrase—sangat penting untuk menjaga kepastian hukum bagi para pihak.</p>
      <h2>2. Pembatasan Tanggung Jawab dan Keadaan Kahar (Force Majeure)</h2>
      <p>Perumusan definisi keadaan kahar serta batasan tanggung jawab perlu merujuk pada ketentuan Kitab Undang-Undang Hukum Perdata dan regulasi sektoral yang berlaku di Indonesia.</p>
    `,
    coverImage: {
      url: '/images/practice-corporate.webp',
      alt: 'Ilustrasi ruang diskusi hukum korporasi dan kontrak komersial',
    },
    category: {
      slug: 'hukum-korporasi',
      name: 'Hukum Korporasi & Bisnis',
    },
    authorName: 'Tim Redaksi FS dan Rekan',
    status: 'published',
    publishedAt: '2026-10-12T09:00:00.000Z',
    seoTitle: 'Strategi Mitigasi Risiko Litigasi dalam Perjanjian Bisnis | FS dan Rekan',
    seoDescription:
      'Panduan umum penyusunan klausul penyelesaian sengketa dan keadaan kahar dalam perjanjian bisnis komersial di Indonesia.',
  },
  {
    id: 'article-2',
    slug: 'penyelesaian-sengketa-kepemilikan-lahan-dan-uji-tuntas',
    title: 'Penyelesaian Sengketa Kepemilikan Lahan & Uji Tuntas (Legal Due Diligence)',
    excerpt:
      'Pentingnya pemeriksaan riwayat alas hak dan verifikasi dokumen pertanahan sebelum melakukan transaksi aset properti.',
    bodyHtml: `
      <p>Sengketa pertanahan kerap melibatkan tumpang tindih dokumen kepemilikan atau ketidakjelasan riwayat penguasaan fisik. Uji tuntas hukum (<em>legal due diligence</em>) merupakan langkah preventif utama sebelum transaksi properti dilakukan.</p>
      <h2>1. Verifikasi Administrasi Pertanahan</h2>
      <p>Pemeriksaan kesesuaian data fisik dan data yuridis pada dokumen pertanahan bertujuan memastikan tidak adanya catatan blokir, sita jaminan, atau sengketa yang sedang berjalan.</p>
      <h2>2. Pemeriksaan Riwayat Penguasaan Fisik</h2>
      <p>Selain pemeriksaan dokumen, peninjauan batas sempadan dan riwayat penguasaan fisik di lapangan membantu memitigasi klaim pihak ketiga di kemudian hari.</p>
    `,
    coverImage: {
      url: '/images/article-land.webp',
      alt: 'Ilustrasi dokumen hukum pertanahan dan agraria',
    },
    category: {
      slug: 'agraria-dan-properti',
      name: 'Agraria & Properti',
    },
    authorName: 'Tim Redaksi FS dan Rekan',
    status: 'published',
    publishedAt: '2026-10-08T09:00:00.000Z',
    seoTitle: 'Penyelesaian Sengketa Lahan & Legal Due Diligence | FS dan Rekan',
    seoDescription:
      'Informasi umum mengenai tahapan uji tuntas hukum (legal due diligence) dan penyelesaian sengketa kepemilikan tanah.',
  },
  {
    id: 'article-3',
    slug: 'perjanjian-perkawinan-dan-perlindungan-harta-keluarga',
    title: 'Pentingnya Perjanjian Perkawinan & Penataan Harta Keluarga',
    excerpt:
      'Instrumen hukum perdata untuk mengatur pemisahan harta bawaan dan tanggung jawab perikatan dalam keluarga.',
    bodyHtml: `
      <p>Perjanjian perkawinan (baik sebelum maupun selama ikatan perkawinan berlangsung sesuai ketentuan peraturan perundang-undangan) merupakan instrumen hukum untuk memberikan kejelasan mengenai status harta dan tanggung jawab perdata masing-masing pasangan.</p>
      <h2>1. Pemisahan Tanggung Jawab Perikatan Usaha</h2>
      <p>Dengan adanya akta notariil yang dicatatkan pada instansi berwenang, tata kelola harta pribadi dan harta bersama menjadi lebih tertib apabila salah satu pihak menjalankan kegiatan usaha dengan risiko komersial.</p>
      <h2>2. Kepastian Perencanaan Harta Keluarga</h2>
      <p>Penataan dokumen kepemilikan aset sejak dini turut membantu meminimalkan potensi perselisihan waris di masa mendatang.</p>
    `,
    coverImage: {
      url: '/images/article-family.webp',
      alt: 'Ilustrasi konsultasi hukum keluarga dan perdata',
    },
    category: {
      slug: 'perdata-keluarga',
      name: 'Perdata Keluarga',
    },
    authorName: 'Tim Redaksi FS dan Rekan',
    status: 'published',
    publishedAt: '2026-09-28T09:00:00.000Z',
    seoTitle: 'Pentingnya Perjanjian Perkawinan & Penataan Harta Keluarga | FS dan Rekan',
    seoDescription:
      'Penjelasan umum mengenai fungsi perjanjian perkawinan dan penataan aset dalam hukum perdata di Indonesia.',
  },
  {
    id: 'article-draft-internal',
    slug: 'draf-internal-belum-terbit',
    title: 'Draf Internal: Catatan Kajian Belum Terbit',
    excerpt: 'Artikel ini berstatus draf dan tidak boleh tampil di publik (SEC-008 / FR-5.3).',
    bodyHtml: '<p>Draf rahasia belum diterbitkan.</p>',
    coverImage: {
      url: '/images/practice-corporate.webp',
      alt: 'Ilustrasi draf',
    },
    category: {
      slug: 'hukum-korporasi',
      name: 'Hukum Korporasi & Bisnis',
    },
    authorName: 'Internal',
    status: 'draft',
    publishedAt: '2099-01-01T00:00:00.000Z',
    seoTitle: 'Draf',
    seoDescription: 'Draf',
  },
]

interface RawArticleSeedItem {
  id: string
  slug: string
  title: string
  excerpt?: string
  bodyHtml?: string
  coverUrl?: string
  coverAlt?: string
  coverImage?: {
    url: string
    alt: string
  }
  category?: {
    slug: string
    name: string
  }
  authorName?: string
  status?: 'draft' | 'published'
  publishedAt?: string
  seoTitle?: string
  seoDescription?: string
}

export function getAllNormalizedArticles(): ArticlePublicData[] {
  const seedList: RawArticleSeedItem[] =
    Array.isArray(articlesSeed) && articlesSeed.length > 0
      ? (articlesSeed as RawArticleSeedItem[])
      : (INITIAL_ARTICLES as unknown as RawArticleSeedItem[])

  return seedList.map((a: RawArticleSeedItem): ArticlePublicData => {
    const coverUrl = a.coverUrl || a.coverImage?.url || '/images/practice-corporate.webp'
    const coverAlt = a.coverAlt || a.coverImage?.alt || `Ilustrasi ${a.title}`
    return {
      id: a.id,
      slug: a.slug,
      title: a.title,
      excerpt: a.excerpt ?? '',
      bodyHtml: a.bodyHtml ?? '',
      coverImage: {
        url: coverUrl,
        alt: coverAlt,
      },
      category: {
        slug: a.category?.slug || 'kajian-hukum',
        name: a.category?.name || 'Hukum Korporasi & Bisnis',
      },
      authorName: a.authorName || 'Tim Redaksi FS dan Rekan',
      status: a.status === 'draft' ? 'draft' : 'published',
      publishedAt: a.publishedAt || new Date().toISOString(),
      seoTitle: a.seoTitle || a.title,
      seoDescription: a.seoDescription || a.excerpt || '',
    }
  })
}

export function getPublishedArticles(
  categorySlug?: string,
  searchQuery?: string,
): ArticlePublicData[] {
  const nowIso = new Date().toISOString()
  const q = searchQuery?.trim().toLowerCase() ?? ''
  return getAllNormalizedArticles()
    .filter((a) => {
      if (a.status !== 'published' || a.publishedAt > nowIso) return false
      if (categorySlug && a.category.slug !== categorySlug) return false
      if (q) {
        const haystack = `${a.title} ${a.excerpt} ${a.category.name} ${a.bodyHtml}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))
}

export function getPublishedArticleBySlug(slug: string): ArticlePublicData | null {
  const nowIso = new Date().toISOString()
  const found = getAllNormalizedArticles().find(
    (a) => a.slug === slug && a.status === 'published' && a.publishedAt <= nowIso,
  )
  return found ?? null
}

function safeParseJson<T>(raw: unknown, fallback: T): T {
  if (raw === null || raw === undefined) return fallback
  if (typeof raw === 'object') return raw as T
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as T
    } catch {
      return fallback
    }
  }
  return fallback
}

/**
 * Fetch global site settings from MySQL `site_settings` table with fallback to DEFAULT_SITE_SETTINGS.
 */
export async function fetchSiteSettingsFromDb(): Promise<SiteSettingsData> {
  const pool = getDbPool()
  if (!pool) {
    return DEFAULT_SITE_SETTINGS
  }
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT `settings_json` FROM `site_settings` WHERE `setting_key` = 'global' LIMIT 1",
    )
    if (!rows[0]?.settings_json) {
      return DEFAULT_SITE_SETTINGS
    }
    const raw = safeParseJson<Record<string, unknown>>(rows[0].settings_json, {})
    return {
      firmName: String(raw.officialFirmName || raw.firmName || DEFAULT_SITE_SETTINGS.firmName),
      shortBrandName: String(raw.shortBrandName || DEFAULT_SITE_SETTINGS.shortBrandName),
      address: String(raw.address || DEFAULT_SITE_SETTINGS.address),
      whatsappNumber: String(raw.whatsappNumber || DEFAULT_SITE_SETTINGS.whatsappNumber),
      whatsappDisplay: String(raw.whatsappDisplay || DEFAULT_SITE_SETTINGS.whatsappDisplay),
      defaultWaMessage: String(raw.defaultWaMessage || DEFAULT_SITE_SETTINGS.defaultWaMessage),
      inquiryRecipientEmail: String(
        raw.inquiryRecipientEmail || DEFAULT_SITE_SETTINGS.inquiryRecipientEmail,
      ),
      instagramUrl: String(raw.instagramUrl || DEFAULT_SITE_SETTINGS.instagramUrl),
      mapEmbedUrl: String(raw.mapEmbedUrl || DEFAULT_SITE_SETTINGS.mapEmbedUrl),
      mapsDirectUrl: String(raw.mapsDirectUrl || DEFAULT_SITE_SETTINGS.mapsDirectUrl),
      officeHours: {
        pagi: String(raw.officeHoursPagi || DEFAULT_SITE_SETTINGS.officeHours.pagi),
        siang: String(raw.officeHoursSiang || DEFAULT_SITE_SETTINGS.officeHours.siang),
        sore: String(raw.officeHoursSore || DEFAULT_SITE_SETTINGS.officeHours.sore),
      },
    }
  } catch {
    return DEFAULT_SITE_SETTINGS
  }
}

function mapRowToTeamMember(row: RowDataPacket): TeamMemberData {
  const slug = String(row.slug || '')
  const fullName = String(row.full_name || '')
  const honorific = String(row.honorific || '')
  const rawPhoto = safeParseJson<Partial<TeamPhotoData>>(row.photo_json, {})
  const defaultUrl = rawPhoto.url || `/team/${slug}.webp`

  const member: TeamMemberData = {
    id: String(row.id || `team-${slug}`),
    slug,
    fullName,
    honorific,
    displayName: String(row.display_name || fullName),
    roleTitle: String(row.role_title || 'Associate'),
    group: String(row.group_name || 'Associate'),
    motto: row.motto ? String(row.motto) : null,
    shortBio: String(row.short_bio || ''),
    fullBio: String(row.full_bio || ''),
    education: safeParseJson<string[]>(row.education_json, []),
    credentials: safeParseJson<string[]>(row.credentials_json, []),
    languages: safeParseJson<string[]>(row.languages_json, []),
    tags: safeParseJson<string[]>(row.tags_json, []),
    photo: {
      id: rawPhoto.id || `photo-${slug}`,
      filename: rawPhoto.filename || `${slug}.webp`,
      sourceFilename: rawPhoto.sourceFilename || `${slug}.png`,
      mimeType: rawPhoto.mimeType || 'image/webp',
      size: Number(rawPhoto.size) || 24000,
      width: Number(rawPhoto.width) || 640,
      height: Number(rawPhoto.height) || 800,
      aspectRatio: rawPhoto.aspectRatio || '4:5',
      url: defaultUrl,
      sizes: rawPhoto.sizes || {
        sm: defaultUrl,
        md: defaultUrl,
        lg: defaultUrl,
      },
      srcSet: rawPhoto.srcSet || `${defaultUrl} 640w`,
      alt: rawPhoto.alt || `Foto ${fullName}`,
    },
    displayOrder: Number(row.display_order) || 1,
    isPublished: Boolean(row.is_published),
  }

  return cleanUiTeamMember(member)
}

/**
 * Fetch published team members from MySQL `team_members` table with fallback to JSON seed.
 */
export async function fetchPublishedTeamMembersFromDb(): Promise<TeamMemberData[]> {
  const pool = getDbPool()
  if (!pool) {
    return getPublishedTeamMembers()
  }
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM `team_members` WHERE `is_published` = 1 ORDER BY `display_order` ASC',
    )
    if (rows.length === 0) {
      return getPublishedTeamMembers()
    }
    return rows.map(mapRowToTeamMember)
  } catch {
    return getPublishedTeamMembers()
  }
}

export async function fetchTeamMemberBySlugFromDb(slug: string): Promise<TeamMemberData | null> {
  const pool = getDbPool()
  if (!pool) {
    return getTeamMemberBySlug(slug)
  }
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM `team_members` WHERE `slug` = ? AND `is_published` = 1 LIMIT 1',
      [slug],
    )
    if (rows[0]) {
      return mapRowToTeamMember(rows[0])
    }
    const [countRows] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS cnt FROM `team_members`',
    )
    if (Number(countRows[0]?.cnt ?? 0) === 0) {
      return getTeamMemberBySlug(slug)
    }
    return null
  } catch {
    return getTeamMemberBySlug(slug)
  }
}

function mapRowToPracticeArea(row: RowDataPacket): PracticeAreaData {
  const slug = String(row.slug || '')
  const pres = PRACTICE_PRESENTATION_BY_SLUG[slug]
  const rawSummary = String(row.summary || '')
  const rawDesc = String(row.description || '')
  const rawScope = safeParseJson<string[]>(row.advocacy_scope_json, [])
  const rawIcon = String(row.icon || '')

  return {
    id: String(row.id || `pa-${slug}`),
    slug,
    name: String(row.name || ''),
    label: String(row.label || 'LAYANAN'),
    summary: rawSummary.startsWith('TODO(client)') && pres ? pres.summary : rawSummary,
    description: rawDesc.startsWith('TODO(client)') && pres ? pres.description : rawDesc,
    advocacyScope:
      rawScope.some((s) => String(s).startsWith('TODO(client)')) && pres
        ? pres.advocacyScope
        : rawScope,
    icon: rawIcon.startsWith('TODO(client)') ? '' : rawIcon,
    image: String(row.image || pres?.image || '/images/practice-corporate.webp'),
    displayOrder: Number(row.display_order) || 1,
    isPublished: Boolean(row.is_published),
  }
}

/**
 * Fetch published practice areas from MySQL `practice_areas` table with fallback to JSON seed.
 */
export async function fetchPublishedPracticeAreasFromDb(): Promise<PracticeAreaData[]> {
  const pool = getDbPool()
  if (!pool) {
    return getPublishedPracticeAreas()
  }
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM `practice_areas` WHERE `is_published` = 1 ORDER BY `display_order` ASC',
    )
    if (rows.length === 0) {
      return getPublishedPracticeAreas()
    }
    return rows.map(mapRowToPracticeArea)
  } catch {
    return getPublishedPracticeAreas()
  }
}

export async function fetchPracticeAreaBySlugFromDb(
  slug: string,
): Promise<PracticeAreaData | null> {
  const pool = getDbPool()
  if (!pool) {
    return getPracticeAreaBySlug(slug)
  }
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM `practice_areas` WHERE `slug` = ? AND `is_published` = 1 LIMIT 1',
      [slug],
    )
    if (rows[0]) {
      return mapRowToPracticeArea(rows[0])
    }
    const [countRows] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS cnt FROM `practice_areas`',
    )
    if (Number(countRows[0]?.cnt ?? 0) === 0) {
      return getPracticeAreaBySlug(slug)
    }
    return null
  } catch {
    return getPracticeAreaBySlug(slug)
  }
}

/**
 * Fetch published case records from MySQL `case_records` table (enforcing SK-14 anonymity guard).
 */
export async function fetchPublicCaseRecordsFromDb(): Promise<PublicCaseRecord[]> {
  const pool = getDbPool()
  if (!pool) {
    return getPublicCaseRecords()
  }
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM `case_records` WHERE `is_published` = 1 ORDER BY `display_order` ASC',
    )
    if (rows.length === 0) {
      return getPublicCaseRecords()
    }
    return rows.map((row) =>
      serializePublicCaseRecord({
        id: String(row.id),
        caseType: String(row.case_type || ''),
        region: String(row.region || ''),
        displayMode: row.display_mode === 'named' ? 'named' : 'anonymous',
        clientName: row.client_name ? String(row.client_name) : null,
        consentRef: row.consent_ref ? String(row.consent_ref) : null,
        scope: row.scope_text ? String(row.scope_text) : undefined,
        displayOrder: Number(row.display_order) || 1,
        isPublished: Boolean(row.is_published),
        imageUrl: row.image_url ? String(row.image_url) : undefined,
        imageAlt: row.image_alt ? String(row.image_alt) : undefined,
        photos: safeParseJson<CaseDocumentationPhoto[]>(row.photos_json, []),
      }),
    )
  } catch {
    return getPublicCaseRecords()
  }
}

function mapRowToArticle(row: RowDataPacket): ArticlePublicData {
  const publishedAtDate =
    row.published_at instanceof Date
      ? row.published_at.toISOString()
      : new Date(String(row.published_at || '')).toISOString()

  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    excerpt: String(row.excerpt || ''),
    bodyHtml: String(row.body_html || ''),
    coverImage: {
      url: String(row.cover_url || '/images/practice-corporate.webp'),
      alt: String(row.cover_alt || `Ilustrasi ${String(row.title)}`),
    },
    category: {
      slug: String(row.category_slug || 'hukum-korporasi'),
      name: String(row.category_name || 'Hukum Korporasi & Bisnis'),
    },
    authorName: String(row.author_name || 'Tim Redaksi FS dan Rekan'),
    status: row.status === 'published' ? 'published' : 'draft',
    publishedAt: publishedAtDate,
    seoTitle: String(row.seo_title || row.title || ''),
    seoDescription: String(row.seo_description || row.excerpt || ''),
  }
}

/**
 * Fetch published articles (where status = 'published' AND published_at <= NOW()) from MySQL `articles` table.
 * Strictly excludes drafts (SEC-008 / FR-5.3).
 */
export async function fetchPublishedArticlesFromDb(
  categorySlug?: string,
  searchQuery?: string,
): Promise<ArticlePublicData[]> {
  const pool = getDbPool()
  if (!pool) {
    return getPublishedArticles(categorySlug, searchQuery)
  }
  try {
    const [countRows] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) AS cnt FROM `articles`')
    if (Number(countRows[0]?.cnt ?? 0) === 0) {
      return getPublishedArticles(categorySlug, searchQuery)
    }

    const params: unknown[] = []
    let sql =
      "SELECT * FROM `articles` WHERE `status` = 'published' AND `published_at` <= UTC_TIMESTAMP()"

    if (categorySlug) {
      sql += ' AND `category_slug` = ?'
      params.push(categorySlug)
    }
    if (searchQuery && searchQuery.trim().length > 0) {
      const likeTerm = `%${searchQuery.trim()}%`
      sql +=
        ' AND (`title` LIKE ? OR `excerpt` LIKE ? OR `category_name` LIKE ? OR `body_html` LIKE ?)'
      params.push(likeTerm, likeTerm, likeTerm, likeTerm)
    }

    sql += ' ORDER BY `published_at` DESC'

    const [rows] = await pool.query<RowDataPacket[]>(sql, params)
    return rows.map(mapRowToArticle)
  } catch {
    return getPublishedArticles(categorySlug, searchQuery)
  }
}

export async function fetchPublishedArticleBySlugFromDb(
  slug: string,
): Promise<ArticlePublicData | null> {
  const pool = getDbPool()
  if (!pool) {
    return getPublishedArticleBySlug(slug)
  }
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM `articles` WHERE `slug` = ? AND `status` = 'published' AND `published_at` <= UTC_TIMESTAMP() LIMIT 1",
      [slug],
    )
    if (rows[0]) {
      return mapRowToArticle(rows[0])
    }
    const [countRows] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) AS cnt FROM `articles`')
    if (Number(countRows[0]?.cnt ?? 0) === 0) {
      return getPublishedArticleBySlug(slug)
    }
    return null
  } catch {
    return getPublishedArticleBySlug(slug)
  }
}

/**
 * Fetch curated Instagram items from MySQL `instagram_gallery` table with fallback to INITIAL_INSTAGRAM_GALLERY.
 */
export async function fetchInstagramGalleryFromDb(): Promise<InstagramGalleryItem[]> {
  const pool = getDbPool()
  if (!pool) {
    return getInstagramGalleryItems()
  }
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM `instagram_gallery` WHERE `is_published` = 1 ORDER BY `display_order` ASC',
    )
    if (rows.length === 0) {
      return getInstagramGalleryItems()
    }
    return rows.map((r) => ({
      id: String(r.id),
      imageUrl: String(r.image_url || ''),
      alt: String(r.alt_text || ''),
      category: String(r.category || 'Publikasi Resmi'),
      caption: String(r.caption || ''),
      publishedDate: String(r.published_date || 'Instagram Live'),
      permalink: String(r.permalink || ''),
      displayOrder: Number(r.display_order) || 1,
      isPublished: Boolean(r.is_published),
    }))
  } catch {
    return getInstagramGalleryItems()
  }
}
