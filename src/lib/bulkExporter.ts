import JSZip from 'jszip'
import type { ReelConfig, Verse } from '../types'
import type { BulkItem } from './bulkPacks'
import { fetchVerses } from '../api/quran'
import { preloadAndCacheVerses } from './audioCache'
import { loadAudioDurations, fillMissingDurations } from './audio'
import { buildTimeline } from '../renderer/timeline'
import { exportVideo, saveAndDownloadBlob } from './export'
import { generateSocialCaption } from './share'
import { getImagesForCategory, STOCK_VIDEO_LOOPS, STOCK_CATEGORIES } from '../api/unsplash'
import { loadImage } from './imageCache'

export interface BatchItemStatus {
  item: BulkItem
  status: 'queued' | 'loading' | 'rendering' | 'completed' | 'error'
  progress: number
  message: string
  blob?: Blob
  videoUrl?: string
  caption?: string
  error?: string
}

export type BackgroundStrategy = 'current' | 'cycle-wallpapers' | 'cycle-videos'
export type ReciterStrategy = 'selected' | 'shuffle'

export const POPULAR_SHUFFLE_RECITERS = [
  { id: 'ar.alafasy', name: 'Mishary Rashid Alafasy' },
  { id: 'ar.minshawi', name: 'Mohamed Siddiq Al-Minshawi (Murattal)' },
  { id: 'ar.abdulbasitmurattal', name: 'Abdulbasit Abdussamad (Murattal)' },
  { id: 'ar.husary', name: 'Mahmoud Khalil Al-Husary' },
  { id: 'ar.sudais', name: 'Abdur-Rahman As-Sudais' },
  { id: 'ar.yasserdossari', name: 'Yasser Al-Dosari' },
  { id: 'ar.mahermuaiqly', name: 'Maher Al-Muaiqly' },
  { id: 'ar.ahmedajamy', name: 'Ahmed Al-Ajamy' },
  { id: 'ar.saadalghamdi', name: 'Saad Al-Ghamdi' },
  { id: 'ar.saudalshuraim', name: 'Saud Al-Shuraim' },
]

/**
 * Load an image element as a Promise
 */
function loadMediaPromise(url: string, isVideo = false): Promise<HTMLImageElement | HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    if (isVideo) {
      const v = document.createElement('video')
      v.crossOrigin = 'anonymous'
      v.src = url
      v.preload = 'auto'
      v.onloadeddata = () => resolve(v)
      v.onerror = () => reject(new Error(`Failed to load video background: ${url}`))
      v.load()
    } else {
      loadImage(
        url,
        (img) => resolve(img),
        () => {
          // Fallback image creation
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => resolve(img)
          img.onerror = () => reject(new Error(`Failed to load image: ${url}`))
          img.src = url
        },
      )
    }
  })
}

/**
 * Render a single bulk item into an MP4/WebM blob and caption.
 */
export async function renderBulkItem(
  item: BulkItem,
  itemIndex: number,
  baseConfig: ReelConfig,
  editionId: string,
  reciterId: string,
  bgStrategy: BackgroundStrategy,
  onProgress: (status: string, percent: number) => void,
  reciterStrategy: ReciterStrategy = 'selected',
): Promise<{ blob: Blob; caption: string; verses: Verse[] }> {
  // Determine effective reciter for this reel
  let effectiveReciter = item.reciterId || reciterId
  if (reciterStrategy === 'shuffle' && !item.reciterId) {
    const shufflePick = POPULAR_SHUFFLE_RECITERS[itemIndex % POPULAR_SHUFFLE_RECITERS.length]
    effectiveReciter = shufflePick.id
  }

  // 1. Fetch Verses
  onProgress('Loading verses…', 10)
  const rawVerses = await fetchVerses(
    item.surah,
    item.startAyat,
    item.count,
    editionId,
    effectiveReciter,
  )

  if (!rawVerses || rawVerses.length === 0) {
    throw new Error(`No verses found for Surah ${item.surah}:${item.startAyat}`)
  }

  // 2. Cache Audio
  onProgress('Downloading audio…', 25)
  const cachedVerses = await preloadAndCacheVerses(rawVerses)

  // 3. Audio Durations & Timeline
  onProgress('Calculating timeline…', 35)
  const durations = await loadAudioDurations(cachedVerses.map((v) => v.audioUrl))
  const fallbackMs = typeof baseConfig.motion?.duration === 'number'
    ? baseConfig.motion.duration * 1000
    : 8000
  const filledDurations = fillMissingDurations(durations, fallbackMs)

  const ayahPauseMs = typeof baseConfig.text?.ayahPauseDelay === 'number'
    ? Math.round(baseConfig.text.ayahPauseDelay * 1000)
    : 0
  const timeline = buildTimeline(cachedVerses, filledDurations, ayahPauseMs)

  // 4. Background Media
  onProgress('Loading media…', 45)
  let bgUrl = baseConfig.background.url
  let bgType: 'image' | 'video' = baseConfig.background.mediaType || 'image'

  if (bgStrategy === 'cycle-wallpapers') {
    const category = STOCK_CATEGORIES[itemIndex % STOCK_CATEGORIES.length]
    const photos = getImagesForCategory(category, itemIndex)
    if (photos.length > 0) {
      bgUrl = photos[itemIndex % photos.length].full
      bgType = 'image'
    }
  } else if (bgStrategy === 'cycle-videos' && STOCK_VIDEO_LOOPS.length > 0) {
    const videoLoop = STOCK_VIDEO_LOOPS[itemIndex % STOCK_VIDEO_LOOPS.length]
    bgUrl = videoLoop.full
    bgType = 'video'
  }

  const mediaSource = await loadMediaPromise(bgUrl, bgType === 'video').catch(() => null)

  // 5. Construct Item Reel Config
  const itemConfig: ReelConfig = {
    ...baseConfig,
    verses: cachedVerses,
    background: {
      ...baseConfig.background,
      url: bgUrl,
      mediaType: bgType,
    },
  }

  // 6. Render MP4
  onProgress('Rendering MP4 video…', 50)
  const handle = exportVideo(itemConfig, mediaSource, timeline, (fraction) => {
    const pct = Math.min(99, Math.round(50 + fraction * 48))
    onProgress('Rendering MP4 video…', pct)
  })

  const blob = await handle.done
  const caption = generateSocialCaption(cachedVerses, cachedVerses[0]?.reciterName)

  onProgress('Completed', 100)
  return { blob, caption, verses: cachedVerses }
}

/**
 * Package multiple exported reels + captions into a single structured ZIP archive.
 */
export async function createBatchZip(
  batchResults: Array<{
    item: BulkItem
    blob: Blob
    caption: string
    verses: Verse[]
  }>,
  onZipProgress?: (percent: number) => void,
): Promise<Blob> {
  const zip = new JSZip()

  const reelsFolder = zip.folder('reels')
  const captionsFolder = zip.folder('captions')
  let combinedCaptions = '═══════════════════════════════════════════════════\n'
  combinedCaptions += '   QURAN REELS BATCH — SOCIAL MEDIA CAPTIONS\n'
  combinedCaptions += '═══════════════════════════════════════════════════\n\n'

  for (let i = 0; i < batchResults.length; i++) {
    const res = batchResults[i]
    const idxStr = String(i + 1).padStart(2, '0')
    const safeTitle = res.item.title.replace(/[^a-zA-Z0-9_-]/g, '_')
    const ext = res.blob.type.includes('mp4') ? 'mp4' : 'webm'
    const videoFileName = `${idxStr}_${safeTitle}.${ext}`
    const captionFileName = `${idxStr}_${safeTitle}_caption.txt`

    // Convert blob to ArrayBuffer for universal JSZip serialization
    const buffer = await res.blob.arrayBuffer()

    // Add MP4 to reels folder
    if (reelsFolder) {
      reelsFolder.file(videoFileName, buffer)
    }

    // Add caption to captions folder
    if (captionsFolder) {
      captionsFolder.file(captionFileName, res.caption)
    }

    // Append to combined captions
    combinedCaptions += `\n───────────────────────────────────────────────────\n`
    combinedCaptions += ` REEL ${idxStr}: ${res.item.title}\n`
    combinedCaptions += ` File: ${videoFileName}\n`
    combinedCaptions += `───────────────────────────────────────────────────\n`
    combinedCaptions += `${res.caption}\n\n`
  }

  // Add README & master captions file
  zip.file('ALL_SOCIAL_CAPTIONS.txt', combinedCaptions)
  zip.file(
    'README.txt',
    `Islamic Reels Creator — Bulk Batch Export\n` +
      `Total Reels: ${batchResults.length}\n` +
      `Generated with authentic Thuluth calligraphy, classical Qari recitations, and golden Islamic borders.\n\n` +
      `May this content serve as Sadaqah Jariyah for you and all who share it.\n` +
      `Made with Quran Reels Creator.\n`,
  )

  const zipBlob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      onZipProgress?.(Math.round(metadata.percent))
    },
  )

  return zipBlob
}

/**
 * Trigger immediate saving/download of the generated batch ZIP archive.
 */
export async function downloadBatchZip(zipBlob: Blob, zipName = 'quran-reels-batch.zip'): Promise<void> {
  await saveAndDownloadBlob(zipBlob, zipName, {
    title: 'Quran Reels Batch ZIP Pack',
    dialogTitle: 'Save / Share Bulk Reels ZIP Archive',
  })
}
