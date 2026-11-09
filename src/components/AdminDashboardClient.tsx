'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

interface AdminUserSession {
  id: string
  name: string
  email: string
  role: 'admin' | 'editor'
  mfaEnabled: boolean
  mustChangePassword: boolean
  csrfToken: string
}

interface AdminArticleItem {
  id: string
  slug: string
  title: string
  excerpt: string
  bodyHtml: string
  coverImage: { url: string; alt: string }
  category: { slug: string; name: string }
  authorName: string
  status: 'draft' | 'published'
  publishedAt: string
  seoTitle: string
  seoDescription: string
}

interface AdminCategoryItem {
  id: string
  slug: string
  name: string
  description: string
}

interface AdminPracticeAreaItem {
  id: string
  slug: string
  name: string
  label: string
  summary: string
  description: string
  advocacyScope: string[]
  image: string
  displayOrder: number
  isPublished: boolean
}

interface AdminTeamMemberItem {
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
  photo: { url: string; alt: string }
  displayOrder: number
  isPublished: boolean
}

interface AdminCaseRecordItem {
  id: string
  caseType: string
  region: string
  displayMode: 'anonymous' | 'named'
  clientName?: string | null
  consentRef?: string | null
  imageUrl?: string
  imageAlt?: string
  displayOrder: number
  isPublished?: boolean
}

interface AdminInquiryItem {
  id: string
  name: string
  email: string
  phone: string
  practiceAreaId: string
  preferredDate: string
  sessionSlot: string
  method: string
  summary: string
  status: 'baru' | 'dihubungi' | 'selesai' | 'spam'
  internalNotes: string
  emailFailed: boolean
  createdAt: string
}

interface AdminMediaItem {
  id: string
  filename: string
  originalName: string
  mimeType: string
  sizeBytes: number
  altText: string
  url: string
  createdAt: string
}

interface AdminAuditItem {
  id: string
  actor: string
  action: string
  collectionName: string
  targetId: string
  detail: string
  createdAt: string
}

type AdminTab =
  | 'dashboard'
  | 'articles'
  | 'categories'
  | 'inquiries'
  | 'team'
  | 'practices'
  | 'cases'
  | 'media'
  | 'settings'
  | 'security'

export function AdminDashboardClient() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<AdminUserSession | null>(null)
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard')
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  // Login form state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // First-login password change state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  // CMS data state
  const [dbConnected, setDbConnected] = useState(false)
  const [articles, setArticles] = useState<AdminArticleItem[]>([])
  const [categories, setCategories] = useState<AdminCategoryItem[]>([])
  const [practiceAreas, setPracticeAreas] = useState<AdminPracticeAreaItem[]>([])
  const [teamMembers, setTeamMembers] = useState<AdminTeamMemberItem[]>([])
  const [caseRecords, setCaseRecords] = useState<AdminCaseRecordItem[]>([])
  const [inquiries, setInquiries] = useState<AdminInquiryItem[]>([])
  const [mediaAssets, setMediaAssets] = useState<AdminMediaItem[]>([])
  const [auditLogs, setAuditLogs] = useState<AdminAuditItem[]>([])

  // Site settings form state
  const [firmName, setFirmName] = useState('Ferdinan Silalahi dan Rekan Law Firm')
  const [shortBrandName, setShortBrandName] = useState('FS dan Rekan')
  const [address, setAddress] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('62811830991')
  const [whatsappDisplay, setWhatsappDisplay] = useState('+62 811-830-991')
  const [defaultWaMessage, setDefaultWaMessage] = useState('')
  const [inquiryRecipientEmail, setInquiryRecipientEmail] = useState('konsultasi@fsdanrekan.com')
  const [instagramUrl, setInstagramUrl] = useState('https://instagram.com/fhspartners')
  const [officeHoursPagi, setOfficeHoursPagi] = useState('Pagi (09.30 – 12.00 WIB)')
  const [officeHoursSiang, setOfficeHoursSiang] = useState('Siang (13.30 – 15.30 WIB)')
  const [officeHoursSore, setOfficeHoursSore] = useState('Sore (16.00 – 18.00 WIB)')

  // Article editor form state
  const [artId, setArtId] = useState('')
  const [artSlug, setArtSlug] = useState('')
  const [artTitle, setArtTitle] = useState('')
  const [artExcerpt, setArtExcerpt] = useState('')
  const [artBodyHtml, setArtBodyHtml] = useState('<p></p>')
  const [artCoverUrl, setArtCoverUrl] = useState('/images/practice-corporate.webp')
  const [artCategorySlug, setArtCategorySlug] = useState('hukum-korporasi')
  const [artStatus, setArtStatus] = useState<'draft' | 'published'>('draft')
  const [artSeoTitle, setArtSeoTitle] = useState('')
  const [artSeoDesc, setArtSeoDesc] = useState('')

  // Category form state
  const [catName, setCatName] = useState('')
  const [catDesc, setCatDesc] = useState('')

  // Team editor form state
  const [teamId, setTeamId] = useState('')
  const [teamSlug, setTeamSlug] = useState('')
  const [teamFullName, setTeamFullName] = useState('')
  const [teamHonorific, setTeamHonorific] = useState('')
  const [teamRoleTitle, setTeamRoleTitle] = useState('Associate')
  const [teamGroup, setTeamGroup] = useState('Associate')
  const [teamMotto, setTeamMotto] = useState('')
  const [teamShortBio, setTeamShortBio] = useState('')
  const [teamFullBio, setTeamFullBio] = useState('')
  const [teamPhotoUrl, setTeamPhotoUrl] = useState('/team/ferdinan-hasiholan-silalahi.webp')
  const [teamOrder, setTeamOrder] = useState(1)

  // Practice area editor form state
  const [paId, setPaId] = useState('')
  const [paSlug, setPaSlug] = useState('')
  const [paName, setPaName] = useState('')
  const [paLabel, setPaLabel] = useState('BISNIS')
  const [paSummary, setPaSummary] = useState('')
  const [paDescription, setPaDescription] = useState('')
  const [paScopeText, setPaScopeText] = useState('')
  const [paImage, setPaImage] = useState('/images/practice-corporate.webp')
  const [paOrder, setPaOrder] = useState(1)

  // Case record editor form state
  const [caseId, setCaseId] = useState('')
  const [caseType, setCaseType] = useState('')
  const [caseRegion, setCaseRegion] = useState('')
  const [caseMode, setCaseMode] = useState<'anonymous' | 'named'>('anonymous')
  const [caseClientName, setCaseClientName] = useState('')
  const [caseConsentRef, setCaseConsentRef] = useState('')
  const [caseImageUrl, setCaseImageUrl] = useState('/images/hero-slide-courtroom.webp')
  const [caseOrder, setCaseOrder] = useState(1)

  // Media upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadAlt, setUploadAlt] = useState('')

  // New user form state
  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPass, setNewUserPass] = useState('')
  const [newUserRole, setNewUserRole] = useState<'admin' | 'editor'>('editor')

  const loadDashboardData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/cms', { cache: 'no-store' })
      if (res.status === 401) {
        setUser(null)
        return
      }
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setFeedback({ type: 'err', text: data.error || 'Gagal memuat data CMS.' })
        return
      }
      setUser(data.user)
      setDbConnected(Boolean(data.dbHealth?.connected))
      setArticles(data.articles || [])
      setCategories(data.categories || [])
      setPracticeAreas(data.practiceAreas || [])
      setTeamMembers(data.teamMembers || [])
      setCaseRecords(data.caseRecords || [])
      setInquiries(data.inquiries || [])
      setMediaAssets(data.mediaAssets || [])
      setAuditLogs(data.auditLogs || [])

      if (data.siteSettings) {
        setFirmName(data.siteSettings.firmName || '')
        setShortBrandName(data.siteSettings.shortBrandName || '')
        setAddress(data.siteSettings.address || '')
        setWhatsappNumber(data.siteSettings.whatsappNumber || '')
        setWhatsappDisplay(data.siteSettings.whatsappDisplay || '')
        setDefaultWaMessage(data.siteSettings.defaultWaMessage || '')
        setInquiryRecipientEmail(data.siteSettings.inquiryRecipientEmail || '')
        setInstagramUrl(data.siteSettings.instagramUrl || '')
        setOfficeHoursPagi(data.siteSettings.officeHours?.pagi || '')
        setOfficeHoursSiang(data.siteSettings.officeHours?.siang || '')
        setOfficeHoursSore(data.siteSettings.officeHours?.sore || '')
      }
    } catch {
      setFeedback({ type: 'err', text: 'Gagal menghubungi server admin.' })
    }
  }, [])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await fetch('/api/admin/auth', { cache: 'no-store' })
        const data = await res.json()
        if (active && data.authenticated && data.user) {
          setUser(data.user)
          await loadDashboardData()
        }
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [loadDashboardData])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          email: loginEmail,
          password: loginPassword,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFeedback({ type: 'err', text: data.error || 'Gagal masuk.' })
        return
      }
      setUser(data.user)
      setLoginPassword('')
      await loadDashboardData()
    } finally {
      setBusy(false)
    }
  }

  async function handleLogout() {
    setBusy(true)
    try {
      await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      })
      setUser(null)
    } finally {
      setBusy(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setBusy(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': user.csrfToken,
        },
        body: JSON.stringify({
          action: 'change_password',
          currentPassword,
          newPassword,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFeedback({ type: 'err', text: data.error || 'Gagal mengganti kata sandi.' })
        return
      }
      setUser(data.user)
      setCurrentPassword('')
      setNewPassword('')
      setFeedback({ type: 'ok', text: 'Kata sandi berhasil diperbarui.' })
      await loadDashboardData()
    } finally {
      setBusy(false)
    }
  }

  async function postCmsMutation(payload: Record<string, unknown>, successMsg: string) {
    if (!user) return false
    setBusy(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/admin/cms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': user.csrfToken,
        },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setFeedback({ type: 'err', text: data.error || 'Operasi gagal.' })
        return false
      }
      setFeedback({
        type: 'ok',
        text: data.warning ? `${successMsg} (${data.warning})` : successMsg,
      })
      await loadDashboardData()
      return true
    } finally {
      setBusy(false)
    }
  }

  async function handleUploadImage(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !uploadFile) return
    setBusy(true)
    setFeedback(null)
    try {
      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('altText', uploadAlt)

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: {
          'x-csrf-token': user.csrfToken,
        },
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        setFeedback({ type: 'err', text: data.error || 'Gagal mengunggah gambar.' })
        return
      }
      setUploadFile(null)
      setUploadAlt('')
      setFeedback({
        type: 'ok',
        text: `Gambar berhasil diunggah ke ${data.asset.url}`,
      })
      await loadDashboardData()
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="cred-box" style={{ marginTop: '32px' }}>
        <div className="cred-title">Memuat Panel Admin CMS...</div>
      </div>
    )
  }

  // 1. Login View
  if (!user) {
    return (
      <div className="docket-panel-form" style={{ maxWidth: '520px', marginTop: '32px' }}>
        <h2>Masuk ke Panel Admin CMS</h2>
        <p className="trust-stat-desc" style={{ marginBottom: '20px' }}>
          Gunakan akun Administrator atau Editor resmi Ferdinan Silalahi dan Rekan Law Firm.
        </p>

        {feedback ? (
          <div className="cred-box" style={{ marginBottom: '16px' }} role="alert">
            <div className="cred-title">
              {feedback.type === 'err' ? 'Peringatan Keamanan' : 'Informasi'}
            </div>
            <div className="cred-desc">{feedback.text}</div>
          </div>
        ) : null}

        <form onSubmit={handleLogin}>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label htmlFor="adminLoginEmail" className="form-label">
              Alamat Email Resmi
            </label>
            <input
              id="adminLoginEmail"
              type="email"
              required
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              className="form-input"
              placeholder="admin@fsdanrekan.com"
              autoComplete="username"
            />
          </div>
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label htmlFor="adminLoginPassword" className="form-label">
              Kata Sandi
            </label>
            <input
              id="adminLoginPassword"
              type="password"
              required
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="form-input"
              placeholder="Minimal 12 karakter"
              autoComplete="current-password"
            />
          </div>
          <div className="hero-actions-row">
            <button type="submit" className="btn-gold" disabled={busy}>
              {busy ? 'Memverifikasi...' : 'Masuk ke Panel Admin'}
            </button>
            <Link href="/" className="btn-outline">
              &larr; Kembali ke Beranda
            </Link>
          </div>
        </form>
      </div>
    )
  }

  // 2. Mandatory First-Login Password Change View (Requirement 7)
  if (user.mustChangePassword) {
    return (
      <div className="docket-panel-form" style={{ maxWidth: '580px', marginTop: '32px' }}>
        <div className="eyebrow-tag">KEAMANAN AKUN WAJIB (SEC-001)</div>
        <h2>Wajib Ganti Kata Sandi Awal</h2>
        <p className="trust-stat-desc" style={{ marginBottom: '20px' }}>
          Anda masuk menggunakan kata sandi inisialisasi awal. Demi keamanan firma, Anda wajib
          mengganti kata sandi sebelum dapat mengelola konten situs.
        </p>

        {feedback ? (
          <div className="cred-box" style={{ marginBottom: '16px' }} role="alert">
            <div className="cred-title">{feedback.type === 'err' ? 'Gagal' : 'Berhasil'}</div>
            <div className="cred-desc">{feedback.text}</div>
          </div>
        ) : null}

        <form onSubmit={handleChangePassword}>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label htmlFor="currentAdminPass" className="form-label">
              Kata Sandi Saat Ini
            </label>
            <input
              id="currentAdminPass"
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="form-input"
            />
          </div>
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label htmlFor="newAdminPass" className="form-label">
              Kata Sandi Baru (Min. 12 karakter, huruf besar, huruf kecil, dan angka)
            </label>
            <input
              id="newAdminPass"
              type="password"
              required
              minLength={12}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="form-input"
            />
          </div>
          <div className="hero-actions-row">
            <button type="submit" className="btn-gold" disabled={busy}>
              {busy ? 'Menyimpan...' : 'Simpan Kata Sandi Baru'}
            </button>
            <button type="button" onClick={handleLogout} className="btn-outline" disabled={busy}>
              Keluar
            </button>
          </div>
        </form>
      </div>
    )
  }

  // 3. Full Authenticated Dashboard View
  return (
    <div style={{ marginTop: '28px' }}>
      <div
        className="cred-box"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <div className="cred-title">
            Masuk sebagai: {user.name} ({user.email}) — Peran: {user.role.toUpperCase()}
          </div>
          <div className="cred-desc">
            Status Database MySQL/MariaDB:{' '}
            <strong>{dbConnected ? 'Terhubung (Aktif)' : 'Mode Fallback Seed JSON'}</strong>
          </div>
        </div>
        <div className="hero-actions-row" style={{ marginTop: 0 }}>
          <Link href="/" className="btn-outline">
            Lihat Situs Publik
          </Link>
          <button type="button" onClick={handleLogout} className="btn-outline" disabled={busy}>
            Keluar (Logout)
          </button>
        </div>
      </div>

      {feedback ? (
        <div className="cred-box" style={{ marginBottom: '20px' }} role="status">
          <div className="cred-title">
            {feedback.type === 'err' ? 'Peringatan' : 'Berhasil Disimpan'}
          </div>
          <div className="cred-desc">{feedback.text}</div>
        </div>
      ) : null}

      {/* Navigation Tabs */}
      <nav aria-label="Modul Panel Admin" className="bio-tags-row" style={{ marginBottom: '28px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={activeTab === 'dashboard' ? 'btn-gold' : 'btn-outline'}
        >
          1. Ringkasan
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('articles')}
          className={activeTab === 'articles' ? 'btn-gold' : 'btn-outline'}
        >
          2. Artikel ({articles.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('categories')}
          className={activeTab === 'categories' ? 'btn-gold' : 'btn-outline'}
        >
          3. Kategori ({categories.length})
        </button>
        {user.role === 'admin' ? (
          <>
            <button
              type="button"
              onClick={() => setActiveTab('inquiries')}
              className={activeTab === 'inquiries' ? 'btn-gold' : 'btn-outline'}
            >
              4. Janji Temu ({inquiries.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('team')}
              className={activeTab === 'team' ? 'btn-gold' : 'btn-outline'}
            >
              5. Tim ({teamMembers.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('practices')}
              className={activeTab === 'practices' ? 'btn-gold' : 'btn-outline'}
            >
              6. Layanan ({practiceAreas.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('cases')}
              className={activeTab === 'cases' ? 'btn-gold' : 'btn-outline'}
            >
              7. Rekam Jejak ({caseRecords.length})
            </button>
          </>
        ) : null}
        <button
          type="button"
          onClick={() => setActiveTab('media')}
          className={activeTab === 'media' ? 'btn-gold' : 'btn-outline'}
        >
          8. Media &amp; Upload
        </button>
        {user.role === 'admin' ? (
          <>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={activeTab === 'settings' ? 'btn-gold' : 'btn-outline'}
            >
              9. Pengaturan Situs
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={activeTab === 'security' ? 'btn-gold' : 'btn-outline'}
            >
              10. Pengguna &amp; Audit
            </button>
          </>
        ) : null}
      </nav>

      {/* TAB 1: DASHBOARD */}
      {activeTab === 'dashboard' ? (
        <div className="credentials-spec-grid">
          <div className="cred-box">
            <div className="cred-title">Artikel Terbit / Draf</div>
            <div className="cred-desc">
              {articles.filter((a) => a.status === 'published').length} Terbit &middot;{' '}
              {articles.filter((a) => a.status === 'draft').length} Draf
            </div>
          </div>
          <div className="cred-box">
            <div className="cred-title">Permohonan Janji Temu</div>
            <div className="cred-desc">
              {inquiries.filter((i) => i.status === 'baru').length} Baru &middot;{' '}
              {inquiries.filter((i) => i.emailFailed).length} Gagal Notifikasi Email
            </div>
          </div>
          <div className="cred-box">
            <div className="cred-title">Profil Tim &amp; Bidang Praktik</div>
            <div className="cred-desc">
              {teamMembers.length} Anggota Tim &middot; {practiceAreas.length} Bidang Layanan
            </div>
          </div>
          {user.role === 'admin' ? (
            <div className="cred-box">
              <div className="cred-title">Sinkronisasi Database MySQL</div>
              <div className="cred-desc" style={{ marginBottom: '12px' }}>
                Impor ulang data awal dari berkas seed JSON ke tabel MySQL secara idempoten.
              </div>
              <button
                type="button"
                className="btn-gold"
                disabled={busy}
                onClick={() =>
                  postCmsMutation(
                    { module: 'system', action: 'migrate_seed' },
                    'Sinkronisasi seed ke database MySQL berhasil dijalankan.',
                  )
                }
              >
                Jalankan Migrasi Seed ke MySQL
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* TAB 2: ARTICLES */}
      {activeTab === 'articles' ? (
        <div className="docket-booking-grid">
          <div className="docket-panel-form">
            <h2>{artId ? 'Edit Artikel Hukum' : 'Tulis Artikel Hukum Baru'}</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                const selectedCat = categories.find((c) => c.slug === artCategorySlug)
                const ok = await postCmsMutation(
                  {
                    module: 'article',
                    action: 'upsert',
                    id: artId || undefined,
                    slug: artSlug || undefined,
                    title: artTitle,
                    excerpt: artExcerpt,
                    bodyHtml: artBodyHtml,
                    coverUrl: artCoverUrl,
                    categorySlug: artCategorySlug,
                    categoryName: selectedCat?.name || 'Hukum Korporasi & Bisnis',
                    status: artStatus,
                    seoTitle: artSeoTitle || artTitle,
                    seoDescription: artSeoDesc || artExcerpt.slice(0, 155),
                  },
                  'Artikel berhasil disimpan ke database.',
                )
                if (ok) {
                  setArtId('')
                  setArtSlug('')
                  setArtTitle('')
                  setArtExcerpt('')
                  setArtBodyHtml('<p></p>')
                }
              }}
            >
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label htmlFor="artTitleInput" className="form-label">
                  Judul Artikel
                </label>
                <input
                  id="artTitleInput"
                  type="text"
                  required
                  value={artTitle}
                  onChange={(e) => setArtTitle(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label htmlFor="artSlugInput" className="form-label">
                  Slug URL (Kosongkan untuk otomatis)
                </label>
                <input
                  id="artSlugInput"
                  type="text"
                  value={artSlug}
                  onChange={(e) => setArtSlug(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label htmlFor="artCatSelect" className="form-label">
                  Kategori
                </label>
                <select
                  id="artCatSelect"
                  value={artCategorySlug}
                  onChange={(e) => setArtCategorySlug(e.target.value)}
                  className="form-input"
                >
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label htmlFor="artStatusSelect" className="form-label">
                  Status Publikasi
                </label>
                <select
                  id="artStatusSelect"
                  value={artStatus}
                  onChange={(e) =>
                    setArtStatus(e.target.value === 'published' ? 'published' : 'draft')
                  }
                  className="form-input"
                >
                  <option value="draft">Draf (Tidak tampil di publik)</option>
                  <option value="published">Terbit (Tampil di publik)</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label htmlFor="artCoverInput" className="form-label">
                  URL Gambar Sampul
                </label>
                <input
                  id="artCoverInput"
                  type="text"
                  required
                  value={artCoverUrl}
                  onChange={(e) => setArtCoverUrl(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label htmlFor="artExcerptInput" className="form-label">
                  Ringkasan Singkat (Excerpt)
                </label>
                <textarea
                  id="artExcerptInput"
                  rows={3}
                  required
                  value={artExcerpt}
                  onChange={(e) => setArtExcerpt(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label htmlFor="artBodyInput" className="form-label">
                  Isi Artikel (HTML — otomatis disanitasi terhadap XSS)
                </label>
                <textarea
                  id="artBodyInput"
                  rows={7}
                  required
                  value={artBodyHtml}
                  onChange={(e) => setArtBodyHtml(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label htmlFor="artSeoTitleInput" className="form-label">
                  SEO Title ({artSeoTitle.length}/60 karakter)
                </label>
                <input
                  id="artSeoTitleInput"
                  type="text"
                  maxLength={160}
                  value={artSeoTitle}
                  onChange={(e) => setArtSeoTitle(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label htmlFor="artSeoDescInput" className="form-label">
                  SEO Description ({artSeoDesc.length}/155 karakter)
                </label>
                <textarea
                  id="artSeoDescInput"
                  rows={2}
                  maxLength={320}
                  value={artSeoDesc}
                  onChange={(e) => setArtSeoDesc(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="hero-actions-row">
                <button type="submit" className="btn-gold" disabled={busy}>
                  Simpan Artikel
                </button>
                {artId ? (
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => {
                      setArtId('')
                      setArtSlug('')
                      setArtTitle('')
                      setArtExcerpt('')
                      setArtBodyHtml('<p></p>')
                    }}
                  >
                    Batal Edit
                  </button>
                ) : null}
              </div>
            </form>
          </div>

          <div className="docket-info-card">
            <h3>Daftar Artikel ({articles.length})</h3>
            <div className="stacked-articles-column" style={{ marginTop: '16px' }}>
              {articles.map((art) => (
                <div key={art.id} className="cred-box">
                  <div className="cred-title">
                    [{art.status.toUpperCase()}] {art.title}
                  </div>
                  <div className="cred-desc">
                    Slug: <code>/artikel/{art.slug}</code> &middot; Kategori: {art.category.name}
                  </div>
                  <div className="hero-actions-row" style={{ marginTop: '10px' }}>
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => {
                        setArtId(art.id)
                        setArtSlug(art.slug)
                        setArtTitle(art.title)
                        setArtExcerpt(art.excerpt)
                        setArtBodyHtml(art.bodyHtml)
                        setArtCoverUrl(art.coverImage.url)
                        setArtCategorySlug(art.category.slug)
                        setArtStatus(art.status)
                        setArtSeoTitle(art.seoTitle)
                        setArtSeoDesc(art.seoDescription)
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() =>
                        postCmsMutation(
                          { module: 'article', action: 'delete', id: art.id },
                          'Artikel dihapus.',
                        )
                      }
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* TAB 3: CATEGORIES */}
      {activeTab === 'categories' ? (
        <div className="docket-booking-grid">
          <div className="docket-panel-form">
            <h2>Tambah Kategori Artikel</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                const ok = await postCmsMutation(
                  {
                    module: 'category',
                    action: 'upsert',
                    name: catName,
                    description: catDesc,
                  },
                  'Kategori berhasil disimpan.',
                )
                if (ok) {
                  setCatName('')
                  setCatDesc('')
                }
              }}
            >
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label htmlFor="catNameInput" className="form-label">
                  Nama Kategori
                </label>
                <input
                  id="catNameInput"
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label htmlFor="catDescInput" className="form-label">
                  Deskripsi
                </label>
                <input
                  id="catDescInput"
                  type="text"
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  className="form-input"
                />
              </div>
              <button type="submit" className="btn-gold" disabled={busy}>
                Simpan Kategori
              </button>
            </form>
          </div>

          <div className="docket-info-card">
            <h3>Daftar Kategori ({categories.length})</h3>
            <div className="stacked-articles-column" style={{ marginTop: '16px' }}>
              {categories.map((c) => (
                <div key={c.id} className="cred-box">
                  <div className="cred-title">{c.name}</div>
                  <div className="cred-desc">Slug: {c.slug}</div>
                  <div className="hero-actions-row" style={{ marginTop: '8px' }}>
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() =>
                        postCmsMutation(
                          { module: 'category', action: 'delete', id: c.id, slug: c.slug },
                          'Kategori berhasil dihapus.',
                        )
                      }
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* TAB 4: INQUIRIES */}
      {activeTab === 'inquiries' && user.role === 'admin' ? (
        <div className="stacked-articles-column">
          <h2>Daftar Permohonan Janji Temu Konsultasi ({inquiries.length})</h2>
          {inquiries.length === 0 ? (
            <div className="cred-box">
              <div className="cred-title">Belum Ada Permohonan Masuk</div>
              <div className="cred-desc">
                Setiap kiriman formulir konsultasi akan langsung tercatat di tabel MySQL{' '}
                <code>inquiries</code>.
              </div>
            </div>
          ) : (
            inquiries.map((inq) => (
              <div key={inq.id} className="cred-box">
                <div className="cred-title">
                  [{inq.status.toUpperCase()}] {inq.name} — {inq.practiceAreaId}
                  {inq.emailFailed ? ' (PERINGATAN: Notifikasi Email Gagal Terkirim)' : ''}
                </div>
                <div className="cred-desc">
                  Jadwal: {inq.preferredDate} ({inq.sessionSlot}, {inq.method}) &middot; Email:{' '}
                  {inq.email} &middot; WA: {inq.phone}
                </div>
                <p style={{ marginTop: '8px', marginBottom: '12px' }}>{inq.summary}</p>
                <div className="hero-actions-row">
                  {(['baru', 'dihubungi', 'selesai', 'spam'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      className={inq.status === st ? 'btn-gold' : 'btn-outline'}
                      onClick={() =>
                        postCmsMutation(
                          {
                            module: 'inquiry',
                            action: 'update',
                            id: inq.id,
                            status: st,
                            internalNotes: inq.internalNotes,
                          },
                          `Status permohonan diperbarui menjadi ${st}.`,
                        )
                      }
                    >
                      Tandai: {st}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() =>
                      postCmsMutation(
                        { module: 'inquiry', action: 'delete', id: inq.id },
                        'Data permohonan dihapus sesuai ketentuan UU PDP.',
                      )
                    }
                  >
                    Hapus Data (UU PDP)
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}

      {/* TAB 5: TEAM MEMBERS */}
      {activeTab === 'team' && user.role === 'admin' ? (
        <div className="docket-booking-grid">
          <div className="docket-panel-form">
            <h2>{teamId ? 'Edit Profil Anggota Tim' : 'Tambah Anggota Tim'}</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                const existing = teamMembers.find((m) => m.id === teamId)
                const ok = await postCmsMutation(
                  {
                    module: 'team_member',
                    action: 'upsert',
                    id: teamId || undefined,
                    slug: teamSlug || undefined,
                    fullName: teamFullName,
                    honorific: teamHonorific,
                    roleTitle: teamRoleTitle,
                    group: teamGroup,
                    motto: teamMotto || null,
                    shortBio: teamShortBio,
                    fullBio: teamFullBio,
                    education: existing?.education || [],
                    credentials: existing?.credentials || [],
                    languages: existing?.languages || ['Indonesia'],
                    tags: existing?.tags || [],
                    photoUrl: teamPhotoUrl,
                    displayOrder: teamOrder,
                    isPublished: true,
                  },
                  'Profil anggota tim berhasil disimpan.',
                )
                if (ok) {
                  setTeamId('')
                  setTeamSlug('')
                  setTeamFullName('')
                  setTeamHonorific('')
                  setTeamShortBio('')
                  setTeamFullBio('')
                }
              }}
            >
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label htmlFor="teamFullNameInput" className="form-label">
                  Nama Lengkap (Tanpa Gelar)
                </label>
                <input
                  id="teamFullNameInput"
                  type="text"
                  required
                  value={teamFullName}
                  onChange={(e) => setTeamFullName(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label htmlFor="teamHonorificInput" className="form-label">
                  Gelar (contoh: S.H., M.H.)
                </label>
                <input
                  id="teamHonorificInput"
                  type="text"
                  value={teamHonorific}
                  onChange={(e) => setTeamHonorific(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label htmlFor="teamRoleInput" className="form-label">
                  Jabatan (Role Title)
                </label>
                <input
                  id="teamRoleInput"
                  type="text"
                  required
                  value={teamRoleTitle}
                  onChange={(e) => setTeamRoleTitle(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label htmlFor="teamPhotoInput" className="form-label">
                  URL Foto (contoh: /team/basit-rezki.webp atau /uploads/...)
                </label>
                <input
                  id="teamPhotoInput"
                  type="text"
                  required
                  value={teamPhotoUrl}
                  onChange={(e) => setTeamPhotoUrl(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label htmlFor="teamOrderInput" className="form-label">
                  Urutan Tampil
                </label>
                <input
                  id="teamOrderInput"
                  type="number"
                  min={1}
                  max={99}
                  value={teamOrder}
                  onChange={(e) => setTeamOrder(Number(e.target.value) || 1)}
                  className="form-input"
                />
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label htmlFor="teamShortBioInput" className="form-label">
                  Bio Singkat Kartu (Maks. 200 karakter — {teamShortBio.length}/200)
                </label>
                <textarea
                  id="teamShortBioInput"
                  rows={2}
                  maxLength={200}
                  required
                  value={teamShortBio}
                  onChange={(e) => setTeamShortBio(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label htmlFor="teamFullBioInput" className="form-label">
                  Bio Lengkap Panel Selengkapnya
                </label>
                <textarea
                  id="teamFullBioInput"
                  rows={6}
                  required
                  value={teamFullBio}
                  onChange={(e) => setTeamFullBio(e.target.value)}
                  className="form-input"
                />
              </div>
              <button type="submit" className="btn-gold" disabled={busy}>
                Simpan Profil Tim
              </button>
            </form>
          </div>

          <div className="docket-info-card">
            <h3>Daftar Anggota Tim ({teamMembers.length})</h3>
            <div className="stacked-articles-column" style={{ marginTop: '16px' }}>
              {teamMembers.map((m) => (
                <div key={m.id} className="cred-box">
                  <div className="cred-title">
                    #{m.displayOrder} {m.displayName}
                  </div>
                  <div className="cred-desc">{m.roleTitle}</div>
                  <div className="hero-actions-row" style={{ marginTop: '8px' }}>
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => {
                        setTeamId(m.id)
                        setTeamSlug(m.slug)
                        setTeamFullName(m.fullName)
                        setTeamHonorific(m.honorific)
                        setTeamRoleTitle(m.roleTitle)
                        setTeamGroup(m.group)
                        setTeamMotto(m.motto || '')
                        setTeamShortBio(m.shortBio)
                        setTeamFullBio(m.fullBio)
                        setTeamPhotoUrl(m.photo.url)
                        setTeamOrder(m.displayOrder)
                      }}
                    >
                      Edit Profil
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* TAB 6: PRACTICE AREAS */}
      {activeTab === 'practices' && user.role === 'admin' ? (
        <div className="docket-booking-grid">
          <div className="docket-panel-form">
            <h2>{paId ? 'Edit Bidang Layanan' : 'Tambah Bidang Layanan'}</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                const scopeItems = paScopeText
                  .split('\n')
                  .map((s) => s.trim())
                  .filter(Boolean)
                const ok = await postCmsMutation(
                  {
                    module: 'practice_area',
                    action: 'upsert',
                    id: paId || undefined,
                    slug: paSlug || undefined,
                    name: paName,
                    label: paLabel,
                    summary: paSummary,
                    description: paDescription,
                    advocacyScope: scopeItems.length > 0 ? scopeItems : [paDescription],
                    image: paImage,
                    displayOrder: paOrder,
                    isPublished: true,
                  },
                  'Bidang layanan berhasil disimpan.',
                )
                if (ok) {
                  setPaId('')
                  setPaSlug('')
                  setPaName('')
                  setPaSummary('')
                  setPaDescription('')
                  setPaScopeText('')
                }
              }}
            >
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label htmlFor="paNameInput" className="form-label">
                  Nama Bidang Layanan
                </label>
                <input
                  id="paNameInput"
                  type="text"
                  required
                  value={paName}
                  onChange={(e) => setPaName(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label htmlFor="paLabelInput" className="form-label">
                  Label Kategori (contoh: BISNIS, PROPERTI)
                </label>
                <input
                  id="paLabelInput"
                  type="text"
                  required
                  value={paLabel}
                  onChange={(e) => setPaLabel(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label htmlFor="paDescInput" className="form-label">
                  Subjudul Deskripsi
                </label>
                <input
                  id="paDescInput"
                  type="text"
                  required
                  value={paDescription}
                  onChange={(e) => setPaDescription(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label htmlFor="paSummaryInput" className="form-label">
                  Ringkasan 1–2 Kalimat
                </label>
                <textarea
                  id="paSummaryInput"
                  rows={3}
                  required
                  value={paSummary}
                  onChange={(e) => setPaSummary(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label htmlFor="paScopeInput" className="form-label">
                  Butir Cakupan Advokasi (Satu butir per baris)
                </label>
                <textarea
                  id="paScopeInput"
                  rows={4}
                  required
                  value={paScopeText}
                  onChange={(e) => setPaScopeText(e.target.value)}
                  className="form-input"
                />
              </div>
              <button type="submit" className="btn-gold" disabled={busy}>
                Simpan Bidang Layanan
              </button>
            </form>
          </div>

          <div className="docket-info-card">
            <h3>10 Bidang Layanan ({practiceAreas.length})</h3>
            <div className="stacked-articles-column" style={{ marginTop: '16px' }}>
              {practiceAreas.map((p) => (
                <div key={p.id} className="cred-box">
                  <div className="cred-title">
                    #{p.displayOrder} [{p.label}] {p.name}
                  </div>
                  <div className="cred-desc">{p.summary}</div>
                  <div className="hero-actions-row" style={{ marginTop: '8px' }}>
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => {
                        setPaId(p.id)
                        setPaSlug(p.slug)
                        setPaName(p.name)
                        setPaLabel(p.label)
                        setPaSummary(p.summary)
                        setPaDescription(p.description)
                        setPaScopeText(p.advocacyScope.join('\n'))
                        setPaImage(p.image)
                        setPaOrder(p.displayOrder)
                      }}
                    >
                      Edit Bidang
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* TAB 7: CASE RECORDS */}
      {activeTab === 'cases' && user.role === 'admin' ? (
        <div className="docket-booking-grid">
          <div className="docket-panel-form">
            <h2>{caseId ? 'Edit Rekam Jejak Perkara' : 'Tambah Rekam Jejak Perkara'}</h2>
            <p className="trust-stat-desc" style={{ marginBottom: '12px' }}>
              Sesuai SK-14, default tampil adalah <code>anonymous</code> (hanya jenis perkara dan
              wilayah).
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                const ok = await postCmsMutation(
                  {
                    module: 'case_record',
                    action: 'upsert',
                    id: caseId || undefined,
                    caseType,
                    region: caseRegion,
                    displayMode: caseMode,
                    clientName: caseMode === 'named' ? caseClientName : null,
                    consentRef: caseMode === 'named' ? caseConsentRef : null,
                    imageUrl: caseImageUrl,
                    displayOrder: caseOrder,
                    isPublished: true,
                  },
                  'Rekam jejak perkara berhasil disimpan.',
                )
                if (ok) {
                  setCaseId('')
                  setCaseType('')
                  setCaseRegion('')
                  setCaseMode('anonymous')
                  setCaseClientName('')
                  setCaseConsentRef('')
                }
              }}
            >
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label htmlFor="caseTypeInput" className="form-label">
                  Jenis Perkara
                </label>
                <input
                  id="caseTypeInput"
                  type="text"
                  required
                  value={caseType}
                  onChange={(e) => setCaseType(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label htmlFor="caseRegionInput" className="form-label">
                  Wilayah Hukum
                </label>
                <input
                  id="caseRegionInput"
                  type="text"
                  required
                  value={caseRegion}
                  onChange={(e) => setCaseRegion(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label htmlFor="caseModeSelect" className="form-label">
                  Mode Tampil Publik (SK-14)
                </label>
                <select
                  id="caseModeSelect"
                  value={caseMode}
                  onChange={(e) =>
                    setCaseMode(e.target.value === 'named' ? 'named' : 'anonymous')
                  }
                  className="form-input"
                >
                  <option value="anonymous">Anonim (Default — Sesuai Kode Etik Advokat)</option>
                  <option value="named">Bernama (Wajib Bukti Persetujuan Tertulis)</option>
                </select>
              </div>
              {caseMode === 'named' ? (
                <>
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label htmlFor="caseClientInput" className="form-label">
                      Nama Klien / Pihak
                    </label>
                    <input
                      id="caseClientInput"
                      type="text"
                      required
                      value={caseClientName}
                      onChange={(e) => setCaseClientName(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label htmlFor="caseConsentInput" className="form-label">
                      Nomor Referensi Surat Persetujuan Klien (consentRef)
                    </label>
                    <input
                      id="caseConsentInput"
                      type="text"
                      required
                      value={caseConsentRef}
                      onChange={(e) => setCaseConsentRef(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </>
              ) : null}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label htmlFor="caseImgInput" className="form-label">
                  URL Foto Dokumentasi
                </label>
                <input
                  id="caseImgInput"
                  type="text"
                  value={caseImageUrl}
                  onChange={(e) => setCaseImageUrl(e.target.value)}
                  className="form-input"
                />
              </div>
              <button type="submit" className="btn-gold" disabled={busy}>
                Simpan Rekam Jejak
              </button>
            </form>
          </div>

          <div className="docket-info-card">
            <h3>Daftar Rekam Jejak ({caseRecords.length})</h3>
            <div className="stacked-articles-column" style={{ marginTop: '16px' }}>
              {caseRecords.map((c) => (
                <div key={c.id} className="cred-box">
                  <div className="cred-title">
                    #{c.displayOrder} {c.caseType}
                  </div>
                  <div className="cred-desc">
                    Wilayah: {c.region} &middot; Mode: {c.displayMode}
                  </div>
                  <div className="hero-actions-row" style={{ marginTop: '8px' }}>
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => {
                        setCaseId(c.id)
                        setCaseType(c.caseType)
                        setCaseRegion(c.region)
                        setCaseMode(c.displayMode)
                        setCaseClientName(c.clientName || '')
                        setCaseConsentRef(c.consentRef || '')
                        setCaseImageUrl(c.imageUrl || '/images/hero-slide-courtroom.webp')
                        setCaseOrder(c.displayOrder)
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() =>
                        postCmsMutation(
                          { module: 'case_record', action: 'delete', id: c.id },
                          'Rekam jejak dihapus.',
                        )
                      }
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* TAB 8: MEDIA & UPLOAD */}
      {activeTab === 'media' ? (
        <div className="docket-booking-grid">
          <div className="docket-panel-form">
            <h2>Unggah Gambar Baru (JPEG, PNG, WebP — Maks. 5 MB)</h2>
            <p className="trust-stat-desc" style={{ marginBottom: '16px' }}>
              File disimpan di folder persisten <code>UPLOAD_DIR</code> di luar folder build dan
              disajikan melalui route <code>/uploads/...</code> (SVG ditolak sesuai SEC-013).
            </p>
            <form onSubmit={handleUploadImage}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label htmlFor="mediaFileInput" className="form-label">
                  Pilih Berkas Gambar
                </label>
                <input
                  id="mediaFileInput"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  required
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="form-input"
                />
              </div>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label htmlFor="mediaAltInput" className="form-label">
                  Teks Alternatif (Alt Text Aksesibilitas)
                </label>
                <input
                  id="mediaAltInput"
                  type="text"
                  required
                  value={uploadAlt}
                  onChange={(e) => setUploadAlt(e.target.value)}
                  className="form-input"
                  placeholder="Contoh: Dokumentasi persidangan tim advokat FS dan Rekan"
                />
              </div>
              <button type="submit" className="btn-gold" disabled={busy || !uploadFile}>
                {busy ? 'Mengunggah...' : 'Unggah Gambar'}
              </button>
            </form>
          </div>

          <div className="docket-info-card">
            <h3>Pustaka Media Terunggah ({mediaAssets.length})</h3>
            <div className="stacked-articles-column" style={{ marginTop: '16px' }}>
              {mediaAssets.map((m) => (
                <div key={m.id} className="cred-box">
                  <div className="cred-title">{m.originalName}</div>
                  <div className="cred-desc">
                    URL: <code>{m.url}</code> ({Math.round(m.sizeBytes / 1024)} KB)
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* TAB 9: SITE SETTINGS */}
      {activeTab === 'settings' && user.role === 'admin' ? (
        <div className="docket-panel-form">
          <h2>Pengaturan Situs Global</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              postCmsMutation(
                {
                  module: 'site_settings',
                  action: 'update',
                  firmName,
                  shortBrandName,
                  address,
                  whatsappNumber,
                  whatsappDisplay,
                  defaultWaMessage,
                  inquiryRecipientEmail,
                  instagramUrl,
                  officeHoursPagi,
                  officeHoursSiang,
                  officeHoursSore,
                },
                'Pengaturan situs berhasil disimpan.',
              )
            }}
          >
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label htmlFor="setFirmName" className="form-label">
                Nama Resmi Firma
              </label>
              <input
                id="setFirmName"
                type="text"
                required
                value={firmName}
                onChange={(e) => setFirmName(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label htmlFor="setAddress" className="form-label">
                Alamat Kantor Resmi
              </label>
              <input
                id="setAddress"
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label htmlFor="setWaNumber" className="form-label">
                Nomor WhatsApp (Format Internasional Diawali 62)
              </label>
              <input
                id="setWaNumber"
                type="text"
                required
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label htmlFor="setWaMsg" className="form-label">
                Pesan Default WhatsApp
              </label>
              <input
                id="setWaMsg"
                type="text"
                required
                value={defaultWaMessage}
                onChange={(e) => setDefaultWaMessage(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label htmlFor="setInqEmail" className="form-label">
                Email Penerima Formulir Konsultasi
              </label>
              <input
                id="setInqEmail"
                type="email"
                required
                value={inquiryRecipientEmail}
                onChange={(e) => setInquiryRecipientEmail(e.target.value)}
                className="form-input"
              />
            </div>
            <button type="submit" className="btn-gold" disabled={busy}>
              Simpan Pengaturan Situs
            </button>
          </form>
        </div>
      ) : null}

      {/* TAB 10: USERS & AUDIT LOGS */}
      {activeTab === 'security' && user.role === 'admin' ? (
        <div className="docket-booking-grid">
          <div className="docket-panel-form">
            <h2>Tambah / Perbarui Pengguna Admin &amp; Editor</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                const ok = await postCmsMutation(
                  {
                    module: 'user',
                    action: 'create',
                    name: newUserName,
                    email: newUserEmail,
                    password: newUserPass,
                    role: newUserRole,
                  },
                  'Akun pengguna berhasil disimpan.',
                )
                if (ok) {
                  setNewUserName('')
                  setNewUserEmail('')
                  setNewUserPass('')
                }
              }}
            >
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label htmlFor="newUserNameInput" className="form-label">
                  Nama Pengguna
                </label>
                <input
                  id="newUserNameInput"
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label htmlFor="newUserEmailInput" className="form-label">
                  Email
                </label>
                <input
                  id="newUserEmailInput"
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label htmlFor="newUserPassInput" className="form-label">
                  Kata Sandi Awal (Min. 12 karakter, wajib diganti saat login pertama)
                </label>
                <input
                  id="newUserPassInput"
                  type="password"
                  required
                  minLength={12}
                  value={newUserPass}
                  onChange={(e) => setNewUserPass(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label htmlFor="newUserRoleSelect" className="form-label">
                  Peran (Role)
                </label>
                <select
                  id="newUserRoleSelect"
                  value={newUserRole}
                  onChange={(e) =>
                    setNewUserRole(e.target.value === 'admin' ? 'admin' : 'editor')
                  }
                  className="form-input"
                >
                  <option value="editor">Editor (Artikel, Kategori, Media)</option>
                  <option value="admin">Admin (Akses Penuh)</option>
                </select>
              </div>
              <button type="submit" className="btn-gold" disabled={busy}>
                Simpan Pengguna
              </button>
            </form>
          </div>

          <div className="docket-info-card">
            <h3>Log Audit Keamanan Terbaru ({auditLogs.length})</h3>
            <div className="stacked-articles-column" style={{ marginTop: '16px' }}>
              {auditLogs.slice(0, 15).map((log) => (
                <div key={log.id} className="cred-box">
                  <div className="cred-title">
                    {log.action} — {log.collectionName}
                  </div>
                  <div className="cred-desc">
                    Oleh: {log.actor} &middot; {log.detail}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

