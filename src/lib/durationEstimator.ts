import { ALL_RECITERS } from '../api/quran'
import type { BulkItem } from './bulkPacks'

/**
 * Average duration in seconds per ayah for each Surah group in the Quran.
 * Derived from classical Murattal recitations (Alafasy / Minshawi / Husary).
 */
export function getAverageAyahDuration(surah: number, startAyat = 1, count = 1): number {
  // Special specific famous long ayahs
  if (surah === 2 && startAyat <= 255 && startAyat + count > 255) {
    // Ayat al-Kursi is ~50s
    return 50
  }
  if (surah === 2 && (startAyat === 282 || startAyat === 283)) {
    // Longest ayah in the Quran
    return 110
  }
  if (surah === 2 && (startAyat === 285 || startAyat === 286)) {
    // End of Baqarah
    return 42
  }
  if (surah === 24 && startAyat <= 35 && startAyat + count > 35) {
    // Ayat an-Nur
    return 45
  }
  if (surah === 1) {
    // Al-Fatiha (~38s for 7 ayahs = ~5.5s per ayah)
    return 5.5
  }

  // Surah ranges classification based on Quranic ayah density
  if (surah >= 2 && surah <= 5) {
    // Al-Baqarah, Ali Imran, An-Nisa, Al-Ma'idah (Longest classical ayahs)
    return 24
  }
  if (surah >= 6 && surah <= 9) {
    // Al-An'am, Al-A'raf, Al-Anfal, At-Tawbah
    return 18
  }
  if (surah >= 10 && surah <= 18) {
    // Yunus to Al-Kahf
    return 15
  }
  if (surah >= 19 && surah <= 24) {
    // Maryam, Ta-Ha, Anbiya, Hajj, Muminun, Nur
    return 12.5
  }
  if (surah >= 25 && surah <= 35) {
    // Furqan to Fatir
    return 12
  }
  if (surah >= 36 && surah <= 50) {
    // Ya-Sin to Qaf
    return 10.5
  }
  if (surah >= 51 && surah <= 56) {
    // Adh-Dhariyat, Tur, Najm, Qamar, Ar-Rahman, Al-Waqi'ah (Short rhythm ayahs)
    if (surah === 55) return 5.5 // Ar-Rahman
    if (surah === 56) return 6 // Al-Waqiah
    return 8
  }
  if (surah >= 57 && surah <= 66) {
    // Al-Hadid to At-Tahrim (Medinan medium surahs)
    return 16
  }
  if (surah >= 67 && surah <= 77) {
    // Tabarak / Al-Mulk to Al-Mursalat
    if (surah === 67) return 12 // Al-Mulk ~6 mins total
    if (surah === 77) return 5 // Al-Mursalat
    return 9
  }
  if (surah >= 78 && surah <= 89) {
    // Juz Amma: An-Naba to Al-Fajr
    return 6.5
  }
  if (surah >= 90 && surah <= 99) {
    // Al-Balad to Az-Zalzalah
    return 5.5
  }
  if (surah >= 100 && surah <= 114) {
    // Shortest surahs: Al-Adiyat to An-Nas
    return 4.2
  }

  return 10
}

/**
 * Get reciter speed multiplier.
 * e.g., Mujawwad is slower (~1.4x), standard Murattal is 1.0x.
 */
export function getReciterSpeedFactor(reciterId?: string): number {
  if (!reciterId) return 1.0
  const reciter = ALL_RECITERS.find((r) => r.id === reciterId)
  if (!reciter) return 1.0

  if (reciter.category === 'mujawwad' || reciter.style?.toLowerCase().includes('mujawwad')) {
    return 1.4
  }
  if (reciter.id.includes('husary') || reciter.id.includes('minshawi') || reciter.id.includes('hudhaify')) {
    return 1.12 // Measured deliberate classical pace
  }
  if (reciter.id.includes('dossari') || reciter.id.includes('ghamdi')) {
    return 0.95 // Faster fluid pace
  }
  return 1.0
}

/**
 * Estimate the reel duration in seconds for a bulk queue item.
 */
export function estimateBulkItemDurationSeconds(
  item: BulkItem,
  globalReciterId?: string,
  ayahPauseSeconds = 0.5,
): number {
  const effectiveReciter = item.reciterId || globalReciterId
  const speedFactor = getReciterSpeedFactor(effectiveReciter)
  const baseAyahSec = getAverageAyahDuration(item.surah, item.startAyat, item.count)
  
  const recitationSec = item.count * baseAyahSec * speedFactor
  const pausesSec = Math.max(0, item.count - 1) * ayahPauseSeconds
  const total = Math.max(4, Math.round(recitationSec + pausesSec))
  return total
}

/**
 * Format estimated duration with a clean badge label.
 * e.g. "⏱️ ~24s" or "⏱️ ~1m 15s"
 */
export function formatEstimatedDuration(seconds: number): string {
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return secs > 0 ? `~${mins}m ${secs}s` : `~${mins}m`
  }
  return `~${seconds}s`
}

/**
 * Format total batch duration in seconds into a friendly human-readable string.
 * e.g. "~4m 30s"
 */
export function formatTotalBatchEstimate(totalSeconds: number): string {
  if (totalSeconds >= 3600) {
    const hours = Math.floor(totalSeconds / 3600)
    const mins = Math.floor((totalSeconds % 3600) / 60)
    return `~${hours}h ${mins}m`
  }
  if (totalSeconds >= 60) {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return secs > 0 ? `~${mins}m ${secs}s` : `~${mins}m`
  }
  return `~${totalSeconds}s`
}

/**
 * Classify duration for social media formats (Reels, TikTok, Shorts).
 */
export function getSocialDurationCategory(seconds: number): {
  badgeText: string
  cssClass: 'short' | 'medium' | 'long'
  tooltip: string
} {
  if (seconds <= 59) {
    return {
      badgeText: '⚡ < 60s',
      cssClass: 'short',
      tooltip: 'Perfect for Instagram Reels, YouTube Shorts & TikTok',
    }
  }
  if (seconds <= 90) {
    return {
      badgeText: '📱 < 90s',
      cssClass: 'medium',
      tooltip: 'Ideal for standard Instagram Reels & TikTok',
    }
  }
  return {
    badgeText: '⏳ > 90s',
    cssClass: 'long',
    tooltip: 'Longer format — best for TikTok / IG Video Carousel',
  }
}
