import { describe, expect, it } from 'vitest'
import { getTransform } from '../kenburns'

describe('getTransform', () => {
  it('returns identity for static motion', () => {
    expect(getTransform({ type: 'static', duration: 10 }, 5000)).toEqual({ x: 0, y: 0, scale: 1 })
  })

  it('starts at scale ~1.08 for zoom in', () => {
    const t = getTransform({ type: 'kenburns-zoom', duration: 10 }, 0)
    expect(t.scale).toBeCloseTo(1.08, 2)
  })

  it('reaches max scale at end of zoom in', () => {
    const t = getTransform({ type: 'kenburns-zoom', duration: 10 }, 10000)
    expect(t.scale).toBeCloseTo(1.22, 2)
  })

  it('handles zoom out starting wide and pulling out', () => {
    const tStart = getTransform({ type: 'kenburns-zoom-out', duration: 10 }, 0)
    const tEnd = getTransform({ type: 'kenburns-zoom-out', duration: 10 }, 10000)
    expect(tStart.scale).toBeCloseTo(1.22, 2)
    expect(tEnd.scale).toBeCloseTo(1.08, 2)
  })

  it('handles drift up pan', () => {
    const t = getTransform({ type: 'kenburns-drift-up', duration: 10 }, 5000)
    expect(t.scale).toBeCloseTo(1.14, 2)
    expect(t.y).toBeDefined()
  })

  it('handles diagonal drift', () => {
    const t = getTransform({ type: 'kenburns-drift-diagonal', duration: 10 }, 5000)
    expect(t.x).toBeDefined()
    expect(t.y).toBeDefined()
  })

  it('clamps time beyond duration', () => {
    const t = getTransform({ type: 'kenburns-zoom', duration: 10 }, 20000)
    expect(t.scale).toBeCloseTo(1.22, 2)
  })
})
