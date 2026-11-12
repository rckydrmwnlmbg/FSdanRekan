'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  cleanWordOrDocsHtml,
  convertPlainTextToFormattedHtml,
} from '@/lib/editor-cleaner'

interface VisualArticleEditorProps {
  value: string
  onChange: (html: string) => void
  disabled?: boolean
  placeholder?: string
}

export function VisualArticleEditor({
  value,
  onChange,
  disabled = false,
  placeholder = 'Mulai tulis ulasan artikel hukum di sini, atau tempel tulisan langsung dari Microsoft Word maupun Google Docs...',
}: VisualArticleEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [showCodeView, setShowCodeView] = useState(false)
  const [rawHtmlCode, setRawHtmlCode] = useState(value || '<p></p>')
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [linkUrl, setLinkUrl] = useState('https://')
  const [linkText, setLinkText] = useState('')
  const [savedSelectionRange, setSavedSelectionRange] = useState<Range | null>(null)
  const [stats, setStats] = useState({ words: 0, chars: 0 })

  // Synchronize incoming value if external reset occurs (e.g., "Batal Edit" or selecting different article)
  useEffect(() => {
    if (editorRef.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || '<p></p>'
      }
    }
    setRawHtmlCode(value || '<p></p>')
    calculateStats(value || '')
  }, [value])

  const calculateStats = (html: string) => {
    // Strip HTML tags for stats calculation
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    const words = text.length > 0 ? text.split(/\s+/).length : 0
    const chars = text.length
    setStats({ words, chars })
  }

  const handleInput = useCallback(() => {
    if (!editorRef.current) return
    const newHtml = editorRef.current.innerHTML
    setRawHtmlCode(newHtml)
    calculateStats(newHtml)
    onChange(newHtml)
  }, [onChange])

  const executeCommand = (command: string, value: string | undefined = undefined) => {
    if (disabled || showCodeView) return
    editorRef.current?.focus()
    document.execCommand(command, false, value)
    handleInput()
  }

  // Smart Paste Handler
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (disabled) return
    e.preventDefault()

    const clipboard = e.clipboardData
    const htmlData = clipboard.getData('text/html')
    const plainText = clipboard.getData('text/plain')

    let cleaned = ''

    if (htmlData && htmlData.trim().length > 0) {
      // Clean rich text from Word or Google Docs
      cleaned = cleanWordOrDocsHtml(htmlData)
    } else if (plainText && plainText.trim().length > 0) {
      // Smart conversion from plain text with headings & lists detection
      cleaned = convertPlainTextToFormattedHtml(plainText)
    }

    if (!cleaned) {
      cleaned = `<p>${plainText.trim()}</p>`
    }

    // Insert cleaned HTML at cursor position
    editorRef.current?.focus()
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      range.deleteContents()

      const tempEl = document.createElement('div')
      tempEl.innerHTML = cleaned
      const frag = document.createDocumentFragment()
      let node: ChildNode | null
      let lastNode: ChildNode | null = null

      while ((node = tempEl.firstChild)) {
        lastNode = frag.appendChild(node)
      }

      range.insertNode(frag)
      if (lastNode) {
        range.setStartAfter(lastNode)
        range.collapse(true)
        selection.removeAllRanges()
        selection.addRange(range)
      }
    } else {
      document.execCommand('insertHTML', false, cleaned)
    }

    handleInput()
  }

  // Open Link Dialog
  const handleOpenLinkModal = () => {
    if (disabled) return
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      setSavedSelectionRange(selection.getRangeAt(0).cloneRange())
      const selectedText = selection.toString().trim()
      setLinkText(selectedText)
    } else {
      setSavedSelectionRange(null)
      setLinkText('')
    }
    setLinkUrl('https://')
    setShowLinkModal(true)
  }

  // Submit Link Dialog
  const handleInsertLink = (e: React.FormEvent) => {
    e.preventDefault()
    setShowLinkModal(false)

    if (!linkUrl || linkUrl === 'https://') return

    editorRef.current?.focus()
    const selection = window.getSelection()

    if (savedSelectionRange && selection) {
      selection.removeAllRanges()
      selection.addRange(savedSelectionRange)
    }

    const displayText = linkText.trim() || linkUrl.trim()
    const linkHtml = `<a href="${encodeURI(linkUrl.trim())}">${displayText}</a>`

    document.execCommand('insertHTML', false, linkHtml)
    handleInput()
  }

  return (
    <div
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        backgroundColor: '#12141a',
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
      }}
    >
      {/* 1. TOOLBAR EDITOR DENGAN LABEL BAHASA INDONESIA */}
      <div
        role="toolbar"
        aria-label="Alat Penyunting Tulisan Artikel"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 12px',
          backgroundColor: '#1a1d24',
          borderBottom: '1px solid var(--color-border)',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn-outline"
            style={{ padding: '4px 9px', fontSize: '13px', fontWeight: 700 }}
            title="Tebalkan Tulisan (Ctrl+B)"
            onClick={() => executeCommand('bold')}
            disabled={disabled || showCodeView}
          >
            Tebal
          </button>
          <button
            type="button"
            className="btn-outline"
            style={{ padding: '4px 9px', fontSize: '13px', fontStyle: 'italic' }}
            title="Miringkan Tulisan (Ctrl+I)"
            onClick={() => executeCommand('italic')}
            disabled={disabled || showCodeView}
          >
            Miring
          </button>
        </div>

        <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />

        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn-outline"
            style={{ padding: '4px 9px', fontSize: '12px' }}
            title="Jadikan Judul Bagian Utama (H2)"
            onClick={() => executeCommand('formatBlock', '<h2>')}
            disabled={disabled || showCodeView}
          >
            Judul Bagian
          </button>
          <button
            type="button"
            className="btn-outline"
            style={{ padding: '4px 9px', fontSize: '12px' }}
            title="Jadikan Sub-judul / Poin Bahasan (H3)"
            onClick={() => executeCommand('formatBlock', '<h3>')}
            disabled={disabled || showCodeView}
          >
            Sub-judul
          </button>
          <button
            type="button"
            className="btn-outline"
            style={{ padding: '4px 9px', fontSize: '12px' }}
            title="Kembalikan ke Paragraf Biasa"
            onClick={() => executeCommand('formatBlock', '<p>')}
            disabled={disabled || showCodeView}
          >
            Paragraf
          </button>
        </div>

        <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />

        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn-outline"
            style={{ padding: '4px 9px', fontSize: '12px' }}
            title="Daftar Butir Poin (Bulleted List)"
            onClick={() => executeCommand('insertUnorderedList')}
            disabled={disabled || showCodeView}
          >
            Daftar Poin
          </button>
          <button
            type="button"
            className="btn-outline"
            style={{ padding: '4px 9px', fontSize: '12px' }}
            title="Daftar Angka / Penomoran (Numbered List)"
            onClick={() => executeCommand('insertOrderedList')}
            disabled={disabled || showCodeView}
          >
            Daftar Angka
          </button>
          <button
            type="button"
            className="btn-outline"
            style={{ padding: '4px 9px', fontSize: '12px' }}
            title="Kutipan Khusus / Asas Hukum"
            onClick={() => executeCommand('formatBlock', '<blockquote>')}
            disabled={disabled || showCodeView}
          >
            Kutipan
          </button>
        </div>

        <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />

        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn-outline"
            style={{ padding: '4px 9px', fontSize: '12px' }}
            title="Pasang Tautan Web / Rujukan Dokumen"
            onClick={handleOpenLinkModal}
            disabled={disabled || showCodeView}
          >
            Tautan
          </button>
          <button
            type="button"
            className="btn-outline"
            style={{ padding: '4px 9px', fontSize: '12px', color: '#a1a1aa' }}
            title="Bersihkan Semua Format pada Tulisan Terpilih"
            onClick={() => {
              executeCommand('removeFormat')
              executeCommand('formatBlock', '<p>')
            }}
            disabled={disabled || showCodeView}
          >
            Hapus Format
          </button>
        </div>

        {/* Sisi Kanan Toolbar: Toggle Lihat Kode */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn-outline"
            style={{
              padding: '3px 8px',
              fontSize: '11px',
              color: showCodeView ? '#facc15' : 'var(--color-text-muted)',
              borderColor: showCodeView ? '#facc15' : 'rgba(255,255,255,0.15)',
            }}
            onClick={() => setShowCodeView(!showCodeView)}
            title="Tampilkan / Sembunyikan Kode HTML (Pengguna Lanjutan)"
          >
            {showCodeView ? 'Kembali ke Tampilan Visual' : 'Lihat Kode (Lanjutan)'}
          </button>
        </div>
      </div>

      {/* 2. AREA KANVAS PENULISAN */}
      <div style={{ position: 'relative' }}>
        {showCodeView ? (
          /* Mode Kode HTML Mentah (Disembunyikan Secara Bawaan) */
          <div>
            <div
              style={{
                padding: '6px 14px',
                backgroundColor: 'rgba(234, 179, 8, 0.08)',
                borderBottom: '1px solid rgba(234, 179, 8, 0.2)',
                color: '#facc15',
                fontSize: '12px',
              }}
            >
              Mode Kode HTML Lanjutan: Edit kode secara langsung bila diperlukan, atau klik &quot;Kembali ke Tampilan Visual&quot;.
            </div>
            <textarea
              value={rawHtmlCode}
              onChange={(e) => {
                setRawHtmlCode(e.target.value)
                calculateStats(e.target.value)
                onChange(e.target.value)
                if (editorRef.current) {
                  editorRef.current.innerHTML = e.target.value
                }
              }}
              disabled={disabled}
              rows={12}
              style={{
                width: '100%',
                backgroundColor: '#090a0f',
                color: '#22c55e',
                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                fontSize: '13px',
                lineHeight: 1.6,
                padding: '16px',
                border: 'none',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </div>
        ) : (
          /* Mode Visual Alami (Menyerupai Tampilan Artikel di Situs) */
          <div
            ref={editorRef}
            contentEditable={!disabled}
            onInput={handleInput}
            onPaste={handlePaste}
            role="textbox"
            aria-multiline="true"
            aria-label="Isi Artikel Lengkap"
            className="article-prose"
            data-placeholder={placeholder}
            style={{
              minHeight: '280px',
              padding: '20px',
              color: 'var(--color-text-primary, #f4f4f5)',
              fontSize: '16px',
              lineHeight: 1.75,
              outline: 'none',
              cursor: disabled ? 'not-allowed' : 'text',
              backgroundColor: '#12141a',
              boxSizing: 'border-box',
            }}
          />
        )}
      </div>

      {/* 3. FOOTER STATISTIK TULISAN & PANDUAN PINTAR */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          backgroundColor: '#181b22',
          borderTop: '1px solid var(--color-border)',
          fontSize: '12px',
          color: 'var(--color-text-muted)',
        }}
      >
        <div>
          <span>Tip: Anda bisa langsung menempel tulisan dari Word atau Google Docs (format otomatis dirapikan).</span>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <span><strong>{stats.words}</strong> kata</span>
          <span>&middot;</span>
          <span><strong>{stats.chars}</strong> karakter</span>
        </div>
      </div>

      {/* 4. MODAL DIALOG SISIPKAN TAUTAN */}
      {showLinkModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="linkModalTitle"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
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
              border: '1px solid var(--color-gold)',
              borderRadius: '8px',
              padding: '22px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
          >
            <h3 id="linkModalTitle" style={{ margin: '0 0 14px 0', fontSize: '16px', color: '#facc15' }}>
              Sisipkan Tautan Web
            </h3>
            <form onSubmit={handleInsertLink}>
              <div style={{ marginBottom: '12px' }}>
                <label htmlFor="modalLinkText" style={{ display: 'block', fontSize: '12px', marginBottom: '6px', color: '#a1a1aa' }}>
                  Teks Tautan (Kata yang dapat diklik):
                </label>
                <input
                  id="modalLinkText"
                  type="text"
                  className="form-input"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="Contoh: Baca Undang-Undang Lengkap"
                />
              </div>
              <div style={{ marginBottom: '18px' }}>
                <label htmlFor="modalLinkUrl" style={{ display: 'block', fontSize: '12px', marginBottom: '6px', color: '#a1a1aa' }}>
                  Alamat Tautan URL:
                </label>
                <input
                  id="modalLinkUrl"
                  type="url"
                  required
                  className="form-input"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setShowLinkModal(false)}
                >
                  Batal
                </button>
                <button type="submit" className="btn-gold">
                  Pasang Tautan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

