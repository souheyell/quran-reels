import type { ReelConfig, Verse } from '../types'
import { drawBackground, getTransform } from './kenburns'
import { drawAtmosphericEffect } from './effects'
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

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '')
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function smoothStep(t: number): number {
  const clamped = Math.max(0, Math.min(1, t))
  return clamped * clamped * (3 - 2 * clamped)
}

/**
 * Calculate smooth cinematic fade-in and fade-out alpha to prevent any text flickering.
 */
function calculateFadeAlpha(
  timeMs: number,
  slotDurationMs: number,
  fadeInMs = 400,
  fadeOutMs = 450,
): number {
  if (slotDurationMs <= 0) return 1

  // Smooth fade-in at the beginning of the ayah
  if (timeMs < fadeInMs) {
    return smoothStep(timeMs / fadeInMs)
  }

  // Smooth fade-out during the pause before the next ayah
  const fadeOutStartMs = Math.max(fadeInMs, slotDurationMs - fadeOutMs)
  if (timeMs > fadeOutStartMs) {
    const elapsed = timeMs - fadeOutStartMs
    const progress = elapsed / fadeOutMs
    return smoothStep(1 - progress)
  }

  // Full opacity during active recitation
  return 1
}

function toArabicDigits(num: number | string): string {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
  return String(num).replace(/[0-9]/g, (d) => arabicDigits[Number(d)] ?? d)
}

function getSurahHeaderContent(
  verse: Verse,
  language: ReelConfig['text']['surahNameLanguage'] = 'arabic',
): { title: string; subtitle: string; isRtl: boolean } {
  const arabicName = verse.surahArabicName || `سُورَةُ ${verse.surah}`
  const englishName = verse.surahName || `Surah ${verse.surah}`
  const arabicAyahNum = toArabicDigits(verse.ayat)

  if (language === 'english') {
    return {
      title: englishName.toUpperCase(),
      subtitle: `Verse ${verse.ayat}`,
      isRtl: false,
    }
  }

  if (language === 'both') {
    return {
      title: arabicName,
      subtitle: `${englishName} · Ayah ${verse.ayat}`,
      isRtl: true,
    }
  }

  // Default 'arabic'
  return {
    title: arabicName,
    subtitle: `الآية ${arabicAyahNum}`,
    isRtl: true,
  }
}

function drawVerse(
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

  const scaledArabicSize = Math.max(12, Math.round(text.arabicSize * scale))
  const scaledTranslationSize = Math.max(10, Math.round(text.translationSize * scale))

  const padding = width * 0.09
  const maxTextWidth = width - padding * 2
  const centerY = height / 2
  const lowerThirdY = height * 0.6

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const arabicRtl = isRtl(verse.arabic)
  const arabicMeasure = (s: string, size: number) => {
    ctx.font = buildFont({ size, font: text.arabicFont })
    return ctx.measureText(prepareText(s, arabicRtl)).width
  }
  const maxArabicHeight = text.showTranslation ? height * 0.42 : height * 0.65
  const arabicLines = fitFontSize(
    verse.arabic,
    maxTextWidth,
    maxArabicHeight,
    scaledArabicSize,
    arabicMeasure,
    1.6,
    Math.max(8, Math.floor(scaledArabicSize * 0.55)),
  )

  const surahHeader = getSurahHeaderContent(
    verse,
    text.surahNameLanguage || 'arabic',
  )

  // Smooth cinematic alphas with zero flickering
  const arabicAlpha = calculateFadeAlpha(verseTimeMs, slotDurationMs, 400, 450)
  const translationAlpha = calculateFadeAlpha(Math.max(0, verseTimeMs - 80), slotDurationMs, 400, 450)
  const subtitleAlpha = calculateFadeAlpha(verseTimeMs, slotDurationMs, 300, 450)

  ctx.save()
  ctx.fillStyle = text.textColor

  if (text.showGlow) {
    ctx.shadowColor = 'rgba(0,0,0,0.85)'
    ctx.shadowBlur = Math.round(24 * scale)
  }

  // ── Surah in Thuluth Calligraphy + Subtitle ──
  const showHeaderTop = text.surahHeaderPosition === 'top' || text.surahHeaderPosition === undefined
  if (showHeaderTop) {
    const topHeaderY = height * 0.075
    const isArabicMode = text.surahNameLanguage === 'arabic' || text.surahNameLanguage === undefined
    const calligraphyImg = isArabicMode ? getSurahCalligraphyImage(verse.surah, text.textColor) : null

    if (calligraphyImg && calligraphyImg.complete && calligraphyImg.naturalWidth > 0) {
      // Draw Authentic Thuluth Vector Calligraphy
      const targetH = height * 0.05
      const aspect = calligraphyImg.naturalWidth / calligraphyImg.naturalHeight || 1.5
      const targetW = targetH * aspect
      const imgX = (width - targetW) / 2
      const imgY = topHeaderY - targetH / 2

      // Header emblem stays steady and dignified without flickering
      ctx.globalAlpha = 0.98
      ctx.drawImage(calligraphyImg, imgX, imgY, targetW, targetH)

      // Verse Number directly underneath the Calligraphy
      const subtitleFontSize = Math.max(11, Math.round(height * 0.019))
      const subtitleY = imgY + targetH + height * 0.018
      const subtitleFont = surahHeader.isRtl ? text.arabicFont : text.translationFont
      ctx.font = buildFont({ size: subtitleFontSize, font: subtitleFont })
      ctx.globalAlpha = subtitleAlpha * 0.82
      ctx.fillText(prepareText(surahHeader.subtitle, surahHeader.isRtl), width / 2, subtitleY)
    } else {
      // Fallback to text calligraphy while image loads
      if (isArabicMode) void loadSurahCalligraphy(verse.surah, text.textColor)
      const titleFontSize = surahHeader.isRtl
        ? Math.max(16, Math.round(height * 0.033))
        : Math.max(13, Math.round(height * 0.025))
      const titleFont = surahHeader.isRtl ? text.arabicFont : text.translationFont

      ctx.font = buildFont({ size: titleFontSize, font: titleFont })
      ctx.globalAlpha = 0.98
      ctx.fillText(prepareText(surahHeader.title, surahHeader.isRtl), width / 2, topHeaderY)

      const subtitleFontSize = Math.max(11, Math.round(height * 0.019))
      const subtitleY = topHeaderY + titleFontSize * 1.15
      const subtitleFont = surahHeader.isRtl ? text.arabicFont : text.translationFont
      ctx.font = buildFont({ size: subtitleFontSize, font: subtitleFont })
      ctx.globalAlpha = subtitleAlpha * 0.8
      ctx.fillText(prepareText(surahHeader.subtitle, surahHeader.isRtl), width / 2, subtitleY)
    }
  }

  // ── Dedicated Thuluth Basmalah Banner for Ayah 1 ─────────
  const hasBasmalah =
    verse.ayat === 1 && verse.surah > 1 && verse.surah !== 9 && text.showBasmalah !== false

  const basmalahImg = hasBasmalah ? getBasmalahCalligraphyImage(text.textColor) : null
  const basmalahH = height * 0.05
  const basmalahGap = height * 0.035
  const basmalahBlock = hasBasmalah ? basmalahH + basmalahGap : 0

  // ── Calculate Main Content Layout ────────────────────────
  const arabicBlock = arabicLines.lines.length * arabicLines.size * 1.6

  let translationBlock = 0
  let translationLines: ReturnType<typeof fitFontSize> | null = null

  if (text.showTranslation && verse.translation) {
    const translationRtl = isRtl(verse.translation)
    const translationMeasure = (s: string, size: number) => {
      ctx.font = buildFont({ size, font: text.translationFont })
      return ctx.measureText(prepareText(s, translationRtl)).width
    }
    translationLines = fitFontSize(
      verse.translation,
      maxTextWidth,
      height * 0.28,
      scaledTranslationSize,
      translationMeasure,
      1.5,
      Math.max(7, Math.floor(scaledTranslationSize * 0.5)),
    )
    translationBlock = translationLines.lines.length * translationLines.size * 1.5
  }

  const gap = text.showTranslation && translationBlock > 0 ? height * 0.04 : 0
  const bottomRefBlock = text.surahHeaderPosition === 'bottom' ? height * 0.04 + height * 0.02 : 0
  const totalHeight = basmalahBlock + arabicBlock + translationBlock + gap + bottomRefBlock

  let cursorY: number
  if (text.textPosition === 'lower-third') {
    cursorY = lowerThirdY - totalHeight / 2
  } else {
    cursorY = centerY - totalHeight / 2
  }

  // ── Render Dedicated Thuluth Basmalah Calligraphy Banner ──
  if (hasBasmalah) {
    if (basmalahImg && basmalahImg.complete && basmalahImg.naturalWidth > 0) {
      // Draw Thuluth vector Basmalah emblem
      const aspect = basmalahImg.naturalWidth / basmalahImg.naturalHeight || 5.0
      const basmalahW = Math.min(width * 0.85, basmalahH * aspect)
      const bX = (width - basmalahW) / 2
      ctx.globalAlpha = arabicAlpha * 0.98
      ctx.drawImage(basmalahImg, bX, cursorY, basmalahW, basmalahH)
    } else {
      // Fallback to text Basmalah in Arabic calligraphy font
      void loadBasmalahCalligraphy(text.textColor)
      const basmalahSize = Math.max(14, Math.round(scaledArabicSize * 0.84))
      ctx.font = buildFont({ size: basmalahSize, font: text.arabicFont })
      ctx.globalAlpha = arabicAlpha * 0.95
      ctx.fillText(prepareText('بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ', true), width / 2, cursorY + basmalahH / 2)
    }
    cursorY += basmalahH + basmalahGap
  }

  // ── Render Arabic Text with Smooth Dissolve & Karaoke Highlighting ─
  const userDelayMs =
    typeof text.ayahPauseDelay === 'number' && text.ayahPauseDelay >= 0
      ? Math.round(text.ayahPauseDelay * 1000)
      : 1600
  const recitationDurationMs = Math.max(1000, slotDurationMs - userDelayMs)

  ctx.font = buildFont({ size: arabicLines.size, font: text.arabicFont })
  const allArabicWords = verse.arabic.trim().split(/\s+/).filter(Boolean)
  const totalWords = allArabicWords.length || 1
  const karaokeProgress = recitationDurationMs > 0 ? Math.min(1, Math.max(0, verseTimeMs / recitationDurationMs)) : 0
  const activeWordIndex = Math.floor(karaokeProgress * totalWords)

  let runningWordIndex = 0
  for (const line of arabicLines.lines) {
    if (!text.karaokeHighlight) {
      ctx.fillStyle = text.textColor
      ctx.globalAlpha = arabicAlpha
      ctx.fillText(prepareText(line.text, arabicRtl), width / 2, cursorY)
    } else {
      // Karaoke word-by-word progressive illumination
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
        const isPastOrActive = wordGlobalIdx <= activeWordIndex
        const isActive = wordGlobalIdx === activeWordIndex

        if (isPastOrActive) {
          ctx.fillStyle = text.highlightColor || '#ffd700'
          ctx.globalAlpha = arabicAlpha * (isActive ? 1.0 : 0.92)
          if (text.showGlow) {
            ctx.shadowColor = text.highlightColor || '#ffd700'
            ctx.shadowBlur = isActive ? 18 : 8
          }
        } else {
          ctx.fillStyle = text.textColor
          ctx.globalAlpha = arabicAlpha * 0.52
          if (text.showGlow) {
            ctx.shadowColor = text.textColor
            ctx.shadowBlur = 4
          }
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

    // Spiritual Reflection Note Card
    if (text.showReflectionNote && text.reflectionNoteText?.trim()) {
      const noteFontSize = Math.max(11, Math.round(height * 0.019))
      ctx.font = `500 ${noteFontSize}px ${text.translationFont}`
      ctx.fillStyle = text.highlightColor || '#ffd700'
      ctx.globalAlpha = translationAlpha * 0.9
      ctx.fillText(prepareText(`✨ ${text.reflectionNoteText.trim()}`, false), width / 2, cursorY + height * 0.02)
    }
  }

  // ── Render Bottom Reference (if selected) ────────────────
  if (text.surahHeaderPosition === 'bottom') {
    const bottomTitleSize = surahHeader.isRtl
      ? Math.max(14, Math.round(height * 0.03))
      : Math.max(12, Math.round(height * 0.024))
    const bottomFont = surahHeader.isRtl ? text.arabicFont : text.translationFont

    ctx.font = buildFont({ size: bottomTitleSize, font: bottomFont })
    ctx.globalAlpha = subtitleAlpha * 0.95
    ctx.fillText(prepareText(surahHeader.title, surahHeader.isRtl), width / 2, cursorY + height * 0.03)

    const bottomSubSize = Math.max(10, Math.round(height * 0.018))
    ctx.font = buildFont({ size: bottomSubSize, font: bottomFont })
    ctx.globalAlpha = subtitleAlpha * 0.75
    ctx.fillText(prepareText(surahHeader.subtitle, surahHeader.isRtl), width / 2, cursorY + height * 0.03 + bottomTitleSize * 1.1)
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

export function renderFrame(ctx: CanvasRenderingContext2D, params: FrameParams): void {
  const { config, image, verse, verseTimeMs, slotDurationMs, timeMs, totalDurationMs } = params
  const width = ctx.canvas.width
  const height = ctx.canvas.height

  ctx.save()
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, width, height)

  // Continuous background motion across entire video timeline (never resets between ayahs)
  const transform = getTransform(config.motion, timeMs, totalDurationMs)
  if (image) {
    drawBackground(ctx, image, width, height, transform, config.background.fit)
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

  drawVerse(ctx, config, verse, verseTimeMs, slotDurationMs, width, height)
  drawFooterBranding(ctx, config, width, height)
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
      ayahPauseDelay: 1.6,
      showBasmalah: true,
      karaokeHighlight: false,
      highlightColor: '#ffd700',
      secondaryEditionId: 'none',
      showReflectionNote: false,
      reflectionNoteText: 'Reflect upon the signs of Allah',
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
      duration: 10,
    },
    aspectRatio: '9:16',
  }
}
