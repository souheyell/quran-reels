import type { ReelConfig, Verse } from '../types'
import { buildFont } from './reelRenderer'
import { prepareText } from './textLayout'

export interface HolyPaperTheme {
  id: string
  name: string
  paperGrad: [string, string, string] // [top-left, center, bottom-right]
  grainColor: string
  frameGold: string
  frameInner: string
  frameBand: string
  cornerAccent: string
  bannerBg: string
  bannerBorder: string
  bannerText: string
  inkColor: string
  medallionGold: string
  medallionInner: string
  medallionNumColor: string
  sideMedallionGold: string
  sideMedallionAccent: string
  footnoteBg: string
  footnoteBorder: string
  footnoteText: string
}

export const HOLY_PAPER_THEMES: Record<string, HolyPaperTheme> = {
  'madani-cream': {
    id: 'madani-cream',
    name: 'Madani Cream (Medina Mushaf)',
    paperGrad: ['#fcfbf8', '#f8f4e6', '#ede5cf'],
    grainColor: 'rgba(160, 130, 95, 0.05)',
    frameGold: '#c59b27',
    frameInner: '#1b4332', // Medina emerald green
    frameBand: 'rgba(27, 67, 50, 0.07)',
    cornerAccent: '#1b4332',
    bannerBg: 'rgba(27, 67, 50, 0.09)',
    bannerBorder: '#c59b27',
    bannerText: '#143d2b',
    inkColor: '#171412',
    medallionGold: '#c59b27',
    medallionInner: 'rgba(197, 155, 39, 0.12)',
    medallionNumColor: '#171412',
    sideMedallionGold: '#c59b27',
    sideMedallionAccent: '#1b4332',
    footnoteBg: 'rgba(248, 244, 230, 0.96)',
    footnoteBorder: 'rgba(197, 155, 39, 0.4)',
    footnoteText: '#383227',
  },
  'vintage-parchment': {
    id: 'vintage-parchment',
    name: 'Antique Parchment Papyrus',
    paperGrad: ['#f5ecda', '#eee1c7', '#dfceaa'],
    grainColor: 'rgba(130, 90, 50, 0.07)',
    frameGold: '#ad7a35',
    frameInner: '#543219',
    frameBand: 'rgba(84, 50, 25, 0.08)',
    cornerAccent: '#543219',
    bannerBg: 'rgba(84, 50, 25, 0.1)',
    bannerBorder: '#ad7a35',
    bannerText: '#432510',
    inkColor: '#22160d', // Rich walnut sepia
    medallionGold: '#ad7a35',
    medallionInner: 'rgba(173, 122, 53, 0.15)',
    medallionNumColor: '#22160d',
    sideMedallionGold: '#ad7a35',
    sideMedallionAccent: '#543219',
    footnoteBg: 'rgba(238, 225, 199, 0.96)',
    footnoteBorder: 'rgba(173, 122, 53, 0.45)',
    footnoteText: '#3d2e24',
  },
  'royal-ivory': {
    id: 'royal-ivory',
    name: 'Royal Ivory & Lapis',
    paperGrad: ['#ffffff', '#faf7f0', '#f0e8d6'],
    grainColor: 'rgba(150, 130, 100, 0.04)',
    frameGold: '#d4af37',
    frameInner: '#0f2e4d', // Deep lapis lazuli blue
    frameBand: 'rgba(15, 46, 77, 0.07)',
    cornerAccent: '#0f2e4d',
    bannerBg: 'rgba(15, 46, 77, 0.09)',
    bannerBorder: '#d4af37',
    bannerText: '#0f2e4d',
    inkColor: '#12161c',
    medallionGold: '#d4af37',
    medallionInner: 'rgba(212, 175, 55, 0.14)',
    medallionNumColor: '#0f2e4d',
    sideMedallionGold: '#d4af37',
    sideMedallionAccent: '#0f2e4d',
    footnoteBg: 'rgba(250, 247, 240, 0.96)',
    footnoteBorder: 'rgba(212, 175, 55, 0.4)',
    footnoteText: '#262f3a',
  },
  'obsidian-gold': {
    id: 'obsidian-gold',
    name: 'Midnight Charcoal & Gold',
    paperGrad: ['#12161e', '#0b0f16', '#06080d'],
    grainColor: 'rgba(255, 255, 255, 0.03)',
    frameGold: '#f59e0b',
    frameInner: '#fbbf24',
    frameBand: 'rgba(245, 158, 11, 0.08)',
    cornerAccent: '#fbbf24',
    bannerBg: 'rgba(245, 158, 11, 0.14)',
    bannerBorder: '#f59e0b',
    bannerText: '#fbbf24',
    inkColor: '#fef3c7', // Warm luminous gold ink
    medallionGold: '#f59e0b',
    medallionInner: 'rgba(245, 158, 11, 0.22)',
    medallionNumColor: '#fef3c7',
    sideMedallionGold: '#f59e0b',
    sideMedallionAccent: '#fbbf24',
    footnoteBg: 'rgba(16, 21, 29, 0.96)',
    footnoteBorder: 'rgba(245, 158, 11, 0.35)',
    footnoteText: '#e2e8f0',
  },
}

// Aliases for seamless backward-compatibility
HOLY_PAPER_THEMES['madani-parchment'] = HOLY_PAPER_THEMES['madani-cream']!
HOLY_PAPER_THEMES['emerald-noor'] = HOLY_PAPER_THEMES['madani-cream']!

/**
 * Converts standard integer into Arabic-Indic numerals (١, ٢, ٣...)
 */
export function toArabicIndicNumerals(n: number): string {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
  return n
    .toString()
    .split('')
    .map((d) => arabicDigits[parseInt(d, 10)] ?? d)
    .join('')
}

/**
 * Draw realistic organic parchment paper background with fiber texture,
 * vignette shading, and book spine depth.
 */
function drawRealisticParchment(
  ctx: CanvasRenderingContext2D,
  theme: HolyPaperTheme,
  w: number,
  h: number,
  _scale: number,
): void {
  ctx.save()

  // 1. Multi-point paper gradient simulating natural illumination
  const grad = ctx.createRadialGradient(w * 0.48, h * 0.45, w * 0.1, w * 0.5, h * 0.5, Math.max(w, h) * 0.75)
  grad.addColorStop(0, theme.paperGrad[0])
  grad.addColorStop(0.65, theme.paperGrad[1])
  grad.addColorStop(1, theme.paperGrad[2])
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)

  // 2. Soft page vignette & aging along outer edges
  const edgeVignette = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.72)
  edgeVignette.addColorStop(0, 'rgba(0, 0, 0, 0)')
  edgeVignette.addColorStop(0.7, 'rgba(0, 0, 0, 0.015)')
  edgeVignette.addColorStop(1, 'rgba(0, 0, 0, 0.055)')
  ctx.fillStyle = edgeVignette
  ctx.fillRect(0, 0, w, h)

  // 3. Subtle page spine shadow on left margin (gives the depth of a real open holy book)
  const spineWidth = Math.round(w * 0.04)
  const spineGrad = ctx.createLinearGradient(0, 0, spineWidth, 0)
  spineGrad.addColorStop(0, 'rgba(0, 0, 0, 0.06)')
  spineGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = spineGrad
  ctx.fillRect(0, 0, spineWidth, h)

  // 4. Subtle parchment micro-fibers (procedural paper grain)
  ctx.fillStyle = theme.grainColor
  const numFibers = 45
  for (let i = 0; i < numFibers; i++) {
    const fx = ((i * 197.3 + 23) % w)
    const fy = ((i * 311.7 + 71) % h)
    const fl = ((i % 5) + 2)
    ctx.fillRect(fx, fy, fl, 1)
  }

  ctx.restore()
}

/**
 * Draw ornate 8-pointed Islamic Star rosette (Rub-el-Hizb)
 */
function drawIslamicStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  strokeColor: string,
  fillColor: string,
  lineWidth: number,
): void {
  ctx.save()
  const half = size / 2

  ctx.strokeStyle = strokeColor
  ctx.fillStyle = fillColor
  ctx.lineWidth = lineWidth

  // Square 1
  ctx.beginPath()
  ctx.rect(cx - half, cy - half, size, size)
  ctx.fill()
  ctx.stroke()

  // Square 2 rotated 45 degrees
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(Math.PI / 4)
  ctx.beginPath()
  ctx.rect(-half, -half, size, size)
  ctx.fill()
  ctx.stroke()
  ctx.restore()

  // Center pearl
  ctx.beginPath()
  ctx.arc(cx, cy, size * 0.18, 0, Math.PI * 2)
  ctx.fillStyle = strokeColor
  ctx.fill()

  ctx.restore()
}

/**
 * Draw authentic Islamic corner palmette/arabesque filigree
 */
function drawCornerPalmette(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  dirX: number,
  dirY: number,
  goldColor: string,
  accentColor: string,
  scale: number,
): void {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(dirX, dirY)

  // Outer corner arc flourish
  ctx.strokeStyle = goldColor
  ctx.lineWidth = Math.max(1.5, Math.round(2 * scale))
  ctx.lineCap = 'round'

  ctx.beginPath()
  ctx.moveTo(0, size)
  ctx.quadraticCurveTo(0, 0, size, 0)
  ctx.stroke()

  // Inner decorative lobe
  ctx.strokeStyle = accentColor
  ctx.lineWidth = Math.max(1, Math.round(1.2 * scale))
  ctx.beginPath()
  ctx.moveTo(size * 0.15, size * 0.75)
  ctx.quadraticCurveTo(size * 0.15, size * 0.25, size * 0.35, size * 0.25)
  ctx.quadraticCurveTo(size * 0.25, size * 0.15, size * 0.75, size * 0.15)
  ctx.stroke()

  // Mini gold rosette at corner vertex
  drawIslamicStar(
    ctx,
    size * 0.38,
    size * 0.38,
    size * 0.3,
    goldColor,
    'rgba(197, 155, 39, 0.15)',
    Math.max(1, Math.round(1.2 * scale)),
  )

  ctx.restore()
}

/**
 * Draw authentic side margin Shamsah rosette medallion (علامة الحزب / الشمسة الهامشية)
 * found in traditional Holy Quran pages.
 */
function drawSideMarginalShamsah(
  ctx: CanvasRenderingContext2D,
  theme: HolyPaperTheme,
  x: number,
  y: number,
  size: number,
  scale: number,
): void {
  ctx.save()

  // Outer radiating gold petals
  ctx.strokeStyle = theme.sideMedallionGold
  ctx.fillStyle = theme.sideMedallionAccent
  ctx.lineWidth = Math.max(1, Math.round(1.5 * scale))

  const numPetals = 12
  for (let i = 0; i < numPetals; i++) {
    const angle = (i * Math.PI * 2) / numPetals
    const px = x + Math.cos(angle) * (size * 0.46)
    const py = y + Math.sin(angle) * (size * 0.46)
    ctx.beginPath()
    ctx.arc(px, py, size * 0.1, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }

  // Multi-tier inner Islamic Star
  drawIslamicStar(
    ctx,
    x,
    y,
    size * 0.72,
    theme.sideMedallionGold,
    theme.bannerBg,
    Math.max(1, Math.round(1.8 * scale)),
  )

  drawIslamicStar(
    ctx,
    x,
    y,
    size * 0.4,
    theme.sideMedallionGold,
    theme.sideMedallionAccent,
    Math.max(1, Math.round(1.2 * scale)),
  )

  // Finial connector needle pointing inward to the Quran text
  ctx.strokeStyle = theme.sideMedallionGold
  ctx.lineWidth = Math.max(1.5, Math.round(2 * scale))
  ctx.beginPath()
  ctx.moveTo(x - size * 0.52, y)
  ctx.lineTo(x - size * 0.7, y)
  ctx.stroke()

  ctx.restore()
}

/**
 * Draw multi-tier authentic Medina Mushaf Page Border with corner palmettes,
 * page header cartouche, and outer marginal ornament.
 */
function drawMadaniMushafBorder(
  ctx: CanvasRenderingContext2D,
  theme: HolyPaperTheme,
  x: number,
  y: number,
  w: number,
  h: number,
  scale: number,
  surahName: string,
): void {
  ctx.save()

  // Outer primary gold border line
  ctx.strokeStyle = theme.frameGold
  ctx.lineWidth = Math.max(2, Math.round(3.5 * scale))
  ctx.strokeRect(x, y, w, h)

  // Decorative inlay band between borders
  const bandMargin = Math.round(8 * scale)
  const innerMargin = Math.round(18 * scale)

  ctx.fillStyle = theme.frameBand
  ctx.fillRect(x + bandMargin, y + bandMargin, w - bandMargin * 2, h - bandMargin * 2)

  // Inner margin border
  ctx.strokeStyle = theme.frameInner
  ctx.lineWidth = Math.max(1, Math.round(1.8 * scale))
  ctx.strokeRect(x + innerMargin, y + innerMargin, w - innerMargin * 2, h - innerMargin * 2)

  // Secondary thin gold hairline
  const hairMargin = innerMargin + Math.round(5 * scale)
  ctx.strokeStyle = theme.frameGold
  ctx.lineWidth = Math.max(1, Math.round(1 * scale))
  ctx.strokeRect(x + hairMargin, y + hairMargin, w - hairMargin * 2, h - hairMargin * 2)

  // Corner palmette arabesques
  const cornerSize = Math.round(36 * scale)
  drawCornerPalmette(ctx, x + hairMargin, y + hairMargin, cornerSize, 1, 1, theme.frameGold, theme.cornerAccent, scale)
  drawCornerPalmette(ctx, x + w - hairMargin, y + hairMargin, cornerSize, -1, 1, theme.frameGold, theme.cornerAccent, scale)
  drawCornerPalmette(ctx, x + hairMargin, y + h - hairMargin, cornerSize, 1, -1, theme.frameGold, theme.cornerAccent, scale)
  drawCornerPalmette(ctx, x + w - hairMargin, y + h - hairMargin, cornerSize, -1, -1, theme.frameGold, theme.cornerAccent, scale)

  // Side Marginal Shamsah Medallion (علامة الحزب/الشمسة الهامشية)
  const shamsahX = x + w + Math.round(18 * scale)
  const shamsahY = y + h * 0.35
  const shamsahSize = Math.round(28 * scale)
  if (shamsahX + shamsahSize / 2 < ctx.canvas.width) {
    drawSideMarginalShamsah(ctx, theme, shamsahX, shamsahY, shamsahSize, scale)
  }

  // Top Page Classical Header Line
  const headerY = y + Math.round(30 * scale)
  const headerFont = `600 ${Math.max(11, Math.round(17 * scale))}px "Amiri", "Scheherazade New", serif`
  ctx.font = headerFont
  ctx.fillStyle = theme.bannerText

  // Right side: Surah Name
  ctx.textAlign = 'right'
  ctx.fillText(`سُورَةُ ${surahName}`, x + w - innerMargin - Math.round(18 * scale), headerY)

  // Left side: Traditional Holy Mushaf inscription
  ctx.textAlign = 'left'
  ctx.fillText('مُصْحَفُ المَدِينَةِ المُنَوَّرَةِ', x + innerMargin + Math.round(18 * scale), headerY)

  // Subtle header separator rule
  ctx.strokeStyle = theme.frameGold
  ctx.lineWidth = Math.max(1, Math.round(1 * scale))
  ctx.beginPath()
  ctx.moveTo(x + innerMargin + Math.round(14 * scale), headerY + Math.round(10 * scale))
  ctx.lineTo(x + w - innerMargin - Math.round(14 * scale), headerY + Math.round(10 * scale))
  ctx.stroke()

  ctx.restore()
}

/**
 * Draw gilded Surah Title Cartouche Banner
 */
function drawSurahCartoucheBanner(
  ctx: CanvasRenderingContext2D,
  theme: HolyPaperTheme,
  cx: number,
  topY: number,
  maxW: number,
  surahName: string,
  scale: number,
): number {
  ctx.save()
  const bannerW = Math.min(maxW, Math.round(540 * scale))
  const bannerH = Math.round(54 * scale)
  const bx = cx - bannerW / 2
  const by = topY

  // Cartouche background with soft rounded edges
  ctx.fillStyle = theme.bannerBg
  ctx.beginPath()
  ctx.roundRect(bx, by, bannerW, bannerH, Math.round(6 * scale))
  ctx.fill()

  // Outer gilded border
  ctx.strokeStyle = theme.bannerBorder
  ctx.lineWidth = Math.max(1.5, Math.round(2.5 * scale))
  ctx.stroke()

  // Inner margin line
  const inPad = Math.round(4 * scale)
  ctx.strokeStyle = theme.frameInner
  ctx.lineWidth = Math.max(1, Math.round(1.2 * scale))
  ctx.strokeRect(bx + inPad, by + inPad, bannerW - inPad * 2, bannerH - inPad * 2)

  // Rosettes on left & right ends of banner
  const rosetteSize = Math.round(18 * scale)
  drawIslamicStar(ctx, bx + inPad + rosetteSize, by + bannerH / 2, rosetteSize, theme.bannerBorder, theme.frameInner, Math.max(1, scale))
  drawIslamicStar(ctx, bx + bannerW - inPad - rosetteSize, by + bannerH / 2, rosetteSize, theme.bannerBorder, theme.frameInner, Math.max(1, scale))

  // Surah Title in classical calligraphic font
  ctx.fillStyle = theme.bannerText
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `700 ${Math.max(14, Math.round(24 * scale))}px "Amiri Quran", "Amiri", serif`
  ctx.fillText(`سُورَةُ ${surahName}`, cx, by + bannerH / 2)

  ctx.restore()
  return by + bannerH + Math.round(16 * scale)
}

/**
 * Draw Basmalah in classical calligraphic proportion
 */
function drawBasmalahHeader(
  ctx: CanvasRenderingContext2D,
  theme: HolyPaperTheme,
  cx: number,
  y: number,
  scale: number,
  font: string,
): number {
  ctx.save()
  ctx.fillStyle = theme.bannerText
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.font = `600 ${Math.max(15, Math.round(28 * scale))}px ${font}`
  ctx.fillText('بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ', cx, y)
  ctx.restore()
  return y + Math.round(42 * scale)
}

interface HolyTextLine {
  text: string
  versesIncluded: number[]
  y: number
  height: number
}

/**
 * Tokenize selected verses and lay them out into justified lines
 */
function layoutContinuousQuranText(
  ctx: CanvasRenderingContext2D,
  verses: Verse[],
  font: string,
  fontSize: number,
  maxWidth: number,
  startY: number,
  lineHeight: number,
): HolyTextLine[] {
  ctx.font = `${fontSize}px ${font}`

  interface Token {
    word: string
    verseIndex: number
    isMedallion: boolean
  }

  const tokens: Token[] = []
  verses.forEach((v, vIdx) => {
    let cleanText = (v.arabic || '').trim()
    // Strip redundant leading Basmalah if not verse 1 of Al-Fatiha
    if (v.ayat !== 1 && cleanText.startsWith('بِسْمِ')) {
      cleanText = cleanText.replace(/^(?:بِسْمِ\s*ٱ?للَّهِ\s*ٱلرَّحْمَٰ?نِ\s*ٱلرَّحِيمِ\s*)/u, '').trim()
    }

    const words = cleanText.split(/\s+/).filter(Boolean)
    words.forEach((w) => {
      tokens.push({ word: w, verseIndex: vIdx, isMedallion: false })
    })

    // Append gilded verse end medallion: ۝١
    tokens.push({
      word: `۝${toArabicIndicNumerals(v.ayat)}`,
      verseIndex: vIdx,
      isMedallion: true,
    })
  })

  const lines: HolyTextLine[] = []
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
 * Dynamically computes the optimal font size so the entire selection of verses
 * fits beautifully and proportionally onto the Holy Quran paper without clipping.
 */
function fitQuranTextToPage(
  ctx: CanvasRenderingContext2D,
  verses: Verse[],
  font: string,
  maxWidth: number,
  maxHeight: number,
  preferredSize: number,
  scale: number,
): { fontSize: number; lineHeight: number; lines: HolyTextLine[] } {
  let size = preferredSize

  // Estimate lower and upper bounds
  const minSize = Math.max(14, Math.round(18 * scale))
  const lineSpacingRatio = 2.15

  while (size >= minSize) {
    const lineHeight = Math.round(size * lineSpacingRatio)
    const lines = layoutContinuousQuranText(ctx, verses, font, size, maxWidth, 0, lineHeight)
    const totalH = lines.length * lineHeight

    if (totalH <= maxHeight || size <= minSize) {
      return { fontSize: size, lineHeight, lines }
    }
    size = Math.max(minSize, Math.round(size * 0.92))
  }

  const lineHeight = Math.round(minSize * lineSpacingRatio)
  const lines = layoutContinuousQuranText(ctx, verses, font, minSize, maxWidth, 0, lineHeight)
  return { fontSize: minSize, lineHeight, lines }
}

/**
 * Main Renderer: Holy Quran Paper Only
 *
 * Renders an authentic full-screen Holy Quran paper page displaying the whole
 * verse/ayat selected by the user, with zero distracting video effects (no moving
 * background, no atmospheric particles, no audio waveforms, no neon glows).
 */
export function drawHolyQuranPaper(
  ctx: CanvasRenderingContext2D,
  config: ReelConfig,
  verses: Verse[],
  activeVerse: Verse,
  _verseTimeMs: number,
  _slotDurationMs: number,
  width: number,
  height: number,
): void {
  const textConfig = config.text
  const themeName = textConfig.mushafTheme || 'madani-cream'
  const theme = HOLY_PAPER_THEMES[themeName] || HOLY_PAPER_THEMES['madani-cream']!

  const baseWidth = 1080
  const scale = width / baseWidth
  const surahName = activeVerse.surahArabicName || activeVerse.surahName

  ctx.save()

  // 1. Draw Full-Screen Realistic Holy Quran Parchment Paper
  drawRealisticParchment(ctx, theme, width, height, scale)

  // 2. Page Frame Dimensions
  const pageMarginX = Math.round(36 * scale)
  const pageMarginY = Math.round(44 * scale)
  const pageW = width - pageMarginX * 2
  const pageH = height - pageMarginY * 2

  // 3. Draw Ornate Madani Mushaf Page Border & Ornaments
  drawMadaniMushafBorder(ctx, theme, pageMarginX, pageMarginY, pageW, pageH, scale, surahName)

  // 4. Content Area Layout
  const innerPadX = Math.round(52 * scale)
  const contentW = pageW - innerPadX * 2
  const centerX = width / 2

  const topAvailableY = pageMarginY + Math.round(62 * scale)

  // Reserve space at bottom for translation footnote if enabled
  const hasTranslation = textConfig.showTranslation && !!activeVerse.translation
  const footnoteHeight = hasTranslation ? Math.round(80 * scale) : 0
  const bottomAvailableY = pageMarginY + pageH - Math.round(30 * scale) - footnoteHeight
  const maxContentH = bottomAvailableY - topAvailableY

  // 5. Header Elements (Surah Cartouche & Basmalah)
  let headerBlockH = 0
  const shouldShowCartouche = activeVerse.ayat === 1 || verses.length <= 4
  const shouldShowBasmalah = textConfig.showBasmalah && (activeVerse.ayat === 1 || verses.length <= 3)

  if (shouldShowCartouche) {
    headerBlockH += Math.round(54 * scale) + Math.round(16 * scale)
  }
  if (shouldShowBasmalah) {
    headerBlockH += Math.round(42 * scale)
  }

  const textMaxH = Math.max(100, maxContentH - headerBlockH)

  // 6. Optimal Font Size & Text Layout Calculation
  // Scale preferred font size based on selection volume
  let basePreferred = Math.round((textConfig.arabicSize || 64) * scale * 0.72)
  if (verses.length === 1 && (verses[0]?.arabic.length || 0) < 100) {
    // Single short verse: give it majestic large presence
    basePreferred = Math.round((textConfig.arabicSize || 64) * scale * 0.88)
  } else if (verses.length > 5) {
    // Multi-verse passage: scale down to fit comfortably
    basePreferred = Math.round((textConfig.arabicSize || 64) * scale * 0.58)
  }

  const { fontSize, lineHeight, lines } = fitQuranTextToPage(
    ctx,
    verses,
    textConfig.arabicFont,
    contentW,
    textMaxH,
    basePreferred,
    scale,
  )

  const textTotalH = lines.length * lineHeight
  const totalCombinedContentH = headerBlockH + textTotalH

  // 7. Harmonious Vertical Centering on Holy Page
  let cursorY = topAvailableY
  if (totalCombinedContentH < maxContentH) {
    const extraSpace = maxContentH - totalCombinedContentH
    cursorY += Math.round(extraSpace * 0.42) // Balanced optical center
  }

  // Draw Surah Cartouche Banner
  if (shouldShowCartouche) {
    cursorY = drawSurahCartoucheBanner(
      ctx,
      theme,
      centerX,
      cursorY,
      contentW,
      surahName,
      scale,
    )
  }

  // Draw Basmalah Header
  if (shouldShowBasmalah) {
    cursorY = drawBasmalahHeader(ctx, theme, centerX, cursorY, scale, textConfig.arabicFont)
  }

  cursorY += Math.round(8 * scale)

  // 8. Render Continuous Quranic Calligraphy Lines in Classical Ink
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.font = buildFont({ size: fontSize, font: textConfig.arabicFont })
  ctx.fillStyle = theme.inkColor

  lines.forEach((line, lineIdx) => {
    const lineY = cursorY + lineIdx * lineHeight
    ctx.fillText(prepareText(line.text, true), centerX, lineY)
  })

  // 9. Optional Footnote Translation Card (if enabled)
  if (hasTranslation) {
    const drawerPad = Math.round(14 * scale)
    const drawerW = pageW - Math.round(50 * scale)
    const drawerH = Math.round(75 * scale)
    const drawerX = centerX - drawerW / 2
    const drawerY = pageMarginY + pageH - drawerH - Math.round(22 * scale)

    ctx.save()
    ctx.fillStyle = theme.footnoteBg
    ctx.beginPath()
    ctx.roundRect(drawerX, drawerY, drawerW, drawerH, Math.round(8 * scale))
    ctx.fill()

    ctx.strokeStyle = theme.footnoteBorder
    ctx.lineWidth = Math.max(1, Math.round(1.2 * scale))
    ctx.stroke()

    // Translation footnote text
    const transFontSize = Math.max(10, Math.round((textConfig.translationSize || 36) * scale * 0.48))
    ctx.fillStyle = theme.footnoteText
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `500 ${transFontSize}px ${textConfig.translationFont}`

    const transText = `"${activeVerse.translation.trim()}"`
    ctx.fillText(transText, centerX, drawerY + drawerH / 2, drawerW - drawerPad * 2)

    ctx.restore()
  }

  ctx.restore()
}
