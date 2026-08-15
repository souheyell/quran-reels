import { useState, useEffect } from 'react'
import type { Verse } from '../types'
import { POPULAR_EDITIONS, POPULAR_RECITERS } from '../api/quran'

interface VersePanelProps {
  verses: Verse[]
  editionId: string
  reciterId: string
  loading: boolean
  error: string | null
  onLoadRange: (surah: number, startAyat: number, count: number, edition?: string, reciter?: string) => Promise<void>
  onLoadRandom: () => Promise<void>
  onEditionChange: (editionId: string) => void
  onReciterChange: (reciterId: string) => void
  onRandomizeReciter?: () => void
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
  loading,
  error,
  onLoadRange,
  onLoadRandom,
  onEditionChange,
  onReciterChange,
  onRandomizeReciter,
}: VersePanelProps) {
  const [surahInput, setSurahInput] = useState(String(verses[0]?.surah ?? 2))
  const [ayatInput, setAyatInput] = useState(String(verses[0]?.ayat ?? 255))
  const [countInput, setCountInput] = useState(String(verses.length || 1))

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
    await onLoadRange(surah, ayat, count, editionId, reciterId)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      void loadRange()
    }
  }

  const surahName = verses[0]?.surahName || ''
  const rangeLabel =
    verses.length === 1
      ? `${surahName} ${verses[0].surah}:${verses[0].ayat}`
      : verses.length > 1
        ? `${surahName} ${verses[0].surah}:${verses[0].ayat} – ${verses[verses.length - 1].ayat} (${verses.length})`
        : ''

  const currentReciter = POPULAR_RECITERS.find((r) => r.id === reciterId)?.name || 'Mishary Rashid Alafasy'

  return (
    <section className="panel" id="verse-panel">
      <h2>Verse & Audio Reciter</h2>
      <div className="row">
        <label>
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
        <label>
          Start ayat
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
        <label>
          Count
          <input
            id="count-input"
            type="number"
            min={1}
            max={30}
            value={countInput}
            onChange={(e) => setCountInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </label>
        <button type="button" className="btn" onClick={loadRange} disabled={loading}>
          {loading ? 'Loading…' : 'Load'}
        </button>
      </div>

      <div className="row">
        <label style={{ flex: 1 }}>
          Audio Reciter (Qari)
          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem' }}>
            <select
              id="reciter-select"
              value={reciterId}
              onChange={(e) => onReciterChange(e.target.value)}
              style={{ flex: 1 }}
            >
              {POPULAR_RECITERS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            {onRandomizeReciter && (
              <button
                type="button"
                className="btn"
                onClick={onRandomizeReciter}
                title="Randomize Qari Reciter"
                style={{ padding: '0.4rem 0.6rem' }}
                disabled={loading}
              >
                🎲
              </button>
            )}
          </div>
        </label>

        <label style={{ flex: 1 }}>
          Translation
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

      <button
        id="random-btn"
        type="button"
        className="btn"
        onClick={() => void onLoadRandom()}
        disabled={loading}
        title="Discover random verse with a random Qari"
      >
        {loading ? (
          <span className="loading-text">
            <span className="spinner" /> Loading…
          </span>
        ) : (
          '🎲 Random verse & Qari'
        )}
      </button>

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
              void onLoadRange(s, a, 1, editionId, reciterId)
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="error">{error}</p>}
      {verses.length > 0 && (
        <p className="meta">Selected: {rangeLabel} · 🎙️ {currentReciter} · {verses[0]?.editionName}</p>
      )}
    </section>
  )
}
