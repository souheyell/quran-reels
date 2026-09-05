import type { CountdownConfig } from '../types'

/**
 * Formats milliseconds into MM:SS
 */
function formatTime(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000))
  const mins = Math.floor(totalSec / 60)
  const secs = totalSec % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * Draws pure visual countdown timers on the canvas
 */
export function drawCountdown(
  ctx: CanvasRenderingContext2D,
  config: CountdownConfig,
  timeMs: number,
  totalDurationMs: number,
  width: number,
  height: number,
): void {
  if (!config?.enabled || config.style === 'none' || totalDurationMs <= 0) return

  const scale = width / 1080
  const remainingMs = Math.max(0, totalDurationMs - timeMs)
  const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000))
  const progress = Math.min(1, Math.max(0, timeMs / totalDurationMs))
  const remainingFraction = 1 - progress

  const timeStr = formatTime(remainingMs)
  const totalStr = formatTime(totalDurationMs)
  const displayTime = config.showTotalTime ? `${timeStr} / ${totalStr}` : timeStr

  const color = config.color || '#ffd700'
  const opacity = config.opacity ?? 0.9

  ctx.save()
  ctx.globalAlpha = opacity

  switch (config.style) {
    case 'glowing-ring': {
      // Circular countdown ring in top corner or top center
      const radius = Math.round(38 * scale)
      const strokeWidth = Math.round(5 * scale)

      let centerX = width - radius - Math.round(50 * scale)
      let centerY = radius + Math.round(60 * scale)

      if (config.position === 'top-left') {
        centerX = radius + Math.round(50 * scale)
      } else if (config.position === 'top') {
        centerX = width / 2
      } else if (config.position === 'bottom') {
        centerY = height - radius - Math.round(80 * scale)
      }

      // Background glass circle
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius + strokeWidth, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
      ctx.fill()

      // Inactive track
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
      ctx.lineWidth = strokeWidth
      ctx.stroke()

      // Glowing active progress arc
      ctx.shadowColor = color
      ctx.shadowBlur = Math.round(12 * scale)
      ctx.beginPath()
      const startAngle = -Math.PI / 2
      const endAngle = startAngle + remainingFraction * Math.PI * 2
      ctx.arc(centerX, centerY, radius, startAngle, endAngle, false)
      ctx.strokeStyle = color
      ctx.lineWidth = strokeWidth
      ctx.lineCap = 'round'
      ctx.stroke()

      // Center remaining seconds number
      ctx.shadowBlur = 0
      ctx.fillStyle = '#ffffff'
      ctx.font = `700 ${Math.round(22 * scale)}px "Inter", sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(`${remainingSec}s`, centerX, centerY)
      break
    }

    case 'top-bar': {
      // Edge-to-edge sleek gradient progress bar at the top
      const barHeight = Math.round(6 * scale)
      const barY = Math.round(10 * scale)

      // Background track
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)'
      ctx.fillRect(Math.round(40 * scale), barY, width - Math.round(80 * scale), barHeight)

      // Progress bar fill
      const barWidth = (width - Math.round(80 * scale)) * progress
      ctx.shadowColor = color
      ctx.shadowBlur = Math.round(10 * scale)
      ctx.fillStyle = color
      ctx.fillRect(Math.round(40 * scale), barY, barWidth, barHeight)

      // Countdown badge
      ctx.shadowBlur = 0
      const badgeY = barY + barHeight + Math.round(24 * scale)
      let badgeX = width - Math.round(50 * scale)
      ctx.textAlign = 'right'

      if (config.position === 'top-left') {
        badgeX = Math.round(50 * scale)
        ctx.textAlign = 'left'
      } else if (config.position === 'top') {
        badgeX = width / 2
        ctx.textAlign = 'center'
      }

      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
      const textWidth = ctx.measureText(displayTime).width + Math.round(24 * scale)
      const pillH = Math.round(28 * scale)

      ctx.beginPath()
      const pillX =
        ctx.textAlign === 'right'
          ? badgeX - textWidth
          : ctx.textAlign === 'center'
            ? badgeX - textWidth / 2
            : badgeX
      ctx.roundRect(pillX, badgeY - pillH / 2, textWidth, pillH, pillH / 2)
      ctx.fill()

      ctx.font = `600 ${Math.round(16 * scale)}px "Inter", sans-serif`
      ctx.fillStyle = '#ffffff'
      ctx.textBaseline = 'middle'
      ctx.fillText(
        `⏱️ ${displayTime}`,
        ctx.textAlign === 'right'
          ? badgeX - Math.round(12 * scale)
          : ctx.textAlign === 'center'
            ? badgeX
            : badgeX + Math.round(12 * scale),
        badgeY,
      )
      break
    }

    case 'digital-pill': {
      // Modern glassmorphism timer pill
      const fontSize = Math.round(20 * scale)
      ctx.font = `700 ${fontSize}px "Inter", sans-serif`
      const textMetrics = ctx.measureText(`⏱️ ${displayTime}`)
      const pillW = textMetrics.width + Math.round(36 * scale)
      const pillH = Math.round(42 * scale)

      let pillX = width - pillW - Math.round(50 * scale)
      let pillY = Math.round(50 * scale)

      if (config.position === 'top-left') {
        pillX = Math.round(50 * scale)
      } else if (config.position === 'top') {
        pillX = (width - pillW) / 2
      } else if (config.position === 'bottom') {
        pillY = height - pillH - Math.round(70 * scale)
      }

      // Glass card background
      ctx.beginPath()
      ctx.roundRect(pillX, pillY, pillW, pillH, pillH / 2)
      ctx.fillStyle = 'rgba(15, 23, 42, 0.65)'
      ctx.fill()

      ctx.shadowColor = color
      ctx.shadowBlur = Math.round(8 * scale)
      ctx.strokeStyle = color
      ctx.lineWidth = Math.round(2 * scale)
      ctx.stroke()

      // Time Text
      ctx.shadowBlur = 0
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(`⏱️ ${displayTime}`, pillX + pillW / 2, pillY + pillH / 2)
      break
    }

    case 'minimal-clock': {
      // Minimal high-contrast digital clock
      const fontSize = Math.round(24 * scale)
      ctx.font = `700 ${fontSize}px "Inter", monospace`
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
      ctx.shadowBlur = Math.round(8 * scale)
      ctx.fillStyle = color
      ctx.textBaseline = 'middle'

      let x = width - Math.round(50 * scale)
      let y = Math.round(60 * scale)
      ctx.textAlign = 'right'

      if (config.position === 'top-left') {
        x = Math.round(50 * scale)
        ctx.textAlign = 'left'
      } else if (config.position === 'top') {
        x = width / 2
        ctx.textAlign = 'center'
      } else if (config.position === 'bottom') {
        y = height - Math.round(80 * scale)
      }

      ctx.fillText(displayTime, x, y)
      break
    }
  }

  ctx.restore()
}
