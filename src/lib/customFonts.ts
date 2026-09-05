import type { CustomFontItem } from '../types'
export type { CustomFontItem }

const CUSTOM_FONTS_STORAGE_KEY = 'quran_reels_custom_fonts_v1'

const loadedFontFaces = new Map<string, FontFace>()

/**
 * Safely retrieve saved custom font items from localStorage.
 */
export function getStoredCustomFonts(): CustomFontItem[] {
  if (typeof window === 'undefined' || !window.localStorage) return []
  try {
    const raw = window.localStorage.getItem(CUSTOM_FONTS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (e) {
    console.warn('Failed to load custom fonts from storage:', e)
    return []
  }
}

/**
 * Register a FontFace with the browser and add to document.fonts
 */
export async function registerFontFace(
  family: string,
  dataUrlOrBuffer: string | ArrayBuffer,
): Promise<FontFace | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined' || !document.fonts) {
    return null
  }

  try {
    let source: string | ArrayBuffer = dataUrlOrBuffer
    if (typeof dataUrlOrBuffer === 'string' && dataUrlOrBuffer.startsWith('data:')) {
      source = `url(${dataUrlOrBuffer})`
    } else if (typeof dataUrlOrBuffer === 'string') {
      source = `url(${dataUrlOrBuffer})`
    }

    const fontFace = new FontFace(family, source)
    const loaded = await fontFace.load()
    document.fonts.add(loaded)
    loadedFontFaces.set(family, loaded)
    return loaded
  } catch (err) {
    console.warn(`Failed to register FontFace "${family}":`, err)
    return null
  }
}

/**
 * Initialize and load all previously saved custom fonts into document.fonts
 */
export async function loadSavedCustomFonts(): Promise<CustomFontItem[]> {
  const items = getStoredCustomFonts()
  for (const item of items) {
    if (item.dataUrl && item.family) {
      // Extract the bare name from the stored CSS family value
      // e.g. `"CustomArabic_Foo_ab12", serif` → `CustomArabic_Foo_ab12`
      const bareName = item.family.replace(/^"([^"]+)".*$/, '$1')
      await registerFontFace(bareName, item.dataUrl)
    }
  }
  return items
}

/**
 * Convert a File into base64 DataURI
 */
function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('FileReader did not return a string'))
      }
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/**
 * Clean and sanitize a font name for CSS font-family
 */
/**
 * Returns a bare CSS font-family name (no quotes, no fallbacks).
 * Use this as the `family` argument to `new FontFace(...)` and wrap
 * with quotes + fallback only when building a CSS font-family string.
 */
function sanitizeFamilyName(fileName: string, target: 'arabic' | 'translation'): string {
  const cleanBase = fileName
    .replace(/\.(ttf|otf|woff2|woff)$/i, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 24)
  const prefix = target === 'arabic' ? 'CustomArabic' : 'CustomLatin'
  const unique = Math.random().toString(36).slice(2, 6)
  // Return ONLY the bare name — no CSS quotes or fallbacks here.
  return `${prefix}_${cleanBase}_${unique}`
}

/**
 * Read uploaded font file (.ttf / .otf / .woff2 / .woff), register FontFace, and persist.
 */
export async function registerCustomFontFile(
  file: File,
  target: 'arabic' | 'translation' = 'arabic',
): Promise<CustomFontItem> {
  const dataUrl = await fileToDataUri(file)
  // bareName is the raw identifier used with FontFace — no quotes or fallbacks.
  const bareName = sanitizeFamilyName(file.name, target)
  // cssFamilyValue is what gets stored and used in ctx.font / CSS font-family.
  const fallback = target === 'arabic' ? 'serif' : 'sans-serif'
  const cssFamilyValue = `"${bareName}", ${fallback}`
  const cleanTitle = file.name.replace(/\.(ttf|otf|woff2|woff)$/i, '').trim()

  // Register with the bare name so the browser can match it correctly.
  await registerFontFace(bareName, dataUrl)

  const newItem: CustomFontItem = {
    id: `font-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: cleanTitle || file.name,
    family: cssFamilyValue,
    dataUrl,
    target,
    createdAt: Date.now(),
  }

  const current = getStoredCustomFonts()
  const updated = [newItem, ...current.filter((f) => f.name !== newItem.name)].slice(0, 16)

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(CUSTOM_FONTS_STORAGE_KEY, JSON.stringify(updated))
    } catch (e) {
      console.warn('Failed to save font item to localStorage (exceeded quota?):', e)
    }
  }

  return newItem
}

/**
 * Delete a custom font from storage and document.fonts
 */
export function deleteCustomFont(id: string): CustomFontItem[] {
  const current = getStoredCustomFonts()
  const targetFont = current.find((f) => f.id === id)

  if (targetFont && typeof document !== 'undefined' && document.fonts) {
    const loaded = loadedFontFaces.get(targetFont.family)
    if (loaded) {
      try {
        document.fonts.delete(loaded)
      } catch {
        // ignore
      }
      loadedFontFaces.delete(targetFont.family)
    }
  }

  const updated = current.filter((f) => f.id !== id)
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(CUSTOM_FONTS_STORAGE_KEY, JSON.stringify(updated))
    } catch (e) {
      console.warn('Failed to update fonts storage:', e)
    }
  }

  return updated
}
