import { useState, useRef, useEffect } from 'react'
import {
  STOCK_CATEGORIES,
  STOCK_VIDEO_LOOPS,
  getImagesForCategory,
  getRandomStockImage,
  searchStockImages,
  registerLocalMedia,
  getAllStockVideoLoops,
  type StockCategory,
  type CuratedMedia,
} from '../api/unsplash'
import {
  fetchLocalMedia,
  openBackgroundsFolder,
  uploadLocalMedia,
  type LocalMediaCatalog,
  type LocalMediaItem,
} from '../lib/localMedia'
import { getMediaStatus, subscribeMediaStatus, retryLoadMedia, type MediaLoadStatus } from '../lib/imageCache'
import {
  getAllVaultMedia,
  saveMediaToVault,
  deleteVaultMedia,
  type LiveUserMedia,
} from '../lib/mediaDB'

interface BackgroundPanelProps {
  url: string
  fit: 'cover-crop' | 'blur-fill'
  mediaType?: 'image' | 'video'
  onUrlChange: (url: string, mediaType?: 'image' | 'video', vaultMediaId?: string) => void
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

type MediaFilter = 'local' | 'videos' | 'photos' | 'uploads'

/**
 * Helper to extract a high-quality video thumbnail frame via temporary video & canvas
 */
function extractVideoThumbnail(file: File): Promise<string> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    const objectUrl = URL.createObjectURL(file)
    video.src = objectUrl
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'

    let resolved = false
    const finish = (thumbUrl: string) => {
      if (!resolved) {
        resolved = true
        resolve(thumbUrl)
      }
    }

    const timer = setTimeout(() => {
      finish(objectUrl)
    }, 4000)

    video.onloadedmetadata = () => {
      video.currentTime = Math.min(1.0, (video.duration || 2) / 2)
    }

    video.onseeked = () => {
      clearTimeout(timer)
      try {
        const canvas = document.createElement('canvas')
        canvas.width = 300
        canvas.height = 400
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(video, 0, 0, 300, 400)
          const dataUri = canvas.toDataURL('image/jpeg', 0.82)
          finish(dataUri)
          return
        }
      } catch {
        // fallback
      }
      finish(objectUrl)
    }

    video.onerror = () => {
      clearTimeout(timer)
      finish(objectUrl)
    }
  })
}

export function BackgroundPanel({
  url,
  fit,
  mediaType,
  onUrlChange,
  onFitChange,
}: BackgroundPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<StockCategory>('Mosques & Holy Sites')
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>(
    mediaType === 'video' || /\.(mp4|webm|mov|m4v)($|\?)/i.test(url) ? 'videos' : 'photos',
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [shuffleSeed, setShuffleSeed] = useState(0)
  const [customFileName, setCustomFileName] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [userUploads, setUserUploads] = useState<LiveUserMedia[]>([])
  const [currentMediaStatus, setCurrentMediaStatus] = useState<MediaLoadStatus>(() => getMediaStatus(url))
  const fileInputRef = useRef<HTMLInputElement>(null)
  const localFileInputRef = useRef<HTMLInputElement>(null)

  // Local filesystem folder state
  const [localCatalog, setLocalCatalog] = useState<LocalMediaCatalog>({
    images: [],
    videos: [],
    folderPath: 'public/backgrounds',
  })
  const [localTypeFilter, setLocalTypeFilter] = useState<'all' | 'images' | 'videos'>('all')
  const [isLocalLoading, setIsLocalLoading] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const toastTimeoutRef = useRef<number | null>(null)

  const showToast = (msg: string) => {
    setToastMsg(msg)
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    toastTimeoutRef.current = window.setTimeout(() => setToastMsg(null), 3500)
  }

  const loadLocalCatalog = async () => {
    setIsLocalLoading(true)
    try {
      const data = await fetchLocalMedia()
      setLocalCatalog(data)
      registerLocalMedia(data)
    } finally {
      setIsLocalLoading(false)
    }
  }

  useEffect(() => {
    void loadLocalCatalog()
  }, [])

  const handleOpenLocalFolder = async () => {
    const res = await openBackgroundsFolder()
    if (res.success) {
      showToast('📂 Opened backgrounds folder in Finder!')
    } else {
      navigator.clipboard.writeText(res.folderPath || 'public/backgrounds')
      showToast(`📋 Copied folder path: ${res.folderPath || './backgrounds'}`)
    }
  }

  const handleCopyFolderPath = () => {
    const p = localCatalog.folderPath || 'public/backgrounds'
    navigator.clipboard.writeText(p)
    showToast('📋 Folder path copied to clipboard!')
  }

  const handleLocalDropOrPick = async (files: FileList | File[]) => {
    const fileList = Array.from(files)
    if (fileList.length === 0) return

    setIsLocalLoading(true)
    let addedCount = 0
    let lastUrl = ''
    let lastType: 'image' | 'video' = 'image'

    for (const file of fileList) {
      const res = await uploadLocalMedia(file)
      if (res.success && res.url) {
        addedCount++
        lastUrl = res.url
        lastType = res.mediaType || 'image'
      }
    }

    await loadLocalCatalog()
    setIsLocalLoading(false)

    if (addedCount > 0) {
      showToast(`✨ Added ${addedCount} file(s) to backgrounds folder!`)
      if (lastUrl) {
        onUrlChange(lastUrl, lastType)
      }
    } else {
      showToast('Save to local folder failed. You can also drop files directly in Finder.')
    }
  }

  // Load persistent media vault records from IndexedDB
  useEffect(() => {
    void getAllVaultMedia().then((items) => {
      setUserUploads(items)
    })
  }, [])

  useEffect(() => {
    setCurrentMediaStatus(getMediaStatus(url))
    const unsubscribe = subscribeMediaStatus((changedUrl, status) => {
      if (changedUrl === url) {
        setCurrentMediaStatus(status)
      }
    })
    return unsubscribe
  }, [url])

  // Sync active filter if external url/type changes
  useEffect(() => {
    if (url.startsWith('blob:')) {
      // Keep uploads active
    } else if (url.startsWith('/backgrounds/')) {
      setMediaFilter('local')
    } else if (mediaType === 'video' || /\.(mp4|webm|mov|m4v)($|\?)/i.test(url)) {
      if (mediaFilter !== 'uploads' && mediaFilter !== 'local') setMediaFilter('videos')
    }
  }, [url, mediaType])

  const photos = searchQuery.trim()
    ? searchStockImages(searchQuery)
    : getImagesForCategory(selectedCategory, shuffleSeed)

  const allVideos = getAllStockVideoLoops()

  let displayedMedia: CuratedMedia[] = []
  if (mediaFilter === 'videos') {
    displayedMedia = searchQuery.trim()
      ? allVideos.filter(
          (v) =>
            v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.category.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      : allVideos
  } else if (mediaFilter === 'photos') {
    displayedMedia = photos.filter((m) => m.mediaType !== 'video')
  }

  const localTotal = localCatalog.images.length + localCatalog.videos.length

  const displayedLocalItems: LocalMediaItem[] = []
  if (localTypeFilter === 'all' || localTypeFilter === 'images') {
    displayedLocalItems.push(...localCatalog.images)
  }
  if (localTypeFilter === 'all' || localTypeFilter === 'videos') {
    displayedLocalItems.push(...localCatalog.videos)
  }

  const handleRandomBackground = () => {
    setSearchQuery('')
    if (mediaFilter === 'videos') {
      const randIdx = Math.floor(Math.random() * STOCK_VIDEO_LOOPS.length)
      const randomVid = STOCK_VIDEO_LOOPS[randIdx]
      if (randomVid) {
        setSelectedCategory(randomVid.category)
        onUrlChange(randomVid.full, 'video')
      }
    } else {
      const randomImg = getRandomStockImage()
      setSelectedCategory(randomImg.category)
      onUrlChange(randomImg.full, 'image')
    }
  }

  const handleRefreshGallery = () => {
    setShuffleSeed((prev) => prev + 2)
  }

  const processFile = async (file: File) => {
    const isVideo = file.type.startsWith('video/')
    setCustomFileName(file.name)

    let thumbUrl = ''
    if (isVideo) {
      thumbUrl = await extractVideoThumbnail(file)
    } else {
      thumbUrl = URL.createObjectURL(file)
    }

    const sizeLabel = `${(file.size / (1024 * 1024)).toFixed(1)} MB`

    // Save permanently to IndexedDB vault
    const saved = await saveMediaToVault(
      file,
      file.name,
      isVideo ? 'video' : 'image',
      thumbUrl,
      sizeLabel,
    )

    setUserUploads((prev) => [saved, ...prev.filter((m) => m.id !== saved.id)])
    setMediaFilter('uploads')
    onUrlChange(saved.url, saved.mediaType, saved.id)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void processFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void processFile(file)
  }

  const handleDeleteUpload = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await deleteVaultMedia(id)
    const refreshed = await getAllVaultMedia()
    setUserUploads(refreshed)
  }

  const isCurrentCustom = url.startsWith('blob:')
  const currentItem = displayedMedia.find((m) => m.full === url)

  return (
    <section className="panel" id="background-panel">
      <div className="panel-header-row">
        <h2>Stock Footage &amp; Media Library</h2>
        <div className="panel-actions">
          <button
            type="button"
            className="btn btn-sm"
            onClick={handleOpenLocalFolder}
            title="Open backgrounds folder directly in Finder on your Mac"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              color: '#fbbf24',
              fontWeight: 600,
            }}
          >
            📂 Open Folder in Finder
          </button>
          <button
            type="button"
            className="btn btn-sm btn-accent-gold"
            onClick={() => fileInputRef.current?.click()}
            title="Upload custom video (MP4/WebM) or photo from your computer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid #f59e0b',
              color: '#fbbf24',
              fontWeight: 600,
            }}
          >
            📤 Upload Media
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
                  : mediaType === 'video' ? '🎬' : '📷'}
          </span>
          <div className="media-status-details">
            <div className="media-status-title">
              {customFileName
                ? customFileName
                : currentItem
                  ? currentItem.title
                  : isCurrentCustom
                    ? 'My Custom Vault Footage'
                    : mediaType === 'video'
                      ? 'Active Video Background (Continuous 60FPS)'
                      : 'Active Photo Background'}
            </div>
            <div className="media-status-subtext">
              {currentMediaStatus === 'ready' && (
                <span className="badge-ready">
                  ✅ Ready in Cache {currentItem?.sizeLabel ? `(${currentItem.sizeLabel})` : '(Continuous Playback)'}
                </span>
              )}
              {currentMediaStatus === 'loading' && (
                <span className="badge-loading">
                  ⏳ Loading footage from local cache…
                </span>
              )}
              {currentMediaStatus === 'error' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                  <span className="badge-error" style={{ color: '#fbbf24' }}>
                    ✨ Spiritual celestial backdrop active
                  </span>
                  <button
                    type="button"
                    onClick={() => retryLoadMedia(url, mediaType, () => {}, () => {})}
                    style={{
                      background: 'rgba(245, 158, 11, 0.2)',
                      border: '1px solid #f59e0b',
                      color: '#fbbf24',
                      borderRadius: '4px',
                      padding: '0.15rem 0.5rem',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    🔄 Retry Download
                  </button>
                </div>
              )}
              {currentMediaStatus === 'idle' && (
                <span className="badge-idle">
                  {mediaType === 'video' ? '🎬 Continuous Video Loop Selected' : '📷 4K Wallpaper Selected'}
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

      {/* ── Main Library Filter Tabs (Local vs Videos vs Photos vs Vault) ── */}
      <div className="media-filter-bar" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.3rem', marginBottom: '0.75rem' }}>
        <button
          type="button"
          className={`filter-tab ${mediaFilter === 'local' ? 'active' : ''}`}
          onClick={() => setMediaFilter('local')}
          title="Direct local folder on disk: backgrounds/images & backgrounds/videos"
          style={{
            padding: '0.5rem 0.2rem',
            background: mediaFilter === 'local' ? '#f59e0b' : 'rgba(255,255,255,0.05)',
            color: mediaFilter === 'local' ? '#000' : '#fff',
            fontWeight: 700,
            fontSize: '0.74rem',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          📂 Local Folder {localTotal > 0 ? `(${localTotal})` : ''}
        </button>
        <button
          type="button"
          className={`filter-tab ${mediaFilter === 'videos' ? 'active' : ''}`}
          onClick={() => setMediaFilter('videos')}
          style={{
            padding: '0.5rem 0.2rem',
            background: mediaFilter === 'videos' ? '#f59e0b' : 'rgba(255,255,255,0.05)',
            color: mediaFilter === 'videos' ? '#000' : '#fff',
            fontWeight: 700,
            fontSize: '0.74rem',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          🎬 Video Loops
        </button>
        <button
          type="button"
          className={`filter-tab ${mediaFilter === 'photos' ? 'active' : ''}`}
          onClick={() => setMediaFilter('photos')}
          style={{
            padding: '0.5rem 0.2rem',
            background: mediaFilter === 'photos' ? '#f59e0b' : 'rgba(255,255,255,0.05)',
            color: mediaFilter === 'photos' ? '#000' : '#fff',
            fontWeight: 700,
            fontSize: '0.74rem',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          📷 4K Photos
        </button>
        <button
          type="button"
          className={`filter-tab ${mediaFilter === 'uploads' ? 'active' : ''}`}
          onClick={() => setMediaFilter('uploads')}
          style={{
            padding: '0.5rem 0.2rem',
            background: mediaFilter === 'uploads' ? '#f59e0b' : 'rgba(255,255,255,0.05)',
            color: mediaFilter === 'uploads' ? '#000' : '#fff',
            fontWeight: 700,
            fontSize: '0.74rem',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          💾 Vault {userUploads.length > 0 ? `(${userUploads.length})` : ''}
        </button>
      </div>

      {/* ── Local Folder Resources View ─────────────────────────── */}
      {mediaFilter === 'local' && (
        <div className="local-folder-view" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Top Folder Controls Bar */}
          <div
            style={{
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              borderRadius: '10px',
              padding: '0.75rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 700, color: '#fbbf24' }}>
                <span>📁 Direct Local Media Folder</span>
                <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', fontWeight: 400 }}>
                  ({localCatalog.images.length} images, {localCatalog.videos.length} videos)
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <button
                  type="button"
                  className="btn btn-xs btn-accent-gold"
                  onClick={handleOpenLocalFolder}
                  title="Reveal folder in macOS Finder"
                  style={{ fontWeight: 600 }}
                >
                  📂 Open in Finder
                </button>
                <button
                  type="button"
                  className="btn btn-xs"
                  onClick={handleCopyFolderPath}
                  title="Copy path to clipboard"
                >
                  📋 Copy Path
                </button>
                <button
                  type="button"
                  className="btn btn-xs"
                  onClick={loadLocalCatalog}
                  disabled={isLocalLoading}
                  title="Re-scan directory for newly added files"
                >
                  {isLocalLoading ? '⏳ Scanning…' : '🔄 Refresh'}
                </button>
              </div>
            </div>

            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span>Location:</span>
              <code style={{ background: 'rgba(0,0,0,0.4)', padding: '2px 6px', borderRadius: '4px', color: '#e5e7eb', fontSize: '0.72rem' }}>
                {localCatalog.folderPath || 'public/backgrounds'} (or ./backgrounds)
              </code>
            </div>

            {/* Sub-filters: All | Images | Videos */}
            <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.2rem' }}>
              <button
                type="button"
                className={`category-chip ${localTypeFilter === 'all' ? 'active' : ''}`}
                style={{ padding: '0.2rem 0.55rem', fontSize: '0.72rem' }}
                onClick={() => setLocalTypeFilter('all')}
              >
                All ({localTotal})
              </button>
              <button
                type="button"
                className={`category-chip ${localTypeFilter === 'images' ? 'active' : ''}`}
                style={{ padding: '0.2rem 0.55rem', fontSize: '0.72rem' }}
                onClick={() => setLocalTypeFilter('images')}
              >
                🖼️ Images ({localCatalog.images.length})
              </button>
              <button
                type="button"
                className={`category-chip ${localTypeFilter === 'videos' ? 'active' : ''}`}
                style={{ padding: '0.2rem 0.55rem', fontSize: '0.72rem' }}
                onClick={() => setLocalTypeFilter('videos')}
              >
                🎬 Videos ({localCatalog.videos.length})
              </button>
            </div>
          </div>

          {/* Direct Dropzone that saves to disk */}
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setIsDragging(false)
              if (e.dataTransfer.files) void handleLocalDropOrPick(e.dataTransfer.files)
            }}
            onClick={() => localFileInputRef.current?.click()}
            style={{
              border: '2px dashed rgba(245, 158, 11, 0.35)',
              borderRadius: '10px',
              padding: '1.2rem 1rem',
              textAlign: 'center',
              cursor: 'pointer',
              background: isDragging ? 'rgba(245, 158, 11, 0.15)' : 'rgba(0,0,0,0.25)',
              transition: 'all 0.2s',
            }}
          >
            <input
              ref={localFileInputRef}
              type="file"
              multiple
              accept="video/mp4,video/webm,video/quicktime,image/*"
              onChange={(e) => {
                if (e.target.files) void handleLocalDropOrPick(e.target.files)
              }}
              style={{ display: 'none' }}
            />
            <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>📥</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff', marginBottom: '0.15rem' }}>
              Drop files here or click to save directly to backgrounds folder
            </div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>
              Or drop videos into <code>backgrounds/videos/</code> &amp; photos into <code>backgrounds/images/</code> in Finder
            </div>
          </div>

          {/* Thumbnails Grid */}
          {displayedLocalItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
              No {localTypeFilter === 'all' ? 'files' : localTypeFilter} found in <code>public/backgrounds/</code>. Drop files above or open Finder!
            </div>
          ) : (
            <div className="thumbs-container">
              <div className="thumbs">
                {displayedLocalItems.map((item) => {
                  const isSelected = item.url === url
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`thumb ${isSelected ? 'active' : ''}`}
                      title={`${item.title} (${item.mediaType === 'video' ? 'Video Loop' : '4K Photo'})`}
                      onClick={() => onUrlChange(item.url, item.mediaType)}
                    >
                      {item.mediaType === 'video' ? (
                        <video
                          src={item.url}
                          muted
                          playsInline
                          preload="metadata"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <img src={item.url} alt={item.title} loading="lazy" />
                      )}
                      <div className="thumb-overlay">
                        <span className="thumb-badge">
                          {item.mediaType === 'video' ? '🎬 Video' : '📷 Photo'}
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
          )}
        </div>
      )}

      {/* ── Category Chips & Search (For Videos and Photos) ─────── */}
      {mediaFilter !== 'uploads' && mediaFilter !== 'local' && (
        <>
          <div className="search-row">
            <input
              type="text"
              placeholder={
                mediaFilter === 'videos'
                  ? '🔍 Search video loops (stars, rain, desert, ocean...)'
                  : '🔍 Search 4K photos (mosque, sunset, nature...)'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="btn btn-xs"
                onClick={() => setSearchQuery('')}
              >
                Clear
              </button>
            )}
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={handleRandomBackground}
              title="Pick a random backdrop"
            >
              🎲 Random
            </button>
          </div>

          {/* Category Chips Bar */}
          {!searchQuery && (
            <div className="category-chips">
              {STOCK_CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat && !searchQuery
                return (
                  <button
                    key={cat}
                    type="button"
                    className={`category-chip ${isActive ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    <span>{CATEGORY_ICONS[cat]}</span>
                    <span>{cat}</span>
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── My Uploads Library Tab ──────────────────────────────── */}
      {mediaFilter === 'uploads' && (
        <div className="user-uploads-container">
          {userUploads.length === 0 ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed rgba(255,255,255,0.15)',
                borderRadius: '12px',
                padding: '2rem 1rem',
                textAlign: 'center',
                cursor: 'pointer',
                background: 'rgba(0,0,0,0.2)',
                marginBottom: '0.75rem',
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📤</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff', marginBottom: '0.25rem' }}>
                No custom uploads in vault yet
              </div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                Click or drag &amp; drop any MP4, WebM video or 4K photo here to store permanently in your vault
              </div>
            </div>
          ) : (
            <div className="thumbs-container">
              <div className="thumbs">
                {userUploads.map((item) => {
                  const isSelected = item.url === url
                  return (
                    <div
                      key={item.id}
                      style={{ position: 'relative' }}
                    >
                      <button
                        type="button"
                        className={`thumb ${isSelected ? 'active' : ''}`}
                        title={`${item.title} (${item.mediaType})`}
                        onClick={() => onUrlChange(item.url, item.mediaType, item.id)}
                        style={{ width: '100%' }}
                      >
                        <img src={item.thumb || item.url} alt={item.title} loading="lazy" />
                        <div className="thumb-overlay">
                          <span className="thumb-badge">
                            {item.mediaType === 'video' ? '🎬 Video' : '📷 Photo'}
                          </span>
                          {item.sizeLabel && (
                            <span className="thumb-size-pill">{item.sizeLabel}</span>
                          )}
                          {isSelected && (
                            <span className="thumb-check">✓</span>
                          )}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => void handleDeleteUpload(item.id, e)}
                        title="Remove from vault"
                        style={{
                          position: 'absolute',
                          top: '4px',
                          right: '4px',
                          background: 'rgba(0,0,0,0.75)',
                          color: '#ef4444',
                          border: '1px solid rgba(239, 68, 68, 0.4)',
                          borderRadius: '50%',
                          width: '20px',
                          height: '20px',
                          fontSize: '0.65rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          zIndex: 10,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Stock Videos / Photos Thumbnails Grid ───────────────── */}
      {mediaFilter !== 'uploads' && mediaFilter !== 'local' && (
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
                      {item.mediaType === 'video' ? '🎬 Video' : '📷 Photo'}
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
      )}

      {/* Optional Toast notification */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: '#1e293b',
            color: '#fbbf24',
            border: '1px solid rgba(245, 158, 11, 0.5)',
            borderRadius: '8px',
            padding: '0.6rem 1rem',
            fontSize: '0.82rem',
            fontWeight: 600,
            boxShadow: '0 10px 25px rgba(0,0,0,0.6)',
            zIndex: 99999,
          }}
        >
          {toastMsg}
        </div>
      )}

      {/* Controls Row: Fit Style */}
      <div className="row" style={{ marginTop: '0.4rem' }}>
        <label style={{ flex: 1 }}>
          Fit &amp; Scaling
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
