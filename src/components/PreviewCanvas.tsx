import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReelConfig } from '../types'
import { previewSize, renderFrame } from '../renderer/reelRenderer'
import type { Timeline } from '../renderer/timeline'

interface PreviewCanvasProps {
  config: ReelConfig
  image: HTMLImageElement | null
  timeline: Timeline
}

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const mins = Math.floor(s / 60)
  const secs = s % 60
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`
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
  const [volume, setVolume] = useState(0.9)
  const [audioLoading, setAudioLoading] = useState(false)
  const [autoplayBlocked, setAutoplayBlocked] = useState(false)
  const [currentProgressMs, setCurrentProgressMs] = useState(0)
  const [isScrubbing, setIsScrubbing] = useState(false)

  const playingRef = useRef(playing)
  const soundOnRef = useRef(soundOn)
  const visibleRef = useRef(!document.hidden)
  const isScrubbingRef = useRef(isScrubbing)

  // Preview renders at 1/3 resolution
  const { width, height } = previewSize(config.aspectRatio)
  const verses = config.verses
  const currentVerse = verses[indexRef.current] || verses[0]

  playingRef.current = playing
  soundOnRef.current = soundOn
  isScrubbingRef.current = isScrubbing

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
    audio.volume = volume
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
    (index: number, seekTimeSeconds = 0) => {
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
        audio.currentTime = seekTimeSeconds
        audio.load()
      } else {
        audio.currentTime = seekTimeSeconds
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
    (nextIndex: number, seekTimeSeconds = 0) => {
      indexRef.current = nextIndex
      slotStartRef.current = performance.now() - seekTimeSeconds * 1000
      audioEndedTimeRef.current = null
      loadAndPlayVerse(nextIndex, seekTimeSeconds)
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
      const userDelayMs =
        typeof config.text?.ayahPauseDelay === 'number' && config.text.ayahPauseDelay >= 0
          ? Math.round(config.text.ayahPauseDelay * 1000)
          : 1600
      const pauseDurationMs = isMultiAyah && !isLastAyah ? userDelayMs : 0

      if (!isScrubbingRef.current) {
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
            // Buffering or playing without audio track
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
      }

      const totalTimelineMs = Math.max(1, timeline.totalMs)
      const currentGlobalMs = (slot.startMs + verseTimeMs) % totalTimelineMs
      if (!isScrubbingRef.current) {
        setCurrentProgressMs(currentGlobalMs)
      }

      renderFrame(ctx, {
        timeMs: currentGlobalMs,
        config,
        image,
        verse,
        verseTimeMs,
        slotDurationMs: totalSlotDurationMs,
        totalDurationMs: totalTimelineMs,
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

  // Handle volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
  }, [volume])

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

  // Seek / Scrubber handler
  const handleSeek = (targetMs: number) => {
    const totalMs = Math.max(1, timeline.totalMs)
    const clampedMs = Math.min(Math.max(0, targetMs), totalMs)
    setCurrentProgressMs(clampedMs)

    // Find corresponding verse slot
    const slotIdx = timeline.slots.findIndex(
      (s) => clampedMs >= s.startMs && clampedMs < s.endMs,
    )
    const safeIdx = slotIdx >= 0 ? slotIdx : (clampedMs >= totalMs ? timeline.slots.length - 1 : 0)
    const targetSlot = timeline.slots[safeIdx]

    if (targetSlot) {
      const offsetMs = clampedMs - targetSlot.startMs
      const seekSeconds = offsetMs / 1000
      advanceTo(safeIdx, seekSeconds)
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

  const totalDurationSeconds = timeline.totalMs / 1000
  const currentSeconds = currentProgressMs / 1000

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
      </div>

      {/* ── Rich Video Control Bar for Editor ── */}
      <div className="video-controller-card">
        {/* Scrubber progress bar */}
        <div className="scrubber-container">
          <input
            id="video-scrubber"
            type="range"
            min={0}
            max={Math.max(1, timeline.totalMs)}
            value={currentProgressMs}
            onMouseDown={() => setIsScrubbing(true)}
            onTouchStart={() => setIsScrubbing(true)}
            onChange={(e) => handleSeek(Number(e.target.value))}
            onMouseUp={() => setIsScrubbing(false)}
            onTouchEnd={() => setIsScrubbing(false)}
            className="video-scrubber"
            title="Seek video timeline"
          />
          {/* Verse breakdown markers along the scrubber */}
          {timeline.slots.length > 1 && (
            <div className="scrubber-markers">
              {timeline.slots.map((s, i) => (
                <div
                  key={s.startMs}
                  className={`scrubber-marker ${i === indexRef.current ? 'active' : ''}`}
                  style={{
                    left: `${(s.startMs / Math.max(1, timeline.totalMs)) * 100}%`,
                  }}
                  title={`Ayah ${s.verse.ayat}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Playback Controls Row */}
        <div className="video-controls-row">
          <div className="controls-left">
            <button
              type="button"
              className="ctrl-btn main-play"
              onClick={togglePlay}
              title={playing ? 'Pause (Space)' : 'Play (Space)'}
            >
              {playing ? '⏸' : '▶'}
            </button>

            <button
              type="button"
              className="ctrl-btn"
              onClick={() => {
                const prev = (indexRef.current - 1 + verses.length) % verses.length
                advanceTo(prev)
              }}
              title="Previous Ayah"
              disabled={verses.length <= 1}
            >
              ⏮
            </button>

            <button
              type="button"
              className="ctrl-btn"
              onClick={() => {
                const next = (indexRef.current + 1) % verses.length
                advanceTo(next)
              }}
              title="Next Ayah"
              disabled={verses.length <= 1}
            >
              ⏭
            </button>

            <button
              type="button"
              className="ctrl-btn"
              onClick={() => {
                handleSeek(0)
              }}
              title="Restart from beginning"
            >
              🔄
            </button>

            <div className="time-display">
              <span>{formatTime(currentSeconds)}</span>
              <span className="time-sep">/</span>
              <span>{formatTime(totalDurationSeconds)}</span>
            </div>
          </div>

          <div className="controls-right">
            <div className="volume-control">
              <button
                type="button"
                className={`ctrl-btn ${soundOn ? 'active' : ''}`}
                onClick={toggleSound}
                title={soundOn ? 'Mute' : 'Unmute'}
              >
                {soundOn ? (volume > 0.5 ? '🔊' : '🔉') : '🔇'}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={soundOn ? volume : 0}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  setVolume(v)
                  if (!soundOn && v > 0) setSoundOn(true)
                }}
                className="volume-slider"
                title="Volume"
              />
            </div>

            <div className="verse-pill">
              Ayah {currentVerse.ayat}
              {verses.length > 1 ? ` (${indexRef.current + 1}/${verses.length})` : ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
