export interface Verse {
  surah: number
  ayat: number
  surahName: string
  surahArabicName?: string
  arabic: string
  translation: string
  secondaryTranslation?: string
  editionId: string
  editionName: string
  secondaryEditionId?: string
  secondaryEditionName?: string
  reciterId?: string
  reciterName?: string
  audioUrl: string | null
}

export interface BackgroundImage {
  url: string
  thumb: string
  alt: string
}

export type AtmosphericEffectType =
  | 'none'
  | 'fireflies'
  | 'slow-snow'
  | 'dust-motes'
  | 'stars'
  | 'gentle-rain'

export type BorderType =
  | 'none'
  | 'gilded-corners'
  | 'islamic-geometric'
  | 'royal-arch'
  | 'vignette-feather'

export type WaveformType =
  | 'none'
  | 'symmetric-bars'
  | 'smooth-wave'
  | 'pulse-line'
  | 'dots-matrix'

export type TextLayoutMode = 'calligraphy-overlay' | 'mushaf-page' | 'holy-quran-paper'
export type MushafTheme =
  | 'obsidian-gold'
  | 'madani-parchment'
  | 'emerald-noor'
  | 'madani-cream'
  | 'vintage-parchment'
  | 'royal-ivory'

export interface CustomFontItem {
  id: string
  name: string
  family: string
  dataUrl: string
  target: 'arabic' | 'translation'
  createdAt: number
}

export interface ReelConfig {
  verses: Verse[]
  background: {
    url: string
    fit: 'cover-crop' | 'blur-fill'
    mediaType?: 'image' | 'video'
    vaultMediaId?: string
  }
  overlay: {
    color: string
    opacity: number
  }
  effects: {
    type: AtmosphericEffectType
    intensity: number
    speed: number
  }
  border: {
    type: BorderType
    color: string
    opacity: number
  }
  waveform: {
    type: WaveformType
    color: string
    opacity: number
  }
  text: {
    arabicFont: string
    arabicSize: number
    translationFont: string
    translationSize: number
    textPosition: 'center' | 'lower-third'
    textColor: string
    showGlow: boolean
    showTranslation: boolean
    surahHeaderPosition: 'top' | 'bottom' | 'none'
    surahNameLanguage: 'arabic' | 'english' | 'both'
    ayahPauseDelay: number
    showBasmalah: boolean
    karaokeHighlight: boolean
    highlightColor: string
    secondaryEditionId: string
    showReflectionCard?: boolean
    reflectionText?: string
    layoutMode?: TextLayoutMode
    mushafTheme?: MushafTheme
    mushafGlowIntensity?: number
  }
  countdown: CountdownConfig
  footer: {
    enabled: boolean
    text: string
    icon: 'none' | 'instagram' | 'tiktok' | 'youtube' | 'copyright'
    opacity: number
    fontSize: number
  }
  motion: {
    type:
      | 'kenburns-zoom'
      | 'kenburns-zoom-out'
      | 'kenburns-pan'
      | 'kenburns-drift-up'
      | 'kenburns-drift-diagonal'
      | 'kenburns-pulse'
      | 'static'
    duration: number
  }
  aspectRatio: '9:16' | '1:1' | '16:9'
}

export type ExportQualityPreset =
  | 'instagram-fb'
  | 'smooth-60fps'
  | '4k-master'
  | 'compact'

export interface ExportOptions {
  preset?: ExportQualityPreset
  fps?: number
  bitrate?: number
  audioBitrate?: number
  scale?: number
}

export const EXPORT_PRESETS_CONFIG: Record<
  ExportQualityPreset,
  {
    id: ExportQualityPreset
    label: string
    resolutionLabel: string
    fps: number
    bitrate: number
    audioBitrate: number
    scale: number
    badge: string
    description: string
  }
> = {
  'instagram-fb': {
    id: 'instagram-fb',
    label: 'Instagram & FB Reels (Recommended)',
    resolutionLabel: '1080p (Native HD)',
    fps: 30,
    bitrate: 10_000_000, // 10 Mbps
    audioBitrate: 320_000, // 320 kbps AAC
    scale: 1,
    badge: 'Best for Socials',
    description: '30 FPS · 10 Mbps · 320k Audio · Optimized for Instagram & FB algorithms',
  },
  'smooth-60fps': {
    id: 'smooth-60fps',
    label: 'Smooth 60 FPS (Cinematic)',
    resolutionLabel: '1080p (60 FPS)',
    fps: 60,
    bitrate: 14_000_000, // 14 Mbps
    audioBitrate: 320_000, // 320 kbps AAC
    scale: 1,
    badge: 'Ultra Fluid',
    description: '60 FPS · 14 Mbps · 320k Audio · Ultra smooth motion and particles',
  },
  '4k-master': {
    id: '4k-master',
    label: '4K Ultra HD Master',
    resolutionLabel: '2160x3840 (4K Master)',
    fps: 30,
    bitrate: 30_000_000, // 30 Mbps
    audioBitrate: 320_000, // 320 kbps AAC
    scale: 2,
    badge: 'Max Quality',
    description: '4K Master · 30 Mbps · 320k Audio · Maximum archival fidelity',
  },
  'compact': {
    id: 'compact',
    label: 'Compact Share (Fast)',
    resolutionLabel: '1080p (Fast Share)',
    fps: 30,
    bitrate: 6_000_000, // 6 Mbps
    audioBitrate: 192_000, // 192 kbps AAC
    scale: 1,
    badge: 'Small File',
    description: '30 FPS · 6 Mbps · 192k Audio · Fast export for WhatsApp & Telegram',
  },
}

export type CountdownStyle =
  | 'none'
  | 'glowing-ring'
  | 'top-bar'
  | 'digital-pill'
  | 'minimal-clock'

export interface CountdownConfig {
  enabled: boolean
  style: CountdownStyle
  position: 'top' | 'top-right' | 'top-left' | 'bottom'
  color: string
  showTotalTime: boolean
  opacity: number
}

export interface Edition {
  id: string
  name: string
  language: string
}

export type ReciterCategory = 'golden-age' | 'haramain' | 'contemporary' | 'mujawwad' | 'warsh' | 'custom'

export interface Reciter {
  id: string
  name: string
  arabicName?: string
  subfolder?: string
  category?: ReciterCategory
  style?: string
  bitrate?: string
  country?: string
  isCustom?: boolean
}

export const ARABIC_EDITION_ID = 'quran-uthmani'

// ── Config reducer actions ──────────────────────────────────────────────

export type ConfigAction =
  | { type: 'SET_VERSES'; verses: Verse[] }
  | { type: 'SET_BACKGROUND_URL'; url: string; mediaType?: 'image' | 'video'; vaultMediaId?: string }
  | { type: 'SET_BACKGROUND_FIT'; fit: ReelConfig['background']['fit'] }
  | { type: 'SET_OVERLAY_COLOR'; color: string }
  | { type: 'SET_OVERLAY_OPACITY'; opacity: number }
  | { type: 'SET_EFFECT_TYPE'; effectType: AtmosphericEffectType }
  | { type: 'SET_EFFECT_INTENSITY'; intensity: number }
  | { type: 'SET_EFFECT_SPEED'; speed: number }
  | { type: 'SET_BORDER_TYPE'; borderType: BorderType }
  | { type: 'SET_BORDER_COLOR'; color: string }
  | { type: 'SET_BORDER_OPACITY'; opacity: number }
  | { type: 'SET_WAVEFORM_TYPE'; waveformType: WaveformType }
  | { type: 'SET_WAVEFORM_COLOR'; color: string }
  | { type: 'SET_WAVEFORM_OPACITY'; opacity: number }
  | { type: 'SET_ARABIC_FONT'; font: string }
  | { type: 'SET_ARABIC_SIZE'; size: number }
  | { type: 'SET_TRANSLATION_FONT'; font: string }
  | { type: 'SET_TRANSLATION_SIZE'; size: number }
  | { type: 'SET_TEXT_POSITION'; position: ReelConfig['text']['textPosition'] }
  | { type: 'SET_TEXT_COLOR'; color: string }
  | { type: 'SET_SHOW_GLOW'; show: boolean }
  | { type: 'SET_SHOW_TRANSLATION'; show: boolean }
  | { type: 'SET_SURAH_HEADER_POSITION'; position: ReelConfig['text']['surahHeaderPosition'] }
  | { type: 'SET_SURAH_NAME_LANGUAGE'; language: ReelConfig['text']['surahNameLanguage'] }
  | { type: 'SET_AYAH_PAUSE_DELAY'; delay: number }
  | { type: 'SET_SHOW_BASMALAH'; show: boolean }
  | { type: 'SET_KARAOKE_HIGHLIGHT'; enabled: boolean }
  | { type: 'SET_HIGHLIGHT_COLOR'; color: string }
  | { type: 'SET_SECONDARY_EDITION_ID'; editionId: string }
  | { type: 'SET_SHOW_REFLECTION_CARD'; show: boolean }
  | { type: 'SET_REFLECTION_TEXT'; text: string }
  | { type: 'SET_COUNTDOWN_ENABLED'; enabled: boolean }
  | { type: 'SET_COUNTDOWN_STYLE'; style: CountdownStyle }
  | { type: 'SET_COUNTDOWN_POSITION'; position: CountdownConfig['position'] }
  | { type: 'SET_COUNTDOWN_COLOR'; color: string }
  | { type: 'SET_COUNTDOWN_SHOW_TOTAL'; showTotal: boolean }
  | { type: 'SET_COUNTDOWN_OPACITY'; opacity: number }
  | { type: 'SET_FOOTER_ENABLED'; enabled: boolean }
  | { type: 'SET_FOOTER_TEXT'; text: string }
  | { type: 'SET_FOOTER_ICON'; icon: ReelConfig['footer']['icon'] }
  | { type: 'SET_FOOTER_OPACITY'; opacity: number }
  | { type: 'SET_FOOTER_FONT_SIZE'; fontSize: number }
  | { type: 'SET_MOTION_TYPE'; motionType: ReelConfig['motion']['type'] }
  | { type: 'SET_DURATION'; duration: number }
  | { type: 'SET_ASPECT_RATIO'; ratio: ReelConfig['aspectRatio'] }
  | { type: 'SET_LAYOUT_MODE'; mode: TextLayoutMode }
  | { type: 'SET_MUSHAF_THEME'; theme: MushafTheme }
  | { type: 'SET_MUSHAF_GLOW_INTENSITY'; intensity: number }
  | { type: 'APPLY_PRESET'; preset: Partial<ReelConfig> }
