import { useReducer, useCallback } from 'react'
import type { ReelConfig, ConfigAction } from '../types'
import { defaultConfig } from '../renderer/reelRenderer'

function configReducer(state: ReelConfig, action: ConfigAction): ReelConfig {
  switch (action.type) {
    case 'SET_VERSES':
      return { ...state, verses: action.verses }
    case 'SET_BACKGROUND_URL':
      return { ...state, background: { ...state.background, url: action.url } }
    case 'SET_BACKGROUND_FIT':
      return { ...state, background: { ...state.background, fit: action.fit } }
    case 'SET_OVERLAY_COLOR':
      return { ...state, overlay: { ...state.overlay, color: action.color } }
    case 'SET_OVERLAY_OPACITY':
      return { ...state, overlay: { ...state.overlay, opacity: action.opacity } }
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
  }
}

export function useReelConfig() {
  const [config, dispatch] = useReducer(configReducer, null, defaultConfig)

  const setVerses = useCallback(
    (verses: ReelConfig['verses']) => dispatch({ type: 'SET_VERSES', verses }),
    [],
  )
  const setBackgroundUrl = useCallback(
    (url: string) => dispatch({ type: 'SET_BACKGROUND_URL', url }),
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

  return {
    config,
    dispatch,
    setVerses,
    setBackgroundUrl,
    setBackgroundFit,
    setOverlayColor,
    setOverlayOpacity,
    setArabicFont,
    setArabicSize,
    setTranslationFont,
    setTranslationSize,
    setTextPosition,
    setTextColor,
    setShowGlow,
    setShowTranslation,
    setSurahHeaderPosition,
    setFooterEnabled,
    setFooterText,
    setFooterIcon,
    setFooterOpacity,
    setFooterFontSize,
    setMotionType,
    setDuration,
    setAspectRatio,
  }
}
