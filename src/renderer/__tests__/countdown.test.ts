import { describe, it, expect, vi } from 'vitest'
import { drawCountdown } from '../countdown'
import type { CountdownConfig } from '../../types'

function createMockContext() {
  return {
    canvas: { width: 1080, height: 1920 },
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn(),
    roundRect: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 120 })),
    globalAlpha: 1,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    shadowColor: '',
    shadowBlur: 0,
    font: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
  } as unknown as CanvasRenderingContext2D
}

describe('drawCountdown', () => {
  it('does not draw when countdown is disabled or style is none', () => {
    const ctx = createMockContext()
    const config: CountdownConfig = {
      enabled: false,
      style: 'glowing-ring',
      position: 'top-right',
      color: '#ffd700',
      showTotalTime: false,
      opacity: 0.9,
    }

    drawCountdown(ctx, config, 1000, 15000, 1080, 1920)
    expect(ctx.save).not.toHaveBeenCalled()
  })

  it('draws glowing-ring style with live remaining seconds', () => {
    const ctx = createMockContext()
    const config: CountdownConfig = {
      enabled: true,
      style: 'glowing-ring',
      position: 'top-right',
      color: '#ffd700',
      showTotalTime: false,
      opacity: 0.9,
    }

    drawCountdown(ctx, config, 5000, 15000, 1080, 1920)
    expect(ctx.save).toHaveBeenCalled()
    expect(ctx.arc).toHaveBeenCalled()
    expect(ctx.fillText).toHaveBeenCalledWith('10s', expect.any(Number), expect.any(Number))
    expect(ctx.restore).toHaveBeenCalled()
  })

  it('draws top-bar style with progress bar and timestamp', () => {
    const ctx = createMockContext()
    const config: CountdownConfig = {
      enabled: true,
      style: 'top-bar',
      position: 'top',
      color: '#6366f1',
      showTotalTime: true,
      opacity: 0.85,
    }

    drawCountdown(ctx, config, 6000, 20000, 1080, 1920)
    expect(ctx.save).toHaveBeenCalled()
    expect(ctx.fillRect).toHaveBeenCalled()
    expect(ctx.fillText).toHaveBeenCalledWith(
      expect.stringContaining('00:14 / 00:20'),
      expect.any(Number),
      expect.any(Number),
    )
    expect(ctx.restore).toHaveBeenCalled()
  })

  it('draws digital-pill style correctly', () => {
    const ctx = createMockContext()
    const config: CountdownConfig = {
      enabled: true,
      style: 'digital-pill',
      position: 'top-left',
      color: '#10b981',
      showTotalTime: false,
      opacity: 0.95,
    }

    drawCountdown(ctx, config, 3000, 12000, 1080, 1920)
    expect(ctx.save).toHaveBeenCalled()
    expect(ctx.roundRect).toHaveBeenCalled()
    expect(ctx.fillText).toHaveBeenCalledWith('⏱️ 00:09', expect.any(Number), expect.any(Number))
    expect(ctx.restore).toHaveBeenCalled()
  })

  it('draws minimal-clock style correctly', () => {
    const ctx = createMockContext()
    const config: CountdownConfig = {
      enabled: true,
      style: 'minimal-clock',
      position: 'bottom',
      color: '#ffffff',
      showTotalTime: false,
      opacity: 0.8,
    }

    drawCountdown(ctx, config, 4000, 10000, 1080, 1920)
    expect(ctx.save).toHaveBeenCalled()
    expect(ctx.fillText).toHaveBeenCalledWith('00:06', expect.any(Number), expect.any(Number))
    expect(ctx.restore).toHaveBeenCalled()
  })
})
