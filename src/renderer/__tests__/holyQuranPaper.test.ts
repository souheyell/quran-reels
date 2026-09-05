import { describe, expect, it, vi } from 'vitest'
import { drawHolyQuranPaper, toArabicIndicNumerals } from '../holyQuranPaper'
import { defaultConfig, renderFrame } from '../reelRenderer'
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
    quadraticCurveTo: vi.fn(),
    rect: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    measureText: vi.fn((_text: string) => ({ width: 140 })),
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
    set lineCap(_v: CanvasLineCap) {},
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
  {
    surah: 1,
    ayat: 3,
    surahName: 'Al-Fatiha',
    surahArabicName: 'سُورَةُ ٱلْفَاتِحَةِ',
    arabic: 'ٱلرَّحْمَٰنِ ٱلرَّحِيمِ',
    translation: 'The Entirely Merciful, the Especially Merciful,',
    editionId: 'en.sahih',
    editionName: 'Saheeh International',
    audioUrl: 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/3.mp3',
  },
]

describe('Holy Quran Paper Mode', () => {
  describe('toArabicIndicNumerals', () => {
    it('converts western numerals to Arabic-Indic digits', () => {
      expect(toArabicIndicNumerals(1)).toBe('١')
      expect(toArabicIndicNumerals(255)).toBe('٢٥٥')
      expect(toArabicIndicNumerals(114)).toBe('١١٤')
    })
  })

  describe('drawHolyQuranPaper renderer', () => {
    it('renders with madani-cream theme without error', () => {
      const ctx = createMockCtx()
      const config = {
        ...defaultConfig(),
        text: {
          ...defaultConfig().text,
          layoutMode: 'holy-quran-paper' as const,
          mushafTheme: 'madani-cream' as const,
          showTranslation: false,
        },
      }

      expect(() => {
        drawHolyQuranPaper(ctx, config, [mockVerses[0]!], mockVerses[0]!, 1000, 4000, 1080, 1920)
      }).not.toThrow()
      expect(ctx.save).toHaveBeenCalled()
      expect(ctx.restore).toHaveBeenCalled()
      expect(ctx.fillText).toHaveBeenCalled()
    })

    it('renders with vintage-parchment theme', () => {
      const ctx = createMockCtx()
      const config = {
        ...defaultConfig(),
        text: {
          ...defaultConfig().text,
          layoutMode: 'holy-quran-paper' as const,
          mushafTheme: 'vintage-parchment' as const,
        },
      }

      expect(() => {
        drawHolyQuranPaper(ctx, config, mockVerses, mockVerses[0]!, 1000, 4000, 1080, 1920)
      }).not.toThrow()
      expect(ctx.fillText).toHaveBeenCalled()
    })

    it('renders with royal-ivory theme', () => {
      const ctx = createMockCtx()
      const config = {
        ...defaultConfig(),
        text: {
          ...defaultConfig().text,
          layoutMode: 'holy-quran-paper' as const,
          mushafTheme: 'royal-ivory' as const,
        },
      }

      expect(() => {
        drawHolyQuranPaper(ctx, config, mockVerses, mockVerses[1]!, 2000, 5000, 1080, 1920)
      }).not.toThrow()
    })

    it('renders with obsidian-gold dark mode theme', () => {
      const ctx = createMockCtx()
      const config = {
        ...defaultConfig(),
        text: {
          ...defaultConfig().text,
          layoutMode: 'holy-quran-paper' as const,
          mushafTheme: 'obsidian-gold' as const,
        },
      }

      expect(() => {
        drawHolyQuranPaper(ctx, config, mockVerses, mockVerses[2]!, 3000, 4000, 1080, 1920)
      }).not.toThrow()
    })

    it('renders footnote translation when enabled', () => {
      const ctx = createMockCtx()
      const config = {
        ...defaultConfig(),
        text: {
          ...defaultConfig().text,
          layoutMode: 'holy-quran-paper' as const,
          showTranslation: true,
        },
      }

      drawHolyQuranPaper(ctx, config, mockVerses, mockVerses[0]!, 1000, 4000, 1080, 1920)
      expect(ctx.fillText).toHaveBeenCalledWith(
        expect.stringContaining('In the name of Allah'),
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
      )
    })
  })

  describe('renderFrame integration', () => {
    it('bypasses background effects and renders Holy Quran Paper when mode is holy-quran-paper', () => {
      const ctx = createMockCtx()
      const config = {
        ...defaultConfig(),
        verses: mockVerses,
        effects: {
          type: 'fireflies' as const,
          intensity: 0.8,
          speed: 1.0,
        },
        waveform: {
          type: 'symmetric-bars' as const,
          color: '#ffd700',
          opacity: 0.8,
        },
        text: {
          ...defaultConfig().text,
          layoutMode: 'holy-quran-paper' as const,
        },
      }

      expect(() => {
        renderFrame(ctx, {
          timeMs: 1200,
          config,
          image: null,
          verse: mockVerses[0]!,
          verseTimeMs: 1200,
          slotDurationMs: 4000,
          totalDurationMs: 12000,
        })
      }).not.toThrow()

      // Should have rendered
      expect(ctx.save).toHaveBeenCalled()
      expect(ctx.restore).toHaveBeenCalled()
    })
  })
})
