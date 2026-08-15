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

export function buildTimeline(
  verses: Verse[],
  audioDurationsMs: (number | null)[] | null,
  fallbackMs: number,
): Timeline {
  let cursor = 0
  const slots: VerseSlot[] = verses.map((verse, i) => {
    const durationMs = audioDurationsMs?.[i] ?? fallbackMs
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
