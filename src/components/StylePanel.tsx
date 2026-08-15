import type { ReelConfig } from '../types'

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
}

export function StylePanel(props: StylePanelProps) {
  return (
    <section className="panel" id="style-panel">
      <h2>Text & Overlay Style</h2>
      <div className="row">
        <label className="color">
          Overlay
          <input
            id="overlay-color-input"
            type="color"
            value={props.overlayColor}
            onChange={(e) => props.onOverlayColor(e.target.value)}
          />
        </label>
        <label>
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
        Ayah Pause Delay: {props.ayahPauseDelay.toFixed(1)}s
        <input
          id="ayah-pause-delay-input"
          type="range"
          min={0.0}
          max={5.0}
          step={0.2}
          value={props.ayahPauseDelay}
          onChange={(e) => props.onAyahPauseDelay(Number(e.target.value))}
        />
      </label>

      <label>
        Arabic Font Typeface
        <select
          id="arabic-font-select"
          value={props.arabicFont}
          onChange={(e) => props.onArabicFont(e.target.value)}
        >
          <optgroup label="📜 Classical Quranic & Naskh (الخط القرآني والنسخ)">
            <option value='"Scheherazade New", serif'>Scheherazade New (Traditional Mushaf Naskh)</option>
            <option value='"Amiri Quran", "Amiri", serif'>Amiri Quran (Bulaq Classical Mushaf)</option>
            <option value='"Noto Naskh Arabic", serif'>Noto Naskh Arabic (Digital Crisp Naskh)</option>
          </optgroup>
          <optgroup label="✒️ Calligraphic & Artistic Scripts (الخطوط الكوفية والرقعية)">
            <option value='"Reem Kufi", serif'>Reem Kufi (Majestic Classical Kufic)</option>
            <option value='"Aref Ruqaa", serif'>Aref Ruqaa (Classical Ottoman Ruq&apos;ah)</option>
          </optgroup>
          <optgroup label="📱 Modern Social Reels Typography (الخطوط الحديثة للريلز)">
            <option value='"Cairo", sans-serif'>Cairo (Modern Display - Social Reels)</option>
            <option value='"Tajawal", sans-serif'>Tajawal (Balanced Contemporary)</option>
            <option value='"Noto Sans Arabic", sans-serif'>Noto Sans Arabic (Clean Minimalist)</option>
            <option value='"Almarai", sans-serif'>Almarai (Modern Geometric)</option>
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
          <label>
            Translation font
            <select
              id="translation-font-select"
              value={props.translationFont}
              onChange={(e) => props.onTranslationFont(e.target.value)}
            >
              <option value='"Inter", sans-serif'>Inter (Modern Clean)</option>
              <option value='system-ui, sans-serif'>System UI</option>
              <option value='"Georgia", serif'>Georgia (Editorial Serif)</option>
              <option value='"Times New Roman", serif'>Times New Roman</option>
            </select>
          </label>
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

      <div className="row">
        <label className="color">
          Text color
          <input
            id="text-color-input"
            type="color"
            value={props.textColor}
            onChange={(e) => props.onTextColor(e.target.value)}
          />
        </label>
      </div>

      <label className="row-inline">
        <input
          id="glow-checkbox"
          type="checkbox"
          checked={props.showGlow}
          onChange={(e) => props.onShowGlow(e.target.checked)}
        />
        Text glow / shadow
      </label>
    </section>
  )
}
