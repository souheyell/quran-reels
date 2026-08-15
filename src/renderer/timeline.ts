import type { Verse } from '../types'

export interface VerseSlot {
  verse: Verse
  startMs: number
  endMs: number
  durationMs: number
}

export interface Timeline {
  slots: VerseSlot[]
  totalMs: number
}

/** Default 1.6-second pause between each ayah in multi-ayah reels */
export const DEFAULT_AYAH_GAP_MS = 1600

export function buildTimeline(
  verses: Verse[],
  audioDurationsMs: (number | null)[] | null,
  fallbackMs: number,
  gapMs = DEFAULT_AYAH_GAP_MS,
): Timeline {
  let cursor = 0
  const slots: VerseSlot[] = verses.map((verse, i) => {
    const rawDuration = audioDurationsMs?.[i] ?? fallbackMs
    const pause = verses.length > 1 && i < verses.length - 1 ? gapMs : 0
    const durationMs = rawDuration + pause
    const slot: VerseSlot = {
      verse,
      startMs: cursor,
      endMs: cursor + durationMs,
      durationMs,
    }
    cursor += durationMs
    return slot
  })
  return { slots, totalMs: cursor }
}

export function activeSlot(timeline: Timeline, timeMs: number): VerseSlot | null {
  if (timeline.slots.length === 0) return null
  const t = ((timeMs % timeline.totalMs) + timeline.totalMs) % timeline.totalMs
  return (
    timeline.slots.find((s) => t >= s.startMs && t < s.endMs) ??
    timeline.slots[timeline.slots.length - 1]
  )
}
