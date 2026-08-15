import { describe, expect, it } from 'vitest'
import { getTransform } from '../kenburns'

describe('getTransform', () => {
  it('returns identity for static motion', () => {
    expect(getTransform({ type: 'static', duration: 10 }, 5000)).toEqual({ x: 0, y: 0, scale: 1 })
  })

  it('starts at scale ~1.08 for zoom', () => {
    const t = getTransform({ type: 'kenburns-zoom', duration: 10 }, 0)
    expect(t.scale).toBeCloseTo(1.08, 2)
  })

  it('reaches max scale at end of zoom', () => {
    const t = getTransform({ type: 'kenburns-zoom', duration: 10 }, 10000)
    expect(t.scale).toBeCloseTo(1.2, 2)
  })

  it('clamps time beyond duration', () => {
    const t = getTransform({ type: 'kenburns-zoom', duration: 10 }, 20000)
    expect(t.scale).toBeCloseTo(1.2, 2)
  })
})
