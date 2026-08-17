import type { Verse } from '../types'

const CACHE_NAME = 'quran-audio-cache-v1'
const blobUrlCache = new Map<string, string>()

export interface AudioProgressInfo {
  url: string
  percent: number
  loadedBytes: number
  totalBytes: number
  ayahIndex: number
  totalAyahs: number
  reciterName?: string
}

type ProgressListener = (info: AudioProgressInfo) => void
const progressListeners = new Set<ProgressListener>()

export function subscribeAudioProgress(listener: ProgressListener): () => void {
  progressListeners.add(listener)
  return () => {
    progressListeners.delete(listener)
  }
}

function notifyProgress(info: AudioProgressInfo) {
  progressListeners.forEach((l) => {
    try {
      l(info)
    } catch {
      // ignore
    }
  })
}

/**
 * Fetch an audio file from network or CacheStorage with real-time download progress tracking.
 * Returns a fast local blob: URL.
 */
export async function fetchAndCacheAudio(
  url: string,
  ayahIndex = 0,
  totalAyahs = 1,
  reciterName?: string,
  onProgress?: (percent: number, loaded: number, total: number) => void,
): Promise<string> {
  if (!url) return ''

  // 1. Check in-memory blob URL cache (Instant 0ms)
  if (blobUrlCache.has(url)) {
    const cachedBlobUrl = blobUrlCache.get(url)!
    onProgress?.(100, 1, 1)
    notifyProgress({
      url,
      percent: 100,
      loadedBytes: 1,
      totalBytes: 1,
      ayahIndex,
      totalAyahs,
      reciterName,
    })
    return cachedBlobUrl
  }

  // 2. Check browser CacheStorage
  try {
    if (typeof caches !== 'undefined') {
      const cache = await caches.open(CACHE_NAME)
      const matched = await cache.match(url)
      if (matched) {
        const blob = await matched.blob()
        const blobUrl = URL.createObjectURL(blob)
        blobUrlCache.set(url, blobUrl)
        onProgress?.(100, blob.size, blob.size)
        notifyProgress({
          url,
          percent: 100,
          loadedBytes: blob.size,
          totalBytes: blob.size,
          ayahIndex,
          totalAyahs,
          reciterName,
        })
        return blobUrl
      }
    }
  } catch (e) {
    console.warn('CacheStorage read failed:', e)
  }

  // 3. Download via stream to track byte-by-byte progress
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8000)

  try {
    notifyProgress({
      url,
      percent: 5,
      loadedBytes: 0,
      totalBytes: 0,
      ayahIndex,
      totalAyahs,
      reciterName,
    })

    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) throw new Error(`HTTP error ${response.status} fetching ${url}`)

    const contentLength = response.headers.get('content-length')
    const totalBytes = contentLength ? parseInt(contentLength, 10) : 0
    let loadedBytes = 0

    const reader = response.body?.getReader()
    const chunks: Uint8Array[] = []

    if (reader) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) {
          chunks.push(value)
          loadedBytes += value.length
          const percent = totalBytes > 0 ? Math.min(99, Math.round((loadedBytes / totalBytes) * 100)) : Math.min(95, Math.round((loadedBytes / 250000) * 100))
          onProgress?.(percent, loadedBytes, totalBytes)
          notifyProgress({
            url,
            percent,
            loadedBytes,
            totalBytes: totalBytes || loadedBytes,
            ayahIndex,
            totalAyahs,
            reciterName,
          })
        }
      }
    } else {
      const arrayBuffer = await response.arrayBuffer()
      chunks.push(new Uint8Array(arrayBuffer))
      loadedBytes = arrayBuffer.byteLength
    }

    const audioBlob = new Blob(chunks as BlobPart[], { type: 'audio/mp3' })
    const blobUrl = URL.createObjectURL(audioBlob)
    blobUrlCache.set(url, blobUrl)

    // Store in CacheStorage for future runs
    if (typeof caches !== 'undefined') {
      try {
        const cache = await caches.open(CACHE_NAME)
        await cache.put(url, new Response(audioBlob))
      } catch (e) {
        console.warn('CacheStorage put failed:', e)
      }
    }

    onProgress?.(100, loadedBytes, loadedBytes)
    notifyProgress({
      url,
      percent: 100,
      loadedBytes,
      totalBytes: loadedBytes,
      ayahIndex,
      totalAyahs,
      reciterName,
    })

    return blobUrl
  } catch (err) {
    console.warn(`Failed to stream-download audio (${url}), falling back to direct URL:`, err)
    // Fail-safe: Always notify 100% progress so UI never stays stuck on loading!
    onProgress?.(100, 0, 0)
    notifyProgress({
      url,
      percent: 100,
      loadedBytes: 0,
      totalBytes: 0,
      ayahIndex,
      totalAyahs,
      reciterName,
    })
    return url
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Preload and cache audio files for a range of verses, streaming real-time progress.
 * Returns the verses updated with local blob URLs.
 */
export async function preloadAndCacheVerses(
  verses: Verse[],
  onProgress?: (overallPercent: number, currentAyah: number, totalAyahs: number) => void,
): Promise<Verse[]> {
  if (!verses || verses.length === 0) return verses

  const totalAyahs = verses.length
  const updatedVerses = [...verses]

  for (let i = 0; i < totalAyahs; i++) {
    const v = updatedVerses[i]
    if (!v || !v.audioUrl) continue

    const basePercent = (i / totalAyahs) * 100
    const ayahWeight = 100 / totalAyahs

    try {
      const blobUrl = await fetchAndCacheAudio(
        v.audioUrl,
        i + 1,
        totalAyahs,
        v.reciterName,
        (ayahPercent) => {
          const overall = Math.min(100, Math.round(basePercent + (ayahPercent * ayahWeight) / 100))
          onProgress?.(overall, i + 1, totalAyahs)
        },
      )
      if (blobUrl) {
        updatedVerses[i] = { ...v, audioUrl: blobUrl }
      }
    } catch (err) {
      console.warn(`Audio preload error for Ayah ${i + 1}:`, err)
    }
  }

  onProgress?.(100, totalAyahs, totalAyahs)
  return updatedVerses
}
