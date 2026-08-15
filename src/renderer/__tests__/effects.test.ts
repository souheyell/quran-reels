import { describe, expect, it } from 'vitest'
import { drawAtmosphericEffect } from '../effects'
import type { AtmosphericEffectType } from '../../types'

describe('drawAtmosphericEffect', () => {
  const dummyCtx = {
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    arc: () => {},
    fill: () => {},
    stroke: () => {},
    moveTo: () => {},
    lineTo: () => {},
    createRadialGradient: () => ({
      addColorStop: () => {},
    }),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
  } as unknown as CanvasRenderingContext2D

  const effectTypes: AtmosphericEffectType[] = [
    'none',
    'fireflies',
    'slow-snow',
    'dust-motes',
    'stars',
    'gentle-rain',
  ]

  it.each(effectTypes)('renders %s effect without throwing', (type) => {
    expect(() => {
      drawAtmosphericEffect(dummyCtx, type, 2500, 1080, 1920, 0.7, 1.0)
    }).not.toThrow()
  })

  it('handles 0 intensity as no-op', () => {
    expect(() => {
      drawAtmosphericEffect(dummyCtx, 'fireflies', 1000, 1080, 1920, 0, 1.0)
    }).not.toThrow()
  })
})
