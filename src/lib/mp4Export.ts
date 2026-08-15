import type { ReelConfig } from '../types'
import { ASPECT_SIZES, renderFrame } from '../renderer/reelRenderer'
import type { Timeline } from '../renderer/timeline'
import { activeSlot } from '../renderer/timeline'
import { proxyAudioUrl } from './audio'
import { Muxer, ArrayBufferTarget } from 'mp4-muxer'

export interface Mp4ExportHandle {
  cancel: () => void
  done: Promise<Blob>
}

const CANDIDATE_CODECS = [
  'avc1.640033', // High Profile Level 5.1 (supports up to 4K)
  'avc1.4d0033', // Main Profile Level 5.1
  'avc1.420033', // Baseline Profile Level 5.1
  'avc1.640032', // High Profile Level 5.0
  'avc1.4d0032', // Main Profile Level 5.0
  'avc1.420032', // Baseline Profile Level 5.0
  'avc1.64002a', // High Profile Level 4.2
  'avc1.4d002a', // Main Profile Level 4.2
  'avc1.42002a', // Baseline Profile Level 4.2
  'avc1.42001f', // Baseline Profile Level 3.1
]

async function findSupportedVideoCodec(
  width: number,
  height: number,
  bitrate: number,
  framerate: number,
): Promise<string> {
  if (typeof VideoEncoder === 'undefined' || !VideoEncoder.isConfigSupported) {
    return 'avc1.640033'
  }

  for (const codec of CANDIDATE_CODECS) {
    try {
      const support = await VideoEncoder.isConfigSupported({
        codec,
        width,
        height,
        bitrate,
        framerate,
      })
      if (support.supported) {
        return codec
      }
    } catch {
      // Continue searching
    }
  }

  return 'avc1.640033'
}

/**
 * Decode and assemble all verse audio files into a single synchronized AudioBuffer.
 */
async function assembleReelAudio(
  config: ReelConfig,
  timeline: Timeline,
  sampleRate = 44100,
): Promise<AudioBuffer | null> {
  if (typeof AudioContext === 'undefined') return null

  const hasAudio = config.verses.some((v) => Boolean(v.audioUrl))
  if (!hasAudio) return null

  const totalSamples = Math.ceil((timeline.totalMs / 1000) * sampleRate)
  if (totalSamples <= 0) return null

  const audioCtx = new AudioContext({ sampleRate })
  const combinedBuffer = audioCtx.createBuffer(2, totalSamples, sampleRate)
  let loadedAny = false

  for (let i = 0; i < config.verses.length; i++) {
    const verse = config.verses[i]
    const slot = timeline.slots[i]
    if (!verse?.audioUrl || !slot) continue

    try {
      const proxiedUrl = proxyAudioUrl(verse.audioUrl) || verse.audioUrl
      const urlsToTry = [proxiedUrl, verse.audioUrl].filter(Boolean) as string[]

      let arrayBuffer: ArrayBuffer | null = null
      for (const url of urlsToTry) {
        try {
          const res = await fetch(url)
          if (res.ok) {
            arrayBuffer = await res.arrayBuffer()
            break
          }
        } catch {
          // Fall through to next URL
        }
      }

      if (!arrayBuffer) {
        console.warn('Could not fetch audio array buffer for:', verse.audioUrl)
        continue
      }

      const decoded = await audioCtx.decodeAudioData(arrayBuffer)
      loadedAny = true

      const startSample = Math.round((slot.startMs / 1000) * sampleRate)
      const copyLen = Math.min(decoded.length, totalSamples - startSample)

      for (let ch = 0; ch < 2; ch++) {
        const dest = combinedBuffer.getChannelData(ch)
        const src = decoded.numberOfChannels > ch
          ? decoded.getChannelData(ch)
          : decoded.getChannelData(0) // mono to stereo
        for (let s = 0; s < copyLen; s++) {
          dest[startSample + s] = src[s]
        }
      }
    } catch (err) {
      console.warn('Failed to load audio for export:', verse.audioUrl, err)
    }
  }

  void audioCtx.close()
  return loadedAny ? combinedBuffer : null
}

/**
 * Export a reel as MP4 with hardware-accelerated H.264 video AND AAC audio.
 */
export function exportMp4(
  config: ReelConfig,
  image: HTMLImageElement | null,
  timeline: Timeline,
  onProgress?: (fraction: number) => void,
  fps = 30,
): Mp4ExportHandle {
  const { width, height } = ASPECT_SIZES[config.aspectRatio]
  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('OffscreenCanvas 2D context unavailable')

  const durationMs = timeline.totalMs
  const totalFrames = Math.ceil((durationMs / 1000) * fps)
  const videoBitrate = 12_000_000
  const sampleRate = 44100

  let cancelled = false

  const done = new Promise<Blob>((resolve, reject) => {
    Promise.all([
      findSupportedVideoCodec(width, height, videoBitrate, fps),
      assembleReelAudio(config, timeline, sampleRate),
    ])
      .then(([videoCodec, audioBuffer]) => {
        if (cancelled) {
          reject(new Error('Export cancelled'))
          return
        }

        const hasAudio = audioBuffer !== null && typeof AudioEncoder !== 'undefined'

        const muxer = new Muxer({
          target: new ArrayBufferTarget(),
          video: {
            codec: 'avc',
            width,
            height,
          },
          ...(hasAudio
            ? {
                audio: {
                  codec: 'aac',
                  numberOfChannels: 2,
                  sampleRate,
                },
              }
            : {}),
          fastStart: 'in-memory',
          firstTimestampBehavior: 'offset',
        })

        const videoEncoder = new VideoEncoder({
          output: (chunk, meta) => {
            if (!cancelled) muxer.addVideoChunk(chunk, meta)
          },
          error: (e) => reject(e),
        })

        videoEncoder.configure({
          codec: videoCodec,
          width,
          height,
          bitrate: videoBitrate,
          framerate: fps,
        })

        let audioEncoder: AudioEncoder | null = null

        if (hasAudio && audioBuffer) {
          audioEncoder = new AudioEncoder({
            output: (chunk, meta) => {
              if (!cancelled) muxer.addAudioChunk(chunk, meta)
            },
            error: (e) => console.warn('AudioEncoder error:', e),
          })

          audioEncoder.configure({
            codec: 'mp4a.40.2',
            numberOfChannels: 2,
            sampleRate,
            bitrate: 128_000,
          })

          // Encode audio track in chunks of 2048 samples
          const totalSamples = audioBuffer.length
          const chunkSize = 2048
          const leftChannel = audioBuffer.getChannelData(0)
          const rightChannel = audioBuffer.getChannelData(1)

          for (let offset = 0; offset < totalSamples; offset += chunkSize) {
            if (cancelled) break
            const numFrames = Math.min(chunkSize, totalSamples - offset)
            const planarData = new Float32Array(numFrames * 2)

            planarData.set(leftChannel.subarray(offset, offset + numFrames), 0)
            planarData.set(rightChannel.subarray(offset, offset + numFrames), numFrames)

            const timestamp = Math.round((offset / sampleRate) * 1_000_000)

            const audioData = new AudioData({
              format: 'f32-planar',
              sampleRate,
              numberOfFrames: numFrames,
              numberOfChannels: 2,
              timestamp,
              data: planarData,
            })

            audioEncoder.encode(audioData)
            audioData.close()
          }
        }

        let frameIndex = 0

        function encodeNextFrame() {
          if (cancelled) {
            videoEncoder.close()
            audioEncoder?.close()
            reject(new Error('Export cancelled'))
            return
          }

          if (frameIndex >= totalFrames) {
            const promises: Promise<void>[] = [videoEncoder.flush()]
            if (audioEncoder) promises.push(audioEncoder.flush())

            Promise.all(promises)
              .then(() => {
                muxer.finalize()
                const target = muxer.target as ArrayBufferTarget
                const blob = new Blob([target.buffer], { type: 'video/mp4' })
                resolve(blob)
              })
              .catch(reject)
            return
          }

          const timeMs = (frameIndex / fps) * 1000
          const slot = activeSlot(timeline, timeMs)

          if (slot) {
            renderFrame(ctx as unknown as CanvasRenderingContext2D, {
              timeMs,
              config,
              image,
              verse: slot.verse,
              verseTimeMs: timeMs - slot.startMs,
              slotDurationMs: slot.durationMs,
            })
          }

          const timestamp = Math.round(frameIndex * (1_000_000 / fps))
          const frame = new VideoFrame(canvas, { timestamp })
          const keyFrame = frameIndex % (fps * 2) === 0
          videoEncoder.encode(frame, { keyFrame })
          frame.close()

          frameIndex++
          onProgress?.(frameIndex / totalFrames)

          // Yield to event loop every 4 frames
          if (frameIndex % 4 === 0) {
            setTimeout(encodeNextFrame, 0)
          } else {
            encodeNextFrame()
          }
        }

        encodeNextFrame()
      })
      .catch(reject)
  })

  return {
    cancel: () => {
      cancelled = true
    },
    done,
  }
}

/** Feature detection for WebCodecs VideoEncoder */
export function supportsWebCodecs(): boolean {
  return typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined'
}
