import { describe, expect, it, vi } from 'vitest'
import { createBatchZip } from '../bulkExporter'
import type { BulkItem } from '../bulkPacks'

describe('bulkExporter service', () => {
  it('bundles multiple reel blobs and captions into a valid ZIP archive', async () => {
    const dummyBlob1 = new Blob(['mp4-video-stream-1'], { type: 'video/mp4' })
    const dummyBlob2 = new Blob(['mp4-video-stream-2'], { type: 'video/mp4' })

    const item1: BulkItem = {
      id: 'test-1',
      title: 'Surah Al-Fatiha (1-7)',
      surah: 1,
      startAyat: 1,
      count: 7,
    }
    const item2: BulkItem = {
      id: 'test-2',
      title: 'Ayat al-Kursi (255)',
      surah: 2,
      startAyat: 255,
      count: 1,
    }

    const batchResults = [
      {
        item: item1,
        blob: dummyBlob1,
        caption: 'Al-Fatiha Caption #Quran',
        verses: [],
      },
      {
        item: item2,
        blob: dummyBlob2,
        caption: 'Ayat al-Kursi Caption #Quran',
        verses: [],
      },
    ]

    const onZipProgress = vi.fn()
    const zipBlob = await createBatchZip(batchResults, onZipProgress)

    expect(zipBlob).toBeDefined()
    expect(zipBlob.size).toBeGreaterThan(0)
    expect(zipBlob.type).toBe('application/zip')
  })

  it('exposes popular shuffle reciters list with valid reciter IDs', async () => {
    const { POPULAR_SHUFFLE_RECITERS } = await import('../bulkExporter')
    expect(POPULAR_SHUFFLE_RECITERS.length).toBeGreaterThanOrEqual(5)
    expect(POPULAR_SHUFFLE_RECITERS[0].id).toBe('ar.alafasy')
    expect(POPULAR_SHUFFLE_RECITERS.some((r) => r.id === 'ar.minshawi')).toBe(true)
    expect(POPULAR_SHUFFLE_RECITERS.some((r) => r.id === 'ar.sudais')).toBe(true)
  })
})
