import { describe, expect, it } from 'vitest'
import { createMosqueImpulseResponse } from '../reverb'

describe('reverb', () => {
  it('creates stereo synthetic impulse response buffer', () => {
    const mockCtx = {
      sampleRate: 44100,
      createBuffer: (_channels: number, length: number, sampleRate: number) => ({
        numberOfChannels: 2,
        length,
        sampleRate,
        duration: length / sampleRate,
        getChannelData: (_ch: number) => new Float32Array(length),
      }),
    } as unknown as BaseAudioContext

    const buffer = createMosqueImpulseResponse(mockCtx, 1.5, 2.0)
    expect(buffer).toBeDefined()
    expect(buffer.numberOfChannels).toBe(2)
  })
})
