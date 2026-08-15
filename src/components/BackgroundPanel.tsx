import { useState, useRef } from 'react'
import {
  STOCK_CATEGORIES,
  getImagesForCategory,
  getRandomStockImage,
  searchStockImages,
  type StockCategory,
} from '../api/unsplash'

interface BackgroundPanelProps {
  url: string
  fit: 'cover-crop' | 'blur-fill'
  onUrlChange: (url: string) => void
  onFitChange: (fit: 'cover-crop' | 'blur-fill') => void
}

const CATEGORY_ICONS: Record<StockCategory, string> = {
  'Mosques & Holy Sites': '🕌',
  'Mountains & Summits': '🏔️',
  'Oceans & Waterfalls': '🌊',
  'Forests & Redwoods': '🌲',
  'Deserts & Dunes': '🏜️',
  'Cosmos & Galaxies': '🌌',
  'Sunsets & Golden Hour': '🌅',
  'Rain & Atmospheric Fog': '🌧️',
}

export function BackgroundPanel({ url, fit, onUrlChange, onFitChange }: BackgroundPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<StockCategory>('Mosques & Holy Sites')
  const [searchQuery, setSearchQuery] = useState('')
  const [shuffleSeed, setShuffleSeed] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const images = searchQuery.trim()
    ? searchStockImages(searchQuery)
    : getImagesForCategory(selectedCategory, shuffleSeed)

  const handleRandomBackground = () => {
    setSearchQuery('')
    const randomImg = getRandomStockImage()
    setSelectedCategory(randomImg.category)
    onUrlChange(randomImg.full)
  }

  const handleRefreshGallery = () => {
    setShuffleSeed((prev) => prev + 2)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const objectUrl = URL.createObjectURL(file)
    onUrlChange(objectUrl)
  }

  return (
    <section className="panel" id="background-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
        <h2 style={{ margin: 0 }}>Stock Footage & Backgrounds</h2>
        <div style={{ display: 'flex', gap: '0.3rem' }}>
          <button
            type="button"
            className="btn"
            onClick={() => fileInputRef.current?.click()}
            title="Upload your own background image or video"
            style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
          >
            📤 Upload
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/mp4,video/webm"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
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
      </div>

      <div style={{ marginBottom: '0.4rem' }}>
        <input
          id="bg-search-input"
          type="search"
          placeholder="🔍 Search footage (e.g. Kaaba, waterfall, sunset, stars)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '100%', fontSize: '0.82rem' }}
        />
      </div>

      {!searchQuery && (
        <div className="picks" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
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
      )}

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
