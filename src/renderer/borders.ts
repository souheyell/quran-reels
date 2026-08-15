import type { BorderType } from '../types'

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '')
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized
  const num = parseInt(full, 16)
  if (Number.isNaN(num)) return `rgba(255, 215, 0, ${alpha})`
  const r = (num >> 16) & 255
  const g = (num >> 8) & 255
  const b = num & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * Draw an 8-pointed Islamic star (Rub el Hizb) rosette at (cx, cy)
 */
function drawRubElHizb(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string,
  opacity: number,
): void {
  ctx.save()
  ctx.strokeStyle = hexToRgba(color, opacity)
  ctx.fillStyle = hexToRgba(color, opacity * 0.15)
  ctx.lineWidth = Math.max(1.5, size * 0.08)

  const half = size / 2

  // Square 1
  ctx.save()
  ctx.translate(cx, cy)
  ctx.beginPath()
  ctx.rect(-half, -half, size, size)
  ctx.stroke()
  ctx.fill()

  // Square 2 (rotated 45 degrees)
  ctx.rotate(Math.PI / 4)
  ctx.beginPath()
  ctx.rect(-half, -half, size, size)
  ctx.stroke()
  ctx.fill()
  ctx.restore()

  // Center gold dot
  ctx.beginPath()
  ctx.arc(cx, cy, size * 0.18, 0, Math.PI * 2)
  ctx.fillStyle = hexToRgba(color, opacity * 0.9)
  ctx.fill()

  ctx.restore()
}

/**
 * Draw ornate Andalusian Arabesque floral corner filigree
 */
function drawArabesqueCorner(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  angle: number,
  color: string,
  opacity: number,
): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)

  ctx.strokeStyle = hexToRgba(color, opacity)
  ctx.lineWidth = Math.max(1.5, size * 0.035)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  // Outer corner bracket
  ctx.beginPath()
  ctx.moveTo(0, size)
  ctx.lineTo(0, size * 0.4)
  ctx.quadraticCurveTo(0, 0, size * 0.4, 0)
  ctx.lineTo(size, 0)
  ctx.stroke()

  // Inner decorative scroll
  ctx.beginPath()
  ctx.moveTo(size * 0.15, size * 0.75)
  ctx.quadraticCurveTo(size * 0.15, size * 0.25, size * 0.35, size * 0.25)
  ctx.quadraticCurveTo(size * 0.25, size * 0.15, size * 0.75, size * 0.15)
  ctx.stroke()

  // Little floral flourishes
  ctx.beginPath()
  ctx.arc(size * 0.35, size * 0.35, size * 0.06, 0, Math.PI * 2)
  ctx.fillStyle = hexToRgba(color, opacity * 0.85)
  ctx.fill()

  // Small corner star rosette
  drawRubElHizb(ctx, size * 0.22, size * 0.22, size * 0.24, color, opacity)

  ctx.restore()
}

/**
 * Render Islamic borders, arabesque frames, and vignettes over canvas.
 */
export function drawBorder(
  ctx: CanvasRenderingContext2D,
  type: BorderType,
  width: number,
  height: number,
  color = '#ffd700',
  opacity = 0.75,
): void {
  if (type === 'none' || opacity <= 0) return

  ctx.save()
  const scale = width / 1080
  const margin = Math.round(36 * scale)
  const innerMargin = Math.round(48 * scale)

  switch (type) {
    case 'gilded-corners': {
      const cornerSize = Math.round(110 * scale)
      const pad = margin + 8 * scale

      // Top-Left
      drawArabesqueCorner(ctx, pad, pad, cornerSize, 0, color, opacity)
      // Top-Right
      drawArabesqueCorner(ctx, width - pad, pad, cornerSize, Math.PI / 2, color, opacity)
      // Bottom-Right
      drawArabesqueCorner(ctx, width - pad, height - pad, cornerSize, Math.PI, color, opacity)
      // Bottom-Left
      drawArabesqueCorner(ctx, pad, height - pad, cornerSize, -Math.PI / 2, color, opacity)

      // Subtle connecting hairline
      ctx.strokeStyle = hexToRgba(color, opacity * 0.4)
      ctx.lineWidth = Math.max(1, 1.5 * scale)

      // Top & Bottom lines
      ctx.beginPath()
      ctx.moveTo(pad + cornerSize, pad)
      ctx.lineTo(width - pad - cornerSize, pad)
      ctx.moveTo(pad + cornerSize, height - pad)
      ctx.lineTo(width - pad - cornerSize, height - pad)
      // Left & Right lines
      ctx.moveTo(pad, pad + cornerSize)
      ctx.lineTo(pad, height - pad - cornerSize)
      ctx.moveTo(width - pad, pad + cornerSize)
      ctx.lineTo(width - pad, height - pad - cornerSize)
      ctx.stroke()
      break
    }

    case 'islamic-geometric': {
      // Outer border
      ctx.strokeStyle = hexToRgba(color, opacity * 0.85)
      ctx.lineWidth = Math.max(1.5, 2.5 * scale)
      ctx.strokeRect(margin, margin, width - margin * 2, height - margin * 2)

      // Inner border
      ctx.strokeStyle = hexToRgba(color, opacity * 0.5)
      ctx.lineWidth = Math.max(1, 1.5 * scale)
      ctx.strokeRect(innerMargin, innerMargin, width - innerMargin * 2, height - innerMargin * 2)

      // 4 Corner Rub el Hizb stars
      const starSize = Math.round(26 * scale)
      drawRubElHizb(ctx, margin, margin, starSize, color, opacity)
      drawRubElHizb(ctx, width - margin, margin, starSize, color, opacity)
      drawRubElHizb(ctx, width - margin, height - margin, starSize, color, opacity)
      drawRubElHizb(ctx, margin, height - margin, starSize, color, opacity)

      // Midpoint rosettes on edges
      const smallStar = Math.round(18 * scale)
      drawRubElHizb(ctx, width / 2, margin, smallStar, color, opacity * 0.7)
      drawRubElHizb(ctx, width / 2, height - margin, smallStar, color, opacity * 0.7)
      drawRubElHizb(ctx, margin, height / 2, smallStar, color, opacity * 0.7)
      drawRubElHizb(ctx, width - margin, height / 2, smallStar, color, opacity * 0.7)
      break
    }

    case 'royal-arch': {
      // Outer rect
      ctx.strokeStyle = hexToRgba(color, opacity * 0.7)
      ctx.lineWidth = Math.max(1.5, 2 * scale)
      ctx.strokeRect(margin, margin, width - margin * 2, height - margin * 2)

      // Classical Moorish Horseshoe Arch at the top
      const archCenterX = width / 2
      const archRadius = Math.round(width * 0.38)
      const archTopY = Math.round(margin + archRadius * 0.85)

      ctx.beginPath()
      ctx.arc(archCenterX, archTopY, archRadius, Math.PI, 0, false)
      ctx.strokeStyle = hexToRgba(color, opacity * 0.85)
      ctx.lineWidth = Math.max(2, 3 * scale)
      ctx.stroke()

      // Inner arch line
      ctx.beginPath()
      ctx.arc(archCenterX, archTopY, archRadius - 12 * scale, Math.PI, 0, false)
      ctx.strokeStyle = hexToRgba(color, opacity * 0.4)
      ctx.lineWidth = Math.max(1, 1.5 * scale)
      ctx.stroke()

      // Center Keystone Rosette
      drawRubElHizb(ctx, archCenterX, archTopY - archRadius, Math.round(30 * scale), color, opacity)

      // Bottom corner stars
      drawRubElHizb(ctx, margin, height - margin, Math.round(22 * scale), color, opacity * 0.8)
      drawRubElHizb(ctx, width - margin, height - margin, Math.round(22 * scale), color, opacity * 0.8)
      break
    }

    case 'vignette-feather': {
      const gradient = ctx.createRadialGradient(
        width / 2,
        height / 2,
        Math.min(width, height) * 0.35,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.72,
      )
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
      gradient.addColorStop(0.65, `rgba(0, 0, 0, ${opacity * 0.45})`)
      gradient.addColorStop(1, `rgba(0, 0, 0, ${opacity * 0.92})`)

      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)
      break
    }
  }

  ctx.restore()
}
