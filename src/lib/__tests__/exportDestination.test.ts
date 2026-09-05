import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  buildUploaderCliCommand,
  getStoredCliTemplate,
  setStoredCliTemplate,
  getExportServerConfig,
  openExportFolder,
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
})
