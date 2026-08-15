import { describe, it, expect, vi } from 'vitest'
import { drawBorder } from '../borders'

function createMockContext() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    arc: vi.fn(),
    rect: vi.fn(),
    strokeRect: vi.fn(),
    fillRect: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    createRadialGradient: vi.fn().mockReturnValue({
      addColorStop: vi.fn(),
    }),
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
  } as unknown as CanvasRenderingContext2D
}

describe('drawBorder', () => {
  it('does nothing when border type is none', () => {
    const ctx = createMockContext()
    drawBorder(ctx, 'none', 1080, 1920)
    expect(ctx.save).not.toHaveBeenCalled()
  })

  it('does nothing when opacity is 0', () => {
    const ctx = createMockContext()
    drawBorder(ctx, 'gilded-corners', 1080, 1920, '#ffd700', 0)
    expect(ctx.save).not.toHaveBeenCalled()
  })

  it('draws gilded-corners without errors', () => {
    const ctx = createMockContext()
    drawBorder(ctx, 'gilded-corners', 1080, 1920, '#ffd700', 0.8)
    expect(ctx.save).toHaveBeenCalled()
    expect(ctx.restore).toHaveBeenCalled()
    expect(ctx.stroke).toHaveBeenCalled()
  })

  it('draws islamic-geometric border with double rects and rosettes', () => {
    const ctx = createMockContext()
    drawBorder(ctx, 'islamic-geometric', 1080, 1920, '#ffd700', 0.75)
    expect(ctx.save).toHaveBeenCalled()
    expect(ctx.strokeRect).toHaveBeenCalledTimes(2)
    expect(ctx.restore).toHaveBeenCalled()
  })

  it('draws royal-arch with horseshoe arch curves and keystones', () => {
    const ctx = createMockContext()
    drawBorder(ctx, 'royal-arch', 1080, 1920, '#fde047', 0.85)
    expect(ctx.save).toHaveBeenCalled()
    expect(ctx.arc).toHaveBeenCalled()
    expect(ctx.strokeRect).toHaveBeenCalled()
    expect(ctx.restore).toHaveBeenCalled()
  })

  it('draws vignette-feather with radial gradient', () => {
    const ctx = createMockContext()
    drawBorder(ctx, 'vignette-feather', 1080, 1920, '#000000', 0.9)
    expect(ctx.save).toHaveBeenCalled()
    expect(ctx.createRadialGradient).toHaveBeenCalled()
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 1080, 1920)
    expect(ctx.restore).toHaveBeenCalled()
  })
})
