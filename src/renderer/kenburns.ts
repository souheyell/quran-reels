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
  ctx.save()
  if (fit === 'blur-fill') {
    ctx.filter = 'blur(14px)'
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, width, height)
  }
  ctx.translate(width / 2, height / 2)
  ctx.scale(transform.scale, transform.scale)
  ctx.translate(transform.x * width, transform.y * height)
  ctx.translate(-width / 2, -height / 2)

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
  const target = fit === 'blur-fill' ? 1.25 : 1
  const cover = Math.max(width / imgW, height / imgH) * target
  const drawW = imgW * cover
  const drawH = imgH * cover
  ctx.drawImage(image, (width - drawW) / 2, (height - drawH) / 2, drawW, drawH)
  ctx.restore()
}
