export interface Verse {
  surah: number
  ayat: number
  surahName: string
  surahArabicName?: string
  arabic: string
  translation: string
  editionId: string
  editionName: string
  reciterId?: string
  reciterName?: string
  audioUrl: string | null
}

export interface Reciter {
  id: string
  name: string
}

export interface BackgroundImage {
  url: string
  thumb: string
  alt: string
}

export interface ReelConfig {
  verses: Verse[]
  background: {
    url: string
    fit: 'cover-crop' | 'blur-fill'
  }
  overlay: {
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
  }
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

export interface Edition {
  id: string
  name: string
  language: string
}

export const ARABIC_EDITION_ID = 'quran-uthmani'

// ── Config reducer actions ──────────────────────────────────────────────

export type ConfigAction =
  | { type: 'SET_VERSES'; verses: Verse[] }
  | { type: 'SET_BACKGROUND_URL'; url: string }
  | { type: 'SET_BACKGROUND_FIT'; fit: ReelConfig['background']['fit'] }
  | { type: 'SET_OVERLAY_COLOR'; color: string }
  | { type: 'SET_OVERLAY_OPACITY'; opacity: number }
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
  | { type: 'SET_FOOTER_ENABLED'; enabled: boolean }
  | { type: 'SET_FOOTER_TEXT'; text: string }
  | { type: 'SET_FOOTER_ICON'; icon: ReelConfig['footer']['icon'] }
  | { type: 'SET_FOOTER_OPACITY'; opacity: number }
  | { type: 'SET_FOOTER_FONT_SIZE'; fontSize: number }
  | { type: 'SET_MOTION_TYPE'; motionType: ReelConfig['motion']['type'] }
  | { type: 'SET_DURATION'; duration: number }
  | { type: 'SET_ASPECT_RATIO'; ratio: ReelConfig['aspectRatio'] }
