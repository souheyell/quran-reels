import { beforeEach, describe, expect, it } from 'vitest'
import {
  getStoredCustomFonts,
  deleteCustomFont,
  type CustomFontItem,
} from '../customFonts'

describe('customFonts storage and management', () => {
  const store = new Map<string, string>()

  const mockLocalStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, val: string) => {
      store.set(key, val)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
    key: (_i: number) => null,
    length: 0,
  } as unknown as Storage

  beforeEach(() => {
    store.clear()
    Object.defineProperty(globalThis, 'window', {
      value: { localStorage: mockLocalStorage },
      writable: true,
    })
  })

  it('returns empty array when no custom fonts stored', () => {
    expect(getStoredCustomFonts()).toEqual([])
  })

  it('retrieves saved fonts from localStorage correctly', () => {
    const fonts: CustomFontItem[] = [
      {
        id: 'font-1',
        name: 'Diwani Custom',
        family: 'CustomArabic_Diwani',
        dataUrl: 'data:font/ttf;base64,AAAA',
        target: 'arabic',
        createdAt: 1000,
      },
      {
        id: 'font-2',
        name: 'My Latin',
        family: 'CustomLatin_MyFont',
        dataUrl: 'data:font/otf;base64,BBBB',
        target: 'translation',
        createdAt: 2000,
      },
    ]

    store.set('quran_reels_custom_fonts_v1', JSON.stringify(fonts))

    const loaded = getStoredCustomFonts()
    expect(loaded.length).toBe(2)
    expect(loaded[0]!.name).toBe('Diwani Custom')
    expect(loaded[1]!.target).toBe('translation')
  })

  it('deletes font item from storage properly', () => {
    const fonts: CustomFontItem[] = [
      {
        id: 'font-1',
        name: 'Diwani Custom',
        family: 'CustomArabic_Diwani',
        dataUrl: 'data:font/ttf;base64,AAAA',
        target: 'arabic',
        createdAt: 1000,
      },
      {
        id: 'font-2',
        name: 'Thuluth Modern',
        family: 'CustomArabic_Thuluth',
        dataUrl: 'data:font/ttf;base64,CCCC',
        target: 'arabic',
        createdAt: 2000,
      },
    ]

    store.set('quran_reels_custom_fonts_v1', JSON.stringify(fonts))

    const remaining = deleteCustomFont('font-1')
    expect(remaining.length).toBe(1)
    expect(remaining[0]!.id).toBe('font-2')
  })
})
