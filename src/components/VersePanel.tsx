import { useState, useEffect, useRef } from 'react'
import type { Verse } from '../types'
import { POPULAR_EDITIONS, POPULAR_RECITERS } from '../api/quran'

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
  const audioFileInputRef = useRef<HTMLInputElement>(null)

  // Keep input fields in sync when verses change
  useEffect(() => {
    if (verses.length > 0) {
      setSurahInput(String(verses[0].surah))
      setAyatInput(String(verses[0].ayat))
      setCountInput(String(verses.length))
    }
  }, [verses])

  const loadRange = async () => {
    const surah = Number(surahInput)
    const ayat = Number(ayatInput)
    const count = Math.max(1, Math.min(Number(countInput) || 1, 30))
    if (!surah || !ayat) return
    onCountChange?.(count)
    await onLoadRange(surah, ayat, count, editionId, reciterId)
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

  const currentReciter =
    POPULAR_RECITERS.find((r) => r.id === reciterId)?.name || reciterId

  return (
    <section className="panel">
      <h2>Verse & Reciter</h2>

      <div className="row">
        <label style={{ flex: 1 }}>
          Surah
          <input
            id="surah-input"
            type="number"
            min={1}
            max={114}
            value={surahInput}
            onChange={(e) => setSurahInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </label>
        <label style={{ flex: 1 }}>
          Ayat
          <input
            id="ayat-input"
            type="number"
            min={1}
            max={286}
            value={ayatInput}
            onChange={(e) => setAyatInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </label>
        <label style={{ flex: 1 }}>
          Ayahs Count
          <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
            <input
              id="count-input"
              type="number"
              min={1}
              max={30}
              value={countInput}
              onChange={(e) => {
                const val = e.target.value
                setCountInput(val)
                const num = Number(val)
                if (num > 0) onCountChange?.(num)
              }}
              onKeyDown={handleKeyDown}
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className={`btn chip-lock ${lockCount ? 'locked' : ''}`}
              onClick={() => onToggleLockCount(!lockCount)}
              title={lockCount ? 'Lock ayahs count during discovery' : 'Unlock ayahs count'}
              style={{ padding: '0.4rem 0.5rem' }}
            >
              {lockCount ? '🔒' : '🔓'}
            </button>
          </div>
        </label>
      </div>

      <div className="row" style={{ marginTop: '0.2rem' }}>
        <button
          id="load-btn"
          type="button"
          className="btn primary"
          onClick={() => void loadRange()}
          disabled={loading}
          style={{ flex: 1 }}
        >
          {loading ? (
            <span className="loading-text">
              <span className="spinner" /> Loading…
            </span>
          ) : (
            'Load Verse'
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
              style={{ padding: '0.5rem 0.75rem' }}
            >
              🎙️ Custom Audio
            </button>
          </>
        )}
      </div>

      <div className="row">
        <label style={{ flex: 1 }}>
          Reciter (Qari)
          <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', marginTop: '0.2rem' }}>
            <select
              id="reciter-select"
              value={reciterId}
              onChange={(e) => onReciterChange(e.target.value)}
              style={{ flex: 1 }}
            >
              {POPULAR_RECITERS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.arabicName})
                </option>
              ))}
            </select>
            {onRandomizeReciter && (
              <button
                type="button"
                className="btn"
                onClick={() => onRandomizeReciter()}
                disabled={loading}
                title="Pick random Qari"
                style={{ padding: '0.4rem 0.6rem' }}
              >
                🎲
              </button>
            )}
            <button
              type="button"
              className={`btn chip-lock ${lockReciter ? 'locked' : ''}`}
              onClick={() => onToggleLockReciter(!lockReciter)}
              title={lockReciter ? 'Lock chosen Qari during discovery' : 'Unlock Qari to discover other reciters'}
              style={{ padding: '0.4rem 0.5rem' }}
            >
              {lockReciter ? '🔒' : '🔓'}
            </button>
          </div>
        </label>

        <label style={{ flex: 1 }}>
          Primary Translation
          <select
            id="edition-select"
            value={editionId}
            onChange={(e) => onEditionChange(e.target.value)}
            style={{ marginTop: '0.2rem' }}
          >
            {POPULAR_EDITIONS.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.language})
              </option>
            ))}
          </select>
        </label>
      </div>

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
          Selected: {rangeLabel} · 🎙️ {currentReciter} {lockReciter ? '(🔒 Locked)' : ''} · {verses[0]?.editionName}
          {lockCount ? ` · (🔒 ${countInput} Ayahs locked)` : ''}
        </p>
      )}
    </section>
  )
}
