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
      if (!audio) return

      if (!verse?.audioUrl) {
        audio.pause()
        audio.src = ''
        setAudioLoading(false)
        return
      }

      // Use direct CDN URL for instant playback
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
            // Autoplay blocked by browser policy until user gesture
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
      loadAndPlayVerse(nextIndex)
    },
    [loadAndPlayVerse],
  )

  // When verses list changes, load first verse
  useEffect(() => {
    indexRef.current = 0
    loopBaseRef.current = 0
    slotStartRef.current = performance.now()
    loadAndPlayVerse(0)
  }, [verses, loadAndPlayVerse])

  // Main render loop — smoothly runs every frame without hanging
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

      // Check if audio is actively playing
      const isAudioPlaying =
        audio &&
        !audio.paused &&
        !audio.ended &&
        audio.currentTime > 0 &&
        soundOnRef.current

      let verseTimeMs = 0
      const wallTimeMs = now - slotStartRef.current

      if (isAudioPlaying && audio) {
        verseTimeMs = audio.currentTime * 1000
      } else {
        verseTimeMs = wallTimeMs
      }

      // Slot duration includes the 1.6s contemplation pause
      const rawAudioMs =
        audio && Number.isFinite(audio.duration) && audio.duration > 0
          ? audio.duration * 1000
          : slot.durationMs
      const isMultiAyah = verses.length > 1
      const isLastAyah = currentIndex === verses.length - 1
      const pauseMs = isMultiAyah && !isLastAyah ? 1600 : 0
      const totalSlotMs = Math.max(slot.durationMs, rawAudioMs + pauseMs)

      // Check if current verse plus pause has finished
      if (wallTimeMs >= totalSlotMs || verseTimeMs >= totalSlotMs) {
        const nextIndex = (currentIndex + 1) % verses.length
        if (nextIndex === 0) {
          loopBaseRef.current += timeline.totalMs
        }
        advanceTo(nextIndex)
        verseTimeMs = 0
      }

      const timeMs = loopBaseRef.current + slot.startMs + verseTimeMs
      renderFrame(ctx, {
        timeMs,
        config,
        image,
        verse,
        verseTimeMs,
        slotDurationMs: totalSlotMs,
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
      audio.play()
        .then(() => setAutoplayBlocked(false))
        .catch(() => setAutoplayBlocked(true))
    } else {
      audio.pause()
    }
  }, [soundOn, playing])

  const togglePlay = () => {
    setPlaying((p) => {
      const next = !p
      const audio = audioRef.current
      if (audio) {
        if (next && soundOnRef.current) {
          audio.play()
            .then(() => setAutoplayBlocked(false))
            .catch(() => {})
        } else {
          audio.pause()
        }
      }
      slotStartRef.current = performance.now()
      return next
    })
  }

  const toggleSound = () => {
    setSoundOn((s) => {
      const next = !s
      const audio = audioRef.current
      if (audio) {
        if (next && playingRef.current) {
          audio.play()
            .then(() => setAutoplayBlocked(false))
            .catch(() => {})
        } else {
          audio.pause()
        }
      }
      return next
    })
  }

  const handleCanvasClick = () => {
    const audio = audioRef.current
    if (autoplayBlocked || !playing) {
      setPlaying(true)
      if (audio && soundOn) {
        audio.play().then(() => setAutoplayBlocked(false)).catch(() => {})
      }
      return
    }
    togglePlay()
  }

  const hasAudio = Boolean(currentVerse?.audioUrl)

  return (
    <div className="preview-wrap">
      <div
        className="canvas-container"
        onClick={handleCanvasClick}
        style={{ cursor: 'pointer', position: 'relative' }}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          style={{
            aspectRatio: `${width} / ${height}`,
            maxHeight: '70vh',
            maxWidth: '100%',
            height: 'auto',
            width: 'auto',
            display: 'block',
          }}
        />
        {autoplayBlocked && soundOn && hasAudio && (
          <div className="autoplay-hint">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,3 19,12 5,21" />
            </svg>
            <span>Click to enable sound</span>
          </div>
        )}
      </div>

      <div className="preview-controls">
        <button
          id="play-pause-btn"
          type="button"
          className="btn icon-btn"
          onClick={togglePlay}
          title={playing ? 'Pause' : 'Play'}
        >
          {playing ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="6,3 20,12 6,21" />
            </svg>
          )}
          {playing ? 'Pause' : 'Play'}
        </button>

        <button
          id="sound-toggle-btn"
          type="button"
          className="btn icon-btn"
          onClick={toggleSound}
          disabled={!hasAudio}
          title={soundOn ? 'Mute sound' : 'Enable sound'}
        >
          {soundOn ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill="currentColor" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill="currentColor" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          )}
          {soundOn ? 'Sound on' : 'Sound off'}
        </button>

        {hasAudio && (
          <div className="audio-status-pill">
            {audioLoading ? (
              <span className="audio-status loading">
                <span className="spinner small" /> Loading audio…
              </span>
            ) : soundOn && playing ? (
              <span className="audio-status active">
                <span className="sound-wave" /> Recitation playing
              </span>
            ) : (
              <span className="audio-status">
                Recitation ready
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
