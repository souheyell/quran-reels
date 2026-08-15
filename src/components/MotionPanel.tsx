interface MotionPanelProps {
  motionType: 'kenburns-zoom' | 'kenburns-pan' | 'static'
  duration: number
  onMotionType: (v: 'kenburns-zoom' | 'kenburns-pan' | 'static') => void
  onDuration: (v: number) => void
}

export function MotionPanel({ motionType, duration, onMotionType, onDuration }: MotionPanelProps) {
  return (
    <section className="panel" id="motion-panel">
      <h2>Motion Effect</h2>
      <label>
        Style
        <select
          id="motion-type-select"
          value={motionType}
          onChange={(e) =>
            onMotionType(e.target.value as 'kenburns-zoom' | 'kenburns-pan' | 'static')
          }
        >
          <option value="kenburns-zoom">Ken Burns zoom</option>
          <option value="kenburns-pan">Ken Burns pan</option>
          <option value="static">Static</option>
        </select>
      </label>
      <label>
        Duration {duration}s
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
