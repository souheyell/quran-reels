import type { ReelConfig, Verse } from '../types'
import { drawBackground, getTransform } from './kenburns'
import { drawAtmosphericEffect } from './effects'
import { drawBorder } from './borders'
import { drawWaveform } from './waveform'
import { drawCountdown } from './countdown'
import { drawMushafPage } from './mushafLayout'
import { drawHolyQuranPaper } from './holyQuranPaper'
import { fitFontSize, isRtl, prepareText } from './textLayout'
import { DEFAULT_BACKGROUND_URL } from '../api/unsplash'
import {
  getSurahCalligraphyImage,
  loadSurahCalligraphy,
  getBasmalahCalligraphyImage,
  loadBasmalahCalligraphy,
} from '../lib/surahCalligraphy'

export const ASPECT_SIZES: Record<ReelConfig['aspectRatio'], { width: number; height: number }> = {
  '9:16': { width: 1080, height: 1920 },
  '1:1': { width: 1080, height: 1080 },
  '16:9': { width: 1920, height: 1080 },
}

/** Preview renders at 0.4x scale for crisp UI and fast rendering */
export const PREVIEW_SCALE = 0.4

export function previewSize(aspectRatio: ReelConfig['aspectRatio']): {
  width: number
  height: number
} {
  const full = ASPECT_SIZES[aspectRatio]
  return {
    width: Math.round(full.width * PREVIEW_SCALE),
    height: Math.round(full.height * PREVIEW_SCALE),
  }
}

export interface FrameParams {
  timeMs: number
  config: ReelConfig
  image: CanvasImageSource | null
  verse: Verse
  verseTimeMs: number
  slotDurationMs: number
  totalDurationMs?: number
}

interface FontSpec {
  size: number
  font: string
}

export function buildFont(style: FontSpec): string {
  return `${style.size}px ${style.font}`
}

function hexToRgbComponents(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '')
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized
  const num = parseInt(full, 16)
  if (Number.isNaN(num)) return { r: 255, g: 215, b: 0 }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  }
}

function interpolateColor(color1: string, color2: string, factor: number): string {
  const c1 = hexToRgbComponents(color1)
  const c2 = hexToRgbComponents(color2)
  const t = Math.max(0, Math.min(1, factor))
  const r = Math.round(c1.r + (c2.r - c1.r) * t)
  const g = Math.round(c1.g + (c2.g - c1.g) * t)
  const b = Math.round(c1.b + (c2.b - c1.b) * t)
  return `rgb(${r}, ${g}, ${b})`
}

function hexToRgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgbComponents(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function cleanBasmalahFromText(arabic: string): string {
  const basmalahPattern = /^(?:بِسْمِ\s*ٱ?للَّهِ\s*ٱلرَّحْمَٰ?نِ\s*ٱلرَّحِيمِ\s*|بِسْمِ\s*اللَّهِ\s*الرَّحْمَٰ?نِ\s*الرَّحِيمِ\s*)/u
  return arabic.replace(basmalahPattern, '').trim()
}

export function getSurahHeader(
  verse: Verse,
  lang: ReelConfig['text']['surahNameLanguage'],
  allVerses?: Verse[],
): { title: string; subtitle: string; isRtl: boolean } {
  const arabic = verse.surahArabicName || `سورة ${verse.surahName}`

  let ayatLabel = `Ayah ${verse.ayat}`
  let arabicAyatLabel = `الآية ${verse.ayat}`
  if (allVerses && allVerses.length > 1) {
    const firstAyat = allVerses[0].ayat
    const lastAyat = allVerses[allVerses.length - 1].ayat
    if (firstAyat !== lastAyat) {
      ayatLabel = `Ayahs ${firstAyat}–${lastAyat}`
      arabicAyatLabel = `الآيات ${firstAyat}–${lastAyat}`
    }
  }

  const english = `${verse.surahName} · ${ayatLabel}`
  const bothSubtitle = `Surah ${verse.surahName} · ${ayatLabel}`

  if (lang === 'arabic') {
    return {
      title: arabic,
      subtitle: arabicAyatLabel,
      isRtl: true,
    }
  }

  if (lang === 'both') {
    return {
      title: arabic,
      subtitle: bothSubtitle,
      isRtl: false,
    }
  }

  return {
    title: english,
    subtitle: verse.editionName,
    isRtl: false,
  }
}

export function drawVerse(
  ctx: CanvasRenderingContext2D,
  config: ReelConfig,
  verse: Verse,
  verseTimeMs: number,
  slotDurationMs: number,
  width: number,
  height: number,
): void {
  const { text } = config
  const baseWidth = ASPECT_SIZES[config.aspectRatio].width
  const scale = width / baseWidth

  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  if (text.showGlow) {
    ctx.shadowColor = text.textColor
    ctx.shadowBlur = Math.round(14 * scale)
  } else {
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
  }

  const maxWidth = width * 0.86
  const isFirstAyahOfSurah = verse.ayat === 1
  const displayArabic =
    isFirstAyahOfSurah && text.showBasmalah
      ? cleanBasmalahFromText(verse.arabic)
      : verse.arabic

  const measureText = (s: string, sz: number, fontName: string) => {
    ctx.font = `${sz}px ${fontName}`
    return ctx.measureText(s).width
  }

  const maxArabicHeight = height * 0.45
  const arabicLines = fitFontSize(
    displayArabic,
    maxWidth,
    maxArabicHeight,
    text.arabicSize * scale,
    (s, sz) => measureText(s, sz, text.arabicFont),
    1.6,
    Math.max(8, Math.floor(text.arabicSize * scale * 0.55)),
  )

  let translationLines: ReturnType<typeof fitFontSize> | null = null
  if (text.showTranslation) {
    const maxTranslationHeight = height * 0.28
    translationLines = fitFontSize(
      verse.translation,
      maxWidth,
      maxTranslationHeight,
      text.translationSize * scale,
      (s, sz) => measureText(s, sz, text.translationFont),
      1.5,
      Math.max(8, Math.floor(text.translationSize * scale * 0.55)),
    )
  }

  const arabicH = arabicLines.lines.length * arabicLines.size * 1.6
  const translationH = translationLines
    ? translationLines.lines.length * translationLines.size * 1.5
    : 0

  let secTranslationH = 0
  if (text.showTranslation && verse.secondaryTranslation) {
    const secFontSize = Math.max(10, Math.round((translationLines?.size ?? text.translationSize * scale) * 0.82))
    secTranslationH = secFontSize * 1.5 + height * 0.01
  }

  const gap = Math.round(height * 0.035)
  const basmalahH = isFirstAyahOfSurah && text.showBasmalah ? Math.round(height * 0.05) : 0
  const basmalahGap = basmalahH > 0 ? Math.round(height * 0.02) : 0
  const translationBlock = translationH + secTranslationH

  const contentH =
    basmalahH +
    basmalahGap +
    arabicH +
    (text.showTranslation && translationBlock > 0 ? gap + translationBlock : 0)

  let startY: number
  if (text.textPosition === 'center') {
    startY = (height - contentH) / 2
  } else {
    startY = height * 0.52
  }

  const surahHeader = getSurahHeader(verse, text.surahNameLanguage, config.verses)
  const isBasmalahSpecial = isFirstAyahOfSurah && text.showBasmalah
  const baseAyahTimeMs = isBasmalahSpecial ? Math.max(0, verseTimeMs - 2200) : verseTimeMs

  // Smooth fadeIn and fadeOut easing for verse content
  const fadeIn = Math.min(1, Math.max(0, baseAyahTimeMs / 700))
  const fadeOut =
    slotDurationMs > 800
      ? Math.min(1, Math.max(0, (slotDurationMs - verseTimeMs) / 700))
      : 1
  const arabicAlpha = fadeIn * fadeOut

  let translationAlpha = arabicAlpha
  if (isMultiVerseDelayedTranslation(slotDurationMs, verseTimeMs)) {
    const translationDelayMs = Math.min(1200, slotDurationMs * 0.25)
    const delayedTime = Math.max(0, baseAyahTimeMs - translationDelayMs)
    translationAlpha = Math.min(1, Math.max(0, delayedTime / 700)) * fadeOut
  }

  function isMultiVerseDelayedTranslation(slotDur: number, currTime: number): boolean {
    return slotDur > 3000 && currTime < slotDur - 700
  }

  let basmalahAlpha = 0
  if (isBasmalahSpecial) {
    const bFadeIn = Math.min(1, Math.max(0, verseTimeMs / 600))
    const bFadeOut = Math.min(1, Math.max(0, (slotDurationMs - verseTimeMs) / 700))
    basmalahAlpha = bFadeIn * bFadeOut
  }

  // Surah header remains still and constant across transitions
  const headerAlpha = 0.95
  const arabicRtl = true

  // ── Render Top Surah Header (Continuity & Still Title) ──
  if (text.surahHeaderPosition === 'top') {
    const topMarginY = Math.round(height * 0.1)
    const calligraphyImg = getSurahCalligraphyImage(verse.surah)
    if (!calligraphyImg) {
      loadSurahCalligraphy(verse.surah)
    }

    if (calligraphyImg && calligraphyImg.complete && calligraphyImg.naturalWidth > 0) {
      const emblemTargetH = Math.round(height * 0.055)
      const aspect = calligraphyImg.naturalWidth / calligraphyImg.naturalHeight
      const emblemTargetW = emblemTargetH * aspect

      ctx.save()
      ctx.globalAlpha = headerAlpha
      ctx.drawImage(
        calligraphyImg,
        (width - emblemTargetW) / 2,
        topMarginY - emblemTargetH / 2,
        emblemTargetW,
        emblemTargetH,
      )
      ctx.restore()

      const ayahNumSize = Math.max(10, Math.round(height * 0.016))
      ctx.font = buildFont({ size: ayahNumSize, font: text.translationFont })
      ctx.fillStyle = text.textColor
      ctx.globalAlpha = headerAlpha * 0.85

      const isMultiVerse = config.verses && config.verses.length > 1
      const ayahRangeLabel = isMultiVerse
        ? `Ayahs ${config.verses[0].ayat}–${config.verses[config.verses.length - 1].ayat}`
        : `Ayah ${verse.ayat}`

      ctx.fillText(
        prepareText(ayahRangeLabel, false),
        width / 2,
        topMarginY + emblemTargetH * 0.65,
      )
    } else {
      const topTitleSize = surahHeader.isRtl
        ? Math.max(16, Math.round(height * 0.034))
        : Math.max(14, Math.round(height * 0.026))
      const topFont = surahHeader.isRtl ? text.arabicFont : text.translationFont

      ctx.font = buildFont({ size: topTitleSize, font: topFont })
      ctx.fillStyle = text.textColor
      ctx.globalAlpha = headerAlpha
      ctx.fillText(prepareText(surahHeader.title, surahHeader.isRtl), width / 2, topMarginY)

      const subFontSize = Math.max(11, Math.round(height * 0.018))
      ctx.font = buildFont({ size: subFontSize, font: text.translationFont })
      ctx.globalAlpha = headerAlpha * 0.8
      ctx.fillText(
        prepareText(surahHeader.subtitle, surahHeader.isRtl),
        width / 2,
        topMarginY + topTitleSize * 1.1,
      )
    }
  }

  let cursorY = startY + arabicLines.size / 2

  // ── Render Basmalah Emblem Centerpiece (if Ayah 1) ───────
  if (isFirstAyahOfSurah && text.showBasmalah) {
    const basmalahImg = getBasmalahCalligraphyImage()
    if (!basmalahImg) {
      loadBasmalahCalligraphy()
    }

    if (basmalahImg && basmalahImg.complete && basmalahImg.naturalWidth > 0) {
      const bAspect = basmalahImg.naturalWidth / basmalahImg.naturalHeight
      const bTargetH = basmalahH
      const bTargetW = bTargetH * bAspect

      ctx.save()
      ctx.globalAlpha = basmalahAlpha * 0.98
      ctx.drawImage(
        basmalahImg,
        (width - bTargetW) / 2,
        cursorY - bTargetH / 2,
        bTargetW,
        bTargetH,
      )
      ctx.restore()
    } else {
      const basmalahSize = Math.max(16, Math.round(arabicLines.size * 0.65))
      ctx.font = buildFont({ size: basmalahSize, font: text.arabicFont })
      ctx.fillStyle = text.textColor
      ctx.globalAlpha = arabicAlpha * 0.95
      ctx.fillText(
        prepareText('بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ', true),
        width / 2,
        cursorY + basmalahH / 2,
      )
    }
    cursorY += basmalahH + basmalahGap
  }

  // ── Render Arabic Text with Ultra-Smooth Continuous Karaoke Glow ─
  const userDelayMs =
    typeof text.ayahPauseDelay === 'number' && text.ayahPauseDelay >= 0
      ? Math.round(text.ayahPauseDelay * 1000)
      : 1600
  const recitationDurationMs = Math.max(1000, slotDurationMs - userDelayMs)

  ctx.font = buildFont({ size: arabicLines.size, font: text.arabicFont })
  const allArabicWords = verse.arabic.trim().split(/\s+/).filter(Boolean)
  const totalWords = allArabicWords.length || 1
  const karaokeProgress =
    recitationDurationMs > 0
      ? Math.min(1, Math.max(0, verseTimeMs / recitationDurationMs))
      : 0
  const continuousWordIdx = karaokeProgress * totalWords
  const highlightCol = text.highlightColor || '#ffd700'
  const baseCol = text.textColor || '#ffffff'

  let runningWordIndex = 0
  for (const line of arabicLines.lines) {
    if (!text.karaokeHighlight) {
      ctx.fillStyle = text.textColor
      ctx.globalAlpha = arabicAlpha
      ctx.fillText(prepareText(line.text, arabicRtl), width / 2, cursorY)
    } else {
      // Ultra-smooth progressive fluid illumination
      const lineWords = line.text.trim().split(/\s+/).filter(Boolean)
      const spaceWidth = ctx.measureText(' ').width
      const measuredWords = lineWords.map((w) => ({
        word: w,
        width: ctx.measureText(prepareText(w, true)).width,
      }))
      const totalLineWidth =
        measuredWords.reduce((sum, w) => sum + w.width, 0) +
        Math.max(0, measuredWords.length - 1) * spaceWidth

      ctx.save()
      ctx.textAlign = 'left'
      let startX = (width - totalLineWidth) / 2

      // In RTL Arabic, lineWords[0] is rightmost; leftmost visually is lineWords[length - 1]
      for (let i = lineWords.length - 1; i >= 0; i--) {
        const wordGlobalIdx = runningWordIndex + i
        const delta = continuousWordIdx - wordGlobalIdx

        // Smooth continuous easing transition
        let wordAlpha = arabicAlpha * 0.46
        let wordColor = baseCol
        let glowRadius = 0

        if (delta >= 1.0) {
          // Already recited word: settled high opacity & golden warmth
          wordAlpha = arabicAlpha * 0.94
          wordColor = highlightCol
          glowRadius = text.showGlow ? Math.round(6 * scale) : 0
        } else if (delta > -0.25) {
          // Actively reciting word: smooth Hermite curve interpolation
          const p = Math.max(0, Math.min(1, (delta + 0.25) / 1.25))
          const hermite = p * p * (3 - 2 * p)

          wordAlpha = arabicAlpha * (0.46 + 0.54 * hermite)
          wordColor = interpolateColor(baseCol, highlightCol, hermite)

          if (text.showGlow) {
            // Blooming flare peaking at center of word transition
            const flare = Math.sin(p * Math.PI)
            glowRadius = Math.round((6 + 18 * flare) * scale)
          }
        } else {
          // Upcoming word: soft dim
          wordAlpha = arabicAlpha * 0.46
          wordColor = baseCol
          glowRadius = text.showGlow ? Math.round(3 * scale) : 0
        }

        ctx.fillStyle = wordColor
        ctx.globalAlpha = wordAlpha
        if (text.showGlow && glowRadius > 0) {
          ctx.shadowColor = wordColor
          ctx.shadowBlur = glowRadius
        } else {
          ctx.shadowColor = 'transparent'
          ctx.shadowBlur = 0
        }

        const item = measuredWords[i]
        ctx.fillText(prepareText(item.word, true), startX, cursorY)
        startX += item.width + spaceWidth
      }
      ctx.restore()
      runningWordIndex += lineWords.length
    }
    cursorY += arabicLines.size * 1.6
  }

  // ── Render Translation (if enabled) with Smooth Dissolve ───
  if (text.showTranslation && translationLines && translationBlock > 0) {
    cursorY += gap
    ctx.font = buildFont({ size: translationLines.size, font: text.translationFont })
    ctx.fillStyle = text.textColor
    ctx.globalAlpha = translationAlpha
    const translationRtl = isRtl(verse.translation)
    for (const line of translationLines.lines) {
      ctx.fillText(prepareText(line.text, translationRtl), width / 2, cursorY)
      cursorY += translationLines.size * 1.5
    }

    // Secondary translation subtitle (if present)
    if (verse.secondaryTranslation) {
      const secRtl = isRtl(verse.secondaryTranslation)
      const secFontSize = Math.max(10, Math.round(translationLines.size * 0.82))
      ctx.font = `italic 400 ${secFontSize}px ${text.translationFont}`
      ctx.fillStyle = text.textColor
      ctx.globalAlpha = translationAlpha * 0.75
      ctx.fillText(prepareText(verse.secondaryTranslation, secRtl), width / 2, cursorY + height * 0.008)
      cursorY += secFontSize * 1.5
    }

    // Optional Reflection / Tafsir Badge
    if (text.showReflectionCard && text.reflectionText?.trim()) {
      const scale = width / 1080
      const refText = text.reflectionText.trim()
      const refFontSize = Math.max(11, Math.round(18 * scale))
      ctx.font = `600 ${refFontSize}px ${text.translationFont}`
      const refMetrics = ctx.measureText(refText)
      const pillW = refMetrics.width + Math.round(36 * scale)
      const pillH = Math.round(32 * scale)
      const pillX = (width - pillW) / 2
      const pillY = cursorY + Math.round(14 * scale)

      ctx.save()
      ctx.globalAlpha = translationAlpha * 0.9
      ctx.beginPath()
      ctx.roundRect(pillX, pillY, pillW, pillH, pillH / 2)
      ctx.fillStyle = 'rgba(15, 23, 42, 0.7)'
      ctx.fill()

      ctx.strokeStyle = text.highlightColor || '#ffd700'
      ctx.lineWidth = Math.max(1, Math.round(1.5 * scale))
      ctx.stroke()

      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(refText, width / 2, pillY + pillH / 2)
      ctx.restore()

      cursorY += pillH + Math.round(18 * scale)
    }
  }

  // ── Render Bottom Reference (if selected) ────────────────
  if (text.surahHeaderPosition === 'bottom') {
    const bottomTitleSize = surahHeader.isRtl
      ? Math.max(14, Math.round(height * 0.03))
      : Math.max(12, Math.round(height * 0.024))
    const bottomFont = surahHeader.isRtl ? text.arabicFont : text.translationFont

    ctx.font = buildFont({ size: bottomTitleSize, font: bottomFont })
    ctx.fillStyle = text.textColor
    ctx.globalAlpha = 0.95
    ctx.fillText(prepareText(surahHeader.title, surahHeader.isRtl), width / 2, cursorY + height * 0.03)

    const bottomSubSize = Math.max(10, Math.round(height * 0.018))
    ctx.font = buildFont({ size: bottomSubSize, font: bottomFont })
    ctx.globalAlpha = 0.8
    ctx.fillText(
      prepareText(surahHeader.subtitle, surahHeader.isRtl),
      width / 2,
      cursorY + height * 0.03 + bottomTitleSize * 1.1,
    )
  }

  ctx.restore()
}

function drawFooterBranding(
  ctx: CanvasRenderingContext2D,
  config: ReelConfig,
  width: number,
  height: number,
): void {
  const { footer, text } = config
  if (!footer?.enabled || !footer.text?.trim()) return

  const baseWidth = ASPECT_SIZES[config.aspectRatio].width
  const scale = width / baseWidth

  let displayLabel = footer.text.trim()
  if (footer.icon === 'instagram' && !displayLabel.startsWith('IG:') && !displayLabel.startsWith('@')) {
    displayLabel = `@${displayLabel}`
  } else if (footer.icon === 'tiktok' && !displayLabel.startsWith('TikTok:') && !displayLabel.startsWith('@')) {
    displayLabel = `@${displayLabel}`
  } else if (footer.icon === 'youtube' && !displayLabel.startsWith('YT:') && !displayLabel.startsWith('YouTube:')) {
    displayLabel = `▶ ${displayLabel}`
  } else if (footer.icon === 'copyright' && !displayLabel.startsWith('©')) {
    displayLabel = `© ${displayLabel}`
  }

  const fontSize = Math.max(9, Math.round((footer.fontSize || 28) * scale))
  const y = height - height * 0.04

  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `500 ${fontSize}px ${text.translationFont}`
  ctx.fillStyle = text.textColor
  ctx.globalAlpha = Math.max(0.1, Math.min(footer.opacity ?? 0.75, 1))

  if (text.showGlow) {
    ctx.shadowColor = 'rgba(0,0,0,0.8)'
    ctx.shadowBlur = Math.round(12 * scale)
  }

  ctx.fillText(displayLabel, width / 2, y)
  ctx.restore()
}

function drawProceduralBackdrop(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeMs: number,
): void {
  ctx.save()
  // Deep celestial spiritual backdrop
  const grad = ctx.createLinearGradient(0, 0, width, height)
  grad.addColorStop(0, '#030c17')
  grad.addColorStop(0.4, '#071828')
  grad.addColorStop(0.75, '#0a232f')
  grad.addColorStop(1, '#051424')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, width, height)

  // Ambient center gold & emerald glow
  const cx = width / 2
  const cy = height / 2
  const pulse = Math.sin(timeMs / 1800) * 0.08 + 0.92
  const radius = Math.max(width, height) * 0.55 * pulse
  const radial = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
  radial.addColorStop(0, 'rgba(245, 158, 11, 0.14)')
  radial.addColorStop(0.45, 'rgba(16, 185, 129, 0.08)')
  radial.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = radial
  ctx.fillRect(0, 0, width, height)

  // Gentle drifting starlight particle shimmer
  const numStars = 28
  ctx.fillStyle = '#ffffff'
  for (let i = 0; i < numStars; i++) {
    const seedX = ((i * 137.5 + 47) % width)
    const seedY = ((i * 229.3 + 83) % height)
    const phase = (timeMs / 1200 + i * 0.7) % (Math.PI * 2)
    const alpha = (Math.sin(phase) * 0.5 + 0.5) * 0.55 + 0.15
    const size = ((i % 3) + 1.2)
    ctx.globalAlpha = alpha
    ctx.beginPath()
    ctx.arc(seedX, seedY, size, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()
}

export function renderFrame(ctx: CanvasRenderingContext2D, params: FrameParams): void {
  const { config, image, verse, verseTimeMs, slotDurationMs, timeMs, totalDurationMs } = params
  const width = ctx.canvas.width
  const height = ctx.canvas.height
  const totalMs = totalDurationMs ?? config.motion.duration * 1000

  ctx.save()
  // Ensure maximum interpolation quality for background images, videos, and calligraphy
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, width, height)

  // Dedicated Holy Quran Paper Mode: shows whole selected verses on authentic Mushaf paper with no effects
  if (config.text?.layoutMode === 'holy-quran-paper') {
    drawHolyQuranPaper(ctx, config, config.verses, verse, verseTimeMs, slotDurationMs, width, height)
    drawFooterBranding(ctx, config, width, height)
    if (config.countdown?.enabled && config.countdown.style !== 'none') {
      drawCountdown(ctx, config.countdown, timeMs, totalMs, width, height)
    }
    ctx.restore()
    return
  }

  // Continuous background motion across entire video timeline (never resets between ayahs)
  const transform = getTransform(config.motion, timeMs, totalDurationMs)
  if (image) {
    drawBackground(ctx, image, width, height, transform, config.background.fit)
  } else {
    // Ethereal spiritual procedural backdrop when loading or offline
    drawProceduralBackdrop(ctx, width, height, timeMs)
  }

  const overlayAlpha = config.overlay.opacity
  if (overlayAlpha > 0) {
    ctx.fillStyle = hexToRgba(config.overlay.color, overlayAlpha)
    ctx.fillRect(0, 0, width, height)
  }

  // Atmospheric video particle effects (fireflies, slow-snow, dust-motes, stars, rain)
  if (config.effects?.type && config.effects.type !== 'none') {
    drawAtmosphericEffect(
      ctx,
      config.effects.type,
      timeMs,
      width,
      height,
      config.effects.intensity ?? 0.7,
      config.effects.speed ?? 1.0,
    )
  }

  // Voice audio spectrum / waveform visualizer
  if (config.waveform?.type && config.waveform.type !== 'none') {
    drawWaveform(
      ctx,
      config.waveform.type,
      timeMs,
      slotDurationMs,
      width,
      height,
      config.waveform.color ?? '#ffd700',
      config.waveform.opacity ?? 0.75,
    )
  }

  if (config.text?.layoutMode === 'mushaf-page') {
    drawMushafPage(ctx, config, config.verses, verse, verseTimeMs, slotDurationMs, width, height)
  } else {
    drawVerse(ctx, config, verse, verseTimeMs, slotDurationMs, width, height)
  }

  // Authentic Islamic borders, arabesque frames, and vignettes
  if (config.border?.type && config.border.type !== 'none') {
    drawBorder(
      ctx,
      config.border.type,
      width,
      height,
      config.border.color ?? '#ffd700',
      config.border.opacity ?? 0.75,
    )
  }

  drawFooterBranding(ctx, config, width, height)

  // Pure Visual Countdown Timer Overlay
  if (config.countdown?.enabled && config.countdown.style !== 'none') {
    drawCountdown(ctx, config.countdown, timeMs, totalMs, width, height)
  }

  ctx.restore()
}

export function defaultConfig(): ReelConfig {
  return {
    verses: [
      {
        surah: 2,
        ayat: 255,
        surahName: 'Al-Baqarah',
        surahArabicName: 'سُورَةُ ٱلْبَقَرَةِ',
        arabic:
          'ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ ٱلْحَىُّ ٱلْقَيُّومُ ۚ لَا تَأْخُذُهُۥ سِنَةٌۭ وَلَا نَوْمٌۭ ۚ لَّهُۥ مَا فِى ٱلسَّمَٰوَٰتِ وَمَا فِى ٱلْأَرْضِ',
        translation:
          'Allah - there is no deity except Him, the Ever-Living, the Sustainer of existence. Neither drowsiness overtakes Him nor sleep. To Him belongs whatever is in the heavens and whatever is on the earth.',
        editionId: 'en.sahih',
        editionName: 'Saheeh International',
        audioUrl: 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/262.mp3',
      },
    ],
    background: {
      url: DEFAULT_BACKGROUND_URL,
      fit: 'cover-crop',
    },
    overlay: {
      color: '#000000',
      opacity: 0.35,
    },
    effects: {
      type: 'fireflies',
      intensity: 0.7,
      speed: 1.0,
    },
    border: {
      type: 'none',
      color: '#ffd700',
      opacity: 0.75,
    },
    waveform: {
      type: 'none',
      color: '#ffd700',
      opacity: 0.75,
    },
    text: {
      arabicFont: '"Scheherazade New", "Amiri", serif',
      arabicSize: 72,
      translationFont: '"Inter", sans-serif',
      translationSize: 40,
      textPosition: 'center',
      textColor: '#ffffff',
      showGlow: true,
      showTranslation: true,
      surahHeaderPosition: 'top',
      surahNameLanguage: 'arabic',
      ayahPauseDelay: 0.0,
      showBasmalah: true,
      karaokeHighlight: false,
      highlightColor: '#ffd700',
      secondaryEditionId: 'none',
      showReflectionCard: false,
      reflectionText: '✨ Reflection: Remembrance of Allah',
      layoutMode: 'calligraphy-overlay',
      mushafTheme: 'obsidian-gold',
      mushafGlowIntensity: 0.85,
    },
    countdown: {
      enabled: false,
      style: 'glowing-ring',
      position: 'top-right',
      color: '#ffd700',
      showTotalTime: false,
      opacity: 0.9,
    },
    footer: {
      enabled: false,
      text: '@yourchannel',
      icon: 'instagram',
      opacity: 0.75,
      fontSize: 28,
    },
    motion: {
      type: 'kenburns-zoom',
      duration: 15,
    },
    aspectRatio: '9:16',
  }
}
