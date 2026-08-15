import { createMosqueImpulseResponse } from './reverb'

class ReverbAudioEngine {
  private ctx: AudioContext | null = null
  private sourceNode: AudioBufferSourceNode | null = null
  private convolverNode: ConvolverNode | null = null
  private wetGain: GainNode | null = null
  private dryGain: GainNode | null = null
  private masterGain: GainNode | null = null

  private bufferCache = new Map<string, AudioBuffer>()
  private startTime = 0
  private startOffset = 0
  private isPlaying = false
  private onEndedCallback: (() => void) | null = null

  private initContext(): AudioContext | null {
    if (this.ctx) return this.ctx
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return null

    const ctx = new AudioCtx()
    const convolver = ctx.createConvolver()
    convolver.normalize = true
    convolver.buffer = createMosqueImpulseResponse(ctx)

    const wetGain = ctx.createGain()
    const dryGain = ctx.createGain()
    const masterGain = ctx.createGain()

    wetGain.gain.value = 0.45
    dryGain.gain.value = 1.0
    masterGain.gain.value = 1.0

    // Routing: Source -> Dry -> Master -> Destination
    //         Source -> Convolver -> Wet -> Master -> Destination
    dryGain.connect(masterGain)
    convolver.connect(wetGain)
    wetGain.connect(masterGain)
    masterGain.connect(ctx.destination)

    this.ctx = ctx
    this.convolverNode = convolver
    this.wetGain = wetGain
    this.dryGain = dryGain
    this.masterGain = masterGain

    return ctx
  }

  public async fetchAndDecode(url: string): Promise<AudioBuffer | null> {
    if (this.bufferCache.has(url)) {
      return this.bufferCache.get(url)!
    }

    const ctx = this.initContext()
    if (!ctx) return null

    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const arrayBuf = await res.arrayBuffer()
      const audioBuffer = await ctx.decodeAudioData(arrayBuf)
      this.bufferCache.set(url, audioBuffer)
      return audioBuffer
    } catch (e) {
      console.warn('Could not decode audio for reverb playback:', e)
      return null
    }
  }

  public async play(
    url: string,
    offsetSeconds = 0,
    volume = 1.0,
    intensity = 0.45,
    onEnded?: () => void,
  ): Promise<boolean> {
    const ctx = this.initContext()
    if (!ctx) return false

    if (ctx.state === 'suspended') {
      await ctx.resume()
    }

    this.stop()

    const buffer = await this.fetchAndDecode(url)
    if (!buffer) return false

    const source = ctx.createBufferSource()
    source.buffer = buffer

    if (this.dryGain) source.connect(this.dryGain)
    if (this.convolverNode) source.connect(this.convolverNode)

    this.setIntensity(intensity)
    this.setVolume(volume)

    this.onEndedCallback = onEnded || null
    source.onended = () => {
      if (this.isPlaying) {
        this.isPlaying = false
        this.onEndedCallback?.()
      }
    }

    const safeOffset = Math.max(0, Math.min(offsetSeconds, buffer.duration - 0.05))
    source.start(0, safeOffset)

    this.sourceNode = source
    this.startTime = ctx.currentTime - safeOffset
    this.startOffset = safeOffset
    this.isPlaying = true

    return true
  }

  public stop(): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.onended = null
        this.sourceNode.stop()
        this.sourceNode.disconnect()
      } catch {
        // Ignore already stopped
      }
      this.sourceNode = null
    }
    this.isPlaying = false
  }

  public pause(): number {
    const current = this.getCurrentTime()
    this.stop()
    return current
  }

  public getCurrentTime(): number {
    if (!this.isPlaying || !this.ctx) return this.startOffset
    return Math.max(0, this.ctx.currentTime - this.startTime)
  }

  public setVolume(vol: number): void {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, vol)), this.ctx.currentTime)
    }
  }

  public setIntensity(intensity: number): void {
    if (this.wetGain && this.ctx) {
      this.wetGain.gain.setValueAtTime(Math.max(0, Math.min(1, intensity)), this.ctx.currentTime)
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying
  }
}

export const reverbAudio = new ReverbAudioEngine()
