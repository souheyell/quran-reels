import { useState, useRef, useEffect, useMemo } from 'react'
import type { ReelConfig } from '../types'
import {
  SURAHS_INDEX,
  RAMADAN_30_DAYS_PACK,
  THEMATIC_PACKS,
  splitSurahIntoChunks,
  parseCustomVerseList,
  type BulkItem,
  type PackCategory,
} from '../lib/bulkPacks'
import {
  renderBulkItem,
  createBatchZip,
  downloadBatchZip,
  type BackgroundStrategy,
  type ReciterStrategy,
  type BatchItemStatus,
  type ManifestFormat,
  POPULAR_SHUFFLE_RECITERS,
  formatDurationMs,
  formatDurationSecsDetailed,
  prepareBatchManifestAndFiles,
  getSurahSlug,
} from '../lib/bulkExporter'
import {
  saveBulkPackToServer,
  openExportFolder,
  buildUploaderCliCommand,
  getStoredCliTemplate,
  setStoredCliTemplate,
} from '../lib/exportDestination'
import {
  estimateBulkItemDurationSeconds,
  formatEstimatedDuration,
  formatTotalBatchEstimate,
  getSocialDurationCategory,
} from '../lib/durationEstimator'
import { ALL_RECITERS } from '../api/quran'
import { shareReelVideo } from '../lib/share'
import { saveAndDownloadBlob } from '../lib/export'

interface BulkCreateModalProps {
  isOpen: boolean
  onClose: () => void
  baseConfig: ReelConfig
  editionId: string
  reciterId: string
}

type BulkTab = 'surah' | 'ramadan' | 'themes' | 'custom'

const POPULAR_SURAH_PICKS = [
  { number: 67, name: 'Al-Mulk', arabic: 'الملك', icon: '👑' },
  { number: 18, name: 'Al-Kahf', arabic: 'الكهف', icon: '🕌' },
  { number: 55, name: 'Ar-Rahman', arabic: 'الرحمن', icon: '🌿' },
  { number: 56, name: 'Al-Waqi\'ah', arabic: 'الواقعة', icon: '🌌' },
  { number: 36, name: 'Ya-Sin', arabic: 'يس', icon: '🕊️' },
  { number: 76, name: 'Al-Insan', arabic: 'الإنسان', icon: '✨' },
  { number: 19, name: 'Maryam', arabic: 'مريم', icon: '🌸' },
  { number: 12, name: 'Yusuf', arabic: 'يوسف', icon: '📖' },
  { number: 2, name: 'Al-Baqarah', arabic: 'البقرة', icon: '⚡' },
  { number: 24, name: 'An-Nur', arabic: 'النور', icon: '💡' },
  { number: 73, name: 'Al-Muzzammil', arabic: 'المزمل', icon: '🌙' },
  { number: 94, name: 'Ash-Sharh', arabic: 'الشرح', icon: '🤲' },
]

const QUICK_AYAH_TEMPLATES = [
  { label: 'Ayat al-Kursi (2:255)', code: '2:255' },
  { label: 'Last 2 of Baqarah (2:285-286)', code: '2:285-286' },
  { label: 'First 10 of Kahf (18:1-10)', code: '18:1-10' },
  { label: 'Ar-Rahman 1-13 (55:1-13)', code: '55:1-13' },
  { label: 'Al-Mulk 1-5 (67:1-5)', code: '67:1-5' },
  { label: 'Ash-Sharh (94:1-8)', code: '94:1-8' },
  { label: 'The 3 Quls (112, 113, 114)', code: '112:1-4\n113:1-5\n114:1-6' },
  { label: 'Du\'a of Yunus (21:87)', code: '21:87' },
  { label: 'Light Verse (24:35)', code: '24:35' },
  { label: 'Closing of Al-Hashr (59:22-24)', code: '59:22-24' },
  { label: 'Du\'a of Musa (20:25-28)', code: '20:25-28' },
  { label: 'Forgiveness (39:53)', code: '39:53' },
]

const THEME_CATEGORIES: Array<{ id: PackCategory; label: string; icon: string }> = [
  { id: 'all', label: 'All Collections', icon: '🌟' },
  { id: 'popular', label: 'Popular & Daily', icon: '👑' },
  { id: 'duas', label: 'Duas & Invocations', icon: '🤲' },
  { id: 'protection', label: 'Ruqyah & Shield', icon: '🛡️' },
  { id: 'friday-night', label: 'Friday & Tahajjud', icon: '🕌' },
  { id: 'jannah-akhirah', label: 'Jannah & Akhirah', icon: '🌺' },
  { id: 'family-virtues', label: 'Family & Virtues', icon: '💖' },
]

export function BulkCreateModal({
  isOpen,
  onClose,
  baseConfig,
  editionId,
  reciterId,
}: BulkCreateModalProps) {
  const [activeTab, setActiveTab] = useState<BulkTab>('surah')

  // Surah splitter state
  const [selectedSurah, setSelectedSurah] = useState<number>(67) // Default Al-Mulk
  const [chunkSize, setChunkSize] = useState<number>(3) // Default 3 ayahs per reel
  const [surahStartAyat, setSurahStartAyat] = useState<number>(1)
  const [surahEndAyat, setSurahEndAyat] = useState<number>(30)

  // Thematic pack state
  const [selectedThemeId, setSelectedThemeId] = useState<string>('pack-duas')
  const [themeCategory, setThemeCategory] = useState<PackCategory>('all')

  // Custom list state
  const [customTextInput, setCustomTextInput] = useState<string>(
    '2:255\n3:18-19\n18:1-4\n55:1-13\n67:1-5\n94:1-8\n112:1-4',
  )

  // Current Surah metadata
  const currentSurahMeta = useMemo(() => {
    return SURAHS_INDEX.find((s) => s.number === selectedSurah)
  }, [selectedSurah])

  // Sync Start / End Ayahs when Surah changes
  useEffect(() => {
    if (currentSurahMeta) {
      setSurahStartAyat(1)
      setSurahEndAyat(currentSurahMeta.totalAyahs)
    }
  }, [selectedSurah, currentSurahMeta])

  // Filtered Thematic Collections
  const filteredThemes = useMemo(() => {
    if (themeCategory === 'all') return THEMATIC_PACKS
    return THEMATIC_PACKS.filter((p) => p.category === themeCategory)
  }, [themeCategory])

  // Auto-sync selectedThemeId if current is filtered out
  useEffect(() => {
    if (activeTab === 'themes') {
      const exists = filteredThemes.some((p) => p.id === selectedThemeId)
      if (!exists && filteredThemes.length > 0) {
        setSelectedThemeId(filteredThemes[0].id)
      }
    }
  }, [themeCategory, activeTab, filteredThemes, selectedThemeId])

  // Background & Reciter Strategies
  const [bgStrategy, setBgStrategy] = useState<BackgroundStrategy>('cycle-wallpapers')
  const [reciterStrategy, setReciterStrategy] = useState<ReciterStrategy>('selected')
  const [bulkReciterId, setBulkReciterId] = useState<string>(reciterId || 'ar.alafasy')

  // Grouped reciters for the selector
  const groupedReciters = useMemo(() => {
    return {
      popular: ALL_RECITERS.filter((r) => r.category === 'contemporary'),
      haramain: ALL_RECITERS.filter((r) => r.category === 'haramain'),
      goldenAge: ALL_RECITERS.filter((r) => r.category === 'golden-age'),
      mujawwad: ALL_RECITERS.filter((r) => r.category === 'mujawwad'),
      warsh: ALL_RECITERS.filter((r) => r.category === 'warsh'),
    }
  }, [])

  // Helper to get reciter name for a queue item
  const getItemReciterName = (item: BulkItem, index: number) => {
    if (item.reciterId) {
      const r = ALL_RECITERS.find((rec) => rec.id === item.reciterId)
      return r ? r.name.split(' (')[0] : item.reciterId
    }
    if (reciterStrategy === 'shuffle') {
      const shufflePick = POPULAR_SHUFFLE_RECITERS[index % POPULAR_SHUFFLE_RECITERS.length]
      return `🔀 ${shufflePick.name.split(' (')[0]}`
    }
    const r = ALL_RECITERS.find((rec) => rec.id === bulkReciterId)
    return r ? r.name.split(' (')[0] : 'Selected Qari'
  }

  // Update reciter for individual reel in queue
  const updateItemReciter = (itemId: string, newReciterId: string) => {
    setQueue((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, reciterId: newReciterId || undefined } : it)),
    )
  }

  // Generation queue state
  const [queue, setQueue] = useState<BulkItem[]>([])
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set())
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentQueueIndex, setCurrentQueueIndex] = useState(-1)
  const [batchStatuses, setBatchStatuses] = useState<Record<string, BatchItemStatus>>({})
  const [overallPercent, setOverallPercent] = useState(0)
  const [zipProgress, setZipProgress] = useState<number | null>(null)
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [batchDone, setBatchDone] = useState(false)
  const [zipDownloaded, setZipDownloaded] = useState(false)
  const [manifestFormat, setManifestFormat] = useState<ManifestFormat>('array')

  const [serverSaveStatus, setServerSaveStatus] = useState<{
    saved: boolean
    folderPath?: string
    manifestPath?: string
    cliCommand?: string
    error?: string
  } | null>(null)
  const [isSavingToServer, setIsSavingToServer] = useState(false)
  const [cliTemplate, setCliTemplate] = useState<string>(() => getStoredCliTemplate())
  const [showCliConfig, setShowCliConfig] = useState(false)
  const [copiedField, setCopiedField] = useState<'folder' | 'cmd' | null>(null)

  const isCancelledRef = useRef(false)
  const toastTimerRef = useRef<number | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = window.setTimeout(() => setToastMessage(null), 4000)
  }

  const handleUpdateCliTemplate = (newTmpl: string) => {
    setCliTemplate(newTmpl)
    setStoredCliTemplate(newTmpl)
    if (serverSaveStatus?.folderPath) {
      const updatedCmd = buildUploaderCliCommand({
        folderPath: serverSaveStatus.folderPath,
        manifestPath: serverSaveStatus.manifestPath,
        template: newTmpl,
      })
      setServerSaveStatus((prev) => (prev ? { ...prev, cliCommand: updatedCmd } : null))
    }
  }

  const handleCopyText = (text: string, field: 'folder' | 'cmd') => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {})
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 3000)
      showToast(field === 'cmd' ? '📋 Copied CLI command to clipboard!' : '📁 Copied folder path to clipboard!')
    }
  }

  const handleOpenFolder = async (folderPath?: string) => {
    const res = await openExportFolder(folderPath)
    if (res.success) {
      showToast('📂 Opened export folder in Finder / Explorer!')
    } else {
      showToast(`📁 Folder: ${res.folderPath}`)
    }
  }

  // Estimate duration for each reel before ever generating
  const estimatedDurations = useMemo(() => {
    const map: Record<
      string,
      {
        durationSec: number
        formatted: string
        category: ReturnType<typeof getSocialDurationCategory>
      }
    > = {}
    queue.forEach((item) => {
      const effectiveReciter = item.reciterId || bulkReciterId
      const dur = estimateBulkItemDurationSeconds(
        item,
        effectiveReciter,
        baseConfig.text?.ayahPauseDelay ?? 0.5,
      )
      map[item.id] = {
        durationSec: dur,
        formatted: formatEstimatedDuration(dur),
        category: getSocialDurationCategory(dur),
      }
    })
    return map
  }, [queue, bulkReciterId, baseConfig.text?.ayahPauseDelay])

  // Total estimated duration of currently selected items
  const totalEstimatedSeconds = useMemo(() => {
    return queue
      .filter((item) => selectedItemIds.has(item.id))
      .reduce((acc, item) => acc + (estimatedDurations[item.id]?.durationSec || 0), 0)
  }, [queue, selectedItemIds, estimatedDurations])

  // Quick estimator for chunk size options in Surah Splitter
  const getChunkEstimate = (size: number) => {
    const dummyItem: BulkItem = {
      id: 'preview',
      title: 'Preview',
      surah: selectedSurah,
      startAyat: surahStartAyat || 1,
      count: size,
    }
    const dur = estimateBulkItemDurationSeconds(
      dummyItem,
      bulkReciterId,
      baseConfig.text?.ayahPauseDelay ?? 0.5,
    )
    return formatEstimatedDuration(dur)
  }

  // Update preview queue based on tab selections
  useEffect(() => {
    let items: BulkItem[] = []
    if (activeTab === 'surah') {
      const maxAyahs = currentSurahMeta?.totalAyahs || 7
      const validEnd = Math.max(1, Math.min(surahEndAyat || maxAyahs, maxAyahs))
      const validStart = Math.max(1, Math.min(surahStartAyat || 1, validEnd))
      items = splitSurahIntoChunks(selectedSurah, chunkSize, validStart, validEnd)
    } else if (activeTab === 'ramadan') {
      items = RAMADAN_30_DAYS_PACK.items
    } else if (activeTab === 'themes') {
      const pack = THEMATIC_PACKS.find((p) => p.id === selectedThemeId)
      items = pack ? pack.items : []
    } else if (activeTab === 'custom') {
      items = parseCustomVerseList(customTextInput)
    }

    setQueue(items)
    setSelectedItemIds(new Set(items.map((it) => it.id)))
    // Reset done state whenever the queue config changes
    setBatchDone(false)
    setZipDownloaded(false)
  }, [
    activeTab,
    selectedSurah,
    chunkSize,
    surahStartAyat,
    surahEndAyat,
    currentSurahMeta,
    selectedThemeId,
    customTextInput,
  ])

  // Append a quick Ayah template snippet to custom text input
  const handleAddTemplate = (code: string) => {
    setCustomTextInput((prev) => {
      const trimmed = prev.trim()
      if (!trimmed) return code
      return `${trimmed}\n${code}`
    })
    showToast('✨ Added verse to custom selection!')
  }

  // Toggle item selection
  const toggleSelectItem = (id: string) => {
    const next = new Set(selectedItemIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedItemIds(next)
  }

  // Select / Deselect All
  const toggleSelectAll = () => {
    if (selectedItemIds.size === queue.length) {
      setSelectedItemIds(new Set())
    } else {
      setSelectedItemIds(new Set(queue.map((it) => it.id)))
    }
  }

  // Start Batch Generation
  const handleStartBatch = async () => {
    const itemsToProcess = queue.filter((it) => selectedItemIds.has(it.id))
    if (itemsToProcess.length === 0) {
      showToast('Please select at least 1 reel to generate.')
      return
    }

    setIsProcessing(true)
    isCancelledRef.current = false
    setOverallPercent(0)
    setZipProgress(null)

    // Initialize statuses
    const initialStatuses: Record<string, BatchItemStatus> = {}
    itemsToProcess.forEach((it) => {
      initialStatuses[it.id] = {
        item: it,
        status: 'queued',
        progress: 0,
        message: 'Queued',
      }
    })
    setBatchStatuses(initialStatuses)

    const completedResults: Array<{
      item: BulkItem
      blob: Blob
      caption: string
      verses: import('../types').Verse[]
      durationMs: number
    }> = []

    for (let i = 0; i < itemsToProcess.length; i++) {
      if (isCancelledRef.current) break

      const item = itemsToProcess[i]
      setCurrentQueueIndex(i)

      setBatchStatuses((prev) => ({
        ...prev,
        [item.id]: {
          item,
          status: 'loading',
          progress: 10,
          message: 'Loading verses…',
        },
      }))

      try {
        const result = await renderBulkItem(
          item,
          i,
          baseConfig,
          editionId,
          bulkReciterId,
          bgStrategy,
          (stepMessage, pct) => {
            setBatchStatuses((prev) => ({
              ...prev,
              [item.id]: {
                item,
                status: pct >= 100 ? 'completed' : 'rendering',
                progress: pct,
                message: stepMessage,
              },
            }))
          },
          reciterStrategy,
        )

        const videoUrl = URL.createObjectURL(result.blob)

        setBatchStatuses((prev) => ({
          ...prev,
          [item.id]: {
            item,
            status: 'completed',
            progress: 100,
            message: `Completed (${(result.durationMs / 1000).toFixed(1)}s)`,
            blob: result.blob,
            videoUrl,
            caption: result.caption,
            verses: result.verses,
            durationMs: result.durationMs,
          },
        }))

        completedResults.push({
          item,
          blob: result.blob,
          caption: result.caption,
          verses: result.verses,
          durationMs: result.durationMs,
        })
      } catch (err) {
        console.error(`Batch render failed for ${item.title}:`, err)
        setBatchStatuses((prev) => ({
          ...prev,
          [item.id]: {
            item,
            status: 'error',
            progress: 0,
            message: 'Failed',
            error: err instanceof Error ? err.message : 'Render failed',
          },
        }))
      }

      const overall = Math.round(((i + 1) / itemsToProcess.length) * 100)
      setOverallPercent(overall)
    }

    setIsProcessing(false)
    setCurrentQueueIndex(-1)

    if (completedResults.length > 0 && !isCancelledRef.current) {
      const totalBatchMs = completedResults.reduce((acc, r) => acc + (r.durationMs || 0), 0)
      showToast(`⚡ Batch Complete! ${completedResults.length} Reels Generated (${formatDurationSecsDetailed(totalBatchMs)} total duration).`)
      setBatchDone(true)

      // Auto-save entire batch to server / cloudspace exports folder
      try {
        const primarySurah = completedResults[0]?.verses?.[0]?.surah || completedResults[0]?.item.surah || 1
        const surahMeta = SURAHS_INDEX.find((s) => s.number === primarySurah)
        const primarySurahName = completedResults[0]?.verses?.[0]?.surahName || surahMeta?.englishName || 'quran'
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
        const packFolderName = `quran_pack_${getSurahSlug(primarySurah, primarySurahName)}_${dateStr}_${Date.now().toString().slice(-4)}`

        const { manifestContent, files } = prepareBatchManifestAndFiles(completedResults, manifestFormat)

        setIsSavingToServer(true)
        void saveBulkPackToServer(packFolderName, files, manifestContent)
          .then((res) => {
            const cmd = buildUploaderCliCommand({
              folderPath: res.folderPath,
              manifestPath: res.manifestPath,
              template: cliTemplate,
            })
            setServerSaveStatus({
              saved: res.success,
              folderPath: res.folderPath,
              manifestPath: res.manifestPath,
              cliCommand: cmd,
              error: res.error,
            })
          })
          .finally(() => {
            setIsSavingToServer(false)
          })
      } catch (saveErr) {
        console.warn('Auto-save to server exports folder skipped:', saveErr)
      }
    }
  }

  // Cancel batch
  const handleCancelBatch = () => {
    isCancelledRef.current = true
    setIsProcessing(false)
    showToast('Batch processing stopped.')
  }

  // Download entire batch as ZIP
  const handleDownloadZip = async () => {
    const completedItems = Object.values(batchStatuses).filter(
      (s) => s.status === 'completed' && s.blob,
    )

    if (completedItems.length === 0) {
      showToast('No completed reels to package.')
      return
    }

    setZipProgress(5)
    try {
      const zipPayload = completedItems.map((s) => ({
        item: s.item,
        blob: s.blob!,
        caption: s.caption || '',
        verses: s.verses || [],
        durationMs: s.durationMs,
      }))

      const zipBlob = await createBatchZip(zipPayload, {
        manifestFormat,
        onZipProgress: (pct) => {
          setZipProgress(pct)
        },
      })

      await downloadBatchZip(zipBlob, 'quran_reels_pack.zip')
      showToast('📦 Batch ZIP (Format 1: Master manifest.json) saved successfully!')
      setZipDownloaded(true)
    } catch (err) {
      console.error('ZIP generation failed:', err)
      showToast('Failed to create ZIP package.')
    } finally {
      setZipProgress(null)
    }
  }

  // Download individual MP4
  const handleDownloadSingle = async (status: BatchItemStatus) => {
    if (!status.blob) return
    const ext = status.blob.type.includes('mp4') ? 'mp4' : 'webm'
    const safeTitle = status.item.title.replace(/[^a-zA-Z0-9_-]/g, '_')
    const filename = `${safeTitle}.${ext}`
    const result = await saveAndDownloadBlob(status.blob, filename, {
      title: status.item.title,
      text: status.caption || '',
      dialogTitle: 'Save / Share Bulk Reel Video',
    })
    showToast(`🎉 ${result.message}`)
  }

  // Copy caption
  const handleCopyCaption = (caption?: string) => {
    if (!caption) return
    navigator.clipboard.writeText(caption).then(() => {
      showToast('📋 Social caption & hashtags copied to clipboard!')
    })
  }

  // Share individual reel
  const handleShareSingle = async (status: BatchItemStatus) => {
    if (!status.blob) return
    const safeTitle = status.item.title.replace(/[^a-zA-Z0-9_-]/g, '_')
    const res = await shareReelVideo({
      blob: status.blob,
      filename: `${safeTitle}.mp4`,
      verses: [],
      reciterName: undefined,
    })
    showToast(res.message)
  }

  if (!isOpen) return null

  const selectedCount = selectedItemIds.size
  const completedCount = Object.values(batchStatuses).filter((s) => s.status === 'completed').length

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="bulk-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="bulk-modal-header">
          <div className="bulk-header-left">
            <h2 className="bulk-modal-title">
              <span className="bulk-title-icon">📦</span> Bulk Reel Studio (إنشاء جماعي)
            </h2>
            <p className="bulk-modal-sub">
              Generate entire Surah series, 30-day packs, or thematic collections in 1080p MP4 with automatic ZIP packaging
            </p>
          </div>
          <button
            type="button"
            className="bulk-close-btn"
            onClick={onClose}
            title="Close Bulk Studio"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bulk-tabs-bar">
          <button
            type="button"
            className={`bulk-tab-btn ${activeTab === 'surah' ? 'active' : ''}`}
            onClick={() => setActiveTab('surah')}
          >
            📖 Whole Surah Split
          </button>
          <button
            type="button"
            className={`bulk-tab-btn ${activeTab === 'ramadan' ? 'active' : ''}`}
            onClick={() => setActiveTab('ramadan')}
          >
            🌙 30-Day Daily Pack
          </button>
          <button
            type="button"
            className={`bulk-tab-btn ${activeTab === 'themes' ? 'active' : ''}`}
            onClick={() => setActiveTab('themes')}
          >
            🌟 Thematic Collections
          </button>
          <button
            type="button"
            className={`bulk-tab-btn ${activeTab === 'custom' ? 'active' : ''}`}
            onClick={() => setActiveTab('custom')}
          >
            📝 Custom Verse List
          </button>
        </div>

        {/* Scrollable Modal Body Container */}
        <div className="bulk-modal-body">
          {/* Tab Content & Config Section */}
          <div className="bulk-config-section">
            {/* TAB 1: Surah Splitter */}
            {activeTab === 'surah' && (
              <div className="bulk-tab-content">
                {/* Popular Surahs Quick Picks */}
                <div className="bulk-quick-pick-section">
                  <span className="bulk-quick-title">⭐ Quick Pick Popular Surahs:</span>
                  <div className="bulk-quick-surahs-row">
                    {POPULAR_SURAH_PICKS.map((p) => (
                      <button
                        key={p.number}
                        type="button"
                        className={`bulk-quick-surah-chip ${selectedSurah === p.number ? 'active' : ''}`}
                        onClick={() => setSelectedSurah(p.number)}
                      >
                        <span className="chip-icon">{p.icon}</span>
                        <span className="chip-name">{p.name}</span>
                        <span className="chip-arabic">{p.arabic}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bulk-form-row">
                  <label className="bulk-form-group flex-2">
                    <span className="bulk-label-text">Select Surah (1–114)</span>
                    <select
                      className="bulk-select"
                      value={selectedSurah}
                      onChange={(e) => setSelectedSurah(Number(e.target.value))}
                    >
                      {SURAHS_INDEX.map((s) => (
                        <option key={s.number} value={s.number}>
                          {s.number}. {s.englishName} ({s.name}) — {s.totalAyahs} Ayahs
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="bulk-form-group flex-2">
                    <div className="bulk-label-row">
                      <span className="bulk-label-text">Verse Range to Split</span>
                      <span className="bulk-label-dur-hint">
                        Total: {Math.max(1, (surahEndAyat || currentSurahMeta?.totalAyahs || 1) - (surahStartAyat || 1) + 1)} Ayahs
                      </span>
                    </div>
                    <div className="bulk-range-inputs">
                      <div className="range-field">
                        <span className="range-label">From:</span>
                        <input
                          type="number"
                          className="bulk-number-input"
                          min={1}
                          max={currentSurahMeta?.totalAyahs || 286}
                          value={surahStartAyat}
                          onChange={(e) => setSurahStartAyat(Math.max(1, Number(e.target.value)))}
                        />
                      </div>
                      <span className="range-sep">→</span>
                      <div className="range-field">
                        <span className="range-label">To:</span>
                        <input
                          type="number"
                          className="bulk-number-input"
                          min={surahStartAyat}
                          max={currentSurahMeta?.totalAyahs || 286}
                          value={surahEndAyat}
                          onChange={(e) =>
                            setSurahEndAyat(
                              Math.min(
                                currentSurahMeta?.totalAyahs || 286,
                                Math.max(surahStartAyat, Number(e.target.value)),
                              ),
                            )
                          }
                        />
                      </div>
                      <button
                        type="button"
                        className="btn btn-xs bulk-reset-range-btn"
                        onClick={() => {
                          setSurahStartAyat(1)
                          setSurahEndAyat(currentSurahMeta?.totalAyahs || 30)
                        }}
                        title="Reset to entire Surah"
                      >
                        All
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bulk-form-row">
                  <label className="bulk-form-group">
                    <div className="bulk-label-row">
                      <span className="bulk-label-text">Ayahs Per Reel (Chunk Size)</span>
                      <span className="bulk-label-dur-hint">⚡ Adjust to control reel pacing</span>
                    </div>
                    <div className="bulk-chunk-chips">
                      {[1, 2, 3, 5, 7, 10].map((size) => (
                        <button
                          key={size}
                          type="button"
                          className={`chip ${chunkSize === size ? 'active' : ''}`}
                          onClick={() => setChunkSize(size)}
                        >
                          <span className="chip-count">{size} {size === 1 ? 'Ayah' : 'Ayahs'}</span>
                          <span className="chip-dur">({getChunkEstimate(size)})</span>
                        </button>
                      ))}
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* TAB 2: Ramadan 30-Day Pack */}
            {activeTab === 'ramadan' && (
              <div className="bulk-tab-content">
                <div className="bulk-preset-banner">
                  <div className="preset-banner-icon">🌙</div>
                  <div className="preset-banner-info">
                    <h4 className="preset-banner-title">{RAMADAN_30_DAYS_PACK.title} ({RAMADAN_30_DAYS_PACK.arabicTitle})</h4>
                    <p className="preset-banner-desc">{RAMADAN_30_DAYS_PACK.description}</p>
                    <div className="preset-banner-meta-row">
                      <span className="preset-banner-badge">30 Curated Reels Ready</span>
                      <span className="preset-dur-badge">⏱️ Est. ~14m Total (~28s avg)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Thematic Collections */}
            {activeTab === 'themes' && (
              <div className="bulk-tab-content">
                {/* Category Filter Chips */}
                <div className="bulk-category-chips">
                  {THEME_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      className={`bulk-cat-chip ${themeCategory === cat.id ? 'active' : ''}`}
                      onClick={() => setThemeCategory(cat.id)}
                    >
                      <span>{cat.icon}</span> {cat.label}
                    </button>
                  ))}
                </div>

                <div className="bulk-theme-cards">
                  {filteredThemes.map((p) => {
                    const packTotalSec = p.items.reduce(
                      (acc, item) =>
                        acc +
                        estimateBulkItemDurationSeconds(
                          item,
                          bulkReciterId,
                          baseConfig.text?.ayahPauseDelay ?? 0.5,
                        ),
                      0,
                    )
                    return (
                      <div
                        key={p.id}
                        className={`bulk-theme-card ${selectedThemeId === p.id ? 'active' : ''}`}
                        onClick={() => setSelectedThemeId(p.id)}
                      >
                        <span className="theme-card-icon">{p.icon}</span>
                        <div className="theme-card-body">
                          <h4 className="theme-card-title">{p.title}</h4>
                          {p.arabicTitle && <span className="theme-card-arabic">{p.arabicTitle}</span>}
                          <p className="theme-card-desc">{p.description}</p>
                          <div className="theme-card-meta-row">
                            <span className="theme-card-count">{p.items.length} Reels</span>
                            <span className="theme-card-dur">
                              ⏱️ {formatTotalBatchEstimate(packTotalSec)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* TAB 4: Custom Verse List */}
            {activeTab === 'custom' && (
              <div className="bulk-tab-content">
                {/* Quick Add Templates */}
                <div className="bulk-quick-templates-section">
                  <span className="bulk-quick-title">✨ 1-Click Common Passages & Duas:</span>
                  <div className="bulk-quick-template-chips">
                    {QUICK_AYAH_TEMPLATES.map((tmpl, tIdx) => (
                      <button
                        key={tIdx}
                        type="button"
                        className="bulk-template-chip"
                        onClick={() => handleAddTemplate(tmpl.code)}
                        title={`Click to add ${tmpl.label}`}
                      >
                        + {tmpl.label}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="bulk-form-group">
                  <span className="bulk-label-text">
                    Enter Surah:Ayah Ranges (Separated by commas or newlines)
                  </span>
                  <textarea
                    className="bulk-textarea"
                    rows={4}
                    value={customTextInput}
                    onChange={(e) => setCustomTextInput(e.target.value)}
                    placeholder="e.g. 2:255, 3:18-19, 18:1-5, 55:1-13, 67:1-5"
                  />
                  <span className="bulk-hint">
                    Formats: <code>2:255</code> (single), <code>18:1-5</code> (range), <code>55:1..13</code>
                  </span>
                </label>
              </div>
            )}

            {/* Background Strategy Bar */}
            <div className="bulk-strategy-row">
              <div className="strategy-label">
                <span className="strategy-icon">🎨</span> Background:
              </div>
              <div className="strategy-buttons">
                <button
                  type="button"
                  className={`strategy-btn ${bgStrategy === 'cycle-wallpapers' ? 'active' : ''}`}
                  onClick={() => setBgStrategy('cycle-wallpapers')}
                >
                  📸 Cycle 4K Wallpapers
                </button>
                <button
                  type="button"
                  className={`strategy-btn ${bgStrategy === 'cycle-videos' ? 'active' : ''}`}
                  onClick={() => setBgStrategy('cycle-videos')}
                >
                  🎬 Cycle Video Loops
                </button>
                <button
                  type="button"
                  className={`strategy-btn ${bgStrategy === 'current' ? 'active' : ''}`}
                  onClick={() => setBgStrategy('current')}
                >
                  🖼️ Keep Current Media
                </button>
              </div>
            </div>

            {/* Reciter (Qari) Selection Strategy Bar */}
            <div className="bulk-strategy-row">
              <div className="strategy-label">
                <span className="strategy-icon">🎙️</span> Reciter (Qari):
              </div>
              <div className="strategy-buttons">
                <button
                  type="button"
                  className={`strategy-btn ${reciterStrategy === 'selected' ? 'active' : ''}`}
                  onClick={() => setReciterStrategy('selected')}
                >
                  🎙️ Specific Qari
                </button>
                <button
                  type="button"
                  className={`strategy-btn ${reciterStrategy === 'shuffle' ? 'active' : ''}`}
                  onClick={() => setReciterStrategy('shuffle')}
                >
                  🔀 Auto-Shuffle Top Qaris
                </button>
              </div>
            </div>

            {/* Qari Selector Dropdown (When Specific Reciter is Active) */}
            {reciterStrategy === 'selected' && (
              <div className="bulk-reciter-dropdown-box">
                <label className="bulk-form-group">
                  <span className="bulk-label-text">Choose Qari For Batch</span>
                  <select
                    className="bulk-select bulk-qari-select"
                    value={bulkReciterId}
                    onChange={(e) => setBulkReciterId(e.target.value)}
                  >
                    <optgroup label="🌟 Most Popular & Celebrated">
                      {groupedReciters.popular.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} {r.arabicName ? `(${r.arabicName})` : ''}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="🕋 Haramain Imams (Makkah & Madinah)">
                      {groupedReciters.haramain.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} {r.arabicName ? `(${r.arabicName})` : ''}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="📜 Golden Age Classical Masters">
                      {groupedReciters.goldenAge.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} {r.arabicName ? `(${r.arabicName})` : ''}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="✨ Mujawwad & Maqamat">
                      {groupedReciters.mujawwad.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} {r.arabicName ? `(${r.arabicName})` : ''}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="🌍 Warsh & African Qira'at">
                      {groupedReciters.warsh.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} {r.arabicName ? `(${r.arabicName})` : ''}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </label>
              </div>
            )}
          </div>

          {/* Live Batch Queue Dashboard */}
          <div className="bulk-queue-header">
            <div className="queue-header-left">
              <h3 className="queue-title">
                Reel Queue <span className="queue-count">({selectedCount} / {queue.length} selected)</span>
              </h3>
              <span
                className="queue-total-estimate-pill"
                title="Estimated total batch playback length before rendering"
              >
                ⏳ Est. Batch Duration: {formatTotalBatchEstimate(totalEstimatedSeconds)}
              </span>
            </div>
            <div className="queue-header-right">
              <button type="button" className="btn btn-xs" onClick={toggleSelectAll}>
                {selectedItemIds.size === queue.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          </div>

          {/* Overall Progress Meter (When Processing) */}
          {isProcessing && (
            <div className="bulk-overall-progress-card">
              <div className="overall-progress-header">
                <span className="overall-progress-title">
                  <span className="reciter-download-spinner" /> Generating Batch: Reel {currentQueueIndex + 1} of {selectedCount}
                  {completedCount > 0 && (
                    <span className="overall-batch-dur-pill">
                      · {formatDurationSecsDetailed(Object.values(batchStatuses).reduce((acc, s) => acc + (s.durationMs || 0), 0))} generated
                    </span>
                  )}
                </span>
                <span className="overall-progress-pct">{overallPercent}%</span>
              </div>
              <div className="overall-progress-track">
                <div className="overall-progress-fill" style={{ width: `${overallPercent}%` }} />
              </div>
            </div>
          )}

          {/* Queue Items List */}
          <div className="bulk-queue-list">
            {queue.map((item, idx) => {
              const statusObj = batchStatuses[item.id]
              const isSelected = selectedItemIds.has(item.id)
              const isCurrent = isProcessing && currentQueueIndex === idx
              const itemEstimate = estimatedDurations[item.id]

              return (
                <div
                  key={item.id}
                  className={`queue-item-card ${isCurrent ? 'current' : ''} ${statusObj?.status === 'completed' ? 'completed' : ''}`}
                >
                  <div className="queue-item-left">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectItem(item.id)}
                      disabled={isProcessing}
                      className="queue-checkbox"
                    />
                    <div className="queue-item-index">#{idx + 1}</div>
                    <div className="queue-item-meta">
                      <h4 className="queue-item-title">{item.title}</h4>
                      <div className="queue-item-sub-row">
                        <span className="queue-item-sub">
                          Surah {item.surah} · {item.count} {item.count === 1 ? 'Ayah' : 'Ayahs'} {item.theme ? `· ${item.theme}` : ''}
                        </span>
                        <span className="queue-reciter-tag">
                          🎙️ {getItemReciterName(item, idx)}
                        </span>
                        {statusObj?.durationMs ? (
                          <span
                            className="queue-duration-badge completed"
                            title={`Exact Rendered Duration: ${(statusObj.durationMs / 1000).toFixed(1)} seconds`}
                          >
                            ⏱️ {formatDurationMs(statusObj.durationMs)} ({(statusObj.durationMs / 1000).toFixed(1)}s)
                          </span>
                        ) : (
                          <span
                            className={`queue-duration-badge estimate ${itemEstimate?.category.cssClass || 'short'}`}
                            title={`${itemEstimate?.category.tooltip || 'Estimated duration before generation'} — adjust chunk size to change`}
                          >
                            ⏱️ {itemEstimate?.formatted || '~15s'}
                            {itemEstimate && (
                              <span className="duration-platform-tag">
                                {itemEstimate.category.badgeText}
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="queue-item-right">
                    {/* Per-Reel Reciter Customizer */}
                    {!isProcessing && statusObj?.status !== 'completed' && (
                      <select
                        className="queue-item-reciter-select"
                        value={item.reciterId || ''}
                        onChange={(e) => updateItemReciter(item.id, e.target.value)}
                        title="Customize reciter for this reel"
                      >
                        <option value="">(Default: {getItemReciterName(item, idx)})</option>
                        {ALL_RECITERS.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name.split(' (')[0]}
                          </option>
                        ))}
                      </select>
                    )}
                    {/* Status Indicator */}
                    {statusObj ? (
                      <div className="queue-status-block">
                        {statusObj.status === 'loading' && (
                          <span className="queue-badge loading">
                            <span className="spinner" /> {statusObj.message}
                          </span>
                        )}
                        {statusObj.status === 'rendering' && (
                          <div className="queue-render-mini">
                            <span className="queue-badge rendering">
                              🎬 {statusObj.message.includes('(') ? statusObj.message.split('(')[1].split(')')[0] : ''} {statusObj.progress}%
                            </span>
                          </div>
                        )}
                        {statusObj.status === 'completed' && (
                          <div className="queue-actions-row">
                            <button
                              type="button"
                              className="queue-action-btn"
                              onClick={() => statusObj.videoUrl && setPreviewVideoUrl(statusObj.videoUrl)}
                              title="Preview Video"
                            >
                              ▶
                            </button>
                            <button
                              type="button"
                              className="queue-action-btn"
                              onClick={() => handleDownloadSingle(statusObj)}
                              title="Download MP4"
                            >
                              💾
                            </button>
                            <button
                              type="button"
                              className="queue-action-btn"
                              onClick={() => handleCopyCaption(statusObj.caption)}
                              title="Copy Social Caption"
                            >
                              📋
                            </button>
                            <button
                              type="button"
                              className="queue-action-btn"
                              onClick={() => handleShareSingle(statusObj)}
                              title="Share Reel"
                            >
                              📲
                            </button>
                          </div>
                        )}
                        {statusObj.status === 'error' && (
                          <span className="queue-badge error">❌ Failed</span>
                        )}
                      </div>
                    ) : (
                      <span className="queue-badge queued">Ready</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Cloud & CLI Uploader Hub (Format 1 Master manifest.json) ── */}
        {completedCount > 0 && (
          <div className="bulk-uploader-hub-card">
            <div className="hub-header">
              <div className="hub-title">
                <span className="hub-icon">🚀</span>
                <div>
                  <h4>
                    Cloud &amp; CLI Uploader Hub
                    {isSavingToServer ? (
                      <span style={{ fontSize: '0.74rem', color: '#fbbf24', fontWeight: 500, marginLeft: '8px' }}>
                        💾 Saving to server disk ({completedCount} reels + manifest.json)…
                      </span>
                    ) : serverSaveStatus?.saved ? (
                      <span style={{ fontSize: '0.74rem', color: '#34d399', fontWeight: 500, marginLeft: '8px' }}>
                        ✅ Saved on Server Disk (Format 1: Master manifest.json)
                      </span>
                    ) : null}
                  </h4>
                  <p className="hub-subtitle">
                    Exported reels sit directly in the pack directory alongside <code>manifest.json</code>. Ready for automated CLI upload.
                  </p>
                </div>
              </div>
              <div className="hub-actions">
                {serverSaveStatus?.folderPath && (
                  <button
                    type="button"
                    className="btn-copy-code"
                    style={{ background: 'rgba(255,255,255,0.08)', color: '#fff' }}
                    onClick={() => void handleOpenFolder(serverSaveStatus.folderPath)}
                    title="Open folder in Finder or File Manager"
                  >
                    📂 Open in Finder
                  </button>
                )}
              </div>
            </div>

            {/* Saving Folder Row */}
            <div className="hub-row">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="hub-label">📁 Saving Folder (Server / Cloudspace):</span>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{completedCount} MP4 videos + manifest.json</span>
              </div>
              <div className="hub-code-box">
                <code>{serverSaveStatus?.folderPath || 'Saving to exports/...'}</code>
                <button
                  type="button"
                  className="btn-copy-code"
                  onClick={() => handleCopyText(serverSaveStatus?.folderPath || '', 'folder')}
                  disabled={!serverSaveStatus?.folderPath}
                >
                  {copiedField === 'folder' ? '✅ Copied!' : '📋 Copy Path'}
                </button>
              </div>
            </div>

            {/* CLI Command Row */}
            <div className="hub-row">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="hub-label">💻 CLI Command for Bulk Uploader Script:</span>
                <span style={{ fontSize: '0.72rem', color: '#38bdf8' }}>Ready to paste in terminal</span>
              </div>
              <div className="hub-code-box">
                <code>
                  {serverSaveStatus?.cliCommand ||
                    buildUploaderCliCommand({
                      folderPath: serverSaveStatus?.folderPath || 'exports',
                      template: cliTemplate,
                    })}
                </code>
                <button
                  type="button"
                  className="btn-copy-code"
                  onClick={() =>
                    handleCopyText(
                      serverSaveStatus?.cliCommand ||
                        buildUploaderCliCommand({
                          folderPath: serverSaveStatus?.folderPath || 'exports',
                          template: cliTemplate,
                        }),
                      'cmd',
                    )
                  }
                >
                  {copiedField === 'cmd' ? '✅ Copied!' : '📋 Copy CLI Command'}
                </button>
              </div>
            </div>

            {/* Quick Template Customization Accordion */}
            <div className="hub-settings-toggle">
              <button
                type="button"
                className="link-btn"
                onClick={() => setShowCliConfig(!showCliConfig)}
              >
                {showCliConfig ? '▼ Hide CLI Command Settings' : '⚙️ Customize CLI Command Script / Template'}
              </button>
              {showCliConfig && (
                <div className="hub-settings-drawer">
                  <label>
                    <span>
                      CLI Command Template (supports <code>{'{folder}'}</code>, <code>{'{manifest}'}</code>, <code>{'{file}'}</code>):
                    </span>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                      <input
                        type="text"
                        className="bulk-text-input"
                        style={{ flex: 1, padding: '6px 10px', fontSize: '0.8rem', background: '#0f172a', color: '#f8fafc', border: '1px solid #334155', borderRadius: '6px' }}
                        value={cliTemplate}
                        onChange={(e) => handleUpdateCliTemplate(e.target.value)}
                        placeholder='python scripts/bulk_uploader.py --folder "{folder}"'
                      />
                      <button
                        type="button"
                        className="btn-copy-code"
                        onClick={() => handleUpdateCliTemplate('python scripts/bulk_uploader.py --folder "{folder}"')}
                        title="Reset to default uploader script template"
                      >
                        Reset Default
                      </button>
                    </div>
                  </label>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Footer Controls */}
        <div className="bulk-modal-footer">
          <div className="footer-left">
            {completedCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-zip-download"
                  onClick={handleDownloadZip}
                  disabled={zipProgress !== null || zipDownloaded}
                  title={zipDownloaded ? 'Already downloaded — generate a new batch to re-download' : undefined}
                >
                  {zipProgress !== null ? (
                    <>
                      <span className="spinner" /> Packaging ZIP ({zipProgress}%)…
                    </>
                  ) : zipDownloaded ? (
                    <>✅ ZIP Pack Downloaded ({completedCount} Reels)</>
                  ) : (
                    <>
                      📦 Download ZIP Pack ({completedCount} Reels · manifest.json)
                    </>
                  )}
                </button>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <span>Manifest:</span>
                  <select
                    className="bulk-select"
                    style={{ fontSize: '0.78rem', padding: '4px 8px', height: '34px', width: 'auto', borderRadius: '6px' }}
                    value={manifestFormat}
                    onChange={(e) => setManifestFormat(e.target.value as ManifestFormat)}
                    title="Choose manifest.json structure inside the ZIP archive"
                  >
                    <option value="array">Array [ ] (Format 1 Recommended)</option>
                    <option value="keyValue">Key-Value Dictionary &#123; &#125;</option>
                  </select>
                </label>
              </div>
            )}
          </div>

          <div className="footer-right">
            {isProcessing ? (
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleCancelBatch}
              >
                ⏹ Stop Batch
              </button>
            ) : batchDone ? (
              <button
                type="button"
                className="btn btn-bulk-primary"
                disabled
                title="Batch already generated — change your selection or settings to run again"
                style={{ opacity: 0.7, cursor: 'not-allowed' }}
              >
                ✅ Batch Complete — {completedCount} Reels Done
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-bulk-primary"
                onClick={handleStartBatch}
                disabled={selectedCount === 0}
              >
                🚀 Generate {selectedCount} Reels ({formatTotalBatchEstimate(totalEstimatedSeconds)})
              </button>
            )}
          </div>
        </div>

        {/* Video Preview Modal (When clicking Play on a generated reel) */}
        {previewVideoUrl && (
          <div className="video-preview-modal-overlay" onClick={() => setPreviewVideoUrl(null)}>
            <div className="video-preview-box" onClick={(e) => e.stopPropagation()}>
              <video
                src={previewVideoUrl}
                controls
                autoPlay
                className="batch-preview-video"
              />
              <button
                type="button"
                className="btn primary btn-close-preview"
                onClick={() => setPreviewVideoUrl(null)}
              >
                Close Preview
              </button>
            </div>
          </div>
        )}

        {/* Toast Notification Banner */}
        {toastMessage && (
          <div className="bulk-toast-banner">
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    </div>
  )
}
