import type { ReelConfig } from '../types'

interface MotionPanelProps {
  motionType: ReelConfig['motion']['type']
  duration: number
  onMotionType: (v: ReelConfig['motion']['type']) => void
  onDuration: (v: number) => void
}

const MOTION_OPTIONS: Array<{ id: ReelConfig['motion']['type']; label: string }> = [
  { id: 'kenburns-zoom', label: '🔍 Ken Burns Zoom In' },
  { id: 'kenburns-zoom-out', label: '🔎 Ken Burns Zoom Out (Reveal)' },
  { id: 'kenburns-pan', label: '↔️ Horizontal Pan Drift' },
  { id: 'kenburns-drift-up', label: '⬆️ Ascending Tilt (Mountains/Minarets)' },
  { id: 'kenburns-drift-diagonal', label: '↗️ Diagonal Cinematic Glide' },
  { id: 'kenburns-pulse', label: '🌊 Contemplative Pulse' },
  { id: 'static', label: '⏹️ Still Canvas (No Motion)' },
]

export function MotionPanel({ motionType, duration, onMotionType, onDuration }: MotionPanelProps) {
  const handleRandomMotion = () => {
    const activeMotions = MOTION_OPTIONS.filter((m) => m.id !== 'static')
    const picked = activeMotions[Math.floor(Math.random() * activeMotions.length)]
    onMotionType(picked.id)
  }

  return (
    <section className="panel" id="motion-panel">
      <h2>Background Motion Effects</h2>
      <label>
        Cinematic Camera Motion
        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem' }}>
          <select
            id="motion-type-select"
            value={motionType}
            onChange={(e) =>
              onMotionType(e.target.value as ReelConfig['motion']['type'])
            }
            style={{ flex: 1 }}
          >
            {MOTION_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn"
            onClick={handleRandomMotion}
            title="Randomize camera motion style"
            style={{ padding: '0.4rem 0.6rem' }}
          >
            🎲
          </button>
        </div>
      </label>
      <label>
        Default Cycle Speed {duration}s
        <input
          id="duration-input"
          type="range"
          min={5}
          max={30}
          step={1}
          value={duration}
          onChange={(e) => onDuration(Number(e.target.value))}
        />
      </label>
    </section>
  )
}
