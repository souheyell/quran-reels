import type { ReelConfig } from '../types'
import { getImagesForCategory, type StockCategory } from '../api/unsplash'

export interface ReelPreset {
  id: string
  name: string
  icon: string
  description: string
  category: StockCategory
  config: Partial<ReelConfig>
}

export const AESTHETIC_PRESETS: ReelPreset[] = [
  {
    id: 'golden-medina',
    name: 'Golden Medina',
    icon: '🌟',
    description: 'Amber calligraphy, glowing fireflies, gilded arabesque frame, spectrum bars',
    category: 'Mosques & Holy Sites',
    config: {
      text: {
        arabicFont: '"Scheherazade New", serif',
        arabicSize: 74,
        translationFont: '"Inter", sans-serif',
        translationSize: 38,
        textPosition: 'center',
        textColor: '#ffd700',
        showGlow: true,
        showTranslation: true,
        surahHeaderPosition: 'top',
        surahNameLanguage: 'arabic',
        ayahPauseDelay: 1.6,
        showBasmalah: true,
        karaokeHighlight: true,
        highlightColor: '#fff8db',
        secondaryEditionId: 'none',
      },
      overlay: {
        color: '#0f0700',
        opacity: 0.38,
      },
      effects: {
        type: 'fireflies',
        intensity: 0.75,
        speed: 1.0,
      },
      border: {
        type: 'gilded-corners',
        color: '#ffd700',
        opacity: 0.8,
      },
      waveform: {
        type: 'symmetric-bars',
        color: '#ffd700',
        opacity: 0.75,
      },
      motion: {
        type: 'kenburns-zoom',
        duration: 15,
      },
    },
  },
  {
    id: 'midnight-reflection',
    name: 'Midnight Reflection',
    icon: '🌌',
    description: 'Cyan glow, Amiri Quran font, gentle snow, vignette, glowing wave',
    category: 'Cosmos & Galaxies',
    config: {
      text: {
        arabicFont: '"Amiri Quran", "Amiri", serif',
        arabicSize: 76,
        translationFont: '"Inter", sans-serif',
        translationSize: 38,
        textPosition: 'center',
        textColor: '#e0f7fa',
        showGlow: true,
        showTranslation: true,
        surahHeaderPosition: 'top',
        surahNameLanguage: 'arabic',
        ayahPauseDelay: 1.6,
        showBasmalah: true,
        karaokeHighlight: true,
        highlightColor: '#80deea',
        secondaryEditionId: 'none',
      },
      overlay: {
        color: '#020b14',
        opacity: 0.45,
      },
      effects: {
        type: 'slow-snow',
        intensity: 0.7,
        speed: 0.9,
      },
      border: {
        type: 'vignette-feather',
        color: '#80deea',
        opacity: 0.85,
      },
      waveform: {
        type: 'smooth-wave',
        color: '#80deea',
        opacity: 0.8,
      },
      motion: {
        type: 'kenburns-pan',
        duration: 15,
      },
    },
  },
  {
    id: 'sacred-grove',
    name: 'Sacred Grove',
    icon: '🌿',
    description: 'Crisp white Naskh, sunbeam dust motes, misty redwood forest, pulse line',
    category: 'Forests & Redwoods',
    config: {
      text: {
        arabicFont: '"Noto Naskh Arabic", serif',
        arabicSize: 72,
        translationFont: '"Inter", sans-serif',
        translationSize: 38,
        textPosition: 'center',
        textColor: '#ffffff',
        showGlow: true,
        showTranslation: true,
        surahHeaderPosition: 'top',
        surahNameLanguage: 'arabic',
        ayahPauseDelay: 1.6,
        showBasmalah: true,
        karaokeHighlight: true,
        highlightColor: '#fef08a',
        secondaryEditionId: 'none',
      },
      overlay: {
        color: '#051008',
        opacity: 0.35,
      },
      effects: {
        type: 'dust-motes',
        intensity: 0.65,
        speed: 1.0,
      },
      border: {
        type: 'none',
        color: '#ffffff',
        opacity: 0.7,
      },
      waveform: {
        type: 'pulse-line',
        color: '#fef08a',
        opacity: 0.7,
      },
      motion: {
        type: 'kenburns-drift-up',
        duration: 15,
      },
    },
  },
  {
    id: 'royal-cordoba',
    name: 'Royal Cordoba',
    icon: '👑',
    description: 'Majestic Reem Kufi calligraphy, Moorish royal arch, starry dots matrix',
    category: 'Mosques & Holy Sites',
    config: {
      text: {
        arabicFont: '"Reem Kufi", serif',
        arabicSize: 70,
        translationFont: '"Georgia", serif',
        translationSize: 38,
        textPosition: 'center',
        textColor: '#fef3c7',
        showGlow: true,
        showTranslation: true,
        surahHeaderPosition: 'top',
        surahNameLanguage: 'both',
        ayahPauseDelay: 1.6,
        showBasmalah: true,
        karaokeHighlight: true,
        highlightColor: '#fde047',
        secondaryEditionId: 'none',
      },
      overlay: {
        color: '#180800',
        opacity: 0.42,
      },
      effects: {
        type: 'stars',
        intensity: 0.8,
        speed: 1.1,
      },
      border: {
        type: 'royal-arch',
        color: '#fde047',
        opacity: 0.85,
      },
      waveform: {
        type: 'dots-matrix',
        color: '#fde047',
        opacity: 0.75,
      },
      motion: {
        type: 'kenburns-drift-diagonal',
        duration: 15,
      },
    },
  },
  {
    id: 'desert-twilight',
    name: 'Desert Twilight',
    icon: '🏜️',
    description: 'Warm sand glow, Tajawal font, Andalusian geometric frame, spectrum bars',
    category: 'Deserts & Dunes',
    config: {
      text: {
        arabicFont: '"Tajawal", sans-serif',
        arabicSize: 74,
        translationFont: '"Inter", sans-serif',
        translationSize: 38,
        textPosition: 'center',
        textColor: '#ffedd5',
        showGlow: true,
        showTranslation: true,
        surahHeaderPosition: 'top',
        surahNameLanguage: 'arabic',
        ayahPauseDelay: 1.6,
        showBasmalah: true,
        karaokeHighlight: true,
        highlightColor: '#fdba74',
        secondaryEditionId: 'none',
      },
      overlay: {
        color: '#1c0d02',
        opacity: 0.35,
      },
      effects: {
        type: 'dust-motes',
        intensity: 0.7,
        speed: 0.9,
      },
      border: {
        type: 'islamic-geometric',
        color: '#fdba74',
        opacity: 0.75,
      },
      waveform: {
        type: 'symmetric-bars',
        color: '#fdba74',
        opacity: 0.7,
      },
      motion: {
        type: 'kenburns-pulse',
        duration: 15,
      },
    },
  },
  {
    id: 'minimalist-dark',
    name: 'Minimalist Dark',
    icon: '🖤',
    description: 'Sleek monochrome, modern Cairo font, lower-third layout',
    category: 'Mosques & Holy Sites',
    config: {
      text: {
        arabicFont: '"Cairo", sans-serif',
        arabicSize: 68,
        translationFont: '"Inter", sans-serif',
        translationSize: 36,
        textPosition: 'lower-third',
        textColor: '#ffffff',
        showGlow: false,
        showTranslation: true,
        surahHeaderPosition: 'top',
        surahNameLanguage: 'english',
        ayahPauseDelay: 1.4,
        showBasmalah: false,
        karaokeHighlight: false,
        highlightColor: '#ffffff',
        secondaryEditionId: 'none',
      },
      overlay: {
        color: '#000000',
        opacity: 0.58,
      },
      effects: {
        type: 'none',
        intensity: 0,
        speed: 1,
      },
      border: {
        type: 'none',
        color: '#ffffff',
        opacity: 0.5,
      },
      waveform: {
        type: 'none',
        color: '#ffffff',
        opacity: 0.5,
      },
      motion: {
        type: 'static',
        duration: 15,
      },
    },
  },
]

/**
 * Apply a preset to a current ReelConfig, keeping current verses.
 */
export function applyPresetToConfig(current: ReelConfig, preset: ReelPreset): ReelConfig {
  const images = getImagesForCategory(preset.category)
  const bgUrl = images[0]?.full || current.background.url

  return {
    ...current,
    background: {
      ...current.background,
      url: bgUrl,
    },
    overlay: {
      ...current.overlay,
      ...preset.config.overlay,
    },
    effects: {
      ...current.effects,
      ...preset.config.effects,
    },
    border: {
      ...current.border,
      ...preset.config.border,
    },
    waveform: {
      ...current.waveform,
      ...preset.config.waveform,
    },
    text: {
      ...current.text,
      ...preset.config.text,
    },
    motion: {
      ...current.motion,
      ...preset.config.motion,
    },
  }
}
