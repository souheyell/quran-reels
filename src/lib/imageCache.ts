const MAX_ENTRIES = 8

interface CacheEntry {
  url: string
  media: HTMLImageElement | HTMLVideoElement
  lastUsed: number
}

const cache: CacheEntry[] = []

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

export function getCachedMedia(url: string): HTMLImageElement | HTMLVideoElement | null {
  const entry = cache.find((e) => e.url === url)
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

export function loadImage(
  url: string,
  onLoad: (img: HTMLImageElement) => void,
  onError: () => void,
): void {
  const cached = getCachedImage(url)
  if (cached) {
    onLoad(cached)
    return
  }

  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => {
    evict()
    cache.push({ url, media: img, lastUsed: Date.now() })
    onLoad(img)
  }
  img.onerror = onError
  img.src = url
}

export function loadMedia(
  url: string,
  explicitType: 'image' | 'video' | undefined,
  onLoad: (media: HTMLImageElement | HTMLVideoElement) => void,
  onError: () => void,
): void {
  const cached = getCachedMedia(url)
  if (cached) {
    onLoad(cached)
    return
  }

  if (isVideoUrl(url, explicitType)) {
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.muted = true
    video.loop = true
    video.playsInline = true
    video.autoplay = true
    video.preload = 'auto'

    let loaded = false
    const handleLoaded = () => {
      if (!loaded) {
        loaded = true
        evict()
        cache.push({ url, media: video, lastUsed: Date.now() })
        video.play().catch(() => {})
        onLoad(video)
      }
    }

    video.onloadeddata = handleLoaded
    video.oncanplay = handleLoaded
    video.onerror = onError
    video.src = url
    video.load()
  } else {
    loadImage(url, onLoad, onError)
  }
}
