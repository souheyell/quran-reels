import { describe, expect, it } from 'vitest'
import { AESTHETIC_PRESETS, applyPresetToConfig } from '../presets'
import { defaultConfig } from '../../renderer/reelRenderer'

describe('presets', () => {
  it('defines 7 unique aesthetic presets', () => {
    expect(AESTHETIC_PRESETS.length).toBe(7)
    const ids = AESTHETIC_PRESETS.map((p) => p.id)
    expect(new Set(ids).size).toBe(7)
  })

  it('applies Holy Quran Paper preset accurately with zero effects', () => {
    const base = defaultConfig()
    const paperPreset = AESTHETIC_PRESETS.find((p) => p.id === 'holy-quran-paper')!
    const updated = applyPresetToConfig(base, paperPreset)

    expect(updated.text.layoutMode).toBe('holy-quran-paper')
    expect(updated.text.mushafTheme).toBe('madani-cream')
    expect(updated.effects.type).toBe('none')
    expect(updated.border.type).toBe('none')
    expect(updated.waveform.type).toBe('none')
    expect(updated.motion.type).toBe('static')
    expect(updated.text.showGlow).toBe(false)
  })

  it('applies Golden Medina preset accurately', () => {
    const base = defaultConfig()
    const goldenPreset = AESTHETIC_PRESETS.find((p) => p.id === 'golden-medina')!
    const updated = applyPresetToConfig(base, goldenPreset)

    expect(updated.text.textColor).toBe('#ffd700')
    expect(updated.text.karaokeHighlight).toBe(true)
    expect(updated.effects.type).toBe('fireflies')
    expect(updated.border.type).toBe('gilded-corners')
    expect(updated.waveform.type).toBe('symmetric-bars')
    expect(updated.motion.type).toBe('kenburns-zoom')
  })

  it('applies Midnight Reflection preset accurately', () => {
    const base = defaultConfig()
    const midnightPreset = AESTHETIC_PRESETS.find((p) => p.id === 'midnight-reflection')!
    const updated = applyPresetToConfig(base, midnightPreset)

    expect(updated.text.textColor).toBe('#e0f7fa')
    expect(updated.effects.type).toBe('slow-snow')
    expect(updated.border.type).toBe('vignette-feather')
    expect(updated.waveform.type).toBe('smooth-wave')
    expect(updated.motion.type).toBe('kenburns-pan')
  })
})
