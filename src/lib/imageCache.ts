const MAX_ENTRIES = 16

export type MediaLoadStatus = 'idle' | 'loading' | 'ready' | 'error'

interface CacheEntry {
  url: string
  media: HTMLImageElement | HTMLVideoElement
  lastUsed: number
  status: MediaLoadStatus
}

const cache: CacheEntry[] = []
const statusListeners = new Set<(url: string, status: MediaLoadStatus) => void>()

export function subscribeMediaStatus(listener: (url: string, status: MediaLoadStatus) => void): () => void {
  statusListeners.add(listener)
  return () => statusListeners.delete(listener)
}

function notifyStatus(url: string, status: MediaLoadStatus) {
  for (const listener of statusListeners) {
    try {
      listener(url, status)
    } catch {
      // ignore
    }
  }
}

function evict(): void {
  while (cache.length >= MAX_ENTRIES) {
    let oldest = 0
    for (let i = 1; i < cache.length; i++) {
      if (cache[i].lastUsed < cache[oldest].lastUsed) oldest = i
    }
    const removed = cache.splice(oldest, 1)[0]
    if (removed && removed.media instanceof HTMLVideoElement) {
      try {
        removed.media.pause()
        removed.media.src = ''
        removed.media.load()
      } catch {
        // ignore
      }
    }
  }
}

export function isVideoUrl(url: string, explicitType?: 'image' | 'video'): boolean {
  if (explicitType === 'video') return true
  if (explicitType === 'image') return false
  return /\.(mp4|webm|mov|m4v)($|\?)/i.test(url)
}

export function getMediaStatus(url: string): MediaLoadStatus {
  const entry = cache.find((e) => e.url === url)
  return entry ? entry.status : 'idle'
}

export function getCachedMedia(url: string): HTMLImageElement | HTMLVideoElement | null {
  const entry = cache.find((e) => e.url === url && e.status === 'ready')
  if (entry) {
    entry.lastUsed = Date.now()
    return entry.media
  }
  return null
}

export function getCachedImage(url: string): HTMLImageElement | null {
  const media = getCachedMedia(url)
  return media instanceof HTMLImageElement ? media : null
}

export function cacheMediaItem(
  url: string,
  media: HTMLImageElement | HTMLVideoElement,
): void {
  evict()
  const existingIdx = cache.findIndex((c) => c.url === url)
  if (existingIdx >= 0) {
    cache[existingIdx]!.media = media
    cache[existingIdx]!.lastUsed = Date.now()
    cache[existingIdx]!.status = 'ready'
  } else {
    cache.push({ url, media, lastUsed: Date.now(), status: 'ready' })
  }
  notifyStatus(url, 'ready')
}

export function loadImage(
  url: string,
  onLoad: (img: HTMLImageElement) => void,
  onError: (err?: Error) => void,
  isRetry = false,
): void {
  const cached = getCachedImage(url)
  if (cached) {
    onLoad(cached)
    return
  }

  const isLocal = url.startsWith('blob:') || url.startsWith('data:')
  notifyStatus(url, 'loading')
  const img = new Image()
  if (!isRetry && !isLocal) {
    img.crossOrigin = 'anonymous'
  }

  let finished = false
  const timer = setTimeout(() => {
    if (!finished) {
      finished = true
      if (!isRetry && !isLocal) {
        // Retry once without CORS header
        loadImage(url, onLoad, onError, true)
      } else {
        notifyStatus(url, 'error')
        onError(new Error('Image download timed out'))
      }
    }
  }, isLocal ? 15000 : 25000)

  img.onload = () => {
    if (finished) return
    finished = true
    clearTimeout(timer)
    evict()
    cache.push({ url, media: img, lastUsed: Date.now(), status: 'ready' })
    notifyStatus(url, 'ready')
    onLoad(img)
  }

  img.onerror = () => {
    if (finished) return
    finished = true
    clearTimeout(timer)
    if (!isRetry && !isLocal) {
      // Retry once without crossOrigin attribute
      loadImage(url, onLoad, onError, true)
    } else {
      notifyStatus(url, 'error')
      onError(new Error('Failed to load image'))
    }
  }

  img.src = url
}

export function loadMedia(
  url: string,
  explicitType: 'image' | 'video' | undefined,
  onLoad: (media: HTMLImageElement | HTMLVideoElement) => void,
  onError: (err?: Error) => void,
  isRetry = false,
): void {
  const cached = getCachedMedia(url)
  if (cached) {
    onLoad(cached)
    return
  }

  const isLocal = url.startsWith('blob:') || url.startsWith('data:')

  if (isVideoUrl(url, explicitType)) {
    notifyStatus(url, 'loading')
    const video = document.createElement('video')
    if (!isRetry && !isLocal) {
      video.crossOrigin = 'anonymous'
    }
    video.muted = true
    video.loop = true
    video.playsInline = true
    video.autoplay = true
    video.preload = 'auto'

    let finished = false
    const timer = setTimeout(() => {
      if (!finished) {
        finished = true
        if (!isRetry && !isLocal) {
          loadMedia(url, explicitType, onLoad, onError, true)
        } else {
          notifyStatus(url, 'error')
          onError(new Error('Video stream timed out'))
        }
      }
    }, isLocal ? 15000 : 25000)

    const handleLoaded = () => {
      if (!finished) {
        finished = true
        clearTimeout(timer)
        evict()
        cache.push({ url, media: video, lastUsed: Date.now(), status: 'ready' })
        notifyStatus(url, 'ready')
        video.play().catch(() => {})
        onLoad(video)
      }
    }

    video.onloadeddata = handleLoaded
    video.oncanplay = handleLoaded
    video.onerror = () => {
      if (!finished) {
        finished = true
        clearTimeout(timer)
        if (!isRetry) {
          // Retry without crossOrigin
          loadMedia(url, explicitType, onLoad, onError, true)
        } else {
          notifyStatus(url, 'error')
          onError(new Error('Video playback error or blocked by CORS'))
        }
      }
    }

    video.src = url
    video.load()
  } else {
    loadImage(url, onLoad, onError, isRetry)
  }
}

/**
 * Manually force re-download / retry for a given URL
 */
export function retryLoadMedia(
  url: string,
  explicitType: 'image' | 'video' | undefined,
  onLoad: (media: HTMLImageElement | HTMLVideoElement) => void,
  onError: (err?: Error) => void,
): void {
  const idx = cache.findIndex((e) => e.url === url)
  if (idx >= 0) {
    const removed = cache.splice(idx, 1)[0]
    if (removed && removed.media instanceof HTMLVideoElement) {
      try {
        removed.media.pause()
        removed.media.src = ''
      } catch {}
    }
  }
  loadMedia(url, explicitType, onLoad, onError)
}
