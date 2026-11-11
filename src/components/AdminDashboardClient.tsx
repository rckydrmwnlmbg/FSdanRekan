'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ImageUploader } from '@/components/admin/ImageUploader'
import { MultiPhotoUploader, type CasePhotoEntry } from '@/components/admin/MultiPhotoUploader'

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
  photo: {
    id?: string
    url: string
    alt: string
    width?: number
    height?: number
    mimeType?: string
  }
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
  photos?: Array<{ url: string; caption?: string; alt?: string }>
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
  const [artCoverAlt, setArtCoverAlt] = useState('')
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
  const [teamPhotoMeta, setTeamPhotoMeta] = useState<{ width?: number; height?: number; mimeType?: string }>({})
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
  const [casePhotos, setCasePhotos] = useState<CasePhotoEntry[]>([])
  const [caseOrder, setCaseOrder] = useState(1)

  // Modals state
  const [showDevToolsConfirmModal, setShowDevToolsConfirmModal] = useState(false)
  const [devConfirmChecked, setDevConfirmChecked] = useState(false)
  const [devConfirmText, setDevConfirmText] = useState('')
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<{ title: string; onConfirm: () => void } | null>(null)

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

  useEffect(() => {
    const isDirty = Boolean(
      (artTitle && artTitle.trim().length > 0) ||
      (teamFullName && teamFullName.trim().length > 0) ||
      (paName && paName.trim().length > 0) ||
      (caseType && caseType.trim().length > 0)
    )
    if (!isDirty) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [artTitle, teamFullName, paName, caseType])

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

  if (loading) {
    return (
      <div className="cred-box" style={{ marginTop: '32px' }}>
        <div className="cred-title">Memuat Panel Pengelolaan Website...</div>
      </div>
    )
  }

  // 1. Login View
  if (!user) {
    return (
      <div className="docket-panel-form" style={{ maxWidth: '520px', marginTop: '32px' }}>
        <h2>Masuk ke Panel Pengelolaan Website</h2>
        <p className="trust-stat-desc" style={{ marginBottom: '20px' }}>
          Gunakan akun resmi Pengelola atau Penyunting Ferdinan Silalahi dan Rekan Law Firm.
        </p>

        {feedback ? (
          <div className="cred-box" style={{ marginBottom: '16px' }} role="alert">
            <div className="cred-title">
              {feedback.type === 'err' ? 'Peringatan' : 'Informasi'}
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
              {busy ? 'Memverifikasi...' : 'Masuk'}
            </button>
            <Link href="/" className="btn-outline">
              &larr; Kembali ke Beranda
            </Link>
          </div>
        </form>
      </div>
    )
  }

  // 2. Mandatory First-Login Password Change View
  if (user.mustChangePassword) {
    return (
      <div className="docket-panel-form" style={{ maxWidth: '580px', marginTop: '32px' }}>
        <div className="eyebrow-tag">PENGATURAN KEAMANAN AKUN</div>
        <h2>Wajib Ganti Kata Sandi Awal</h2>
        <p className="trust-stat-desc" style={{ marginBottom: '20px' }}>
          Anda masuk menggunakan kata sandi awal dari sistem. Demi keamanan kantor, Anda wajib
          mengganti kata sandi terlebih dahulu sebelum dapat mengelola konten website.
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
            Masuk sebagai: {user.name} ({user.email}) &mdash; Peran: {user.role === 'admin' ? 'PENGELOLA' : 'PENYUNTING'}
          </div>
          <div className="cred-desc">
            Status Penyimpanan Data:{' '}
            <strong>{dbConnected ? 'Aktif dan Terhubung' : 'Penyimpanan Cadangan'}</strong>
          </div>
        </div>
        <div className="hero-actions-row" style={{ marginTop: 0 }}>
          <Link href="/" className="btn-outline">
            Lihat Situs Publik
          </Link>
          <button type="button" onClick={handleLogout} className="btn-outline" disabled={busy}>
            Keluar
          </button>
        </div>
      </div>

      {feedback ? (
        <div className="cred-box" style={{ marginBottom: '20px' }} role="status">
          <div className="cred-title">
            {feedback.type === 'err' ? 'Peringatan' : 'Berhasil'}
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
          8. Pustaka Foto ({mediaAssets.length})
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
              10. Pengguna &amp; Riwayat
            </button>
          </>
        ) : null}
      </nav>

      {/* TAB 1: DASHBOARD */}
      {activeTab === 'dashboard' ? (
        <div>
          <div className="credentials-spec-grid">
            <div className="cred-box">
              <div className="cred-title">Artikel Tayang / Konsep</div>
              <div className="cred-desc">
                {articles.filter((a) => a.status === 'published').length} Tayang &middot;{' '}
                {articles.filter((a) => a.status === 'draft').length} Konsep
              </div>
            </div>
            <div className="cred-box">
              <div className="cred-title">Permohonan Janji Temu</div>
              <div className="cred-desc">
                {inquiries.filter((i) => i.status === 'baru').length} Baru &middot;{' '}
                {inquiries.filter((i) => i.emailFailed).length} Menunggu Notifikasi
              </div>
            </div>
            <div className="cred-box">
              <div className="cred-title">Profil Tim &amp; Bidang Layanan</div>
              <div className="cred-desc">
                {teamMembers.length} Anggota Tim &middot; {practiceAreas.length} Bidang Layanan
              </div>
            </div>
            <div className="cred-box">
              <div className="cred-title">Dokumentasi Perkara</div>
              <div className="cred-desc">
                {caseRecords.length} Perkara Terdaftar &middot; {mediaAssets.length} Berkas di Pustaka Foto
              </div>
            </div>
          </div>

          {user.role === 'admin' ? (
            <details
              style={{
                marginTop: '28px',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                padding: '14px 18px',
                background: 'rgba(255, 255, 255, 0.02)',
              }}
            >
              <summary
                style={{
                  cursor: 'pointer',
                  fontWeight: 600,
                  color: 'var(--color-text-muted)',
                  fontSize: '13px',
                  userSelect: 'none',
                }}
              >
                ⚙️ Alat Pengembang (Khusus Pengelola)
              </summary>
              <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '6px' }}>
                  Muat Ulang Data Bawaan Sistem
                </div>
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '14px', maxWidth: '680px', lineHeight: 1.6 }}>
                  Tindakan ini akan memeriksa dan memuat kembali data awal bawaan ke penyimpanan database.
                  <br />
                  <span style={{ color: 'var(--color-gold)' }}>⚠️ Perhatian:</span> Data bawaan yang sebelumnya sengaja dihapus mungkin akan muncul kembali. Data yang telah Anda ubah atau sunting tidak akan hilang. Gunakan fitur ini hanya bila diarahkan oleh tim teknis.
                </p>
                <button
                  type="button"
                  className="btn-outline"
                  style={{ fontSize: '13px', padding: '6px 14px' }}
                  disabled={busy}
                  onClick={() => setShowDevToolsConfirmModal(true)}
                >
                  Muat Ulang Data Bawaan
                </button>
              </div>
            </details>
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
                    coverAlt: artCoverAlt || `Ilustrasi ${artTitle}`,
                    categorySlug: artCategorySlug,
                    categoryName: selectedCat?.name || 'Hukum Korporasi & Bisnis',
                    status: artStatus,
                    seoTitle: artSeoTitle || artTitle,
                    seoDescription: artSeoDesc || artExcerpt.slice(0, 155),
                  },
                  'Artikel berhasil disimpan.',
                )
                if (ok) {
                  setArtId('')
                  setArtSlug('')
                  setArtTitle('')
                  setArtExcerpt('')
                  setArtBodyHtml('<p></p>')
                  setArtCoverUrl('/images/practice-corporate.webp')
                  setArtCoverAlt('')
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
                  placeholder="Contoh: Panduan Mitigasi Risiko Hukum dalam Kontrak Bisnis"
                />
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label htmlFor="artSlugInput" className="form-label">
                  Alamat Tautan Halaman (Otomatis dibuat dari judul bila dikosongkan)
                </label>
                <input
                  id="artSlugInput"
                  type="text"
                  value={artSlug}
                  onChange={(e) => setArtSlug(e.target.value)}
                  className="form-input"
                  placeholder="Contoh: panduan-mitigasi-risiko-hukum-kontrak"
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
                  Status Penayangan
                </label>
                <select
                  id="artStatusSelect"
                  value={artStatus}
                  onChange={(e) =>
                    setArtStatus(e.target.value === 'published' ? 'published' : 'draft')
                  }
                  className="form-input"
                >
                  <option value="draft">Konsep (Belum tayang di website)</option>
                  <option value="published">Tayang (Sudah tampil di website)</option>
                </select>
              </div>

              {/* Komponen Upload Foto Sampul */}
              <ImageUploader
                label="Foto Sampul Artikel"
                helperText="Format JPG, PNG, atau WebP, maksimal 5 MB"
                value={artCoverUrl}
                altText={artCoverAlt || `Ilustrasi ${artTitle}`}
                suggestedAlt={`Ilustrasi ${artTitle}`}
                onUploadSuccess={(asset) => {
                  setArtCoverUrl(asset.url)
                  if (asset.altText) setArtCoverAlt(asset.altText)
                }}
                onRemove={() => {
                  setArtCoverUrl('')
                  setArtCoverAlt('')
                }}
                csrfToken={user.csrfToken}
                mediaAssets={mediaAssets}
                disabled={busy}
              />

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label htmlFor="artExcerptInput" className="form-label">
                  Ringkasan Singkat (1–2 Kalimat)
                </label>
                <textarea
                  id="artExcerptInput"
                  rows={3}
                  required
                  value={artExcerpt}
                  onChange={(e) => setArtExcerpt(e.target.value)}
                  className="form-input"
                  placeholder="Tulis ringkasan singkat artikel yang akan tampil pada kartu..."
                />
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label htmlFor="artBodyInput" className="form-label">
                  Isi Artikel Lengkap (Format HTML/Teks)
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
                  Judul untuk Mesin Pencari (SEO Title — {artSeoTitle.length}/60 karakter)
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
                  Deskripsi untuk Mesin Pencari (SEO Description — {artSeoDesc.length}/155 karakter)
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
                      setArtCoverUrl('/images/practice-corporate.webp')
                      setArtCoverAlt('')
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
                <div
                  key={art.id}
                  className="cred-box"
                  style={{
                    display: 'flex',
                    gap: '14px',
                    alignItems: 'flex-start',
                  }}
                >
                  <div
                    style={{
                      width: '76px',
                      height: '56px',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      background: '#18181b',
                      flexShrink: 0,
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    <img
                      src={art.coverImage.url}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        ;(e.currentTarget as HTMLElement).style.display = 'none'
                      }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="cred-title" style={{ fontSize: '15px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          marginRight: '6px',
                          backgroundColor:
                            art.status === 'published'
                              ? 'rgba(34, 197, 94, 0.2)'
                              : 'rgba(234, 179, 8, 0.2)',
                          color: art.status === 'published' ? '#4ade80' : '#facc15',
                        }}
                      >
                        {art.status === 'published' ? 'Tayang' : 'Konsep'}
                      </span>
                      {art.title}
                    </div>
                    <div className="cred-desc">
                      Alamat: <code>/artikel/{art.slug}</code> &middot; Kategori: {art.category.name}
                    </div>
                    <div className="hero-actions-row" style={{ marginTop: '10px' }}>
                      <button
                        type="button"
                        className="btn-outline"
                        style={{ padding: '4px 10px', fontSize: '13px' }}
                        onClick={() => {
                          setArtId(art.id)
                          setArtSlug(art.slug)
                          setArtTitle(art.title)
                          setArtExcerpt(art.excerpt)
                          setArtBodyHtml(art.bodyHtml)
                          setArtCoverUrl(art.coverImage.url)
                          setArtCoverAlt(art.coverImage.alt || '')
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
                        style={{
                          padding: '4px 10px',
                          fontSize: '13px',
                          color: '#ef4444',
                          borderColor: 'rgba(239, 68, 68, 0.4)',
                        }}
                        onClick={() => {
                          setDeleteConfirmItem({
                            title: `Artikel "${art.title}"`,
                            onConfirm: () =>
                              postCmsMutation(
                                { module: 'article', action: 'delete', id: art.id },
                                'Artikel berhasil dihapus.',
                              ),
                          })
                        }}
                      >
                        Hapus
                      </button>
                    </div>
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
                  <div className="cred-desc">Alamat tautan: <code>/{c.slug}</code></div>
                  <div className="hero-actions-row" style={{ marginTop: '8px' }}>
                    <button
                      type="button"
                      className="btn-outline"
                      style={{
                        padding: '4px 10px',
                        fontSize: '13px',
                        color: '#ef4444',
                        borderColor: 'rgba(239, 68, 68, 0.4)',
                      }}
                      onClick={() => {
                        setDeleteConfirmItem({
                          title: `Kategori "${c.name}"`,
                          onConfirm: () =>
                            postCmsMutation(
                              { module: 'category', action: 'delete', id: c.id, slug: c.slug },
                              'Kategori berhasil dihapus.',
                            ),
                        })
                      }}
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
                Setiap pesan dan jadwal konsultasi dari pengunjung website akan langsung tercatat di sini dan dikirimkan ke email kantor secara otomatis.
              </div>
            </div>
          ) : (
            inquiries.map((inq) => (
              <div key={inq.id} className="cred-box">
                <div className="cred-title">
                  [{inq.status.toUpperCase()}] {inq.name} &mdash; {inq.practiceAreaId}
                  {inq.emailFailed ? ' (PERINGATAN: Notifikasi Email Belum Terkirim)' : ''}
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
                    style={{
                      padding: '4px 10px',
                      fontSize: '13px',
                      color: '#ef4444',
                      borderColor: 'rgba(239, 68, 68, 0.4)',
                    }}
                    onClick={() => {
                      setDeleteConfirmItem({
                        title: `Permohonan dari "${inq.name}"`,
                        onConfirm: () =>
                          postCmsMutation(
                            { module: 'inquiry', action: 'delete', id: inq.id },
                            'Permohonan berhasil dihapus.',
                          ),
                      })
                    }}
                  >
                    Hapus
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
                const teamDisplayName = teamHonorific
                  ? `${teamFullName}, ${teamHonorific}`
                  : teamFullName

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
                    photoAlt: `Foto ${teamDisplayName}`,
                    photoWidth: teamPhotoMeta.width,
                    photoHeight: teamPhotoMeta.height,
                    photoMime: teamPhotoMeta.mimeType,
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
                  setTeamPhotoUrl('/team/ferdinan-hasiholan-silalahi.webp')
                  setTeamPhotoMeta({})
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
                  placeholder="Contoh: Basit Rezki"
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
                  placeholder="S.H."
                />
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label htmlFor="teamRoleInput" className="form-label">
                  Jabatan dalam Kantor
                </label>
                <input
                  id="teamRoleInput"
                  type="text"
                  required
                  value={teamRoleTitle}
                  onChange={(e) => setTeamRoleTitle(e.target.value)}
                  className="form-input"
                  placeholder="Contoh: Senior Associate"
                />
              </div>

              {/* Upload Foto Profil Tim */}
              <ImageUploader
                label="Foto Profil Anggota Tim"
                helperText="Format JPG, PNG, atau WebP, maksimal 5 MB (Rasio tegak 4:5 disarankan)"
                value={teamPhotoUrl}
                altText={`Foto ${teamFullName}${teamHonorific ? `, ${teamHonorific}` : ''}`}
                suggestedAlt={`Foto ${teamFullName}`}
                onUploadSuccess={(asset) => {
                  setTeamPhotoUrl(asset.url)
                  setTeamPhotoMeta({
                    width: asset.width,
                    height: asset.height,
                    mimeType: asset.mimeType,
                  })
                }}
                onRemove={() => {
                  setTeamPhotoUrl('')
                  setTeamPhotoMeta({})
                }}
                csrfToken={user.csrfToken}
                mediaAssets={mediaAssets}
                disabled={busy}
              />

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
                  placeholder="Ringkasan keahlian dan pengalaman advokat..."
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
                  placeholder="Riwayat karier hukum lengkap, latar belakang pendidikan, dan fokus penanganan..."
                />
              </div>
              <div className="hero-actions-row">
                <button type="submit" className="btn-gold" disabled={busy}>
                  Simpan Profil Tim
                </button>
                {teamId ? (
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => {
                      setTeamId('')
                      setTeamSlug('')
                      setTeamFullName('')
                      setTeamHonorific('')
                      setTeamShortBio('')
                      setTeamFullBio('')
                      setTeamPhotoUrl('/team/ferdinan-hasiholan-silalahi.webp')
                      setTeamPhotoMeta({})
                    }}
                  >
                    Batal Edit
                  </button>
                ) : null}
              </div>
            </form>
          </div>

          <div className="docket-info-card">
            <h3>Daftar Anggota Tim ({teamMembers.length})</h3>
            <div className="stacked-articles-column" style={{ marginTop: '16px' }}>
              {teamMembers.map((m) => (
                <div
                  key={m.id}
                  className="cred-box"
                  style={{
                    display: 'flex',
                    gap: '14px',
                    alignItems: 'center',
                  }}
                >
                  <div
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      background: '#18181b',
                      flexShrink: 0,
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    <img
                      src={m.photo.url}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        ;(e.currentTarget as HTMLElement).style.display = 'none'
                      }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="cred-title" style={{ fontSize: '15px' }}>
                      #{m.displayOrder} {m.displayName}
                    </div>
                    <div className="cred-desc">{m.roleTitle}</div>
                    <div className="hero-actions-row" style={{ marginTop: '8px' }}>
                      <button
                        type="button"
                        className="btn-outline"
                        style={{ padding: '4px 10px', fontSize: '13px' }}
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
                          setTeamPhotoMeta({
                            width: m.photo.width,
                            height: m.photo.height,
                            mimeType: m.photo.mimeType,
                          })
                          setTeamOrder(m.displayOrder)
                        }}
                      >
                        Edit Profil
                      </button>
                    </div>
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

              {/* Upload Gambar Header Bidang Layanan */}
              <ImageUploader
                label="Gambar Header Bidang Layanan"
                helperText="Format JPG, PNG, atau WebP, maksimal 5 MB"
                value={paImage}
                suggestedAlt={`Bidang Layanan ${paName}`}
                onUploadSuccess={(asset) => setPaImage(asset.url)}
                onRemove={() => setPaImage('')}
                csrfToken={user.csrfToken}
                mediaAssets={mediaAssets}
                disabled={busy}
              />

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
              <div className="hero-actions-row">
                <button type="submit" className="btn-gold" disabled={busy}>
                  Simpan Bidang Layanan
                </button>
                {paId ? (
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => {
                      setPaId('')
                      setPaSlug('')
                      setPaName('')
                      setPaSummary('')
                      setPaDescription('')
                      setPaScopeText('')
                      setPaImage('/images/practice-corporate.webp')
                    }}
                  >
                    Batal Edit
                  </button>
                ) : null}
              </div>
            </form>
          </div>

          <div className="docket-info-card">
            <h3>10 Bidang Layanan ({practiceAreas.length})</h3>
            <div className="stacked-articles-column" style={{ marginTop: '16px' }}>
              {practiceAreas.map((p) => (
                <div
                  key={p.id}
                  className="cred-box"
                  style={{
                    display: 'flex',
                    gap: '14px',
                    alignItems: 'center',
                  }}
                >
                  <div
                    style={{
                      width: '76px',
                      height: '52px',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      background: '#18181b',
                      flexShrink: 0,
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    <img
                      src={p.image}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        ;(e.currentTarget as HTMLElement).style.display = 'none'
                      }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="cred-title" style={{ fontSize: '15px' }}>
                      #{p.displayOrder} [{p.label}] {p.name}
                    </div>
                    <div className="cred-desc">{p.summary}</div>
                    <div className="hero-actions-row" style={{ marginTop: '8px' }}>
                      <button
                        type="button"
                        className="btn-outline"
                        style={{ padding: '4px 10px', fontSize: '13px' }}
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
            <p className="trust-stat-desc" style={{ marginBottom: '14px', lineHeight: 1.5 }}>
              Demi menjaga kerahasiaan klien, identitas perkara secara otomatis disamarkan (hanya
              menampilkan jenis perkara dan wilayah). Nama klien hanya dapat ditampilkan jika kantor
              telah mengantongi catatan persetujuan atau surat izin tertulis dari klien.
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                const photoPayload = casePhotos
                  .filter((p) => p.url)
                  .map((p, idx) => ({
                    url: p.url,
                    caption: p.caption || '',
                    alt: p.alt || p.caption || `Dokumentasi penanganan perkara ${caseType} #${idx + 1}`,
                  }))

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
                    imageUrl: photoPayload[0]?.url || caseImageUrl,
                    photos: photoPayload,
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
                  setCasePhotos([])
                  setCaseImageUrl('/images/hero-slide-courtroom.webp')
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
                  placeholder="Contoh: Perselisihan Hubungan Industrial"
                />
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label htmlFor="caseRegionInput" className="form-label">
                  Wilayah Yurisdiksi Hukum
                </label>
                <input
                  id="caseRegionInput"
                  type="text"
                  required
                  value={caseRegion}
                  onChange={(e) => setCaseRegion(e.target.value)}
                  className="form-input"
                  placeholder="Contoh: Jakarta Pusat atau Bandung, Jawa Barat"
                />
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label htmlFor="caseModeSelect" className="form-label">
                  Penayangan Identitas Klien
                </label>
                <select
                  id="caseModeSelect"
                  value={caseMode}
                  onChange={(e) =>
                    setCaseMode(e.target.value === 'named' ? 'named' : 'anonymous')
                  }
                  className="form-input"
                >
                  <option value="anonymous">
                    Nama Klien Disamarkan (Disarankan &mdash; Sesuai Kode Etik Advokat)
                  </option>
                  <option value="named">
                    Tampilkan Nama Klien (Wajib Memiliki Persetujuan Tertulis)
                  </option>
                </select>
              </div>
              {caseMode === 'named' ? (
                <>
                  <div
                    style={{
                      backgroundColor: 'rgba(234, 179, 8, 0.1)',
                      borderLeft: '4px solid #eab308',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      color: '#facc15',
                      marginBottom: '12px',
                    }}
                  >
                    Untuk menampilkan nama klien, isi dulu catatan persetujuan klien di bawah ini.
                  </div>
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label htmlFor="caseClientInput" className="form-label">
                      Nama Lengkap Klien / Instansi
                    </label>
                    <input
                      id="caseClientInput"
                      type="text"
                      required
                      value={caseClientName}
                      onChange={(e) => setCaseClientName(e.target.value)}
                      className="form-input"
                      placeholder="Nama klien atau perusahaan"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label htmlFor="caseConsentInput" className="form-label">
                      Catatan Dokumen Persetujuan Klien (Nomor izin tertulis atau dokumen persetujuan)
                    </label>
                    <input
                      id="caseConsentInput"
                      type="text"
                      required
                      value={caseConsentRef}
                      onChange={(e) => setCaseConsentRef(e.target.value)}
                      className="form-input"
                      placeholder="Contoh: Surat Izin No. 014/FS-PST/2026 atau Akta Persetujuan"
                    />
                  </div>
                </>
              ) : null}

              {/* Komponen Pengelola Banyak Foto Dokumentasi */}
              <MultiPhotoUploader
                photos={casePhotos}
                onChange={(updated) => {
                  setCasePhotos(updated)
                  if (updated.length > 0 && updated[0]?.url) {
                    setCaseImageUrl(updated[0].url)
                  }
                }}
                csrfToken={user.csrfToken}
                mediaAssets={mediaAssets}
                disabled={busy}
              />

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label htmlFor="caseOrderInput" className="form-label">
                  Urutan Tampil
                </label>
                <input
                  id="caseOrderInput"
                  type="number"
                  min={1}
                  max={99}
                  value={caseOrder}
                  onChange={(e) => setCaseOrder(Number(e.target.value) || 1)}
                  className="form-input"
                />
              </div>

              <div className="hero-actions-row">
                <button type="submit" className="btn-gold" disabled={busy}>
                  Simpan Rekam Jejak
                </button>
                {caseId ? (
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => {
                      setCaseId('')
                      setCaseType('')
                      setCaseRegion('')
                      setCaseMode('anonymous')
                      setCaseClientName('')
                      setCaseConsentRef('')
                      setCasePhotos([])
                      setCaseImageUrl('/images/hero-slide-courtroom.webp')
                    }}
                  >
                    Batal Edit
                  </button>
                ) : null}
              </div>
            </form>
          </div>

          <div className="docket-info-card">
            <h3>Daftar Rekam Jejak ({caseRecords.length})</h3>
            <div className="stacked-articles-column" style={{ marginTop: '16px' }}>
              {caseRecords.map((c) => (
                <div
                  key={c.id}
                  className="cred-box"
                  style={{
                    display: 'flex',
                    gap: '14px',
                    alignItems: 'center',
                  }}
                >
                  <div
                    style={{
                      width: '76px',
                      height: '52px',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      background: '#18181b',
                      flexShrink: 0,
                      border: '1px solid rgba(255,255,255,0.1)',
                      position: 'relative',
                    }}
                  >
                    <img
                      src={c.photos?.[0]?.url || c.imageUrl || '/images/hero-slide-courtroom.webp'}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        ;(e.currentTarget as HTMLElement).style.display = 'none'
                      }}
                    />
                    {Array.isArray(c.photos) && c.photos.length > 1 && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '2px',
                          right: '2px',
                          backgroundColor: 'rgba(0,0,0,0.75)',
                          color: '#fff',
                          fontSize: '10px',
                          padding: '1px 4px',
                          borderRadius: '2px',
                        }}
                      >
                        {c.photos.length} Foto
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="cred-title" style={{ fontSize: '15px' }}>
                      #{c.displayOrder} {c.caseType}
                    </div>
                    <div className="cred-desc">
                      Wilayah: {c.region} &middot; Status Identitas:{' '}
                      {c.displayMode === 'named' ? 'Nama Klien Ditampilkan' : 'Nama Disamarkan'}
                      {c.clientName ? ` &middot; Klien: ${c.clientName}` : ''}
                    </div>
                    <div className="hero-actions-row" style={{ marginTop: '8px' }}>
                      <button
                        type="button"
                        className="btn-outline"
                        style={{ padding: '4px 10px', fontSize: '13px' }}
                        onClick={() => {
                          setCaseId(c.id)
                          setCaseType(c.caseType)
                          setCaseRegion(c.region)
                          setCaseMode(c.displayMode)
                          setCaseClientName(c.clientName || '')
                          setCaseConsentRef(c.consentRef || '')
                          setCaseImageUrl(c.imageUrl || '/images/hero-slide-courtroom.webp')
                          setCaseOrder(c.displayOrder)
                          setCasePhotos(
                            Array.isArray(c.photos) && c.photos.length > 0
                              ? c.photos.map((p, i) => ({
                                  id: `existing-${i}-${c.id}`,
                                  url: p.url,
                                  caption: p.caption || '',
                                  alt: p.alt || p.caption || '',
                                  status: 'success',
                                }))
                              : [
                                  {
                                    id: `cover-${c.id}`,
                                    url: c.imageUrl || '/images/hero-slide-courtroom.webp',
                                    caption: c.imageAlt || '',
                                    alt: c.imageAlt || '',
                                    status: 'success',
                                  },
                                ],
                          )
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn-outline"
                        style={{
                          padding: '4px 10px',
                          fontSize: '13px',
                          color: '#ef4444',
                          borderColor: 'rgba(239, 68, 68, 0.4)',
                        }}
                        onClick={() => {
                          setDeleteConfirmItem({
                            title: `Rekam Jejak "${c.caseType} (${c.region})"`,
                            onConfirm: () =>
                              postCmsMutation(
                                { module: 'case_record', action: 'delete', id: c.id },
                                'Rekam jejak berhasil dihapus.',
                              ),
                          })
                        }}
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* TAB 8: PUSTAKA FOTO */}
      {activeTab === 'media' ? (
        <div className="docket-booking-grid">
          <div className="docket-panel-form">
            <h2>Pustaka Foto</h2>
            <p className="trust-stat-desc" style={{ marginBottom: '16px' }}>
              Unggah dan kelola foto untuk artikel, profil tim, layanan, dan dokumentasi perkara. Foto otomatis dioptimalkan sebelum disimpan.
            </p>
            <ImageUploader
              label="Tambah Foto ke Pustaka"
              helperText="Format JPG, PNG, atau WebP, maksimal 5 MB"
              value=""
              onUploadSuccess={async () => {
                await loadDashboardData()
                setFeedback({ type: 'ok', text: 'Foto berhasil diunggah ke Pustaka Foto.' })
              }}
              csrfToken={user.csrfToken}
              disabled={busy}
            />
          </div>

          <div className="docket-info-card">
            <h3>Daftar Foto Tersimpan ({mediaAssets.length})</h3>
            <div className="stacked-articles-column" style={{ marginTop: '16px' }}>
              {mediaAssets.length === 0 ? (
                <div className="cred-box">
                  <div className="cred-title">Belum Ada Foto di Pustaka</div>
                  <div className="cred-desc">
                    Foto yang Anda unggah melalui formulir artikel, tim, layanan, atau rekam jejak akan otomatis tercatat dan dapat digunakan kembali di sini.
                  </div>
                </div>
              ) : (
                mediaAssets.map((m) => (
                  <div
                    key={m.id}
                    className="cred-box"
                    style={{
                      display: 'flex',
                      gap: '14px',
                      alignItems: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        background: '#18181b',
                        flexShrink: 0,
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                    >
                      <img
                        src={m.url}
                        alt={m.altText || m.originalName}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          ;(e.currentTarget as HTMLElement).style.display = 'none'
                        }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="cred-title" style={{ fontSize: '14px', wordBreak: 'break-all' }}>
                        {m.originalName}
                      </div>
                      <div className="cred-desc">
                        {Math.round(m.sizeBytes / 1024)} KB &middot;{' '}
                        {new Date(m.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                      <div className="hero-actions-row" style={{ marginTop: '8px' }}>
                        <button
                          type="button"
                          className="btn-outline"
                          style={{ padding: '3px 8px', fontSize: '12px' }}
                          onClick={() => {
                            navigator.clipboard.writeText(m.url)
                            setFeedback({
                              type: 'ok',
                              text: `Tautan foto "${m.originalName}" berhasil disalin ke papan klip.`,
                            })
                          }}
                        >
                          Salin Tautan
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
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
            <h2>Tambah Pengguna Baru</h2>
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
                  placeholder="Contoh: Basit Rezki"
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
                  placeholder="email@fsdanrekan.com"
                />
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label htmlFor="newUserPassInput" className="form-label">
                  Kata Sandi Awal (Minimal 12 karakter, wajib diganti saat masuk pertama kali)
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
                  Hak Akses Akun
                </label>
                <select
                  id="newUserRoleSelect"
                  value={newUserRole}
                  onChange={(e) =>
                    setNewUserRole(e.target.value === 'admin' ? 'admin' : 'editor')
                  }
                  className="form-input"
                >
                  <option value="editor">Penyunting (Artikel, Kategori, Pustaka Foto)</option>
                  <option value="admin">Pengelola (Akses Penuh Seluruh Menu)</option>
                </select>
              </div>
              <button type="submit" className="btn-gold" disabled={busy}>
                Simpan Pengguna
              </button>
            </form>
          </div>

          <div className="docket-info-card">
            <h3>Riwayat Aktivitas Sistem Terbaru ({auditLogs.length})</h3>
            <div className="stacked-articles-column" style={{ marginTop: '16px' }}>
              {auditLogs.slice(0, 15).map((log) => {
                const actionLabels: Record<string, string> = {
                  login_success: 'Masuk Akun Berhasil',
                  password_change: 'Perubahan Kata Sandi',
                  article_upsert: 'Penyimpanan Artikel',
                  article_delete: 'Penghapusan Artikel',
                  category_upsert: 'Penyimpanan Kategori',
                  category_delete: 'Penghapusan Kategori',
                  team_member_upsert: 'Penyimpanan Profil Tim',
                  practice_area_upsert: 'Penyimpanan Bidang Layanan',
                  case_record_upsert: 'Penyimpanan Rekam Jejak',
                  case_record_delete: 'Penghapusan Rekam Jejak',
                  inquiry_update: 'Pembaruan Status Permohonan',
                  inquiry_delete: 'Penghapusan Permohonan',
                  site_settings_update: 'Pembaruan Pengaturan Situs',
                  user_create: 'Penambahan Pengguna',
                  media_upload: 'Unggah Foto',
                  migrate_seed: 'Sinkronisasi Data Bawaan',
                }
                const label = actionLabels[log.action] || log.action

                return (
                  <div key={log.id} className="cred-box">
                    <div className="cred-title">
                      {label} &mdash; {log.collectionName}
                    </div>
                    <div className="cred-desc">
                      Oleh: {log.actor} &middot; {log.detail}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : null}

      {/* MODAL 1: KONFIRMASI DUA LANGKAH MUAT ULANG DATA BAWAAN */}
      {showDevToolsConfirmModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="devModalTitle"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#121214',
              border: '1px solid #eab308',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.7)',
            }}
          >
            <h3 id="devModalTitle" style={{ color: '#facc15', margin: '0 0 12px 0', fontSize: '18px' }}>
              Konfirmasi: Muat Ulang Data Bawaan Sistem
            </h3>
            <p style={{ color: '#d4d4d8', fontSize: '14px', lineHeight: 1.6, margin: '0 0 16px 0' }}>
              Tindakan ini akan memasukkan kembali artikel contoh, profil tim standar, bidang layanan, dan pengaturan situs bawaan.
            </p>
            <div
              style={{
                backgroundColor: 'rgba(234, 179, 8, 0.1)',
                borderLeft: '3px solid #eab308',
                padding: '10px 12px',
                borderRadius: '4px',
                fontSize: '13px',
                color: '#facc15',
                marginBottom: '16px',
              }}
            >
              <strong>Perhatian:</strong> Data bawaan yang sebelumnya sengaja Anda hapus akan dimuat kembali ke sistem.
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#f4f4f5' }}>
                <input
                  type="checkbox"
                  checked={devConfirmChecked}
                  onChange={(e) => setDevConfirmChecked(e.target.checked)}
                />
                Saya memahami data bawaan yang sebelumnya dihapus akan dimuat kembali
              </label>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label htmlFor="devConfirmInput" style={{ display: 'block', fontSize: '12px', color: '#a1a1aa', marginBottom: '6px' }}>
                Ketik kata <strong>MUAT ULANG</strong> untuk melanjutkan:
              </label>
              <input
                id="devConfirmInput"
                type="text"
                className="form-input"
                value={devConfirmText}
                onChange={(e) => setDevConfirmText(e.target.value)}
                placeholder="MUAT ULANG"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn-outline"
                onClick={() => {
                  setShowDevToolsConfirmModal(false)
                  setDevConfirmChecked(false)
                  setDevConfirmText('')
                }}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn-gold"
                disabled={!devConfirmChecked || devConfirmText.trim().toUpperCase() !== 'MUAT ULANG' || busy}
                onClick={async () => {
                  setShowDevToolsConfirmModal(false)
                  setDevConfirmChecked(false)
                  setDevConfirmText('')
                  await postCmsMutation(
                    { module: 'system', action: 'migrate_seed' },
                    'Data bawaan sistem berhasil disinkronkan.',
                  )
                }}
              >
                {busy ? 'Memproses...' : 'Ya, Muat Ulang Data'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: KONFIRMASI HAPUS DATA */}
      {deleteConfirmItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="deleteModalTitle"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#18181b',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.7)',
            }}
          >
            <h3 id="deleteModalTitle" style={{ color: '#ef4444', margin: '0 0 10px 0', fontSize: '18px' }}>
              Konfirmasi Penghapusan
            </h3>
            <p style={{ color: '#d4d4d8', fontSize: '14px', lineHeight: 1.6, margin: '0 0 20px 0' }}>
              Apakah Anda yakin ingin menghapus <strong>{deleteConfirmItem.title}</strong>? Data yang dihapus tidak dapat dipulihkan kembali.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn-outline"
                onClick={() => setDeleteConfirmItem(null)}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn-outline"
                style={{
                  color: '#ffffff',
                  backgroundColor: '#dc2626',
                  borderColor: '#dc2626',
                  fontWeight: 600,
                }}
                disabled={busy}
                onClick={async () => {
                  const onConfirm = deleteConfirmItem.onConfirm
                  setDeleteConfirmItem(null)
                  onConfirm()
                }}
              >
                {busy ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

