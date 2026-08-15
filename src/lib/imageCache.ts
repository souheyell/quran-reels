const MAX_ENTRIES = 5

interface CacheEntry {
  url: string
  image: HTMLImageElement
  lastUsed: number
}

const cache: CacheEntry[] = []

function evict(): void {
  while (cache.length >= MAX_ENTRIES) {
    let oldest = 0
    for (let i = 1; i < cache.length; i++) {
      if (cache[i].lastUsed < cache[oldest].lastUsed) oldest = i
    }
    cache.splice(oldest, 1)
  }
}

export function getCachedImage(url: string): HTMLImageElement | null {
  const entry = cache.find((e) => e.url === url)
  if (entry) {
    entry.lastUsed = Date.now()
    return entry.image
  }
  return null
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
    cache.push({ url, image: img, lastUsed: Date.now() })
    onLoad(img)
  }
  img.onerror = onError
  img.src = url
}
