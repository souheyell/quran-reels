import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReelConfig } from '../types'
import { previewSize, renderFrame } from '../renderer/reelRenderer'
import type { Timeline } from '../renderer/timeline'

interface PreviewCanvasProps {
  config: ReelConfig
  image: HTMLImageElement | null
  timeline: Timeline
}

export function PreviewCanvas({ config, image, timeline }: PreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const indexRef = useRef(0)
  const slotStartRef = useRef(0)
  const loopBaseRef = useRef(0)
  const audioEndedTimeRef = useRef<number | null>(null)

  const [playing, setPlaying] = useState(true)
  const [soundOn, setSoundOn] = useState(true)
  const [audioLoading, setAudioLoading] = useState(false)
  const [autoplayBlocked, setAutoplayBlocked] = useState(false)

  const playingRef = useRef(playing)
  const soundOnRef = useRef(soundOn)
  const visibleRef = useRef(!document.hidden)

  // Preview renders at 1/3 resolution
  const { width, height } = previewSize(config.aspectRatio)
  const verses = config.verses
  const currentVerse = verses[indexRef.current] || verses[0]

  playingRef.current = playing
  soundOnRef.current = soundOn

  // Track tab visibility
  useEffect(() => {
    const handler = () => {
      visibleRef.current = !document.hidden
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [])

  // Create persistent audio element with comprehensive event handlers
  useEffect(() => {
    const audio = new Audio()
    audio.volume = 0.9
    audio.preload = 'auto'

    audio.onloadstart = () => setAudioLoading(true)
    audio.onwaiting = () => setAudioLoading(true)
    audio.oncanplay = () => setAudioLoading(false)
    audio.onplaying = () => {
      setAudioLoading(false)
      setAutoplayBlocked(false)
    }

    audio.onended = () => {
      audioEndedTimeRef.current = performance.now()
    }

    audio.onloadedmetadata = () => {
      setAudioLoading(false)
    }

    audio.onerror = () => {
      setAudioLoading(false)
    }

    audioRef.current = audio
    return () => {
      audio.pause()
      audio.src = ''
      audioRef.current = null
    }
  }, [])

  // Load and play audio for a specific verse index
  const loadAndPlayVerse = useCallback(
    (index: number) => {
      const verse = verses[index]
      const audio = audioRef.current
      audioEndedTimeRef.current = null

      if (!audio) return

      if (!verse?.audioUrl) {
        audio.pause()
        audio.src = ''
        setAudioLoading(false)
        return
      }

      const targetUrl = verse.audioUrl
      if (audio.src !== targetUrl) {
        audio.src = targetUrl
        audio.currentTime = 0
        audio.load()
      } else {
        audio.currentTime = 0
      }

      if (playingRef.current && soundOnRef.current) {
        audio.play()
          .then(() => {
            setAutoplayBlocked(false)
          })
          .catch(() => {
            setAutoplayBlocked(true)
          })
      }
    },
    [verses],
  )

  // Advance to verse index
  const advanceTo = useCallback(
    (nextIndex: number) => {
      indexRef.current = nextIndex
      slotStartRef.current = performance.now()
      audioEndedTimeRef.current = null
      loadAndPlayVerse(nextIndex)
    },
    [loadAndPlayVerse],
  )

  // When verses list changes, load first verse
  useEffect(() => {
    indexRef.current = 0
    loopBaseRef.current = 0
    slotStartRef.current = performance.now()
    audioEndedTimeRef.current = null
    loadAndPlayVerse(0)
  }, [verses, loadAndPlayVerse])

  // Main render loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const loop = (now: number) => {
      if (!visibleRef.current) {
        rafRef.current = requestAnimationFrame(loop)
        return
      }

      const currentIndex = indexRef.current
      const verse = verses[currentIndex] || verses[0]
      const slot = timeline.slots[currentIndex] || timeline.slots[0]
      const audio = audioRef.current

      if (!slot || !verse) {
        rafRef.current = requestAnimationFrame(loop)
        return
      }

      const isAudioActive = Boolean(verse.audioUrl && audio)
      let verseTimeMs = 0
      let totalSlotDurationMs = slot.durationMs

      const isMultiAyah = verses.length > 1
      const isLastAyah = currentIndex === verses.length - 1
      const pauseDurationMs = isMultiAyah && !isLastAyah ? 1600 : 0

      if (isAudioActive && audio) {
        const audioDurationMs =
          Number.isFinite(audio.duration) && audio.duration > 0
            ? audio.duration * 1000
            : slot.durationMs

        totalSlotDurationMs = audioDurationMs + pauseDurationMs

        if (audio.ended || audioEndedTimeRef.current !== null) {
          if (audioEndedTimeRef.current === null) {
            audioEndedTimeRef.current = now
          }
          const pauseElapsedMs = Math.max(0, now - audioEndedTimeRef.current)
          verseTimeMs = audioDurationMs + pauseElapsedMs

          if (pauseElapsedMs >= pauseDurationMs) {
            const nextIndex = (currentIndex + 1) % verses.length
            if (nextIndex === 0) {
              loopBaseRef.current += timeline.totalMs
            }
            advanceTo(nextIndex)
            verseTimeMs = 0
          }
        } else if (!audio.paused && audio.currentTime > 0) {
          verseTimeMs = audio.currentTime * 1000
        } else {
          // Buffering or muted
          verseTimeMs = now - slotStartRef.current
          if (verseTimeMs >= totalSlotDurationMs) {
            const nextIndex = (currentIndex + 1) % verses.length
            advanceTo(nextIndex)
            verseTimeMs = 0
          }
        }
      } else {
        // Fallback without audio
        verseTimeMs = now - slotStartRef.current
        totalSlotDurationMs = slot.durationMs
        if (verseTimeMs >= totalSlotDurationMs) {
          const nextIndex = (currentIndex + 1) % verses.length
          advanceTo(nextIndex)
          verseTimeMs = 0
        }
      }

      const timeMs = loopBaseRef.current + slot.startMs + verseTimeMs
      renderFrame(ctx, {
        timeMs,
        config,
        image,
        verse,
        verseTimeMs,
        slotDurationMs: totalSlotDurationMs,
      })

      rafRef.current = requestAnimationFrame(loop)
    }

    if (playing) {
      slotStartRef.current = performance.now()
      rafRef.current = requestAnimationFrame(loop)
    }

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [config, image, playing, verses, timeline, advanceTo])

  // Handle play/pause and sound on/off changes
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (playing && soundOn) {
      if (audio.src && audio.paused) {
        audio.play().catch(() => {
          setAutoplayBlocked(true)
        })
      }
    } else {
      audio.pause()
    }
  }, [playing, soundOn])

  // Toggle play/pause
  const togglePlay = () => {
    const nextPlaying = !playing
    setPlaying(nextPlaying)
    const audio = audioRef.current
    if (audio) {
      if (nextPlaying && soundOn) {
        audio.play().catch(() => setAutoplayBlocked(true))
      } else {
        audio.pause()
      }
    }
  }

  // Toggle sound
  const toggleSound = () => {
    const nextSound = !soundOn
    setSoundOn(nextSound)
    const audio = audioRef.current
    if (audio) {
      if (nextSound && playing) {
        audio.play().catch(() => setAutoplayBlocked(true))
      } else {
        audio.pause()
      }
    }
  }

  // Enable audio on user click if autoplay was blocked
  const handleEnableAudio = () => {
    const audio = audioRef.current
    if (audio) {
      audio.play()
        .then(() => {
          setAutoplayBlocked(false)
          setSoundOn(true)
          setPlaying(true)
        })
        .catch((e) => console.warn('Could not enable audio:', e))
    }
  }

  return (
    <div className="preview-container">
      <div
        className="preview-wrapper"
        style={{
          aspectRatio: config.aspectRatio.replace(':', '/'),
        }}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="preview-canvas"
        />

        {audioLoading && (
          <div className="audio-badge">
            <span className="spinner" /> Loading audio…
          </div>
        )}

        {autoplayBlocked && (
          <button
            type="button"
            className="autoplay-banner"
            onClick={handleEnableAudio}
          >
            🔊 Click to enable audio playback
          </button>
        )}

        <div className="preview-overlay-controls">
          <button
            type="button"
            className="control-btn"
            onClick={togglePlay}
            title={playing ? 'Pause' : 'Play'}
          >
            {playing ? '⏸' : '▶'}
          </button>
          <button
            type="button"
            className={`control-btn ${soundOn ? 'active' : ''}`}
            onClick={toggleSound}
            title={soundOn ? 'Mute' : 'Unmute'}
          >
            {soundOn ? '🔊' : '🔇'}
          </button>
          <button
            type="button"
            className="control-btn"
            onClick={() => {
              const next = (indexRef.current + 1) % verses.length
              advanceTo(next)
            }}
            title="Next verse"
          >
            ⏭
          </button>
        </div>
      </div>

      <div className="preview-meta">
        <span>{config.aspectRatio}</span>
        <span>·</span>
        <span>
          Ayah {currentVerse.ayat} of {verses[0]?.surahName || `Surah ${currentVerse.surah}`}
        </span>
        {verses.length > 1 && (
          <>
            <span>·</span>
            <span>
              {indexRef.current + 1} / {verses.length}
            </span>
          </>
        )}
      </div>
    </div>
  )
}
