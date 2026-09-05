import { describe, expect, it } from 'vitest'
import {
  getAverageAyahDuration,
  estimateBulkItemDurationSeconds,
  formatEstimatedDuration,
  formatTotalBatchEstimate,
  getSocialDurationCategory,
} from '../durationEstimator'
import type { BulkItem } from '../bulkPacks'

describe('durationEstimator', () => {
  it('calculates average ayah duration based on surah density', () => {
    // Al-Fatiha
    expect(getAverageAyahDuration(1)).toBe(5.5)
    // Al-Baqarah
    expect(getAverageAyahDuration(2)).toBe(24)
    // Ayat al-Kursi (2:255)
    expect(getAverageAyahDuration(2, 255, 1)).toBe(50)
    // Al-Mulk (67)
    expect(getAverageAyahDuration(67)).toBe(12)
    // Al-Ikhlas (112)
    expect(getAverageAyahDuration(112)).toBe(4.2)
  })

  it('estimates bulk queue item duration with reciter factor and pauses', () => {
    const mulkItem: BulkItem = {
      id: 'mulk-1-3',
      title: 'Al-Mulk (1-3)',
      surah: 67,
      startAyat: 1,
      count: 3,
    }
    const duration = estimateBulkItemDurationSeconds(mulkItem, 'ar.alafasy', 0.5)
    // 3 * 12 * 1.0 + 2 * 0.5 = 37s
    expect(duration).toBe(37)

    // Mujawwad should take longer (~1.4x)
    const mujawwadDur = estimateBulkItemDurationSeconds(mulkItem, 'ar.husarymujawwad', 0.5)
    expect(mujawwadDur).toBeGreaterThan(duration)
  })

  it('formats estimated durations nicely', () => {
    expect(formatEstimatedDuration(25)).toBe('~25s')
    expect(formatEstimatedDuration(60)).toBe('~1m')
    expect(formatEstimatedDuration(75)).toBe('~1m 15s')
    expect(formatEstimatedDuration(125)).toBe('~2m 5s')
  })

  it('formats total batch estimates nicely', () => {
    expect(formatTotalBatchEstimate(45)).toBe('~45s')
    expect(formatTotalBatchEstimate(150)).toBe('~2m 30s')
    expect(formatTotalBatchEstimate(3600)).toBe('~1h 0m')
    expect(formatTotalBatchEstimate(3750)).toBe('~1h 2m')
  })

  it('categorizes social duration for Reels and Shorts', () => {
    expect(getSocialDurationCategory(35).cssClass).toBe('short')
    expect(getSocialDurationCategory(75).cssClass).toBe('medium')
    expect(getSocialDurationCategory(120).cssClass).toBe('long')
  })
})
