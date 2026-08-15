import type { ReelConfig } from '../types'
import { ASPECT_SIZES, renderFrame } from '../renderer/reelRenderer'
import type { Timeline, VerseSlot } from '../renderer/timeline'
import { activeSlot, DEFAULT_AYAH_GAP_MS } from '../renderer/timeline'
import { proxyAudioUrl } from './audio'
import { Muxer, ArrayBufferTarget } from 'mp4-muxer'

export interface Mp4ExportHandle {
  cancel: () => void
  done: Promise<Blob>
}

const CANDIDATE_CODECS = [
  'avc1.4d002a', // Main Profile Level 4.2 (Universal 1080p standard)
  'avc1.64002a', // High Profile Level 4.2
  'avc1.42002a', // Baseline Profile Level 4.2
  'avc1.640033', // High Profile Level 5.1
  'avc1.4d0033', // Main Profile Level 5.1
  'avc1.42001f', // Baseline Profile Level 3.1
]

async function findSupportedVideoCodec(
  width: number,
  height: number,
  bitrate: number,
  framerate: number,
): Promise<string> {
  if (typeof VideoEncoder === 'undefined' || !VideoEncoder.isConfigSupported) {
    return 'avc1.4d002a'
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

  return 'avc1.4d002a'
}

interface PreparedMedia {
  timeline: Timeline
  audioBuffer: AudioBuffer | null
}

/**
 * Fetch and decode actual audio files for each verse, measuring exact durations
 * and assembling a synchronized audio buffer with configurable pause between each ayah.
 */
async function prepareAudioAndTimeline(
  config: ReelConfig,
  sampleRate = 44100,
): Promise<PreparedMedia> {
  const fallbackDurationMs = config.motion.duration * 1000
  const verses = config.verses

  if (verses.length === 0) {
    return {
      timeline: { slots: [], totalMs: 0 },
      audioBuffer: null,
    }
  }

  const audioCtx = typeof AudioContext !== 'undefined' ? new AudioContext({ sampleRate }) : null
  const decodedBuffers: (AudioBuffer | null)[] = []
  const verseDurationsMs: number[] = []

  // 1. Fetch and decode audio for every verse to get the EXACT millisecond duration
  for (let i = 0; i < verses.length; i++) {
    const verse = verses[i]
    if (!verse?.audioUrl || !audioCtx) {
      decodedBuffers.push(null)
      verseDurationsMs.push(fallbackDurationMs)
      continue
    }

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
          // Try next URL fallback
        }
      }

      if (!arrayBuffer) {
        throw new Error(`Failed to fetch audio for ${verse.surah}:${verse.ayat}`)
      }

      const decoded = await audioCtx.decodeAudioData(arrayBuffer)
      decodedBuffers.push(decoded)
      // Exactly how long the reciter actually speaks (in ms)
      verseDurationsMs.push(Math.round(decoded.duration * 1000))
    } catch (err) {
      console.warn('Failed to decode verse audio for export:', verse.audioUrl, err)
      decodedBuffers.push(null)
      verseDurationsMs.push(fallbackDurationMs)
    }
  }

  // 2. Build the exact timeline with configurable pause between each ayah
  let cursor = 0
  const slots: VerseSlot[] = []
  const userPauseMs =
    typeof config.text?.ayahPauseDelay === 'number' && config.text.ayahPauseDelay >= 0
      ? Math.round(config.text.ayahPauseDelay * 1000)
      : DEFAULT_AYAH_GAP_MS
  const gapMs = verses.length > 1 ? userPauseMs : 0

  for (let i = 0; i < verses.length; i++) {
    const verse = verses[i]
    const recitationMs = verseDurationsMs[i]
    const isLast = i === verses.length - 1
    const pauseMs = isLast ? 0 : gapMs
    const slotDurationMs = recitationMs + pauseMs

    slots.push({
      verse,
      startMs: cursor,
      endMs: cursor + slotDurationMs,
      durationMs: slotDurationMs,
    })

    cursor += slotDurationMs
  }

  const timeline: Timeline = { slots, totalMs: cursor }

  // 3. Assemble the combined AudioBuffer with sample-accurate placement
  let combinedBuffer: AudioBuffer | null = null
  const hasAnyAudio = decodedBuffers.some((b) => b !== null)

  if (audioCtx && hasAnyAudio && cursor > 0) {
    const totalSamples = Math.ceil((cursor / 1000) * sampleRate)
    combinedBuffer = audioCtx.createBuffer(2, totalSamples, sampleRate)

    for (let i = 0; i < verses.length; i++) {
      const decoded = decodedBuffers[i]
      const slot = slots[i]
      if (!decoded) continue

      const startSample = Math.floor((slot.startMs / 1000) * sampleRate)
      const numChannels = Math.min(2, decoded.numberOfChannels)
      const numSamples = Math.min(decoded.length, totalSamples - startSample)

      for (let ch = 0; ch < numChannels; ch++) {
        const srcData = decoded.getChannelData(ch)
        const dstData = combinedBuffer.getChannelData(ch)
        for (let s = 0; s < numSamples; s++) {
          dstData[startSample + s] = srcData[s]
        }
      }

      // If source audio was mono, duplicate to right channel
      if (decoded.numberOfChannels === 1) {
        const srcData = decoded.getChannelData(0)
        const dstRight = combinedBuffer.getChannelData(1)
        for (let s = 0; s < numSamples; s++) {
          dstRight[startSample + s] = srcData[s]
        }
      }
    }
  }

  if (audioCtx) {
    void audioCtx.close()
  }

  return { timeline, audioBuffer: combinedBuffer }
}

/**
 * Helper to wait for encoder backpressure to clear.
 */
function waitForBackpressure(
  encoder: VideoEncoder | AudioEncoder,
  maxQueue = 3,
): Promise<void> {
  if (encoder.encodeQueueSize <= maxQueue) {
    return Promise.resolve()
  }

  return new Promise<void>((resolve) => {
    let resolved = false
    const onDequeue = () => {
      if (!resolved && encoder.encodeQueueSize <= maxQueue) {
        resolved = true
        encoder.removeEventListener('dequeue', onDequeue)
        resolve()
      }
    }
    encoder.addEventListener('dequeue', onDequeue)
    // Fallback timeout in case event is missed
    setTimeout(() => {
      if (!resolved) {
        resolved = true
        encoder.removeEventListener('dequeue', onDequeue)
        resolve()
      }
    }, 25)
  })
}

/**
 * Export reel to MP4 using hardware-accelerated WebCodecs + mp4-muxer.
 * Memory-bounded backpressure control prevents browser lag and flushing errors.
 */
export function exportMp4(
  config: ReelConfig,
  image: HTMLImageElement | null,
  _timeline?: Timeline,
  onProgress?: (p: number) => void,
  fps = 30,
): Mp4ExportHandle {
  const { width, height } = ASPECT_SIZES[config.aspectRatio]
  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true })
  if (!ctx) throw new Error('OffscreenCanvas 2D context unavailable')

  const videoBitrate = 7_500_000 // 7.5 Mbps: Crystal clear 1080p, ultra-reliable encoder throughput
  const sampleRate = 44100

  let cancelled = false

  const done = new Promise<Blob>((resolve, reject) => {
    Promise.all([
      findSupportedVideoCodec(width, height, videoBitrate, fps),
      prepareAudioAndTimeline(config, sampleRate),
    ])
      .then(async ([videoCodec, { timeline, audioBuffer }]) => {
        if (cancelled) {
          reject(new Error('Export cancelled'))
          return
        }

        const durationMs = timeline.totalMs
        const totalFrames = Math.max(1, Math.ceil((durationMs / 1000) * fps))
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

        let encoderError: Error | null = null

        const videoEncoder = new VideoEncoder({
          output: (chunk, meta) => {
            if (!cancelled) {
              try {
                muxer.addVideoChunk(chunk, meta)
              } catch (e) {
                console.warn('Muxer video chunk error:', e)
              }
            }
          },
          error: (e) => {
            encoderError = e instanceof Error ? e : new Error(String(e))
          },
        })

        videoEncoder.configure({
          codec: videoCodec,
          width,
          height,
          bitrate: videoBitrate,
          framerate: fps,
          hardwareAcceleration: 'prefer-hardware',
        })

        let audioEncoder: AudioEncoder | null = null

        // Encode audio track smoothly with backpressure control
        if (hasAudio && audioBuffer) {
          audioEncoder = new AudioEncoder({
            output: (chunk, meta) => {
              if (!cancelled) {
                try {
                  muxer.addAudioChunk(chunk, meta)
                } catch (e) {
                  console.warn('Muxer audio chunk error:', e)
                }
              }
            },
            error: (e) => console.warn('AudioEncoder warning:', e),
          })

          audioEncoder.configure({
            codec: 'mp4a.40.2',
            numberOfChannels: 2,
            sampleRate,
            bitrate: 128_000,
          })

          const totalSamples = audioBuffer.length
          const chunkSize = 2048
          const leftChannel = audioBuffer.getChannelData(0)
          const rightChannel = audioBuffer.getChannelData(1)

          for (let offset = 0; offset < totalSamples; offset += chunkSize) {
            if (cancelled) break

            while (audioEncoder.encodeQueueSize > 8 && !cancelled) {
              await waitForBackpressure(audioEncoder, 4)
            }

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

        // Encode video frames sequentially with backpressure check to prevent GPU memory saturation
        try {
          for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
            if (cancelled || encoderError) {
              break
            }

            // Yield if encoder has too many queued frames
            while (videoEncoder.encodeQueueSize > 3 && !cancelled && !encoderError) {
              await waitForBackpressure(videoEncoder, 2)
            }

            if (cancelled || encoderError) break

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
                totalDurationMs: durationMs,
              })
            }

            const timestamp = Math.round(frameIndex * (1_000_000 / fps))
            const frame = new VideoFrame(canvas, { timestamp })
            const keyFrame = frameIndex % (fps * 2) === 0
            videoEncoder.encode(frame, { keyFrame })
            frame.close()

            onProgress?.((frameIndex + 1) / totalFrames)

            // Periodic micro-yield every 15 frames to keep UI responsive
            if (frameIndex % 15 === 0) {
              await new Promise((r) => setTimeout(r, 0))
            }
          }

          if (cancelled) {
            try {
              videoEncoder.close()
              audioEncoder?.close()
            } catch {
              // Ignore close error on cancelled
            }
            reject(new Error('Export cancelled'))
            return
          }

          if (encoderError) {
            throw encoderError
          }

          // Flush encoders cleanly
          const flushPromises: Promise<void>[] = [videoEncoder.flush()]
          if (audioEncoder) {
            flushPromises.push(audioEncoder.flush())
          }

          await Promise.all(flushPromises)

          muxer.finalize()
          const target = muxer.target as ArrayBufferTarget
          const blob = new Blob([target.buffer], { type: 'video/mp4' })

          try {
            videoEncoder.close()
            audioEncoder?.close()
          } catch {
            // Ignore close
          }

          resolve(blob)
        } catch (err) {
          try {
            videoEncoder.close()
            audioEncoder?.close()
          } catch {
            // Ignore close
          }
          reject(err instanceof Error ? err : new Error(String(err)))
        }
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

export const exportToMp4 = exportMp4
