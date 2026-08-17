import { useState, useRef, useEffect } from 'react'
import type { Reciter, ReciterCategory } from '../types'
import {
  ALL_RECITERS,
  searchReciters,
  getReciterSampleAudioUrl,
} from '../api/quran'
import {
  loadFavoriteReciterIds,
  saveFavoriteReciterIds,
  loadCustomReciters,
  saveCustomReciters,
} from '../lib/storage'

interface ReciterModalProps {
  currentReciterId: string
  isOpen: boolean
  onSelectReciter: (reciterId: string) => void
  onClose: () => void
}

type TabType = 'all' | 'favorites' | ReciterCategory | 'custom'

const TAB_LABELS: Array<{ id: TabType; label: string; icon: string }> = [
  { id: 'all', label: 'All Reciters', icon: '✨' },
  { id: 'favorites', label: 'My Library', icon: '⭐' },
  { id: 'haramain', label: 'Haramain Imams', icon: '🕋' },
  { id: 'golden-age', label: 'Golden Age', icon: '👑' },
  { id: 'contemporary', label: 'Contemporary', icon: '🌟' },
  { id: 'mujawwad', label: 'Mujawwad', icon: '🎙️' },
  { id: 'warsh', label: 'Warsh & Qalun', icon: '📜' },
  { id: 'custom', label: 'Add Custom', icon: '➕' },
]

export function ReciterModal({
  currentReciterId,
  isOpen,
  onSelectReciter,
  onClose,
}: ReciterModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])
  const [customReciters, setCustomReciters] = useState<Reciter[]>([])
  const [playingId, setPlayingId] = useState<string | null>(null)

  // Custom reciter form state
  const [customName, setCustomName] = useState('')
  const [customArabicName, setCustomArabicName] = useState('')
  const [customFolder, setCustomFolder] = useState('')
  const [customCategory, setCustomCategory] = useState<ReciterCategory>('contemporary')

  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Load saved favorites & custom reciters
  useEffect(() => {
    if (isOpen) {
      setFavoriteIds(loadFavoriteReciterIds())
      setCustomReciters(loadCustomReciters())
    }
  }, [isOpen])

  // Stop audio snippet on modal close or unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  if (!isOpen) return null

  const handleToggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const updated = favoriteIds.includes(id)
      ? favoriteIds.filter((favId) => favId !== id)
      : [...favoriteIds, id]
    setFavoriteIds(updated)
    saveFavoriteReciterIds(updated)
  }

  const handlePlaySample = (e: React.MouseEvent, reciterId: string) => {
    e.stopPropagation()
    if (playingId === reciterId) {
      audioRef.current?.pause()
      setPlayingId(null)
      return
    }

    if (audioRef.current) {
      audioRef.current.pause()
    }

    const sampleUrl = getReciterSampleAudioUrl(reciterId, customReciters)
    const audio = new Audio(sampleUrl)
    audio.onended = () => setPlayingId(null)
    audio.onerror = () => setPlayingId(null)
    audio.play().catch(() => setPlayingId(null))
    audioRef.current = audio
    setPlayingId(reciterId)
  }

  const handleSelect = (reciterId: string) => {
    if (audioRef.current) {
      audioRef.current.pause()
      setPlayingId(null)
    }
    onSelectReciter(reciterId)
    onClose()
  }

  const handleAddCustomReciter = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customName.trim() || !customFolder.trim()) return

    const newId = `custom.${customFolder.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')}`
    const newReciter: Reciter = {
      id: newId,
      name: customName.trim(),
      arabicName: customArabicName.trim() || undefined,
      subfolder: customFolder.trim(),
      category: customCategory,
      isCustom: true,
      bitrate: '128kbps',
      style: 'Custom',
    }

    const updated = [...customReciters, newReciter]
    setCustomReciters(updated)
    saveCustomReciters(updated)

    // Also add to favorites
    const updatedFavs = [...favoriteIds, newId]
    setFavoriteIds(updatedFavs)
    saveFavoriteReciterIds(updatedFavs)

    // Reset form & select
    setCustomName('')
    setCustomArabicName('')
    setCustomFolder('')
    setActiveTab('favorites')
    handleSelect(newId)
  }

  const recitersList = searchReciters(
    searchQuery,
    activeTab === 'all' ? 'all' : activeTab === 'favorites' ? 'favorites' : (activeTab as ReciterCategory),
    favoriteIds,
    customReciters,
  )

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="reciter-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="reciter-modal-header">
          <div className="reciter-header-info">
            <h2 className="reciter-modal-title">
              <span className="reciter-title-icon">🎙️</span> Quran Reciters Library (مكتبة القراء)
            </h2>
            <p className="reciter-modal-sub">
              Browse 50+ classical & contemporary reciters, preview voices, and curate your library
            </p>
          </div>
          <button
            type="button"
            className="reciter-close-btn"
            onClick={onClose}
            title="Close reciters library"
          >
            ✕
          </button>
        </div>

        {/* Search Bar */}
        <div className="reciter-search-row">
          <div className="reciter-search-input-wrap">
            <span className="search-icon-prefix">🔍</span>
            <input
              type="search"
              placeholder="Search by Qari name in English or Arabic (e.g. Alafasy, المنشاوي, Sudais, Dosari)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="reciter-search-input"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchQuery('')}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="reciter-category-tabs">
          {TAB_LABELS.map((tab) => {
            const count =
              tab.id === 'favorites'
                ? favoriteIds.length
                : tab.id === 'all'
                  ? ALL_RECITERS.length + customReciters.length
                  : tab.id === 'custom'
                    ? customReciters.length
                    : ALL_RECITERS.filter((r) => r.category === tab.id).length

            return (
              <button
                key={tab.id}
                type="button"
                className={`reciter-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span>{tab.icon}</span> {tab.label}
                <span className="reciter-tab-count">{count}</span>
              </button>
            )
          })}
        </div>

        {/* Reciters List / Custom Form */}
        <div className="reciter-modal-content">
          {activeTab === 'custom' ? (
            <form className="custom-reciter-form" onSubmit={handleAddCustomReciter}>
              <h3 className="custom-form-title">➕ Add Custom EveryAyah Reciter</h3>
              <p className="custom-form-desc">
                Add any reciter folder available on EveryAyah.com (e.g. <code>Husary_128kbps</code>, <code>Ghamadi_40kbps</code>, <code>AbdulSamad_64kbps_QuranExplorer.Com</code>).
              </p>

              <div className="custom-form-fields">
                <label>
                  Reciter Name (English)
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sheikh Abdul Basit (Murattal)"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                  />
                </label>

                <label>
                  Arabic Name (Optional)
                  <input
                    type="text"
                    placeholder="e.g. الشيخ عبد الباسط عبد الصمد"
                    value={customArabicName}
                    onChange={(e) => setCustomArabicName(e.target.value)}
                    dir="rtl"
                  />
                </label>

                <label>
                  EveryAyah Folder Name
                  <input
                    type="text"
                    required
                    placeholder="e.g. Abdul_Basit_Murattal_192kbps"
                    value={customFolder}
                    onChange={(e) => setCustomFolder(e.target.value)}
                  />
                </label>

                <label>
                  Category
                  <select
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value as ReciterCategory)}
                  >
                    <option value="contemporary">Contemporary (معاصر)</option>
                    <option value="golden-age">Golden Age (العصر الذهبي)</option>
                    <option value="haramain">Haramain Imam (أئمة الحرمين)</option>
                    <option value="mujawwad">Mujawwad (مجود)</option>
                    <option value="warsh">Warsh / Qalun (ورش وقالون)</option>
                  </select>
                </label>
              </div>

              <div className="custom-form-actions">
                <button type="submit" className="btn btn-export-primary">
                  💾 Save & Select Reciter
                </button>
              </div>
            </form>
          ) : recitersList.length === 0 ? (
            <div className="reciter-empty-state">
              <span className="empty-state-icon">🔍</span>
              <p className="empty-state-text">
                {activeTab === 'favorites'
                  ? 'Your reciter library is empty. Click the ⭐ star on any Qari to add them!'
                  : 'No reciters found matching your search query.'}
              </p>
              {searchQuery && (
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setSearchQuery('')}
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            <div className="reciters-grid">
              {recitersList.map((reciter) => {
                const isSelected = reciter.id === currentReciterId
                const isFav = favoriteIds.includes(reciter.id)
                const isPlaying = playingId === reciter.id

                return (
                  <div
                    key={reciter.id}
                    className={`reciter-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelect(reciter.id)}
                  >
                    <div className="reciter-card-top">
                      <div className="reciter-avatar-wrap">
                        <span className="reciter-avatar-icon">
                          {reciter.category === 'haramain'
                            ? '🕋'
                            : reciter.category === 'golden-age'
                              ? '👑'
                              : reciter.category === 'mujawwad'
                                ? '🎙️'
                                : '✨'}
                        </span>
                      </div>

                      <div className="reciter-card-info">
                        <div className="reciter-card-name-row">
                          <span className="reciter-card-name">{reciter.name}</span>
                          {isSelected && <span className="reciter-active-pill">ACTIVE</span>}
                        </div>
                        {reciter.arabicName && (
                          <span className="reciter-card-arabic" dir="rtl">
                            {reciter.arabicName}
                          </span>
                        )}
                        <div className="reciter-card-meta">
                          {reciter.style && <span className="meta-badge">{reciter.style}</span>}
                          {reciter.country && <span className="meta-badge">{reciter.country}</span>}
                          {reciter.bitrate && <span className="meta-badge meta-bitrate">{reciter.bitrate}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="reciter-card-actions">
                      <button
                        type="button"
                        className={`btn-preview-snippet ${isPlaying ? 'playing' : ''}`}
                        onClick={(e) => handlePlaySample(e, reciter.id)}
                        title="Preview audio sample (Al-Fatiha 1:1)"
                      >
                        {isPlaying ? '⏸ Pause' : '▶ Preview Voice'}
                      </button>

                      <button
                        type="button"
                        className={`btn-fav-star ${isFav ? 'starred' : ''}`}
                        onClick={(e) => handleToggleFavorite(e, reciter.id)}
                        title={isFav ? 'Remove from My Library' : 'Add to My Library'}
                      >
                        {isFav ? '⭐' : '☆'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="reciter-modal-footer">
          <span className="modal-footer-stats">
            Showing {recitersList.length} reciters · Audio streamed via EveryAyah High-Speed CDN
          </span>
          <button type="button" className="btn btn-sm" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
