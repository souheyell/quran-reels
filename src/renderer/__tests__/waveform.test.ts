import { describe, it, expect, vi } from 'vitest'
import { drawWaveform } from '../waveform'

function createMockContext() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    roundRect: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    shadowColor: '',
    shadowBlur: 0,
  } as unknown as CanvasRenderingContext2D
}

describe('drawWaveform', () => {
  it('does nothing when waveform type is none', () => {
    const ctx = createMockContext()
    drawWaveform(ctx, 'none', 1000, 5000, 1080, 1920)
    expect(ctx.save).not.toHaveBeenCalled()
  })

  it('does nothing when opacity is 0', () => {
    const ctx = createMockContext()
    drawWaveform(ctx, 'symmetric-bars', 1000, 5000, 1080, 1920, '#ffd700', 0)
    expect(ctx.save).not.toHaveBeenCalled()
  })

  it('draws symmetric-bars without errors', () => {
    const ctx = createMockContext()
    drawWaveform(ctx, 'symmetric-bars', 2500, 6000, 1080, 1920, '#ffd700', 0.8)
    expect(ctx.save).toHaveBeenCalled()
    expect(ctx.roundRect).toHaveBeenCalled()
    expect(ctx.fill).toHaveBeenCalled()
    expect(ctx.restore).toHaveBeenCalled()
  })

  it('draws smooth-wave without errors', () => {
    const ctx = createMockContext()
    drawWaveform(ctx, 'smooth-wave', 2500, 6000, 1080, 1920, '#80deea', 0.85)
    expect(ctx.save).toHaveBeenCalled()
    expect(ctx.lineTo).toHaveBeenCalled()
    expect(ctx.stroke).toHaveBeenCalled()
    expect(ctx.restore).toHaveBeenCalled()
  })

  it('draws pulse-line with heartbeat spike', () => {
    const ctx = createMockContext()
    drawWaveform(ctx, 'pulse-line', 2000, 5000, 1080, 1920, '#fef08a', 0.75)
    expect(ctx.save).toHaveBeenCalled()
    expect(ctx.moveTo).toHaveBeenCalled()
    expect(ctx.lineTo).toHaveBeenCalled()
    expect(ctx.stroke).toHaveBeenCalled()
    expect(ctx.restore).toHaveBeenCalled()
  })

  it('draws dots-matrix without errors', () => {
    const ctx = createMockContext()
    drawWaveform(ctx, 'dots-matrix', 1800, 5000, 1080, 1920, '#fde047', 0.7)
    expect(ctx.save).toHaveBeenCalled()
    expect(ctx.arc).toHaveBeenCalled()
    expect(ctx.fill).toHaveBeenCalled()
    expect(ctx.restore).toHaveBeenCalled()
  })
})
