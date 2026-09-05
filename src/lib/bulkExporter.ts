import JSZip from 'jszip'
import type { ReelConfig, Verse } from '../types'
import { SURAHS_INDEX, type BulkItem } from './bulkPacks'
import { ALL_RECITERS, fetchVerses } from '../api/quran'
import { preloadAndCacheVerses } from './audioCache'
import { loadAudioDurations, fillMissingDurations } from './audio'
import { buildTimeline } from '../renderer/timeline'
import { exportVideo, saveAndDownloadBlob } from './export'
import { generateSocialCaption } from './share'
import { loadImage } from './imageCache'
import {
  getImagesForCategory,
  STOCK_CATEGORIES,
  getLocalMediaCurated,
  getAllStockVideoLoops,
} from '../api/unsplash'

export interface ManifestItem {
  filename: string
  title: string
  description: string
  surah: number
  surahName: string
  ayah: string
  reciter: string
  hashtags: string[]
}

export type ManifestFormat = 'array' | 'keyValue'

export interface BatchZipOptions {
  manifestFormat?: ManifestFormat
  onZipProgress?: (percent: number) => void
}

export interface BatchItemStatus {
  item: BulkItem
  status: 'queued' | 'loading' | 'rendering' | 'completed' | 'error'
  progress: number
  message: string
  blob?: Blob
  videoUrl?: string
  caption?: string
  verses?: Verse[]
  error?: string
  durationMs?: number
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

export function formatDurationMs(ms: number): string {
  const totalSecs = Math.max(0, Math.round(ms / 1000))
  const mins = Math.floor(totalSecs / 60)
  const secs = totalSecs % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function formatDurationSecsDetailed(ms: number): string {
  const totalSecs = ms / 1000
  if (totalSecs >= 60) {
    const mins = Math.floor(totalSecs / 60)
    const remSecs = (totalSecs % 60).toFixed(1)
    return `${mins}m ${remSecs}s`
  }
  return `${totalSecs.toFixed(1)}s`
}

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
 * Render a single bulk item into an MP4/WebM blob, caption, and exact duration.
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
): Promise<{ blob: Blob; caption: string; verses: Verse[]; durationMs: number }> {
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
  const timeline = buildTimeline(cachedVerses, filledDurations, fallbackMs, ayahPauseMs)
  const durationMs = timeline.totalMs
  const durationLabel = `${(durationMs / 1000).toFixed(1)}s`

  // 4. Background Media
  onProgress('Loading media…', 45)
  let bgUrl = baseConfig.background.url
  let bgType: 'image' | 'video' = baseConfig.background.mediaType || 'image'

  if (bgStrategy === 'cycle-wallpapers') {
    const localCurated = getLocalMediaCurated()
    if (localCurated.images.length > 0) {
      const picked = localCurated.images[itemIndex % localCurated.images.length]
      bgUrl = picked.full
      bgType = 'image'
    } else {
      const category = STOCK_CATEGORIES[itemIndex % STOCK_CATEGORIES.length]
      const photos = getImagesForCategory(category, itemIndex)
      if (photos.length > 0) {
        bgUrl = photos[itemIndex % photos.length].full
        bgType = 'image'
      }
    }
  } else if (bgStrategy === 'cycle-videos') {
    const allVideos = getAllStockVideoLoops()
    if (allVideos.length > 0) {
      const videoLoop = allVideos[itemIndex % allVideos.length]
      bgUrl = videoLoop.full
      bgType = 'video'
    }
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
  onProgress(`Rendering MP4 (${durationLabel})…`, 50)
  const handle = exportVideo(itemConfig, mediaSource, timeline, (fraction) => {
    const pct = Math.min(99, Math.round(50 + fraction * 48))
    onProgress(`Rendering MP4 (${durationLabel})…`, pct)
  })

  const blob = await handle.done
  const caption = generateSocialCaption(cachedVerses, cachedVerses[0]?.reciterName)

  onProgress(`Completed (${durationLabel})`, 100)
  return { blob, caption, verses: cachedVerses, durationMs }
}

/**
 * Convert a Surah english name into a clean lowercase slug,
 * stripping common Arabic definite prefixes (e.g. Al-Kahf -> kahf, Maryam -> maryam, Ar-Rahman -> rahman).
 */
export function getSurahSlug(surahNumber: number, englishName?: string): string {
  const meta = SURAHS_INDEX.find((s) => s.number === surahNumber)
  const rawName = englishName || meta?.englishName || `surah_${surahNumber}`

  let slug = rawName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’`]/g, '')
    .trim()

  // Strip common Arabic definite prefixes (al-, ar-, an-, ash-, at-, az-, ad-, as-, adh-)
  slug = slug.replace(/^(?:al|ar|an|ash|at|az|ad|as|adh)[-_]/, '')

  // Clean any remaining non-alphanumeric characters to underscores
  slug = slug.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')

  return slug || `surah_${surahNumber}`
}

export function cleanReciterName(name: string): string {
  let cleaned = name.replace(/\s*\([^)]*\)/g, '').trim()
  if (cleaned.toLowerCase().includes('abdulbasit')) {
    cleaned = 'Abdulbasit Abdulsamad'
  }
  return cleaned
}

export const KNOWN_SURAH_VIRTUES: Record<number, string> = {
  1: 'أم القرآن وفاتحة الكتاب والسبع المثاني الشافية بإذن الله.',
  18: 'فضل قراءة سورة الكهف يوم الجمعة أضاء له من النور ما بين الجمعتين.',
  36: 'يس قلب القرآن، تلاوة مباركة تفيض بالسكينة والطمأنينة.',
  55: 'عروس القرآن، تذكرة بآلاء الله ونعمه العظيمة التي لا تعد ولا تحصى.',
  56: 'سورة الواقعة، من قرأها كل ليلة لم تصبه فاقة أبداً.',
  67: 'سورة الملك المانعة من عذاب القبر، شفاعة لقارئها حتى يغفر له.',
  94: 'فإن مع العسر يسراً، بشارة بانشراح الصدر والفرج القريب.',
  97: 'ليلة القدر خير من ألف شهر، تتنزل الملائكة والروح فيها بالسلام.',
  112: 'سورة الإخلاص تعدل ثلث القرآن في الفضل والأجر.',
  113: 'سورة الفلق معوذة وحصن من شر ما خلق ومن شر غاسق إذا وقب.',
  114: 'سورة الناس حصن وأمان من وسواس الخناس وشرور الإنس والجن.',
}

function getReciterInfo(reciterId?: string, reciterName?: string): { label: string; tag: string } {
  const lowerId = (reciterId || '').toLowerCase()
  const lowerName = (reciterName || '').toLowerCase()

  if (lowerId.includes('abdulbasit') || lowerName.includes('abdulbasit')) {
    return { label: 'الشيخ عبد الباسط عبد الصمد رحمه الله', tag: '#عبدالباسط' }
  }
  if (lowerId.includes('alafasy') || lowerName.includes('alafasy')) {
    return { label: 'القارئ مشاري العفاسي', tag: '#تلاوة' }
  }
  if (lowerId.includes('minshawi') || lowerName.includes('minshawi')) {
    return { label: 'الشيخ محمد صديق المنشاوي رحمه الله', tag: '#المنشاوي' }
  }
  if (lowerId.includes('husary') || lowerName.includes('husary')) {
    return { label: 'الشيخ محمود خليل الحصري رحمه الله', tag: '#الحصري' }
  }
  if (lowerId.includes('sudais') || lowerName.includes('sudais')) {
    return { label: 'الشيخ عبد الرحمن السديس', tag: '#السديس' }
  }
  if (lowerId.includes('shuraim') || lowerName.includes('shuraim')) {
    return { label: 'الشيخ سعود الشريم', tag: '#الشريم' }
  }
  if (lowerId.includes('dossari') || lowerName.includes('dossari')) {
    return { label: 'الشيخ ياسر الدوسري', tag: '#الدوسري' }
  }
  if (lowerId.includes('maher') || lowerName.includes('muaiqly')) {
    return { label: 'الشيخ ماهر المعيقلي', tag: '#المعيقلي' }
  }
  if (lowerId.includes('ghamdi') || lowerName.includes('ghamdi')) {
    return { label: 'الشيخ سعد الغامدي', tag: '#الغامدي' }
  }
  if (lowerId.includes('ajamy') || lowerName.includes('ajamy')) {
    return { label: 'الشيخ أحمد العجمي', tag: '#العجمي' }
  }

  const match = ALL_RECITERS.find((r) => r.id === reciterId || r.name === reciterName)
  if (match?.arabicName) {
    const cleanAr = match.arabicName.replace(/\s*\([^)]*\)/g, '').trim()
    return { label: `الشيخ ${cleanAr}`, tag: '#تلاوة' }
  }

  return { label: 'القارئ مشاري العفاسي', tag: '#تلاوة' }
}

function extractOpeningSnippet(verses?: Verse[]): string | null {
  if (!verses || verses.length === 0) return null

  for (const v of verses) {
    if (!v.arabic) continue
    const cleaned = v.arabic
      .replace(/^بِسْمِ\s+[\u0600-\u06FF\s]+?الرَّحِيمِ\s*/u, '')
      .replace(/[\u06DD\uFD3E\uFD3F۝\(\)\d]/g, '')
      .trim()

    const words = cleaned.split(/\s+/).filter(Boolean)
    if (words.length <= 1 && verses.length > 1) {
      continue
    }

    if (words.length > 0) {
      const candidate = words.slice(0, 5).join(' ')
      return candidate.length > 50 ? candidate.slice(0, 50).trim() : candidate
    }
  }

  return null
}

export function generateManifestDescription(
  item: BulkItem,
  surahArabicName: string,
  reciterLabel: string,
  verses?: Verse[],
): string {
  const surahNumber = item.surah
  const isAyatAlKursi =
    surahNumber === 2 && item.startAyat <= 255 && item.startAyat + item.count - 1 >= 255
  const virtue = isAyatAlKursi
    ? 'آية الكرسي أعظم آية في كتاب الله تحفظ قارئها من كل سوء.'
    : KNOWN_SURAH_VIRTUES[surahNumber]

  if (surahNumber === 18 && virtue) {
    return `تلاوة خاشعة عطرة بصوت ${reciterLabel} من سورة الكهف المباركة.\n\n${virtue}`
  }

  const snippet = extractOpeningSnippet(verses)
  if (snippet) {
    return `${snippet} - تلاوة خاشعة من سورة ${surahArabicName} بصوت ${reciterLabel}.`
  }

  if (virtue) {
    return `تلاوة خاشعة عطرة بصوت ${reciterLabel} من سورة ${surahArabicName} المباركة.\n\n${virtue}`
  }

  return `تلاوة خاشعة عطرة بصوت ${reciterLabel} من سورة ${surahArabicName} المباركة.`
}

export function generateManifestItem(
  item: BulkItem,
  index: number,
  ext: 'mp4' | 'webm' = 'mp4',
  verses?: Verse[],
): ManifestItem {
  const meta = SURAHS_INDEX.find((s) => s.number === item.surah)
  const surahArabic = meta?.name || verses?.[0]?.surahArabicName || ''
  const surahEnglish = meta?.englishName || verses?.[0]?.surahName || `Surah ${item.surah}`
  const count = item.count
  const endAyat = item.startAyat + count - 1

  // 1. Filename: 01_kahf_verses_1_10.mp4
  const idxStr = String(index + 1).padStart(2, '0')
  const slug = getSurahSlug(item.surah, surahEnglish)
  const versePart = count > 1 ? `verses_${item.startAyat}_${endAyat}` : `verses_${item.startAyat}`
  const filename = `${idxStr}_${slug}_${versePart}.${ext}`

  // 2. Title: سورة الكهف | آيات 1-10
  const title = surahArabic
    ? `سورة ${surahArabic} | ${count > 1 ? `آيات ${item.startAyat}-${endAyat}` : `آية ${item.startAyat}`}`
    : item.title

  // 3. Reciter info
  const effectiveReciterId = item.reciterId || verses?.[0]?.reciterId
  const effectiveReciterName = verses?.[0]?.reciterName
  const reciterInfo = getReciterInfo(effectiveReciterId, effectiveReciterName)
  const reciterEnglish = cleanReciterName(
    effectiveReciterName ||
      ALL_RECITERS.find((r) => r.id === effectiveReciterId)?.name ||
      'Mishary Rashid Alafasy',
  )

  // 4. Description
  const description = generateManifestDescription(item, surahArabic, reciterInfo.label, verses)

  // 5. Ayah: "1 - 10"
  const ayah = count > 1 ? `${item.startAyat} - ${endAyat}` : `${item.startAyat}`

  // 6. Hashtags: ["#القرآن", "#سورة_الكهف", "#تلاوة"]
  const surahTag = `#سورة_${surahArabic.replace(/\s+/g, '_').replace(/[^\u0600-\u06FF_]/g, '')}`
  const hashtags = ['#القرآن', surahTag, reciterInfo.tag]

  return {
    filename,
    title,
    description,
    surah: item.surah,
    surahName: surahEnglish,
    ayah,
    reciter: reciterEnglish,
    hashtags,
  }
}

/**
 * Package multiple exported reels into Format 1: Master manifest.json
 * All videos sit directly in the root of the archive alongside a single manifest.json.
 */
export async function createBatchZip(
  batchResults: Array<{
    item: BulkItem
    blob: Blob
    caption: string
    verses: Verse[]
    durationMs?: number
  }>,
  optionsOrProgress?: BatchZipOptions | ((percent: number) => void),
): Promise<Blob> {
  const options: BatchZipOptions =
    typeof optionsOrProgress === 'function'
      ? { onZipProgress: optionsOrProgress, manifestFormat: 'array' }
      : optionsOrProgress || { manifestFormat: 'array' }

  const manifestFormat = options.manifestFormat || 'array'
  const onZipProgress = options.onZipProgress

  const zip = new JSZip()
  const manifestItems: ManifestItem[] = []

  for (let i = 0; i < batchResults.length; i++) {
    const res = batchResults[i]
    const ext = res.blob.type.includes('webm') ? 'webm' : 'mp4'
    const manifestItem = generateManifestItem(res.item, i, ext, res.verses)
    manifestItems.push(manifestItem)

    // Convert blob to ArrayBuffer for universal JSZip serialization
    const buffer = await res.blob.arrayBuffer()

    // Place video file directly in the root of the archive alongside manifest.json
    zip.file(manifestItem.filename, buffer)
  }

  // Format manifest.json
  let manifestContent: string
  if (manifestFormat === 'keyValue') {
    const dict: Record<string, Omit<ManifestItem, 'filename'>> = {}
    for (const item of manifestItems) {
      const { filename, ...rest } = item
      dict[filename] = rest
    }
    manifestContent = JSON.stringify(dict, null, 2)
  } else {
    // Format 1: Array format (Recommended & Cleanest)
    manifestContent = JSON.stringify(manifestItems, null, 2)
  }

  // Place manifest.json directly in the root of the archive
  zip.file('manifest.json', manifestContent)

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
export async function downloadBatchZip(zipBlob: Blob, zipName = 'quran_reels_pack.zip'): Promise<void> {
  await saveAndDownloadBlob(zipBlob, zipName, {
    title: 'Quran Reels Pack ZIP',
    dialogTitle: 'Save / Share Quran Reels Pack ZIP Archive',
  })
}
