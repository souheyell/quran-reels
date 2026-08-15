import type { BorderType } from '../types'

interface BorderPanelProps {
  borderType: BorderType
  color: string
  opacity: number
  onBorderType: (type: BorderType) => void
  onColor: (color: string) => void
  onOpacity: (opacity: number) => void
}

const BORDER_OPTIONS: Array<{ id: BorderType; label: string; icon: string; desc: string }> = [
  { id: 'none', label: 'None', icon: '⏹️', desc: 'No decorative frame' },
  { id: 'gilded-corners', label: 'Gilded Corners', icon: '🌟', desc: 'Arabesque Ottoman floral filigree' },
  { id: 'islamic-geometric', label: 'Geometric Frame', icon: '🕌', desc: 'Andalusian double gold line & stars' },
  { id: 'royal-arch', label: 'Royal Arch', icon: '👑', desc: 'Moorish horseshoe arch centerpiece' },
  { id: 'vignette-feather', label: 'Vignette', icon: '🎬', desc: 'Cinematic edge focus shadow' },
]

const QUICK_COLORS = [
  { label: 'Gold', hex: '#ffd700' },
  { label: 'Warm Amber', hex: '#f59e0b' },
  { label: 'Royal Cyan', hex: '#80deea' },
  { label: 'Pure White', hex: '#ffffff' },
  { label: 'Emerald', hex: '#10b981' },
  { label: 'Rose Gold', hex: '#f43f5e' },
]

export function BorderPanel({
  borderType,
  color,
  opacity,
  onBorderType,
  onColor,
  onOpacity,
}: BorderPanelProps) {
  return (
    <section className="panel" id="border-panel">
      <h2>Islamic Borders & Arabesque Frames</h2>

      <div className="motion-grid" style={{ marginBottom: '0.8rem' }}>
        {BORDER_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={`motion-card ${borderType === opt.id ? 'active' : ''}`}
            onClick={() => onBorderType(opt.id)}
            title={opt.desc}
          >
            <span className="motion-icon">{opt.icon}</span>
            <div className="motion-info">
              <span className="motion-title">{opt.label}</span>
              <span className="motion-desc">{opt.desc}</span>
            </div>
          </button>
        ))}
      </div>

      {borderType !== 'none' && (
        <>
          <div className="row" style={{ marginTop: '0.4rem' }}>
            <label style={{ flex: 1 }}>
              Frame Color
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginTop: '0.2rem' }}>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => onColor(e.target.value)}
                  style={{ width: '38px', height: '32px', padding: '0.1rem', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                  {QUICK_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      className="chip"
                      style={{
                        padding: '0.2rem 0.45rem',
                        fontSize: '0.74rem',
                        borderColor: color.toLowerCase() === c.hex.toLowerCase() ? '#ffd700' : 'transparent',
                      }}
                      onClick={() => onColor(c.hex)}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </label>
          </div>

          <div className="row" style={{ marginTop: '0.4rem' }}>
            <label style={{ flex: 1 }}>
              Frame Opacity ({Math.round(opacity * 100)}%)
              <input
                type="range"
                min={0.1}
                max={1.0}
                step={0.05}
                value={opacity}
                onChange={(e) => onOpacity(Number(e.target.value))}
                style={{ marginTop: '0.2rem' }}
              />
            </label>
          </div>
        </>
      )}
    </section>
  )
}
