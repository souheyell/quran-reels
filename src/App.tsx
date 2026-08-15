import { useCallback, useEffect, useMemo, useState } from 'react'
import { useReelConfig } from './hooks/useReelConfig'
import { useVerseLoader } from './hooks/useVerseLoader'
import { useExport } from './hooks/useExport'
import { buildTimeline } from './renderer/timeline'
import { loadImage } from './lib/imageCache'
import { VersePanel } from './components/VersePanel'
import { BackgroundPanel } from './components/BackgroundPanel'
import { StylePanel } from './components/StylePanel'
import { LayoutPanel } from './components/LayoutPanel'
import { MotionPanel } from './components/MotionPanel'
import { FooterPanel } from './components/FooterPanel'
import { PreviewCanvas } from './components/PreviewCanvas'
import { getRandomStockImage } from './api/unsplash'
import type { ReelConfig } from './types'
import './App.css'

function App() {
  const {
    config,
    setVerses,
    setBackgroundUrl,
    setBackgroundFit,
    setOverlayColor,
    setOverlayOpacity,
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
    setFooterEnabled,
    setFooterText,
    setFooterIcon,
    setFooterOpacity,
    setFooterFontSize,
    setMotionType,
    setDuration,
    setAspectRatio,
  } = useReelConfig()

  const verseLoader = useVerseLoader({
    initialSurah: 2,
    initialAyat: 255,
    initialEditionId: 'en.sahih',
  })

  const [image, setImage] = useState<HTMLImageElement | null>(null)

  // Sync loaded verses into config
  useEffect(() => {
    if (verseLoader.verses.length > 0) {
      setVerses(verseLoader.verses)
    }
  }, [verseLoader.verses, setVerses])

  // Load background image with caching
  const loadBg = useCallback((url: string) => {
    loadImage(
      url,
      (img) => setImage(img),
      () => setImage(null),
    )
  }, [])

  useEffect(() => {
    loadBg(config.background.url)
  }, [config.background.url, loadBg])

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
    handleExportVideo,
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

    await verseLoader.loadRandom()
  }, [setBackgroundUrl, setMotionType, verseLoader])

  return (
    <div className="app">
      <header className="header">
        <div className="header-brand">
          <h1>Islamic Reels Creator</h1>
          <span className="header-badge">STUDIO</span>
        </div>
        <div className="header-links">
          <a
            href="https://alquran.cloud/api"
            target="_blank"
            rel="noopener noreferrer"
            className="header-link"
          >
            Quran API
          </a>
          <a
            href="https://everyayah.com"
            target="_blank"
            rel="noopener noreferrer"
            className="header-link"
          >
            EveryAyah Audio
          </a>
        </div>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <VersePanel
            verses={config.verses}
            editionId={verseLoader.editionId}
            reciterId={verseLoader.reciterId}
            lockCount={verseLoader.lockCount}
            lockReciter={verseLoader.lockReciter}
            loading={verseLoader.loading}
            error={verseLoader.error}
            onLoadRange={verseLoader.loadRange}
            onLoadRandom={handleRandomDiscovery}
            onEditionChange={verseLoader.changeEdition}
            onReciterChange={verseLoader.changeReciter}
            onRandomizeReciter={verseLoader.randomizeReciter}
            onToggleLockCount={verseLoader.setLockCount}
            onToggleLockReciter={verseLoader.setLockReciter}
            onCountChange={verseLoader.setFixedCount}
          />
          <BackgroundPanel
            url={config.background.url}
            fit={config.background.fit}
            onUrlChange={setBackgroundUrl}
            onFitChange={setBackgroundFit}
          />
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
        </aside>

        <main className="main">
          <PreviewCanvas config={config} image={image} timeline={timeline} />
          {exportError && <p className="error">{exportError}</p>}
          <div className="export-bar">
            <div className="export-btn-wrap">
              <button
                id="export-video-btn"
                type="button"
                className="btn primary"
                onClick={handleExportVideo}
                disabled={exporting}
              >
                {exporting
                  ? `Exporting… ${exportProgress}%`
                  : `Download ${exportFormat.toUpperCase()}`}
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
              className="btn"
              onClick={handleExportPng}
              disabled={exporting}
            >
              Download PNG Frame
            </button>
          </div>
        </main>
      </div>

      <footer className="app-footer">
        <div className="footer-content">
          <p>© {new Date().getFullYear()} Islamic Reels Creator · Built for Quran Dawah & Reminders</p>
          <div className="footer-social-links">
            <span className="footer-tag">HD 60FPS</span>
            <span className="footer-tag">AAC Audio</span>
            <span className="footer-tag">H.264 MP4</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
