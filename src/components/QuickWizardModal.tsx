import React, { useState, useMemo } from 'react'
import type { ReelConfig, ExportQualityPreset } from '../types'
import { AESTHETIC_PRESETS, type ReelPreset, applyPresetToConfig } from '../lib/presets'
import { getReciterSampleAudioUrl } from '../api/quran'
import { STOCK_VIDEO_LOOPS } from '../api/unsplash'
import { generateSocialCaption } from '../lib/share'
import { EXPORT_PRESETS_CONFIG } from '../types'

interface QuickWizardModalProps {
  isOpen: boolean
  onClose: () => void
  currentConfig: ReelConfig
  onApplyConfig: (config: ReelConfig) => void
  onLoadSurahRange: (surah: number, startAyat: number, count: number, reciterId?: string) => Promise<void>
  onExportVideo: () => void
  onShareReel: () => void
  exporting: boolean
  exportProgress: number
  exportPreset: ExportQualityPreset
  onExportPresetChange: (preset: ExportQualityPreset) => void
}

const POPULAR_SURAHS = [
  { number: 1, name: 'Al-Fatiha', arabic: 'الفاتحة', count: 7 },
  { number: 2, name: 'Al-Baqarah (Ayat al-Kursi)', arabic: 'البقرة', ayat: 255, count: 1 },
  { number: 18, name: 'Al-Kahf', arabic: 'الكهف', count: 4 },
  { number: 36, name: 'Ya-Sin', arabic: 'يس', count: 4 },
  { number: 55, name: 'Ar-Rahman', arabic: 'الرحمن', count: 5 },
  { number: 67, name: 'Al-Mulk', arabic: 'الملك', count: 4 },
  { number: 112, name: 'Al-Ikhlas', arabic: 'الإخلاص', count: 4 },
  { number: 113, name: 'Al-Falaq', arabic: 'الفلق', count: 5 },
  { number: 114, name: 'An-Nas', arabic: 'الناس', count: 6 },
]

const QUICK_RECITERS = [
  { id: 'ar.alafasy', name: 'Mishary Rashid Alafasy', sub: 'Kuwait · Modern Murattal' },
  { id: 'ar.abdulbasitmurattal', name: 'Abdulbasit Abdussamad', sub: 'Egypt · Golden Age Murattal' },
  { id: 'ar.minshawi', name: 'Mohamed Siddiq Al-Minshawi', sub: 'Egypt · Melodic Murattal' },
  { id: 'ar.yasserdossari', name: 'Yasser Al-Dosari', sub: 'Haramain · Emotional' },
  { id: 'ar.mahermuaiqly', name: 'Maher Al-Muaiqly', sub: 'Makkah · Contemporary' },
  { id: 'ar.husary', name: 'Mahmoud Khalil Al-Husary', sub: 'Egypt · Precise Tajweed' },
]

export function QuickWizardModal({
  isOpen,
  onClose,
  currentConfig,
  onApplyConfig,
  onLoadSurahRange,
  onExportVideo,
  onShareReel,
  exporting,
  exportProgress,
  exportPreset,
  onExportPresetChange,
}: QuickWizardModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selectedSurah, setSelectedSurah] = useState<number>(1)
  const [startAyat, setStartAyat] = useState<number>(1)
  const [ayahCount, setAyahCount] = useState<number>(4)
  const [selectedReciterId, setSelectedReciterId] = useState<string>('ar.alafasy')
  const [selectedPresetId, setSelectedPresetId] = useState<string>(AESTHETIC_PRESETS[0]?.id || '')
  const [loadingAyahs, setLoadingAyahs] = useState<boolean>(false)
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null)
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null)
  const [copiedCaption, setCopiedCaption] = useState<boolean>(false)

  const currentVerses = currentConfig.verses
  const socialCaption = useMemo(() => {
    return generateSocialCaption(currentVerses, currentVerses[0]?.reciterName)
  }, [currentVerses])

  if (!isOpen) return null

  const handlePlaySample = (reciterId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (playingAudioId === reciterId && audioElement) {
      audioElement.pause()
      setPlayingAudioId(null)
      return
    }
    if (audioElement) {
      audioElement.pause()
    }
    const sampleUrl = getReciterSampleAudioUrl(reciterId)
    const audio = new Audio(sampleUrl)
    audio.onended = () => setPlayingAudioId(null)
    audio.onerror = () => setPlayingAudioId(null)
    audio.play().then(() => {
      setAudioElement(audio)
      setPlayingAudioId(reciterId)
    }).catch(() => setPlayingAudioId(null))
  }

  const handleSelectPopularSurah = async (item: typeof POPULAR_SURAHS[0]) => {
    setSelectedSurah(item.number)
    const start = item.ayat || 1
    const count = item.count || 4
    setStartAyat(start)
    setAyahCount(count)
    setLoadingAyahs(true)
    try {
      await onLoadSurahRange(item.number, start, count, selectedReciterId)
    } finally {
      setLoadingAyahs(false)
    }
  }

  const handleApplyPreset = (preset: ReelPreset) => {
    setSelectedPresetId(preset.id)
    const updated = applyPresetToConfig(currentConfig, preset)
    onApplyConfig(updated)
  }

  const handleNextStep1 = async () => {
    setLoadingAyahs(true)
    try {
      await onLoadSurahRange(selectedSurah, startAyat, ayahCount, selectedReciterId)
      setStep(2)
    } finally {
      setLoadingAyahs(false)
    }
  }

  const handleCopyCaption = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(socialCaption).catch(() => {})
      setCopiedCaption(true)
      setTimeout(() => setCopiedCaption(false), 3000)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content quick-wizard-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '780px',
          width: '94%',
          background: 'linear-gradient(180deg, rgba(13, 28, 45, 0.96) 0%, rgba(5, 20, 36, 0.98) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(245, 158, 11, 0.15)',
          borderRadius: '16px',
          overflow: 'hidden',
        }}
      >
        {/* Wizard Header */}
        <div className="wizard-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'linear-gradient(135deg, #f59e0b, #10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
              ⚡
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#fff' }}>Quick Reel Wizard</h2>
              <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', margin: 0 }}>Create a viral Instagram / TikTok Quran Reel in 3 easy steps</p>
            </div>
          </div>
          <button type="button" className="modal-close" onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: '1.5rem', cursor: 'pointer' }}>
            ✕
          </button>
        </div>

        {/* Step Progress Bar */}
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', padding: '0.75rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', gap: '1rem' }}>
          <div
            onClick={() => setStep(1)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              color: step >= 1 ? '#f59e0b' : 'rgba(255,255,255,0.4)',
              fontWeight: step === 1 ? 700 : 500,
              fontSize: '0.85rem',
            }}
          >
            <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: step >= 1 ? '#f59e0b' : 'rgba(255,255,255,0.1)', color: step >= 1 ? '#000' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>1</span>
            <span>Ayah &amp; Reciter</span>
          </div>
          <div
            onClick={() => step >= 2 && setStep(2)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: step >= 2 ? 'pointer' : 'default',
              color: step >= 2 ? '#f59e0b' : 'rgba(255,255,255,0.4)',
              fontWeight: step === 2 ? 700 : 500,
              fontSize: '0.85rem',
            }}
          >
            <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: step >= 2 ? '#f59e0b' : 'rgba(255,255,255,0.1)', color: step >= 2 ? '#000' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>2</span>
            <span>Aesthetic &amp; Theme</span>
          </div>
          <div
            onClick={() => step >= 3 && setStep(3)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: step >= 3 ? 'pointer' : 'default',
              color: step >= 3 ? '#4edea3' : 'rgba(255,255,255,0.4)',
              fontWeight: step === 3 ? 700 : 500,
              fontSize: '0.85rem',
            }}
          >
            <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: step >= 3 ? '#4edea3' : 'rgba(255,255,255,0.1)', color: step >= 3 ? '#000' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>3</span>
            <span>Export &amp; Share</span>
          </div>
        </div>

        {/* Wizard Body */}
        <div style={{ padding: '1.5rem', maxHeight: '60vh', overflowY: 'auto' }}>
          {/* STEP 1: Ayah & Reciter */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#f59e0b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  ⭐ Popular Viral Surahs (Quick Pick)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.5rem' }}>
                  {POPULAR_SURAHS.map((item) => {
                    const isSelected = selectedSurah === item.number && (!item.ayat || startAyat === item.ayat)
                    return (
                      <button
                        key={`${item.number}-${item.ayat || 1}`}
                        type="button"
                        onClick={() => handleSelectPopularSurah(item)}
                        style={{
                          background: isSelected ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255,255,255,0.04)',
                          border: isSelected ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '8px',
                          padding: '0.5rem 0.75rem',
                          textAlign: 'left',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.15rem',
                        }}
                      >
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: isSelected ? '#fbbf24' : '#fff' }}>{item.name}</span>
                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', fontFamily: 'serif' }}>{item.arabic}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Reciter Picker */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#f59e0b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  🎙️ Select Reciter (Qari)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.6rem' }}>
                  {QUICK_RECITERS.map((r) => {
                    const isSelected = selectedReciterId === r.id
                    const isPlaying = playingAudioId === r.id
                    return (
                      <div
                        key={r.id}
                        onClick={() => setSelectedReciterId(r.id)}
                        style={{
                          background: isSelected ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255,255,255,0.04)',
                          border: isSelected ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '10px',
                          padding: '0.6rem 0.8rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.5rem',
                        }}
                      >
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: isSelected ? '#fbbf24' : '#fff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{r.name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>{r.sub}</div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handlePlaySample(r.id, e)}
                          title="Listen to sample audio"
                          style={{
                            background: isPlaying ? '#f59e0b' : 'rgba(255,255,255,0.1)',
                            color: isPlaying ? '#000' : '#fff',
                            border: 'none',
                            borderRadius: '50%',
                            width: '28px',
                            height: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0,
                          }}
                        >
                          {isPlaying ? '⏸' : '▶'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Aesthetic & Theme */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#f59e0b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  🎨 1-Click Aesthetic Theme Presets
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                  {AESTHETIC_PRESETS.slice(0, 8).map((preset) => {
                    const isSelected = selectedPresetId === preset.id
                    return (
                      <div
                        key={preset.id}
                        onClick={() => handleApplyPreset(preset)}
                        style={{
                          background: isSelected ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255,255,255,0.04)',
                          border: isSelected ? '2px solid #f59e0b' : '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '12px',
                          padding: '0.75rem',
                          cursor: 'pointer',
                          display: 'flex',
                          gap: '0.75rem',
                          alignItems: 'center',
                          transition: 'all 0.2s ease',
                          boxShadow: isSelected ? '0 0 16px rgba(245, 158, 11, 0.3)' : 'none',
                        }}
                      >
                        <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
                          {preset.icon || '🕌'}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: isSelected ? '#fbbf24' : '#fff' }}>{preset.name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{preset.description}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Video Loop Background Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#4edea3', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  🎬 Or Choose a Cinematic Video Background Loop
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.6rem' }}>
                  {STOCK_VIDEO_LOOPS.map((video) => {
                    const isVideoSelected = currentConfig.background.url === video.full
                    return (
                      <div
                        key={video.id}
                        onClick={() => {
                          onApplyConfig({
                            ...currentConfig,
                            background: {
                              ...currentConfig.background,
                              url: video.full,
                              mediaType: 'video',
                            },
                          })
                        }}
                        style={{
                          background: isVideoSelected ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255,255,255,0.04)',
                          border: isVideoSelected ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '10px',
                          padding: '0.5rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.6rem',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <img
                          src={video.thumb}
                          alt={video.title}
                          style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }}
                        />
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: isVideoSelected ? '#4edea3' : '#fff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                            {video.title}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)' }}>
                            🎬 Video Loop
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Export & Share */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Quality Preset Card */}
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#f59e0b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  ⚡ Video Export Quality
                </label>
                <select
                  value={exportPreset}
                  onChange={(e) => onExportPresetChange(e.target.value as ExportQualityPreset)}
                  style={{
                    width: '100%',
                    background: '#051424',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    color: '#fff',
                    padding: '0.6rem 0.8rem',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    marginBottom: '0.75rem',
                  }}
                >
                  <option value="instagram-fb">⭐ Instagram &amp; FB Reels (1080p · 30fps · 10Mbps) [Recommended]</option>
                  <option value="smooth-60fps">🎬 Smooth 60 FPS (1080p · 60fps · 14Mbps)</option>
                  <option value="4k-master">👑 4K Ultra HD Master (2160x3840 · 30fps · 30Mbps)</option>
                  <option value="compact">⚡ Compact Share (1080p · 30fps · 6Mbps)</option>
                </select>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', color: '#4edea3', fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                    {EXPORT_PRESETS_CONFIG[exportPreset].fps} FPS Smooth
                  </span>
                  <span style={{ background: 'rgba(245, 158, 11, 0.2)', border: '1px solid #f59e0b', color: '#fbbf24', fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                    {Math.round(EXPORT_PRESETS_CONFIG[exportPreset].bitrate / 1_000_000)} Mbps Video Bitrate
                  </span>
                  <span style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#d4e4fa', fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                    AAC Stereo 320k Audio
                  </span>
                  <span style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#d4e4fa', fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                    H.264 High Profile (MP4)
                  </span>
                </div>
              </div>

              {/* Social Caption Box */}
              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    📱 Auto Social Caption &amp; Hashtags
                  </label>
                  <button
                    type="button"
                    onClick={handleCopyCaption}
                    style={{
                      background: copiedCaption ? '#10b981' : 'rgba(245, 158, 11, 0.2)',
                      border: copiedCaption ? '1px solid #10b981' : '1px solid #f59e0b',
                      color: copiedCaption ? '#000' : '#fbbf24',
                      padding: '0.25rem 0.6rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {copiedCaption ? '✓ Copied!' : '📋 Copy Caption'}
                  </button>
                </div>
                <textarea
                  readOnly
                  value={socialCaption}
                  rows={3}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    color: '#d4e4fa',
                    fontSize: '0.8rem',
                    padding: '0.5rem',
                    resize: 'none',
                    fontFamily: 'monospace',
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    onExportVideo()
                    onClose()
                  }}
                  disabled={exporting}
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: '#000',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '0.85rem',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: exporting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 0 20px rgba(245, 158, 11, 0.4)',
                  }}
                >
                  <span>⚡</span>
                  <span>{exporting ? `Exporting ${exportProgress}%` : 'Download MP4 Reel'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onShareReel()
                    onClose()
                  }}
                  disabled={exporting}
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#000',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '0.85rem',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: exporting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)',
                  }}
                >
                  <span>📲</span>
                  <span>Direct Social Share</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Navigation */}
        <div style={{ padding: '1rem 1.5rem', background: 'rgba(0,0,0,0.4)', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              ← Back
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={() => {
                if (step === 1) handleNextStep1()
                else setStep(3)
              }}
              disabled={loadingAyahs}
              style={{
                background: '#f59e0b',
                color: '#000',
                border: 'none',
                padding: '0.5rem 1.25rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: loadingAyahs ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              {loadingAyahs ? 'Loading Ayahs…' : 'Continue to Next Step →'}
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              Open in Full Studio Editor ➔
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
