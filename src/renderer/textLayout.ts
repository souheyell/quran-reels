export interface WrappedLine {
  text: string
  width: number
}

const RTL_RE = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/

export function isRtl(text: string): boolean {
  return RTL_RE.test(text)
}

function breakLongWord(word: string, measure: (s: string) => number, maxWidth: number): string[] {
  if (measure(word) <= maxWidth) return [word]
  const parts: string[] = []
  let current = ''
  for (const ch of word) {
    if (measure(current + ch) > maxWidth && current !== '') {
      parts.push(current)
      current = ch
    } else {
      current += ch
    }
  }
  if (current !== '') parts.push(current)
  return parts
}

export function wrapText(
  text: string,
  maxWidth: number,
  measure: (s: string) => number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 0) return ['']

  const lines: string[] = []
  let current = ''

  for (const word of words) {
    if (current === '') {
      current = word
      continue
    }
    const candidate = `${current} ${word}`
    if (measure(candidate) <= maxWidth) {
      current = candidate
    } else {
      lines.push(current)
      current = word
    }
  }
  if (current !== '') lines.push(current)

  const broken: string[] = []
  for (const line of lines) {
    if (measure(line) <= maxWidth) {
      broken.push(line)
    } else {
      const longWords = line.split(' ').map((w) => breakLongWord(w, measure, maxWidth))
      let rebuilt = ''
      for (const group of longWords) {
        for (const part of group) {
          const candidate = rebuilt === '' ? part : `${rebuilt} ${part}`
          if (measure(candidate) <= maxWidth || rebuilt === '') {
            rebuilt = candidate
          } else {
            broken.push(rebuilt)
            rebuilt = part
          }
        }
        if (rebuilt !== '') {
          broken.push(rebuilt)
          rebuilt = ''
        }
      }
    }
  }
  return broken
}

export function fitFontSize(
  text: string,
  maxWidth: number,
  maxHeight: number,
  baseSize: number,
  measure: (s: string, size: number) => number,
  lineHeight: number,
  minSize: number,
): { size: number; lines: WrappedLine[] } {
  let size = baseSize
  while (size >= minSize) {
    const lines = wrapText(text, maxWidth, (s) => measure(s, size))
    const totalHeight = lines.length * size * lineHeight
    if (totalHeight <= maxHeight) {
      return {
        size,
        lines: lines.map((l) => ({ text: l, width: measure(l, size) })),
      }
    }
    size -= 2
  }
  const lines = wrapText(text, maxWidth, (s) => measure(s, minSize))
  return {
    size: minSize,
    lines: lines.map((l) => ({ text: l, width: measure(l, minSize) })),
  }
}

export function makeRtlSafe(text: string): string {
  return `\u2067${text}\u2069`
}

export function prepareText(text: string, rtl: boolean): string {
  return rtl ? makeRtlSafe(text) : text
}
