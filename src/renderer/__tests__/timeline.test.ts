import { describe, expect, it } from 'vitest'
import { activeSlot, buildTimeline, DEFAULT_AYAH_GAP_MS } from '../timeline'
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
  it('builds sequential seamless slots with 0ms default gap', () => {
    const t = buildTimeline([verse(1), verse(2), verse(3)], [5000, 7000, 3000], 8000)
    expect(t.slots).toHaveLength(3)
    expect(t.slots[0].durationMs).toBe(5000)
    expect(t.slots[0].startMs).toBe(0)
    expect(t.slots[0].endMs).toBe(5000)

    expect(t.slots[1].durationMs).toBe(7000)
    expect(t.slots[1].startMs).toBe(5000)
    expect(t.slots[1].endMs).toBe(12000)

    expect(t.slots[2].durationMs).toBe(3000)
    expect(t.slots[2].startMs).toBe(12000)
    expect(t.slots[2].endMs).toBe(15000)
    expect(t.totalMs).toBe(15000)
  })

  it('supports custom pause gap between ayahs', () => {
    const t = buildTimeline([verse(1), verse(2), verse(3)], [5000, 7000, 3000], 8000, 1600)
    expect(t.slots).toHaveLength(3)
    expect(t.slots[0].durationMs).toBe(6600)
    expect(t.slots[1].durationMs).toBe(8600)
    expect(t.slots[2].durationMs).toBe(3000)
    expect(t.totalMs).toBe(18200)
  })

  it('handles single verse without gap', () => {
    const t = buildTimeline([verse(1)], [5000], 8000)
    expect(t.slots).toHaveLength(1)
    expect(t.slots[0].durationMs).toBe(5000)
    expect(t.totalMs).toBe(5000)
  })

  it('fills missing durations with fallback and applies gap', () => {
    const t = buildTimeline([verse(1), verse(2)], [null, 4000], 8000)
    expect(t.slots[0].durationMs).toBe(8000 + DEFAULT_AYAH_GAP_MS)
    expect(t.slots[1].durationMs).toBe(4000)
    expect(t.totalMs).toBe(12000 + DEFAULT_AYAH_GAP_MS)
  })

  it('uses fallback when durations array is null', () => {
    const t = buildTimeline([verse(1), verse(2)], null, 6000)
    expect(t.slots[0].durationMs).toBe(6000 + DEFAULT_AYAH_GAP_MS)
    expect(t.slots[1].durationMs).toBe(6000)
    expect(t.totalMs).toBe(12000 + DEFAULT_AYAH_GAP_MS)
  })
})

describe('activeSlot', () => {
  const t = buildTimeline([verse(1), verse(2)], [5000, 5000], 8000, 0)

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
