import { useState, useRef } from 'react'
import {
  STOCK_CATEGORIES,
  STOCK_VIDEO_LOOPS,
  getImagesForCategory,
  getRandomStockImage,
  searchStockImages,
  type StockCategory,
  type CuratedMedia,
} from '../api/unsplash'

interface BackgroundPanelProps {
  url: string
  fit: 'cover-crop' | 'blur-fill'
  mediaType?: 'image' | 'video'
  onUrlChange: (url: string, mediaType?: 'image' | 'video') => void
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

type MediaFilter = 'all' | 'photos' | 'videos'

export function BackgroundPanel({
  url,
  fit,
  mediaType,
  onUrlChange,
  onFitChange,
}: BackgroundPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<StockCategory>('Mosques & Holy Sites')
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('photos')
  const [searchQuery, setSearchQuery] = useState('')
  const [shuffleSeed, setShuffleSeed] = useState(0)
  const [customFileName, setCustomFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const photos = searchQuery.trim()
    ? searchStockImages(searchQuery)
    : getImagesForCategory(selectedCategory, shuffleSeed)

  let displayedMedia: CuratedMedia[] = []
  if (mediaFilter === 'videos') {
    displayedMedia = searchQuery.trim()
      ? STOCK_VIDEO_LOOPS.filter(
          (v) =>
            v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.category.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      : STOCK_VIDEO_LOOPS
  } else if (mediaFilter === 'photos') {
    displayedMedia = photos.filter((m) => m.mediaType !== 'video')
  } else {
    displayedMedia = [...STOCK_VIDEO_LOOPS, ...photos]
  }

  const handleRandomBackground = () => {
    setSearchQuery('')
    const randomImg = getRandomStockImage()
    setSelectedCategory(randomImg.category)
    onUrlChange(randomImg.full, randomImg.mediaType)
  }

  const handleRefreshGallery = () => {
    setShuffleSeed((prev) => prev + 2)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const isVideo = file.type.startsWith('video/')
    const objectUrl = URL.createObjectURL(file)
    setCustomFileName(file.name)
    onUrlChange(objectUrl, isVideo ? 'video' : 'image')
  }

  const isCurrentCustom = url.startsWith('blob:')

  return (
    <section className="panel" id="background-panel">
      <div className="panel-header-row">
        <h2>Stock Footage & Backgrounds</h2>
        <div className="panel-actions">
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => fileInputRef.current?.click()}
            title="Upload custom video (MP4/WebM) or image"
          >
            📤 Upload Video / Photo
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,image/*"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            className="btn btn-sm"
            onClick={handleRefreshGallery}
            title="Shuffle stock media"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Media Type Sub-Filter Tabs */}
      <div className="media-filter-bar">
        <button
          type="button"
          className={`filter-tab ${mediaFilter === 'photos' ? 'active' : ''}`}
          onClick={() => setMediaFilter('photos')}
        >
          📷 4K Photos ({photos.length})
        </button>
        <button
          type="button"
          className={`filter-tab ${mediaFilter === 'videos' ? 'active' : ''}`}
          onClick={() => setMediaFilter('videos')}
        >
          🎬 Video Loops ({STOCK_VIDEO_LOOPS.length})
        </button>
        <button
          type="button"
          className={`filter-tab ${mediaFilter === 'all' ? 'active' : ''}`}
          onClick={() => setMediaFilter('all')}
        >
          ✨ All Media
        </button>
      </div>

      {/* Search Input */}
      <div className="search-wrap">
        <input
          id="bg-search-input"
          type="search"
          placeholder="🔍 Search footage (Kaaba, stars, clouds, sunset)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Category Chips (when not searching and on photos) */}
      {!searchQuery && mediaFilter !== 'videos' && (
        <div className="picks category-chips">
          {STOCK_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`chip ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => {
                setSelectedCategory(cat)
                const first = getImagesForCategory(cat, shuffleSeed)[0]
                if (first) onUrlChange(first.full, first.mediaType)
              }}
            >
              {CATEGORY_ICONS[cat]} {cat}
            </button>
          ))}
          <button
            type="button"
            className="chip chip-accent"
            onClick={handleRandomBackground}
            title="Pick a random backdrop"
          >
            🎲 Random
          </button>
        </div>
      )}

      {/* Uploaded File Banner (if active) */}
      {isCurrentCustom && (
        <div className="custom-media-banner">
          <div className="custom-media-info">
            <span className="custom-badge">
              {mediaType === 'video' ? '🎬 Custom Video Active' : '📷 Custom Photo Active'}
            </span>
            <span className="custom-name">{customFileName || 'Uploaded file'}</span>
          </div>
          <button
            type="button"
            className="btn btn-xs"
            onClick={() => fileInputRef.current?.click()}
          >
            Change
          </button>
        </div>
      )}

      {/* Media Thumbnails Grid */}
      <div className="thumbs-container">
        <div className="thumbs">
          {displayedMedia.map((item) => {
            const isSelected = item.full === url
            return (
              <button
                key={item.id}
                type="button"
                className={`thumb ${isSelected ? 'active' : ''}`}
                title={`${item.title} (${item.source})`}
                onClick={() => onUrlChange(item.full, item.mediaType)}
              >
                <img src={item.thumb} alt={item.title} loading="lazy" />
                <div className="thumb-overlay">
                  <span className="thumb-badge">
                    {item.mediaType === 'video' ? '🎬 Video' : '📷'}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Controls Row: Fit Style */}
      <div className="row" style={{ marginTop: '0.4rem' }}>
        <label style={{ flex: 1 }}>
          Fit & Scaling
          <select
            id="bg-fit-select"
            value={fit}
            onChange={(e) => onFitChange(e.target.value as 'cover-crop' | 'blur-fill')}
          >
            <option value="cover-crop">Cover (Crop to fill 9:16 frame)</option>
            <option value="blur-fill">Blurred Mirror Fill (Letterbox)</option>
          </select>
        </label>
      </div>
    </section>
  )
}
