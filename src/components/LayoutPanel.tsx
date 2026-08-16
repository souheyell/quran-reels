interface LayoutPanelProps {
  textPosition: 'center' | 'lower-third'
  aspectRatio: '9:16' | '1:1' | '16:9'
  onTextPosition: (v: 'center' | 'lower-third') => void
  onAspectRatio: (v: '9:16' | '1:1' | '16:9') => void
}

export function LayoutPanel({
  textPosition,
  aspectRatio,
  onTextPosition,
  onAspectRatio,
}: LayoutPanelProps) {
  return (
    <section className="panel" id="layout-panel">
      <h2>📐 Canvas Aspect Ratio & Layout</h2>

      <label>Aspect Ratio</label>
      <div className="motion-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <button
          type="button"
          className={`motion-card ${aspectRatio === '9:16' ? 'active' : ''}`}
          onClick={() => onAspectRatio('9:16')}
        >
          <span className="motion-icon">📱</span>
          <div className="motion-info">
            <span className="motion-title">9:16 Reel</span>
            <span className="motion-desc">TikTok / Shorts</span>
          </div>
        </button>

        <button
          type="button"
          className={`motion-card ${aspectRatio === '1:1' ? 'active' : ''}`}
          onClick={() => onAspectRatio('1:1')}
        >
          <span className="motion-icon">⏹️</span>
          <div className="motion-info">
            <span className="motion-title">1:1 Square</span>
            <span className="motion-desc">Instagram Feed</span>
          </div>
        </button>

        <button
          type="button"
          className={`motion-card ${aspectRatio === '16:9' ? 'active' : ''}`}
          onClick={() => onAspectRatio('16:9')}
        >
          <span className="motion-icon">🖥️</span>
          <div className="motion-info">
            <span className="motion-title">16:9 Wide</span>
            <span className="motion-desc">YouTube Video</span>
          </div>
        </button>
      </div>

      <label style={{ marginTop: '0.4rem' }}>Text Alignment Position</label>
      <div className="motion-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <button
          type="button"
          className={`motion-card ${textPosition === 'center' ? 'active' : ''}`}
          onClick={() => onTextPosition('center')}
        >
          <span className="motion-icon">🎯</span>
          <div className="motion-info">
            <span className="motion-title">Centered</span>
            <span className="motion-desc">Classic focus</span>
          </div>
        </button>

        <button
          type="button"
          className={`motion-card ${textPosition === 'lower-third' ? 'active' : ''}`}
          onClick={() => onTextPosition('lower-third')}
        >
          <span className="motion-icon">🎬</span>
          <div className="motion-info">
            <span className="motion-title">Lower-Third</span>
            <span className="motion-desc">Cinematic style</span>
          </div>
        </button>
      </div>
    </section>
  )
}
