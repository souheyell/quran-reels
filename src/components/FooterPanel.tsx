import type { ReelConfig } from '../types'

interface FooterPanelProps {
  enabled: boolean
  text: string
  icon: ReelConfig['footer']['icon']
  opacity: number
  fontSize: number
  onEnabled: (enabled: boolean) => void
  onText: (text: string) => void
  onIcon: (icon: ReelConfig['footer']['icon']) => void
  onOpacity: (opacity: number) => void
  onFontSize: (fontSize: number) => void
}

export function FooterPanel({
  enabled,
  text,
  icon,
  opacity,
  fontSize,
  onEnabled,
  onText,
  onIcon,
  onOpacity,
  onFontSize,
}: FooterPanelProps) {
  return (
    <section className="panel" id="footer-panel">
      <h2>Footer & Social Branding</h2>

      <label className="row-inline">
        <input
          id="footer-enabled-checkbox"
          type="checkbox"
          checked={enabled}
          onChange={(e) => onEnabled(e.target.checked)}
        />
        Show Watermark / Copyright on Video
      </label>

      {enabled && (
        <>
          <div className="row">
            <label>
              Icon / Platform
              <select
                id="footer-icon-select"
                value={icon}
                onChange={(e) => onIcon(e.target.value as ReelConfig['footer']['icon'])}
              >
                <option value="instagram">Instagram (@handle)</option>
                <option value="tiktok">TikTok (@handle)</option>
                <option value="youtube">YouTube (▶ channel)</option>
                <option value="copyright">Copyright (© brand)</option>
                <option value="none">Plain Text Only</option>
              </select>
            </label>

            <label>
              Handle / Brand Text
              <input
                id="footer-text-input"
                type="text"
                value={text}
                onChange={(e) => onText(e.target.value)}
                placeholder="e.g. @daily_quran or Channel Name"
              />
            </label>
          </div>

          <div className="row">
            <label>
              Opacity {Math.round(opacity * 100)}%
              <input
                id="footer-opacity-input"
                type="range"
                min={0.2}
                max={1.0}
                step={0.05}
                value={opacity}
                onChange={(e) => onOpacity(Number(e.target.value))}
              />
            </label>

            <label>
              Size {fontSize}px
              <input
                id="footer-size-input"
                type="range"
                min={16}
                max={48}
                step={2}
                value={fontSize}
                onChange={(e) => onFontSize(Number(e.target.value))}
              />
            </label>
          </div>
        </>
      )}
    </section>
  )
}
