export interface ExportServerConfig {
  exportsDir: string
  relativeDir: string
}

export interface SaveExportResult {
  success: boolean
  folderPath: string
  filePath?: string
  manifestPath?: string
  filename?: string
  cliCommand?: string
  error?: string
}

export const DEFAULT_BULK_CLI_TEMPLATE = 'python scripts/bulk_uploader.py --folder "{folder}"'
export const DEFAULT_SINGLE_CLI_TEMPLATE = 'python scripts/bulk_uploader.py --file "{file}"'

const STORAGE_KEY_CLI_TEMPLATE = 'quran_reels_cli_template'

/**
 * Retrieve user's preferred CLI command template from localStorage.
 */
export function getStoredCliTemplate(): string {
  if (typeof window === 'undefined') return DEFAULT_BULK_CLI_TEMPLATE
  try {
    const saved = localStorage.getItem(STORAGE_KEY_CLI_TEMPLATE)
    if (saved && saved.trim().length > 0) {
      return saved
    }
  } catch {
    // Ignore localStorage error
  }
  return DEFAULT_BULK_CLI_TEMPLATE
}

/**
 * Store user's customized CLI command template into localStorage.
 */
export function setStoredCliTemplate(template: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY_CLI_TEMPLATE, template)
  } catch {
    // Ignore
  }
}

/**
 * Construct a ready-to-run terminal command for the bulk uploader script.
 * Safely replaces placeholders: {folder}, {dir}, {manifest}, {file}.
 */
export function buildUploaderCliCommand(options: {
  folderPath?: string
  manifestPath?: string
  filePath?: string
  template?: string
}): string {
  let tmpl = options.template || (options.filePath && !options.folderPath ? DEFAULT_SINGLE_CLI_TEMPLATE : getStoredCliTemplate())

  const folder = options.folderPath || (options.filePath ? options.filePath.substring(0, options.filePath.lastIndexOf('/')) : 'exports')
  const manifest = options.manifestPath || (options.folderPath ? `${options.folderPath}/manifest.json` : 'exports/manifest.json')
  const file = options.filePath || ''

  // Replace placeholders
  tmpl = tmpl.replace(/\{folder\}/g, folder)
  tmpl = tmpl.replace(/\{dir\}/g, folder)
  tmpl = tmpl.replace(/\{manifest\}/g, manifest)
  tmpl = tmpl.replace(/\{file\}/g, file)

  return tmpl
}

/**
 * Fetch the server's absolute export directory (works on both local dev and cloudspace).
 */
export async function getExportServerConfig(): Promise<ExportServerConfig> {
  try {
    const res = await fetch('/__api/export-config')
    if (res.ok) {
      const data = (await res.json()) as ExportServerConfig
      if (data.exportsDir) return data
    }
  } catch {
    // Dev server unavailable or running static
  }
  return {
    exportsDir: 'exports',
    relativeDir: 'exports',
  }
}

/**
 * Save an individual exported MP4 directly to the server's exports/single folder on disk.
 */
export async function saveSingleExportToServer(
  blob: Blob,
  filename: string,
): Promise<SaveExportResult> {
  try {
    const res = await fetch('/__api/save-single-export', {
      method: 'POST',
      headers: {
        'x-filename': encodeURIComponent(filename),
      },
      body: blob,
    })

    if (res.ok) {
      const data = (await res.json()) as {
        success: boolean
        folderPath: string
        filePath: string
        filename: string
      }
      const cliCommand = buildUploaderCliCommand({
        filePath: data.filePath,
        folderPath: data.folderPath,
      })
      return {
        success: true,
        folderPath: data.folderPath,
        filePath: data.filePath,
        filename: data.filename,
        cliCommand,
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Save single export failed'
    return {
      success: false,
      folderPath: 'exports/single',
      error: message,
    }
  }

  return {
    success: false,
    folderPath: 'exports/single',
    error: 'Failed to save export to server disk',
  }
}

/**
 * Save an entire bulk batch (videos + manifest.json) directly into exports/<packName>/ on disk.
 */
export async function saveBulkPackToServer(
  packName: string,
  items: Array<{ filename: string; blob: Blob }>,
  manifestContent: string,
  onProgress?: (percent: number) => void,
): Promise<SaveExportResult> {
  const cleanPackName = packName.replace(/[^\w.-]+/g, '_')
  let savedFolder = `exports/${cleanPackName}`
  let manifestPath = `${savedFolder}/manifest.json`

  try {
    // 1. Save manifest.json first
    const manifestBlob = new Blob([manifestContent], { type: 'application/json' })
    const manifestRes = await fetch('/__api/save-bulk-file', {
      method: 'POST',
      headers: {
        'x-pack-name': encodeURIComponent(cleanPackName),
        'x-filename': encodeURIComponent('manifest.json'),
      },
      body: manifestBlob,
    })

    if (manifestRes.ok) {
      const data = (await manifestRes.json()) as { folderPath: string; manifestPath: string }
      savedFolder = data.folderPath
      manifestPath = data.manifestPath
    }

    // 2. Save each video file
    const totalFiles = items.length
    let savedCount = 0

    for (const item of items) {
      await fetch('/__api/save-bulk-file', {
        method: 'POST',
        headers: {
          'x-pack-name': encodeURIComponent(cleanPackName),
          'x-filename': encodeURIComponent(item.filename),
        },
        body: item.blob,
      })
      savedCount++
      if (onProgress) {
        onProgress(Math.round((savedCount / totalFiles) * 100))
      }
    }

    const cliCommand = buildUploaderCliCommand({
      folderPath: savedFolder,
      manifestPath,
    })

    return {
      success: true,
      folderPath: savedFolder,
      manifestPath,
      cliCommand,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Batch disk save failed'
    const cliCommand = buildUploaderCliCommand({
      folderPath: savedFolder,
      manifestPath,
    })
    return {
      success: false,
      folderPath: savedFolder,
      manifestPath,
      cliCommand,
      error: message,
    }
  }
}

/**
 * Open the specified export directory in macOS Finder, Windows Explorer, or Linux file manager.
 */
export async function openExportFolder(folderPath?: string): Promise<{ success: boolean; folderPath: string; error?: string }> {
  try {
    const res = await fetch('/__api/open-export-folder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ folderPath }),
    })
    if (res.ok) {
      return (await res.json()) as { success: boolean; folderPath: string; error?: string }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Dev server unavailable'
    return { success: false, folderPath: folderPath || 'exports', error: message }
  }

  return { success: false, folderPath: folderPath || 'exports' }
}
