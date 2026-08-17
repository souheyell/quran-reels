import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  fetchAndCacheAudio,
  preloadAndCacheVerses,
  subscribeAudioProgress,
  type AudioProgressInfo,
} from '../audioCache'
import type { Verse } from '../../types'

describe('audioCache service', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('handles empty url gracefully', async () => {
    const result = await fetchAndCacheAudio('')
    expect(result).toBe('')
  })

  it('notifies subscribers of progress events', async () => {
    const progressList: AudioProgressInfo[] = []
    const unsub = subscribeAudioProgress((info) => {
      progressList.push(info)
    })

    // Mock fetch
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-length': '28' }),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(28)),
    } as unknown as Response)

    // Mock URL.createObjectURL
    const mockBlobUrl = 'blob:http://localhost/mock-audio-uuid'
    vi.spyOn(URL, 'createObjectURL').mockReturnValue(mockBlobUrl)

    const result = await fetchAndCacheAudio('https://everyayah.com/data/Husary/001001.mp3', 1, 1, 'Husary')
    expect(result).toBe(mockBlobUrl)
    expect(progressList.length).toBeGreaterThan(0)
    expect(progressList[progressList.length - 1].percent).toBe(100)

    unsub()
  })

  it('preloads and caches multiple verses with progress callbacks', async () => {
    const verses: Verse[] = [
      {
        surah: 1,
        ayat: 1,
        arabic: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ',
        translation: 'In the name of Allah...',
        surahName: 'Al-Fatiha',
        editionId: 'en.sahih',
        editionName: 'Saheeh International',
        audioUrl: 'https://everyayah.com/data/Alafasy/001001.mp3',
        reciterName: 'Alafasy',
      },
      {
        surah: 1,
        ayat: 2,
        arabic: 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ',
        translation: 'Praise be to Allah...',
        surahName: 'Al-Fatiha',
        editionId: 'en.sahih',
        editionName: 'Saheeh International',
        audioUrl: 'https://everyayah.com/data/Alafasy/001002.mp3',
        reciterName: 'Alafasy',
      },
    ]

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-length': '28' }),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(28)),
    } as unknown as Response)

    const progressReports: number[] = []
    const cached = await preloadAndCacheVerses(verses, (pct) => {
      progressReports.push(pct)
    })

    expect(cached.length).toBe(2)
    expect(progressReports).toContain(100)
  })
})
