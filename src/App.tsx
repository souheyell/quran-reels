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
import { CountdownPanel } from './components/CountdownPanel'
import { RecipeModal } from './components/RecipeModal'
import { FooterPanel } from './components/FooterPanel'
import { PreviewCanvas } from './components/PreviewCanvas'
import { AboutModal } from './components/AboutModal'
import { BulkCreateModal } from './components/BulkCreateModal'
import { QuickWizardModal } from './components/QuickWizardModal'
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
import type { ReelConfig, ExportQualityPreset } from './types'
import './App.css'

type StudioTab = 'all' | 'verses' | 'media' | 'typography' | 'effects' | 'studio'

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

  const verseLoader = useVerseLoader({
    initialSurah: 2,
    initialAyat: 255,
    initialEditionId: 'en.sahih',
  })

  const [image, setImage] = useState<HTMLImageElement | HTMLVideoElement | null>(null)
  const [showAbout, setShowAbout] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [showRecipeModal, setShowRecipeModal] = useState(false)
  const [showQuickWizard, setShowQuickWizard] = useState(false)
  const [activeTab, setActiveTab] = useState<StudioTab>('all')
  const [sidebarSearch, setSidebarSearch] = useState('')

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
    exportError,
    exportProgress,
    exportFormat,
    shareToast,
    exportPreset,
    exportOptions,
    setExportPreset,
    handleExportVideo,
    handleShareReel,
    handleExportPng,
    lastSaveResult,
    clearLastSaveResult,
  } = useExport(config, image, timeline)

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
          {/* Quick 3-Step Wizard Button */}
          <button
            type="button"
            className="btn-wizard-header"
            onClick={() => setShowQuickWizard(true)}
            title="3-Step Rapid Reel Creator (Ayah -> Style -> 1080p Export)"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(16, 185, 129, 0.2) 100%)',
              border: '1px solid #f59e0b',
              color: '#fbbf24',
              padding: '0.42rem 0.85rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: '0 0 14px rgba(245, 158, 11, 0.25)',
              transition: 'all 0.15s ease',
            }}
          >
            <span className="btn-icon">⚡</span>
            <span>Quick Wizard</span>
          </button>

          {/* Random Discovery Button */}
          <button
            type="button"
            className="btn-random-header"
            onClick={handleRandomDiscovery}
            title="Discover a random inspirational Quran ayah & background"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#d4e4fa',
              padding: '0.4rem 0.75rem',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <span className="btn-icon">🎲</span>
            <span>Random</span>
          </button>

          <button
            type="button"
            className="btn-recipe-header"
            onClick={() => setShowRecipeModal(true)}
            title="View Recipe Code, Restore Saved Creations, or Browse History"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              color: '#fbbf24',
              padding: '0.4rem 0.75rem',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <span className="btn-icon">🔖</span>
            <span>Recipe Vault</span>
            <span
              style={{
                fontFamily: 'monospace',
                background: 'rgba(0,0,0,0.35)',
                padding: '0.1rem 0.35rem',
                borderRadius: '4px',
                fontSize: '0.74rem',
              }}
            >
              {currentRecipeShortHash}
            </span>
          </button>
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
        </div>
      </header>

      {/* ── 3-Column Studio Workspace ──────────────────────────── */}
      <div className="layout studio-layout">
        {/* ── Left Column: Studio Navigation & Controls ─────────── */}
        <aside className="sidebar studio-sidebar">
          {/* Quick Search / Filter for Effortless Navigation */}
          <div className="sidebar-search-box" style={{ padding: '0.65rem 0.85rem 0.35rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', left: '10px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', pointerEvents: 'none' }}>🔍</span>
              <input
                type="text"
                placeholder="Dive into settings (font, reciter, frame, timer…)"
                value={sidebarSearch}
                onChange={(e) => {
                  setSidebarSearch(e.target.value)
                  if (e.target.value.trim() && activeTab !== 'all') {
                    setActiveTab('all')
                  }
                }}
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.35)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '20px',
                  padding: '0.35rem 0.85rem 0.35rem 2rem',
                  fontSize: '0.78rem',
                  color: '#fff',
                  outline: 'none',
                }}
              />
              {sidebarSearch && (
                <button
                  type="button"
                  onClick={() => setSidebarSearch('')}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

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
              <span>📖</span> Scripture
            </button>
            <button
              type="button"
              className={`studio-tab-btn ${activeTab === 'media' ? 'active' : ''}`}
              onClick={() => setActiveTab('media')}
            >
              <span>🎬</span> Footage
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
              <span>🎨</span> Visual FX
            </button>
            <button
              type="button"
              className={`studio-tab-btn ${activeTab === 'studio' ? 'active' : ''}`}
              onClick={() => setActiveTab('studio')}
            >
              <span>📐</span> Studio
            </button>
          </div>

          <div className="studio-panels-container">
            {/* 1. Scripture & Reciters */}
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

            {/* 2. Footage & Backgrounds */}
            {(activeTab === 'all' || activeTab === 'media') && (
              <BackgroundPanel
                url={config.background.url}
                fit={config.background.fit}
                mediaType={config.background.mediaType}
                onUrlChange={setBackgroundUrl}
                onFitChange={setBackgroundFit}
              />
            )}

            {/* 3. Typography & Quran Layout Mode */}
            {(activeTab === 'all' || activeTab === 'typography') && (
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

            {/* 4. Visual FX: Frames, Waveforms & Particles */}
            {(activeTab === 'all' || activeTab === 'effects') && (
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
              </>
            )}

            {/* 5. Studio & Format: Canvas Aspect Ratio, Motion, Timer, Social Branding */}
            {(activeTab === 'all' || activeTab === 'studio') && (
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

          {/* ── Fast Mobile / APK Action Bar ─────────────────────── */}
          <div className="mobile-action-bar">
            <button
              id="mobile-export-video-btn"
              type="button"
              className="btn btn-mobile-export"
              onClick={handleExportVideo}
              disabled={exporting}
            >
              <span className="btn-icon">⚡</span>
              {exporting ? `Exporting… ${exportProgress}%` : `Export ${exportFormat.toUpperCase()} Reel`}
            </button>
            <button
              id="mobile-share-reel-btn"
              type="button"
              className="btn btn-mobile-share"
              onClick={handleShareReel}
              disabled={exporting}
            >
              <span className="btn-icon">📲</span>
              Share
            </button>
            <button
              id="mobile-export-png-btn"
              type="button"
              className="btn btn-mobile-png"
              onClick={handleExportPng}
              disabled={exporting}
            >
              <span className="btn-icon">🖼️</span>
              PNG
            </button>
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
                <label>Export Preset</label>
                <select
                  className="inspector-select"
                  value={exportPreset}
                  onChange={(e) => setExportPreset(e.target.value as ExportQualityPreset)}
                >
                  <option value="instagram-fb">⭐ Instagram &amp; FB (1080p · 30fps · 10Mbps)</option>
                  <option value="smooth-60fps">🎬 Smooth 60 FPS (1080p · 60fps · 14Mbps)</option>
                  <option value="4k-master">👑 4K Master (2160x3840 · 30fps · 30Mbps)</option>
                  <option value="compact">⚡ Compact Share (1080p · 30fps · 6Mbps)</option>
                </select>
              </div>
              <div className="inspector-row">
                <span>Framerate</span>
                <span className="badge-emerald">{exportOptions.fps ?? 30} FPS</span>
              </div>
              <div className="inspector-row">
                <span>Video Bitrate</span>
                <span className="badge-emerald">{Math.round((exportOptions.bitrate ?? 10_000_000) / 1_000_000)} Mbps VBR</span>
              </div>
              <div className="inspector-row">
                <span>Audio Codec</span>
                <span className="badge-dim">AAC Stereo {Math.round((exportOptions.audioBitrate ?? 320_000) / 1000)}k</span>
              </div>
              <div className="inspector-row">
                <span>Video Codec</span>
                <span className="badge-dim">H.264 High Profile</span>
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

      {/* ── Single Export Completion Hub (Folder & CLI Command) ── */}
      {lastSaveResult?.cliCommand && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            maxWidth: '460px',
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.5)',
            borderRadius: '12px',
            padding: '1rem',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.7)',
            zIndex: 1000,
            backdropFilter: 'blur(12px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem',
            animation: 'toastSlideUp 0.25s ease-out',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🚀 Reel Exported &amp; Saved to Disk!
            </span>
            <button
              type="button"
              onClick={clearLastSaveResult}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem', padding: '0 4px' }}
            >
              ✕
            </button>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
            📁 <strong>Saving Folder / File:</strong>
            <div style={{ background: 'rgba(0,0,0,0.5)', padding: '4px 8px', borderRadius: '6px', marginTop: '2px', fontFamily: 'monospace', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#a5f3fc' }}>
              {lastSaveResult.path}
            </div>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
            💻 <strong>CLI Command to Import:</strong>
            <div style={{ background: 'rgba(0,0,0,0.5)', padding: '4px 8px', borderRadius: '6px', marginTop: '2px', fontFamily: 'monospace', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#fbbf24' }}>
              {lastSaveResult.cliCommand}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button
              type="button"
              className="btn-copy-code"
              style={{ flex: 1, padding: '6px 10px', textAlign: 'center' }}
              onClick={() => {
                if (lastSaveResult.cliCommand) {
                  navigator.clipboard?.writeText(lastSaveResult.cliCommand)
                }
              }}
            >
              📋 Copy CLI Command
            </button>
            <button
              type="button"
              className="btn-copy-code"
              style={{ flex: 1, padding: '6px 10px', textAlign: 'center' }}
              onClick={() => {
                if (lastSaveResult.path) {
                  navigator.clipboard?.writeText(lastSaveResult.path)
                }
              }}
            >
              📁 Copy File Path
            </button>
          </div>
        </div>
      )}

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
