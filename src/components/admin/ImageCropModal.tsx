'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  calculateCropRect,
  checkCropResolutionWarning,
  CROP_PRESET_CONFIGS,
  type CropRatioOptionId,
  type ImageCropPreset,
} from '@/lib/crop-math'
import {
  loadSafeImageForCrop,
  processClientImageForUpload,
  renderCroppedImageForUpload,
  type LoadedCropSource,
  type ProcessedImageResult,
} from '@/lib/client-image'

export interface ImageCropModalProps {
  isOpen: boolean
  source: File | string | null
  preset: ImageCropPreset
  isRecrop?: boolean
  onCancel: () => void
  onApplyCrop: (processed: ProcessedImageResult) => void
  onUseOriginal?: (processed: ProcessedImageResult) => void
}

export function ImageCropModal({
  isOpen,
  source,
  preset,
  isRecrop = false,
  onCancel,
  onApplyCrop,
  onUseOriginal,
}: ImageCropModalProps) {
  const config = CROP_PRESET_CONFIGS[preset]

  const [loaded, setLoaded] = useState<LoadedCropSource | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const [ratioId, setRatioId] = useState<CropRatioOptionId>(config.defaultRatioId)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [showGuides, setShowGuides] = useState(true)
  const [viewportWidthLimit, setViewportWidthLimit] = useState(460)

  // Pointer tracking for drag & 2-finger pinch zoom
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)
  const pinchStartRef = useRef<{ dist: number; zoom: number } | null>(null)

  // Reset ratio when preset changes
  useEffect(() => {
    setRatioId(CROP_PRESET_CONFIGS[preset].defaultRatioId)
  }, [preset])

  // Responsive frame sizing for small mobile screens (e.g., 360px)
  useEffect(() => {
    const updateWidth = () => {
      if (typeof window !== 'undefined') {
        setViewportWidthLimit(Math.min(460, Math.max(240, window.innerWidth - 64)))
      }
    }
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  // Load image safely whenever modal opens with a new source
  useEffect(() => {
    if (!isOpen || !source) {
      return
    }

    let cancelled = false
    let currentLoaded: LoadedCropSource | null = null

    setIsLoading(true)
    setLoadError(null)
    setZoom(1)
    setPan({ x: 0, y: 0 })

    loadSafeImageForCrop(source)
      .then((result) => {
        if (cancelled) {
          result.cleanup()
          return
        }
        currentLoaded = result
        setLoaded(result)
        setIsLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setLoadError(err instanceof Error ? err.message : 'Gagal memuat foto untuk dipotong.')
        setIsLoading(false)
      })

    return () => {
      cancelled = true
      if (currentLoaded) {
        currentLoaded.cleanup()
      }
      setLoaded(null)
    }
  }, [isOpen, source])

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isExporting) {
        onCancel()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, isExporting, onCancel])

  const selectedRatioOption = useMemo(() => {
    return (
      config.ratioOptions.find((opt) => opt.id === ratioId) ??
      config.ratioOptions[0] ?? { id: 'free' as CropRatioOptionId, label: 'Bebas / Asli', ratio: null }
    )
  }, [config.ratioOptions, ratioId])

  const effectiveRatio = useMemo(() => {
    if (selectedRatioOption.ratio !== null) {
      return selectedRatioOption.ratio
    }
    if (loaded && loaded.width > 0 && loaded.height > 0) {
      return loaded.width / loaded.height
    }
    return 16 / 9
  }, [selectedRatioOption.ratio, loaded])

  const frameSize = useMemo(() => {
    const maxW = viewportWidthLimit
    const maxH = 300
    let w = maxW
    let h = w / effectiveRatio
    if (h > maxH) {
      h = maxH
      w = h * effectiveRatio
    }
    return { width: Math.round(w), height: Math.round(h) }
  }, [viewportWidthLimit, effectiveRatio])

  const cropMath = useMemo(() => {
    if (!loaded) {
      return null
    }
    return calculateCropRect({
      sourceWidth: loaded.width,
      sourceHeight: loaded.height,
      frameWidth: frameSize.width,
      frameHeight: frameSize.height,
      zoom,
      panX: pan.x,
      panY: pan.y,
      maxOutputDimension: 1600,
    })
  }, [loaded, frameSize.width, frameSize.height, zoom, pan.x, pan.y])

  const resolutionWarning = useMemo(() => {
    if (!cropMath) return null
    return checkCropResolutionWarning(cropMath.sw, cropMath.sh, preset)
  }, [cropMath, preset])

  // Pointer handlers (drag + pinch zoom)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!loaded || isExporting) return
    e.currentTarget.setPointerCapture(e.pointerId)
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (activePointersRef.current.size === 1) {
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        panX: cropMath ? cropMath.clampedPanX : pan.x,
        panY: cropMath ? cropMath.clampedPanY : pan.y,
      }
      pinchStartRef.current = null
    } else if (activePointersRef.current.size === 2) {
      const pts = Array.from(activePointersRef.current.values())
      if (pts[0] && pts[1]) {
        const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
        pinchStartRef.current = { dist: Math.max(1, dist), zoom }
        dragStartRef.current = null
      }
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!loaded || !cropMath) return
    if (!activePointersRef.current.has(e.pointerId)) return
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (activePointersRef.current.size === 2 && pinchStartRef.current) {
      const pts = Array.from(activePointersRef.current.values())
      if (pts[0] && pts[1]) {
        const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
        const nextZoom = Math.max(1, Math.min(3, pinchStartRef.current.zoom * (dist / pinchStartRef.current.dist)))
        setZoom(Number(nextZoom.toFixed(2)))
      }
    } else if (activePointersRef.current.size === 1 && dragStartRef.current) {
      const dx = e.clientX - dragStartRef.current.x
      const dy = e.clientY - dragStartRef.current.y
      setPan({
        x: Math.max(-cropMath.maxPanX, Math.min(cropMath.maxPanX, dragStartRef.current.panX + dx)),
        y: Math.max(-cropMath.maxPanY, Math.min(cropMath.maxPanY, dragStartRef.current.panY + dy)),
      })
    }
  }

  const handlePointerUpOrCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    activePointersRef.current.delete(e.pointerId)
    if (activePointersRef.current.size < 2) {
      pinchStartRef.current = null
    }
    if (activePointersRef.current.size === 0) {
      dragStartRef.current = null
    }
  }

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!loaded || isExporting) return
    e.preventDefault()
    const delta = e.deltaY < 0 ? 0.1 : -0.1
    setZoom((prev) => Number(Math.max(1, Math.min(3, prev + delta)).toFixed(2)))
  }

  const handleViewportKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!cropMath || isExporting) return
    const step = e.shiftKey ? 24 : 8
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      setPan((p) => ({ ...p, x: Math.max(-cropMath.maxPanX, p.x - step) }))
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      setPan((p) => ({ ...p, x: Math.min(cropMath.maxPanX, p.x + step) }))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setPan((p) => ({ ...p, y: Math.max(-cropMath.maxPanY, p.y - step) }))
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setPan((p) => ({ ...p, y: Math.min(cropMath.maxPanY, p.y + step) }))
    } else if (e.key === '+' || e.key === '=') {
      e.preventDefault()
      setZoom((z) => Number(Math.min(3, z + 0.1).toFixed(2)))
    } else if (e.key === '-') {
      e.preventDefault()
      setZoom((z) => Number(Math.max(1, z - 0.1).toFixed(2)))
    }
  }

  const handleReset = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  const handleApply = async () => {
    if (!loaded || !cropMath || isExporting) return
    setIsExporting(true)
    setLoadError(null)
    try {
      const processed = await renderCroppedImageForUpload(
        loaded.sourceElement,
        {
          sx: cropMath.sx,
          sy: cropMath.sy,
          sw: cropMath.sw,
          sh: cropMath.sh,
          outputWidth: cropMath.outputWidth,
          outputHeight: cropMath.outputHeight,
        },
        loaded.originalFilename,
      )
      onApplyCrop(processed)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Gagal memproses potongan foto.')
    } finally {
      setIsExporting(false)
    }
  }

  const handleUseOriginalClick = async () => {
    if (!(source instanceof File) || !onUseOriginal || isExporting) return
    setIsExporting(true)
    setLoadError(null)
    try {
      const processed = await processClientImageForUpload(source)
      onUseOriginal(processed)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Gagal memproses foto asli.')
    } finally {
      setIsExporting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cropModalTitle"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.88)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
      }}
    >
      <div
        style={{
          backgroundColor: '#121216',
          border: '1px solid rgba(212, 175, 55, 0.45)',
          borderRadius: '10px',
          width: '100%',
          maxWidth: '640px',
          maxHeight: '95vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0,0,0,0.8)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid #27272a',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div>
            <h3 id="cropModalTitle" style={{ margin: 0, fontSize: '16px', color: 'var(--color-gold, #d4af37)' }}>
              {config.title}
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#a1a1aa' }}>
              Geser foto untuk mengatur posisi atau perbesar dengan penggeser di bawah.
            </p>
          </div>
          <button
            type="button"
            className="btn-outline"
            style={{ padding: '4px 10px', fontSize: '12px' }}
            onClick={onCancel}
            disabled={isExporting}
          >
            ✕ Tutup
          </button>
        </div>

        {/* Scrollable Content */}
        <div style={{ padding: '16px 18px', overflowY: 'auto', flex: 1 }}>
          {isRecrop && (
            <div
              style={{
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.35)',
                borderRadius: '6px',
                padding: '10px 12px',
                marginBottom: '12px',
                fontSize: '12px',
                color: '#bfdbfe',
                lineHeight: 1.5,
              }}
            >
              <strong>Catatan:</strong> Memotong ulang tidak mengembalikan bagian foto yang sudah terbuang. Unggah ulang foto asli dari perangkat Anda jika ingin area yang lebih luas.
            </div>
          )}

          {loadError && (
            <div
              role="alert"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.45)',
                borderRadius: '6px',
                padding: '12px',
                marginBottom: '12px',
                fontSize: '13px',
                color: '#fca5a5',
              }}
            >
              {loadError}
            </div>
          )}

          {isLoading ? (
            <div style={{ padding: '48px 16px', textAlign: 'center', color: '#a1a1aa', fontSize: '14px' }}>
              Memuat dan menyesuaikan orientasi foto...
            </div>
          ) : loaded && cropMath ? (
            <div>
              {/* Ratio & Safe Area Toggle Row */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '10px',
                }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {config.ratioOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className={ratioId === opt.id ? 'btn-gold' : 'btn-outline'}
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                      onClick={() => {
                        setRatioId(opt.id)
                        setPan({ x: 0, y: 0 })
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {config.safeArea && (
                  <button
                    type="button"
                    className="btn-outline"
                    style={{ padding: '4px 10px', fontSize: '12px' }}
                    onClick={() => setShowGuides((v) => !v)}
                  >
                    {showGuides ? 'Sembunyikan Garis Bantu' : 'Tampilkan Garis Bantu'}
                  </button>
                )}
              </div>

              {/* Crop Viewport */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                <div
                  role="slider"
                  aria-label="Area pemotongan foto. Gunakan panah keyboard untuk menggeser dan tombol plus atau minus untuk memperbesar."
                  aria-valuemin={100}
                  aria-valuemax={300}
                  aria-valuenow={Math.round(zoom * 100)}
                  aria-valuetext={`Perbesaran ${Math.round(zoom * 100)}%`}
                  tabIndex={0}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUpOrCancel}
                  onPointerCancel={handlePointerUpOrCancel}
                  onWheel={handleWheel}
                  onKeyDown={handleViewportKeyDown}
                  style={{
                    position: 'relative',
                    width: `${frameSize.width}px`,
                    height: `${frameSize.height}px`,
                    overflow: 'hidden',
                    backgroundColor: '#050507',
                    border: '2px solid var(--color-gold, #d4af37)',
                    borderRadius: '6px',
                    cursor: 'grab',
                    touchAction: 'none',
                    userSelect: 'none',
                    outline: 'none',
                  }}
                >
                  <img
                    src={loaded.previewUrl}
                    alt="Pratinjau area potong"
                    draggable={false}
                    style={{
                      position: 'absolute',
                      width: `${cropMath.renderedWidth}px`,
                      height: `${cropMath.renderedHeight}px`,
                      left: `${(frameSize.width - cropMath.renderedWidth) / 2 + cropMath.clampedPanX}px`,
                      top: `${(frameSize.height - cropMath.renderedHeight) / 2 + cropMath.clampedPanY}px`,
                      maxWidth: 'none',
                      pointerEvents: 'none',
                    }}
                  />

                  {/* Safe Area Guides Overlay */}
                  {showGuides && config.safeArea && (
                    <div
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        pointerEvents: 'none',
                      }}
                    >
                      {config.safeArea.type === 'center-box' && config.safeArea.widthFraction && (
                        <>
                          <div
                            style={{
                              position: 'absolute',
                              top: 0,
                              bottom: 0,
                              left: `${((1 - config.safeArea.widthFraction) / 2) * 100}%`,
                              right: `${((1 - config.safeArea.widthFraction) / 2) * 100}%`,
                              borderLeft: '2px dashed rgba(250, 204, 21, 0.9)',
                              borderRight: '2px dashed rgba(250, 204, 21, 0.9)',
                              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.35)',
                            }}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              top: '6px',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              backgroundColor: 'rgba(0, 0, 0, 0.78)',
                              color: '#fde047',
                              fontSize: '10px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              whiteSpace: 'nowrap',
                              border: '1px solid rgba(250, 204, 21, 0.4)',
                            }}
                          >
                            {config.safeArea.label}
                          </div>
                        </>
                      )}

                      {config.safeArea.type === 'portrait-head-and-badge' && (
                        <>
                          <div
                            style={{
                              position: 'absolute',
                              left: 0,
                              right: 0,
                              top: '33%',
                              borderTop: '1px dashed rgba(250, 204, 21, 0.75)',
                            }}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              left: 0,
                              right: 0,
                              bottom: 0,
                              height: `${(config.safeArea.bottomReservedFraction ?? 0.16) * 100}%`,
                              backgroundColor: 'rgba(0, 0, 0, 0.45)',
                              borderTop: '2px dashed rgba(250, 204, 21, 0.85)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10px',
                              color: '#fde047',
                            }}
                          >
                            Area label nama
                          </div>
                        </>
                      )}

                      {config.safeArea.type === 'bottom-scrim' && (
                        <div
                          style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            bottom: 0,
                            height: `${(config.safeArea.bottomReservedFraction ?? 0.48) * 100}%`,
                            backgroundColor: 'rgba(0, 0, 0, 0.45)',
                            borderTop: '2px dashed rgba(250, 204, 21, 0.85)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            color: '#fde047',
                            textAlign: 'center',
                            padding: '0 8px',
                          }}
                        >
                          {config.safeArea.label}
                        </div>
                      )}

                      {config.safeArea.type === 'top-badges' && (
                        <div
                          style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            top: 0,
                            height: `${(config.safeArea.topReservedFraction ?? 0.16) * 100}%`,
                            backgroundColor: 'rgba(0, 0, 0, 0.38)',
                            borderBottom: '2px dashed rgba(250, 204, 21, 0.85)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            color: '#fde047',
                          }}
                        >
                          {config.safeArea.label}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {showGuides && config.safeArea?.hint && (
                <p style={{ margin: '0 0 10px 0', fontSize: '11px', color: '#a1a1aa', textAlign: 'center' }}>
                  {config.safeArea.hint}
                </p>
              )}

              {/* Zoom Slider */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '12px',
                  backgroundColor: '#18181b',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #27272a',
                }}
              >
                <span style={{ fontSize: '12px', color: '#d4d4d8', whiteSpace: 'nowrap' }}>Perbesar</span>
                <button
                  type="button"
                  className="btn-outline"
                  style={{ padding: '2px 8px', fontSize: '13px' }}
                  aria-label="Perkecil zoom"
                  onClick={() => setZoom((z) => Number(Math.max(1, z - 0.15).toFixed(2)))}
                >
                  −
                </button>
                <input
                  type="range"
                  aria-label="Tingkat perbesaran foto"
                  min={1}
                  max={3}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  style={{ flex: 1, accentColor: '#d4af37' }}
                />
                <button
                  type="button"
                  className="btn-outline"
                  style={{ padding: '2px 8px', fontSize: '13px' }}
                  aria-label="Perbesar zoom"
                  onClick={() => setZoom((z) => Number(Math.min(3, z + 0.15).toFixed(2)))}
                >
                  +
                </button>
                <span style={{ fontSize: '12px', color: '#a1a1aa', minWidth: '38px', textAlign: 'right' }}>
                  {Math.round(zoom * 100)}%
                </span>
              </div>

              {/* Resolution warning */}
              {resolutionWarning && (
                <div
                  role="status"
                  style={{
                    backgroundColor: 'rgba(245, 158, 11, 0.12)',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    marginBottom: '12px',
                    fontSize: '12px',
                    color: '#fcd34d',
                  }}
                >
                  ⚠️ {resolutionWarning}
                </div>
              )}

              {/* Live Site Frame Preview */}
              <div
                style={{
                  backgroundColor: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: '6px',
                  padding: '10px 12px',
                }}
              >
                <div style={{ fontSize: '11px', color: '#a1a1aa', marginBottom: '8px' }}>
                  Pratinjau di bingkai situs ({config.siteFrameDescription}):
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                  {/* Main Site Frame Preview */}
                  <div>
                    <div style={{ fontSize: '10px', color: '#71717a', marginBottom: '4px' }}>Bingkai Utama</div>
                    <div
                      style={{
                        position: 'relative',
                        width: effectiveRatio < 1 ? '64px' : '128px',
                        height: `${Math.round((effectiveRatio < 1 ? 64 : 128) / effectiveRatio)}px`,
                        overflow: 'hidden',
                        borderRadius: '4px',
                        border: '1px solid #3f3f46',
                        backgroundColor: '#09090b',
                      }}
                    >
                      <img
                        src={loaded.previewUrl}
                        alt=""
                        style={{
                          position: 'absolute',
                          width: `${(cropMath.renderedWidth / frameSize.width) * (effectiveRatio < 1 ? 64 : 128)}px`,
                          height: `${(cropMath.renderedHeight / frameSize.height) * ((effectiveRatio < 1 ? 64 : 128) / effectiveRatio)}px`,
                          left: `${(((frameSize.width - cropMath.renderedWidth) / 2 + cropMath.clampedPanX) / frameSize.width) * (effectiveRatio < 1 ? 64 : 128)}px`,
                          top: `${(((frameSize.height - cropMath.renderedHeight) / 2 + cropMath.clampedPanY) / frameSize.height) * ((effectiveRatio < 1 ? 64 : 128) / effectiveRatio)}px`,
                          maxWidth: 'none',
                        }}
                      />
                    </div>
                  </div>

                  {/* Secondary Homepage Small Card Preview for Article Cover */}
                  {preset === 'article-cover' && (
                    <div>
                      <div style={{ fontSize: '10px', color: '#71717a', marginBottom: '4px' }}>
                        Kartu Kecil Beranda (150×165)
                      </div>
                      <div
                        style={{
                          position: 'relative',
                          width: '64px',
                          height: '70px',
                          overflow: 'hidden',
                          borderRadius: '4px',
                          border: '1px solid rgba(250, 204, 21, 0.5)',
                          backgroundColor: '#09090b',
                        }}
                      >
                        {(() => {
                          // Map the cropped region to cover the 64x70 small card box
                          const scaleToSmall = Math.max(64 / cropMath.sw, 70 / cropMath.sh)
                          const smallImgW = loaded.width * scaleToSmall
                          const smallImgH = loaded.height * scaleToSmall
                          const smallLeft = (64 - cropMath.sw * scaleToSmall) / 2 - cropMath.sx * scaleToSmall
                          const smallTop = (70 - cropMath.sh * scaleToSmall) / 2 - cropMath.sy * scaleToSmall
                          return (
                            <img
                              src={loaded.previewUrl}
                              alt=""
                              style={{
                                position: 'absolute',
                                width: `${smallImgW}px`,
                                height: `${smallImgH}px`,
                                left: `${smallLeft}px`,
                                top: `${smallTop}px`,
                                maxWidth: 'none',
                              }}
                            />
                          )
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer Buttons */}
        <div
          style={{
            padding: '12px 18px',
            borderTop: '1px solid #27272a',
            backgroundColor: '#18181b',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div>
            {source instanceof File && onUseOriginal && (
              <button
                type="button"
                className="btn-outline"
                style={{ fontSize: '12px', padding: '6px 10px' }}
                disabled={isLoading || isExporting}
                onClick={handleUseOriginalClick}
              >
                Gunakan foto apa adanya (tanpa potong)
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-outline"
              style={{ fontSize: '13px', padding: '7px 12px' }}
              disabled={isLoading || isExporting || !loaded}
              onClick={handleReset}
            >
              Atur Ulang
            </button>
            <button
              type="button"
              className="btn-outline"
              style={{ fontSize: '13px', padding: '7px 12px' }}
              disabled={isExporting}
              onClick={onCancel}
            >
              Batal
            </button>
            <button
              type="button"
              className="btn-gold"
              style={{ fontSize: '13px', padding: '7px 16px' }}
              disabled={isLoading || isExporting || !loaded || !cropMath}
              onClick={handleApply}
            >
              {isExporting ? 'Memproses...' : 'Terapkan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
