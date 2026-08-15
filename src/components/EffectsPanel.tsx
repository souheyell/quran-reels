import type { AtmosphericEffectType } from '../types'

interface EffectsPanelProps {
  effectType: AtmosphericEffectType
  intensity: number
  speed: number
  onEffectType: (v: AtmosphericEffectType) => void
  onIntensity: (v: number) => void
  onSpeed: (v: number) => void
}

const EFFECT_OPTIONS: Array<{ id: AtmosphericEffectType; label: string; icon: string }> = [
  { id: 'none', label: 'None (Clean)', icon: '🚫' },
  { id: 'fireflies', label: 'Golden Fireflies / Embers', icon: '✨' },
  { id: 'slow-snow', label: 'Gentle Slow Snow', icon: '❄️' },
  { id: 'dust-motes', label: 'Sunbeam Dust Motes', icon: '☀️' },
  { id: 'stars', label: 'Twinkling Night Stars', icon: '🌌' },
  { id: 'gentle-rain', label: 'Soothing Gentle Rain', icon: '🌧️' },
]

export function EffectsPanel({
  effectType,
  intensity,
  speed,
  onEffectType,
  onIntensity,
  onSpeed,
}: EffectsPanelProps) {
  return (
    <section className="panel" id="effects-panel">
      <h2>Atmospheric Video Effects</h2>

      <label>
        Particle Overlay Effect
        <select
          id="effect-type-select"
          value={effectType}
          onChange={(e) => onEffectType(e.target.value as AtmosphericEffectType)}
          style={{ marginTop: '0.2rem' }}
        >
          {EFFECT_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.icon} {opt.label}
            </option>
          ))}
        </select>
      </label>

      {effectType !== 'none' && (
        <div className="row" style={{ marginTop: '0.3rem' }}>
          <label>
            Intensity {Math.round(intensity * 100)}%
            <input
              id="effect-intensity-input"
              type="range"
              min={0.1}
              max={1.0}
              step={0.05}
              value={intensity}
              onChange={(e) => onIntensity(Number(e.target.value))}
            />
          </label>

          <label>
            Speed {speed.toFixed(1)}x
            <input
              id="effect-speed-input"
              type="range"
              min={0.4}
              max={2.0}
              step={0.1}
              value={speed}
              onChange={(e) => onSpeed(Number(e.target.value))}
            />
          </label>
        </div>
      )}
    </section>
  )
}
