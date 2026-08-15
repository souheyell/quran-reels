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
      <h2>Layout & Format</h2>
      <label>
        Text position
        <select
          id="text-position-select"
          value={textPosition}
          onChange={(e) => onTextPosition(e.target.value as 'center' | 'lower-third')}
        >
          <option value="center">Center</option>
          <option value="lower-third">Lower third</option>
        </select>
      </label>
      <label>
        Aspect ratio
        <select
          id="aspect-ratio-select"
          value={aspectRatio}
          onChange={(e) => onAspectRatio(e.target.value as '9:16' | '1:1' | '16:9')}
        >
          <option value="9:16">9:16 Portrait (Reels / TikTok)</option>
          <option value="1:1">1:1 Square (Feed)</option>
          <option value="16:9">16:9 Landscape (YouTube)</option>
        </select>
      </label>
    </section>
  )
}
