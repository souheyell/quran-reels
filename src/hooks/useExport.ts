import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReelConfig } from '../types'
import type { Timeline } from '../renderer/timeline'
import { exportVideo, exportPng, downloadBlob, downloadDataUrl } from '../lib/export'
import { shareReelVideo, generateSocialCaption } from '../lib/share'

export function useExport(
  config: ReelConfig,
  image: CanvasImageSource | null,
  timeline: Timeline,
) {
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [exportProgress, setExportProgress] = useState(0)
  const [exportFormat, setExportFormat] = useState<'mp4' | 'webm'>('mp4')
  const [shareToast, setShareToast] = useState<string | null>(null)
  const [lastExportedBlob, setLastExportedBlob] = useState<{
    blob: Blob
    filename: string
  } | null>(null)

  const handleRef = useRef<{ cancel: () => void } | null>(null)
  const toastTimeoutRef = useRef<number | null>(null)

  const showToast = (message: string) => {
    setShareToast(message)
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    toastTimeoutRef.current = window.setTimeout(() => {
      setShareToast(null)
    }, 5000)
  }

  // Detect best format on mount
  useEffect(() => {
    setExportFormat('VideoEncoder' in window ? 'mp4' : 'webm')
  }, [])

  const handleExportVideo = useCallback(async () => {
    setExporting(true)
    setExportError(null)
    setExportProgress(0)
    try {
      const handle = exportVideo(config, image, timeline, (progress) => {
        setExportProgress(Math.round(progress * 100))
      })
      handleRef.current = handle
      const blob = await handle.done
      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm'
      const first = config.verses[0]
      const last = config.verses[config.verses.length - 1]
      const filename = `islamic-reel-${first?.surah || 1}-${first?.ayat || 1}-${last?.ayat || 1}.${ext}`
      
      setLastExportedBlob({ blob, filename })
      downloadBlob(blob, filename)
      
      // Also copy social caption to clipboard automatically
      const caption = generateSocialCaption(config.verses, first?.reciterName)
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(caption).catch(() => {})
        showToast('⚡ Video downloaded & Social Caption copied to clipboard!')
      }
    } catch (e) {
      if (e instanceof Error && e.message === 'Export cancelled') return
      setExportError(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setExporting(false)
      setExportProgress(0)
      handleRef.current = null
    }
  }, [config, image, timeline])

  const handleShareReel = useCallback(async () => {
    let blobToShare = lastExportedBlob?.blob
    let filenameToShare = lastExportedBlob?.filename

    if (!blobToShare || !filenameToShare) {
      setExporting(true)
      setExportError(null)
      setExportProgress(0)
      try {
        const handle = exportVideo(config, image, timeline, (progress) => {
          setExportProgress(Math.round(progress * 100))
        })
        handleRef.current = handle
        const blob = await handle.done
        const ext = blob.type.includes('mp4') ? 'mp4' : 'webm'
        const first = config.verses[0]
        const last = config.verses[config.verses.length - 1]
        filenameToShare = `islamic-reel-${first?.surah || 1}-${first?.ayat || 1}-${last?.ayat || 1}.${ext}`
        blobToShare = blob
        setLastExportedBlob({ blob, filename: filenameToShare })
      } catch (e) {
        if (e instanceof Error && e.message === 'Export cancelled') return
        setExportError(e instanceof Error ? e.message : 'Share export failed')
        return
      } finally {
        setExporting(false)
        setExportProgress(0)
        handleRef.current = null
      }
    }

    if (blobToShare && filenameToShare) {
      const result = await shareReelVideo({
        blob: blobToShare,
        filename: filenameToShare,
        verses: config.verses,
        reciterName: config.verses[0]?.reciterName,
      })
      showToast(result.message)
    }
  }, [config, image, timeline, lastExportedBlob])

  const handleExportPng = useCallback(() => {
    const dataUrl = exportPng(config, image, timeline)
    if (!dataUrl) {
      setExportError('PNG export failed')
      return
    }
    const first = config.verses[0]
    downloadDataUrl(dataUrl, `islamic-reel-${first?.surah || 1}-${first?.ayat || 1}.png`)
    showToast('🖼️ 4K PNG Frame downloaded!')
  }, [config, image, timeline])

  const cancelExport = useCallback(() => {
    handleRef.current?.cancel()
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      handleRef.current?.cancel()
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    }
  }, [])

  return {
    exporting,
    exportError,
    exportProgress,
    exportFormat,
    shareToast,
    handleExportVideo,
    handleShareReel,
    handleExportPng,
    cancelExport,
  }
}
