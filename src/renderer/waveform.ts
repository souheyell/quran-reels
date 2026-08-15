import type { WaveformType } from '../types'

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
 * Generate synthetic vocal resonance amplitude at a given normalized timeline position
 */
function getVocalEnergy(tSec: number): number {
  // Multi-harmonic voice presence simulation
  const h1 = Math.sin(tSec * 4.2) * 0.4
  const h2 = Math.sin(tSec * 8.6 + 1.2) * 0.25
  const h3 = Math.sin(tSec * 14.1 + 2.5) * 0.18
  const h4 = Math.cos(tSec * 21.7 + 0.8) * 0.12
  const modulation = (Math.sin(tSec * 1.5) + 1) * 0.5

  const raw = Math.abs(h1 + h2 + h3 + h4) * (0.6 + 0.4 * modulation)
  return Math.min(1, Math.max(0.12, raw))
}

/**
 * Render voice audio spectrum / waveform visualizer on canvas.
 */
export function drawWaveform(
  ctx: CanvasRenderingContext2D,
  type: WaveformType,
  timeMs: number,
  slotDurationMs: number,
  width: number,
  height: number,
  color = '#ffd700',
  opacity = 0.75,
  customY?: number,
): void {
  if (type === 'none' || opacity <= 0) return

  ctx.save()
  const scale = width / 1080
  const tSec = timeMs / 1000
  const isPause = slotDurationMs > 0 && timeMs > slotDurationMs - 1200
  const pauseFactor = isPause ? 0.25 : 1.0

  const centerY = customY ?? Math.round(height * 0.78)
  const visualizerWidth = Math.round(width * 0.7)
  const startX = (width - visualizerWidth) / 2

  switch (type) {
    case 'symmetric-bars': {
      const numBars = 32
      const barSpacing = visualizerWidth / numBars
      const barWidth = Math.max(2, Math.round(barSpacing * 0.55))
      const maxBarHeight = Math.round(48 * scale)

      ctx.fillStyle = hexToRgba(color, opacity)
      ctx.shadowColor = hexToRgba(color, opacity * 0.6)
      ctx.shadowBlur = Math.round(8 * scale)

      for (let i = 0; i < numBars; i++) {
        const x = startX + i * barSpacing + (barSpacing - barWidth) / 2
        // Symmetrical Gaussian bell curve envelope from center
        const distFromCenter = Math.abs(i - numBars / 2) / (numBars / 2)
        const bellEnvelope = Math.exp(-distFromCenter * distFromCenter * 2.8)

        // Frequency harmonic oscillation
        const freq = getVocalEnergy(tSec + i * 0.14) * pauseFactor
        const barH = Math.max(3 * scale, maxBarHeight * bellEnvelope * freq)

        // Symmetrical top/bottom bar
        ctx.beginPath()
        ctx.roundRect(x, centerY - barH / 2, barWidth, barH, Math.max(1, barWidth / 2))
        ctx.fill()
      }
      break
    }

    case 'smooth-wave': {
      const points = 64
      const step = visualizerWidth / points
      const maxAmp = Math.round(36 * scale)

      ctx.strokeStyle = hexToRgba(color, opacity)
      ctx.lineWidth = Math.max(2, 3 * scale)
      ctx.lineCap = 'round'
      ctx.shadowColor = hexToRgba(color, opacity * 0.8)
      ctx.shadowBlur = Math.round(12 * scale)

      ctx.beginPath()
      for (let i = 0; i <= points; i++) {
        const x = startX + i * step
        const envelope = Math.sin(Math.PI * (i / points))

        const wave =
          Math.sin(tSec * 5 + i * 0.3) * 0.6 +
          Math.sin(tSec * 9.5 + i * 0.6) * 0.4
        const y = centerY + wave * maxAmp * envelope * getVocalEnergy(tSec) * pauseFactor

        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }
      ctx.stroke()
      break
    }

    case 'pulse-line': {
      ctx.strokeStyle = hexToRgba(color, opacity * 0.85)
      ctx.lineWidth = Math.max(1.5, 2 * scale)
      ctx.shadowColor = hexToRgba(color, opacity * 0.7)
      ctx.shadowBlur = Math.round(10 * scale)

      const vocalPower = getVocalEnergy(tSec) * pauseFactor
      const spikeWidth = visualizerWidth * 0.35
      const leftEnd = width / 2 - spikeWidth / 2
      const rightStart = width / 2 + spikeWidth / 2

      ctx.beginPath()
      // Left baseline
      ctx.moveTo(startX, centerY)
      ctx.lineTo(leftEnd, centerY)

      // Center heartbeat / vocal pulse spikes
      const mid = width / 2
      const spikeH = Math.round(42 * scale * vocalPower)
      ctx.lineTo(mid - 35 * scale, centerY - spikeH * 0.3)
      ctx.lineTo(mid - 18 * scale, centerY + spikeH * 0.5)
      ctx.lineTo(mid, centerY - spikeH)
      ctx.lineTo(mid + 18 * scale, centerY + spikeH * 0.7)
      ctx.lineTo(mid + 35 * scale, centerY - spikeH * 0.2)
      ctx.lineTo(rightStart, centerY)

      // Right baseline
      ctx.lineTo(startX + visualizerWidth, centerY)
      ctx.stroke()

      // Center glowing pulse dot
      ctx.beginPath()
      ctx.arc(mid, centerY - spikeH, Math.max(2, 3.5 * scale), 0, Math.PI * 2)
      ctx.fillStyle = hexToRgba(color, opacity)
      ctx.fill()
      break
    }

    case 'dots-matrix': {
      const cols = 24
      const spacingX = visualizerWidth / cols
      const dotRadius = Math.max(1.5, 2.5 * scale)

      ctx.fillStyle = hexToRgba(color, opacity)
      ctx.shadowColor = hexToRgba(color, opacity * 0.7)
      ctx.shadowBlur = Math.round(6 * scale)

      for (let i = 0; i < cols; i++) {
        const x = startX + i * spacingX
        const distFromCenter = Math.abs(i - cols / 2) / (cols / 2)
        const envelope = Math.exp(-distFromCenter * distFromCenter * 3)
        const energy = getVocalEnergy(tSec + i * 0.2) * pauseFactor

        const numDots = Math.max(1, Math.round(5 * envelope * energy))
        for (let row = 0; row < numDots; row++) {
          const offsetY = (row - numDots / 2) * 10 * scale
          ctx.beginPath()
          ctx.arc(x, centerY + offsetY, dotRadius, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      break
    }
  }

  ctx.restore()
}
