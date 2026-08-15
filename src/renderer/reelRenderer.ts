import type { ReelConfig, Verse } from '../types'
import { drawBackground, getTransform } from './kenburns'
import { fitFontSize, isRtl, prepareText } from './textLayout'
import { DEFAULT_BACKGROUND_URL } from '../api/unsplash'

export const ASPECT_SIZES: Record<ReelConfig['aspectRatio'], { width: number; height: number }> = {
  '9:16': { width: 1440, height: 2560 },
  '1:1': { width: 1440, height: 1440 },
  '16:9': { width: 2560, height: 1440 },
}

/** Preview renders at 1/3 resolution to reduce GPU load */
export const PREVIEW_SCALE = 1 / 3

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
  image: HTMLImageElement | null
  verse: Verse
  verseTimeMs: number
  slotDurationMs: number
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

function fadeIn(timeMs: number, start: number, duration: number): number {
  if (timeMs <= start) return 0
  if (timeMs >= start + duration) return 1
  return (timeMs - start) / duration
}

function getSurahDisplayTitle(
  verse: Verse,
  language: ReelConfig['text']['surahNameLanguage'] = 'arabic',
): { text: string; isRtl: boolean } {
  const arabicName = verse.surahArabicName || `سُورَةُ ${verse.surah}`
  const englishName = verse.surahName || `Surah ${verse.surah}`
  const refNum = `${verse.surah}:${verse.ayat}`

  if (language === 'english') {
    return { text: `${englishName.toUpperCase()} · ${refNum}`, isRtl: false }
  }
  if (language === 'both') {
    return { text: `${arabicName} (${englishName} ${refNum})`, isRtl: true }
  }
  // Default 'arabic'
  return { text: `${arabicName} · ${refNum}`, isRtl: true }
}

function drawVerse(
  ctx: CanvasRenderingContext2D,
  config: ReelConfig,
  verse: Verse,
  verseTimeMs: number,
  _slotDurationMs: number,
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

  const surahInfo = getSurahDisplayTitle(verse, text.surahNameLanguage || 'arabic')

  // Alphas
  const arabicAlpha = fadeIn(verseTimeMs, 0, 300)
  const translationAlpha = fadeIn(verseTimeMs, 100, 300)
  const referenceAlpha = fadeIn(verseTimeMs, 80, 300)

  ctx.save()
  ctx.fillStyle = text.textColor

  if (text.showGlow) {
    ctx.shadowColor = 'rgba(0,0,0,0.85)'
    ctx.shadowBlur = Math.round(24 * scale)
  }

  // ── Surah Name on Top (Arabic Default) ───────────────────
  const showHeaderTop = text.surahHeaderPosition === 'top' || text.surahHeaderPosition === undefined
  if (showHeaderTop) {
    const topHeaderY = height * 0.08
    const headerFontSize = surahInfo.isRtl
      ? Math.max(14, Math.round(height * 0.03))
      : Math.max(12, Math.round(height * 0.024))
    const headerFont = surahInfo.isRtl ? text.arabicFont : text.translationFont

    ctx.font = buildFont({ size: headerFontSize, font: headerFont })
    ctx.globalAlpha = referenceAlpha * 0.95
    ctx.fillText(prepareText(surahInfo.text, surahInfo.isRtl), width / 2, topHeaderY)
  }

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
  const bottomRefBlock = text.surahHeaderPosition === 'bottom' ? height * 0.035 + height * 0.02 : 0
  const totalHeight = arabicBlock + translationBlock + gap + bottomRefBlock

  let cursorY: number
  if (text.textPosition === 'lower-third') {
    cursorY = lowerThirdY - totalHeight / 2
  } else {
    cursorY = centerY - totalHeight / 2
  }

  // ── Render Arabic Text ───────────────────────────────────
  ctx.font = buildFont({ size: arabicLines.size, font: text.arabicFont })
  ctx.globalAlpha = arabicAlpha
  for (const line of arabicLines.lines) {
    ctx.fillText(prepareText(line.text, arabicRtl), width / 2, cursorY)
    cursorY += arabicLines.size * 1.6
  }

  // ── Render Translation (if enabled) ──────────────────────
  if (text.showTranslation && translationLines && translationBlock > 0) {
    cursorY += gap
    ctx.font = buildFont({ size: translationLines.size, font: text.translationFont })
    ctx.globalAlpha = translationAlpha
    const translationRtl = isRtl(verse.translation)
    for (const line of translationLines.lines) {
      ctx.fillText(prepareText(line.text, translationRtl), width / 2, cursorY)
      cursorY += translationLines.size * 1.5
    }
  }

  // ── Render Bottom Reference (if selected) ────────────────
  if (text.surahHeaderPosition === 'bottom') {
    const bottomFontSize = surahInfo.isRtl
      ? Math.max(14, Math.round(height * 0.03))
      : Math.max(12, Math.round(height * 0.026))
    const bottomFont = surahInfo.isRtl ? text.arabicFont : text.translationFont

    ctx.font = buildFont({ size: bottomFontSize, font: bottomFont })
    ctx.globalAlpha = referenceAlpha
    ctx.fillText(prepareText(surahInfo.text, surahInfo.isRtl), width / 2, cursorY + height * 0.03)
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
  const { config, image, verse, verseTimeMs, slotDurationMs } = params
  const width = ctx.canvas.width
  const height = ctx.canvas.height

  ctx.save()
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, width, height)

  // Ken Burns uses per-verse time for proper cycling in multi-verse reels
  const progress = slotDurationMs > 0 ? verseTimeMs / slotDurationMs : 0
  const motionTimeMs = progress * config.motion.duration * 1000
  const transform = getTransform(config.motion, motionTimeMs)
  if (image) {
    drawBackground(ctx, image, width, height, transform, config.background.fit)
  }

  const overlayAlpha = config.overlay.opacity
  if (overlayAlpha > 0) {
    ctx.fillStyle = hexToRgba(config.overlay.color, overlayAlpha)
    ctx.fillRect(0, 0, width, height)
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
    text: {
      arabicFont: '"Scheherazade New", "Amiri", serif',
      arabicSize: 72,
      translationFont: 'system-ui, sans-serif',
      translationSize: 40,
      textPosition: 'center',
      textColor: '#ffffff',
      showGlow: true,
      showTranslation: true,
      surahHeaderPosition: 'top',
      surahNameLanguage: 'arabic',
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
