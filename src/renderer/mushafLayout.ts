import type { ReelConfig, Verse } from '../types'
import { buildFont } from './reelRenderer'
import { prepareText } from './textLayout'

interface MushafThemeColors {
  bgGradient: [string, string]
  frameColor: string
  frameInnerColor: string
  cornerColor: string
  bannerBg: string
  bannerBorder: string
  bannerText: string
  textColor: string
  activeTextColor: string
  medallionColor: string
  scanGlowColor: string
  drawerBg: string
  drawerBorder: string
  drawerText: string
}

const MUSHAF_THEMES: Record<string, MushafThemeColors> = {
  'obsidian-gold': {
    bgGradient: ['#061322', '#020912'],
    frameColor: '#f59e0b',
    frameInnerColor: 'rgba(245, 158, 11, 0.4)',
    cornerColor: '#fbbf24',
    bannerBg: 'rgba(245, 158, 11, 0.15)',
    bannerBorder: '#f59e0b',
    bannerText: '#fbbf24',
    textColor: 'rgba(255, 255, 255, 0.85)',
    activeTextColor: '#ffffff',
    medallionColor: '#f59e0b',
    scanGlowColor: 'rgba(245, 158, 11, 0.28)',
    drawerBg: 'rgba(5, 20, 36, 0.88)',
    drawerBorder: 'rgba(245, 158, 11, 0.35)',
    drawerText: '#e2e8f0',
  },
  'madani-parchment': {
    bgGradient: ['#fbf6ea', '#f2e8d3'],
    frameColor: '#c59b27',
    frameInnerColor: 'rgba(30, 75, 54, 0.5)',
    cornerColor: '#1e4b36',
    bannerBg: 'rgba(30, 75, 54, 0.12)',
    bannerBorder: '#1e4b36',
    bannerText: '#1e4b36',
    textColor: '#1a1d20',
    activeTextColor: '#0d3b28',
    medallionColor: '#c59b27',
    scanGlowColor: 'rgba(245, 158, 11, 0.32)',
    drawerBg: 'rgba(251, 246, 234, 0.95)',
    drawerBorder: 'rgba(197, 155, 39, 0.45)',
    drawerText: '#1a1d20',
  },
  'emerald-noor': {
    bgGradient: ['#032018', '#01120d'],
    frameColor: '#4edea3',
    frameInnerColor: 'rgba(245, 158, 11, 0.5)',
    cornerColor: '#fbbf24',
    bannerBg: 'rgba(78, 222, 163, 0.15)',
    bannerBorder: '#4edea3',
    bannerText: '#4edea3',
    textColor: 'rgba(255, 255, 255, 0.88)',
    activeTextColor: '#ffffff',
    medallionColor: '#fbbf24',
    scanGlowColor: 'rgba(78, 222, 163, 0.3)',
    drawerBg: 'rgba(2, 25, 18, 0.9)',
    drawerBorder: 'rgba(78, 222, 163, 0.4)',
    drawerText: '#d4e4fa',
  },
}

/**
 * Converts standard integer into Arabic-Indic numerals (١, ٢, ٣...)
 */
function toArabicIndicNumerals(n: number): string {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
  return n
    .toString()
    .split('')
    .map((d) => arabicDigits[parseInt(d, 10)] ?? d)
    .join('')
}

/**
 * Draw ornate Madani Mushaf page border with corner arabesques and header cartouche
 */
function drawMushafFrame(
  ctx: CanvasRenderingContext2D,
  theme: MushafThemeColors,
  x: number,
  y: number,
  w: number,
  h: number,
  scale: number,
  surahName: string,
): void {
  ctx.save()

  // Outer primary golden border
  ctx.strokeStyle = theme.frameColor
  ctx.lineWidth = Math.max(2, Math.round(3 * scale))
  ctx.strokeRect(x, y, w, h)

  // Inner margin border
  const innerMargin = Math.round(12 * scale)
  ctx.strokeStyle = theme.frameInnerColor
  ctx.lineWidth = Math.max(1, Math.round(1.5 * scale))
  ctx.strokeRect(x + innerMargin, y + innerMargin, w - innerMargin * 2, h - innerMargin * 2)

  // Corner floral filigree medallions
  const cornerSize = Math.round(28 * scale)
  const drawCorner = (cx: number, cy: number, flipX: number, flipY: number) => {
    ctx.save()
    ctx.translate(cx, cy)
    ctx.scale(flipX, flipY)
    ctx.strokeStyle = theme.cornerColor
    ctx.lineWidth = Math.max(1, Math.round(1.5 * scale))
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(cornerSize, 0)
    ctx.arc(cornerSize / 2, cornerSize / 2, cornerSize / 2, -Math.PI / 2, 0)
    ctx.lineTo(0, cornerSize)
    ctx.closePath()
    ctx.stroke()
    ctx.restore()
  }

  drawCorner(x + innerMargin, y + innerMargin, 1, 1)
  drawCorner(x + w - innerMargin, y + innerMargin, -1, 1)
  drawCorner(x + innerMargin, y + h - innerMargin, 1, -1)
  drawCorner(x + w - innerMargin, y + h - innerMargin, -1, -1)

  // Top Page Header Cartouche
  const headerY = y + Math.round(24 * scale)
  ctx.fillStyle = theme.bannerText
  ctx.font = `600 ${Math.max(10, Math.round(16 * scale))}px "Amiri", serif`
  ctx.textAlign = 'right'
  ctx.fillText(`سُورَةُ ${surahName}`, x + w - innerMargin - Math.round(16 * scale), headerY)

  ctx.textAlign = 'left'
  ctx.fillText('مُصْحَفُ المَدِينَةِ', x + innerMargin + Math.round(16 * scale), headerY)

  ctx.restore()
}

/**
 * Draw Surah Title Cartouche Banner at top of page
 */
function drawSurahCartouche(
  ctx: CanvasRenderingContext2D,
  theme: MushafThemeColors,
  cx: number,
  topY: number,
  w: number,
  _h: number,
  surahName: string,
  _ayahCount: number,
  scale: number,
): number {
  ctx.save()
  const bannerW = Math.min(w, Math.round(520 * scale))
  const bannerH = Math.round(48 * scale)
  const bx = cx - bannerW / 2
  const by = topY

  // Cartouche background
  ctx.fillStyle = theme.bannerBg
  ctx.fillRect(bx, by, bannerW, bannerH)

  // Cartouche border
  ctx.strokeStyle = theme.bannerBorder
  ctx.lineWidth = Math.max(1, Math.round(2 * scale))
  ctx.strokeRect(bx, by, bannerW, bannerH)

  // Title Text
  ctx.fillStyle = theme.bannerText
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `700 ${Math.max(13, Math.round(22 * scale))}px "Amiri Quran", "Amiri", serif`
  ctx.fillText(`سُورَةُ ${surahName}`, cx, by + bannerH / 2)

  ctx.restore()
  return by + bannerH + Math.round(14 * scale)
}

/**
 * Draw Basmalah header in classical font
 */
function drawMushafBasmalah(
  ctx: CanvasRenderingContext2D,
  theme: MushafThemeColors,
  cx: number,
  y: number,
  scale: number,
  font: string,
): number {
  ctx.save()
  ctx.fillStyle = theme.bannerText
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.font = `600 ${Math.max(14, Math.round(26 * scale))}px ${font}`
  ctx.fillText('بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ', cx, y)
  ctx.restore()
  return y + Math.round(36 * scale)
}

interface MushafLine {
  text: string
  versesIncluded: number[] // verse indices present in this line
  y: number
  height: number
}

/**
 * Lay out full continuous Quran text into justified page lines
 */
function layoutMushafText(
  ctx: CanvasRenderingContext2D,
  verses: Verse[],
  font: string,
  fontSize: number,
  maxWidth: number,
  startY: number,
  lineHeight: number,
): MushafLine[] {
  ctx.font = `${fontSize}px ${font}`

  // Build composite string with ayah medallions
  interface Token {
    word: string
    verseIndex: number
    isMedallion: boolean
  }

  const tokens: Token[] = []
  verses.forEach((v, vIdx) => {
    let cleanText = (v.arabic || '').trim()
    // Strip redundant leading basmalah if not verse 1 of Al-Fatiha
    if (v.ayat !== 1 && cleanText.startsWith('بِسْمِ')) {
      cleanText = cleanText.replace(/^(?:بِسْمِ\s*ٱ?للَّهِ\s*ٱلرَّحْمَٰ?نِ\s*ٱلرَّحِيمِ\s*)/u, '').trim()
    }

    const words = cleanText.split(/\s+/).filter(Boolean)
    words.forEach((w: string) => {
      tokens.push({ word: w, verseIndex: vIdx, isMedallion: false })
    })

    // Append gilded verse end medallion: ۝١
    tokens.push({
      word: `۝${toArabicIndicNumerals(v.ayat)}`,
      verseIndex: vIdx,
      isMedallion: true,
    })
  })

  const lines: MushafLine[] = []
  let currentWords: string[] = []
  let currentVerseIndices = new Set<number>()
  let currentY = startY

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    if (!token) continue
    const testLine = [...currentWords, token.word].join(' ')
    const metrics = ctx.measureText(testLine)

    if (metrics.width > maxWidth && currentWords.length > 0) {
      lines.push({
        text: currentWords.join(' '),
        versesIncluded: Array.from(currentVerseIndices),
        y: currentY,
        height: lineHeight,
      })
      currentY += lineHeight
      currentWords = [token.word]
      currentVerseIndices = new Set([token.verseIndex])
    } else {
      currentWords.push(token.word)
      currentVerseIndices.add(token.verseIndex)
    }
  }

  if (currentWords.length > 0) {
    lines.push({
      text: currentWords.join(' '),
      versesIncluded: Array.from(currentVerseIndices),
      y: currentY,
      height: lineHeight,
    })
  }

  return lines
}

/**
 * Main renderer for Mushaf Printed Page Mode
 */
export function drawMushafPage(
  ctx: CanvasRenderingContext2D,
  config: ReelConfig,
  verses: Verse[],
  activeVerse: Verse,
  verseTimeMs: number,
  _slotDurationMs: number,
  width: number,
  height: number,
): void {
  const textConfig = config.text
  const themeName = textConfig.mushafTheme || 'obsidian-gold'
  const theme = MUSHAF_THEMES[themeName] || MUSHAF_THEMES['obsidian-gold']!

  const baseWidth = 1080
  const scale = width / baseWidth

  const activeIndex = Math.max(0, verses.indexOf(activeVerse))
  const surahName = activeVerse.surahArabicName || activeVerse.surahName

  ctx.save()

  // 1. Draw Page Background
  const pageMarginX = Math.round(48 * scale)
  const pageMarginY = Math.round(64 * scale)
  const pageW = width - pageMarginX * 2
  const pageH = height - pageMarginY * 2

  const bgGrad = ctx.createLinearGradient(0, pageMarginY, 0, pageMarginY + pageH)
  bgGrad.addColorStop(0, theme.bgGradient[0])
  bgGrad.addColorStop(1, theme.bgGradient[1])
  ctx.fillStyle = bgGrad
  ctx.fillRect(pageMarginX, pageMarginY, pageW, pageH)

  // 2. Draw Ornate Frame
  drawMushafFrame(ctx, theme, pageMarginX, pageMarginY, pageW, pageH, scale, surahName)

  // 3. Draw Surah Title Cartouche Banner
  let cursorY = pageMarginY + Math.round(44 * scale)
  const contentW = pageW - Math.round(64 * scale)
  const centerX = width / 2

  if (activeVerse.ayat === 1 || verses.length <= 4) {
    cursorY = drawSurahCartouche(
      ctx,
      theme,
      centerX,
      cursorY,
      contentW,
      Math.round(44 * scale),
      surahName,
      verses.length,
      scale,
    )
  }

  // 4. Draw Basmalah (if enabled & verse 1 or short passage)
  if (textConfig.showBasmalah && (activeVerse.ayat === 1 || verses.length <= 3)) {
    cursorY = drawMushafBasmalah(ctx, theme, centerX, cursorY, scale, textConfig.arabicFont)
  }

  // 5. Layout and Render Continuous Quran Lines
  const fontSize = Math.max(18, Math.round(textConfig.arabicSize * scale * 0.58))
  const lineHeight = Math.round(fontSize * 2.1)
  const textStartY = cursorY + Math.round(8 * scale)

  const lines = layoutMushafText(
    ctx,
    verses,
    textConfig.arabicFont,
    fontSize,
    contentW,
    textStartY,
    lineHeight,
  )

  const glowIntensity = textConfig.mushafGlowIntensity ?? 0.85

  // 6. Draw Luminous Active Line / Ayah Scanning Highlight
  lines.forEach((line) => {
    const isActiveLine = line.versesIncluded.includes(activeIndex)

    if (isActiveLine) {
      ctx.save()
      const linePad = Math.round(10 * scale)
      const highlightX = centerX - contentW / 2 - linePad
      const highlightY = line.y - Math.round(fontSize * 0.2)
      const highlightW = contentW + linePad * 2
      const highlightH = lineHeight

      // Breathing glow pulse
      const pulse = Math.sin(verseTimeMs / 400) * 0.08 + 0.92
      ctx.fillStyle = theme.scanGlowColor
      ctx.globalAlpha = Math.min(1, glowIntensity * pulse)
      ctx.beginPath()
      ctx.roundRect(highlightX, highlightY, highlightW, highlightH, Math.round(8 * scale))
      ctx.fill()

      // Active gold border glow
      ctx.strokeStyle = theme.frameColor
      ctx.lineWidth = Math.max(1, Math.round(1.5 * scale))
      ctx.globalAlpha = 0.6 * pulse
      ctx.stroke()
      ctx.restore()
    }
  })

  // 7. Draw Arabic Quranic Text Lines
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.font = buildFont({ size: fontSize, font: textConfig.arabicFont })

  lines.forEach((line) => {
    const isActiveLine = line.versesIncluded.includes(activeIndex)

    ctx.save()
    if (isActiveLine) {
      ctx.fillStyle = theme.activeTextColor
      if (textConfig.showGlow) {
        ctx.shadowColor = theme.frameColor
        ctx.shadowBlur = Math.round(12 * scale)
      }
    } else {
      ctx.fillStyle = theme.textColor
      ctx.globalAlpha = 0.72
    }

    ctx.fillText(prepareText(line.text, true), centerX, line.y)
    ctx.restore()
  })

  // 8. Draw Translation Drawer Card at Bottom (if translation enabled)
  if (textConfig.showTranslation && activeVerse.translation) {
    const drawerPad = Math.round(16 * scale)
    const drawerW = pageW - Math.round(40 * scale)
    const drawerH = Math.round(85 * scale)
    const drawerX = centerX - drawerW / 2
    const drawerY = pageMarginY + pageH - drawerH - Math.round(20 * scale)

    ctx.save()
    ctx.fillStyle = theme.drawerBg
    ctx.beginPath()
    ctx.roundRect(drawerX, drawerY, drawerW, drawerH, Math.round(12 * scale))
    ctx.fill()

    ctx.strokeStyle = theme.drawerBorder
    ctx.lineWidth = Math.max(1, Math.round(1.5 * scale))
    ctx.stroke()

    // Translation Text
    const transFontSize = Math.max(11, Math.round(textConfig.translationSize * scale * 0.52))
    ctx.fillStyle = theme.drawerText
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `500 ${transFontSize}px ${textConfig.translationFont}`

    // Word wrap translation into 1 or 2 lines
    const transText = `"${activeVerse.translation.trim()}"`
    ctx.fillText(transText, centerX, drawerY + drawerH / 2, drawerW - drawerPad * 2)

    ctx.restore()
  }

  ctx.restore()
}
