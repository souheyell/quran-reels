import { beforeEach, describe, expect, it } from 'vitest'
import {
  loadSavedConfig,
  saveConfig,
  loadSavedLoaderState,
  saveLoaderState,
  loadUserMediaLibrary,
  saveUserMediaItem,
  deleteUserMediaItem,
  type UserUploadedMedia,
} from '../storage'
import { defaultConfig } from '../../renderer/reelRenderer'

describe('storage helpers', () => {
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
      configurable: true,
    })
  })

  it('loads defaultConfig when storage is empty', () => {
    const config = loadSavedConfig()
    expect(config.aspectRatio).toBe('9:16')
    expect(config.text.arabicSize).toBe(72)
    expect(config.text.ayahPauseDelay).toBe(0.0)
    expect(config.text.showBasmalah).toBe(true)
  })

  it('persists and reloads config accurately', () => {
    const custom = defaultConfig()
    custom.text.arabicSize = 96
    custom.text.ayahPauseDelay = 2.4
    custom.text.textColor = '#ffd700'
    custom.motion.type = 'kenburns-drift-up'

    saveConfig(custom)
    const reloaded = loadSavedConfig()

    expect(reloaded.text.arabicSize).toBe(96)
    expect(reloaded.text.ayahPauseDelay).toBe(2.4)
    expect(reloaded.text.textColor).toBe('#ffd700')
    expect(reloaded.motion.type).toBe('kenburns-drift-up')
  })

  it('handles corrupted storage gracefully', () => {
    mockLocalStorage.setItem('quran_reels_config_v1', 'INVALID_JSON{{{')
    const config = loadSavedConfig()
    expect(config.aspectRatio).toBe('9:16')
  })

  it('persists and reloads verse loader state', () => {
    saveLoaderState({
      editionId: 'fr.hamidullah',
      reciterId: 'ar.minshawi',
      lockCount: true,
      lockReciter: true,
      fixedCount: 3,
    })

    const loaded = loadSavedLoaderState()
    expect(loaded.editionId).toBe('fr.hamidullah')
    expect(loaded.reciterId).toBe('ar.minshawi')
    expect(loaded.lockCount).toBe(true)
    expect(loaded.lockReciter).toBe(true)
    expect(loaded.fixedCount).toBe(3)
  })

  it('persists and manages user media library uploads', () => {
    expect(loadUserMediaLibrary()).toEqual([])

    const item1: UserUploadedMedia = {
      id: 'media-1',
      title: 'custom-loop.mp4',
      url: 'blob:http://localhost/video-1',
      thumb: 'data:image/jpeg;base64,123',
      mediaType: 'video',
      createdAt: Date.now(),
      sizeLabel: '4.2 MB',
    }

    const item2: UserUploadedMedia = {
      id: 'media-2',
      title: 'kaaba-photo.jpg',
      url: 'blob:http://localhost/image-2',
      thumb: 'blob:http://localhost/image-2',
      mediaType: 'image',
      createdAt: Date.now(),
      sizeLabel: '1.8 MB',
    }

    saveUserMediaItem(item1)
    saveUserMediaItem(item2)

    const library = loadUserMediaLibrary()
    expect(library.length).toBe(2)
    expect(library[0].id).toBe('media-2') // latest first
    expect(library[1].id).toBe('media-1')

    const afterDelete = deleteUserMediaItem('media-1')
    expect(afterDelete.length).toBe(1)
    expect(afterDelete[0].id).toBe('media-2')
  })
})
