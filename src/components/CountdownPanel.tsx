import type { CountdownConfig, CountdownStyle } from '../types'

interface CountdownPanelProps {
  countdown: CountdownConfig
  onToggleEnabled: (enabled: boolean) => void
  onStyleChange: (style: CountdownStyle) => void
  onPositionChange: (position: CountdownConfig['position']) => void
  onColorChange: (color: string) => void
  onShowTotalChange: (showTotal: boolean) => void
  onOpacityChange: (opacity: number) => void
}

const COUNTDOWN_STYLES: { id: CountdownStyle; name: string; icon: string; desc: string }[] = [
  {
    id: 'glowing-ring',
    name: 'Glowing Ring',
    icon: '⭕',
    desc: 'Circular neon countdown arc with remaining seconds',
  },
  {
    id: 'top-bar',
    name: 'Top Progress Bar',
    icon: '📏',
    desc: 'Edge-to-edge sleek gradient progress bar at the top',
  },
  {
    id: 'digital-pill',
    name: 'Digital Pill',
    icon: '⏳',
    desc: 'Glassmorphism timer badge with live countdown',
  },
  {
    id: 'minimal-clock',
    name: 'Minimal Clock',
    icon: '⏱️',
    desc: 'Clean high-contrast digital clock typography',
  },
]

const QUICK_COLORS = ['#ffd700', '#6366f1', '#10b981', '#38bdf8', '#f59e0b', '#ec4899', '#ffffff']

export function CountdownPanel({
  countdown,
  onToggleEnabled,
  onStyleChange,
  onPositionChange,
  onColorChange,
  onShowTotalChange,
  onOpacityChange,
}: CountdownPanelProps) {
  const isEnabled = countdown?.enabled ?? false
  const activeStyle = countdown?.style ?? 'glowing-ring'
  const activePos = countdown?.position ?? 'top-right'
  const activeColor = countdown?.color ?? '#ffd700'
  const showTotal = countdown?.showTotalTime ?? false
  const opacity = countdown?.opacity ?? 0.9

  return (
    <section className="panel" id="countdown-panel">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
        <h2 style={{ margin: 0 }}>⏱️ Visual Countdown Timer</h2>
        <label className="toggle-switch-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input
            id="countdown-toggle"
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => onToggleEnabled(e.target.checked)}
          />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: isEnabled ? '#4ade80' : '#94a3b8' }}>
            {isEnabled ? 'ACTIVE' : 'OFF'}
          </span>
        </label>
      </div>

      <p className="panel-desc" style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0 0 1rem' }}>
        Display an elegant real-time countdown on your reel to encourage viewers to listen until the end.
      </p>

      {isEnabled && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Style Selector */}
          <div>
            <span className="panel-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: '0.4rem' }}>
              Countdown Style
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.45rem' }}>
              {COUNTDOWN_STYLES.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  className={`chip ${activeStyle === st.id ? 'active' : ''}`}
                  onClick={() => onStyleChange(st.id)}
                  title={st.desc}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    padding: '0.55rem 0.65rem',
                    textAlign: 'left',
                    height: 'auto',
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                    {st.icon} {st.name}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.2rem', lineHeight: 1.2 }}>
                    {st.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Position Selector */}
          <div className="row">
            <label style={{ flex: 1 }}>
              Position
              <select
                id="countdown-position-select"
                value={activePos}
                onChange={(e) => onPositionChange(e.target.value as CountdownConfig['position'])}
              >
                <option value="top-right">Top Right</option>
                <option value="top">Top Center</option>
                <option value="top-left">Top Left</option>
                <option value="bottom">Bottom Center</option>
              </select>
            </label>

            <label style={{ width: '90px', flexShrink: 0 }} className="color">
              Color
              <input
                id="countdown-color-input"
                type="color"
                value={activeColor}
                onChange={(e) => onColorChange(e.target.value)}
              />
            </label>
          </div>

          {/* Quick Color Chips */}
          <div>
            <span className="panel-label" style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.3rem' }}>
              Quick Accent Colors:
            </span>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              {QUICK_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onColorChange(c)}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '999px',
                    background: c,
                    border: activeColor === c ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.2)',
                    cursor: 'pointer',
                    boxShadow: activeColor === c ? `0 0 8px ${c}` : 'none',
                  }}
                  title={c}
                />
              ))}
            </div>
          </div>

          {/* Additional Options */}
          <div className="row" style={{ marginTop: '0.2rem' }}>
            <label style={{ flex: 1 }}>
              Opacity ({Math.round(opacity * 100)}%)
              <input
                id="countdown-opacity-range"
                type="range"
                min={0.3}
                max={1.0}
                step={0.05}
                value={opacity}
                onChange={(e) => onOpacityChange(Number(e.target.value))}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.8rem', paddingTop: '1rem' }}>
              <input
                id="countdown-total-time-checkbox"
                type="checkbox"
                checked={showTotal}
                onChange={(e) => onShowTotalChange(e.target.checked)}
              />
              Show Total Time
            </label>
          </div>
        </div>
      )}
    </section>
  )
}
