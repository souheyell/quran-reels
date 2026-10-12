import type { ReelConfig } from '../types'

export type MotionType = ReelConfig['motion']['type']

export interface Transform {
  x: number
  y: number
  scale: number
}

export interface MotionConfig {
  type: MotionType
  duration: number
}

function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/**
 * Calculate continuous Ken Burns transformation across the entire video reel duration.
 * Supports multiple cinematic motion techniques for nature and architecture footage.
 */
export function getTransform(
  config: MotionConfig,
  timeMs: number,
  totalDurationMs?: number,
): Transform {
  if (config.type === 'static') {
    return { x: 0, y: 0, scale: 1 }
  }

  const durationMs =
    totalDurationMs && totalDurationMs > 0
      ? totalDurationMs
      : config.duration * 1000

  // Seamless continuous progress across the entire reel
  const clampedTime = Math.max(0, timeMs)
  const progress = durationMs > 0 ? Math.min(Math.max(clampedTime / durationMs, 0), 1) : 0
  const e = easeInOut(progress)

  switch (config.type) {
    case 'kenburns-zoom': {
      // Gentle cinematic zoom in
      const scale = 1.08 + 0.14 * e
      return { x: 0, y: 0, scale }
    }

    case 'kenburns-zoom-out': {
      // Reveal zoom out
      const scale = 1.22 - 0.14 * e
      return { x: 0, y: 0, scale }
    }

    case 'kenburns-pan': {
      // Horizontal pan drift
      const scale = 1.12
      const panX = Math.sin(e * Math.PI) * 0.05
      const panY = Math.sin(e * Math.PI * 0.5) * 0.02
      return { x: panX, y: panY, scale }
    }

    case 'kenburns-drift-up': {
      // Vertical ascending glide for tall minarets, mountains, and redwoods
      const scale = 1.14
      const panY = 0.04 - 0.08 * e
      return { x: 0, y: panY, scale }
    }

    case 'kenburns-drift-diagonal': {
      // Smooth diagonal cinematic drift with subtle zoom
      const scale = 1.08 + 0.08 * e
      const panX = -0.035 + 0.07 * e
      const panY = 0.03 - 0.06 * e
      return { x: panX, y: panY, scale }
    }

    case 'kenburns-pulse': {
      // Contemplative subtle breathing motion
      const scale = 1.1 + Math.sin(progress * Math.PI * 2) * 0.04
      const panX = Math.cos(progress * Math.PI * 2) * 0.015
      const panY = Math.sin(progress * Math.PI * 2) * 0.015
      return { x: panX, y: panY, scale }
    }

    default:
      return { x: 0, y: 0, scale: 1 }
  }
}

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  width: number,
  height: number,
  transform: Transform,
  fit: 'cover-crop' | 'blur-fill',
): void {
  const isVideo = typeof HTMLVideoElement !== 'undefined' && image instanceof HTMLVideoElement

  // Check if video is loaded and has decoded dimensions
  if (isVideo) {
    const vid = image as HTMLVideoElement
    if (vid.videoWidth === 0 || vid.readyState < 2) {
      // Frame not yet ready for drawing; skip cleanly
      return
    }
  }

  const imgW =
    (image as HTMLImageElement).naturalWidth ||
    (image as HTMLVideoElement).videoWidth ||
    (image as HTMLCanvasElement).width ||
    width
  const imgH =
    (image as HTMLImageElement).naturalHeight ||
    (image as HTMLVideoElement).videoHeight ||
    (image as HTMLCanvasElement).height ||
    height

  if (imgW <= 0 || imgH <= 0) return

  // For video footage which already contains camera motion, restrain Ken Burns scale to prevent extreme cropping
  const effectiveScale = isVideo ? Math.min(transform.scale, 1.04) : transform.scale
  const effectivePanX = isVideo ? transform.x * 0.4 : transform.x
  const effectivePanY = isVideo ? transform.y * 0.4 : transform.y

  if (fit === 'blur-fill') {
    // 1. Draw blurred, cinematic pillarbox background covering the canvas
    ctx.save()
    ctx.filter = 'blur(16px) brightness(0.55)'
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, width, height)
    const bgCover = Math.max(width / imgW, height / imgH) * 1.15
    const bgDrawW = imgW * bgCover
    const bgDrawH = imgH * bgCover
    try {
      ctx.drawImage(image, (width - bgDrawW) / 2, (height - bgDrawH) / 2, bgDrawW, bgDrawH)
    } catch {
      // ignore
    }
    ctx.restore()

    // 2. Draw sharp, unblurred foreground fitted within canvas dimensions (contain)
    ctx.save()
    ctx.translate(width / 2, height / 2)
    ctx.scale(effectiveScale, effectiveScale)
    ctx.translate(effectivePanX * width, effectivePanY * height)
    ctx.translate(-width / 2, -height / 2)

    const contain = Math.min(width / imgW, height / imgH)
    const fgDrawW = imgW * contain
    const fgDrawH = imgH * contain

    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)'
    ctx.shadowBlur = 18
    try {
      ctx.drawImage(image, (width - fgDrawW) / 2, (height - fgDrawH) / 2, fgDrawW, fgDrawH)
    } catch {
      // ignore
    }
    ctx.restore()
    return
  }

  // Cover-crop layout
  ctx.save()
  ctx.translate(width / 2, height / 2)
  ctx.scale(effectiveScale, effectiveScale)
  ctx.translate(effectivePanX * width, effectivePanY * height)
  ctx.translate(-width / 2, -height / 2)

  const cover = Math.max(width / imgW, height / imgH)
  const drawW = imgW * cover
  const drawH = imgH * cover

  try {
    ctx.drawImage(image, (width - drawW) / 2, (height - drawH) / 2, drawW, drawH)
  } catch {
    // Graceful fallback if video frame unavailable
  }
  ctx.restore()
}

