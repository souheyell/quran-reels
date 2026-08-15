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
      audio: {
        ...base.audio,
        ...parsed.audio,
      },
      text: {
        ...base.text,
        ...parsed.text,
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
