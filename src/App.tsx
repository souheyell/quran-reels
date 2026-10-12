import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { CountdownPanel } from './components/CountdownPanel'
import { RecipeModal } from './components/RecipeModal'
import { FooterPanel } from './components/FooterPanel'
import { PreviewCanvas } from './components/PreviewCanvas'
import { AboutModal } from './components/AboutModal'
import { BulkCreateModal } from './components/BulkCreateModal'
import { QuickWizardModal } from './components/QuickWizardModal'
import { AutoUploadDock } from './components/AutoUploadDock'
import { getRandomStockImage } from './api/unsplash'
import { loadSavedCustomFonts } from './lib/customFonts'
import { getVaultMediaLiveUrl } from './lib/mediaDB'
import {
  encodeRecipe,
  decodeRecipe,
  computeShortHash,
  generateRecipeSummary,
  type DecodedRecipe,
} from './lib/recipeEngine'
import { addGenerationToHistory } from './lib/storage'
import { Play, Pause } from 'lucide-react'
import { useStudio } from './publisher/context/StudioContext'
import { OverviewStudio } from './publisher/components/dashboard/OverviewStudio'
import { ReelQueueGrid } from './publisher/components/queue/ReelQueueGrid'
import { ReelDetailDrawer } from './publisher/components/queue/ReelDetailDrawer'
import { CreateBatchModal } from './publisher/components/batches/CreateBatchModal'
import { FacebookPagesView } from './publisher/components/pages/FacebookPagesView'
import { ConnectPageModal } from './publisher/components/pages/ConnectPageModal'
import { FetchPagesModal } from './publisher/components/pages/FetchPagesModal'
import { SchedulingCalendar } from './publisher/components/scheduling/SchedulingCalendar'
import { FailureDiagnosticsModal } from './publisher/components/history/FailureDiagnosticsModal'
import { BulkCaptionModal } from './publisher/components/modals/BulkCaptionModal'
import { BulkScheduleModal } from './publisher/components/modals/BulkScheduleModal'
import { PublishReelModal } from './publisher/components/modals/PublishReelModal'
import { LocalFileExplorerModal } from './publisher/components/modals/LocalFileExplorerModal'
import { ExportPacksView } from './components/ExportPacksView'
import { Toast } from './publisher/components/shared/Toast'
import type { ReelConfig } from './types'
import './App.css'

type StudioTab = 'verses' | 'media' | 'typography' | 'effects'
export type StudioWorkflow =
  | 'creator'
  | 'bulk'
  | 'queue'
  | 'schedule'
  | 'exports'
  | 'pages'
  | 'dashboard'

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
    setShowReflectionCard,
    setReflectionText,
    setLayoutMode,
    setMushafTheme,
    setMushafGlowIntensity,
    setCountdownEnabled,
    setCountdownStyle,
    setCountdownPosition,
    setCountdownColor,
    setCountdownShowTotal,
    setCountdownOpacity,
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

  const studio = useStudio()
  const {
    reels,
    pages,
    isWorkerRunning,
    toggleWorker,
    activeTab: publisherActiveTab,
    setActiveTab: setPublisherActiveTab,
    addReels,
  } = studio

  const [workflowMode, setWorkflowMode] = useState<StudioWorkflow>(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const tabParam = params.get('tab') as StudioWorkflow
      if (tabParam && ['creator', 'bulk', 'queue', 'schedule', 'exports', 'pages', 'dashboard'].includes(tabParam)) {
        return tabParam
      }
    } catch {}
    return 'creator'
  })

  const lastPublisherActiveTabRef = useRef(publisherActiveTab)

  const handleSwitchWorkflow = useCallback(
    (mode: StudioWorkflow) => {
      setWorkflowMode(mode)
      if (mode === 'queue') {
        lastPublisherActiveTabRef.current = 'queue'
        setPublisherActiveTab('queue')
      } else if (mode === 'schedule') {
        lastPublisherActiveTabRef.current = 'schedule'
        setPublisherActiveTab('schedule')
      } else if (mode === 'exports') {
        lastPublisherActiveTabRef.current = 'exports'
        setPublisherActiveTab('exports')
      } else if (mode === 'pages') {
        lastPublisherActiveTabRef.current = 'pages'
        setPublisherActiveTab('pages')
      } else if (mode === 'dashboard') {
        lastPublisherActiveTabRef.current = 'dashboard'
        setPublisherActiveTab('dashboard')
      }
    },
    [setPublisherActiveTab],
  )

  // Sync only when publisherActiveTab was explicitly changed internally by a child component
  useEffect(() => {
    if (lastPublisherActiveTabRef.current !== publisherActiveTab) {
      lastPublisherActiveTabRef.current = publisherActiveTab
      if (publisherActiveTab === 'queue') {
        setWorkflowMode('queue')
      } else if (publisherActiveTab === 'schedule') {
        setWorkflowMode('schedule')
      } else if (publisherActiveTab === 'exports') {
        setWorkflowMode('exports')
      } else if (publisherActiveTab === 'pages') {
        setWorkflowMode('pages')
      } else if (
        publisherActiveTab === 'dashboard' ||
        publisherActiveTab === 'batches' ||
        publisherActiveTab === 'history' ||
        publisherActiveTab === 'settings' ||
        publisherActiveTab === 'upload'
      ) {
        setWorkflowMode('dashboard')
      }
    }
  }, [publisherActiveTab])

  const verseLoader = useVerseLoader({
    initialSurah: 2,
    initialAyat: 255,
    initialEditionId: 'en.sahih',
  })

  const [image, setImage] = useState<HTMLImageElement | HTMLVideoElement | null>(null)
  const [showAbout, setShowAbout] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      return params.get('modal') === 'bulk' || params.get('tab') === 'bulk'
    } catch {
      return false
    }
  })
  const [showRecipeModal, setShowRecipeModal] = useState(false)
  const [showQuickWizard, setShowQuickWizard] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      return params.get('modal') === 'wizard'
    } catch {
      return false
    }
  })
  const [activeTab, setActiveTab] = useState<StudioTab>('verses')

  // Re-register saved custom fonts on app boot
  useEffect(() => {
    void loadSavedCustomFonts()
  }, [])

  // Re-hydrate custom background footage from IndexedDB vault if saved
  useEffect(() => {
    if (config.background.vaultMediaId) {
      void getVaultMediaLiveUrl(config.background.vaultMediaId).then((liveUrl) => {
        if (liveUrl && liveUrl !== config.background.url) {
          setBackgroundUrl(liveUrl, config.background.mediaType, config.background.vaultMediaId)
        }
      })
    }
  }, [])

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
    exportProgress,
    shareToast,
    exportPreset,
    exportOptions,
    setExportPreset,
    handleExportVideo,
    handleShareReel,
    handleExportPng,
    lastExportedBlob,
    lastSaveResult,
  } = useExport(config, image, timeline)

  // Seamless integration: automatically ingest Canvas-exported reel into Publisher Queue
  useEffect(() => {
    if (lastExportedBlob?.blob) {
      const first = config.verses[0]
      const last = config.verses[config.verses.length - 1]
      const surahNum = first?.surah || 1
      const surahName = first?.surahName || 'Quran'
      const ayahRange = config.verses.length > 1 ? `${first?.ayat || 1} - ${last?.ayat || 1}` : `${first?.ayat || 1}`
      const filename = lastExportedBlob.filename || `reel_${surahNum}_${Date.now()}.mp4`
      const defaultPageIds = pages.length > 0 ? [pages[0].id] : ['fb-page-ajr']
      const caption = config.verses.map((v) => v.translation).join(' ')

      addReels([
        {
          id: `canvas-${Date.now()}`,
          filename,
          title: `Surah ${surahName} (${ayahRange})`,
          surahNumber: surahNum,
          surahName,
          ayahRange,
          reciterName: verseLoader.reciterId.split('-')[0].replace('_', ' '),
          durationSeconds: Math.round(timeline.totalMs / 1000),
          resolution: config.aspectRatio === '9:16' ? '1080x1920' : '1080x1080',
          fps: 60,
          codec: 'H.264 (MP4)',
          fileSizeMb: Number((lastExportedBlob.blob.size / (1024 * 1024)).toFixed(1)),
          status: 'READY',
          uploadProgress: 0,
          captionArabic: config.verses.map((v) => v.arabic).join(' ۝ '),
          captionEnglish: caption,
          hashtags: ['#Quran', '#IslamicReels', `#Surah${surahName.replace(/[^a-zA-Z0-9]/g, '')}`, '#Tilawah', '#Ajr'],
          targetPageIds: defaultPageIds,
          targetPlatforms: ['facebook', 'instagram'],
          audioLufs: -14.0,
          audioNormalized: true,
          videoValid: true,
          resolutionValid: true,
          durationValid: true,
          videoFile: lastExportedBlob.blob,
          videoUrl: URL.createObjectURL(lastExportedBlob.blob),
          createdAt: new Date().toISOString(),
        },
      ])
    }
  }, [lastExportedBlob])

  const handleRestoreRecipe = useCallback(
    async (recipe: DecodedRecipe) => {
      // 1. Apply config preset
      applyPreset({
        id: 'restored-recipe',
        name: recipe.name || 'Restored Recipe',
        icon: '🔖',
        description: 'Restored from recipe code',
        category: 'Mosques & Holy Sites',
        config: recipe.config,
      })

      // 2. Set background
      if (recipe.config.background?.url) {
        setBackgroundUrl(recipe.config.background.url, recipe.config.background.mediaType)
      }

      // 3. Set text styles
      if (recipe.config.text) {
        if (recipe.config.text.arabicFont) setArabicFont(recipe.config.text.arabicFont)
        if (recipe.config.text.arabicSize) setArabicSize(recipe.config.text.arabicSize)
        if (recipe.config.text.translationFont) setTranslationFont(recipe.config.text.translationFont)
        if (recipe.config.text.translationSize) setTranslationSize(recipe.config.text.translationSize)
        if (recipe.config.text.textColor) setTextColor(recipe.config.text.textColor)
        if (recipe.config.text.textPosition) setTextPosition(recipe.config.text.textPosition)
        if (typeof recipe.config.text.showGlow === 'boolean') setShowGlow(recipe.config.text.showGlow)
        if (typeof recipe.config.text.showTranslation === 'boolean') setShowTranslation(recipe.config.text.showTranslation)
        if (recipe.config.text.surahHeaderPosition) setSurahHeaderPosition(recipe.config.text.surahHeaderPosition)
        if (recipe.config.text.surahNameLanguage) setSurahNameLanguage(recipe.config.text.surahNameLanguage)
        if (typeof recipe.config.text.ayahPauseDelay === 'number') setAyahPauseDelay(recipe.config.text.ayahPauseDelay)
        if (typeof recipe.config.text.showBasmalah === 'boolean') setShowBasmalah(recipe.config.text.showBasmalah)
        if (typeof recipe.config.text.karaokeHighlight === 'boolean') setKaraokeHighlight(recipe.config.text.karaokeHighlight)
        if (recipe.config.text.highlightColor) setHighlightColor(recipe.config.text.highlightColor)
        if (recipe.config.text.secondaryEditionId) setSecondaryEditionId(recipe.config.text.secondaryEditionId)
        if (typeof recipe.config.text.showReflectionCard === 'boolean') setShowReflectionCard(recipe.config.text.showReflectionCard)
        if (recipe.config.text.reflectionText) setReflectionText(recipe.config.text.reflectionText)
      }

      // 4. Set countdown
      if (recipe.config.countdown) {
        if (typeof recipe.config.countdown.enabled === 'boolean') setCountdownEnabled(recipe.config.countdown.enabled)
        if (recipe.config.countdown.style) setCountdownStyle(recipe.config.countdown.style)
        if (recipe.config.countdown.position) setCountdownPosition(recipe.config.countdown.position)
        if (recipe.config.countdown.color) setCountdownColor(recipe.config.countdown.color)
        if (typeof recipe.config.countdown.showTotalTime === 'boolean') setCountdownShowTotal(recipe.config.countdown.showTotalTime)
        if (typeof recipe.config.countdown.opacity === 'number') setCountdownOpacity(recipe.config.countdown.opacity)
      }

      // 5. Load verses
      if (recipe.surah && recipe.startAyat && recipe.ayahCount) {
        await verseLoader.loadRange(
          recipe.surah,
          recipe.startAyat,
          recipe.ayahCount,
          recipe.editionId || verseLoader.editionId,
          recipe.reciterId || verseLoader.reciterId,
          recipe.secondaryEditionId,
        )
      } else if (recipe.config.verses && recipe.config.verses.length > 0) {
        setVerses(recipe.config.verses)
        verseLoader.setVerses(recipe.config.verses)
      }
    },
    [
      applyPreset,
      setBackgroundUrl,
      setArabicFont,
      setArabicSize,
      setTranslationFont,
      setTranslationSize,
      setTextColor,
      setTextPosition,
      setShowGlow,
      setShowTranslation,
      setSurahHeaderPosition,
      setSurahNameLanguage,
      setAyahPauseDelay,
      setShowBasmalah,
      setKaraokeHighlight,
      setHighlightColor,
      setSecondaryEditionId,
      setShowReflectionCard,
      setReflectionText,
      setCountdownEnabled,
      setCountdownStyle,
      setCountdownPosition,
      setCountdownColor,
      setCountdownShowTotal,
      setCountdownOpacity,
      setVerses,
      verseLoader,
    ],
  )

  // Auto-load recipe from URL parameter on initial mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const recipeParam = params.get('recipe')
      if (recipeParam) {
        const decoded = decodeRecipe(recipeParam)
        if (decoded) {
          void handleRestoreRecipe(decoded)
        }
      }
    }
  }, [handleRestoreRecipe])

  // Automatically snapshot creative generations into history
  useEffect(() => {
    if (config.verses.length > 0) {
      const code = encodeRecipe(config, verseLoader.reciterId, verseLoader.editionId)
      const shortHash = computeShortHash(code)
      const primaryVerse = config.verses[0]
      const summary = generateRecipeSummary({
        surah: primaryVerse?.surah,
        startAyat: primaryVerse?.ayat,
        ayahCount: config.verses.length,
        reciterId: verseLoader.reciterId,
        config,
      })

      addGenerationToHistory({
        id: `snap_${Date.now()}_${shortHash}`,
        name: summary,
        code,
        shortHash,
        createdAt: Date.now(),
        surah: primaryVerse?.surah || 2,
        startAyat: primaryVerse?.ayat || 255,
        ayahCount: config.verses.length,
        reciterId: verseLoader.reciterId,
        editionId: verseLoader.editionId,
        secondaryEditionId: config.text.secondaryEditionId,
        config,
      })
    }
  }, [
    config.verses,
    config.background.url,
    config.effects.type,
    config.motion.type,
    config.countdown?.enabled,
    config.countdown?.style,
    verseLoader.reciterId,
    verseLoader.editionId,
  ])

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

  const currentRecipeShortHash = useMemo(() => {
    const code = encodeRecipe(config, verseLoader.reciterId, verseLoader.editionId)
    return computeShortHash(code)
  }, [config, verseLoader.reciterId, verseLoader.editionId])

  return (
    <div className="app studio-app">
      {/* ── Studio Top Navigation Bar (Unified All-in-One Command Center) ── */}
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
              <h1 className="brand-title">Noor Studio</h1>
              <span className="header-badge-pro">PRO</span>
            </div>
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

        {/* ── Unified Workflow Navigation Bar (Segmented Tabs) ──────────── */}
        <nav className="studio-unified-nav" aria-label="Studio Workflows">
          <button
            type="button"
            className={`workflow-tab-btn ${workflowMode === 'creator' ? 'active' : ''}`}
            onClick={() => handleSwitchWorkflow('creator')}
            title="Interactive 9:16 Canvas Studio (Verses, Audio, Motion, Effects, 4K Export)"
          >
            <span className="tab-icon">🎨</span>
            <span className="tab-label">Canvas Studio</span>
          </button>

          <button
            type="button"
            className={`workflow-tab-btn ${workflowMode === 'bulk' ? 'active' : ''}`}
            onClick={() => handleSwitchWorkflow('bulk')}
            title="Bulk Batch Generator (Ramadan 30-Day Pack, Whole Surah Split, Thematic Packs)"
          >
            <span className="tab-icon">⚡</span>
            <span className="tab-label">Bulk Generator</span>
          </button>

          <button
            type="button"
            className={`workflow-tab-btn ${workflowMode === 'queue' ? 'active' : ''}`}
            onClick={() => handleSwitchWorkflow('queue')}
            title="Publisher Reel Queue (Audio Loudness Normalization, Captions & Meta Publishing)"
          >
            <span className="tab-icon">📋</span>
            <span className="tab-label">Queue</span>
            {reels.length > 0 && (
              <span className="tab-badge badge-glow">{reels.length}</span>
            )}
          </button>

          <button
            type="button"
            className={`workflow-tab-btn ${workflowMode === 'schedule' ? 'active' : ''}`}
            onClick={() => handleSwitchWorkflow('schedule')}
            title="1-Click Prayer Times Scheduling Engine (Fajr, Dhuhr, Asr, Maghrib, Isha)"
          >
            <span className="tab-icon">📅</span>
            <span className="tab-label">Scheduler</span>
          </button>

          <button
            type="button"
            className={`workflow-tab-btn ${workflowMode === 'exports' ? 'active' : ''}`}
            onClick={() => handleSwitchWorkflow('exports')}
            title="Export Packs & Disk Library (Full Timestamps, Relative Dates, 1-Click Ingest)"
          >
            <span className="tab-icon">📁</span>
            <span className="tab-label">Export Packs</span>
          </button>

          <button
            type="button"
            className={`workflow-tab-btn ${workflowMode === 'pages' ? 'active' : ''}`}
            onClick={() => handleSwitchWorkflow('pages')}
            title="Connected Facebook Pages & Meta Accounts"
          >
            <span className="tab-icon">📱</span>
            <span className="tab-label">Meta Channels</span>
            {pages.length > 0 && <span className="tab-badge-subtle">{pages.length}</span>}
          </button>

          <button
            type="button"
            className={`workflow-tab-btn ${workflowMode === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleSwitchWorkflow('dashboard')}
            title="Publishing Performance Dashboard & Telemetry"
          >
            <span className="tab-icon">📊</span>
            <span className="tab-label">Overview</span>
          </button>
        </nav>

        {/* Live Studio Telemetry Bar in Header */}
        {workflowMode === 'creator' ? (
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
        ) : (
          <div className="header-telemetry-pill">
            <span className="telemetry-item">
              <span
                className={`telemetry-dot ${isWorkerRunning ? 'animate-pulse' : ''}`}
                style={{ backgroundColor: isWorkerRunning ? '#10B981' : '#F59E0B' }}
              />
              Engine: {isWorkerRunning ? 'LIVE' : 'PAUSED'}
            </span>
            <span className="telemetry-divider">·</span>
            <span className="telemetry-item">
              {pages.filter((p) => p.status === 'CONNECTED').length} Pages Active
            </span>
            <span className="telemetry-divider">·</span>
            <span className="telemetry-item" style={{ color: '#34D399' }}>
              Bridge 3001
            </span>
          </div>
        )}

        <div className="header-actions">
          {workflowMode === 'creator' ? (
            <>
              {/* Quick 3-Step Wizard Button */}
              <button
                type="button"
                className="btn-header-action"
                onClick={() => setShowQuickWizard(true)}
                title="3-Step Rapid Reel Creator (Ayah -> Style -> 1080p Export)"
              >
                <span className="btn-icon">⚡</span>
                <span>Wizard</span>
              </button>

              {/* Recipe Code Vault */}
              <button
                type="button"
                className="btn-header-action btn-recipe-badge"
                onClick={() => setShowRecipeModal(true)}
                title="View Recipe Code, Restore Saved Creations, or Browse History"
              >
                <span className="btn-icon">🔖</span>
                <span className="recipe-tag">{currentRecipeShortHash}</span>
              </button>

              {/* Random Discovery Button */}
              <button
                type="button"
                className="btn-header-action"
                onClick={handleRandomDiscovery}
                title="Discover a random inspirational Quran ayah & background"
              >
                <span className="btn-icon">🎲</span>
                <span>Random</span>
              </button>

              {/* Quick 1080p Export CTA (Visible in Creator mode) */}
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
            </>
          ) : (
            <>
              {/* Publishing Engine Worker Toggle */}
              <button
                type="button"
                className="btn-header-action"
                onClick={() => toggleWorker()}
                title={isWorkerRunning ? 'Pause automated publishing engine' : 'Start automated publishing engine'}
                style={{
                  borderColor: isWorkerRunning ? 'rgba(16,185,129,0.4)' : 'rgba(245,158,11,0.4)',
                  background: isWorkerRunning ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                  color: isWorkerRunning ? '#34D399' : '#FBBF24',
                }}
              >
                {isWorkerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isWorkerRunning ? 'Engine Live' : 'Engine Paused'}</span>
              </button>

              {/* Quick 3-Step Wizard Button */}
              <button
                type="button"
                className="btn-header-action"
                onClick={() => setShowQuickWizard(true)}
                title="Create a new reel via Quick Wizard"
              >
                <span className="btn-icon">⚡</span>
                <span>Wizard</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* ── 3-Column Studio Workspace ──────────────────────────── */}
      {workflowMode === 'creator' && (
        <>
          <div className="layout studio-layout">
        {/* ── Left Column: Studio Navigation & Controls ─────────── */}
        <aside className="sidebar studio-sidebar">
          {/* Navigation Category Tabs */}
          <div className="studio-tabs-bar">
            <button
              type="button"
              className={`studio-tab-btn ${activeTab === 'verses' ? 'active' : ''}`}
              onClick={() => setActiveTab('verses')}
            >
              <span>📖</span> Scripture
            </button>
            <button
              type="button"
              className={`studio-tab-btn ${activeTab === 'media' ? 'active' : ''}`}
              onClick={() => setActiveTab('media')}
            >
              <span>🎬</span> Footage &amp; Layout
            </button>
            <button
              type="button"
              className={`studio-tab-btn ${activeTab === 'typography' ? 'active' : ''}`}
              onClick={() => setActiveTab('typography')}
            >
              <span>✒️</span> Typography
            </button>
            <button
              type="button"
              className={`studio-tab-btn ${activeTab === 'effects' ? 'active' : ''}`}
              onClick={() => setActiveTab('effects')}
            >
              <span>✨</span> Visual FX
            </button>
          </div>

          <div className="studio-panels-container">
            {/* 1. Scripture & Reciters */}
            {activeTab === 'verses' && (
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

            {/* 2. Footage, Backgrounds & Layout Mode */}
            {activeTab === 'media' && (
              <>
                <BackgroundPanel
                  url={config.background.url}
                  fit={config.background.fit}
                  mediaType={config.background.mediaType}
                  onUrlChange={setBackgroundUrl}
                  onFitChange={setBackgroundFit}
                />
                <LayoutPanel
                  textPosition={config.text.textPosition}
                  aspectRatio={config.aspectRatio}
                  onTextPosition={setTextPosition}
                  onAspectRatio={setAspectRatio}
                />
              </>
            )}

            {/* 3. Typography & Quran Styling */}
            {activeTab === 'typography' && (
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
                showReflectionCard={config.text.showReflectionCard}
                reflectionText={config.text.reflectionText}
                layoutMode={config.text.layoutMode}
                mushafTheme={config.text.mushafTheme}
                mushafGlowIntensity={config.text.mushafGlowIntensity}
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
                onShowReflectionCard={setShowReflectionCard}
                onReflectionText={setReflectionText}
                onLayoutMode={setLayoutMode}
                onMushafTheme={setMushafTheme}
                onMushafGlowIntensity={setMushafGlowIntensity}
              />
            )}

            {/* 4. Visual FX, Frames, Waveform, Particles & Details */}
            {activeTab === 'effects' && (
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
                <EffectsPanel
                  effectType={config.effects.type}
                  intensity={config.effects.intensity}
                  speed={config.effects.speed}
                  onEffectType={setEffectType}
                  onIntensity={setEffectIntensity}
                  onSpeed={setEffectSpeed}
                />
                <MotionPanel
                  motionType={config.motion.type}
                  duration={config.motion.duration}
                  onMotionType={setMotionType}
                  onDuration={setDuration}
                />
                <CountdownPanel
                  countdown={config.countdown}
                  onToggleEnabled={setCountdownEnabled}
                  onStyleChange={setCountdownStyle}
                  onPositionChange={setCountdownPosition}
                  onColorChange={setCountdownColor}
                  onShowTotalChange={setCountdownShowTotal}
                  onOpacityChange={setCountdownOpacity}
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

        {/* ── Right Column: Auto-Ready Upload Dock & Social Bridge ─ */}
        <aside className="studio-inspector">
          <AutoUploadDock
            exporting={exporting}
            exportProgress={exportProgress}
            exportPreset={exportPreset}
            exportOptions={exportOptions}
            onExportPresetChange={setExportPreset}
            lastSaveResult={lastSaveResult}
            lastExportedBlob={lastExportedBlob}
            config={config}
            totalDurationFormatted={durationFormatted}
            onSwitchToPublisher={() => handleSwitchWorkflow('queue')}
            onExportNow={handleExportVideo}
            onShareReel={handleShareReel}
            onExportPng={handleExportPng}
          />
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
        </>
      )}

      {/* ── Main Workspace: Embedded Bulk Generator ──────────────── */}
      {workflowMode === 'bulk' && (
        <BulkCreateModal
          isOpen={true}
          embedded={true}
          onClose={() => handleSwitchWorkflow('creator')}
          baseConfig={config}
          editionId={verseLoader.editionId}
          reciterId={verseLoader.reciterId}
          onOpenPublisher={() => handleSwitchWorkflow('schedule')}
        />
      )}

      {/* ── Main Workspace: Unified Publisher Engine & Queue ──────── */}
      {workflowMode !== 'creator' && workflowMode !== 'bulk' && (
        <div className="publisher-embedded-workspace">
          <main className="publisher-main-workarea">
            {workflowMode === 'queue' && <ReelQueueGrid />}
            {workflowMode === 'schedule' && <SchedulingCalendar />}
            {workflowMode === 'exports' && (
              <ExportPacksView
                onSwitchToQueue={() => handleSwitchWorkflow('queue')}
                onSwitchToBulkGenerator={() => handleSwitchWorkflow('bulk')}
              />
            )}
            {workflowMode === 'pages' && <FacebookPagesView />}
            {workflowMode === 'dashboard' && <OverviewStudio />}
          </main>
        </div>
      )}

      {/* ── Sadaqah Jariyah & Bio Modal ────────────────────────── */}
      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />

      {/* ── Popup Bulk Reel Generator Modal ────────────── */}
      {showBulkModal && (
        <BulkCreateModal
          isOpen={showBulkModal}
          onClose={() => setShowBulkModal(false)}
          baseConfig={config}
          editionId={verseLoader.editionId}
          reciterId={verseLoader.reciterId}
          onOpenPublisher={() => {
            setShowBulkModal(false)
            handleSwitchWorkflow('schedule')
          }}
        />
      )}

      {/* ── Recipe Codes & Generation History Modal ─────────────── */}
      <RecipeModal
        isOpen={showRecipeModal}
        onClose={() => setShowRecipeModal(false)}
        currentConfig={config}
        currentReciterId={verseLoader.reciterId}
        currentEditionId={verseLoader.editionId}
        onRestoreRecipe={handleRestoreRecipe}
      />

      {/* ── 3-Step Quick Reel Wizard Modal ───────────────────────── */}
      <QuickWizardModal
        isOpen={showQuickWizard}
        onClose={() => setShowQuickWizard(false)}
        currentConfig={config}
        onApplyConfig={(newConfig) => {
          applyPreset({
            id: 'wizard-applied',
            name: 'Wizard Preset',
            icon: '⚡',
            description: 'Customized in Quick Wizard',
            category: 'Mosques & Holy Sites',
            config: newConfig,
          })
        }}
        onLoadSurahRange={async (surah, startAyat, count, reciterId) => {
          await verseLoader.loadRange(
            surah,
            startAyat,
            count,
            verseLoader.editionId,
            reciterId || verseLoader.reciterId,
            config.text.secondaryEditionId,
          )
        }}
        onExportVideo={handleExportVideo}
        onShareReel={handleShareReel}
        exporting={exporting}
        exportProgress={exportProgress}
        exportPreset={exportPreset}
        onExportPresetChange={setExportPreset}
      />

      {/* ── Global Publisher Drawers & Modals ────────────────────── */}
      <ReelDetailDrawer />
      <FailureDiagnosticsModal />
      <CreateBatchModal />
      <ConnectPageModal />
      <FetchPagesModal />
      <PublishReelModal />
      <BulkCaptionModal />
      <BulkScheduleModal />
      <LocalFileExplorerModal />
      <Toast />

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
