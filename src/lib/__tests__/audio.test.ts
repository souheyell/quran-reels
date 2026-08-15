import { describe, expect, it } from 'vitest'
import { proxyAudioUrl } from '../audio'

describe('proxyAudioUrl', () => {
  it('returns null for empty input', () => {
    expect(proxyAudioUrl(null)).toBeNull()
    expect(proxyAudioUrl(undefined)).toBeNull()
  })

  it('rewrites the CDN URL to a same-origin proxy path', () => {
    const url = 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/262.mp3'
    expect(proxyAudioUrl(url)).toBe('/quran-audio/128/ar.alafasy/262.mp3')
  })

  it('leaves an already-proxied path unchanged', () => {
    expect(proxyAudioUrl('/quran-audio/128/ar.alafasy/262.mp3')).toBe(
      '/quran-audio/128/ar.alafasy/262.mp3',
    )
  })

  it('passes through unrelated URLs untouched', () => {
    expect(proxyAudioUrl('https://example.com/x.mp3')).toBe('https://example.com/x.mp3')
  })
})
