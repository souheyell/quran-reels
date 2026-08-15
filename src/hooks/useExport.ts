import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReelConfig } from '../types'
import type { Timeline } from '../renderer/timeline'
import { exportVideo, exportPng, downloadBlob, downloadDataUrl } from '../lib/export'

export function useExport(
  config: ReelConfig,
  image: HTMLImageElement | null,
  timeline: Timeline,
) {
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [exportProgress, setExportProgress] = useState(0)
  const [exportFormat, setExportFormat] = useState<'mp4' | 'webm'>('mp4')
  const handleRef = useRef<{ cancel: () => void } | null>(null)

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
      downloadBlob(blob, `islamic-reel-${first.surah}-${first.ayat}-${last.ayat}.${ext}`)
    } catch (e) {
      if (e instanceof Error && e.message === 'Export cancelled') return
      setExportError(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setExporting(false)
      setExportProgress(0)
      handleRef.current = null
    }
  }, [config, image, timeline])

  const handleExportPng = useCallback(() => {
    const dataUrl = exportPng(config, image, timeline)
    if (!dataUrl) {
      setExportError('PNG export failed')
      return
    }
    const first = config.verses[0]
    downloadDataUrl(dataUrl, `islamic-reel-${first.surah}-${first.ayat}.png`)
  }, [config, image, timeline])

  const cancelExport = useCallback(() => {
    handleRef.current?.cancel()
  }, [])

  // Cleanup on unmount
  useEffect(() => () => handleRef.current?.cancel(), [])

  return {
    exporting,
    exportError,
    exportProgress,
    exportFormat,
    handleExportVideo,
    handleExportPng,
    cancelExport,
  }
}
