export interface LocalImageItem {
  id: string
  title: string
  filename: string
  url: string
  thumb?: string
  mediaType: 'image'
  sizeLabel?: string
}

export interface LocalVideoItem {
  id: string
  title: string
  filename: string
  url: string
  thumb?: string
  mediaType: 'video'
  sizeLabel?: string
}

export type LocalMediaItem = LocalImageItem | LocalVideoItem

export interface LocalMediaCatalog {
  images: LocalImageItem[]
  videos: LocalVideoItem[]
  folderPath: string
}

/**
 * Fetch the current list of local background images and videos directly from the local folder.
 * In development, queries Vite dev server live middleware.
 * In static preview/production, falls back to the static /backgrounds/manifest.json.
 */
export async function fetchLocalMedia(): Promise<LocalMediaCatalog> {
  // 1. Try live Vite dev server endpoint
  try {
    const res = await fetch('/__api/local-media')
    if (res.ok) {
      const data = (await res.json()) as LocalMediaCatalog
      if (Array.isArray(data.images) && Array.isArray(data.videos)) {
        return data
      }
    }
  } catch {
    // Ignore dev server fetch error and fallback to static manifest
  }

  // 2. Fallback to static manifest.json bundled in public/backgrounds
  try {
    const res = await fetch('/backgrounds/manifest.json')
    if (res.ok) {
      const data = (await res.json()) as LocalMediaCatalog
      if (Array.isArray(data.images) && Array.isArray(data.videos)) {
        return data
      }
    }
  } catch {
    // Ignore
  }

  return {
    images: [],
    videos: [],
    folderPath: 'public/backgrounds',
  }
}

/**
 * Trigger opening the backgrounds folder in Finder on macOS (when running local dev server).
 */
export async function openBackgroundsFolder(): Promise<{ success: boolean; folderPath: string; error?: string }> {
  try {
    const res = await fetch('/__api/open-folder', { method: 'POST' })
    if (res.ok) {
      return (await res.json()) as { success: boolean; folderPath: string; error?: string }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Dev server unavailable'
    return { success: false, folderPath: 'public/backgrounds', error: message }
  }

  return { success: false, folderPath: 'public/backgrounds' }
}

/**
 * Upload a media file directly to public/backgrounds/images or public/backgrounds/videos on disk.
 */
export async function uploadLocalMedia(file: File): Promise<{
  success: boolean
  url?: string
  filename?: string
  mediaType?: 'image' | 'video'
  error?: string
}> {
  const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(file.name)
  try {
    const res = await fetch('/__api/upload-media', {
      method: 'POST',
      headers: {
        'x-filename': encodeURIComponent(file.name),
        'x-media-type': isVideo ? 'video' : 'image',
      },
      body: file,
    })
    if (res.ok) {
      return (await res.json()) as {
        success: boolean
        url: string
        filename: string
        mediaType: 'image' | 'video'
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    return { success: false, error: message }
  }

  return { success: false, error: 'Failed to upload to local folder' }
}
