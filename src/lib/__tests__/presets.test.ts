import { describe, expect, it } from 'vitest'
import { AESTHETIC_PRESETS, applyPresetToConfig } from '../presets'
import { defaultConfig } from '../../renderer/reelRenderer'

describe('presets', () => {
  it('defines 6 unique aesthetic presets', () => {
    expect(AESTHETIC_PRESETS.length).toBe(6)
    const ids = AESTHETIC_PRESETS.map((p) => p.id)
    expect(new Set(ids).size).toBe(6)
  })

  it('applies Golden Medina preset accurately', () => {
    const base = defaultConfig()
    const goldenPreset = AESTHETIC_PRESETS.find((p) => p.id === 'golden-medina')!
    const updated = applyPresetToConfig(base, goldenPreset)

    expect(updated.text.textColor).toBe('#ffd700')
    expect(updated.text.karaokeHighlight).toBe(true)
    expect(updated.effects.type).toBe('fireflies')
    expect(updated.motion.type).toBe('kenburns-zoom')
  })

  it('applies Midnight Reflection preset accurately', () => {
    const base = defaultConfig()
    const midnightPreset = AESTHETIC_PRESETS.find((p) => p.id === 'midnight-reflection')!
    const updated = applyPresetToConfig(base, midnightPreset)

    expect(updated.text.textColor).toBe('#e0f7fa')
    expect(updated.effects.type).toBe('slow-snow')
    expect(updated.motion.type).toBe('kenburns-pan')
  })
})
