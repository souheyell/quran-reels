import { describe, expect, it } from 'vitest'
import {
  fitFontSize,
  isRtl,
  makeRtlSafe,
  wrapText,
} from '../textLayout'

const measure = (s: string) => s.length * 10

describe('isRtl', () => {
  it('detects Arabic text', () => {
    expect(isRtl('ٱللَّهُ')).toBe(true)
  })

  it('detects Latin text as LTR', () => {
    expect(isRtl('Allah')).toBe(false)
  })
})

describe('makeRtlSafe', () => {
  it('wraps text in RLE/PDF isolates', () => {
    expect(makeRtlSafe('abc')).toBe('\u2067abc\u2069')
  })
})

describe('wrapText', () => {
  it('wraps text that exceeds max width', () => {
    const lines = wrapText('one two three four five', 70, measure)
    expect(lines.join('|')).toContain(' ')
    expect(lines.every((l) => l.length <= 7)).toBe(true)
  })

  it('returns a single line for short text', () => {
    expect(wrapText('hi', 100, measure)).toEqual(['hi'])
  })

  it('handles empty text', () => {
    expect(wrapText('', 100, measure)).toEqual([''])
  })

  it('breaks a single long word', () => {
    const lines = wrapText('supercalifragilistic', 60, measure)
    expect(lines.length).toBeGreaterThan(1)
    expect(lines.join('')).toBe('supercalifragilistic')
  })
})

describe('fitFontSize', () => {
  it('shrinks font to fit available height', () => {
    const result = fitFontSize(
      'one two three four five six seven eight nine ten',
      100,
      60,
      40,
      (s, size) => s.length * size * 0.5,
      1.5,
      12,
    )
    expect(result.size).toBeLessThanOrEqual(40)
    expect(result.size).toBeGreaterThanOrEqual(12)
  })

  it('keeps base size when text fits', () => {
    const result = fitFontSize(
      'hi',
      100,
      60,
      40,
      (s, size) => s.length * size * 0.5,
      1.5,
      12,
    )
    expect(result.size).toBe(40)
    expect(result.lines).toHaveLength(1)
  })
})
