import { useState, useRef, useEffect } from 'react'
import type { ReelConfig } from '../types'
import { AESTHETIC_PRESETS, type ReelPreset } from '../lib/presets'
import { POPULAR_EDITIONS } from '../api/quran'
import {
  getStoredCustomFonts,
  registerCustomFontFile,
  deleteCustomFont,
  type CustomFontItem,
} from '../lib/customFonts'

interface StylePanelProps {
  overlayColor: string
  overlayOpacity: number
  arabicFont: string
  arabicSize: number
  translationFont: string
  translationSize: number
  textColor: string
  showGlow: boolean
  showTranslation: boolean
  surahHeaderPosition: ReelConfig['text']['surahHeaderPosition']
  surahNameLanguage: ReelConfig['text']['surahNameLanguage']
  ayahPauseDelay: number
  showBasmalah: boolean
  karaokeHighlight: boolean
  highlightColor: string
  secondaryEditionId: string
  showReflectionCard?: boolean
  reflectionText?: string
  layoutMode?: ReelConfig['text']['layoutMode']
  mushafTheme?: ReelConfig['text']['mushafTheme']
  mushafGlowIntensity?: number
  onApplyPreset: (preset: ReelPreset) => void
  onOverlayColor: (v: string) => void
  onOverlayOpacity: (v: number) => void
  onArabicFont: (v: string) => void
  onArabicSize: (v: number) => void
  onTranslationFont: (v: string) => void
  onTranslationSize: (v: number) => void
  onTextColor: (v: string) => void
  onShowGlow: (v: boolean) => void
  onShowTranslation: (v: boolean) => void
  onSurahHeaderPosition: (v: ReelConfig['text']['surahHeaderPosition']) => void
  onSurahNameLanguage: (v: ReelConfig['text']['surahNameLanguage']) => void
  onAyahPauseDelay: (v: number) => void
  onShowBasmalah: (v: boolean) => void
  onKaraokeHighlight: (v: boolean) => void
  onHighlightColor: (v: string) => void
  onSecondaryEditionId: (v: string) => void
  onShowReflectionCard?: (v: boolean) => void
  onReflectionText?: (v: string) => void
  onLayoutMode?: (v: ReelConfig['text']['layoutMode']) => void
  onMushafTheme?: (v: ReelConfig['text']['mushafTheme']) => void
  onMushafGlowIntensity?: (v: number) => void
}

export function StylePanel(props: StylePanelProps) {
  const [customFonts, setCustomFonts] = useState<CustomFontItem[]>([])
  const [isUploadingFont, setIsUploadingFont] = useState(false)
  const fontInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setCustomFonts(getStoredCustomFonts())
  }, [])

  const handleFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsUploadingFont(true)
      const isArabicLikely = !file.name.toLowerCase().includes('latin')
      const target = isArabicLikely ? 'arabic' : 'translation'
      const newFont = await registerCustomFontFile(file, target)
      setCustomFonts(getStoredCustomFonts())

      if (target === 'arabic') {
        props.onArabicFont(newFont.family)
      } else {
        props.onTranslationFont(newFont.family)
      }
    } catch (err) {
      console.error('Font upload error:', err)
    } finally {
      setIsUploadingFont(false)
      if (fontInputRef.current) fontInputRef.current.value = ''
    }
  }

  const handleDeleteFont = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updated = deleteCustomFont(id)
    setCustomFonts(updated)
  }

  const currentLayoutMode = props.layoutMode || 'calligraphy-overlay'
  const currentMushafTheme = props.mushafTheme || 'obsidian-gold'

  return (
    <section className="panel" id="style-panel">
      {/* ── 1-Click Aesthetic Presets ── */}
      <h2>1-Click Themes & Presets</h2>
      <div className="picks" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.8rem' }}>
        {AESTHETIC_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className="chip"
            title={p.description}
            onClick={() => props.onApplyPreset(p)}
            style={{ fontSize: '0.8rem' }}
          >
            {p.icon} {p.name}
          </button>
        ))}
      </div>

      {/* ── Quran Layout Format Mode Selector ── */}
      <h2>📖 Quran Reel Presentation Mode</h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '0.4rem',
          marginBottom: '1rem',
          padding: '0.3rem',
          background: 'rgba(0,0,0,0.35)',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <button
          type="button"
          className={`btn btn-sm ${currentLayoutMode === 'calligraphy-overlay' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => props.onLayoutMode?.('calligraphy-overlay')}
          style={{ fontSize: '0.78rem', padding: '0.5rem 0.25rem', textAlign: 'center' }}
        >
          ✨ Calligraphy
        </button>
        <button
          type="button"
          className={`btn btn-sm ${currentLayoutMode === 'mushaf-page' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => props.onLayoutMode?.('mushaf-page')}
          style={{ fontSize: '0.78rem', padding: '0.5rem 0.25rem', textAlign: 'center' }}
        >
          📖 Printed Page
        </button>
        <button
          type="button"
          className={`btn btn-sm ${currentLayoutMode === 'holy-quran-paper' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => props.onLayoutMode?.('holy-quran-paper')}
          style={{ fontSize: '0.78rem', padding: '0.5rem 0.25rem', textAlign: 'center' }}
        >
          📜 Holy Quran Paper
        </button>
      </div>

      {/* ── Holy Quran Paper Only Controls ── */}
      {currentLayoutMode === 'holy-quran-paper' && (
        <div
          style={{
            marginBottom: '1rem',
            padding: '0.85rem',
            background: 'linear-gradient(135deg, rgba(197,155,39,0.15), rgba(27,67,50,0.12))',
            borderRadius: '8px',
            border: '1px solid rgba(197,155,39,0.4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
            <span style={{ fontSize: '1.2rem' }}>📜</span>
            <div>
              <div style={{ fontWeight: 600, color: '#fbbf24', fontSize: '0.86rem' }}>
                Holy Quran Paper Only
              </div>
              <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
                Shows the whole selected verses on authentic Quran paper with zero distracting effects.
              </div>
            </div>
          </div>

          <label style={{ fontWeight: 600, color: '#fbbf24', fontSize: '0.82rem', display: 'block', marginTop: '0.5rem' }}>
            🕌 Holy Paper Texture &amp; Style
            <select
              value={currentMushafTheme}
              onChange={(e) => props.onMushafTheme?.(e.target.value as ReelConfig['text']['mushafTheme'])}
              style={{ marginTop: '0.3rem', width: '100%', background: '#020b14', color: '#fbbf24', borderColor: '#f59e0b' }}
            >
              <option value="madani-cream">📜 Medina Cream (Traditional Madani Mushaf)</option>
              <option value="vintage-parchment">🏺 Antique Parchment Papyrus (Aged Manuscript)</option>
              <option value="royal-ivory">👑 Royal Ivory &amp; Lapis (Illuminated Gold)</option>
              <option value="obsidian-gold">🌙 Midnight Charcoal &amp; Gold (Dark Mode)</option>
            </select>
          </label>

          <label style={{ marginTop: '0.5rem', fontSize: '0.82rem', display: 'block' }}>
            Ayah Font Size on Paper: {props.arabicSize}px
            <input
              type="range"
              min={36}
              max={100}
              step={2}
              value={props.arabicSize}
              onChange={(e) => props.onArabicSize(Number(e.target.value))}
            />
          </label>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.6rem', flexWrap: 'wrap' }}>
            <label className="checkbox" style={{ fontSize: '0.8rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={props.showBasmalah}
                onChange={(e) => props.onShowBasmalah(e.target.checked)}
              />
              Show Basmalah Header
            </label>

            <label className="checkbox" style={{ fontSize: '0.8rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={props.showTranslation}
                onChange={(e) => props.onShowTranslation(e.target.checked)}
              />
              Footnote Translation
            </label>
          </div>
        </div>
      )}

      {/* ── Mushaf Page Specific Controls ── */}
      {currentLayoutMode === 'mushaf-page' && (
        <div
          style={{
            marginBottom: '1rem',
            padding: '0.75rem',
            background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(16,185,129,0.05))',
            borderRadius: '8px',
            border: '1px solid rgba(245,158,11,0.3)',
          }}
        >
          <label style={{ fontWeight: 600, color: '#fbbf24', fontSize: '0.85rem' }}>
            🕌 Mushaf Visual Style &amp; Theme
            <select
              value={currentMushafTheme}
              onChange={(e) => props.onMushafTheme?.(e.target.value as ReelConfig['text']['mushafTheme'])}
              style={{ marginTop: '0.3rem', background: '#020b14', color: '#fbbf24', borderColor: '#f59e0b' }}
            >
              <option value="obsidian-gold">🌙 Obsidian &amp; Gold Noor (Sleek Dark Mode)</option>
              <option value="madani-parchment">📜 Medina Parchment (Traditional Classical Mushaf)</option>
              <option value="emerald-noor">🕌 Emerald &amp; Gold Velvet (Islamic Green)</option>
            </select>
          </label>

          <label style={{ marginTop: '0.5rem', fontSize: '0.82rem' }}>
            Active Ayah Scanning Glow: {Math.round((props.mushafGlowIntensity ?? 0.85) * 100)}%
            <input
              type="range"
              min={0.2}
              max={1.0}
              step={0.05}
              value={props.mushafGlowIntensity ?? 0.85}
              onChange={(e) => props.onMushafGlowIntensity?.(Number(e.target.value))}
            />
          </label>
        </div>
      )}

      <h2>Text & Overlay Style</h2>
      <div className="row">
        <label className="color" style={{ width: '80px', flexShrink: 0 }}>
          Overlay
          <input
            id="overlay-color-input"
            type="color"
            value={props.overlayColor}
            onChange={(e) => props.onOverlayColor(e.target.value)}
          />
        </label>
        <label style={{ flex: 1 }}>
          Tint {Math.round(props.overlayOpacity * 100)}%
          <input
            id="overlay-opacity-input"
            type="range"
            min={0}
            max={0.8}
            step={0.05}
            value={props.overlayOpacity}
            onChange={(e) => props.onOverlayOpacity(Number(e.target.value))}
          />
        </label>
      </div>

      <div className="row">
        <label>
          Surah Header Language
          <select
            id="surah-language-select"
            value={props.surahNameLanguage}
            onChange={(e) => props.onSurahNameLanguage(e.target.value as ReelConfig['text']['surahNameLanguage'])}
          >
            <option value="arabic">Arabic (سُورَةُ ٱلْبَقَرَةِ)</option>
            <option value="both">Arabic + English</option>
            <option value="english">English Only</option>
          </select>
        </label>

        <label>
          Surah Header Position
          <select
            id="surah-header-position-select"
            value={props.surahHeaderPosition}
            onChange={(e) => props.onSurahHeaderPosition(e.target.value as ReelConfig['text']['surahHeaderPosition'])}
          >
            <option value="top">Top Header (Recommended)</option>
            <option value="bottom">Bottom of Verse</option>
            <option value="none">Hidden</option>
          </select>
        </label>
      </div>

      <label className="row-inline" style={{ marginTop: '0.2rem' }}>
        <input
          id="show-basmalah-checkbox"
          type="checkbox"
          checked={props.showBasmalah}
          onChange={(e) => props.onShowBasmalah(e.target.checked)}
        />
        Start Ayah 1 with Basmalah (بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ)
      </label>

      <label>
        <span>
          Verse-to-Verse Transition Flow:{' '}
          <strong style={{ color: props.ayahPauseDelay === 0 ? '#4ade80' : '#fde047' }}>
            {props.ayahPauseDelay === 0
              ? '0.0s (Seamless Flow / مستمر)'
              : `${props.ayahPauseDelay.toFixed(1)}s Pause`}
          </strong>
        </span>
        <input
          id="ayah-pause-delay-input"
          type="range"
          min={0.0}
          max={3.0}
          step={0.1}
          value={props.ayahPauseDelay}
          onChange={(e) => props.onAyahPauseDelay(Number(e.target.value))}
        />
      </label>

      {/* ── Arabic Font Selection & Custom Font Upload ── */}
      <div style={{ marginTop: '0.6rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
          <label style={{ margin: 0 }}>Arabic Font Typeface (نوع الخط العربي)</label>
          <button
            type="button"
            className="btn btn-xs btn-outline"
            onClick={() => fontInputRef.current?.click()}
            title="Upload custom font (.ttf, .otf, .woff2, .woff)"
            style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
          >
            {isUploadingFont ? '⏳ Loading…' : '📤 Upload Custom Font'}
          </button>
          <input
            ref={fontInputRef}
            type="file"
            accept=".ttf,.otf,.woff2,.woff"
            style={{ display: 'none' }}
            onChange={handleFontUpload}
          />
        </div>

        <select
          id="arabic-font-select"
          value={props.arabicFont}
          onChange={(e) => props.onArabicFont(e.target.value)}
        >
          {customFonts.length > 0 && (
            <optgroup label="📁 My Uploaded Custom Fonts (الخطوط المخصصة)">
              {customFonts.map((cf) => (
                <option key={cf.id} value={cf.family}>
                  ⭐ {cf.name} (Uploaded)
                </option>
              ))}
            </optgroup>
          )}
          <optgroup label="📜 Classical Quranic Mushaf & Naskh (المصحفي والنسخ الأصيل)">
            <option value='"Amiri Quran", "Amiri", serif'>Amiri Quran (Bulaq Classical Mushaf — الأميري المصحفي)</option>
            <option value='"Scheherazade New", serif'>Scheherazade New (Traditional Mushaf Naskh — النسخ العثماني)</option>
            <option value='"Noto Naskh Arabic", serif'>Noto Naskh Arabic (Digital Crisp Naskh — نسخ رقمي واضح)</option>
            <option value='"Gulzar", serif'>Gulzar (Classical Nasta&apos;liq Script — خط النستعليق الفاخر)</option>
            <option value='"Lateef", serif'>Lateef (Flowing Soft Naskh — خط لطيف المنساب)</option>
          </optgroup>
          <optgroup label="✒️ Calligraphic & Artistic Scripts (الخطوط الكوفية والرقعية والديوانية)">
            <option value='"Reem Kufi", serif'>Reem Kufi (Majestic Classical Kufic — الخط الكوفي المهيب)</option>
            <option value='"Noto Kufi Arabic", sans-serif'>Noto Kufi Arabic (Geometric Modern Kufic — كوفي هندسي)</option>
            <option value='"Aref Ruqaa", serif'>Aref Ruqaa (Classical Ottoman Ruq&apos;ah — خط الرقعة العثماني)</option>
            <option value='"Rakkas", serif'>Rakkas (Decorative Diwani Poster — خط رقاص الزخرفي)</option>
            <option value='"Marhey", cursive'>Marhey (Fluid Playful Calligraphy — خط مرحي العصري)</option>
            <option value='"El Messiri", sans-serif'>El Messiri (Curvilinear Classical — خط المسيري البديع)</option>
          </optgroup>
          <optgroup label="📱 Modern Social Reels Typography (الخطوط المعاصرة لريلز السوشيال)">
            <option value='"Cairo", sans-serif'>Cairo (Modern Bold Display — خط كايرو للريلز)</option>
            <option value='"Tajawal", sans-serif'>Tajawal (Balanced Contemporary — خط تجوال المتوازن)</option>
            <option value='"Almarai", sans-serif'>Almarai (Modern Geometric — خط المراعي الحديث)</option>
            <option value='"Alexandria", sans-serif'>Alexandria (Ultra-Sharp Geometric — خط الإسكندرية)</option>
            <option value='"Mada", sans-serif'>Mada (Compact Screen Typography — خط مدى المعاصر)</option>
            <option value='"Changa", sans-serif'>Changa (Heavy Bold Poster Style — خط تشانغا البارز)</option>
            <option value='"Noto Sans Arabic", sans-serif'>Noto Sans Arabic (Clean Minimalist — نوتو البسيط)</option>
          </optgroup>
        </select>
      </div>

      {/* ── Custom Fonts List Tag Deck ── */}
      {customFonts.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.35rem' }}>
          {customFonts.map((cf) => (
            <span
              key={cf.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontSize: '0.72rem',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                padding: '0.15rem 0.45rem',
                borderRadius: '4px',
              }}
            >
              <span>{cf.name}</span>
              <button
                type="button"
                onClick={(e) => handleDeleteFont(cf.id, e)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#ef4444',
                  padding: 0,
                  fontSize: '0.72rem',
                }}
                title="Delete font"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <label style={{ marginTop: '0.6rem' }}>
        Arabic size {props.arabicSize}px
        <input
          id="arabic-size-input"
          type="range"
          min={32}
          max={140}
          step={2}
          value={props.arabicSize}
          onChange={(e) => props.onArabicSize(Number(e.target.value))}
        />
      </label>

      <div className="row" style={{ alignItems: 'center' }}>
        <label className="row-inline" style={{ flex: 1 }}>
          <input
            id="karaoke-checkbox"
            type="checkbox"
            checked={props.karaokeHighlight}
            onChange={(e) => props.onKaraokeHighlight(e.target.checked)}
          />
          🔤 Word-by-Word Karaoke Glow
        </label>
        {props.karaokeHighlight && (
          <label className="color" style={{ width: '80px', flexShrink: 0 }}>
            Glow Color
            <input
              id="highlight-color-input"
              type="color"
              value={props.highlightColor}
              onChange={(e) => props.onHighlightColor(e.target.value)}
            />
          </label>
        )}
      </div>

      <label className="row-inline">
        <input
          id="show-translation-checkbox"
          type="checkbox"
          checked={props.showTranslation}
          onChange={(e) => props.onShowTranslation(e.target.checked)}
        />
        Show Translation on Video
      </label>

      {props.showTranslation && (
        <>
          <div className="row">
            <label style={{ flex: 1 }}>
              Translation font
              <select
                id="translation-font-select"
                value={props.translationFont}
                onChange={(e) => props.onTranslationFont(e.target.value)}
              >
                {customFonts.length > 0 && (
                  <optgroup label="📁 My Uploaded Custom Fonts">
                    {customFonts.map((cf) => (
                      <option key={cf.id} value={cf.family}>
                        ⭐ {cf.name} (Uploaded)
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Modern Sans-Serif (Contemporary Reels)">
                  <option value='"Inter", sans-serif'>Inter (Modern Clean)</option>
                  <option value='"Outfit", sans-serif'>Outfit (High-Impact Display)</option>
                  <option value='"Plus Jakarta Sans", sans-serif'>Plus Jakarta Sans (Geometric Modern)</option>
                  <option value='system-ui, sans-serif'>System UI</option>
                </optgroup>
                <optgroup label="Classical & Luxury Serif (Reverent Style)">
                  <option value='"Cinzel", serif'>Cinzel (Classical Gilded Roman)</option>
                  <option value='"Playfair Display", serif'>Playfair Display (Luxury Editorial)</option>
                  <option value='"Georgia", serif'>Georgia (Editorial Serif)</option>
                  <option value='"Times New Roman", serif'>Times New Roman</option>
                </optgroup>
              </select>
            </label>
            <label style={{ flex: 1 }}>
              Dual 2nd Language
              <select
                id="secondary-edition-select"
                value={props.secondaryEditionId}
                onChange={(e) => props.onSecondaryEditionId(e.target.value)}
              >
                <option value="none">None (Single language)</option>
                {POPULAR_EDITIONS.map((ed) => (
                  <option key={ed.id} value={ed.id}>
                    {ed.name} ({ed.language})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label>
            Translation size {props.translationSize}px
            <input
              id="translation-size-input"
              type="range"
              min={20}
              max={72}
              step={2}
              value={props.translationSize}
              onChange={(e) => props.onTranslationSize(Number(e.target.value))}
            />
          </label>

          <div style={{ marginTop: '0.4rem', padding: '0.6rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <label className="row-inline" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1' }}>
              <input
                id="reflection-card-checkbox"
                type="checkbox"
                checked={props.showReflectionCard ?? false}
                onChange={(e) => props.onShowReflectionCard?.(e.target.checked)}
              />
              📖 Show Reflection / Tafsir Badge
            </label>
            {props.showReflectionCard && (
              <div style={{ marginTop: '0.4rem' }}>
                <input
                  id="reflection-text-input"
                  type="text"
                  placeholder="e.g. ✨ Reflection: Patience & Trust in Allah"
                  value={props.reflectionText ?? ''}
                  onChange={(e) => props.onReflectionText?.(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.4rem 0.6rem',
                    fontSize: '0.8rem',
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '6px',
                    color: '#ffffff',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            )}
          </div>
        </>
      )}

      <div className="row" style={{ alignItems: 'center' }}>
        <label className="row-inline" style={{ flex: 1 }}>
          <input
            id="glow-checkbox"
            type="checkbox"
            checked={props.showGlow}
            onChange={(e) => props.onShowGlow(e.target.checked)}
          />
          ✨ Text Glow & Drop Shadow
        </label>
        <label className="color" style={{ width: '80px', flexShrink: 0 }}>
          Text Color
          <input
            id="text-color-input"
            type="color"
            value={props.textColor}
            onChange={(e) => props.onTextColor(e.target.value)}
          />
        </label>
      </div>
    </section>
  )
}
