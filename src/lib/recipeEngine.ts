import type { ReelConfig, Verse } from '../types'
import { defaultConfig } from '../renderer/reelRenderer'

export interface DecodedRecipe {
  version: number
  name?: string
  createdAt?: number
  surah?: number
  startAyat?: number
  ayahCount?: number
  reciterId?: string
  editionId?: string
  secondaryEditionId?: string
  config: ReelConfig
}

export interface SavedRecipe {
  id: string
  name: string
  code: string
  shortHash: string
  createdAt: number
  surah: number
  startAyat: number
  ayahCount: number
  reciterId: string
  editionId: string
  secondaryEditionId?: string
  config: ReelConfig
}

/**
 * Computes a short CRC-like 6-character hex hash from a string for quick recognition
 */
export function computeShortHash(str: string): string {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i)
  }
  const positive = (hash >>> 0).toString(36).toUpperCase()
  return `QRN-${positive.padStart(6, '0').slice(-6)}`
}

/**
 * Generates a human-readable title for a recipe
 */
export function generateRecipeSummary(recipe: {
  surah?: number
  startAyat?: number
  ayahCount?: number
  reciterId?: string
  config?: Partial<ReelConfig>
}): string {
  const surahNum = recipe.surah ?? recipe.config?.verses?.[0]?.surah ?? 2
  const startAyat = recipe.startAyat ?? recipe.config?.verses?.[0]?.ayat ?? 255
  const count = recipe.ayahCount ?? recipe.config?.verses?.length ?? 1
  const endAyat = startAyat + count - 1
  const rangeStr = count > 1 ? `${startAyat}–${endAyat}` : `${startAyat}`
  const effect = recipe.config?.effects?.type && recipe.config.effects.type !== 'none' ? ` · ${recipe.config.effects.type}` : ''
  const motion = recipe.config?.motion?.type ? ` · ${recipe.config.motion.type.replace('kenburns-', '')}` : ''

  return `Surah ${surahNum}:${rangeStr}${effect}${motion}`
}

/**
 * Serializes and encodes a creative state into a URL-safe Base64 recipe string
 */
export function encodeRecipe(
  config: ReelConfig,
  reciterId?: string,
  editionId?: string,
  name?: string,
): string {
  const primaryVerse = config.verses[0]
  const surah = primaryVerse?.surah ?? 2
  const startAyat = primaryVerse?.ayat ?? 255
  const ayahCount = config.verses.length || 1

  const payload: DecodedRecipe = {
    version: 1,
    name: name || generateRecipeSummary({ surah, startAyat, ayahCount, reciterId, config }),
    createdAt: Date.now(),
    surah,
    startAyat,
    ayahCount,
    reciterId: reciterId || primaryVerse?.reciterId,
    editionId: editionId || primaryVerse?.editionId,
    secondaryEditionId: config.text.secondaryEditionId,
    config: {
      ...config,
      // Store clean verses array (first verse info or full verses list)
      verses: config.verses.map((v) => ({
        surah: v.surah,
        ayat: v.ayat,
        surahName: v.surahName,
        surahArabicName: v.surahArabicName,
        arabic: v.arabic,
        translation: v.translation,
        secondaryTranslation: v.secondaryTranslation,
        editionId: v.editionId,
        editionName: v.editionName,
        audioUrl: v.audioUrl,
      })),
    },
  }

  const jsonStr = JSON.stringify(payload)
  // Unicode-safe Base64 encoding
  const base64 = btoa(
    encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16)),
    ),
  )

  // URL-safe replacement
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Decodes a recipe code, URL, or JSON string into a DecodedRecipe object
 */
export function decodeRecipe(input: string): DecodedRecipe | null {
  if (!input || typeof input !== 'string') return null

  let cleanStr = input.trim()

  // Handle full URL with ?recipe=... or #recipe=...
  if (cleanStr.includes('recipe=')) {
    try {
      const url = new URL(cleanStr, 'https://quran-reels.local')
      const param = url.searchParams.get('recipe') || url.hash.replace(/^#recipe=/, '')
      if (param) cleanStr = param
    } catch {
      const match = cleanStr.match(/recipe=([^&?#\s]+)/)
      if (match) cleanStr = match[1]
    }
  }

  // Handle direct JSON string
  if (cleanStr.startsWith('{') && cleanStr.endsWith('}')) {
    try {
      const parsed = JSON.parse(cleanStr)
      return validateAndNormalizeRecipe(parsed)
    } catch {
      // Continue to try base64
    }
  }

  // Handle Base64 URL-safe string
  try {
    let base64 = cleanStr.replace(/-/g, '+').replace(/_/g, '/')
    while (base64.length % 4 !== 0) {
      base64 += '='
    }

    const decodedUri = atob(base64)
      .split('')
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')

    const jsonStr = decodeURIComponent(decodedUri)
    const parsed = JSON.parse(jsonStr)
    return validateAndNormalizeRecipe(parsed)
  } catch (e) {
    console.warn('Failed to decode recipe code:', e)
    return null
  }
}

/**
 * Validates and ensures full structure with defaultConfig fallbacks
 */
function validateAndNormalizeRecipe(raw: any): DecodedRecipe | null {
  if (!raw || typeof raw !== 'object') return null

  const base = defaultConfig()
  const rawConfig = raw.config || raw

  const config: ReelConfig = {
    ...base,
    ...rawConfig,
    background: {
      ...base.background,
      ...rawConfig.background,
    },
    overlay: {
      ...base.overlay,
      ...rawConfig.overlay,
    },
    effects: {
      ...base.effects,
      ...rawConfig.effects,
    },
    border: {
      ...base.border,
      ...rawConfig.border,
    },
    waveform: {
      ...base.waveform,
      ...rawConfig.waveform,
    },
    text: {
      ...base.text,
      ...rawConfig.text,
    },
    countdown: {
      ...base.countdown,
      ...rawConfig.countdown,
    },
    footer: {
      ...base.footer,
      ...rawConfig.footer,
    },
    motion: {
      ...base.motion,
      ...rawConfig.motion,
    },
    aspectRatio: rawConfig.aspectRatio || base.aspectRatio,
    verses: Array.isArray(rawConfig.verses) && rawConfig.verses.length > 0 ? rawConfig.verses : base.verses,
  }

  const primaryVerse: Verse | undefined = config.verses[0]
  const surah = typeof raw.surah === 'number' ? raw.surah : primaryVerse?.surah ?? 2
  const startAyat = typeof raw.startAyat === 'number' ? raw.startAyat : primaryVerse?.ayat ?? 255
  const ayahCount = typeof raw.ayahCount === 'number' ? raw.ayahCount : config.verses.length || 1

  return {
    version: raw.version || 1,
    name: raw.name || generateRecipeSummary({ surah, startAyat, ayahCount, config }),
    createdAt: raw.createdAt || Date.now(),
    surah,
    startAyat,
    ayahCount,
    reciterId: raw.reciterId || primaryVerse?.reciterId,
    editionId: raw.editionId || primaryVerse?.editionId,
    secondaryEditionId: raw.secondaryEditionId || config.text.secondaryEditionId,
    config,
  }
}
