import { describe, expect, it } from 'vitest'
import {
  SURAHS_INDEX,
  splitSurahIntoChunks,
  parseCustomVerseList,
  RAMADAN_30_DAYS_PACK,
  THEMATIC_PACKS,
} from '../bulkPacks'

describe('bulkPacks helpers', () => {
  it('contains complete 114 Surahs catalog', () => {
    expect(SURAHS_INDEX.length).toBe(114)
    expect(SURAHS_INDEX[0].englishName).toBe('Al-Fatiha')
    expect(SURAHS_INDEX[113].englishName).toBe('An-Nas')
  })

  it('splits Surah Al-Mulk (30 Ayahs) into chunks of 3', () => {
    const chunks = splitSurahIntoChunks(67, 3, 1, 30)
    expect(chunks.length).toBe(10)
    expect(chunks[0].startAyat).toBe(1)
    expect(chunks[0].count).toBe(3)
    expect(chunks[9].startAyat).toBe(28)
    expect(chunks[9].count).toBe(3)
  })

  it('splits Surah Al-Ikhlas (4 Ayahs) into chunks of 2', () => {
    const chunks = splitSurahIntoChunks(112, 2, 1, 4)
    expect(chunks.length).toBe(2)
    expect(chunks[0].count).toBe(2)
    expect(chunks[1].count).toBe(2)
  })

  it('parses freeform custom verse input accurately', () => {
    const input = '2:255, 3:18-19\n18:1-5; 112:1-4'
    const items = parseCustomVerseList(input)
    expect(items.length).toBe(4)

    expect(items[0].surah).toBe(2)
    expect(items[0].startAyat).toBe(255)
    expect(items[0].count).toBe(1)

    expect(items[1].surah).toBe(3)
    expect(items[1].startAyat).toBe(18)
    expect(items[1].count).toBe(2)

    expect(items[2].surah).toBe(18)
    expect(items[2].startAyat).toBe(1)
    expect(items[2].count).toBe(5)

    expect(items[3].surah).toBe(112)
    expect(items[3].startAyat).toBe(1)
    expect(items[3].count).toBe(4)
  })

  it('has 30 curated items in Ramadan pack', () => {
    expect(RAMADAN_30_DAYS_PACK.items.length).toBe(30)
  })

  it('has valid thematic packs', () => {
    expect(THEMATIC_PACKS.length).toBeGreaterThanOrEqual(3)
    THEMATIC_PACKS.forEach((p) => {
      expect(p.items.length).toBeGreaterThan(0)
    })
  })
})
