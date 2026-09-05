import { describe, expect, it, vi } from 'vitest'
import {
  createBatchZip,
  formatDurationMs,
  formatDurationSecsDetailed,
  getSurahSlug,
  generateManifestItem,
  type ManifestItem,
} from '../bulkExporter'
import type { BulkItem } from '../bulkPacks'
import type { Verse } from '../../types'
import JSZip from 'jszip'

describe('bulkExporter service', () => {
  it('formats duration in mm:ss format correctly', () => {
    expect(formatDurationMs(0)).toBe('0:00')
    expect(formatDurationMs(15000)).toBe('0:15')
    expect(formatDurationMs(65000)).toBe('1:05')
    expect(formatDurationMs(125000)).toBe('2:05')
  })

  it('formats detailed duration in seconds or minutes and seconds correctly', () => {
    expect(formatDurationSecsDetailed(14200)).toBe('14.2s')
    expect(formatDurationSecsDetailed(65400)).toBe('1m 5.4s')
    expect(formatDurationSecsDetailed(182900)).toBe('3m 2.9s')
  })

  it('generates clean surah slugs stripping Arabic definite articles correctly', () => {
    expect(getSurahSlug(18, 'Al-Kahf')).toBe('kahf')
    expect(getSurahSlug(19, 'Maryam')).toBe('maryam')
    expect(getSurahSlug(55, 'Ar-Rahman')).toBe('rahman')
    expect(getSurahSlug(2, 'Al-Baqarah')).toBe('baqarah')
    expect(getSurahSlug(3, "Ali 'Imran")).toBe('ali_imran')
    expect(getSurahSlug(4, 'An-Nisa')).toBe('nisa')
    expect(getSurahSlug(114, 'An-Nas')).toBe('nas')
  })

  it('generates manifest item matching the recommended master schema (Al-Kahf & Maryam)', () => {
    // 1. Al-Kahf 1-10 with Mishary Alafasy
    const kahfItem: BulkItem = {
      id: 'kahf-test',
      title: 'Al-Kahf (1-10)',
      surah: 18,
      startAyat: 1,
      count: 10,
      reciterId: 'ar.alafasy',
    }
    const kahfManifest = generateManifestItem(kahfItem, 0, 'mp4')

    expect(kahfManifest.filename).toBe('01_kahf_verses_1_10.mp4')
    expect(kahfManifest.title).toBe('سورة الكهف | آيات 1-10')
    expect(kahfManifest.surah).toBe(18)
    expect(kahfManifest.surahName).toBe('Al-Kahf')
    expect(kahfManifest.ayah).toBe('1 - 10')
    expect(kahfManifest.reciter).toBe('Mishary Rashid Alafasy')
    expect(kahfManifest.description).toContain('تلاوة خاشعة عطرة بصوت القارئ مشاري العفاسي من سورة الكهف المباركة.')
    expect(kahfManifest.description).toContain('فضل قراءة سورة الكهف يوم الجمعة أضاء له من النور ما بين الجمعتين.')
    expect(kahfManifest.hashtags).toEqual(['#القرآن', '#سورة_الكهف', '#تلاوة'])

    // 2. Maryam 1-15 with Abdulbasit Abdulsamad
    const maryamItem: BulkItem = {
      id: 'maryam-test',
      title: 'Maryam (1-15)',
      surah: 19,
      startAyat: 1,
      count: 15,
      reciterId: 'ar.abdulbasitmurattal',
    }
    const mockMaryamVerses: Partial<Verse>[] = [
      { surah: 19, ayat: 1, arabic: 'كهيعص' },
      { surah: 19, ayat: 2, arabic: 'ذِكْرُ رَحْمَتِ رَبِّكَ عَبْدَهُ زَكَرِيَّا' },
    ]
    const maryamManifest = generateManifestItem(
      maryamItem,
      1,
      'mp4',
      mockMaryamVerses as Verse[],
    )

    expect(maryamManifest.filename).toBe('02_maryam_verses_1_15.mp4')
    expect(maryamManifest.title).toBe('سورة مريم | آيات 1-15')
    expect(maryamManifest.surah).toBe(19)
    expect(maryamManifest.surahName).toBe('Maryam')
    expect(maryamManifest.ayah).toBe('1 - 15')
    expect(maryamManifest.reciter).toBe('Abdulbasit Abdulsamad')
    expect(maryamManifest.description).toBe(
      'ذِكْرُ رَحْمَتِ رَبِّكَ عَبْدَهُ زَكَرِيَّا - تلاوة خاشعة من سورة مريم بصوت الشيخ عبد الباسط عبد الصمد رحمه الله.',
    )
    expect(maryamManifest.hashtags).toEqual(['#القرآن', '#سورة_مريم', '#عبدالباسط'])
  })

  it('bundles reels into Format 1: Master manifest.json with flat root-level files', async () => {
    const dummyBlob1 = new Blob(['mp4-video-kahf'], { type: 'video/mp4' })
    const dummyBlob2 = new Blob(['mp4-video-maryam'], { type: 'video/mp4' })

    const kahfItem: BulkItem = {
      id: 'kahf-1',
      title: 'Al-Kahf (1-10)',
      surah: 18,
      startAyat: 1,
      count: 10,
      reciterId: 'ar.alafasy',
    }
    const maryamItem: BulkItem = {
      id: 'maryam-1',
      title: 'Maryam (1-15)',
      surah: 19,
      startAyat: 1,
      count: 15,
      reciterId: 'ar.abdulbasitmurattal',
    }

    const batchResults = [
      {
        item: kahfItem,
        blob: dummyBlob1,
        caption: 'Al-Kahf Caption',
        verses: [] as Verse[],
        durationMs: 45000,
      },
      {
        item: maryamItem,
        blob: dummyBlob2,
        caption: 'Maryam Caption',
        verses: [
          { surah: 19, ayat: 1, arabic: 'كهيعص' },
          { surah: 19, ayat: 2, arabic: 'ذكر رحمة ربك عبده زكريا' },
        ] as unknown as Verse[],
        durationMs: 55000,
      },
    ]

    const onZipProgress = vi.fn()
    const zipBlob = await createBatchZip(batchResults, onZipProgress)

    expect(zipBlob).toBeDefined()
    expect(zipBlob.size).toBeGreaterThan(0)
    expect(zipBlob.type).toBe('application/zip')

    const unzipped = await JSZip.loadAsync(await zipBlob.arrayBuffer())

    // 1. Check root files exist directly (no subfolders)
    expect(unzipped.file('01_kahf_verses_1_10.mp4')).not.toBeNull()
    expect(unzipped.file('02_maryam_verses_1_15.mp4')).not.toBeNull()
    expect(unzipped.file('manifest.json')).not.toBeNull()

    // 2. Ensure NO old subfolders exist
    expect(unzipped.folder('reels')?.file(/.+/).length || 0).toBe(0)
    expect(unzipped.folder('captions')?.file(/.+/).length || 0).toBe(0)
    expect(unzipped.file('BATCH_MANIFEST.txt')).toBeNull()

    // 3. Parse manifest.json as Array format
    const manifestStr = await unzipped.file('manifest.json')!.async('string')
    const manifestData: ManifestItem[] = JSON.parse(manifestStr)

    expect(Array.isArray(manifestData)).toBe(true)
    expect(manifestData.length).toBe(2)

    expect(manifestData[0].filename).toBe('01_kahf_verses_1_10.mp4')
    expect(manifestData[0].title).toBe('سورة الكهف | آيات 1-10')
    expect(manifestData[0].surah).toBe(18)
    expect(manifestData[0].surahName).toBe('Al-Kahf')
    expect(manifestData[0].ayah).toBe('1 - 10')
    expect(manifestData[0].reciter).toBe('Mishary Rashid Alafasy')
    expect(manifestData[0].hashtags).toEqual(['#القرآن', '#سورة_الكهف', '#تلاوة'])

    expect(manifestData[1].filename).toBe('02_maryam_verses_1_15.mp4')
    expect(manifestData[1].title).toBe('سورة مريم | آيات 1-15')
    expect(manifestData[1].surah).toBe(19)
    expect(manifestData[1].surahName).toBe('Maryam')
    expect(manifestData[1].ayah).toBe('1 - 15')
    expect(manifestData[1].reciter).toBe('Abdulbasit Abdulsamad')
    expect(manifestData[1].hashtags).toEqual(['#القرآن', '#سورة_مريم', '#عبدالباسط'])
  })

  it('supports Key-Value dictionary manifest format when requested', async () => {
    const dummyBlob = new Blob(['mp4-data'], { type: 'video/mp4' })
    const item: BulkItem = {
      id: 'kahf-dict',
      title: 'Al-Kahf (1-10)',
      surah: 18,
      startAyat: 1,
      count: 10,
    }

    const zipBlob = await createBatchZip(
      [{ item, blob: dummyBlob, caption: '', verses: [] }],
      { manifestFormat: 'keyValue' },
    )

    const unzipped = await JSZip.loadAsync(await zipBlob.arrayBuffer())
    const manifestStr = await unzipped.file('manifest.json')!.async('string')
    const dict = JSON.parse(manifestStr)

    expect(typeof dict).toBe('object')
    expect(Array.isArray(dict)).toBe(false)
    expect(dict['01_kahf_verses_1_10.mp4']).toBeDefined()
    expect(dict['01_kahf_verses_1_10.mp4'].title).toBe('سورة الكهف | آيات 1-10')
    expect(dict['01_kahf_verses_1_10.mp4'].surah).toBe(18)
  })

  it('exposes popular shuffle reciters list with valid reciter IDs', async () => {
    const { POPULAR_SHUFFLE_RECITERS } = await import('../bulkExporter')
    expect(POPULAR_SHUFFLE_RECITERS.length).toBeGreaterThanOrEqual(5)
    expect(POPULAR_SHUFFLE_RECITERS[0].id).toBe('ar.alafasy')
    expect(POPULAR_SHUFFLE_RECITERS.some((r) => r.id === 'ar.minshawi')).toBe(true)
    expect(POPULAR_SHUFFLE_RECITERS.some((r) => r.id === 'ar.sudais')).toBe(true)
  })
})
