import type { ReelConfig } from '../types'
import { defaultConfig } from '../renderer/reelRenderer'

const CONFIG_STORAGE_KEY = 'quran_reels_config_v1'
const LOADER_STORAGE_KEY = 'quran_reels_loader_v1'

export interface SavedLoaderState {
  editionId: string
  reciterId: string
  lockCount: boolean
  lockReciter: boolean
  fixedCount: number
}

const USER_MEDIA_STORAGE_KEY = 'quran_reels_user_media_v1'

export interface UserUploadedMedia {
  id: string
  title: string
  url: string
  thumb?: string
  mediaType: 'image' | 'video'
  createdAt: number
  sizeLabel?: string
}

export function loadUserMediaLibrary(): UserUploadedMedia[] {
  if (typeof window === 'undefined' || !window.localStorage) return []
  try {
    const raw = window.localStorage.getItem(USER_MEDIA_STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as UserUploadedMedia[]
  } catch {
    return []
  }
}

export function saveUserMediaItem(item: UserUploadedMedia): UserUploadedMedia[] {
  const current = loadUserMediaLibrary()
  const updated = [item, ...current.filter((m) => m.id !== item.id)].slice(0, 30)
  try {
    window.localStorage.setItem(USER_MEDIA_STORAGE_KEY, JSON.stringify(updated))
  } catch (e) {
    console.warn('Failed to save user media item:', e)
  }
  return updated
}

export function deleteUserMediaItem(id: string): UserUploadedMedia[] {
  const current = loadUserMediaLibrary()
  const updated = current.filter((m) => m.id !== id)
  try {
    window.localStorage.setItem(USER_MEDIA_STORAGE_KEY, JSON.stringify(updated))
  } catch (e) {
    console.warn('Failed to delete user media item:', e)
  }
  return updated
}

/**
 * Safely load saved ReelConfig from localStorage merged with defaultConfig().
 */
export function loadSavedConfig(): ReelConfig {
  const base = defaultConfig()
  if (typeof window === 'undefined' || !window.localStorage) {
    return base
  }

  try {
    const raw = window.localStorage.getItem(CONFIG_STORAGE_KEY)
    if (!raw) return base

    const parsed = JSON.parse(raw) as Partial<ReelConfig>
    if (!parsed || typeof parsed !== 'object') return base

    return {
      ...base,
      ...parsed,
      background: {
        ...base.background,
        ...parsed.background,
      },
      overlay: {
        ...base.overlay,
        ...parsed.overlay,
      },
      effects: {
        ...base.effects,
        ...parsed.effects,
      },
      border: {
        ...base.border,
        ...parsed.border,
      },
      waveform: {
        ...base.waveform,
        ...parsed.waveform,
      },
      text: {
        ...base.text,
        ...parsed.text,
      },
      countdown: {
        ...base.countdown,
        ...parsed.countdown,
      },
      footer: {
        ...base.footer,
        ...parsed.footer,
      },
      motion: {
        ...base.motion,
        ...parsed.motion,
      },
      aspectRatio: parsed.aspectRatio ?? base.aspectRatio,
      // Do not overwrite verses with empty list if saved corrupt
      verses: Array.isArray(parsed.verses) && parsed.verses.length > 0 ? parsed.verses : base.verses,
    }
  } catch (e) {
    console.warn('Failed to load saved reel config from localStorage:', e)
    return base
  }
}

/**
 * Save current ReelConfig to localStorage.
 */
export function saveConfig(config: ReelConfig): void {
  if (typeof window === 'undefined' || !window.localStorage) return

  try {
    window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config))
  } catch (e) {
    console.warn('Failed to save reel config to localStorage:', e)
  }
}

/**
 * Safely load saved verse loader preferences (reciter, edition, locks, count).
 */
export function loadSavedLoaderState(): Partial<SavedLoaderState> {
  if (typeof window === 'undefined' || !window.localStorage) return {}

  try {
    const raw = window.localStorage.getItem(LOADER_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Partial<SavedLoaderState>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch (e) {
    console.warn('Failed to load saved loader state:', e)
    return {}
  }
}

/**
 * Save verse loader preferences to localStorage.
 */
export function saveLoaderState(state: SavedLoaderState): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.setItem(LOADER_STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    console.warn('Failed to save loader state to localStorage:', e)
  }
}

const RECITER_FAVORITES_KEY = 'quran_reels_reciter_favs_v1'
const CUSTOM_RECITERS_KEY = 'quran_reels_custom_reciters_v1'

export const DEFAULT_FAVORITE_RECITERS: string[] = [
  'ar.alafasy',
  'ar.husary',
  'ar.abdulbasitmurattal',
  'ar.minshawi',
  'ar.sudais',
  'ar.shuraim',
  'ar.dossari',
  'ar.maher',
  'ar.ajamy',
  'ar.ghamadi',
]

export function loadFavoriteReciterIds(): string[] {
  if (typeof window === 'undefined' || !window.localStorage) return DEFAULT_FAVORITE_RECITERS
  try {
    const raw = window.localStorage.getItem(RECITER_FAVORITES_KEY)
    if (!raw) return DEFAULT_FAVORITE_RECITERS
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_FAVORITE_RECITERS
  } catch {
    return DEFAULT_FAVORITE_RECITERS
  }
}

export function saveFavoriteReciterIds(ids: string[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.setItem(RECITER_FAVORITES_KEY, JSON.stringify(ids))
  } catch (e) {
    console.warn('Failed to save reciter favorites:', e)
  }
}

export function loadCustomReciters(): import('../types').Reciter[] {
  if (typeof window === 'undefined' || !window.localStorage) return []
  try {
    const raw = window.localStorage.getItem(CUSTOM_RECITERS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveCustomReciters(reciters: import('../types').Reciter[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.setItem(CUSTOM_RECITERS_KEY, JSON.stringify(reciters))
  } catch (e) {
    console.warn('Failed to save custom reciters:', e)
  }
}

// ── Recipe Vault & Generation History Storage ───────────────────────────────

const RECIPES_VAULT_KEY = 'quran_reels_recipes_vault_v1'
const GENERATION_HISTORY_KEY = 'quran_reels_history_v1'
const MAX_HISTORY_ITEMS = 25

export function getSavedRecipes(): import('./recipeEngine').SavedRecipe[] {
  if (typeof window === 'undefined' || !window.localStorage) return []
  try {
    const raw = window.localStorage.getItem(RECIPES_VAULT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (e) {
    console.warn('Failed to load saved recipes vault:', e)
    return []
  }
}

export function saveRecipeToVault(recipe: import('./recipeEngine').SavedRecipe): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    const existing = getSavedRecipes()
    const filtered = existing.filter((r) => r.id !== recipe.id && r.code !== recipe.code)
    const updated = [recipe, ...filtered]
    window.localStorage.setItem(RECIPES_VAULT_KEY, JSON.stringify(updated))
  } catch (e) {
    console.warn('Failed to save recipe to vault:', e)
  }
}

export function deleteSavedRecipe(id: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    const existing = getSavedRecipes()
    const updated = existing.filter((r) => r.id !== id)
    window.localStorage.setItem(RECIPES_VAULT_KEY, JSON.stringify(updated))
  } catch (e) {
    console.warn('Failed to delete saved recipe:', e)
  }
}

export function getGenerationHistory(): import('./recipeEngine').SavedRecipe[] {
  if (typeof window === 'undefined' || !window.localStorage) return []
  try {
    const raw = window.localStorage.getItem(GENERATION_HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (e) {
    console.warn('Failed to load generation history:', e)
    return []
  }
}

export function addGenerationToHistory(recipe: import('./recipeEngine').SavedRecipe): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    const existing = getGenerationHistory()
    // Avoid immediate duplicates with same short hash
    const filtered = existing.filter((r) => r.shortHash !== recipe.shortHash)
    const updated = [recipe, ...filtered].slice(0, MAX_HISTORY_ITEMS)
    window.localStorage.setItem(GENERATION_HISTORY_KEY, JSON.stringify(updated))
  } catch (e) {
    console.warn('Failed to log generation to history:', e)
  }
}

export function clearGenerationHistory(): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.removeItem(GENERATION_HISTORY_KEY)
  } catch (e) {
    console.warn('Failed to clear generation history:', e)
  }
}

