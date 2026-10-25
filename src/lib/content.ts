import teamSeed from '../../content/team.json'
import practiceAreasSeed from '../../content/practice_areas.json'
import caseRecordsSeed from '../../content/case_records.json'
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
}

export interface PublicCaseRecord {
  id: string
  caseType: string
  region: string
  displayMode: 'anonymous' | 'named'
  clientName?: string
  displayOrder: number
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
      'Pelindungan hukum atas merek, hak cipta, paten, desain industri, rahasia dagang, serta penyelesaian sengketa kekayaan intelektual.',
    description: 'Pelindungan Kekayaan Intelektual & Perjanjian Lisensi',
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
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3966.5292868019124!2d106.83606777579133!3d-6.193674693793977!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e69f43b67eb123b%3A0x6b4fbfe311e92067!2sGedung%20Mandira!5e0!3m2!1sid!2sid!4v1715000000000!5m2!1sid!2sid',
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
    id: 'ig-1',
    imageUrl: '/images/practice-corporate.webp',
    alt: 'Edukasi Hukum Korporasi & Kontrak Komersial — Ferdinan Silalahi dan Rekan Law Firm',
    category: 'Edukasi Korporasi',
    caption:
      'Pentingnya perumusan klausul penyelesaian sengketa dan keadaan kahar (force majeure) dalam perjanjian kerja sama komersial.',
    publishedDate: '14 Okt 2026',
    permalink: 'https://instagram.com/fhspartners',
    displayOrder: 1,
    isPublished: true,
  },
  {
    id: 'ig-2',
    imageUrl: '/images/article-land.webp',
    alt: 'Edukasi Uji Tuntas Pertanahan & Agraria — Ferdinan Silalahi dan Rekan Law Firm',
    category: 'Agraria & Properti',
    caption:
      'Tahapan uji tuntas hukum (legal due diligence) sebelum transaksi aset properti guna memitigasi risiko sengketa alas hak.',
    publishedDate: '10 Okt 2026',
    permalink: 'https://instagram.com/fhspartners',
    displayOrder: 2,
    isPublished: true,
  },
  {
    id: 'ig-3',
    imageUrl: '/images/hero-slide-courtroom.webp',
    alt: 'Pendampingan Litigasi & Persidangan — Ferdinan Silalahi dan Rekan Law Firm',
    category: 'Litigasi & Advokasi',
    caption:
      'Komitmen pendampingan hukum yang berintegritas pada setiap tahapan pemeriksaan hingga persidangan.',
    publishedDate: '05 Okt 2026',
    permalink: 'https://instagram.com/fhspartners',
    displayOrder: 3,
    isPublished: true,
  },
  {
    id: 'ig-4',
    imageUrl: '/images/practice-bankruptcy.webp',
    alt: 'Kajian Hukum Kepailitan & PKPU — Ferdinan Silalahi dan Rekan Law Firm',
    category: 'Kepailitan & PKPU',
    caption:
      'Memahami mekanisme restrukturisasi utang dan proposal perdamaian melalui proses PKPU di Pengadilan Niaga.',
    publishedDate: '29 Sep 2026',
    permalink: 'https://instagram.com/fhspartners',
    displayOrder: 4,
    isPublished: true,
  },
  {
    id: 'ig-5',
    imageUrl: '/images/practice-ip.webp',
    alt: 'Pelindungan Hak Kekayaan Intelektual — Ferdinan Silalahi dan Rekan Law Firm',
    category: 'Kekayaan Intelektual',
    caption:
      'Langkah strategis pelindungan merek dagang, hak cipta, dan penyusunan perjanjian lisensi bagi pelaku usaha.',
    publishedDate: '22 Sep 2026',
    permalink: 'https://instagram.com/fhspartners',
    displayOrder: 5,
    isPublished: true,
  },
  {
    id: 'ig-6',
    imageUrl: '/images/article-family.webp',
    alt: 'Edukasi Hukum Perdata & Keluarga — Ferdinan Silalahi dan Rekan Law Firm',
    category: 'Hukum Perdata',
    caption:
      'Penataan dokumen kepemilikan aset dan perjanjian perkawinan sesuai ketentuan peraturan perundang-undangan.',
    publishedDate: '15 Sep 2026',
    permalink: 'https://instagram.com/fhspartners',
    displayOrder: 6,
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

  const pub: PublicCaseRecord = {
    id: record.id,
    caseType: record.caseType,
    region: record.region,
    displayMode: allowNamed ? 'named' : 'anonymous',
    displayOrder: record.displayOrder,
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

export function getPublishedArticles(
  categorySlug?: string,
  searchQuery?: string,
): ArticlePublicData[] {
  const nowIso = new Date().toISOString()
  const q = searchQuery?.trim().toLowerCase() ?? ''
  return INITIAL_ARTICLES.filter((a) => {
    if (a.status !== 'published' || a.publishedAt > nowIso) return false
    if (categorySlug && a.category.slug !== categorySlug) return false
    if (q) {
      const haystack = `${a.title} ${a.excerpt} ${a.category.name} ${a.bodyHtml}`.toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  }).sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))
}

export function getPublishedArticleBySlug(slug: string): ArticlePublicData | null {
  const nowIso = new Date().toISOString()
  const found = INITIAL_ARTICLES.find(
    (a) => a.slug === slug && a.status === 'published' && a.publishedAt <= nowIso,
  )
  return found ?? null
}
