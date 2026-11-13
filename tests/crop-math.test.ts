import { describe, expect, it } from 'vitest'
import {
  calculateCropRect,
  checkCropResolutionWarning,
  computeSafeWorkingDimensions,
  computeSecondaryArticleCardVisibleFraction,
  CROP_PRESET_CONFIGS,
  SECONDARY_ARTICLE_CARD_ESTIMATED_HEIGHT_PX,
  SECONDARY_ARTICLE_CARD_WIDTH_PX,
} from '@/lib/crop-math'

describe('Image Crop Geometry & Safe Area Helpers', () => {
  it('calculates actual small homepage article card visible width fraction from 150px card ratio', () => {
    const fraction = computeSecondaryArticleCardVisibleFraction(
      16 / 9,
      SECONDARY_ARTICLE_CARD_WIDTH_PX,
      SECONDARY_ARTICLE_CARD_ESTIMATED_HEIGHT_PX,
    )
    // 150 / 165 = 0.90909; 0.90909 / (16/9) = 0.51136
    expect(fraction).toBeCloseTo(0.5114, 3)
    expect(CROP_PRESET_CONFIGS['article-cover'].safeArea?.label).toBe(
      'Area yang tampil di kartu kecil',
    )
    expect(CROP_PRESET_CONFIGS['article-cover'].safeArea?.widthFraction).toBeCloseTo(0.5114, 3)
  })

  it('computes exact cover scale and clamps pan within image bounds', () => {
    // 1600x900 (16:9) inside 400x500 (4:5 portrait) frame
    const res = calculateCropRect({
      sourceWidth: 1600,
      sourceHeight: 900,
      frameWidth: 400,
      frameHeight: 500,
      zoom: 1,
      panX: 9999, // excessive pan should be clamped
      panY: -9999,
      maxOutputDimension: 1600,
    })

    // baseScale = max(400/1600, 500/900) = 500/900 = 0.5555...
    expect(res.scale).toBeCloseTo(500 / 900, 5)
    expect(res.renderedHeight).toBeCloseTo(500, 1)
    expect(res.renderedWidth).toBeCloseTo(1600 * (500 / 900), 1)
    // Vertical pan must be 0 since renderedHeight == frameHeight
    expect(res.maxPanY).toBe(0)
    expect(res.clampedPanY).toBe(0)
    // Horizontal pan clamped to maxPanX
    expect(res.clampedPanX).toBeCloseTo(res.maxPanX, 4)
    expect(res.sw).toBeCloseTo(720, 0) // 400 / (500/900) = 720
    expect(res.sh).toBeCloseTo(900, 0)
  })

  it('caps exported crop output at 1600px on the longest side', () => {
    const res = calculateCropRect({
      sourceWidth: 2400,
      sourceHeight: 1350,
      frameWidth: 480,
      frameHeight: 270,
      zoom: 1,
      panX: 0,
      panY: 0,
      maxOutputDimension: 1600,
    })

    expect(res.sw).toBeCloseTo(2400, 0)
    expect(res.sh).toBeCloseTo(1350, 0)
    expect(res.outputWidth).toBe(1600)
    expect(res.outputHeight).toBe(900)
  })

  it('scales zoom pan coordinates proportionally without exposing blank borders', () => {
    const res = calculateCropRect({
      sourceWidth: 1600,
      sourceHeight: 900,
      frameWidth: 480,
      frameHeight: 270,
      zoom: 2,
      panX: 0,
      panY: 0,
      maxOutputDimension: 1600,
    })

    // At 2x zoom centered, cropped region is 800x450 starting at (400, 225)
    expect(res.sx).toBeCloseTo(400, 0)
    expect(res.sy).toBeCloseTo(225, 0)
    expect(res.sw).toBeCloseTo(800, 0)
    expect(res.sh).toBeCloseTo(450, 0)
    expect(res.outputWidth).toBe(800)
    expect(res.outputHeight).toBe(450)
  })

  it('shows friendly sharpness warning when cropped source is smaller than frame recommendation', () => {
    const smallWarn = checkCropResolutionWarning(500, 281, 'article-cover')
    expect(smallWarn).toBe('Foto ini kecil, hasilnya mungkin kurang tajam.')

    const sharpOk = checkCropResolutionWarning(1200, 675, 'article-cover')
    expect(sharpOk).toBeNull()

    const teamSmall = checkCropResolutionWarning(400, 500, 'team-photo')
    expect(teamSmall).toBe('Foto ini kecil, hasilnya mungkin kurang tajam.')

    const teamOk = checkCropResolutionWarning(600, 750, 'team-photo')
    expect(teamOk).toBeNull()
  })

  it('pre-scales huge mobile camera resolutions down to safe 2400px working canvas', () => {
    const landscapeBig = computeSafeWorkingDimensions(4032, 3024, 2400)
    expect(landscapeBig.downscaled).toBe(true)
    expect(landscapeBig.width).toBe(2400)
    expect(landscapeBig.height).toBe(1800)

    const portraitBig = computeSafeWorkingDimensions(3024, 4032, 2400)
    expect(portraitBig.downscaled).toBe(true)
    expect(portraitBig.width).toBe(1800)
    expect(portraitBig.height).toBe(2400)

    const normal = computeSafeWorkingDimensions(1600, 900, 2400)
    expect(normal.downscaled).toBe(false)
    expect(normal.width).toBe(1600)
    expect(normal.height).toBe(900)
  })
})

