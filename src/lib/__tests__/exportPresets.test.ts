import { describe, it, expect } from 'vitest'
import { EXPORT_PRESETS_CONFIG } from '../../types'

describe('Export Presets Configuration', () => {
  it('includes instagram-fb as the recommended preset with 30fps and 10Mbps', () => {
    const preset = EXPORT_PRESETS_CONFIG['instagram-fb']
    expect(preset).toBeDefined()
    expect(preset.fps).toBe(30)
    expect(preset.bitrate).toBe(10_000_000)
    expect(preset.audioBitrate).toBe(320_000)
    expect(preset.scale).toBe(1)
  })

  it('includes smooth-60fps with 60fps and 14Mbps', () => {
    const preset = EXPORT_PRESETS_CONFIG['smooth-60fps']
    expect(preset).toBeDefined()
    expect(preset.fps).toBe(60)
    expect(preset.bitrate).toBe(14_000_000)
    expect(preset.audioBitrate).toBe(320_000)
  })

  it('includes 4k-master with 2x scale and 30Mbps', () => {
    const preset = EXPORT_PRESETS_CONFIG['4k-master']
    expect(preset).toBeDefined()
    expect(preset.scale).toBe(2)
    expect(preset.bitrate).toBe(30_000_000)
  })

  it('includes compact with 6Mbps and 192k audio', () => {
    const preset = EXPORT_PRESETS_CONFIG['compact']
    expect(preset).toBeDefined()
    expect(preset.bitrate).toBe(6_000_000)
    expect(preset.audioBitrate).toBe(192_000)
  })
})
