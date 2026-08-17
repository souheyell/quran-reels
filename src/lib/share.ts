import { Share } from '@capacitor/share'
import { Capacitor } from '@capacitor/core'
import type { Verse } from '../types'

export interface ShareReelOptions {
  blob: Blob
  filename: string
  verses: Verse[]
  reciterName?: string
}

export interface ShareResult {
  shared: boolean
  copiedCaption: boolean
  message: string
}

/**
 * Generate a beautifully formatted social media caption for Quran Reels with hashtags.
 */
export function generateSocialCaption(verses: Verse[], reciterName?: string): string {
  if (!verses || verses.length === 0) {
    return '📖 Quran Reel #Quran #QuranReels #Islam #IslamicReminder #SadaqahJariyah'
  }

  const first = verses[0]
  const last = verses[verses.length - 1]
  const surahLabel =
    verses.length === 1
      ? `${first.surahName} (${first.surah}:${first.ayat})`
      : `${first.surahName} (${first.surah}:${first.ayat}–${last.ayat})`

  const arabicSnippet = verses
    .map((v) => v.arabic)
    .join(' ۝ ')
    .slice(0, 280)

  const translationSnippet = verses
    .map((v) => v.translation)
    .join(' ')
    .slice(0, 300)

  const qari = reciterName || first.reciterName || 'Classical Qari'

  return `📖 ${surahLabel}
${first.surahArabicName ? `✨ سورة ${first.surahArabicName}` : ''}

"${arabicSnippet}"

"${translationSnippet}"

🎙️ Recitation by: ${qari}
✨ Created with Islamic Reels Creator Studio (صدقة جارية)

━━━━━━━━━━━━━━━━━━━
#Quran #QuranReels #AyahOfTheDay #QuranRecitation #Islam #IslamicReminder #IslamicReels #Dawah #SadaqahJariyah`
}

/**
 * Share exported video file to native social share sheet (Instagram, TikTok, WhatsApp, etc.)
 * with intelligent fallback to Web Share API or Clipboard + Download.
 */
export async function shareReelVideo(options: ShareReelOptions): Promise<ShareResult> {
  const { blob, filename, verses, reciterName } = options
  const caption = generateSocialCaption(verses, reciterName)
  const isNative = Capacitor.isNativePlatform()

  // 1. Try Capacitor Native Share on Android/iOS
  if (isNative) {
    try {
      // In native environment, Share.share can share text & url or files
      await Share.share({
        title: `${verses[0]?.surahName || 'Quran'} Reel`,
        text: caption,
        dialogTitle: 'Share Quran Reel to Social Media',
      })
      return {
        shared: true,
        copiedCaption: true,
        message: 'Shared successfully via native share sheet!',
      }
    } catch (e) {
      console.warn('Native share failed or dismissed:', e)
    }
  }

  // 2. Try Web Share API with File (Supported in modern mobile browsers like Safari iOS, Chrome Android)
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      const file = new File([blob], filename, { type: blob.type || 'video/mp4' })
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${verses[0]?.surahName || 'Quran'} Reel`,
          text: caption,
        })
        return {
          shared: true,
          copiedCaption: true,
          message: 'Shared video directly via Web Share!',
        }
      }
    } catch (e) {
      // If user cancelled share sheet, don't trigger error
      if (e instanceof DOMException && e.name === 'AbortError') {
        return { shared: false, copiedCaption: false, message: 'Share sheet dismissed' }
      }
      console.warn('Web Share API file share failed:', e)
    }
  }

  // 3. Fallback for Desktop Browsers: Copy Caption to Clipboard
  let copiedCaption = false
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(caption)
      copiedCaption = true
    } catch (e) {
      console.warn('Failed to copy caption to clipboard:', e)
    }
  }

  return {
    shared: false,
    copiedCaption,
    message: copiedCaption
      ? '📋 Social media caption with hashtags copied to clipboard! (Ready to paste on Instagram/TikTok)'
      : 'Video saved.',
  }
}
