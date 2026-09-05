import { describe, expect, it, vi } from 'vitest'
import { drawMushafPage } from '../mushafLayout'
import { defaultConfig } from '../reelRenderer'
import type { Verse } from '../../types'

function createMockCtx(): CanvasRenderingContext2D {
  return {
    canvas: { width: 1080, height: 1920 } as HTMLCanvasElement,
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    strokeRect: vi.fn(),
    fillRect: vi.fn(),
    roundRect: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    measureText: vi.fn(() => ({ width: 120 })),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    set font(_v: string) {},
    set fillStyle(_v: unknown) {},
    set strokeStyle(_v: unknown) {},
    set lineWidth(_v: number) {},
    set globalAlpha(_v: number) {},
    set textAlign(_v: CanvasTextAlign) {},
    set textBaseline(_v: CanvasTextBaseline) {},
    set shadowColor(_v: string) {},
    set shadowBlur(_v: number) {},
  } as unknown as CanvasRenderingContext2D
}

const mockVerses: Verse[] = [
  {
    surah: 1,
    ayat: 1,
    surahName: 'Al-Fatiha',
    surahArabicName: 'سُورَةُ ٱلْفَاتِحَةِ',
    arabic: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ',
    translation: 'In the name of Allah, the Entirely Merciful, the Especially Merciful.',
    editionId: 'en.sahih',
    editionName: 'Saheeh International',
    audioUrl: 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/1.mp3',
  },
  {
    surah: 1,
    ayat: 2,
    surahName: 'Al-Fatiha',
    surahArabicName: 'سُورَةُ ٱلْفَاتِحَةِ',
    arabic: 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ',
    translation: '[All] praise is [due] to Allah, Lord of the worlds -',
    editionId: 'en.sahih',
    editionName: 'Saheeh International',
    audioUrl: 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/2.mp3',
  },
]

describe('drawMushafPage renderer', () => {
  it('renders without error with obsidian-gold theme', () => {
    const ctx = createMockCtx()
    const config = {
      ...defaultConfig(),
      text: {
        ...defaultConfig().text,
        layoutMode: 'mushaf-page' as const,
        mushafTheme: 'obsidian-gold' as const,
        mushafGlowIntensity: 0.9,
      },
    }

    expect(() => {
      drawMushafPage(ctx, config, mockVerses, mockVerses[0]!, 1000, 4000, 1080, 1920)
    }).not.toThrow()
    expect(ctx.save).toHaveBeenCalled()
    expect(ctx.restore).toHaveBeenCalled()
  })

  it('renders without error with madani-parchment theme', () => {
    const ctx = createMockCtx()
    const config = {
      ...defaultConfig(),
      text: {
        ...defaultConfig().text,
        layoutMode: 'mushaf-page' as const,
        mushafTheme: 'madani-parchment' as const,
      },
    }

    expect(() => {
      drawMushafPage(ctx, config, mockVerses, mockVerses[1]!, 2000, 5000, 1080, 1920)
    }).not.toThrow()
    expect(ctx.fillText).toHaveBeenCalled()
  })

  it('renders without error with emerald-noor theme', () => {
    const ctx = createMockCtx()
    const config = {
      ...defaultConfig(),
      text: {
        ...defaultConfig().text,
        layoutMode: 'mushaf-page' as const,
        mushafTheme: 'emerald-noor' as const,
      },
    }

    expect(() => {
      drawMushafPage(ctx, config, mockVerses, mockVerses[0]!, 500, 3000, 1080, 1920)
    }).not.toThrow()
  })
})
