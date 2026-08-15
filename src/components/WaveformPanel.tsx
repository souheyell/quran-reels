import type { WaveformType } from '../types'

interface WaveformPanelProps {
  waveformType: WaveformType
  color: string
  opacity: number
  onWaveformType: (type: WaveformType) => void
  onColor: (color: string) => void
  onOpacity: (opacity: number) => void
}

const WAVEFORM_OPTIONS: Array<{ id: WaveformType; label: string; icon: string; desc: string }> = [
  { id: 'none', label: 'None', icon: '⏹️', desc: 'No audio visualizer' },
  { id: 'symmetric-bars', label: 'Symmetric Bars', icon: '📊', desc: 'Resonant frequency bars' },
  { id: 'smooth-wave', label: 'Glowing Wave', icon: '🌊', desc: 'Fluid sine harmonic curve' },
  { id: 'pulse-line', label: 'Voice Pulse', icon: '⚡', desc: 'Heartbeat presence line' },
  { id: 'dots-matrix', label: 'Dots Matrix', icon: '✨', desc: 'Radiant frequency dots' },
]

const QUICK_COLORS = [
  { label: 'Gold', hex: '#ffd700' },
  { label: 'Amber', hex: '#f59e0b' },
  { label: 'Cyan', hex: '#80deea' },
  { label: 'White', hex: '#ffffff' },
  { label: 'Emerald', hex: '#34d399' },
]

export function WaveformPanel({
  waveformType,
  color,
  opacity,
  onWaveformType,
  onColor,
  onOpacity,
}: WaveformPanelProps) {
  return (
    <section className="panel" id="waveform-panel">
      <h2>Voice Audio Spectrum Visualizer</h2>

      <div className="motion-grid" style={{ marginBottom: '0.8rem' }}>
        {WAVEFORM_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={`motion-card ${waveformType === opt.id ? 'active' : ''}`}
            onClick={() => onWaveformType(opt.id)}
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

      {waveformType !== 'none' && (
        <>
          <div className="row" style={{ marginTop: '0.4rem' }}>
            <label style={{ flex: 1 }}>
              Visualizer Color
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
              Visualizer Opacity ({Math.round(opacity * 100)}%)
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
