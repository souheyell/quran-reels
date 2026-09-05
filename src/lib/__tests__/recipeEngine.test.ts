import { describe, it, expect } from 'vitest'
import {
  encodeRecipe,
  decodeRecipe,
  computeShortHash,
  generateRecipeSummary,
} from '../recipeEngine'
import { defaultConfig } from '../../renderer/reelRenderer'

describe('recipeEngine', () => {
  it('computes consistent short hashes', () => {
    const hash1 = computeShortHash('sample-recipe-code-123')
    const hash2 = computeShortHash('sample-recipe-code-123')
    const hash3 = computeShortHash('different-code')

    expect(hash1).toBe(hash2)
    expect(hash1.startsWith('QRN-')).toBe(true)
    expect(hash1).not.toBe(hash3)
  })

  it('generates friendly recipe summary descriptions', () => {
    const summary = generateRecipeSummary({
      surah: 67,
      startAyat: 1,
      ayahCount: 5,
      config: {
        effects: { type: 'fireflies', intensity: 0.7, speed: 1.0 },
        motion: { type: 'kenburns-zoom', duration: 15 },
      },
    })

    expect(summary).toBe('Surah 67:1–5 · fireflies · zoom')
  })

  it('encodes and decodes full ReelConfig round-trip', () => {
    const base = defaultConfig()
    base.text.arabicSize = 88
    base.text.textColor = '#ffd700'
    base.countdown = {
      enabled: true,
      style: 'glowing-ring',
      position: 'top-left',
      color: '#6366f1',
      showTotalTime: true,
      opacity: 0.95,
    }

    const code = encodeRecipe(base, 'ar.alafasy', 'en.sahih', 'Custom Test Recipe')
    expect(typeof code).toBe('string')
    expect(code.length).toBeGreaterThan(20)

    const decoded = decodeRecipe(code)
    expect(decoded).not.toBeNull()
    expect(decoded?.name).toBe('Custom Test Recipe')
    expect(decoded?.reciterId).toBe('ar.alafasy')
    expect(decoded?.editionId).toBe('en.sahih')
    expect(decoded?.config.text.arabicSize).toBe(88)
    expect(decoded?.config.text.textColor).toBe('#ffd700')
    expect(decoded?.config.countdown.enabled).toBe(true)
    expect(decoded?.config.countdown.style).toBe('glowing-ring')
  })

  it('decodes from a full URL containing ?recipe=...', () => {
    const base = defaultConfig()
    const code = encodeRecipe(base, 'ar.husary', 'fr.hamidullah')
    const fullUrl = `https://quranreels.app/studio?recipe=${code}`

    const decoded = decodeRecipe(fullUrl)
    expect(decoded).not.toBeNull()
    expect(decoded?.reciterId).toBe('ar.husary')
    expect(decoded?.editionId).toBe('fr.hamidullah')
  })

  it('decodes from a raw JSON object string', () => {
    const jsonStr = JSON.stringify({
      surah: 36,
      startAyat: 1,
      ayahCount: 4,
      reciterId: 'ar.minshawi',
      config: {
        overlay: { color: '#000000', opacity: 0.5 },
      },
    })

    const decoded = decodeRecipe(jsonStr)
    expect(decoded).not.toBeNull()
    expect(decoded?.surah).toBe(36)
    expect(decoded?.reciterId).toBe('ar.minshawi')
    expect(decoded?.config.overlay.opacity).toBe(0.5)
  })

  it('handles invalid or corrupted recipe codes safely without throwing', () => {
    expect(decodeRecipe('')).toBeNull()
    expect(decodeRecipe('not-a-valid-base64-or-json@@@')).toBeNull()
    expect(decodeRecipe('{ invalid json }')).toBeNull()
  })
})
