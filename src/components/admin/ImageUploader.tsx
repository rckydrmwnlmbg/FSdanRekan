'use client'

import React, { useState, useRef, useCallback } from 'react'
import { processClientImageForUpload } from '@/lib/client-image'

export interface UploadedAssetData {
  url: string
  altText?: string
  width?: number
  height?: number
  mimeType?: string
}

export interface MediaAssetItem {
  id: string
  url: string
  filename?: string
  originalName?: string
  altText?: string
  createdAt?: string
}

export interface ImageUploaderProps {
  value: string
  altText?: string
  onUploadSuccess: (asset: UploadedAssetData) => void
  onRemove?: () => void
  csrfToken: string
  label?: string
  helperText?: string
  className?: string
  disabled?: boolean
  mediaAssets?: MediaAssetItem[]
  suggestedAlt?: string
}

export function ImageUploader({
  value,
  altText = '',
  onUploadSuccess,
  onRemove,
  csrfToken,
  label = 'Foto / Gambar',
  helperText = 'JPG, PNG, atau WebP, maksimal 5 MB',
  className = '',
  disabled = false,
  mediaAssets = [],
  suggestedAlt = '',
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showAdvancedUrl, setShowAdvancedUrl] = useState(false)
  const [showMediaPicker, setShowMediaPicker] = useState(false)
  const [imageLoadError, setImageLoadError] = useState(false)
  const [manualUrlInput, setManualUrlInput] = useState(value)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleFile = useCallback(
    async (file: File) => {
      setErrorMessage(null)
      setIsProcessing(true)
      setUploadProgress(0)

      try {
        // 1. Proses foto di browser: resize ke max 1600px, hapus GPS/EXIF, kompresi
        const processed = await processClientImageForUpload(file)

        // 2. Unggah menggunakan XMLHttpRequest untuk progress 0-100%
        const formData = new FormData()
        formData.append('file', processed.blob, processed.filename)
        const finalAlt = altText || suggestedAlt || file.name.replace(/\.[^/.]+$/, '')
        formData.append('altText', finalAlt)

        await new Promise<UploadedAssetData>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.open('POST', '/api/admin/upload')
          xhr.setRequestHeader('x-csrf-token', csrfToken)

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const pct = Math.round((event.loaded / event.total) * 100)
              setUploadProgress(pct)
            }
          }

          xhr.onload = () => {
            setIsProcessing(false)
            setUploadProgress(null)

            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const res = JSON.parse(xhr.responseText)
                if (res.ok && res.asset) {
                  const uploadedData: UploadedAssetData = {
                    url: res.asset.url,
                    altText: res.asset.altText || finalAlt,
                    width: processed.width,
                    height: processed.height,
                    mimeType: processed.mimeType,
                  }
                  setImageLoadError(false)
                  setManualUrlInput(res.asset.url)
                  onUploadSuccess(uploadedData)
                  resolve(uploadedData)
                  return
                }
                reject(new Error(res.error || 'Gagal menyimpan foto di server.'))
              } catch {
                reject(new Error('Respons server tidak dapat diproses.'))
              }
            } else {
              try {
                const res = JSON.parse(xhr.responseText)
                reject(new Error(res.error || `Gagal mengunggah foto (kode ${xhr.status}).`))
              } catch {
                reject(new Error(`Terjadi kendala saat mengunggah foto (kode ${xhr.status}).`))
              }
            }
          }

          xhr.onerror = () => {
            setIsProcessing(false)
            setUploadProgress(null)
            reject(new Error('Koneksi internet terputus saat mengunggah foto. Silakan coba lagi.'))
          }

          xhr.send(formData)
        })
      } catch (err) {
        setIsProcessing(false)
        setUploadProgress(null)
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'Terjadi kendala saat memproses atau mengunggah foto.',
        )
      }
    },
    [altText, csrfToken, onUploadSuccess, suggestedAlt],
  )

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled && !isProcessing) {
      setIsDragging(true)
    }
  }

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (disabled || isProcessing) return

    const droppedFiles = e.dataTransfer.files
    if (droppedFiles && droppedFiles.length > 0) {
      const targetFile = droppedFiles[0]
      if (targetFile) {
        handleFile(targetFile)
      }
    }
  }

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files
    if (selected && selected.length > 0) {
      const targetFile = selected[0]
      if (targetFile) {
        handleFile(targetFile)
      }
    }
    // Reset file input agar memilih file yang sama tetap memicu event
    e.target.value = ''
  }

  const applyManualUrl = () => {
    const trimmed = manualUrlInput.trim()
    if (!trimmed) return
    setImageLoadError(false)
    onUploadSuccess({
      url: trimmed,
      altText: altText || suggestedAlt || 'Foto konten',
    })
  }

  return (
    <div className={`form-group ${className}`} style={{ marginBottom: '16px' }}>
      {label && <label className="form-label">{label}</label>}

      {/* Area Pesan Kesalahan Ramah */}
      {errorMessage && (
        <div
          className="admin-notice"
          style={{
            backgroundColor: '#fef2f2',
            borderColor: '#f87171',
            color: '#991b1b',
            marginBottom: '10px',
            padding: '10px 14px',
            borderRadius: '6px',
            fontSize: '14px',
          }}
          role="alert"
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>⚠️</span>
            <div style={{ flex: 1 }}>{errorMessage}</div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              style={{
                background: 'none',
                border: 'none',
                color: '#991b1b',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
              aria-label="Tutup pesan"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Input File Tersembunyi */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,.heic,.heif"
        style={{ display: 'none' }}
        onChange={onFileInputChange}
        disabled={disabled || isProcessing}
      />

      {/* Tampilan Bila Sudah Ada Foto */}
      {value ? (
        <div
          style={{
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            padding: '12px',
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              flexWrap: 'wrap',
            }}
          >
            {/* Thumbnail Preview */}
            <div
              style={{
                width: '120px',
                height: '80px',
                borderRadius: '6px',
                overflow: 'hidden',
                background: '#1a1a1a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                border: '1px solid rgba(255,255,255,0.1)',
                position: 'relative',
              }}
            >
              {imageLoadError ? (
                <div
                  style={{
                    fontSize: '11px',
                    color: '#f87171',
                    textAlign: 'center',
                    padding: '4px',
                  }}
                >
                  Foto tidak dapat dimuat
                </div>
              ) : (
                <img
                  src={value}
                  alt={altText || 'Preview foto'}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                  onError={() => setImageLoadError(true)}
                  onLoad={() => setImageLoadError(false)}
                />
              )}
            </div>

            {/* Keterangan & Tombol Aksi */}
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div
                style={{
                  fontSize: '13px',
                  color: 'var(--color-text-muted)',
                  marginBottom: '8px',
                  wordBreak: 'break-all',
                }}
              >
                {value.startsWith('/uploads/') ? (
                  <span style={{ color: 'var(--color-gold)' }}>✓ Tersimpan di website</span>
                ) : (
                  <span>Tautan: {value}</span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-outline"
                  style={{ padding: '6px 12px', fontSize: '13px' }}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled || isProcessing}
                >
                  Ganti Foto
                </button>
                {mediaAssets && mediaAssets.length > 0 && (
                  <button
                    type="button"
                    className="btn-outline"
                    style={{ padding: '6px 12px', fontSize: '13px' }}
                    onClick={() => setShowMediaPicker(true)}
                    disabled={disabled || isProcessing}
                  >
                    Pilih dari Pustaka
                  </button>
                )}
                {onRemove && (
                  <button
                    type="button"
                    className="btn-outline"
                    style={{
                      padding: '6px 12px',
                      fontSize: '13px',
                      color: '#ef4444',
                      borderColor: '#ef4444',
                    }}
                    onClick={() => {
                      setImageLoadError(false)
                      setManualUrlInput('')
                      onRemove()
                    }}
                    disabled={disabled || isProcessing}
                  >
                    Hapus
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Dropzone Bila Belum Ada Foto */
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          style={{
            border: isDragging
              ? '2px dashed var(--color-gold)'
              : '2px dashed var(--color-border)',
            borderRadius: '8px',
            padding: '24px 16px',
            textAlign: 'center',
            backgroundColor: isDragging
              ? 'rgba(197, 168, 128, 0.08)'
              : 'rgba(255, 255, 255, 0.01)',
            transition: 'border-color 0.2s, background-color 0.2s',
          }}
        >
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>📸</div>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>
            {isProcessing ? 'Sedang memproses...' : 'Tarik dan letakkan foto ke sini'}
          </div>
          <div
            style={{
              fontSize: '12px',
              color: 'var(--color-text-muted)',
              marginBottom: '12px',
            }}
          >
            {helperText}
          </div>

          <div
            style={{
              display: 'flex',
              gap: '8px',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              className="btn-gold"
              style={{ padding: '6px 14px', fontSize: '13px' }}
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isProcessing}
            >
              Pilih Foto
            </button>
            {mediaAssets && mediaAssets.length > 0 && (
              <button
                type="button"
                className="btn-outline"
                style={{ padding: '6px 14px', fontSize: '13px' }}
                onClick={() => setShowMediaPicker(true)}
                disabled={disabled || isProcessing}
              >
                Pilih dari Pustaka
              </button>
            )}
          </div>
        </div>
      )}

      {/* Indikator Progres Unggah */}
      {isProcessing && (
        <div style={{ marginTop: '10px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '12px',
              marginBottom: '4px',
              color: 'var(--color-gold)',
            }}
          >
            <span>
              {uploadProgress !== null && uploadProgress > 0
                ? `Mengunggah foto... ${uploadProgress}%`
                : 'Menyiapkan dan membersihkan metadata foto...'}
            </span>
          </div>
          <div
            style={{
              height: '6px',
              width: '100%',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '3px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: uploadProgress !== null ? `${uploadProgress}%` : '50%',
                backgroundColor: 'var(--color-gold)',
                transition: 'width 0.2s ease',
              }}
            />
          </div>
        </div>
      )}

      {/* Opsi Lanjutan: Tautan Gambar Manual */}
      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          onClick={() => setShowAdvancedUrl(!showAdvancedUrl)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-text-muted)',
            fontSize: '12px',
            cursor: 'pointer',
            padding: 0,
            textDecoration: 'underline',
          }}
        >
          {showAdvancedUrl
            ? '▲ Sembunyikan opsi tautan gambar dari internet'
            : '▼ Opsi lanjutan: Gunakan tautan gambar dari internet'}
        </button>

        {showAdvancedUrl && (
          <div
            style={{
              marginTop: '8px',
              padding: '10px',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              backgroundColor: 'rgba(0, 0, 0, 0.15)',
            }}
          >
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="form-input"
                style={{ fontSize: '13px' }}
                placeholder="https://... atau /images/..."
                value={manualUrlInput}
                onChange={(e) => setManualUrlInput(e.target.value)}
              />
              <button
                type="button"
                className="btn-outline"
                style={{ padding: '6px 12px', fontSize: '13px', whiteSpace: 'nowrap' }}
                onClick={applyManualUrl}
              >
                Terapkan
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Dialog Pemilih dari Pustaka Foto */}
      {showMediaPicker && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="libraryPickerTitle"
          className="modal-overlay is-active"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <button
            type="button"
            aria-label="Tutup dialog pustaka"
            onClick={() => setShowMediaPicker(false)}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'transparent',
              border: 'none',
              cursor: 'default',
            }}
          />
          <div
            style={{
              position: 'relative',
              backgroundColor: '#18181b',
              border: '1px solid var(--color-border)',
              borderRadius: '10px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
              zIndex: 1,
            }}
          >
            {/* Header Modal */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h3 id="libraryPickerTitle" style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                Pilih Foto dari Pustaka
              </h3>
              <button
                type="button"
                onClick={() => setShowMediaPicker(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                }}
              >
                &times;
              </button>
            </div>

            {/* Isi Galeri Foto Pustaka */}
            <div
              style={{
                padding: '16px 20px',
                overflowY: 'auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: '12px',
              }}
            >
              {mediaAssets.map((asset) => (
                <button
                  type="button"
                  key={asset.id}
                  style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    background: '#27272a',
                    padding: 0,
                    textAlign: 'left',
                    color: 'inherit',
                    transition: 'transform 0.15s, border-color 0.15s',
                  }}
                  onClick={() => {
                    setImageLoadError(false)
                    setManualUrlInput(asset.url)
                    onUploadSuccess({
                      url: asset.url,
                      altText: asset.altText || suggestedAlt,
                    })
                    setShowMediaPicker(false)
                  }}
                >
                  <div style={{ width: '100%', height: '90px', background: '#09090b' }}>
                    <img
                      src={asset.url}
                      alt={asset.altText || asset.filename || 'Foto'}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      loading="lazy"
                    />
                  </div>
                  <div
                    style={{
                      padding: '6px 8px',
                      fontSize: '11px',
                      color: 'var(--color-text-muted)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {asset.originalName || asset.filename || 'Foto'}
                  </div>
                </button>
              ))}
            </div>

            {/* Footer Modal */}
            <div
              style={{
                padding: '12px 20px',
                borderTop: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <button
                type="button"
                className="btn-outline"
                style={{ padding: '6px 14px', fontSize: '13px' }}
                onClick={() => setShowMediaPicker(false)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
