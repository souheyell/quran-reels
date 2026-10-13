import { useState, useEffect, useRef } from 'react'
import type { Verse } from '../types'
import { POPULAR_EDITIONS, getReciterById } from '../api/quran'
import { SURAHS_INDEX } from '../lib/bulkPacks'
import { ReciterModal } from './ReciterModal'
import { subscribeAudioProgress, type AudioProgressInfo } from '../lib/audioCache'
import { ChevronDown, Sparkles } from 'lucide-react'

interface VersePanelProps {
  verses: Verse[]
  editionId: string
  reciterId: string
  lockCount: boolean
  lockReciter: boolean
  loading: boolean
  error: string | null
  onLoadRange: (surah: number, startAyat: number, count: number, edition?: string, reciter?: string) => Promise<void>
  onLoadRandom: () => Promise<void>
  onEditionChange: (editionId: string) => void
  onReciterChange: (reciterId: string) => void
  onRandomizeReciter?: () => void
  onToggleLockCount: (locked: boolean) => void
  onToggleLockReciter: (locked: boolean) => void
  onCountChange?: (count: number) => void
  onUploadAudio?: (audioUrl: string) => void
}

const QUICK_PICKS: Array<[number, number, string]> = [
  [1, 1, 'Al-Fatiha 1:1'],
  [2, 255, 'Ayat al-Kursi'],
  [55, 13, 'Ar-Rahman 55:13'],
  [94, 5, 'Ash-Sharh 94:5'],
  [112, 1, 'Al-Ikhlas 112:1'],
  [36, 12, 'Ya-Sin 36:12'],
]

const QUICK_RECITERS = [
  { id: 'ar.alafasy', label: '✨ Alafasy' },
  { id: 'ar.abdulbasitmurattal', label: '👑 Abdulbasit' },
  { id: 'ar.minshawi', label: '👑 Minshawi' },
  { id: 'ar.husary', label: '👑 Husary' },
  { id: 'ar.sudais', label: '🕋 Sudais' },
  { id: 'ar.dossari', label: '🕋 Yasser Dosari' },
  { id: 'ar.maher', label: '🕋 Maher Muaiqly' },
  { id: 'ar.ajamy', label: '🌟 Al-Ajamy' },
]

export function VersePanel({
  verses,
  editionId,
  reciterId,
  lockCount,
  lockReciter,
  loading,
  error,
  onLoadRange,
  onLoadRandom,
  onEditionChange,
  onReciterChange,
  onRandomizeReciter,
  onToggleLockCount,
  onToggleLockReciter,
  onCountChange,
  onUploadAudio,
}: VersePanelProps) {
  const [surahInput, setSurahInput] = useState(String(verses[0]?.surah ?? 2))
  const [ayatInput, setAyatInput] = useState(String(verses[0]?.ayat ?? 255))
  const [countInput, setCountInput] = useState(String(verses.length || 1))
  const [showReciterModal, setShowReciterModal] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState<AudioProgressInfo | null>(null)
  const audioFileInputRef = useRef<HTMLInputElement>(null)

  // Subscribe to audio download progress from audioCache
  useEffect(() => {
    return subscribeAudioProgress((info) => {
      setDownloadProgress(info)
      if (info.percent >= 100) {
        const timer = setTimeout(() => setDownloadProgress(null), 1200)
        return () => clearTimeout(timer)
      }
    })
  }, [])

  // Keep input fields in sync when verses change
  useEffect(() => {
    if (verses.length > 0) {
      setSurahInput(String(verses[0].surah))
      setAyatInput(String(verses[0].ayat))
      setCountInput(String(verses.length))
    }
  }, [verses])

  const loadRange = async (newReciterId?: string) => {
    const surah = Number(surahInput)
    const ayat = Number(ayatInput)
    const count = Math.max(1, Math.min(Number(countInput) || 1, 30))
    if (!surah || !ayat) return
    onCountChange?.(count)
    await onLoadRange(surah, ayat, count, editionId, newReciterId || reciterId)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      void loadRange()
    }
  }

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !onUploadAudio) return
    const objectUrl = URL.createObjectURL(file)
    onUploadAudio(objectUrl)
  }

  const surahName = verses[0]?.surahName || ''
  const rangeLabel =
    verses.length === 1
      ? `${surahName} ${verses[0].surah}:${verses[0].ayat}`
      : verses.length > 1
        ? `${surahName} ${verses[0].surah}:${verses[0].ayat}–${verses[verses.length - 1].ayat}`
        : 'None'

  const currentReciterObj = getReciterById(reciterId)
  const currentReciterDisplayName = currentReciterObj
    ? currentReciterObj.name
    : reciterId

  const currentSurahNumber = Number(surahInput) || 1
  const currentSurahMeta =
    SURAHS_INDEX.find((s) => s.number === currentSurahNumber) || SURAHS_INDEX[1]
  const maxAyahsInCurrentSurah = currentSurahMeta?.totalAyahs || 286

  return (
    <section className="panel" id="verse-panel">
      <h2>Verse & Reciter</h2>

      {/* ── Surah, Ayah & Sequence Selectors Card ────────────────── */}
      <div className="verse-selectors-card">
        {/* Surah Dropdown Selector */}
        <div className="selector-field">
          <div className="selector-label-row">
            <label htmlFor="surah-select">Surah (Chapter)</label>
            <span className="surah-count-badge font-mono text-[10px] text-emerald-400">
              {currentSurahMeta.name} · {currentSurahMeta.totalAyahs} Ayahs
            </span>
          </div>
          <div className="styled-select-wrapper">
            <select
              id="surah-select"
              value={surahInput}
              onChange={(e) => {
                const sNum = Number(e.target.value)
                setSurahInput(String(sNum))
                const targetMeta = SURAHS_INDEX.find((s) => s.number === sNum)
                if (targetMeta && Number(ayatInput) > targetMeta.totalAyahs) {
                  setAyatInput('1')
                }
              }}
              className="styled-surah-select"
            >
              {SURAHS_INDEX.map((s) => (
                <option key={s.number} value={s.number}>
                  {s.number}. {s.englishName} ({s.name}) — {s.totalAyahs} Ayahs
                </option>
              ))}
            </select>
            <ChevronDown className="select-chevron" />
          </div>
        </div>

        {/* Ayah & Count Stepper Row */}
        <div className="selector-row-dual">
          {/* Ayah Stepper */}
          <div className="selector-field">
            <div className="selector-label-row">
              <label htmlFor="ayat-input">Ayah</label>
              <span className="text-[10px] text-on-surface-variant font-mono">
                1–{maxAyahsInCurrentSurah}
              </span>
            </div>
            <div className="stepper-input-group">
              <button
                type="button"
                className="stepper-btn"
                onClick={() => {
                  const curr = Number(ayatInput) || 1
                  const prev = Math.max(1, curr - 1)
                  setAyatInput(String(prev))
                }}
                disabled={Number(ayatInput) <= 1}
                title="Previous Ayah"
              >
                ◀
              </button>
              <input
                id="ayat-input"
                type="number"
                min={1}
                max={maxAyahsInCurrentSurah}
                value={ayatInput}
                onChange={(e) => setAyatInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="stepper-number-input font-mono font-bold"
              />
              <button
                type="button"
                className="stepper-btn"
                onClick={() => {
                  const curr = Number(ayatInput) || 1
                  const next = Math.min(maxAyahsInCurrentSurah, curr + 1)
                  setAyatInput(String(next))
                }}
                disabled={Number(ayatInput) >= maxAyahsInCurrentSurah}
                title="Next Ayah"
              >
                ▶
              </button>
            </div>
          </div>

          {/* Ayahs Count Stepper */}
          <div className="selector-field">
            <div className="selector-label-row">
              <label htmlFor="count-input">Sequence</label>
              <button
                type="button"
                className={`lock-toggle-chip ${lockCount ? 'locked' : ''}`}
                onClick={() => onToggleLockCount(!lockCount)}
                title={lockCount ? 'Lock ayahs count during discovery' : 'Unlock ayahs count'}
              >
                {lockCount ? '🔒 Lock' : '🔓 Count'}
              </button>
            </div>
            <div className="stepper-input-group">
              <button
                type="button"
                className="stepper-btn"
                onClick={() => {
                  const curr = Number(countInput) || 1
                  const prev = Math.max(1, curr - 1)
                  setCountInput(String(prev))
                  onCountChange?.(prev)
                }}
                disabled={Number(countInput) <= 1}
                title="Decrease count"
              >
                −
              </button>
              <div className="stepper-count-display font-mono font-bold text-center flex-1">
                {countInput} {Number(countInput) === 1 ? 'Ayah' : 'Ayat'}
              </div>
              <button
                type="button"
                className="stepper-btn"
                onClick={() => {
                  const curr = Number(countInput) || 1
                  const next = Math.min(30, curr + 1)
                  setCountInput(String(next))
                  onCountChange?.(next)
                }}
                disabled={Number(countInput) >= 30}
                title="Increase count"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Load & Upload Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            id="load-btn"
            type="button"
            className="btn primary font-bold flex-1"
            onClick={() => void loadRange()}
            disabled={loading}
          >
            {loading ? (
              <span className="loading-text">
                <span className="spinner" /> Loading…
              </span>
            ) : (
              <span className="flex items-center justify-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-black" />
                <span>Load Verse</span>
              </span>
            )}
          </button>

          {onUploadAudio && (
            <>
              <input
                type="file"
                ref={audioFileInputRef}
                accept="audio/*"
                style={{ display: 'none' }}
                onChange={handleAudioUpload}
              />
              <button
                type="button"
                className="btn"
                onClick={() => audioFileInputRef.current?.click()}
                title="Upload custom audio recitation or voiceover"
                style={{ padding: '0.45rem 0.65rem' }}
              >
                🎙️ Audio
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Enhanced Reciter Selection Card ──────────────────────── */}
      <div className="reciter-selector-card">
        <div className="reciter-card-header">
          <label className="reciter-label">Reciter (Qari) & Voice</label>
          <div className="reciter-card-tools">
            {onRandomizeReciter && (
              <button
                type="button"
                className="btn btn-xs"
                onClick={() => onRandomizeReciter()}
                disabled={loading}
                title="Shuffle random Qari"
              >
                🎲 Shuffle
              </button>
            )}
            <button
              type="button"
              className={`btn btn-xs chip-lock ${lockReciter ? 'locked' : ''}`}
              onClick={() => onToggleLockReciter(!lockReciter)}
              title={lockReciter ? 'Lock chosen Qari during discovery' : 'Unlock Qari to discover other reciters'}
            >
              {lockReciter ? '🔒 Locked' : '🔓 Unlocked'}
            </button>
          </div>
        </div>

        {/* Active Reciter Pill Button (Opens ReciterModal) */}
        <button
          type="button"
          className="active-reciter-btn"
          onClick={() => setShowReciterModal(true)}
          title="Click to search and explore all 50+ reciters"
        >
          <div className="active-reciter-left">
            <span className="active-reciter-avatar">
              {currentReciterObj?.category === 'haramain'
                ? '🕋'
                : currentReciterObj?.category === 'golden-age'
                  ? '👑'
                  : '✨'}
            </span>
            <div className="active-reciter-names">
              <span className="active-reciter-name-en">{currentReciterDisplayName}</span>
              {currentReciterObj?.arabicName && (
                <span className="active-reciter-name-ar" dir="rtl">
                  {currentReciterObj.arabicName}
                </span>
              )}
            </div>
          </div>
          <span className="reciter-browse-badge">🔍 Browse All 50+</span>
        </button>

        {/* ── Real-Time Audio Download Progress Bar ────────────── */}
        {downloadProgress && downloadProgress.percent < 100 && (
          <div className="reciter-download-progress-box">
            <div className="reciter-download-info">
              <span className="reciter-download-label">
                <span className="reciter-download-spinner" /> Downloading audio to storage…
              </span>
              <span className="reciter-download-pct">{downloadProgress.percent}%</span>
            </div>
            <div className="reciter-download-track">
              <div
                className="reciter-download-fill"
                style={{ width: `${downloadProgress.percent}%` }}
              />
            </div>
          </div>
        )}

        {/* Quick Reciter Fast-Switch Chips */}
        <div className="quick-reciter-chips">
          {QUICK_RECITERS.map((qr) => (
            <button
              key={qr.id}
              type="button"
              className={`chip chip-reciter ${reciterId === qr.id ? 'active' : ''}`}
              onClick={() => onReciterChange(qr.id)}
            >
              {qr.label}
            </button>
          ))}
        </div>
      </div>

      {/* Primary Translation Selector */}
      <div className="selector-field">
        <label htmlFor="edition-select" className="text-xs text-on-surface-variant font-medium mb-1 block">
          Primary Translation Edition
        </label>
        <div className="styled-select-wrapper">
          <select
            id="edition-select"
            value={editionId}
            onChange={(e) => onEditionChange(e.target.value)}
            className="styled-surah-select font-mono text-xs"
          >
            {POPULAR_EDITIONS.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} — {e.language}
              </option>
            ))}
          </select>
          <ChevronDown className="select-chevron" />
        </div>
      </div>

      {/* Random discovery button */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <button
          id="random-btn"
          type="button"
          className="btn"
          onClick={() => void onLoadRandom()}
          disabled={loading}
          style={{ flex: 1 }}
          title="Discover random verse"
        >
          {loading ? (
            <span className="loading-text">
              <span className="spinner" /> Loading…
            </span>
          ) : (
            `🎲 Random verse${!lockReciter ? ' & Qari' : ''}`
          )}
        </button>
      </div>

      {/* Quick Picks for Famous Verses */}
      <div className="picks">
        {QUICK_PICKS.map(([s, a, label]) => (
          <button
            key={`${s}:${a}`}
            type="button"
            className="chip"
            disabled={loading}
            onClick={() => {
              setSurahInput(String(s))
              setAyatInput(String(a))
              setCountInput('1')
              onCountChange?.(1)
              void onLoadRange(s, a, 1, editionId, reciterId)
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="error">{error}</p>}
      {verses.length > 0 && (
        <p className="meta">
          Selected: {rangeLabel} · 🎙️ {currentReciterDisplayName} {lockReciter ? '(🔒 Locked)' : ''} · {verses[0]?.editionName}
          {lockCount ? ` · (🔒 ${countInput} Ayahs locked)` : ''}
        </p>
      )}

      {/* ── Reciter Search & Library Modal ───────────────────────── */}
      <ReciterModal
        currentReciterId={reciterId}
        isOpen={showReciterModal}
        onSelectReciter={(newReciterId) => onReciterChange(newReciterId)}
        onClose={() => setShowReciterModal(false)}
      />
    </section>
  )
}
