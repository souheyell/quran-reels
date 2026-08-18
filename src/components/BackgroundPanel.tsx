import { useState, useRef, useEffect } from 'react'
import {
  STOCK_CATEGORIES,
  STOCK_VIDEO_LOOPS,
  getImagesForCategory,
  getRandomStockImage,
  searchStockImages,
  type StockCategory,
  type CuratedMedia,
} from '../api/unsplash'
import { getMediaStatus, subscribeMediaStatus, type MediaLoadStatus } from '../lib/imageCache'

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
  const [isDragging, setIsDragging] = useState(false)
  const [currentMediaStatus, setCurrentMediaStatus] = useState<MediaLoadStatus>(() => getMediaStatus(url))
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setCurrentMediaStatus(getMediaStatus(url))
    const unsubscribe = subscribeMediaStatus((changedUrl, status) => {
      if (changedUrl === url) {
        setCurrentMediaStatus(status)
      }
    })
    return unsubscribe
  }, [url])

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

  const processFile = (file: File) => {
    const isVideo = file.type.startsWith('video/')
    const objectUrl = URL.createObjectURL(file)
    setCustomFileName(file.name)
    onUrlChange(objectUrl, isVideo ? 'video' : 'image')
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  const isCurrentCustom = url.startsWith('blob:')
  const currentItem = displayedMedia.find((m) => m.full === url)

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

      {/* ── Real-Time Media Download & Cache Status Banner ───────── */}
      <div
        className={`media-status-banner status-${currentMediaStatus}`}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div className="media-status-left">
          <span className="media-status-icon">
            {currentMediaStatus === 'ready'
              ? '⚡'
              : currentMediaStatus === 'loading'
                ? '⏳'
                : currentMediaStatus === 'error'
                  ? '⚠️'
                  : '📷'}
          </span>
          <div className="media-status-details">
            <div className="media-status-title">
              {customFileName
                ? customFileName
                : currentItem
                  ? currentItem.title
                  : 'Custom Background'}
            </div>
            <div className="media-status-subtext">
              {currentMediaStatus === 'ready' && (
                <span className="badge-ready">
                  ✅ Downloaded & Ready in Cache {currentItem?.sizeLabel ? `(${currentItem.sizeLabel})` : '(Instant 60FPS)'}
                </span>
              )}
              {currentMediaStatus === 'loading' && (
                <span className="badge-loading">
                  ⏳ Caching high-res footage from CDN…
                </span>
              )}
              {currentMediaStatus === 'error' && (
                <span className="badge-error">
                  ⚠️ Network timeout — Fallback dark gradient active
                </span>
              )}
              {currentMediaStatus === 'idle' && (
                <span className="badge-idle">
                  {mediaType === 'video' ? '🎬 Video Loop Selected' : '📷 4K Photo Selected'}
                </span>
              )}
            </div>
          </div>
        </div>

        {isDragging ? (
          <span className="drag-hint">📥 Drop your video or image file here!</span>
        ) : (
          <button
            type="button"
            className="btn btn-xs btn-outline"
            onClick={() => fileInputRef.current?.click()}
          >
            Drop / Upload
          </button>
        )}
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
                  {item.sizeLabel && (
                    <span className="thumb-size-pill">{item.sizeLabel}</span>
                  )}
                  {isSelected && (
                    <span className="thumb-check">✓</span>
                  )}
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
