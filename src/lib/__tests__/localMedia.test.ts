import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  fetchLocalMedia,
  openBackgroundsFolder,
  uploadLocalMedia,
} from '../localMedia'
import {
  registerLocalMedia,
  getLocalMediaCurated,
  getAllStockVideoLoops,
} from '../../api/unsplash'

describe('localMedia service & background resources', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('registers local media into curated unsplash pools correctly', () => {
    const mockCatalog = {
      images: [
        {
          id: 'local-img-1',
          title: 'Majestic Mosque',
          filename: 'majestic_mosque.jpg',
          url: '/backgrounds/images/majestic_mosque.jpg',
          sizeLabel: '450 KB',
          mediaType: 'image' as const,
        },
      ],
      videos: [
        {
          id: 'local-vid-1',
          title: 'Night Sky Starfield',
          filename: 'night_sky.mp4',
          url: '/backgrounds/videos/night_sky.mp4',
          sizeLabel: '4.2 MB',
          mediaType: 'video' as const,
        },
      ],
      folderPath: '/Users/test/backgrounds',
    }

    registerLocalMedia(mockCatalog)

    const curated = getLocalMediaCurated()
    expect(curated.images.length).toBe(1)
    expect(curated.images[0].full).toBe('/backgrounds/images/majestic_mosque.jpg')
    expect(curated.images[0].mediaType).toBe('image')

    expect(curated.videos.length).toBe(1)
    expect(curated.videos[0].full).toBe('/backgrounds/videos/night_sky.mp4')
    expect(curated.videos[0].mediaType).toBe('video')

    const allVideoLoops = getAllStockVideoLoops()
    expect(allVideoLoops.some((v) => v.full === '/backgrounds/videos/night_sky.mp4')).toBe(true)
  })

  it('fetches local media and parses catalog correctly from API or manifest', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === '/__api/local-media') {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              images: [
                {
                  id: 'img-1',
                  title: 'Dome',
                  filename: 'dome.jpg',
                  url: '/backgrounds/images/dome.jpg',
                  mediaType: 'image',
                },
              ],
              videos: [],
              folderPath: '/mock/path/public/backgrounds',
            }),
        })
      }
      return Promise.reject(new Error('Not found'))
    })

    const catalog = await fetchLocalMedia()
    expect(catalog.images.length).toBe(1)
    expect(catalog.images[0].filename).toBe('dome.jpg')
    expect(catalog.folderPath).toContain('backgrounds')
  })

  it('handles open folder request safely and returns folderPath', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, folderPath: '/mock/path/backgrounds' }),
    })

    const res = await openBackgroundsFolder()
    expect(res.success).toBe(true)
    expect(res.folderPath).toBe('/mock/path/backgrounds')
  })

  it('handles direct upload to local media folder via HTTP endpoint', async () => {
    const dummyFile = new File(['dummy-mp4-data'], 'custom_loop.mp4', { type: 'video/mp4' })

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          url: '/backgrounds/videos/custom_loop.mp4',
          filename: 'custom_loop.mp4',
          mediaType: 'video',
        }),
    })

    const res = await uploadLocalMedia(dummyFile)
    expect(res.success).toBe(true)
    expect(res.url).toBe('/backgrounds/videos/custom_loop.mp4')
    expect(res.mediaType).toBe('video')
  })
})
