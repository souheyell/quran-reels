import { AUDIO_CDN, AUDIO_PROXY_PREFIX } from '../env'

export function proxyAudioUrl(audioUrl: string | null | undefined): string | null {
  if (!audioUrl) return null
  if (audioUrl.startsWith(AUDIO_PROXY_PREFIX + '/')) return audioUrl
  if (audioUrl.startsWith(AUDIO_CDN)) {
    return `${AUDIO_PROXY_PREFIX}/${audioUrl.slice(AUDIO_CDN.length + 1)}`
  }
  return audioUrl
}

export function getDirectAudioUrl(audioUrl: string | null | undefined): string | null {
  if (!audioUrl) return null
  if (audioUrl.startsWith(AUDIO_PROXY_PREFIX + '/')) {
    return `${AUDIO_CDN}/${audioUrl.slice(AUDIO_PROXY_PREFIX.length + 1)}`
  }
  return audioUrl
}

export function loadAudioDuration(url: string | null): Promise<number | null> {
  if (!url) return Promise.resolve(null)
  const proxied = proxyAudioUrl(url)
  const direct = getDirectAudioUrl(url)

  return new Promise((resolve) => {
    const audio = new Audio()
    audio.preload = 'metadata'
    let resolved = false

    const finish = (dur: number | null) => {
      if (resolved) return
      resolved = true
      clearTimeout(timer)
      audio.onloadedmetadata = null
      audio.onerror = null
      audio.src = ''
      resolve(dur)
    }

    const timer = setTimeout(() => finish(null), 2500)

    audio.onloadedmetadata = () => {
      const dur = Number.isFinite(audio.duration) && audio.duration > 0
        ? audio.duration * 1000
        : null
      finish(dur)
    }

    audio.onerror = () => {
      // If proxied failed, try direct CDN URL as fallback
      if (direct && audio.src !== direct) {
        audio.src = direct
        audio.load()
        return
      }
      finish(null)
    }

    audio.src = proxied || url
    audio.load()
  })
}

export function loadAudioDurations(urls: (string | null)[]): Promise<(number | null)[]> {
  return Promise.all(urls.map(loadAudioDuration))
}

export function fillMissingDurations(
  durations: (number | null)[],
  fallbackMs: number,
): number[] {
  return durations.map((d) => (d === null ? fallbackMs : d))
}
