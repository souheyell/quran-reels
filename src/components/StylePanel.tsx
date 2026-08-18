import type { ReelConfig } from '../types'
import { AESTHETIC_PRESETS, type ReelPreset } from '../lib/presets'
import { POPULAR_EDITIONS } from '../api/quran'

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
}

export function StylePanel(props: StylePanelProps) {
  return (
    <section className="panel" id="style-panel">
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

      <label>
        Arabic Font Typeface (نوع الخط العربي)
        <select
          id="arabic-font-select"
          value={props.arabicFont}
          onChange={(e) => props.onArabicFont(e.target.value)}
        >
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
      </label>

      <label>
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
