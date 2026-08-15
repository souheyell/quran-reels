interface StylePanelProps {
  overlayColor: string
  overlayOpacity: number
  arabicFont: string
  arabicSize: number
  translationFont: string
  translationSize: number
  textColor: string
  showGlow: boolean
  onOverlayColor: (v: string) => void
  onOverlayOpacity: (v: number) => void
  onArabicFont: (v: string) => void
  onArabicSize: (v: number) => void
  onTranslationFont: (v: string) => void
  onTranslationSize: (v: number) => void
  onTextColor: (v: string) => void
  onShowGlow: (v: boolean) => void
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
      <label>
        Arabic font
        <select
          id="arabic-font-select"
          value={props.arabicFont}
          onChange={(e) => props.onArabicFont(e.target.value)}
        >
          <option value='"Scheherazade New", serif'>Scheherazade New</option>
          <option value='"Amiri", serif'>Amiri</option>
          <option value='"Times New Roman", serif'>Times New Roman</option>
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
      <label>
        Translation font
        <select
          id="translation-font-select"
          value={props.translationFont}
          onChange={(e) => props.onTranslationFont(e.target.value)}
        >
          <option value='system-ui, sans-serif'>System</option>
          <option value='"Inter", sans-serif'>Inter</option>
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
      <label className="row-inline">
        Text color
        <input
          id="text-color-input"
          type="color"
          value={props.textColor}
          onChange={(e) => props.onTextColor(e.target.value)}
        />
      </label>
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
