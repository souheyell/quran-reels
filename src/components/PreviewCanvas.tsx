import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReelConfig } from '../types'
import { previewSize, renderFrame } from '../renderer/reelRenderer'
import type { Timeline } from '../renderer/timeline'
import { subscribeAudioProgress, type AudioProgressInfo } from '../lib/audioCache'

interface PreviewCanvasProps {
  config: ReelConfig
  image: HTMLImageElement | HTMLVideoElement | null
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

  const audioPoolRef = useRef<Map<number, HTMLAudioElement>>(new Map())

  const [playing, setPlaying] = useState(true)
  const [soundOn, setSoundOn] = useState(true)
  const [volume, setVolume] = useState(0.9)
  const [audioLoading, setAudioLoading] = useState(false)
  const [autoplayBlocked, setAutoplayBlocked] = useState(false)
  const [currentProgressMs, setCurrentProgressMs] = useState(0)
  const [isScrubbing, setIsScrubbing] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState<AudioProgressInfo | null>(null)
  const [safeZone, setSafeZone] = useState<'none' | 'instagram' | 'tiktok' | 'grid'>('none')

  const playingRef = useRef(playing)
  const soundOnRef = useRef(soundOn)
  const visibleRef = useRef(!document.hidden)
  const isScrubbingRef = useRef(isScrubbing)

  // Subscribe to audio cache streaming progress
  useEffect(() => {
    return subscribeAudioProgress((info) => {
      setDownloadProgress(info)
      if (info.percent >= 100) {
        const timer = setTimeout(() => setDownloadProgress(null), 1200)
        return () => clearTimeout(timer)
      }
    })
  }, [])

  // Preview renders at high DPI preview scale
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

  // Preloaded Audio Pool with gapless handoff
  const loadAndPlayVerse = useCallback(
    (index: number, seekTimeSeconds = 0) => {
      audioEndedTimeRef.current = null

      // Pause other audio elements in pool
      audioPoolRef.current.forEach((a, i) => {
        if (i !== index) {
          a.pause()
          a.currentTime = 0
        }
      })

      const targetAudio = audioPoolRef.current.get(index)
      audioRef.current = targetAudio || null

      if (!targetAudio) {
        setAudioLoading(false)
        return
      }

      targetAudio.volume = volume
      if (seekTimeSeconds > 0) {
        targetAudio.currentTime = seekTimeSeconds
      } else {
        targetAudio.currentTime = 0
      }

      if (playingRef.current && soundOnRef.current) {
        const playPromise = targetAudio.play()
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setAutoplayBlocked(false)
            })
            .catch((err) => {
              if (err instanceof DOMException && err.name === 'NotAllowedError') {
                setAutoplayBlocked(true)
              }
            })
        }
      }
    },
    [volume],
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

  // Initialize and preload all verse audio elements into the pool
  useEffect(() => {
    // Clean up previous elements
    audioPoolRef.current.forEach((audio) => {
      audio.pause()
      audio.src = ''
    })
    audioPoolRef.current.clear()

    // Preload each verse element
    verses.forEach((verse, i) => {
      if (!verse?.audioUrl) return
      const audio = new Audio(verse.audioUrl)
      audio.volume = volume
      audio.preload = 'auto'

      audio.onloadstart = () => {
        if (indexRef.current === i) setAudioLoading(true)
      }
      audio.onwaiting = () => {
        if (indexRef.current === i) setAudioLoading(true)
      }
      audio.oncanplay = () => {
        if (indexRef.current === i) setAudioLoading(false)
      }
      audio.onplaying = () => {
        if (indexRef.current === i) {
          setAudioLoading(false)
          setAutoplayBlocked(false)
        }
      }
      audio.onended = () => {
        if (indexRef.current === i) {
          audioEndedTimeRef.current = performance.now()
        }
      }
      audio.onerror = () => {
        if (indexRef.current === i) setAudioLoading(false)
      }

      audioPoolRef.current.set(i, audio)
    })

    indexRef.current = 0
    loopBaseRef.current = 0
    slotStartRef.current = performance.now()
    audioEndedTimeRef.current = null
    loadAndPlayVerse(0)

    return () => {
      audioPoolRef.current.forEach((audio) => {
        audio.pause()
        audio.src = ''
      })
      audioPoolRef.current.clear()
      audioRef.current = null
    }
  }, [verses, volume, loadAndPlayVerse])

  // Continuous Video Background Playback (Never cuts or resets across verses)
  const currentVideoUrlRef = useRef<string | null>(null)

  useEffect(() => {
    const isVideo =
      image instanceof HTMLVideoElement ||
      config.background.mediaType === 'video' ||
      /\.(mp4|webm|mov|m4v)($|\?)/i.test(config.background.url)

    if (!isVideo) {
      if (videoRef.current) {
        try {
          videoRef.current.pause()
          videoRef.current.src = ''
        } catch {}
        videoRef.current = null
        currentVideoUrlRef.current = null
      }
      return
    }

    if (image instanceof HTMLVideoElement) {
      videoRef.current = image
      currentVideoUrlRef.current = config.background.url
      if (playing) {
        image.play().catch(() => {})
      } else {
        image.pause()
      }
      return
    }

    // Only create a new HTMLVideoElement if URL has changed or no video element exists
    if (!videoRef.current || currentVideoUrlRef.current !== config.background.url) {
      if (videoRef.current) {
        try {
          videoRef.current.pause()
          videoRef.current.src = ''
        } catch {}
      }

      const v = document.createElement('video')
      v.src = config.background.url
      v.autoplay = true
      v.loop = true
      v.muted = true
      v.playsInline = true
      v.crossOrigin = 'anonymous'
      v.preload = 'auto'
      if (playing) {
        v.play().catch(() => {})
      }
      videoRef.current = v
      currentVideoUrlRef.current = config.background.url
    } else {
      // Same video URL: just sync play/pause state without resetting currentTime
      if (playing) {
        videoRef.current.play().catch(() => {})
      } else {
        videoRef.current.pause()
      }
    }
  }, [config.background.url, config.background.mediaType, image, playing])

  // Clean up video element only on component unmount
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        try {
          videoRef.current.pause()
          videoRef.current.src = ''
        } catch {}
        videoRef.current = null
        currentVideoUrlRef.current = null
      }
    }
  }, [])

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

      const isAudioActive = Boolean(activeVerse.audioUrl && audio)
      let verseTimeMs = 0
      let totalSlotDurationMs = activeSlot.durationMs

      const isMultiAyah = verses.length > 1
      const isLastAyah = currentIndex === verses.length - 1
      const userDelayMs =
        typeof config.text?.ayahPauseDelay === 'number' && config.text.ayahPauseDelay >= 0
          ? Math.round(config.text.ayahPauseDelay * 1000)
          : 0
      const pauseDurationMs = isMultiAyah && !isLastAyah ? userDelayMs : 0

      if (!isScrubbingRef.current) {
        if (isAudioActive && audio) {
          const audioDurationMs =
            Number.isFinite(audio.duration) && audio.duration > 0
              ? audio.duration * 1000
              : activeSlot.durationMs

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
              currentIndex = nextIndex
              activeVerse = verses[nextIndex] || verses[0]
              activeSlot = timeline.slots[nextIndex] || timeline.slots[0]
              verseTimeMs = 0
              totalSlotDurationMs = activeSlot.durationMs
            }
          } else if (!audio.paused && audio.currentTime > 0) {
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
  ])

  // Pause / resume audio when play state changes
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (playing && soundOn) {
      audio.play().catch(() => setAutoplayBlocked(true))
    } else {
      audio.pause()
    }
  }, [playing, soundOn])

  // Handle volume changes across all preloaded audio pool elements
  useEffect(() => {
    audioPoolRef.current.forEach((audio) => {
      audio.volume = volume
    })
  }, [volume])

  // Toggle play/pause
  const togglePlay = () => {
    const nextPlaying = !playing
    setPlaying(nextPlaying)
    const audio = audioRef.current || audioPoolRef.current.get(indexRef.current)
    if (audio) {
      if (nextPlaying && soundOn) {
        const p = audio.play()
        if (p !== undefined) {
          p.then(() => setAutoplayBlocked(false)).catch((err) => {
            if (err instanceof DOMException && err.name === 'NotAllowedError') {
              setAutoplayBlocked(true)
            }
          })
        }
      } else {
        audio.pause()
      }
    }
  }

  // Toggle sound
  const toggleSound = () => {
    const nextSound = !soundOn
    setSoundOn(nextSound)
    const audio = audioRef.current || audioPoolRef.current.get(indexRef.current)
    if (audio) {
      if (nextSound && playing) {
        const p = audio.play()
        if (p !== undefined) {
          p.then(() => setAutoplayBlocked(false)).catch((err) => {
            if (err instanceof DOMException && err.name === 'NotAllowedError') {
              setAutoplayBlocked(true)
            }
          })
        }
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
      if (videoRef.current && Number.isFinite(videoRef.current.duration) && videoRef.current.duration > 0) {
        videoRef.current.currentTime = (clampedMs / 1000) % videoRef.current.duration
      }
    }
  }

  // Enable audio on user click if autoplay was blocked
  const handleEnableAudio = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setAutoplayBlocked(false)
    setSoundOn(true)
    setPlaying(true)

    const audio = audioRef.current || audioPoolRef.current.get(indexRef.current)
    if (audio) {
      audio.volume = volume > 0 ? volume : 0.9
      const playPromise = audio.play()
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setAutoplayBlocked(false)
          })
          .catch((err) => {
            console.warn('Playback error after enable click:', err)
          })
      }
    }
  }

  const totalDurationSeconds = timeline.totalMs / 1000
  const currentSeconds = currentProgressMs / 1000

  return (
    <div className="preview-container">
      {/* ── Viewport Floating Toolbar (Safe Zones & Aspect) ──── */}
      <div className="viewport-toolbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: '380px', marginBottom: '0.5rem', padding: '0 0.25rem' }}>
        <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(5, 20, 36, 0.7)', backdropFilter: 'blur(12px)', padding: '0.2rem 0.35rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            type="button"
            onClick={() => setSafeZone('none')}
            title="Clean Viewport"
            style={{
              background: safeZone === 'none' ? '#f59e0b' : 'transparent',
              color: safeZone === 'none' ? '#000' : 'rgba(255,255,255,0.7)',
              border: 'none',
              borderRadius: '12px',
              padding: '0.2rem 0.55rem',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Clean
          </button>
          <button
            type="button"
            onClick={() => setSafeZone(safeZone === 'instagram' ? 'none' : 'instagram')}
            title="Toggle Instagram Reels Safe Zone"
            style={{
              background: safeZone === 'instagram' ? '#f59e0b' : 'transparent',
              color: safeZone === 'instagram' ? '#000' : 'rgba(255,255,255,0.7)',
              border: 'none',
              borderRadius: '12px',
              padding: '0.2rem 0.55rem',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <span>📱</span> IG Reels
          </button>
          <button
            type="button"
            onClick={() => setSafeZone(safeZone === 'tiktok' ? 'none' : 'tiktok')}
            title="Toggle TikTok Safe Zone"
            style={{
              background: safeZone === 'tiktok' ? '#f59e0b' : 'transparent',
              color: safeZone === 'tiktok' ? '#000' : 'rgba(255,255,255,0.7)',
              border: 'none',
              borderRadius: '12px',
              padding: '0.2rem 0.55rem',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <span>🎵</span> TikTok
          </button>
          <button
            type="button"
            onClick={() => setSafeZone(safeZone === 'grid' ? 'none' : 'grid')}
            title="Toggle Rule-of-Thirds Composition Grid"
            style={{
              background: safeZone === 'grid' ? '#f59e0b' : 'transparent',
              color: safeZone === 'grid' ? '#000' : 'rgba(255,255,255,0.7)',
              border: 'none',
              borderRadius: '12px',
              padding: '0.2rem 0.55rem',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            📐 Grid
          </button>
        </div>

        <div style={{ fontSize: '0.72rem', color: '#fbbf24', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '0.2rem 0.5rem', borderRadius: '12px', fontWeight: 600 }}>
          {config.aspectRatio} · {width}x{height}
        </div>
      </div>

      <div
        className="preview-wrapper"
        style={{
          aspectRatio: config.aspectRatio.replace(':', '/'),
          cursor: 'pointer',
          position: 'relative',
        }}
        onClick={() => {
          if (autoplayBlocked) {
            handleEnableAudio()
          } else {
            togglePlay()
          }
        }}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="preview-canvas"
        />

        {/* ── Social Safe Zone Overlay Guides ──────────────────── */}
        {safeZone === 'instagram' && (
          <div className="social-safe-zone-overlay ig-safe-zone" style={{ pointerEvents: 'none', position: 'absolute', inset: 0, zIndex: 15, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '12px 14px' }}>
            {/* Top Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.75 }}>
              <span style={{ fontSize: '0.8rem', color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>‹ Reels</span>
              <span style={{ fontSize: '0.8rem', color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>📷</span>
            </div>
            {/* Right Action Column */}
            <div style={{ position: 'absolute', right: '12px', bottom: '64px', display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center', opacity: 0.85 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <span style={{ fontSize: '1.2rem', textShadow: '0 2px 4px rgba(0,0,0,0.9)' }}>🤍</span>
                <span style={{ fontSize: '0.65rem', color: '#fff', textShadow: '0 1px 2px #000' }}>14.2k</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <span style={{ fontSize: '1.2rem', textShadow: '0 2px 4px rgba(0,0,0,0.9)' }}>💬</span>
                <span style={{ fontSize: '0.65rem', color: '#fff', textShadow: '0 1px 2px #000' }}>382</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <span style={{ fontSize: '1.2rem', textShadow: '0 2px 4px rgba(0,0,0,0.9)' }}>↗️</span>
                <span style={{ fontSize: '0.65rem', color: '#fff', textShadow: '0 1px 2px #000' }}>Share</span>
              </div>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid #fff', background: '#000', opacity: 0.9 }} />
            </div>
            {/* Bottom Safe Zone Indicator */}
            <div style={{ background: 'rgba(0,0,0,0.3)', borderTop: '1px dashed rgba(245, 158, 11, 0.6)', padding: '6px 8px', borderRadius: '4px', maxWidth: '75%' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fbbf24', textShadow: '0 1px 2px #000' }}>@quran_creator · Follow</div>
              <div style={{ fontSize: '0.65rem', color: '#d4e4fa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Instagram Caption area (Avoid placing critical text here)</div>
            </div>
          </div>
        )}

        {safeZone === 'tiktok' && (
          <div className="social-safe-zone-overlay tiktok-safe-zone" style={{ pointerEvents: 'none', position: 'absolute', inset: 0, zIndex: 15, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', opacity: 0.75 }}>
              <span style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 600 }}>Following | For You</span>
            </div>
            <div style={{ position: 'absolute', right: '10px', bottom: '50px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', opacity: 0.85 }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid #ff0050', background: '#fff' }} />
              <span style={{ fontSize: '1.1rem' }}>❤️</span>
              <span style={{ fontSize: '1.1rem' }}>💬</span>
              <span style={{ fontSize: '1.1rem' }}>⭐</span>
              <span style={{ fontSize: '1.1rem' }}>↗️</span>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.35)', borderTop: '1px dashed rgba(0, 229, 255, 0.6)', padding: '6px 8px', borderRadius: '4px', maxWidth: '70%' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#00e5ff' }}>@creator_handle</div>
              <div style={{ fontSize: '0.62rem', color: '#fff' }}>TikTok Safe Zone Margin</div>
            </div>
          </div>
        )}

        {safeZone === 'grid' && (
          <div className="composition-grid-overlay" style={{ pointerEvents: 'none', position: 'absolute', inset: 0, zIndex: 15, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr 1fr', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            <div style={{ borderRight: '1px dashed rgba(245, 158, 11, 0.4)', borderBottom: '1px dashed rgba(245, 158, 11, 0.4)' }} />
            <div style={{ borderRight: '1px dashed rgba(245, 158, 11, 0.4)', borderBottom: '1px dashed rgba(245, 158, 11, 0.4)' }} />
            <div style={{ borderBottom: '1px dashed rgba(245, 158, 11, 0.4)' }} />
            <div style={{ borderRight: '1px dashed rgba(245, 158, 11, 0.4)', borderBottom: '1px dashed rgba(245, 158, 11, 0.4)' }} />
            <div style={{ borderRight: '1px dashed rgba(245, 158, 11, 0.4)', borderBottom: '1px dashed rgba(245, 158, 11, 0.4)' }} />
            <div style={{ borderBottom: '1px dashed rgba(245, 158, 11, 0.4)' }} />
            <div style={{ borderRight: '1px dashed rgba(245, 158, 11, 0.4)' }} />
            <div style={{ borderRight: '1px dashed rgba(245, 158, 11, 0.4)' }} />
            <div />
          </div>
        )}

        {/* ── Audio Download Progress Overlay ──────────────────── */}
        {downloadProgress && downloadProgress.percent < 100 && (
          <div className="audio-download-canvas-overlay">
            <div className="canvas-download-box">
              <div className="canvas-download-top">
                <span className="canvas-download-spinner" />
                <span className="canvas-download-title">
                  Caching Recitation ({downloadProgress.percent}%)
                </span>
              </div>
              <div className="canvas-download-track">
                <div
                  className="canvas-download-fill"
                  style={{ width: `${downloadProgress.percent}%` }}
                />
              </div>
              {downloadProgress.totalAyahs > 1 && (
                <div className="canvas-download-sub">
                  Ayah {downloadProgress.ayahIndex} of {downloadProgress.totalAyahs}
                </div>
              )}
            </div>
          </div>
        )}

        {audioLoading && !downloadProgress && (
          <div className="audio-badge">
            <span className="spinner" /> Buffering audio…
          </div>
        )}

        {autoplayBlocked && (
          <div className="autoplay-overlay" onClick={handleEnableAudio}>
            <button type="button" className="btn primary" onClick={handleEnableAudio}>
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
