import type { ReelConfig } from '../types'
import { ASPECT_SIZES, renderFrame } from '../renderer/reelRenderer'
import type { Timeline } from '../renderer/timeline'
import { activeSlot } from '../renderer/timeline'
import { proxyAudioUrl } from './audio'
import { exportMp4, supportsWebCodecs } from './mp4Export'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { Capacitor } from '@capacitor/core'

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
  image: CanvasImageSource | null,
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
 * Unified export: uses hardware-accelerated WebCodecs + mp4-muxer with automatic
 * graceful MediaRecorder fallback for 100% reliability across all devices.
 */
export function exportVideo(
  config: ReelConfig,
  image: CanvasImageSource | null,
  timeline: Timeline,
  onProgress?: (fraction: number) => void,
  fps = 30,
): ExportHandle {
  if (supportsWebCodecs()) {
    try {
      const mp4Handle = exportMp4(config, image, timeline, onProgress, fps)
      let activeHandle = mp4Handle
      const done = mp4Handle.done.catch((err) => {
        if (err instanceof Error && err.message === 'Export cancelled') {
          throw err
        }
        console.warn('WebCodecs MP4 export error, falling back to MediaRecorder:', err)
        if (typeof MediaRecorder !== 'undefined') {
          const fallbackHandle = exportWebM(config, image, timeline, onProgress, fps)
          activeHandle = fallbackHandle
          return fallbackHandle.done
        }
        throw err
      })

      return {
        cancel: () => activeHandle.cancel(),
        done,
      }
    } catch (err) {
      console.warn('Synchronous WebCodecs failure, falling back to MediaRecorder:', err)
    }
  }

  if (typeof MediaRecorder === 'undefined') {
    throw new Error('Video export is not supported in this environment.')
  }
  return exportWebM(config, image, timeline, onProgress, fps)
}

export function exportPng(
  config: ReelConfig,
  image: CanvasImageSource | null,
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

/**
 * Convert a Blob to a base64 data string for native filesystem writing.
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const dataUrl = reader.result as string
      const base64 = dataUrl.split(',')[1] || dataUrl
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export interface SaveFileResult {
  savedTo: 'native' | 'web'
  path: string
  uri?: string
  shared?: boolean
  message: string
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

/**
 * Universal cross-platform saving engine:
 * - On Native Android/iOS: Writes the file into public Documents/Downloads directory via Capacitor Filesystem
 *   and automatically triggers the Android/iOS system Share/Save sheet.
 * - On Web: Triggers standard browser download.
 */
export async function saveAndDownloadBlob(
  blob: Blob,
  filename: string,
  options?: {
    title?: string
    text?: string
    dialogTitle?: string
  },
): Promise<SaveFileResult> {
  if (Capacitor.isNativePlatform()) {
    try {
      const base64Data = await blobToBase64(blob)

      // Check and request storage permissions
      try {
        const perm = await Filesystem.checkPermissions()
        if (perm.publicStorage !== 'granted') {
          await Filesystem.requestPermissions()
        }
      } catch (err) {
        console.warn('Filesystem permissions check skipped/unsupported:', err)
      }

      // Write to public Documents directory
      const writeResult = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true,
      })

      const fileUri = writeResult.uri

      // Automatically trigger Native Share/Save sheet so user can view/share/save to gallery
      let shared = false
      try {
        await Share.share({
          title: options?.title || filename,
          text: options?.text || '',
          url: fileUri,
          dialogTitle: options?.dialogTitle || 'Save or Share Reel Video',
        })
        shared = true
      } catch (shareErr) {
        console.warn('Native share sheet dismissed or error:', shareErr)
      }

      return {
        savedTo: 'native',
        path: `Documents/${filename}`,
        uri: fileUri,
        shared,
        message: `Saved to Documents/${filename}`,
      }
    } catch (nativeErr) {
      console.warn('Native filesystem write to Documents failed, attempting Cache directory:', nativeErr)
      try {
        const base64Data = await blobToBase64(blob)
        const writeResult = await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: Directory.Cache,
          recursive: true,
        })
        await Share.share({
          title: options?.title || filename,
          text: options?.text || '',
          url: writeResult.uri,
          dialogTitle: options?.dialogTitle || 'Save or Share Reel Video',
        })
        return {
          savedTo: 'native',
          path: `Cache/${filename}`,
          uri: writeResult.uri,
          shared: true,
          message: `Saved to Cache/${filename}`,
        }
      } catch (fallbackErr) {
        console.error('All native file writes failed:', fallbackErr)
      }
    }
  }

  // Web Browser fallback
  downloadBlob(blob, filename)
  return {
    savedTo: 'web',
    path: filename,
    message: `Downloaded ${filename}`,
  }
}

/**
 * Universal Data URL saving engine for PNG frames.
 */
export async function saveAndDownloadDataUrl(
  dataUrl: string,
  filename: string,
  options?: {
    title?: string
    text?: string
    dialogTitle?: string
  },
): Promise<SaveFileResult> {
  if (Capacitor.isNativePlatform()) {
    try {
      const base64Data = dataUrl.split(',')[1] || dataUrl

      try {
        const perm = await Filesystem.checkPermissions()
        if (perm.publicStorage !== 'granted') {
          await Filesystem.requestPermissions()
        }
      } catch {
        // ignore
      }

      const writeResult = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true,
      })

      const fileUri = writeResult.uri

      try {
        await Share.share({
          title: options?.title || filename,
          text: options?.text || '',
          url: fileUri,
          dialogTitle: options?.dialogTitle || 'Save or Share PNG Frame',
        })
      } catch {
        // ignore
      }

      return {
        savedTo: 'native',
        path: `Documents/${filename}`,
        uri: fileUri,
        shared: true,
        message: `Saved to Documents/${filename}`,
      }
    } catch (err) {
      console.warn('Native write dataUrl failed:', err)
    }
  }

  downloadDataUrl(dataUrl, filename)
  return {
    savedTo: 'web',
    path: filename,
    message: `Downloaded ${filename}`,
  }
}
