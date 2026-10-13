import React, { useState, useEffect } from 'react'
import { useStudio } from '../publisher/context/StudioContext'
import type { ExportQualityPreset, ExportOptions, ReelConfig } from '../types'
import { buildUploaderCliCommand } from '../lib/exportDestination'

interface AutoUploadDockProps {
  exporting: boolean
  exportProgress: number
  exportPreset: ExportQualityPreset
  exportOptions: ExportOptions
  onExportPresetChange: (preset: ExportQualityPreset) => void
  lastSaveResult: {
    savedTo: 'native' | 'web'
    path: string
    folderPath?: string
    cliCommand?: string
    message: string
  } | null
  lastExportedBlob?: {
    blob: Blob
    filename: string
  } | null
  config: ReelConfig
  totalDurationFormatted: string
  onSwitchToPublisher: () => void
  onExportNow: () => void
  onShareReel?: () => void
  onExportPng?: () => void
}

export const AutoUploadDock: React.FC<AutoUploadDockProps> = ({
  exporting,
  exportProgress,
  exportPreset,
  exportOptions,
  onExportPresetChange,
  lastSaveResult,
  lastExportedBlob,
  config: _config,
  totalDurationFormatted,
  onSwitchToPublisher,
  onExportNow,
  onShareReel,
  onExportPng,
}) => {
  const {
    reels,
    pages,
    scheduleReelsBulk,
    publishReelsNow,
    showToast,
  } = useStudio()

  const [copiedCmd, setCopiedCmd] = useState(false)
  const [selectedPageId, setSelectedPageId] = useState<string>('')
  const [scheduleMode, setScheduleMode] = useState<'prayer' | 'interval' | 'now'>('prayer')
  const [publishing, setPublishing] = useState(false)
  const [activeReelId, setActiveReelId] = useState<string | null>(null)
  const [discoveredPacks, setDiscoveredPacks] = useState<Array<{
    name: string
    folderPath: string
    videoCount: number
    hasManifest: boolean
    updatedAt?: string | null
    updatedFormatted?: string | null
    updatedFullDate?: string | null
    timeAgo?: string | null
    batchDate?: string | null
  }>>([])
  const [showAllPacks, setShowAllPacks] = useState(false)

  // Fetch discovered export packs from server
  useEffect(() => {
    fetch('/api/export-packs')
      .then((res) => res.json())
      .then((data) => {
        if (data?.packs) {
          setDiscoveredPacks(data.packs)
        }
      })
      .catch(() => {})
  }, [lastSaveResult])

  // Default to first connected page
  useEffect(() => {
    if (!selectedPageId && pages.length > 0) {
      setSelectedPageId(pages[0].id)
    }
  }, [pages, selectedPageId])

  // Automatically arm the upload dock whenever an export completes
  useEffect(() => {
    if (lastExportedBlob?.blob || lastSaveResult?.path) {
      // Link to the reel ingested by the studio context
      const filename = lastSaveResult?.path ? lastSaveResult.path.split('/').pop() : lastExportedBlob?.filename;
      const match = reels.find((r) => (filename && r.filename === filename) || r.id.startsWith('canvas-')) || reels[0];
      if (match) {
        setActiveReelId(match.id);
      }
    }
  }, [lastSaveResult, lastExportedBlob, reels]);

  const activeReel = reels.find((r) => r.id === activeReelId) || reels[0] || null

  const handleCopyCli = () => {
    const cmd = lastSaveResult?.cliCommand || (lastSaveResult?.path ? buildUploaderCliCommand({ filePath: lastSaveResult.path }) : 'python3 scripts/bulk_uploader.py --dry-run')
    navigator.clipboard.writeText(cmd)
    setCopiedCmd(true)
    showToast('📋 Copied CLI Command to clipboard!', 'info')
    setTimeout(() => setCopiedCmd(false), 2500)
  }

  const handle1ClickSchedule = async () => {
    if (!activeReel) {
      showToast('Export a reel first to schedule!', 'warning')
      return
    }

    setPublishing(true)
    try {
      if (scheduleMode === 'now') {
        await publishReelsNow([activeReel.id])
        showToast('🎉 Publishing to Meta Graph API...', 'success')
      } else {
        const now = new Date()
        const startDate = now.toISOString().split('T')[0]
        const startTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

        // 180 min interval or prayer slot calculation
        const interval = scheduleMode === 'prayer' ? 240 : 180
        await scheduleReelsBulk([activeReel.id], startDate, startTime, interval, ['facebook', 'instagram'], true, selectedPageId)
        showToast('🕌 Successfully scheduled reel on Meta Cloud!', 'success')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Scheduling failed'
      showToast(`Error: ${msg}`, 'error')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <aside className="auto-upload-dock">
      {/* Dock Header */}
      <div className="dock-header">
        <div className="dock-title-col">
          <div className="dock-title-row">
            <span className="dock-icon-glow">🚀</span>
            <h2 className="dock-title">Upload &amp; Publish Dock</h2>
          </div>
          <span className="dock-subtitle">Direct Meta Graph API Bridge</span>
        </div>

        {/* Status Pill */}
        <div className={`dock-status-pill ${activeReel ? 'status-armed' : exporting ? 'status-busy' : 'status-idle'}`}>
          <span className="status-indicator-dot" />
          <span>
            {exporting
              ? `Rendering ${exportProgress}%`
              : activeReel
                ? 'Ready for Meta'
                : 'Standby'}
          </span>
        </div>
      </div>

      <div className="dock-scroll-container">
        {/* Active Reel Armed Card */}
        {activeReel ? (
          <div className="armed-reel-card">
            <div className="armed-reel-header">
              <span className="badge-armed-pulse">ARMED &amp; QUEUED</span>
              <span className="armed-reel-size">{activeReel.fileSizeMb || 12} MB · MP4</span>
            </div>

            <div className="armed-reel-body">
              <h4 className="armed-reel-title">{activeReel.title}</h4>
              <p className="armed-reel-meta">
                <span>⏱️ {totalDurationFormatted}</span>
                <span>•</span>
                <span>📐 {activeReel.resolution || '1080x1920'}</span>
                <span>•</span>
                <span>🎬 {activeReel.fps || 30} FPS</span>
              </p>
            </div>

            {/* Target Meta Page Selector */}
            <div className="dock-control-group">
              <label className="dock-label">
                <span>Destination Page (Meta)</span>
                {pages.length > 0 && <span className="text-emerald font-mono">● LIVE</span>}
              </label>
              <select
                className="dock-select"
                value={selectedPageId}
                onChange={(e) => setSelectedPageId(e.target.value)}
              >
                {pages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.category})
                  </option>
                ))}
                {pages.length === 0 && (
                  <option value="">Noor Al-Quran - نُور القُرآن (109823471829301)</option>
                )}
              </select>
            </div>

            {/* Schedule Mode Radio Buttons */}
            <div className="dock-control-group">
              <label className="dock-label">Schedule Mode</label>
              <div className="dock-radio-grid">
                <button
                  type="button"
                  className={`dock-radio-btn ${scheduleMode === 'prayer' ? 'active' : ''}`}
                  onClick={() => setScheduleMode('prayer')}
                >
                  <span className="radio-icon">🕌</span>
                  <span>Prayer Times</span>
                </button>
                <button
                  type="button"
                  className={`dock-radio-btn ${scheduleMode === 'interval' ? 'active' : ''}`}
                  onClick={() => setScheduleMode('interval')}
                >
                  <span className="radio-icon">⏰</span>
                  <span>3h Drops</span>
                </button>
                <button
                  type="button"
                  className={`dock-radio-btn ${scheduleMode === 'now' ? 'active' : ''}`}
                  onClick={() => setScheduleMode('now')}
                >
                  <span className="radio-icon">⚡</span>
                  <span>Now</span>
                </button>
              </div>
            </div>

            {/* Direct 1-Click Action Buttons */}
            <div className="armed-actions-col">
              <button
                type="button"
                className="btn-dock-primary"
                onClick={handle1ClickSchedule}
                disabled={publishing}
              >
                {publishing ? (
                  <>
                    <span className="spinner-dock" /> Dispatching to Meta...
                  </>
                ) : scheduleMode === 'now' ? (
                  <>
                    <span>⚡</span>
                    <span>Publish Immediately to Meta</span>
                  </>
                ) : (
                  <>
                    <span>🕌</span>
                    <span>1-Click Pre-Schedule Reel</span>
                  </>
                )}
              </button>

              <button
                type="button"
                className="btn-dock-secondary"
                onClick={onSwitchToPublisher}
              >
                <span>📅</span>
                <span>Open in Full Scheduler ({reels.length} Reels in Queue)</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="dock-standby-card">
            <div className="standby-icon">✨</div>
            <h4 className="standby-title">Instant Upload Pipeline</h4>
            <p className="standby-desc">
              Whenever you render a 1080p MP4 or bulk batch, this dock automatically arms with your video, Meta credentials, and prayer-time scheduler.
            </p>
            <button
              type="button"
              className="btn-dock-primary"
              onClick={onExportNow}
              disabled={exporting}
            >
              <span>⚡</span>
              <span>{exporting ? `Rendering ${exportProgress}%...` : 'Export Reel to Arm Pipeline'}</span>
            </button>
          </div>
        )}

        {/* Quality Preset & Telemetry Section */}
        <div className="dock-section-card">
          <div className="dock-section-header">
            <h4 className="dock-section-title">Video Quality Preset</h4>
            <span className="badge-emerald-compact">{exportOptions.fps || 30} FPS</span>
          </div>

          <select
            className="dock-select"
            value={exportPreset}
            onChange={(e) => onExportPresetChange(e.target.value as ExportQualityPreset)}
          >
            <option value="instagram-fb">⭐ Instagram &amp; Facebook (1080p · 30fps · 10M)</option>
            <option value="smooth-60fps">🎬 Smooth 60 FPS (1080p · 60fps · 14M)</option>
            <option value="4k-master">👑 4K Master Ultra (2160x3840 · 30fps · 30M)</option>
            <option value="compact">⚡ Compact Share (1080p · 30fps · 6M)</option>
          </select>

          <div className="telemetry-compact-grid">
            <div className="telemetry-pill">
              <span className="pill-k">Bitrate</span>
              <span className="pill-v">{Math.round((exportOptions.bitrate ?? 10_000_000) / 1_000_000)} Mbps</span>
            </div>
            <div className="telemetry-pill">
              <span className="pill-k">Audio</span>
              <span className="pill-v">AAC 320k</span>
            </div>
            <div className="telemetry-pill">
              <span className="pill-k">Codec</span>
              <span className="pill-v">H.264 MP4</span>
            </div>
            <div className="telemetry-pill">
              <span className="pill-k">Length</span>
              <span className="pill-v">{totalDurationFormatted}</span>
            </div>
          </div>

          {(onShareReel || onExportPng) && (
            <div className="dock-aux-actions">
              {onShareReel && (
                <button
                  type="button"
                  className="btn-dock-aux"
                  onClick={onShareReel}
                  disabled={exporting}
                  title="Share to socials (Instagram, TikTok, WhatsApp)"
                >
                  <span>📲</span>
                  <span>Share Reel</span>
                </button>
              )}
              {onExportPng && (
                <button
                  type="button"
                  className="btn-dock-aux"
                  onClick={onExportPng}
                  disabled={exporting}
                  title="Save current frame as 4K PNG"
                >
                  <span>🖼️</span>
                  <span>4K PNG</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Discovered Export Folders & Batches */}
        {discoveredPacks.length > 0 && (
          <div className="dock-section-card">
            <div className="dock-section-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.9rem' }}>📁</span>
                <h4 className="dock-section-title">Export Folders ({discoveredPacks.length})</h4>
              </div>
              <button
                type="button"
                className="text-[10px] text-emerald-400 hover:text-emerald-300 font-mono transition-colors"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#34d399' }}
                onClick={() => setShowAllPacks((prev) => !prev)}
              >
                {showAllPacks ? 'Show Less' : `View All (${discoveredPacks.length})`}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px' }}>
              {(showAllPacks ? discoveredPacks : discoveredPacks.slice(0, 3)).map((pack) => (
                <div
                  key={pack.folderPath}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '10px',
                    background: 'rgba(0, 0, 0, 0.45)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.75rem', color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={pack.name}>
                      {pack.name}
                    </span>
                    <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      🎬 {pack.videoCount}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px', fontSize: '0.68rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} title={pack.updatedFullDate || pack.updatedAt || ''}>
                      <span style={{ color: '#34d399' }}>🕒</span>
                      <span style={{ color: '#e2e8f0' }}>{pack.updatedFormatted || 'Recently'}</span>
                      {pack.timeAgo && (
                        <span style={{ color: '#34d399', fontWeight: 600 }}>({pack.timeAgo})</span>
                      )}
                    </div>

                    {pack.batchDate && (
                      <span style={{ color: '#fbbf24', background: 'rgba(245, 158, 11, 0.15)', padding: '1px 5px', borderRadius: '4px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                        📅 {pack.batchDate}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <button
                      type="button"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-emerald-light, #10b981)',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      onClick={onSwitchToPublisher}
                    >
                      <span>Manage in Publisher</span>
                      <span>➔</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CLI Terminal Command Section */}
        <div className="dock-section-card">
          <div className="dock-section-header">
            <h4 className="dock-section-title">Python CLI Toolkit</h4>
            <button
              type="button"
              className="btn-dock-copy"
              onClick={handleCopyCli}
            >
              {copiedCmd ? '✅ Copied' : '📋 Copy CLI'}
            </button>
          </div>
          <div className="cli-code-box">
            <code>
              {lastSaveResult?.cliCommand || (lastSaveResult?.path ? buildUploaderCliCommand({ filePath: lastSaveResult.path }) : 'python3 scripts/bulk_uploader.py --dry-run')}
            </code>
          </div>
        </div>
      </div>
    </aside>
  )
}
export default AutoUploadDock
