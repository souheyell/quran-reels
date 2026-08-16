import { useReducer, useCallback, useEffect } from 'react'
import type {
  ReelConfig,
  ConfigAction,
  AtmosphericEffectType,
  BorderType,
  WaveformType,
} from '../types'
import { loadSavedConfig, saveConfig } from '../lib/storage'
import { applyPresetToConfig, type ReelPreset } from '../lib/presets'

function configReducer(state: ReelConfig, action: ConfigAction): ReelConfig {
  switch (action.type) {
    case 'SET_VERSES':
      return { ...state, verses: action.verses }
    case 'SET_BACKGROUND_URL':
      return {
        ...state,
        background: {
          ...state.background,
          url: action.url,
          mediaType: action.mediaType ?? state.background.mediaType,
        },
      }
    case 'SET_BACKGROUND_FIT':
      return { ...state, background: { ...state.background, fit: action.fit } }
    case 'SET_OVERLAY_COLOR':
      return { ...state, overlay: { ...state.overlay, color: action.color } }
    case 'SET_OVERLAY_OPACITY':
      return { ...state, overlay: { ...state.overlay, opacity: action.opacity } }
    case 'SET_EFFECT_TYPE':
      return { ...state, effects: { ...state.effects, type: action.effectType } }
    case 'SET_EFFECT_INTENSITY':
      return { ...state, effects: { ...state.effects, intensity: action.intensity } }
    case 'SET_EFFECT_SPEED':
      return { ...state, effects: { ...state.effects, speed: action.speed } }
    case 'SET_BORDER_TYPE':
      return { ...state, border: { ...state.border, type: action.borderType } }
    case 'SET_BORDER_COLOR':
      return { ...state, border: { ...state.border, color: action.color } }
    case 'SET_BORDER_OPACITY':
      return { ...state, border: { ...state.border, opacity: action.opacity } }
    case 'SET_WAVEFORM_TYPE':
      return { ...state, waveform: { ...state.waveform, type: action.waveformType } }
    case 'SET_WAVEFORM_COLOR':
      return { ...state, waveform: { ...state.waveform, color: action.color } }
    case 'SET_WAVEFORM_OPACITY':
      return { ...state, waveform: { ...state.waveform, opacity: action.opacity } }
    case 'SET_ARABIC_FONT':
      return { ...state, text: { ...state.text, arabicFont: action.font } }
    case 'SET_ARABIC_SIZE':
      return { ...state, text: { ...state.text, arabicSize: action.size } }
    case 'SET_TRANSLATION_FONT':
      return { ...state, text: { ...state.text, translationFont: action.font } }
    case 'SET_TRANSLATION_SIZE':
      return { ...state, text: { ...state.text, translationSize: action.size } }
    case 'SET_TEXT_POSITION':
      return { ...state, text: { ...state.text, textPosition: action.position } }
    case 'SET_TEXT_COLOR':
      return { ...state, text: { ...state.text, textColor: action.color } }
    case 'SET_SHOW_GLOW':
      return { ...state, text: { ...state.text, showGlow: action.show } }
    case 'SET_SHOW_TRANSLATION':
      return { ...state, text: { ...state.text, showTranslation: action.show } }
    case 'SET_SURAH_HEADER_POSITION':
      return { ...state, text: { ...state.text, surahHeaderPosition: action.position } }
    case 'SET_SURAH_NAME_LANGUAGE':
      return { ...state, text: { ...state.text, surahNameLanguage: action.language } }
    case 'SET_AYAH_PAUSE_DELAY':
      return { ...state, text: { ...state.text, ayahPauseDelay: action.delay } }
    case 'SET_SHOW_BASMALAH':
      return { ...state, text: { ...state.text, showBasmalah: action.show } }
    case 'SET_KARAOKE_HIGHLIGHT':
      return { ...state, text: { ...state.text, karaokeHighlight: action.enabled } }
    case 'SET_HIGHLIGHT_COLOR':
      return { ...state, text: { ...state.text, highlightColor: action.color } }
    case 'SET_SECONDARY_EDITION_ID':
      return { ...state, text: { ...state.text, secondaryEditionId: action.editionId } }
    case 'SET_FOOTER_ENABLED':
      return { ...state, footer: { ...state.footer, enabled: action.enabled } }
    case 'SET_FOOTER_TEXT':
      return { ...state, footer: { ...state.footer, text: action.text } }
    case 'SET_FOOTER_ICON':
      return { ...state, footer: { ...state.footer, icon: action.icon } }
    case 'SET_FOOTER_OPACITY':
      return { ...state, footer: { ...state.footer, opacity: action.opacity } }
    case 'SET_FOOTER_FONT_SIZE':
      return { ...state, footer: { ...state.footer, fontSize: action.fontSize } }
    case 'SET_MOTION_TYPE':
      return { ...state, motion: { ...state.motion, type: action.motionType } }
    case 'SET_DURATION':
      return { ...state, motion: { ...state.motion, duration: action.duration } }
    case 'SET_ASPECT_RATIO':
      return { ...state, aspectRatio: action.ratio }
    case 'APPLY_PRESET':
      return {
        ...state,
        ...action.preset,
        background: {
          ...state.background,
          ...action.preset.background,
        },
        overlay: {
          ...state.overlay,
          ...action.preset.overlay,
        },
        effects: {
          ...state.effects,
          ...action.preset.effects,
        },
        border: {
          ...state.border,
          ...action.preset.border,
        },
        waveform: {
          ...state.waveform,
          ...action.preset.waveform,
        },
        text: {
          ...state.text,
          ...action.preset.text,
        },
        motion: {
          ...state.motion,
          ...action.preset.motion,
        },
      }
  }
}

export function useReelConfig() {
  const [config, dispatch] = useReducer(configReducer, null, loadSavedConfig)

  // Automatically persist config to localStorage on every change
  useEffect(() => {
    saveConfig(config)
  }, [config])

  const setVerses = useCallback(
    (verses: ReelConfig['verses']) => dispatch({ type: 'SET_VERSES', verses }),
    [],
  )
  const setBackgroundUrl = useCallback(
    (url: string, mediaType?: 'image' | 'video') =>
      dispatch({ type: 'SET_BACKGROUND_URL', url, mediaType }),
    [],
  )
  const setBackgroundFit = useCallback(
    (fit: ReelConfig['background']['fit']) => dispatch({ type: 'SET_BACKGROUND_FIT', fit }),
    [],
  )
  const setOverlayColor = useCallback(
    (color: string) => dispatch({ type: 'SET_OVERLAY_COLOR', color }),
    [],
  )
  const setOverlayOpacity = useCallback(
    (opacity: number) => dispatch({ type: 'SET_OVERLAY_OPACITY', opacity }),
    [],
  )
  const setEffectType = useCallback(
    (effectType: AtmosphericEffectType) => dispatch({ type: 'SET_EFFECT_TYPE', effectType }),
    [],
  )
  const setEffectIntensity = useCallback(
    (intensity: number) => dispatch({ type: 'SET_EFFECT_INTENSITY', intensity }),
    [],
  )
  const setEffectSpeed = useCallback(
    (speed: number) => dispatch({ type: 'SET_EFFECT_SPEED', speed }),
    [],
  )
  const setBorderType = useCallback(
    (borderType: BorderType) => dispatch({ type: 'SET_BORDER_TYPE', borderType }),
    [],
  )
  const setBorderColor = useCallback(
    (color: string) => dispatch({ type: 'SET_BORDER_COLOR', color }),
    [],
  )
  const setBorderOpacity = useCallback(
    (opacity: number) => dispatch({ type: 'SET_BORDER_OPACITY', opacity }),
    [],
  )
  const setWaveformType = useCallback(
    (waveformType: WaveformType) => dispatch({ type: 'SET_WAVEFORM_TYPE', waveformType }),
    [],
  )
  const setWaveformColor = useCallback(
    (color: string) => dispatch({ type: 'SET_WAVEFORM_COLOR', color }),
    [],
  )
  const setWaveformOpacity = useCallback(
    (opacity: number) => dispatch({ type: 'SET_WAVEFORM_OPACITY', opacity }),
    [],
  )
  const setArabicFont = useCallback(
    (font: string) => dispatch({ type: 'SET_ARABIC_FONT', font }),
    [],
  )
  const setArabicSize = useCallback(
    (size: number) => dispatch({ type: 'SET_ARABIC_SIZE', size }),
    [],
  )
  const setTranslationFont = useCallback(
    (font: string) => dispatch({ type: 'SET_TRANSLATION_FONT', font }),
    [],
  )
  const setTranslationSize = useCallback(
    (size: number) => dispatch({ type: 'SET_TRANSLATION_SIZE', size }),
    [],
  )
  const setTextPosition = useCallback(
    (position: ReelConfig['text']['textPosition']) =>
      dispatch({ type: 'SET_TEXT_POSITION', position }),
    [],
  )
  const setTextColor = useCallback(
    (color: string) => dispatch({ type: 'SET_TEXT_COLOR', color }),
    [],
  )
  const setShowGlow = useCallback(
    (show: boolean) => dispatch({ type: 'SET_SHOW_GLOW', show }),
    [],
  )
  const setShowTranslation = useCallback(
    (show: boolean) => dispatch({ type: 'SET_SHOW_TRANSLATION', show }),
    [],
  )
  const setSurahHeaderPosition = useCallback(
    (position: ReelConfig['text']['surahHeaderPosition']) =>
      dispatch({ type: 'SET_SURAH_HEADER_POSITION', position }),
    [],
  )
  const setSurahNameLanguage = useCallback(
    (language: ReelConfig['text']['surahNameLanguage']) =>
      dispatch({ type: 'SET_SURAH_NAME_LANGUAGE', language }),
    [],
  )
  const setAyahPauseDelay = useCallback(
    (delay: number) => dispatch({ type: 'SET_AYAH_PAUSE_DELAY', delay }),
    [],
  )
  const setShowBasmalah = useCallback(
    (show: boolean) => dispatch({ type: 'SET_SHOW_BASMALAH', show }),
    [],
  )
  const setKaraokeHighlight = useCallback(
    (enabled: boolean) => dispatch({ type: 'SET_KARAOKE_HIGHLIGHT', enabled }),
    [],
  )
  const setHighlightColor = useCallback(
    (color: string) => dispatch({ type: 'SET_HIGHLIGHT_COLOR', color }),
    [],
  )
  const setSecondaryEditionId = useCallback(
    (editionId: string) => dispatch({ type: 'SET_SECONDARY_EDITION_ID', editionId }),
    [],
  )
  const setFooterEnabled = useCallback(
    (enabled: boolean) => dispatch({ type: 'SET_FOOTER_ENABLED', enabled }),
    [],
  )
  const setFooterText = useCallback(
    (text: string) => dispatch({ type: 'SET_FOOTER_TEXT', text }),
    [],
  )
  const setFooterIcon = useCallback(
    (icon: ReelConfig['footer']['icon']) => dispatch({ type: 'SET_FOOTER_ICON', icon }),
    [],
  )
  const setFooterOpacity = useCallback(
    (opacity: number) => dispatch({ type: 'SET_FOOTER_OPACITY', opacity }),
    [],
  )
  const setFooterFontSize = useCallback(
    (fontSize: number) => dispatch({ type: 'SET_FOOTER_FONT_SIZE', fontSize }),
    [],
  )
  const setMotionType = useCallback(
    (motionType: ReelConfig['motion']['type']) =>
      dispatch({ type: 'SET_MOTION_TYPE', motionType }),
    [],
  )
  const setDuration = useCallback(
    (duration: number) => dispatch({ type: 'SET_DURATION', duration }),
    [],
  )
  const setAspectRatio = useCallback(
    (ratio: ReelConfig['aspectRatio']) => dispatch({ type: 'SET_ASPECT_RATIO', ratio }),
    [],
  )
  const applyPreset = useCallback(
    (preset: ReelPreset) => {
      const updated = applyPresetToConfig(config, preset)
      dispatch({ type: 'APPLY_PRESET', preset: updated })
    },
    [config],
  )

  return {
    config,
    dispatch,
    setVerses,
    setBackgroundUrl,
    setBackgroundFit,
    setOverlayColor,
    setOverlayOpacity,
    setEffectType,
    setEffectIntensity,
    setEffectSpeed,
    setBorderType,
    setBorderColor,
    setBorderOpacity,
    setWaveformType,
    setWaveformColor,
    setWaveformOpacity,
    setArabicFont,
    setArabicSize,
    setTranslationFont,
    setTranslationSize,
    setTextPosition,
    setTextColor,
    setShowGlow,
    setShowTranslation,
    setSurahHeaderPosition,
    setSurahNameLanguage,
    setAyahPauseDelay,
    setShowBasmalah,
    setKaraokeHighlight,
    setHighlightColor,
    setSecondaryEditionId,
    setFooterEnabled,
    setFooterText,
    setFooterIcon,
    setFooterOpacity,
    setFooterFontSize,
    setMotionType,
    setDuration,
    setAspectRatio,
    applyPreset,
  }
}
