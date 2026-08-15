/**
 * Generate a high-fidelity synthetic impulse response buffer for Grand Mosque / Sanctuary acoustic reverberation.
 */
export function createMosqueImpulseResponse(
  ctx: BaseAudioContext,
  duration = 2.4,
  decay = 3.0,
): AudioBuffer {
  const sampleRate = ctx.sampleRate
  const length = Math.floor(sampleRate * duration)
  const impulse = ctx.createBuffer(2, length, sampleRate)

  const left = impulse.getChannelData(0)
  const right = impulse.getChannelData(1)

  for (let i = 0; i < length; i++) {
    const n = i / length
    // Exponential decay curve
    const envelope = Math.exp(-n * decay)

    // Early reflections boost in first 60ms
    const earlyBoost = i < sampleRate * 0.06 ? 1.4 : 1.0

    // Low-pass filtered noise simulation
    const whiteNoiseL = (Math.random() * 2 - 1)
    const whiteNoiseR = (Math.random() * 2 - 1)

    left[i] = whiteNoiseL * envelope * earlyBoost
    right[i] = whiteNoiseR * envelope * earlyBoost
  }

  return impulse
}

/**
 * Apply Mosque Reverb processing chain to an AudioNode source.
 */
export function attachMosqueReverb(
  ctx: AudioContext,
  source: AudioNode,
  destination: AudioNode,
  intensity = 0.45,
): { convolver: ConvolverNode; wetGain: GainNode; dryGain: GainNode } {
  if (ctx.state === 'suspended') {
    void ctx.resume()
  }

  const impulseBuffer = createMosqueImpulseResponse(ctx)
  const convolver = ctx.createConvolver()
  convolver.normalize = true
  convolver.buffer = impulseBuffer

  const wetGain = ctx.createGain()
  const dryGain = ctx.createGain()

  // Intensity mixes dry vs wet
  wetGain.gain.value = Math.max(0, Math.min(1, intensity))
  dryGain.gain.value = 1.0

  source.connect(dryGain)
  dryGain.connect(destination)

  source.connect(convolver)
  convolver.connect(wetGain)
  wetGain.connect(destination)

  return { convolver, wetGain, dryGain }
}
