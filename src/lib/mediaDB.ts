export interface StoredMediaRecord {
  id: string
  title: string
  blob: Blob
  thumb: string // base64 thumbnail
  mediaType: 'image' | 'video'
  sizeLabel: string
  createdAt: number
}

export interface LiveUserMedia {
  id: string
  title: string
  url: string // fresh live blob URL
  thumb: string
  mediaType: 'image' | 'video'
  sizeLabel: string
  createdAt: number
}

const DB_NAME = 'QuranReelsMediaVault_v1'
const STORE_NAME = 'media_files'
const DB_VERSION = 1

let dbPromise: Promise<IDBDatabase> | null = null

function getDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB not supported in this environment'))
  }

  if (dbPromise) return dbPromise

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }

    req.onsuccess = () => {
      resolve(req.result)
    }

    req.onerror = () => {
      reject(req.error)
    }
  })

  return dbPromise
}

// Runtime active blob URLs map so we reuse URLs without leaking memory
const liveBlobUrls = new Map<string, string>()

/**
 * Store a custom uploaded file permanently in IndexedDB
 */
export async function saveMediaToVault(
  file: File | Blob,
  title: string,
  mediaType: 'image' | 'video',
  thumb: string,
  sizeLabel: string,
  id?: string,
): Promise<LiveUserMedia> {
  const db = await getDB()
  const mediaId = id || `vault-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

  const record: StoredMediaRecord = {
    id: mediaId,
    title: title || 'Custom Footage',
    blob: file,
    thumb,
    mediaType,
    sizeLabel,
    createdAt: Date.now(),
  }

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.put(record)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })

  // Create fresh live blob URL
  const prevUrl = liveBlobUrls.get(mediaId)
  if (prevUrl) {
    try {
      URL.revokeObjectURL(prevUrl)
    } catch {}
  }

  const liveUrl = URL.createObjectURL(file)
  liveBlobUrls.set(mediaId, liveUrl)

  return {
    id: mediaId,
    title: record.title,
    url: liveUrl,
    thumb: record.thumb,
    mediaType: record.mediaType,
    sizeLabel: record.sizeLabel,
    createdAt: record.createdAt,
  }
}

/**
 * Retrieve all user media from IndexedDB with live, refreshed Blob URLs
 */
export async function getAllVaultMedia(): Promise<LiveUserMedia[]> {
  try {
    const db = await getDB()
    const records = await new Promise<StoredMediaRecord[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.getAll()
      req.onsuccess = () => resolve(req.result || [])
      req.onerror = () => reject(req.error)
    })

    // Sort newest first
    records.sort((a, b) => b.createdAt - a.createdAt)

    return records.map((rec) => {
      let liveUrl = liveBlobUrls.get(rec.id)
      if (!liveUrl) {
        liveUrl = URL.createObjectURL(rec.blob)
        liveBlobUrls.set(rec.id, liveUrl)
      }
      return {
        id: rec.id,
        title: rec.title,
        url: liveUrl,
        thumb: rec.thumb,
        mediaType: rec.mediaType,
        sizeLabel: rec.sizeLabel,
        createdAt: rec.createdAt,
      }
    })
  } catch (err) {
    console.warn('Could not read from IndexedDB media vault:', err)
    return []
  }
}

/**
 * Get a single media item's live URL by its vault ID
 */
export async function getVaultMediaLiveUrl(id: string): Promise<string | null> {
  const currentLive = liveBlobUrls.get(id)
  if (currentLive) return currentLive

  try {
    const db = await getDB()
    const record = await new Promise<StoredMediaRecord | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.get(id)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => reject(req.error)
    })

    if (!record || !record.blob) return null

    const liveUrl = URL.createObjectURL(record.blob)
    liveBlobUrls.set(id, liveUrl)
    return liveUrl
  } catch {
    return null
  }
}

/**
 * Delete a media item permanently from IndexedDB
 */
export async function deleteVaultMedia(id: string): Promise<void> {
  const liveUrl = liveBlobUrls.get(id)
  if (liveUrl) {
    try {
      URL.revokeObjectURL(liveUrl)
    } catch {}
    liveBlobUrls.delete(id)
  }

  try {
    const db = await getDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.delete(id)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } catch (err) {
    console.warn('Failed to delete media from vault:', err)
  }
}
