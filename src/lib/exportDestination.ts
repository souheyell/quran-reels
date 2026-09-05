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

export interface ChunkUploadProgress {
  filename: string
  loadedBytes: number
  totalBytes: number
  percent: number
  chunkIndex: number
  totalChunks: number
}

export interface UploadBlobChunkOptions {
  blob: Blob
  filename: string
  packName?: string
  subFolder?: string
  chunkSize?: number // default 512 * 1024 (512KB)
  maxRetries?: number // default 3
  onProgress?: (progress: ChunkUploadProgress) => void
}

export interface BulkSaveProgressInfo {
  percent: number
  currentFile: string
  fileIndex: number
  totalFiles: number
  statusText: string
}

export type BulkSaveProgressCallback = (
  percent: number,
  info?: BulkSaveProgressInfo,
) => void

/**
 * Upload a Blob in chunks (512KB slices) to bypass reverse proxy payload limits
 * (e.g. GitHub Codespaces, Cloudflare, nginx) with automatic retries and exponential backoff.
 */
export async function uploadBlobInChunks(
  options: UploadBlobChunkOptions,
): Promise<{
  success: boolean
  folderPath: string
  filePath: string
  filename: string
  manifestPath?: string
  exportsDir?: string
}> {
  const chunkSize = options.chunkSize || 512 * 1024
  const totalBytes = options.blob.size
  const totalChunks = Math.max(1, Math.ceil(totalBytes / chunkSize))

  let finalResponseData: {
    success: boolean
    folderPath: string
    filePath: string
    filename: string
    manifestPath?: string
    exportsDir?: string
  } | null = null

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const start = chunkIndex * chunkSize
    const end = Math.min(start + chunkSize, totalBytes)
    const chunkSlice = options.blob.slice(start, end)
    const offset = start

    let success = false
    let lastError: Error | null = null
    const maxRetries = options.maxRetries || 3

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const headers: Record<string, string> = {
          'x-filename': encodeURIComponent(options.filename),
          'x-chunk-index': String(chunkIndex),
          'x-total-chunks': String(totalChunks),
          'x-chunk-offset': String(offset),
          'x-total-size': String(totalBytes),
        }
        if (options.packName) {
          headers['x-pack-name'] = encodeURIComponent(options.packName)
        }
        if (options.subFolder) {
          headers['x-subfolder'] = encodeURIComponent(options.subFolder)
        }

        const res = await fetch('/__api/save-file-chunk', {
          method: 'POST',
          headers,
          body: chunkSlice,
        })

        if (!res.ok) {
          const errText = await res.text().catch(() => '')
          throw new Error(
            `HTTP ${res.status} (${res.statusText || 'Error'}): ${errText || 'Chunk upload failed'}`,
          )
        }

        const data = await res.json()
        if (!data || !data.success) {
          throw new Error(data?.error || 'Server rejected file chunk')
        }

        finalResponseData = data
        success = true
        break
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err))
        if (attempt < maxRetries) {
          // Exponential backoff: 250ms, 500ms, 1000ms
          await new Promise((resolve) => setTimeout(resolve, 250 * Math.pow(2, attempt - 1)))
        }
      }
    }

    if (!success) {
      throw new Error(
        `Failed to upload chunk ${chunkIndex + 1}/${totalChunks} of "${options.filename}": ${
          lastError?.message || 'Network error'
        }`,
      )
    }

    if (options.onProgress) {
      const loadedBytes = end
      const percent = Math.min(100, Math.round((loadedBytes / totalBytes) * 100))
      options.onProgress({
        filename: options.filename,
        loadedBytes,
        totalBytes,
        percent,
        chunkIndex,
        totalChunks,
      })
    }
  }

  if (!finalResponseData) {
    throw new Error(`Upload of "${options.filename}" completed without server response`)
  }

  return finalResponseData
}

/**
 * Save an individual exported MP4 directly to the server's exports/single folder on disk.
 * Uses resilient chunked uploading to support cloud environments & reverse proxies.
 */
export async function saveSingleExportToServer(
  blob: Blob,
  filename: string,
  onProgress?: (progress: ChunkUploadProgress) => void,
): Promise<SaveExportResult> {
  try {
    const uploadRes = await uploadBlobInChunks({
      blob,
      filename,
      subFolder: 'single',
      onProgress,
    })

    const cliCommand = buildUploaderCliCommand({
      filePath: uploadRes.filePath,
      folderPath: uploadRes.folderPath,
    })

    return {
      success: true,
      folderPath: uploadRes.folderPath,
      filePath: uploadRes.filePath,
      filename: uploadRes.filename,
      cliCommand,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Save single export failed'
    return {
      success: false,
      folderPath: 'exports/single',
      error: message,
    }
  }
}

/**
 * Save an entire bulk batch (videos + manifest.json) directly into exports/<packName>/ on disk.
 * Uses 512KB chunk slices to bypass any reverse proxy body size limits in Codespaces/cloud.
 */
export async function saveBulkPackToServer(
  packName: string,
  items: Array<{ filename: string; blob: Blob }>,
  manifestContent: string,
  onProgress?: BulkSaveProgressCallback,
): Promise<SaveExportResult> {
  const cleanPackName = packName.replace(/[^\w.-]+/g, '_')
  let savedFolder = `exports/${cleanPackName}`
  let manifestPath = `${savedFolder}/manifest.json`

  try {
    const totalFiles = items.length

    // 1. Save manifest.json first
    if (onProgress) {
      onProgress(0, {
        percent: 0,
        currentFile: 'manifest.json',
        fileIndex: 0,
        totalFiles: totalFiles + 1,
        statusText: 'Saving manifest.json to server disk...',
      })
    }

    const manifestBlob = new Blob([manifestContent], { type: 'application/json' })
    const manifestUpload = await uploadBlobInChunks({
      blob: manifestBlob,
      filename: 'manifest.json',
      packName: cleanPackName,
    })
    savedFolder = manifestUpload.folderPath
    manifestPath = manifestUpload.filePath

    // 2. Save each video file using chunked upload with detailed progress
    for (let i = 0; i < totalFiles; i++) {
      const item = items[i]
      const fileIndex = i + 1

      await uploadBlobInChunks({
        blob: item.blob,
        filename: item.filename,
        packName: cleanPackName,
        onProgress: (chunkProg) => {
          if (onProgress) {
            const overallFraction = (i + chunkProg.percent / 100) / totalFiles
            const overallPercent = Math.min(99, Math.round(overallFraction * 100))
            onProgress(overallPercent, {
              percent: overallPercent,
              currentFile: item.filename,
              fileIndex,
              totalFiles,
              statusText: `Saving ${fileIndex}/${totalFiles}: ${item.filename} (${chunkProg.percent}%)...`,
            })
          }
        },
      })
    }

    if (onProgress) {
      onProgress(100, {
        percent: 100,
        currentFile: '',
        fileIndex: totalFiles,
        totalFiles,
        statusText: `All ${totalFiles} reels saved to disk.`,
      })
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
