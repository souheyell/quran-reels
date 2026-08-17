import { useState, useRef, useEffect } from 'react'
import type { ReelConfig } from '../types'
import {
  SURAHS_INDEX,
  RAMADAN_30_DAYS_PACK,
  THEMATIC_PACKS,
  splitSurahIntoChunks,
  parseCustomVerseList,
  type BulkItem,
} from '../lib/bulkPacks'
import {
  renderBulkItem,
  createBatchZip,
  downloadBatchZip,
  type BackgroundStrategy,
  type BatchItemStatus,
} from '../lib/bulkExporter'
import { shareReelVideo } from '../lib/share'
import { downloadBlob } from '../lib/export'

interface BulkCreateModalProps {
  isOpen: boolean
  onClose: () => void
  baseConfig: ReelConfig
  editionId: string
  reciterId: string
}

type BulkTab = 'surah' | 'ramadan' | 'themes' | 'custom'

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

  // Thematic pack state
  const [selectedThemeId, setSelectedThemeId] = useState<string>('pack-duas')

  // Custom list state
  const [customTextInput, setCustomTextInput] = useState<string>(
    '2:255\n3:18-19\n18:1-4\n55:1-13\n67:1-5\n94:1-8\n112:1-4',
  )

  // Background & Strategy
  const [bgStrategy, setBgStrategy] = useState<BackgroundStrategy>('cycle-wallpapers')

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

  const isCancelledRef = useRef(false)
  const toastTimerRef = useRef<number | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = window.setTimeout(() => setToastMessage(null), 4000)
  }

  // Update preview queue based on tab selections
  useEffect(() => {
    let items: BulkItem[] = []
    if (activeTab === 'surah') {
      const meta = SURAHS_INDEX.find((s) => s.number === selectedSurah)
      items = splitSurahIntoChunks(selectedSurah, chunkSize, 1, meta?.totalAyahs)
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
  }, [activeTab, selectedSurah, chunkSize, selectedThemeId, customTextInput])

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
          reciterId,
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
        )

        const videoUrl = URL.createObjectURL(result.blob)

        setBatchStatuses((prev) => ({
          ...prev,
          [item.id]: {
            item,
            status: 'completed',
            progress: 100,
            message: 'Completed',
            blob: result.blob,
            videoUrl,
            caption: result.caption,
          },
        }))

        completedResults.push({
          item,
          blob: result.blob,
          caption: result.caption,
          verses: result.verses,
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
      showToast(`⚡ Batch Complete! ${completedResults.length} Reels Generated.`)
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
        verses: [],
      }))

      const zipBlob = await createBatchZip(zipPayload, (pct) => {
        setZipProgress(pct)
      })

      const dateStr = new Date().toISOString().slice(0, 10)
      downloadBatchZip(zipBlob, `quran-reels-batch-${dateStr}.zip`)
      showToast('📦 Batch ZIP downloaded successfully!')
    } catch (err) {
      console.error('ZIP generation failed:', err)
      showToast('Failed to create ZIP package.')
    } finally {
      setZipProgress(null)
    }
  }

  // Download individual MP4
  const handleDownloadSingle = (status: BatchItemStatus) => {
    if (!status.blob) return
    const ext = status.blob.type.includes('mp4') ? 'mp4' : 'webm'
    const safeTitle = status.item.title.replace(/[^a-zA-Z0-9_-]/g, '_')
    downloadBlob(status.blob, `${safeTitle}.${ext}`)
    showToast(`Downloaded ${status.item.title}`)
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
                <div className="bulk-form-row">
                  <label className="bulk-form-group">
                    <span className="bulk-label-text">Select Surah</span>
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

                  <label className="bulk-form-group">
                    <span className="bulk-label-text">Ayahs Per Reel</span>
                    <div className="bulk-chunk-chips">
                      {[1, 2, 3, 5].map((size) => (
                        <button
                          key={size}
                          type="button"
                          className={`chip ${chunkSize === size ? 'active' : ''}`}
                          onClick={() => setChunkSize(size)}
                        >
                          {size} {size === 1 ? 'Ayah' : 'Ayahs'}
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
                    <h4 className="preset-banner-title">{RAMADAN_30_DAYS_PACK.title}</h4>
                    <p className="preset-banner-desc">{RAMADAN_30_DAYS_PACK.description}</p>
                    <span className="preset-banner-badge">30 Curated Reels Ready</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Thematic Collections */}
            {activeTab === 'themes' && (
              <div className="bulk-tab-content">
                <div className="bulk-theme-cards">
                  {THEMATIC_PACKS.map((p) => (
                    <div
                      key={p.id}
                      className={`bulk-theme-card ${selectedThemeId === p.id ? 'active' : ''}`}
                      onClick={() => setSelectedThemeId(p.id)}
                    >
                      <span className="theme-card-icon">{p.icon}</span>
                      <div className="theme-card-body">
                        <h4 className="theme-card-title">{p.title}</h4>
                        <p className="theme-card-desc">{p.description}</p>
                        <span className="theme-card-count">{p.items.length} Reels</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: Custom Verse List */}
            {activeTab === 'custom' && (
              <div className="bulk-tab-content">
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
                <span className="strategy-icon">🎨</span> Background Strategy:
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
          </div>

          {/* Live Batch Queue Dashboard */}
          <div className="bulk-queue-header">
            <div className="queue-header-left">
              <h3 className="queue-title">
                Reel Queue <span className="queue-count">({selectedCount} / {queue.length} selected)</span>
              </h3>
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
                      <span className="queue-item-sub">
                        Surah {item.surah} · {item.count} {item.count === 1 ? 'Ayah' : 'Ayahs'} {item.theme ? `· ${item.theme}` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="queue-item-right">
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
                              🎬 {statusObj.progress}%
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

        {/* Modal Footer Controls */}
        <div className="bulk-modal-footer">
          <div className="footer-left">
            {completedCount > 0 && (
              <button
                type="button"
                className="btn btn-zip-download"
                onClick={handleDownloadZip}
                disabled={zipProgress !== null}
              >
                {zipProgress !== null ? (
                  <>
                    <span className="spinner" /> Packaging ZIP ({zipProgress}%)…
                  </>
                ) : (
                  <>📦 Download All as ZIP ({completedCount} Reels)</>
                )}
              </button>
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
            ) : (
              <button
                type="button"
                className="btn btn-bulk-primary"
                onClick={handleStartBatch}
                disabled={selectedCount === 0}
              >
                🚀 Generate {selectedCount} Reels Batch
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
