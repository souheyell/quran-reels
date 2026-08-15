import type { ReelConfig } from '../types'
import { ASPECT_SIZES, renderFrame } from '../renderer/reelRenderer'
import type { Timeline } from '../renderer/timeline'
import { activeSlot } from '../renderer/timeline'
import { proxyAudioUrl } from './audio'
import { exportMp4, supportsWebCodecs } from './mp4Export'

export interface ExportHandle {
  cancel: () => void
  done: Promise<Blob>
}

interface AudioCapture {
  ctx: AudioContext
  getTracks: () => MediaStreamTrack[]
  play: (index: number) => void
  stop: () => void
}

function setupAudioCapture(
  audioUrls: (string | null)[],
): AudioCapture | null {
  if (typeof AudioContext === 'undefined' || audioUrls.length === 0) {
    return null
  }

  const ctx = new AudioContext()
  const dest = ctx.createMediaStreamDestination()
  const audios: (HTMLAudioElement | null)[] = audioUrls.map((url) => {
    const proxied = proxyAudioUrl(url)
    if (!proxied) return null
    const audio = new Audio(proxied)
    audio.crossOrigin = 'anonymous'
    audio.preload = 'auto'
    const source = ctx.createMediaElementSource(audio)
    source.connect(dest)
    return audio
  })

  let current = -1

  return {
    ctx,
    getTracks: () => dest.stream.getAudioTracks(),
    play: (index: number) => {
      if (index === current) return
      const prevAudio = current >= 0 ? audios[current] : null
      if (prevAudio) {
        prevAudio.pause()
        prevAudio.currentTime = 0
      }
      current = index
      const audio = audios[index]
      if (audio) void audio.play()
    },
    stop: () => {
      for (const audio of audios) {
        if (audio) audio.pause()
      }
      void ctx.close()
    },
  }
}

export function exportWebM(
  config: ReelConfig,
  image: HTMLImageElement | null,
  timeline: Timeline,
  onProgress?: (fraction: number) => void,
  fps = 30,
): ExportHandle {
  const { width, height } = ASPECT_SIZES[config.aspectRatio]
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')

  const canvasStream = canvas.captureStream(fps)
  const capture = setupAudioCapture(config.verses.map((v) => v.audioUrl))

  const stream = new MediaStream(canvasStream.getVideoTracks())
  if (capture) {
    for (const track of capture.getTracks()) stream.addTrack(track)
  }

  const recorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9',
    videoBitsPerSecond: 12_000_000,
    audioBitsPerSecond: 128_000,
  })

  const durationMs = timeline.totalMs
  const startTime = performance.now()

  let cancelled = false
  const done = new Promise<Blob>((resolve, reject) => {
    const chunks: BlobPart[] = []
    recorder.ondataavailable = (e: BlobEvent) => {
      if (e.data.size > 0) chunks.push(e.data)
    }
    recorder.onstop = () => {
      if (cancelled) {
        reject(new Error('Export cancelled'))
      } else {
        resolve(new Blob(chunks, { type: 'video/webm' }))
      }
    }

    recorder.start(250)
    if (capture) void capture.ctx.resume()

    let lastSlotIndex = -1
    const loop = (now: number) => {
      const elapsed = now - startTime
      if (cancelled) {
        recorder.stop()
        return
      }
      if (elapsed >= durationMs) {
        recorder.stop()
        return
      }

      onProgress?.(elapsed / durationMs)

      const slot = activeSlot(timeline, elapsed)
      if (slot) {
        const slotIndex = timeline.slots.indexOf(slot)
        if (capture && slotIndex !== lastSlotIndex) {
          capture.play(slotIndex)
          lastSlotIndex = slotIndex
        }
        renderFrame(ctx, {
          timeMs: elapsed,
          config,
          image,
          verse: slot.verse,
          verseTimeMs: elapsed - slot.startMs,
          slotDurationMs: slot.durationMs,
        })
      }
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
  })

  return {
    cancel: () => { cancelled = true },
    done: done.finally(() => capture?.stop()),
  }
}

/**
 * Unified export: uses WebCodecs + mp4-muxer when available, falls back to MediaRecorder WebM.
 */
export function exportVideo(
  config: ReelConfig,
  image: HTMLImageElement | null,
  timeline: Timeline,
  onProgress?: (fraction: number) => void,
  fps = 30,
): ExportHandle {
  if (supportsWebCodecs()) {
    return exportMp4(config, image, timeline, onProgress, fps)
  }
  if (!('MediaRecorder' in window)) {
    throw new Error('Video export is not supported in this browser.')
  }
  return exportWebM(config, image, timeline, onProgress, fps)
}

export function exportPng(
  config: ReelConfig,
  image: HTMLImageElement | null,
  timeline: Timeline,
): string | null {
  const { width, height } = ASPECT_SIZES[config.aspectRatio]
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  // Capture at ~40% through the first verse for a representative frame
  const targetMs = Math.min(timeline.totalMs * 0.4, timeline.totalMs - 100)
  const slot = activeSlot(timeline, targetMs)
  if (!slot) return null
  renderFrame(ctx, {
    timeMs: targetMs,
    config,
    image,
    verse: slot.verse,
    verseTimeMs: targetMs - slot.startMs,
    slotDurationMs: slot.durationMs,
  })
  return canvas.toDataURL('image/png')
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}
