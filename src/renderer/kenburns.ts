export type MotionType = 'kenburns-zoom' | 'kenburns-pan' | 'static'

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

export function getTransform(config: MotionConfig, timeMs: number): Transform {
  if (config.type === 'static') {
    return { x: 0, y: 0, scale: 1 }
  }

  const progress = Math.min(Math.max(timeMs / (config.duration * 1000), 0), 1)
  const e = easeInOut(progress)
  const scale = 1.08 + 0.12 * e

  if (config.type === 'kenburns-pan') {
    const panX = Math.sin(e * Math.PI) * 0.04
    const panY = Math.sin(e * Math.PI * 0.5) * 0.05
    return { x: panX, y: panY, scale }
  }

  return { x: 0, y: 0, scale }
}

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
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

  const imgW = image.width
  const imgH = image.height
  const target = fit === 'blur-fill' ? 1.25 : 1
  const cover = Math.max(width / imgW, height / imgH) * target
  const drawW = imgW * cover
  const drawH = imgH * cover
  ctx.drawImage(image, (width - drawW) / 2, (height - drawH) / 2, drawW, drawH)
  ctx.restore()
}
