'use client'

import React, { useState, useRef, useCallback } from 'react'
import {
  processClientImageForUpload,
  validateClientImageFile,
  type ProcessedImageResult,
} from '@/lib/client-image'
import type { MediaAssetItem } from './ImageUploader'
import { ImageCropModal } from '@/components/admin/ImageCropModal'

export interface CasePhotoEntry {
  url: string
  caption?: string
  alt?: string
  // Status client internal
  id?: string
  status?: 'idle' | 'uploading' | 'success' | 'error'
  progress?: number
  errorMessage?: string
  retryFile?: File
}

export interface MultiPhotoUploaderProps {
  photos: CasePhotoEntry[]
  onChange: (photos: CasePhotoEntry[]) => void
  csrfToken: string
  maxPhotos?: number
  mediaAssets?: MediaAssetItem[]
  disabled?: boolean
}

export function MultiPhotoUploader({
  photos,
  onChange,
  csrfToken,
  maxPhotos = 10,
  mediaAssets = [],
  disabled = false,
}: MultiPhotoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [showMediaPicker, setShowMediaPicker] = useState(false)
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [cropModalTarget, setCropModalTarget] = useState<{
    photoId?: string
    source: File | string
    isRecrop: boolean
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Pastikan setiap foto memiliki id unik untuk tracking React key
  const normalizedPhotos: CasePhotoEntry[] = photos.map((p, idx) => ({
    ...p,
    id: p.id || `photo-${idx}-${p.url.slice(-10)}`,
    status: p.status || 'success',
  }))

  const uploadProcessedBlob = useCallback(
    async (
      processed: ProcessedImageResult,
      altText: string,
      onProgress?: (pct: number) => void,
    ): Promise<string> => {
      const formData = new FormData()
      formData.append('file', processed.blob, processed.filename)
      formData.append('altText', altText)

      return new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', '/api/admin/upload')
        xhr.setRequestHeader('x-csrf-token', csrfToken)

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && onProgress) {
            onProgress(Math.round((e.loaded / e.total) * 100))
          }
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const res = JSON.parse(xhr.responseText)
              if (res.ok && res.asset?.url) {
                resolve(res.asset.url)
                return
              }
              reject(new Error(res.error || 'Server tidak mengembalikan URL foto.'))
            } catch {
              reject(new Error('Respons server tidak valid.'))
            }
          } else {
            try {
              const res = JSON.parse(xhr.responseText)
              reject(new Error(res.error || `Unggah gagal (kode ${xhr.status}).`))
            } catch {
              reject(new Error(`Unggah gagal (kode ${xhr.status}).`))
            }
          }
        }

        xhr.onerror = () => {
          reject(new Error('Koneksi terputus saat mengunggah foto.'))
        }

        xhr.send(formData)
      })
    },
    [csrfToken],
  )

  const uploadSingleFile = useCallback(
    async (file: File, photoId: string): Promise<string> => {
      // 1. Resize di browser & bersihkan metadata GPS/EXIF
      const processed = await processClientImageForUpload(file)
      // 2. Upload via XMLHttpRequest untuk pelacakan progress
      return uploadProcessedBlob(
        processed,
        file.name.replace(/\.[^/.]+$/, ''),
        (pct) => {
          onChange(
            normalizedPhotos.map((item) =>
              item.id === photoId ? { ...item, progress: pct } : item,
            ),
          )
        },
      )
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [uploadProcessedBlob, photos],
  )

  const processQueue = useCallback(
    async (newEntries: CasePhotoEntry[], currentList: CasePhotoEntry[]) => {
      let workingList = [...currentList, ...newEntries]
      onChange(workingList)

      for (const entry of newEntries) {
        if (!entry.retryFile) continue

        // Update status menjadi sedang mengunggah
        workingList = workingList.map((item) =>
          item.id === entry.id
            ? { ...item, status: 'uploading', progress: 0, errorMessage: undefined }
            : item,
        )
        onChange(workingList)

        try {
          const finalUrl = await uploadSingleFile(entry.retryFile, entry.id!)
          workingList = workingList.map((item) =>
            item.id === entry.id
              ? {
                  ...item,
                  url: finalUrl,
                  status: 'success',
                  progress: 100,
                  retryFile: undefined,
                }
              : item,
          )
          onChange(workingList)
        } catch (err) {
          const errMsg =
            err instanceof Error ? err.message : 'Terjadi kendala saat mengunggah.'
          workingList = workingList.map((item) =>
            item.id === entry.id
              ? { ...item, status: 'error', errorMessage: errMsg }
              : item,
          )
          onChange(workingList)
        }
      }
    },
    [onChange, uploadSingleFile],
  )

  const handleIncomingFiles = useCallback(
    (files: FileList | File[]) => {
      setGeneralError(null)
      const fileArray = Array.from(files)
      if (fileArray.length === 0) return

      const remainingSlots = maxPhotos - normalizedPhotos.length
      if (remainingSlots <= 0) {
        setGeneralError(`Maksimal ${maxPhotos} foto dokumentasi per perkara.`)
        return
      }

      const filesToProcess = fileArray.slice(0, remainingSlots)
      if (fileArray.length > remainingSlots) {
        setGeneralError(
          `Hanya ${remainingSlots} foto pertama yang ditambahkan karena batas maksimal adalah ${maxPhotos} foto.`,
        )
      }

      // Jika hanya 1 foto dipilih, buka jendela potong terlebih dahulu
      if (filesToProcess.length === 1 && filesToProcess[0]) {
        try {
          validateClientImageFile(filesToProcess[0])
          setCropModalTarget({ source: filesToProcess[0], isRecrop: false })
          return
        } catch (err) {
          setGeneralError(
            err instanceof Error ? err.message : 'Format atau ukuran foto tidak dapat diproses.',
          )
          return
        }
      }

      const newEntries: CasePhotoEntry[] = filesToProcess.map((file, idx) => ({
        id: `upload-${Date.now()}-${idx}`,
        url: '',
        caption: '',
        alt: file.name.replace(/\.[^/.]+$/, ''),
        status: 'uploading',
        progress: 0,
        retryFile: file,
      }))

      processQueue(newEntries, normalizedPhotos)
    },
    [maxPhotos, normalizedPhotos, processQueue],
  )

  const handleCroppedUpload = useCallback(
    async (processed: ProcessedImageResult, targetPhotoId?: string) => {
      const targetId = targetPhotoId || `upload-${Date.now()}-0`
      const baseAlt = processed.filename.replace(/\.[^/.]+$/, '')

      let workingList: CasePhotoEntry[]
      if (targetPhotoId) {
        workingList = normalizedPhotos.map((p) =>
          p.id === targetPhotoId ? { ...p, status: 'uploading', progress: 0, errorMessage: undefined } : p,
        )
      } else {
        workingList = [
          ...normalizedPhotos,
          {
            id: targetId,
            url: '',
            caption: '',
            alt: baseAlt,
            status: 'uploading',
            progress: 0,
          },
        ]
      }
      onChange(workingList)

      try {
        const finalUrl = await uploadProcessedBlob(processed, baseAlt, (pct) => {
          onChange(
            workingList.map((p) => (p.id === targetId ? { ...p, progress: pct } : p)),
          )
        })
        onChange(
          workingList.map((p) =>
            p.id === targetId
              ? { ...p, url: finalUrl, status: 'success', progress: 100, errorMessage: undefined }
              : p,
          ),
        )
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Gagal mengunggah hasil potongan.'
        onChange(
          workingList.map((p) =>
            p.id === targetId ? { ...p, status: 'error', errorMessage: errMsg } : p,
          ),
        )
      }
    },
    [normalizedPhotos, onChange, uploadProcessedBlob],
  )

  const handleRetrySingle = async (photoId: string) => {
    const target = normalizedPhotos.find((p) => p.id === photoId)
    if (!target || !target.retryFile) return

    onChange(
      normalizedPhotos.map((p) =>
        p.id === photoId
          ? { ...p, status: 'uploading', progress: 0, errorMessage: undefined }
          : p,
      ),
    )

    try {
      const finalUrl = await uploadSingleFile(target.retryFile, photoId)
      onChange(
        normalizedPhotos.map((p) =>
          p.id === photoId
            ? {
                ...p,
                url: finalUrl,
                status: 'success',
                progress: 100,
                retryFile: undefined,
                errorMessage: undefined,
              }
            : p,
        ),
      )
    } catch (err) {
      const errMsg =
        err instanceof Error ? err.message : 'Gagal mencoba ulang unggah.'
      onChange(
        normalizedPhotos.map((p) =>
          p.id === photoId
            ? { ...p, status: 'error', errorMessage: errMsg }
            : p,
        ),
      )
    }
  }

  const handleRemovePhoto = (photoId: string) => {
    onChange(normalizedPhotos.filter((p) => p.id !== photoId))
  }

  const handleMove = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= normalizedPhotos.length) return
    const updated = [...normalizedPhotos]
    const [moved] = updated.splice(fromIndex, 1)
    if (moved) {
      updated.splice(toIndex, 0, moved)
      onChange(updated)
    }
  }

  const handleCaptionChange = (photoId: string, caption: string) => {
    onChange(
      normalizedPhotos.map((p) =>
        p.id === photoId ? { ...p, caption, alt: caption || p.alt } : p,
      ),
    )
  }

  return (
    <div style={{ marginBottom: '20px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: '6px',
        }}
      >
        <label className="form-label" style={{ marginBottom: 0 }}>
          Foto Dokumentasi Perkara ({normalizedPhotos.length}/{maxPhotos})
        </label>
        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
          Foto pertama otomatis menjadi foto sampul
        </span>
      </div>

      {/* Pengingat Privasi Ramah */}
      <div
        style={{
          backgroundColor: 'rgba(197, 168, 128, 0.08)',
          borderLeft: '4px solid var(--color-gold)',
          padding: '10px 14px',
          borderRadius: '4px',
          fontSize: '13px',
          color: 'var(--color-text-muted)',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span>🔒</span>
        <span>
          <strong>Pengingat Kerahasiaan:</strong> Pastikan wajah pihak terkait dan dokumen sensitif
          pada foto sudah disamarkan, atau telah ada izin tertulis dari klien.
        </span>
      </div>

      {/* Pesan Kesalahan Umum */}
      {generalError && (
        <div
          className="admin-notice"
          style={{
            backgroundColor: '#fef2f2',
            borderColor: '#f87171',
            color: '#991b1b',
            marginBottom: '10px',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '13px',
          }}
        >
          {generalError}
        </div>
      )}

      {/* Hidden File Input (multiple) */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,.heic,.heif"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files) handleIncomingFiles(e.target.files)
          e.target.value = ''
        }}
        disabled={disabled}
      />

      {/* Grid Foto Dokumentasi */}
      {normalizedPhotos.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '12px',
            marginBottom: '14px',
          }}
        >
          {normalizedPhotos.map((photo, idx) => {
            const isCover = idx === 0
            const isUploading = photo.status === 'uploading'
            const isError = photo.status === 'error'

            return (
              <div
                key={photo.id}
                style={{
                  border: isCover
                    ? '2px solid var(--color-gold)'
                    : '1px solid var(--color-border)',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                }}
              >
                {/* Badge Sampul */}
                {isCover && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '6px',
                      left: '6px',
                      backgroundColor: 'var(--color-gold)',
                      color: '#000',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      zIndex: 2,
                    }}
                  >
                    ★ FOTO SAMPUL
                  </div>
                )}

                {/* Badge Nomor Urut */}
                <div
                  style={{
                    position: 'absolute',
                    top: '6px',
                    right: '6px',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    color: '#fff',
                    fontSize: '11px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    zIndex: 2,
                  }}
                >
                  #{idx + 1}
                </div>

                {/* Thumbnail Stage */}
                <div
                  style={{
                    height: '140px',
                    backgroundColor: '#111',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isUploading ? (
                    <div style={{ textAlign: 'center', padding: '12px', width: '80%' }}>
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--color-gold)',
                          marginBottom: '6px',
                        }}
                      >
                        Mengunggah... {photo.progress || 0}%
                      </div>
                      <div
                        style={{
                          height: '4px',
                          background: 'rgba(255,255,255,0.1)',
                          borderRadius: '2px',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${photo.progress || 10}%`,
                            background: 'var(--color-gold)',
                            borderRadius: '2px',
                          }}
                        />
                      </div>
                    </div>
                  ) : isError ? (
                    <div style={{ textAlign: 'center', padding: '10px' }}>
                      <div style={{ color: '#ef4444', fontSize: '12px', marginBottom: '6px' }}>
                        ⚠️ Gagal diunggah
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: 'var(--color-text-muted)',
                          marginBottom: '8px',
                          maxHeight: '40px',
                          overflow: 'hidden',
                        }}
                      >
                        {photo.errorMessage || 'Kendala koneksi'}
                      </div>
                      <button
                        type="button"
                        className="btn-outline"
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                        onClick={() => handleRetrySingle(photo.id!)}
                      >
                        Coba Lagi
                      </button>
                    </div>
                  ) : photo.url ? (
                    <img
                      src={photo.url}
                      alt={photo.caption || photo.alt || 'Dokumentasi'}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      loading="lazy"
                    />
                  ) : (
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      Memproses...
                    </div>
                  )}
                </div>

                {/* Input Keterangan Foto */}
                <div style={{ padding: '10px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontSize: '12px', padding: '6px 8px', marginBottom: '8px' }}
                    placeholder="Keterangan foto (opsional)..."
                    value={photo.caption || ''}
                    onChange={(e) => handleCaptionChange(photo.id!, e.target.value)}
                    disabled={disabled || isUploading}
                  />

                  {/* Navigasi Naik / Turun & Hapus */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: 'auto',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        className="btn-outline"
                        style={{ padding: '2px 8px', fontSize: '12px' }}
                        onClick={() => handleMove(idx, idx - 1)}
                        disabled={disabled || idx === 0 || isUploading}
                        title="Geser ke kiri / naikkan urutan"
                        aria-label={`Geser foto ${idx + 1} ke atas`}
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        className="btn-outline"
                        style={{ padding: '2px 8px', fontSize: '12px' }}
                        onClick={() => handleMove(idx, idx + 1)}
                        disabled={disabled || idx === normalizedPhotos.length - 1 || isUploading}
                        title="Geser ke kanan / turunkan urutan"
                        aria-label={`Geser foto ${idx + 1} ke bawah`}
                      >
                        ▼
                      </button>
                      {photo.url && !isUploading && (
                        <button
                          type="button"
                          className="btn-outline"
                          style={{
                            padding: '2px 8px',
                            fontSize: '11px',
                            borderColor: 'var(--color-gold)',
                            color: 'var(--color-gold)',
                          }}
                          onClick={() =>
                            setCropModalTarget({
                              photoId: photo.id,
                              source: photo.url,
                              isRecrop: true,
                            })
                          }
                          disabled={disabled}
                          title="Memotong ulang tidak mengembalikan bagian yang sudah terbuang. Unggah ulang foto asli bila ingin area lebih luas."
                        >
                          Atur Posisi
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: '12px',
                        padding: '2px 6px',
                      }}
                      onClick={() => handleRemovePhoto(photo.id!)}
                      disabled={disabled || isUploading}
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Dropzone Tambah Banyak Foto */}
      {normalizedPhotos.length < maxPhotos && (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (!disabled) setIsDragging(true)
          }}
          onDragLeave={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setIsDragging(false)
          }}
          onDrop={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setIsDragging(false)
            if (!disabled && e.dataTransfer.files) {
              handleIncomingFiles(e.dataTransfer.files)
            }
          }}
          style={{
            border: isDragging
              ? '2px dashed var(--color-gold)'
              : '2px dashed var(--color-border)',
            borderRadius: '8px',
            padding: '20px 16px',
            textAlign: 'center',
            backgroundColor: isDragging
              ? 'rgba(197, 168, 128, 0.08)'
              : 'rgba(255, 255, 255, 0.01)',
            transition: 'border-color 0.2s, background-color 0.2s',
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '6px' }}>📁</div>
          <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>
            Tambah Foto Dokumentasi
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '10px' }}>
            Bisa pilih beberapa file foto sekaligus (JPG, PNG, atau WebP, maks 5 MB per foto)
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button
              type="button"
              className="btn-gold"
              style={{ padding: '6px 14px', fontSize: '13px' }}
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
            >
              Pilih Foto
            </button>
            {mediaAssets && mediaAssets.length > 0 && (
              <button
                type="button"
                className="btn-outline"
                style={{ padding: '6px 14px', fontSize: '13px' }}
                onClick={() => setShowMediaPicker(true)}
                disabled={disabled}
              >
                Pilih dari Pustaka
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal Dialog Pemilih dari Pustaka Foto */}
      {showMediaPicker && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="multiPickerTitle"
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
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h3 id="multiPickerTitle" style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
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
                  }}
                  onClick={() => {
                    const remainingSlots = maxPhotos - normalizedPhotos.length
                    if (remainingSlots > 0) {
                      onChange([
                        ...normalizedPhotos,
                        {
                          id: `picked-${Date.now()}-${asset.id}`,
                          url: asset.url,
                          caption: asset.altText || '',
                          alt: asset.altText || 'Dokumentasi perkara',
                          status: 'success',
                        },
                      ])
                    }
                    setShowMediaPicker(false)
                  }}
                >
                  <div style={{ width: '100%', height: '90px', background: '#09090b' }}>
                    <img
                      src={asset.url}
                      alt={asset.altText || 'Foto'}
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

      {/* Modal Pemotongan Foto Rekam Jejak */}
      <ImageCropModal
        isOpen={Boolean(cropModalTarget)}
        source={cropModalTarget?.source ?? null}
        preset="case-record"
        isRecrop={Boolean(cropModalTarget?.isRecrop)}
        onCancel={() => setCropModalTarget(null)}
        onApplyCrop={(processed) => {
          const targetId = cropModalTarget?.photoId
          setCropModalTarget(null)
          handleCroppedUpload(processed, targetId)
        }}
        onUseOriginal={(processed) => {
          const targetId = cropModalTarget?.photoId
          setCropModalTarget(null)
          handleCroppedUpload(processed, targetId)
        }}
      />
    </div>
  )
}
