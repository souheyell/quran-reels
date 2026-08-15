const calligraphyCache = new Map<string, HTMLImageElement>()
const inFlightRequests = new Map<string, Promise<HTMLImageElement | null>>()

const PRIMARY_CDN = 'https://cdn.jsdelivr.net/gh/gyenabubakar/surah-name-glyphs@main/svg'
const FALLBACK_CDN = 'https://raw.githubusercontent.com/gyenabubakar/surah-name-glyphs/main/svg'
const BASMALAH_SVG_URL = 'https://upload.wikimedia.org/wikipedia/commons/2/27/Basmala.svg'

/**
 * Fetch and prepare the SVG vector calligraphy for a Surah number in Thuluth script.
 */
export async function loadSurahCalligraphy(
  surahNumber: number,
  color = '#ffffff',
): Promise<HTMLImageElement | null> {
  const safeSurah = Math.min(Math.max(Number(surahNumber) || 1, 1), 114)
  const cacheKey = `surah_${safeSurah}_${color}`

  if (calligraphyCache.has(cacheKey)) {
    return calligraphyCache.get(cacheKey)!
  }

  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey)!
  }

  const promise = (async (): Promise<HTMLImageElement | null> => {
    try {
      let svgText = ''
      const urls = [`${PRIMARY_CDN}/${safeSurah}.svg`, `${FALLBACK_CDN}/${safeSurah}.svg`]

      for (const url of urls) {
        try {
          const res = await fetch(url)
          if (res.ok) {
            svgText = await res.text()
            break
          }
        } catch {
          // Try next CDN
        }
      }

      if (!svgText || !svgText.includes('<svg')) {
        return null
      }

      // Inject fill color into SVG
      const normalizedColor = color.trim()
      let coloredSvg = svgText
      if (coloredSvg.includes('fill=')) {
        coloredSvg = coloredSvg.replace(/fill="[^"]*"/g, `fill="${normalizedColor}"`)
      } else {
        coloredSvg = coloredSvg.replace('<svg ', `<svg fill="${normalizedColor}" `)
      }

      if (!coloredSvg.includes('xmlns=')) {
        coloredSvg = coloredSvg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')
      }

      return new Promise<HTMLImageElement | null>((resolve) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          calligraphyCache.set(cacheKey, img)
          inFlightRequests.delete(cacheKey)
          resolve(img)
        }
        img.onerror = () => {
          inFlightRequests.delete(cacheKey)
          resolve(null)
        }
        img.src = `data:image/svg+xml;utf8,${encodeURIComponent(coloredSvg)}`
      })
    } catch {
      inFlightRequests.delete(cacheKey)
      return null
    }
  })()

  inFlightRequests.set(cacheKey, promise)
  return promise
}

/**
 * Fetch and prepare the authentic classical Thuluth Basmalah vector calligraphy emblem.
 */
export async function loadBasmalahCalligraphy(
  color = '#ffffff',
): Promise<HTMLImageElement | null> {
  const cacheKey = `basmalah_${color}`

  if (calligraphyCache.has(cacheKey)) {
    return calligraphyCache.get(cacheKey)!
  }

  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey)!
  }

  const promise = (async (): Promise<HTMLImageElement | null> => {
    try {
      const res = await fetch(BASMALAH_SVG_URL, {
        headers: { 'User-Agent': 'QuranReelsApp/1.0' },
      })
      if (!res.ok) return null

      const svgText = await res.text()
      if (!svgText || !svgText.includes('<svg')) return null

      const normalizedColor = color.trim()
      let coloredSvg = svgText.replace(/style="fill:[^"]*"/g, `style="fill:${normalizedColor}"`)
      if (!coloredSvg.includes(`style="fill:${normalizedColor}"`)) {
        coloredSvg = coloredSvg.replace('<svg ', `<svg fill="${normalizedColor}" `)
      }

      return new Promise<HTMLImageElement | null>((resolve) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          calligraphyCache.set(cacheKey, img)
          inFlightRequests.delete(cacheKey)
          resolve(img)
        }
        img.onerror = () => {
          inFlightRequests.delete(cacheKey)
          resolve(null)
        }
        img.src = `data:image/svg+xml;utf8,${encodeURIComponent(coloredSvg)}`
      })
    } catch {
      inFlightRequests.delete(cacheKey)
      return null
    }
  })()

  inFlightRequests.set(cacheKey, promise)
  return promise
}

/**
 * Synchronously get already cached Surah calligraphy image.
 */
export function getSurahCalligraphyImage(
  surahNumber: number,
  color = '#ffffff',
): HTMLImageElement | null {
  const safeSurah = Math.min(Math.max(Number(surahNumber) || 1, 1), 114)
  const cacheKey = `surah_${safeSurah}_${color}`
  const cached = calligraphyCache.get(cacheKey)
  if (!cached) {
    void loadSurahCalligraphy(safeSurah, color)
    return null
  }
  return cached
}

/**
 * Synchronously get already cached Basmalah Thuluth calligraphy image.
 */
export function getBasmalahCalligraphyImage(
  color = '#ffffff',
): HTMLImageElement | null {
  const cacheKey = `basmalah_${color}`
  const cached = calligraphyCache.get(cacheKey)
  if (!cached) {
    void loadBasmalahCalligraphy(color)
    return null
  }
  return cached
}
