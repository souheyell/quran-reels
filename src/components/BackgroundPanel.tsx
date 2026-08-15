import { useState } from 'react'
import {
  STOCK_CATEGORIES,
  getImagesForCategory,
  getRandomStockImage,
  type StockCategory,
} from '../api/unsplash'

interface BackgroundPanelProps {
  url: string
  fit: 'cover-crop' | 'blur-fill'
  onUrlChange: (url: string) => void
  onFitChange: (fit: 'cover-crop' | 'blur-fill') => void
}

const CATEGORY_ICONS: Record<StockCategory, string> = {
  Mosques: '🕌',
  Mountains: '🏔️',
  Oceans: '🌊',
  Forests: '🌲',
  Deserts: '🏜️',
  Cosmos: '🌌',
}

export function BackgroundPanel({ url, fit, onUrlChange, onFitChange }: BackgroundPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<StockCategory>('Mosques')
  const [shuffleSeed, setShuffleSeed] = useState(0)

  const images = getImagesForCategory(selectedCategory, shuffleSeed)

  const handleRandomBackground = () => {
    const randomImg = getRandomStockImage()
    setSelectedCategory(randomImg.category)
    onUrlChange(randomImg.full)
  }

  const handleRefreshGallery = () => {
    setShuffleSeed((prev) => prev + 2)
  }

  return (
    <section className="panel" id="background-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
        <h2 style={{ margin: 0 }}>Background Footage & Stock</h2>
        <button
          type="button"
          className="btn"
          onClick={handleRefreshGallery}
          title="Shuffle and refresh stock photos"
          style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
        >
          🔄 Refresh
        </button>
      </div>

      <div className="picks">
        {STOCK_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`chip ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => {
              setSelectedCategory(cat)
              const firstImg = getImagesForCategory(cat, shuffleSeed)[0]
              if (firstImg) onUrlChange(firstImg.full)
            }}
          >
            {CATEGORY_ICONS[cat]} {cat}
          </button>
        ))}
        <button
          type="button"
          className="chip"
          onClick={handleRandomBackground}
          title="Pick a random photo across all categories"
        >
          🎲 Random
        </button>
      </div>

      <div className="thumbs">
        {images.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`thumb ${item.full === url ? 'active' : ''}`}
            title={`${item.title} (${item.source})`}
            onClick={() => onUrlChange(item.full)}
          >
            <img src={item.thumb} alt={item.title} loading="lazy" />
          </button>
        ))}
      </div>

      <label>
        Fit Style
        <select
          id="bg-fit-select"
          value={fit}
          onChange={(e) => onFitChange(e.target.value as 'cover-crop' | 'blur-fill')}
        >
          <option value="cover-crop">Cover (crop to frame)</option>
          <option value="blur-fill">Blurred fill</option>
        </select>
      </label>
    </section>
  )
}
