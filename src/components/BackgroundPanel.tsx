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
  Mountains: '🏔️',
  Oceans: '🌊',
  Forests: '🌲',
  Mosques: '🕌',
}

export function BackgroundPanel({ url, fit, onUrlChange, onFitChange }: BackgroundPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<StockCategory>('Mountains')

  const images = getImagesForCategory(selectedCategory)

  const handleRandomBackground = () => {
    const randomImg = getRandomStockImage()
    setSelectedCategory(randomImg.category)
    onUrlChange(randomImg.full)
  }

  return (
    <section className="panel" id="background-panel">
      <h2>Background Nature & Mosque Stock</h2>

      <div className="picks">
        {STOCK_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`chip ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => {
              setSelectedCategory(cat)
              const firstImg = getImagesForCategory(cat)[0]
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
          title="Pick a random nature or mosque photo"
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
            title={item.title}
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
