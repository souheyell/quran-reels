import type { AtmosphericEffectType } from '../types'

interface ParticleSeed {
  x: number // 0 to 1
  y: number // 0 to 1
  size: number
  speedFactor: number
  phase: number
  opacity: number
}

// Generate deterministic pseudo-random seeds
function generateSeeds(count: number): ParticleSeed[] {
  const seeds: ParticleSeed[] = []
  let s = 123456789
  const nextRandom = () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }

  for (let i = 0; i < count; i++) {
    seeds.push({
      x: nextRandom(),
      y: nextRandom(),
      size: 0.4 + nextRandom() * 0.8,
      speedFactor: 0.5 + nextRandom() * 0.9,
      phase: nextRandom() * Math.PI * 2,
      opacity: 0.3 + nextRandom() * 0.7,
    })
  }
  return seeds
}

const FIREFLY_SEEDS = generateSeeds(45)
const SNOW_SEEDS = generateSeeds(75)
const DUST_SEEDS = generateSeeds(60)
const STAR_SEEDS = generateSeeds(50)
const RAIN_SEEDS = generateSeeds(90)

/**
 * Render deterministic, framerate-independent atmospheric visual particle effects.
 */
export function drawAtmosphericEffect(
  ctx: CanvasRenderingContext2D,
  type: AtmosphericEffectType,
  timeMs: number,
  width: number,
  height: number,
  intensity = 0.7,
  speed = 1.0,
): void {
  if (type === 'none' || intensity <= 0) return

  const t = (timeMs / 1000) * speed
  const baseScale = width / 1080

  ctx.save()

  switch (type) {
    case 'fireflies': {
      // Golden spiritual embers / fireflies floating gently upward with soft pulsing glow
      for (const p of FIREFLY_SEEDS) {
        const pulse = Math.sin(t * 2.5 * p.speedFactor + p.phase) * 0.4 + 0.6
        const alpha = Math.max(0, Math.min(1, pulse * p.opacity * intensity))

        // Gentle upward drift with harmonic horizontal sway
        const yNorm = (p.y - (t * 0.04 * p.speedFactor) % 1 + 1) % 1
        const xOffset = Math.sin(t * 1.2 * p.speedFactor + p.phase) * 0.035
        const xNorm = (p.x + xOffset + 1) % 1

        const x = xNorm * width
        const y = yNorm * height
        const radius = Math.max(2, Math.round(p.size * 6 * baseScale))

        const grad = ctx.createRadialGradient(x, y, 0, x, y, radius * 2.8)
        grad.addColorStop(0, `rgba(255, 220, 120, ${alpha * 0.95})`)
        grad.addColorStop(0.35, `rgba(255, 180, 60, ${alpha * 0.6})`)
        grad.addColorStop(1, 'rgba(255, 160, 40, 0)')

        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(x, y, radius * 2.8, 0, Math.PI * 2)
        ctx.fill()

        // Bright particle core
        ctx.fillStyle = `rgba(255, 250, 220, ${alpha * 0.9})`
        ctx.beginPath()
        ctx.arc(x, y, radius * 0.45, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }

    case 'slow-snow': {
      // Soft, gentle snowflakes slowly descending and swaying
      ctx.fillStyle = '#ffffff'
      for (const p of SNOW_SEEDS) {
        const yNorm = (p.y + (t * 0.06 * p.speedFactor) % 1) % 1
        const xOffset = Math.sin(t * 0.8 * p.speedFactor + p.phase) * 0.025
        const xNorm = (p.x + xOffset + 1) % 1

        const x = xNorm * width
        const y = yNorm * height
        const radius = Math.max(1.5, Math.round(p.size * 4.5 * baseScale))
        const alpha = p.opacity * intensity * 0.85

        const grad = ctx.createRadialGradient(x, y, 0, x, y, radius)
        grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`)
        grad.addColorStop(0.6, `rgba(240, 245, 255, ${alpha * 0.5})`)
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)')

        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }

    case 'dust-motes': {
      // Warm sunbeam dust motes drifting in ambient light
      for (const p of DUST_SEEDS) {
        const xOffset = Math.sin(t * 0.5 * p.speedFactor + p.phase) * 0.02
        const yOffset = Math.cos(t * 0.4 * p.speedFactor + p.phase * 1.3) * 0.02
        const xNorm = (p.x + xOffset + (t * 0.01) % 1 + 1) % 1
        const yNorm = (p.y + yOffset - (t * 0.015) % 1 + 1) % 1

        const x = xNorm * width
        const y = yNorm * height
        const radius = Math.max(1.5, Math.round(p.size * 3.5 * baseScale))
        const shimmer = Math.sin(t * 1.5 + p.phase) * 0.3 + 0.7
        const alpha = p.opacity * intensity * shimmer * 0.6

        ctx.fillStyle = `rgba(255, 235, 180, ${alpha})`
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }

    case 'stars': {
      // Subtle twinkling night sky stars
      for (const p of STAR_SEEDS) {
        const twinkle = Math.sin(t * 3 * p.speedFactor + p.phase) * 0.5 + 0.5
        const alpha = Math.max(0, Math.min(1, twinkle * p.opacity * intensity * 0.9))
        const x = p.x * width
        const y = p.y * height
        const size = Math.max(1.5, Math.round(p.size * 3.2 * baseScale))

        ctx.fillStyle = `rgba(240, 248, 255, ${alpha})`
        ctx.beginPath()
        ctx.arc(x, y, size, 0, Math.PI * 2)
        ctx.fill()

        // Diamond star flare for brighter stars
        if (p.size > 0.85 && alpha > 0.4) {
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.6})`
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(x - size * 2.5, y)
          ctx.lineTo(x + size * 2.5, y)
          ctx.moveTo(x, y - size * 2.5)
          ctx.lineTo(x, y + size * 2.5)
          ctx.stroke()
        }
      }
      break
    }

    case 'gentle-rain': {
      // Soothing translucent rain streaks
      ctx.strokeStyle = `rgba(210, 230, 255, ${intensity * 0.45})`
      ctx.lineWidth = Math.max(1, Math.round(1.2 * baseScale))
      const streakLength = 28 * baseScale

      for (const p of RAIN_SEEDS) {
        const yNorm = (p.y + (t * 0.6 * p.speedFactor) % 1) % 1
        const xNorm = (p.x + (t * 0.05) % 1) % 1

        const x = xNorm * width
        const y = yNorm * height

        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x - 4 * baseScale, y + streakLength)
        ctx.stroke()
      }
      break
    }
  }

  ctx.restore()
}
