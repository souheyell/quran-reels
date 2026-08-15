import { useCallback, useEffect, useRef, useState } from 'react'
import type { Verse } from '../types'
import { fetchVerses, fetchRandomVerses, DEFAULT_RECITER_ID } from '../api/quran'

interface UseVerseLoaderOptions {
  initialSurah: number
  initialAyat: number
  initialEditionId: string
  initialReciterId?: string
}

export function useVerseLoader(options: UseVerseLoaderOptions) {
  const [verses, setVerses] = useState<Verse[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editionId, setEditionId] = useState(options.initialEditionId)
  const [reciterId, setReciterId] = useState(options.initialReciterId || DEFAULT_RECITER_ID)
  const activeRequestIdRef = useRef(0)
  const mountedRef = useRef(false)

  const handleLoad = useCallback(
    async (fn: (signal: AbortSignal) => Promise<Verse[]>) => {
      const requestId = ++activeRequestIdRef.current
      const controller = new AbortController()

      setError(null)
      setLoading(true)

      // 10 second timeout safety
      const timeoutId = setTimeout(() => {
        if (activeRequestIdRef.current === requestId) {
          controller.abort()
        }
      }, 10000)

      try {
        const result = await fn(controller.signal)
        if (activeRequestIdRef.current === requestId) {
          setVerses(result)
        }
      } catch (e) {
        if (activeRequestIdRef.current === requestId) {
          if (e instanceof DOMException && e.name === 'AbortError') {
            setError('Request timed out. Please try again.')
          } else {
            setError(e instanceof Error ? e.message : 'Failed to load verse')
          }
        }
      } finally {
        clearTimeout(timeoutId)
        if (activeRequestIdRef.current === requestId) {
          setLoading(false)
        }
      }
    },
    [],
  )

  const loadRange = useCallback(
    (surah: number, startAyat: number, count: number, edition?: string, reciter?: string) => {
      const eid = edition ?? editionId
      const rid = reciter ?? reciterId
      if (edition) setEditionId(edition)
      if (reciter) setReciterId(reciter)
      return handleLoad((signal) => fetchVerses(surah, startAyat, count, eid, rid, signal))
    },
    [handleLoad, editionId, reciterId],
  )

  const loadRandom = useCallback(
    (count?: number) => {
      const safeCount =
        typeof count === 'number' && Number.isFinite(count) && count > 0
          ? Math.floor(count)
          : (verses.length > 0 ? verses.length : 1)
      return handleLoad((signal) => fetchRandomVerses(safeCount, editionId, reciterId, signal))
    },
    [handleLoad, editionId, reciterId, verses.length],
  )

  const changeEdition = useCallback(
    (newEditionId: string) => {
      setEditionId(newEditionId)
      if (verses.length > 0) {
        const first = verses[0]
        const count = verses.length
        return handleLoad((signal) =>
          fetchVerses(first.surah, first.ayat, count, newEditionId, reciterId, signal),
        )
      }
    },
    [handleLoad, verses, reciterId],
  )

  const changeReciter = useCallback(
    (newReciterId: string) => {
      setReciterId(newReciterId)
      if (verses.length > 0) {
        const first = verses[0]
        const count = verses.length
        return handleLoad((signal) =>
          fetchVerses(first.surah, first.ayat, count, editionId, newReciterId, signal),
        )
      }
    },
    [handleLoad, verses, editionId],
  )

  // Load initial verse on mount
  useEffect(() => {
    if (mountedRef.current) return
    mountedRef.current = true
    void loadRange(options.initialSurah, options.initialAyat, 1)
  }, [loadRange, options.initialSurah, options.initialAyat])

  return {
    verses,
    loading,
    error,
    editionId,
    reciterId,
    loadRange,
    loadRandom,
    changeEdition,
    changeReciter,
  }
}
