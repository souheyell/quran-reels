import { describe, expect, it } from 'vitest'
import { activeSlot, buildTimeline } from '../timeline'
import type { Verse } from '../../types'

function verse(ayat: number): Verse {
  return {
    surah: 2,
    ayat,
    surahName: 'Al-Baqarah',
    arabic: '',
    translation: '',
    editionId: 'en.sahih',
    editionName: 'Saheeh International',
    audioUrl: null,
  }
}

describe('buildTimeline', () => {
  it('builds sequential slots from durations', () => {
    const t = buildTimeline([verse(1), verse(2), verse(3)], [5000, 7000, 3000], 8000)
    expect(t.slots).toHaveLength(3)
    expect(t.totalMs).toBe(15000)
    expect(t.slots[0].startMs).toBe(0)
    expect(t.slots[0].endMs).toBe(5000)
    expect(t.slots[1].startMs).toBe(5000)
    expect(t.slots[1].endMs).toBe(12000)
    expect(t.slots[2].startMs).toBe(12000)
    expect(t.slots[2].endMs).toBe(15000)
  })

  it('fills missing durations with fallback', () => {
    const t = buildTimeline([verse(1), verse(2)], [null, 4000], 8000)
    expect(t.slots[0].durationMs).toBe(8000)
    expect(t.slots[1].durationMs).toBe(4000)
    expect(t.totalMs).toBe(12000)
  })

  it('uses fallback when durations array is null', () => {
    const t = buildTimeline([verse(1), verse(2)], null, 6000)
    expect(t.slots.every((s) => s.durationMs === 6000)).toBe(true)
    expect(t.totalMs).toBe(12000)
  })
})

describe('activeSlot', () => {
  const t = buildTimeline([verse(1), verse(2)], [5000, 5000], 8000)

  it('returns the slot containing the time', () => {
    expect(activeSlot(t, 0)?.verse.ayat).toBe(1)
    expect(activeSlot(t, 4999)?.verse.ayat).toBe(1)
    expect(activeSlot(t, 5000)?.verse.ayat).toBe(2)
    expect(activeSlot(t, 9999)?.verse.ayat).toBe(2)
  })

  it('wraps around the total duration', () => {
    expect(activeSlot(t, 10000)?.verse.ayat).toBe(1)
    expect(activeSlot(t, 12000)?.verse.ayat).toBe(1)
    expect(activeSlot(t, 14000)?.verse.ayat).toBe(1)
    expect(activeSlot(t, -1000)?.verse.ayat).toBe(2)
  })

  it('returns null for an empty timeline', () => {
    expect(activeSlot({ slots: [], totalMs: 0 }, 100)).toBeNull()
  })
})
