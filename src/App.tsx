import { useCallback, useEffect, useMemo, useState } from 'react'
import { useReelConfig } from './hooks/useReelConfig'
import { useVerseLoader } from './hooks/useVerseLoader'
import { useExport } from './hooks/useExport'
import { buildTimeline } from './renderer/timeline'
import { loadMedia } from './lib/imageCache'
import { VersePanel } from './components/VersePanel'
import { BackgroundPanel } from './components/BackgroundPanel'
import { StylePanel } from './components/StylePanel'
import { BorderPanel } from './components/BorderPanel'
import { WaveformPanel } from './components/WaveformPanel'
import { LayoutPanel } from './components/LayoutPanel'
import { MotionPanel } from './components/MotionPanel'
import { EffectsPanel } from './components/EffectsPanel'
import { FooterPanel } from './components/FooterPanel'
import { PreviewCanvas } from './components/PreviewCanvas'
import { AboutModal } from './components/AboutModal'
import { BulkCreateModal } from './components/BulkCreateModal'
import { getRandomStockImage } from './api/unsplash'
import type { ReelConfig } from './types'
import './App.css'

type StudioTab = 'all' | 'verses' | 'media' | 'style' | 'borders' | 'motion'

function App() {
  const {
    config,
    setVerses,
    setBackgroundUrl,
    setBackgroundFit,
    setOverlayColor,
    setOverlayOpacity,
    setEffectType,
    setEffectIntensity,
    setEffectSpeed,
    setBorderType,
    setBorderColor,
    setBorderOpacity,
    setWaveformType,
    setWaveformColor,
    setWaveformOpacity,
    setArabicFont,
    setArabicSize,
    setTranslationFont,
    setTranslationSize,
    setTextPosition,
    setTextColor,
    setShowGlow,
    setShowTranslation,
    setSurahHeaderPosition,
    setSurahNameLanguage,
    setAyahPauseDelay,
    setShowBasmalah,
    setKaraokeHighlight,
    setHighlightColor,
    setSecondaryEditionId,
    setFooterEnabled,
    setFooterText,
    setFooterIcon,
    setFooterOpacity,
    setFooterFontSize,
    setMotionType,
    setDuration,
    setAspectRatio,
    applyPreset,
  } = useReelConfig()

  const verseLoader = useVerseLoader({
    initialSurah: 2,
    initialAyat: 255,
    initialEditionId: 'en.sahih',
  })

  const [image, setImage] = useState<HTMLImageElement | HTMLVideoElement | null>(null)
  const [showAbout, setShowAbout] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [activeTab, setActiveTab] = useState<StudioTab>('all')

  // Sync loaded verses into config
  useEffect(() => {
    if (verseLoader.verses.length > 0) {
      setVerses(verseLoader.verses)
    }
  }, [verseLoader.verses, setVerses])

  // Load background image or video with caching
  const loadBg = useCallback((url: string, mediaType?: 'image' | 'video') => {
    loadMedia(
      url,
      mediaType,
      (media) => setImage(media),
      () => setImage(null),
    )
  }, [])

  useEffect(() => {
    loadBg(config.background.url, config.background.mediaType)
  }, [config.background.url, config.background.mediaType, loadBg])

  const fallbackMs = config.motion.duration * 1000
  const ayahPauseMs =
    typeof config.text?.ayahPauseDelay === 'number' && config.text.ayahPauseDelay >= 0
      ? Math.round(config.text.ayahPauseDelay * 1000)
      : 1600

  const timeline = useMemo(() => {
    return buildTimeline(config.verses, null, fallbackMs, ayahPauseMs)
  }, [config.verses, fallbackMs, ayahPauseMs])

  const {
    exporting,
    exportError,
    exportProgress,
    exportFormat,
    shareToast,
    handleExportVideo,
    handleShareReel,
    handleExportPng,
  } = useExport(config, image, timeline)

  const handleRandomDiscovery = useCallback(async () => {
    const randomBg = getRandomStockImage()
    setBackgroundUrl(randomBg.full)

    const cinematicMotions: ReelConfig['motion']['type'][] = [
      'kenburns-zoom',
      'kenburns-zoom-out',
      'kenburns-pan',
      'kenburns-drift-up',
      'kenburns-drift-diagonal',
      'kenburns-pulse',
    ]
    const randomMotion = cinematicMotions[Math.floor(Math.random() * cinematicMotions.length)]
    setMotionType(randomMotion)

    await verseLoader.loadRandom(undefined, config.text.secondaryEditionId)
  }, [setBackgroundUrl, setMotionType, verseLoader, config.text.secondaryEditionId])

  const handleCustomAudioUpload = useCallback(
    (audioUrl: string) => {
      if (config.verses.length > 0) {
        const updated = config.verses.map((v, i) => (i === 0 ? { ...v, audioUrl } : v))
        setVerses(updated)
        verseLoader.setVerses(updated)
      }
    },
    [config.verses, setVerses, verseLoader],
  )

  // Current primary verse info for telemetry
  const primaryVerse = config.verses[0]
  const totalDurationSec = Math.round(timeline.totalMs / 1000)
  const durationFormatted = `${Math.floor(totalDurationSec / 60)
    .toString()
    .padStart(2, '0')}:${(totalDurationSec % 60).toString().padStart(2, '0')}`

  return (
    <div className="app studio-app">
      {/* ── Studio Top Navigation Bar ──────────────────────────── */}
      <header className="header studio-header">
        <div className="header-brand">
          <div className="brand-icon-wrapper">
            <svg
              className="header-logo-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v3M6 9h12M4 21h16M7 21v-7a5 5 0 0 1 10 0v7M12 9v5" />
            </svg>
          </div>
          <div className="brand-text-col">
            <div className="brand-title-row">
              <h1 className="brand-title">Islamic Reels Creator</h1>
              <span className="header-badge-pro">STUDIO PRO</span>
            </div>
            <span className="brand-subtitle">Quran Video Production Suite · 4K 60FPS</span>
          </div>
          <button
            type="button"
            className="sadaqah-badge"
            onClick={() => setShowAbout(true)}
            title="صدقة جارية إن شاء الله · Click to view dedication"
          >
            🤲 صدقة جارية
          </button>
        </div>

        {/* Live Studio Telemetry Bar in Header */}
        <div className="header-telemetry-pill">
          <span className="telemetry-item">
            <span className="telemetry-dot" />
            {primaryVerse ? `Surah ${primaryVerse.surah} : ${primaryVerse.ayat}` : 'Surah 2:255'}
          </span>
          <span className="telemetry-divider">·</span>
          <span className="telemetry-item">
            {config.verses.length} {config.verses.length === 1 ? 'Ayah' : 'Ayat'} ({durationFormatted})
          </span>
          <span className="telemetry-divider">·</span>
          <span className="telemetry-item reciter-pill">
            🎙️ {verseLoader.reciterId.split('-')[0].replace('_', ' ')}
          </span>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="btn-bulk-header"
            onClick={() => setShowBulkModal(true)}
            title="Bulk Reel Generator (Whole Surah, 30-Day Packs, ZIP Export)"
          >
            <span className="btn-icon">📦</span>
            Bulk Studio
          </button>
          <button
            type="button"
            className="btn-quick-export"
            onClick={handleExportVideo}
            disabled={exporting}
            title="Fast 1080p MP4 Export"
          >
            <span className="btn-icon">⚡</span>
            {exporting ? `Exporting ${exportProgress}%` : 'Quick Export'}
          </button>
          <button
            type="button"
            className="header-link about-btn"
            onClick={() => setShowAbout(true)}
          >
            About &amp; Bio
          </button>
          <a
            href="https://alquran.cloud/api"
            target="_blank"
            rel="noopener noreferrer"
            className="header-link"
          >
            Quran API
          </a>
        </div>
      </header>

      {/* ── 3-Column Studio Workspace ──────────────────────────── */}
      <div className="layout studio-layout">
        {/* ── Left Column: Studio Navigation & Controls ─────────── */}
        <aside className="sidebar studio-sidebar">
          {/* Navigation Category Tabs */}
          <div className="studio-tabs-bar">
            <button
              type="button"
              className={`studio-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              <span>✨</span> All
            </button>
            <button
              type="button"
              className={`studio-tab-btn ${activeTab === 'verses' ? 'active' : ''}`}
              onClick={() => setActiveTab('verses')}
            >
              <span>📖</span> Verses
            </button>
            <button
              type="button"
              className={`studio-tab-btn ${activeTab === 'media' ? 'active' : ''}`}
              onClick={() => setActiveTab('media')}
            >
              <span>🌌</span> Media
            </button>
            <button
              type="button"
              className={`studio-tab-btn ${activeTab === 'style' ? 'active' : ''}`}
              onClick={() => setActiveTab('style')}
            >
              <span>🌟</span> Style
            </button>
            <button
              type="button"
              className={`studio-tab-btn ${activeTab === 'borders' ? 'active' : ''}`}
              onClick={() => setActiveTab('borders')}
            >
              <span>🕌</span> Frames
            </button>
            <button
              type="button"
              className={`studio-tab-btn ${activeTab === 'motion' ? 'active' : ''}`}
              onClick={() => setActiveTab('motion')}
            >
              <span>🎥</span> Motion
            </button>
          </div>

          <div className="studio-panels-container">
            {(activeTab === 'all' || activeTab === 'verses') && (
              <VersePanel
                verses={config.verses}
                editionId={verseLoader.editionId}
                reciterId={verseLoader.reciterId}
                lockCount={verseLoader.lockCount}
                lockReciter={verseLoader.lockReciter}
                loading={verseLoader.loading}
                error={verseLoader.error}
                onLoadRange={(s, a, c, ed, r) =>
                  verseLoader.loadRange(s, a, c, ed, r, config.text.secondaryEditionId)
                }
                onLoadRandom={handleRandomDiscovery}
                onEditionChange={(ed) =>
                  verseLoader.changeEdition(ed, config.text.secondaryEditionId)
                }
                onReciterChange={(r) =>
                  verseLoader.changeReciter(r, config.text.secondaryEditionId)
                }
                onRandomizeReciter={verseLoader.randomizeReciter}
                onToggleLockCount={verseLoader.setLockCount}
                onToggleLockReciter={verseLoader.setLockReciter}
                onCountChange={verseLoader.setFixedCount}
                onUploadAudio={handleCustomAudioUpload}
              />
            )}

            {(activeTab === 'all' || activeTab === 'media') && (
              <BackgroundPanel
                url={config.background.url}
                fit={config.background.fit}
                mediaType={config.background.mediaType}
                onUrlChange={setBackgroundUrl}
                onFitChange={setBackgroundFit}
              />
            )}

            {(activeTab === 'all' || activeTab === 'style') && (
              <StylePanel
                overlayColor={config.overlay.color}
                overlayOpacity={config.overlay.opacity}
                arabicFont={config.text.arabicFont}
                arabicSize={config.text.arabicSize}
                translationFont={config.text.translationFont}
                translationSize={config.text.translationSize}
                textColor={config.text.textColor}
                showGlow={config.text.showGlow}
                showTranslation={config.text.showTranslation}
                surahHeaderPosition={config.text.surahHeaderPosition}
                surahNameLanguage={config.text.surahNameLanguage}
                ayahPauseDelay={config.text.ayahPauseDelay}
                showBasmalah={config.text.showBasmalah}
                karaokeHighlight={config.text.karaokeHighlight}
                highlightColor={config.text.highlightColor}
                secondaryEditionId={config.text.secondaryEditionId}
                onApplyPreset={applyPreset}
                onOverlayColor={setOverlayColor}
                onOverlayOpacity={setOverlayOpacity}
                onArabicFont={setArabicFont}
                onArabicSize={setArabicSize}
                onTranslationFont={setTranslationFont}
                onTranslationSize={setTranslationSize}
                onTextColor={setTextColor}
                onShowGlow={setShowGlow}
                onShowTranslation={setShowTranslation}
                onSurahHeaderPosition={setSurahHeaderPosition}
                onSurahNameLanguage={setSurahNameLanguage}
                onAyahPauseDelay={setAyahPauseDelay}
                onShowBasmalah={setShowBasmalah}
                onKaraokeHighlight={setKaraokeHighlight}
                onHighlightColor={setHighlightColor}
                onSecondaryEditionId={(id) => {
                  setSecondaryEditionId(id)
                  void verseLoader.changeSecondaryEdition(id)
                }}
              />
            )}

            {(activeTab === 'all' || activeTab === 'borders') && (
              <>
                <BorderPanel
                  borderType={config.border.type}
                  color={config.border.color}
                  opacity={config.border.opacity}
                  onBorderType={setBorderType}
                  onColor={setBorderColor}
                  onOpacity={setBorderOpacity}
                />
                <WaveformPanel
                  waveformType={config.waveform.type}
                  color={config.waveform.color}
                  opacity={config.waveform.opacity}
                  onWaveformType={setWaveformType}
                  onColor={setWaveformColor}
                  onOpacity={setWaveformOpacity}
                />
              </>
            )}

            {(activeTab === 'all' || activeTab === 'motion') && (
              <>
                <LayoutPanel
                  textPosition={config.text.textPosition}
                  aspectRatio={config.aspectRatio}
                  onTextPosition={setTextPosition}
                  onAspectRatio={setAspectRatio}
                />
                <MotionPanel
                  motionType={config.motion.type}
                  duration={config.motion.duration}
                  onMotionType={setMotionType}
                  onDuration={setDuration}
                />
                <EffectsPanel
                  effectType={config.effects.type}
                  intensity={config.effects.intensity}
                  speed={config.effects.speed}
                  onEffectType={setEffectType}
                  onIntensity={setEffectIntensity}
                  onSpeed={setEffectSpeed}
                />
                <FooterPanel
                  enabled={config.footer.enabled}
                  text={config.footer.text}
                  icon={config.footer.icon}
                  opacity={config.footer.opacity}
                  fontSize={config.footer.fontSize}
                  onEnabled={setFooterEnabled}
                  onText={setFooterText}
                  onIcon={setFooterIcon}
                  onOpacity={setFooterOpacity}
                  onFontSize={setFooterFontSize}
                />
              </>
            )}
          </div>
        </aside>

        {/* ── Center Stage: Main Canvas & Floating Controls ─────── */}
        <main className="main studio-main">
          <div className="canvas-viewport-wrapper">
            <PreviewCanvas config={config} image={image} timeline={timeline} />
          </div>
        </main>

        {/* ── Right Column: Studio Pro Inspector & Export Toolbar ─ */}
        <aside className="studio-inspector">
          <div className="inspector-header">
            <h2 className="inspector-title">Inspector</h2>
            <span className="inspector-sub">Quality &amp; Export</span>
          </div>

          <div className="inspector-content">
            {/* Video Quality Card */}
            <div className="inspector-card">
              <h3 className="inspector-card-title">Video Quality</h3>
              <div className="inspector-field">
                <label>Resolution</label>
                <select className="inspector-select" defaultValue="1080x1920">
                  <option value="1080x1920">1080x1920 (HD Reel · 9:16)</option>
                  <option value="2160x3840">2160x3840 (4K Ultra HD · 9:16)</option>
                </select>
              </div>
              <div className="inspector-row">
                <span>60 FPS Smooth Render</span>
                <span className="badge-emerald">Active</span>
              </div>
              <div className="inspector-row">
                <span>Audio Codec</span>
                <span className="badge-dim">AAC Stereo 320k</span>
              </div>
              <div className="inspector-row">
                <span>Video Codec</span>
                <span className="badge-dim">H.264 (MP4)</span>
              </div>
            </div>

            {/* Project Stats Telemetry Card */}
            <div className="inspector-card">
              <h3 className="inspector-card-title">Project Telemetry</h3>
              <div className="telemetry-grid">
                <div className="telemetry-stat">
                  <span className="stat-label">Duration</span>
                  <span className="stat-value font-mono">{durationFormatted}</span>
                </div>
                <div className="telemetry-stat">
                  <span className="stat-label">Total Ayat</span>
                  <span className="stat-value font-mono">{config.verses.length}</span>
                </div>
                <div className="telemetry-stat">
                  <span className="stat-label">Particles</span>
                  <span className="stat-value">{config.effects.type !== 'none' ? '✨ Active' : 'Off'}</span>
                </div>
                <div className="telemetry-stat">
                  <span className="stat-label">Frame</span>
                  <span className="stat-value">{config.border.type !== 'none' ? '🕌 Active' : 'None'}</span>
                </div>
              </div>
              <div className="status-row">
                <span className="status-indicator-dot" />
                <span className="status-text">Hardware Acceleration: Ready</span>
              </div>
            </div>

            {/* Error Message if any */}
            {exportError && <p className="error inspector-error">{exportError}</p>}

            {/* Export Command Center */}
            <div className="inspector-actions">
              <button
                id="share-reel-btn"
                type="button"
                className="btn btn-share-primary"
                onClick={handleShareReel}
                disabled={exporting}
                title="Direct share to Instagram Stories, TikTok, WhatsApp or copy caption"
              >
                <span className="export-icon">📲</span>
                {exporting ? `Rendering… ${exportProgress}%` : 'Share Reel to Socials'}
              </button>

              <div className="export-btn-wrap">
                <button
                  id="export-video-btn"
                  type="button"
                  className="btn btn-export-primary"
                  onClick={handleExportVideo}
                  disabled={exporting}
                >
                  <span className="export-icon">⚡</span>
                  {exporting
                    ? `Exporting Reel… ${exportProgress}%`
                    : `Download ${exportFormat.toUpperCase()} Reel`}
                </button>
                {exporting && (
                  <div
                    className="export-progress-bar"
                    style={{ width: `${exportProgress}%` }}
                  />
                )}
              </div>

              <button
                id="export-png-btn"
                type="button"
                className="btn btn-export-secondary"
                onClick={handleExportPng}
                disabled={exporting}
              >
                Download 4K PNG Frame
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* ── Studio Footer ──────────────────────────────────────── */}
      <footer className="app-footer studio-footer">
        <div className="footer-content">
          <p>
            © {new Date().getFullYear()} Islamic Reels Creator Studio · Built for Quran Dawah &amp; Reminders (
            <button
              type="button"
              onClick={() => setShowAbout(true)}
              className="footer-bio-link"
            >
              صدقة جارية إن شاء الله
            </button>
            )
          </p>
          <div className="footer-social-links">
            <span className="footer-tag">HD 60FPS</span>
            <span className="footer-tag">AAC Audio</span>
            <span className="footer-tag">H.264 MP4</span>
            <span className="footer-tag badge-gold">Studio Pro</span>
          </div>
        </div>
      </footer>

      {/* ── Sadaqah Jariyah & Bio Modal ────────────────────────── */}
      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />

      {/* ── Bulk Reel Generator & Batch Studio Modal ────────────── */}
      <BulkCreateModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        baseConfig={config}
        editionId={verseLoader.editionId}
        reciterId={verseLoader.reciterId}
      />

      {/* ── Share & Action Toast Notification ───────────────────── */}
      {shareToast && (
        <div className="share-toast-banner" role="status">
          <span className="toast-icon">✨</span>
          <span className="toast-text">{shareToast}</span>
        </div>
      )}
    </div>
  )
}

export default App
