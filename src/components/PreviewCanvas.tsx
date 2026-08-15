import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReelConfig } from '../types'
import { previewSize, renderFrame } from '../renderer/reelRenderer'
import type { Timeline } from '../renderer/timeline'
import { reverbAudio } from '../lib/reverbAudio'

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
  const videoRef = useRef<HTMLVideoElement | null>(null)
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
  const isReverbActive = Boolean(config.audio?.mosqueReverb)

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
      reverbAudio.stop()
    }
  }, [])

  // Custom Video Background Loop Support
  useEffect(() => {
    const isVideo =
      config.background.url.endsWith('.mp4') ||
      config.background.url.endsWith('.webm') ||
      config.background.url.startsWith('blob:')
    if (isVideo) {
      const v = document.createElement('video')
      v.src = config.background.url
      v.autoplay = true
      v.loop = true
      v.muted = true
      v.playsInline = true
      v.play().catch(() => {})
      videoRef.current = v
      return () => {
        v.pause()
        v.src = ''
        videoRef.current = null
      }
    } else {
      videoRef.current = null
    }
  }, [config.background.url])

  // Load and play audio for a specific verse index
  const loadAndPlayVerse = useCallback(
    (index: number, seekTimeSeconds = 0) => {
      const verse = verses[index]
      const audio = audioRef.current
      audioEndedTimeRef.current = null

      if (!verse?.audioUrl) {
        if (audio) {
          audio.pause()
          audio.src = ''
        }
        reverbAudio.stop()
        setAudioLoading(false)
        return
      }

      const targetUrl = verse.audioUrl
      const currentVol = soundOnRef.current ? volume : 0
      const intensity = config.audio?.reverbIntensity ?? 0.45

      if (config.audio?.mosqueReverb) {
        if (audio) {
          audio.pause()
        }
        if (playingRef.current) {
          setAudioLoading(true)
          void reverbAudio
            .play(targetUrl, seekTimeSeconds, currentVol, intensity, () => {
              audioEndedTimeRef.current = performance.now()
            })
            .then((success) => {
              setAudioLoading(false)
              if (!success && audio) {
                // Seamless fallback to standard audio if decode fails
                audio.src = targetUrl
                audio.currentTime = seekTimeSeconds
                if (soundOnRef.current) void audio.play()
              }
            })
        }
      } else {
        reverbAudio.stop()
        if (audio) {
          if (audio.src !== targetUrl) {
            audio.src = targetUrl
            audio.currentTime = seekTimeSeconds
            audio.load()
          } else {
            audio.currentTime = seekTimeSeconds
          }

          if (playingRef.current && soundOnRef.current) {
            audio
              .play()
              .then(() => {
                setAutoplayBlocked(false)
              })
              .catch(() => {
                setAutoplayBlocked(true)
              })
          }
        }
      }
    },
    [verses, config.audio?.mosqueReverb, config.audio?.reverbIntensity, volume],
  )

  // Switch between Reverb and Standard Audio smoothly in real time
  useEffect(() => {
    const audio = audioRef.current
    const verse = verses[indexRef.current]
    if (!verse?.audioUrl) return

    if (config.audio?.mosqueReverb) {
      if (audio && !audio.paused) {
        const sec = audio.currentTime
        audio.pause()
        if (playing && soundOn) {
          void reverbAudio.play(
            verse.audioUrl,
            sec,
            volume,
            config.audio.reverbIntensity ?? 0.45,
            () => {
              audioEndedTimeRef.current = performance.now()
            },
          )
        }
      } else {
        reverbAudio.setIntensity(config.audio.reverbIntensity ?? 0.45)
      }
    } else {
      if (reverbAudio.getIsPlaying()) {
        const sec = reverbAudio.pause()
        if (audio && playing && soundOn) {
          audio.currentTime = sec
          void audio.play()
        }
      }
    }
  }, [config.audio?.mosqueReverb, config.audio?.reverbIntensity, verses, playing, soundOn, volume])

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

      let currentIndex = indexRef.current
      let activeVerse = verses[currentIndex] || verses[0]
      let activeSlot = timeline.slots[currentIndex] || timeline.slots[0]
      const audio = audioRef.current

      if (!activeSlot || !activeVerse) {
        rafRef.current = requestAnimationFrame(loop)
        return
      }

      const isAudioActive = Boolean(activeVerse.audioUrl)
      let verseTimeMs = 0
      let totalSlotDurationMs = activeSlot.durationMs

      const isMultiAyah = verses.length > 1
      const isLastAyah = currentIndex === verses.length - 1
      const userDelayMs =
        typeof config.text?.ayahPauseDelay === 'number' && config.text.ayahPauseDelay >= 0
          ? Math.round(config.text.ayahPauseDelay * 1000)
          : 1600
      const pauseDurationMs = isMultiAyah && !isLastAyah ? userDelayMs : 0

      if (!isScrubbingRef.current) {
        if (isAudioActive) {
          const audioDurationMs =
            audio && Number.isFinite(audio.duration) && audio.duration > 0
              ? audio.duration * 1000
              : activeSlot.durationMs

          totalSlotDurationMs = audioDurationMs + pauseDurationMs

          const isReverbPlaying = isReverbActive && reverbAudio.getIsPlaying()
          const isNativeAudioEnded = audio?.ended || audioEndedTimeRef.current !== null

          if (isNativeAudioEnded || (!isReverbPlaying && !playingRef.current && audioEndedTimeRef.current !== null)) {
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
              currentIndex = nextIndex
              activeVerse = verses[nextIndex] || verses[0]
              activeSlot = timeline.slots[nextIndex] || timeline.slots[0]
              verseTimeMs = 0
              totalSlotDurationMs = activeSlot.durationMs
            }
          } else if (isReverbActive) {
            verseTimeMs = reverbAudio.getCurrentTime() * 1000
          } else if (audio && !audio.paused && audio.currentTime > 0) {
            verseTimeMs = audio.currentTime * 1000
          } else {
            verseTimeMs = now - slotStartRef.current
            if (verseTimeMs >= totalSlotDurationMs) {
              const nextIndex = (currentIndex + 1) % verses.length
              advanceTo(nextIndex)
              currentIndex = nextIndex
              activeVerse = verses[nextIndex] || verses[0]
              activeSlot = timeline.slots[nextIndex] || timeline.slots[0]
              verseTimeMs = 0
              totalSlotDurationMs = activeSlot.durationMs
            }
          }
        } else {
          verseTimeMs = now - slotStartRef.current
          totalSlotDurationMs = activeSlot.durationMs
          if (verseTimeMs >= totalSlotDurationMs) {
            const nextIndex = (currentIndex + 1) % verses.length
            advanceTo(nextIndex)
            currentIndex = nextIndex
            activeVerse = verses[nextIndex] || verses[0]
            activeSlot = timeline.slots[nextIndex] || timeline.slots[0]
            verseTimeMs = 0
            totalSlotDurationMs = activeSlot.durationMs
          }
        }
      }

      const totalTimelineMs = Math.max(1, timeline.totalMs)
      const currentGlobalMs = (activeSlot.startMs + verseTimeMs) % totalTimelineMs
      if (!isScrubbingRef.current) {
        setCurrentProgressMs(currentGlobalMs)
      }

      renderFrame(ctx, {
        timeMs: currentGlobalMs,
        config,
        image: videoRef.current || image,
        verse: activeVerse,
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
  }, [
    playing,
    verses,
    timeline,
    config,
    image,
    advanceTo,
    isReverbActive,
  ])

  // Pause / resume audio when play state changes
  useEffect(() => {
    const audio = audioRef.current
    if (config.audio?.mosqueReverb) {
      if (!playing || !soundOn) {
        reverbAudio.pause()
      } else if (verses[indexRef.current]?.audioUrl && !reverbAudio.getIsPlaying()) {
        const offset = (currentProgressMs - (timeline.slots[indexRef.current]?.startMs || 0)) / 1000
        void reverbAudio.play(
          verses[indexRef.current].audioUrl!,
          Math.max(0, offset),
          volume,
          config.audio.reverbIntensity ?? 0.45,
          () => {
            audioEndedTimeRef.current = performance.now()
          },
        )
      }
    } else if (audio) {
      if (playing && soundOn) {
        audio.play().catch(() => setAutoplayBlocked(true))
      } else {
        audio.pause()
      }
    }
  }, [playing, soundOn, config.audio?.mosqueReverb, config.audio?.reverbIntensity, verses, currentProgressMs, timeline.slots, volume])

  // Handle volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
    reverbAudio.setVolume(soundOn ? volume : 0)
  }, [volume, soundOn])

  // Toggle play/pause
  const togglePlay = () => {
    const nextPlaying = !playing
    setPlaying(nextPlaying)
    const audio = audioRef.current
    const verse = verses[indexRef.current]

    if (config.audio?.mosqueReverb) {
      if (nextPlaying && soundOn && verse?.audioUrl) {
        const offset = (currentProgressMs - (timeline.slots[indexRef.current]?.startMs || 0)) / 1000
        void reverbAudio.play(
          verse.audioUrl,
          Math.max(0, offset),
          volume,
          config.audio.reverbIntensity ?? 0.45,
          () => {
            audioEndedTimeRef.current = performance.now()
          },
        )
      } else {
        reverbAudio.pause()
      }
    } else if (audio) {
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
    const verse = verses[indexRef.current]

    if (config.audio?.mosqueReverb) {
      reverbAudio.setVolume(nextSound ? volume : 0)
      if (nextSound && playing && verse?.audioUrl && !reverbAudio.getIsPlaying()) {
        const offset = (currentProgressMs - (timeline.slots[indexRef.current]?.startMs || 0)) / 1000
        void reverbAudio.play(
          verse.audioUrl,
          Math.max(0, offset),
          volume,
          config.audio.reverbIntensity ?? 0.45,
          () => {
            audioEndedTimeRef.current = performance.now()
          },
        )
      }
    } else if (audio) {
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
    const verse = verses[indexRef.current]
    if (config.audio?.mosqueReverb && verse?.audioUrl) {
      setAutoplayBlocked(false)
      setSoundOn(true)
      setPlaying(true)
      void reverbAudio.play(
        verse.audioUrl,
        0,
        volume,
        config.audio.reverbIntensity ?? 0.45,
        () => {
          audioEndedTimeRef.current = performance.now()
        },
      )
    } else if (audio) {
      audio
        .play()
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
          <div className="autoplay-overlay" onClick={handleEnableAudio}>
            <button type="button" className="btn primary">
              ▶ Tap to Enable Recitation Audio
            </button>
          </div>
        )}
      </div>

      {/* Video & Audio Scrubber & Controls Bar */}
      <div className="player-controls">
        <div className="scrubber-track-container">
          <input
            id="timeline-scrubber"
            type="range"
            min={0}
            max={Math.max(1, timeline.totalMs)}
            value={currentProgressMs}
            onMouseDown={() => setIsScrubbing(true)}
            onTouchStart={() => setIsScrubbing(true)}
            onMouseUp={() => setIsScrubbing(false)}
            onTouchEnd={() => setIsScrubbing(false)}
            onChange={(e) => handleSeek(Number(e.target.value))}
            className="timeline-slider"
            title="Seek video timeline"
          />

          {timeline.slots.length > 1 && (
            <div className="ayah-markers">
              {timeline.slots.map((slot, i) => (
                <div
                  key={i}
                  className={`ayah-marker ${indexRef.current === i ? 'active' : ''}`}
                  style={{
                    left: `${(slot.startMs / timeline.totalMs) * 100}%`,
                    width: `${(slot.durationMs / timeline.totalMs) * 100}%`,
                  }}
                  title={`Ayah ${verses[i]?.ayat || i + 1}`}
                  onClick={() => advanceTo(i)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="transport-bar">
          <div className="transport-left">
            <button
              type="button"
              className="btn transport-btn"
              onClick={togglePlay}
              title={playing ? 'Pause (Space)' : 'Play (Space)'}
            >
              {playing ? '⏸' : '▶'}
            </button>
            <button
              type="button"
              className="btn transport-btn"
              onClick={() => advanceTo((indexRef.current - 1 + verses.length) % verses.length)}
              title="Previous Ayah"
              disabled={verses.length <= 1}
            >
              ⏮
            </button>
            <button
              type="button"
              className="btn transport-btn"
              onClick={() => advanceTo((indexRef.current + 1) % verses.length)}
              title="Next Ayah"
              disabled={verses.length <= 1}
            >
              ⏭
            </button>
            <button
              type="button"
              className="btn transport-btn"
              onClick={() => advanceTo(0, 0)}
              title="Restart from beginning"
            >
              ↺
            </button>
            <span className="time-display">
              {formatTime(currentSeconds)} / {formatTime(totalDurationSeconds)}
            </span>
          </div>

          <div className="transport-right">
            {isReverbActive && (
              <span
                style={{
                  fontSize: '0.72rem',
                  color: '#ffd700',
                  background: 'rgba(255, 215, 0, 0.15)',
                  padding: '0.15rem 0.4rem',
                  borderRadius: '4px',
                }}
              >
                🕌 Sanctuary Reverb
              </span>
            )}
            <button
              type="button"
              className="btn transport-btn"
              onClick={toggleSound}
              title={soundOn ? 'Mute audio' : 'Unmute audio'}
            >
              {soundOn ? '🔊' : '🔇'}
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
                if (v > 0 && !soundOn) setSoundOn(true)
              }}
              className="volume-slider"
              title={`Volume: ${Math.round(volume * 100)}%`}
            />
          </div>
        </div>
      </div>

      <div className="preview-meta">
        <span>
          {currentVerse
            ? `${currentVerse.surahName} ${currentVerse.surah}:${currentVerse.ayat}`
            : 'Verse'}
        </span>
        <span>
          Ayah {indexRef.current + 1} of {verses.length}
        </span>
      </div>
    </div>
  )
}
