import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  buildUploaderCliCommand,
  getStoredCliTemplate,
  setStoredCliTemplate,
  getExportServerConfig,
  openExportFolder,
  uploadBlobInChunks,
  saveBulkPackToServer,
  saveSingleExportToServer,
  DEFAULT_BULK_CLI_TEMPLATE,
  DEFAULT_SINGLE_CLI_TEMPLATE,
} from '../exportDestination'

describe('exportDestination & CLI command builder', () => {
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
    vi.restoreAllMocks()
    store.clear()
    vi.stubGlobal('localStorage', mockLocalStorage)
    vi.stubGlobal('window', { localStorage: mockLocalStorage })
  })

  it('builds default bulk CLI command correctly', () => {
    expect(DEFAULT_SINGLE_CLI_TEMPLATE).toContain('--file "{file}"')
    const cmd = buildUploaderCliCommand({
      folderPath: '/Users/souheyel/Documents/quran-reels/exports/pack_kahf',
    })
    expect(cmd).toBe(
      'python scripts/bulk_uploader.py --folder "/Users/souheyel/Documents/quran-reels/exports/pack_kahf"',
    )
  })

  it('builds single file CLI command when filePath is provided', () => {
    const cmd = buildUploaderCliCommand({
      filePath: '/Users/souheyel/Documents/quran-reels/exports/single/reel-18-1-10.mp4',
    })
    expect(cmd).toBe(
      'python scripts/bulk_uploader.py --file "/Users/souheyel/Documents/quran-reels/exports/single/reel-18-1-10.mp4"',
    )
  })

  it('interpolates custom command template with {folder}, {manifest}, and {file}', () => {
    const custom =
      'python my_uploader.py --dir {folder} --manifest {manifest} --single {file}'
    const cmd = buildUploaderCliCommand({
      folderPath: '/workspace/exports/pack_1',
      manifestPath: '/workspace/exports/pack_1/manifest.json',
      filePath: '/workspace/exports/pack_1/01.mp4',
      template: custom,
    })
    expect(cmd).toBe(
      'python my_uploader.py --dir /workspace/exports/pack_1 --manifest /workspace/exports/pack_1/manifest.json --single /workspace/exports/pack_1/01.mp4',
    )
  })

  it('stores and retrieves custom CLI template from localStorage', () => {
    expect(getStoredCliTemplate()).toBe(DEFAULT_BULK_CLI_TEMPLATE)

    setStoredCliTemplate('node uploader.js --path "{folder}"')
    expect(getStoredCliTemplate()).toBe('node uploader.js --path "{folder}"')

    const cmd = buildUploaderCliCommand({
      folderPath: '/workspace/exports/pack_maryam',
    })
    expect(cmd).toBe('node uploader.js --path "/workspace/exports/pack_maryam"')
  })

  it('fetches export server config and falls back safely if endpoint fails', async () => {
    // 1. Success case
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          exportsDir: '/custom/cloudspace/exports',
          relativeDir: 'exports',
        }),
    })

    const config = await getExportServerConfig()
    expect(config.exportsDir).toBe('/custom/cloudspace/exports')

    // 2. Failure / offline fallback
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
    const fallback = await getExportServerConfig()
    expect(fallback.exportsDir).toBe('exports')
  })

  it('handles openExportFolder call safely', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          folderPath: '/workspace/exports',
        }),
    })

    const res = await openExportFolder('/workspace/exports')
    expect(res.success).toBe(true)
    expect(res.folderPath).toBe('/workspace/exports')
  })

  it('uploads a blob in chunks and reports progress properly', async () => {
    // 1.5MB blob sliced into 512KB chunks -> 3 chunks
    const testData = new Uint8Array(1.5 * 1024 * 1024)
    const blob = new Blob([testData], { type: 'video/mp4' })

    const progressReports: number[] = []
    const fetchCalls: any[] = []

    global.fetch = vi.fn().mockImplementation((url, init) => {
      fetchCalls.push({ url, headers: init.headers })
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            folderPath: '/workspace/exports/pack_test',
            filePath: '/workspace/exports/pack_test/01_reel.mp4',
            filename: '01_reel.mp4',
          }),
      })
    })

    const result = await uploadBlobInChunks({
      blob,
      filename: '01_reel.mp4',
      packName: 'pack_test',
      chunkSize: 512 * 1024,
      onProgress: (p) => {
        progressReports.push(p.percent)
      },
    })

    expect(result.success).toBe(true)
    expect(fetchCalls.length).toBe(3)
    expect(fetchCalls[0].headers['x-chunk-index']).toBe('0')
    expect(fetchCalls[1].headers['x-chunk-index']).toBe('1')
    expect(fetchCalls[2].headers['x-chunk-index']).toBe('2')
    expect(fetchCalls[0].headers['x-total-chunks']).toBe('3')
    expect(fetchCalls[0].headers['x-filename']).toBe('01_reel.mp4')
    expect(progressReports[progressReports.length - 1]).toBe(100)
  })

  it('retries when a chunk upload fails with HTTP error and succeeds after backoff', async () => {
    const testData = new Uint8Array(100 * 1024) // 1 chunk
    const blob = new Blob([testData], { type: 'video/mp4' })

    let callCount = 0
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // First attempt fails with 502 or 413
        return Promise.resolve({
          ok: false,
          status: 413,
          statusText: 'Payload Too Large',
          text: () => Promise.resolve('Proxy rejected body'),
        })
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            folderPath: '/workspace/exports/single',
            filePath: '/workspace/exports/single/test.mp4',
            filename: 'test.mp4',
          }),
      })
    })

    const res = await saveSingleExportToServer(blob, 'test.mp4')
    expect(res.success).toBe(true)
    expect(callCount).toBe(2)
  })

  it('saveBulkPackToServer saves manifest and all items, and reports failure if an item fails', async () => {
    const manifestJson = JSON.stringify([{ filename: '01.mp4' }])
    const videoBlob = new Blob([new Uint8Array(1024)], { type: 'video/mp4' })

    // Simulate server rejecting video file chunks even after retries
    let fetchCount = 0
    global.fetch = vi.fn().mockImplementation((_url, init) => {
      fetchCount++
      // If uploading video (not manifest), fail
      if (init.headers['x-filename'] === '01.mp4') {
        return Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          text: () => Promise.resolve('Disk full or proxy closed'),
        })
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            folderPath: '/workspace/exports/test_pack',
            filePath: '/workspace/exports/test_pack/manifest.json',
            filename: 'manifest.json',
          }),
      })
    })

    const res = await saveBulkPackToServer(
      'test_pack',
      [{ filename: '01.mp4', blob: videoBlob }],
      manifestJson,
    )

    expect(res.success).toBe(false)
    expect(res.error).toContain('Failed to upload chunk')
    expect(res.manifestPath).toBe('/workspace/exports/test_pack/manifest.json')
  })
})

