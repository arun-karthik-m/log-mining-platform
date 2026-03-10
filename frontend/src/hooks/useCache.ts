import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Simple in-memory cache shared across all components.
 * Survives route changes but not full page reloads.
 */
const cache = new Map<string, { data: unknown; timestamp: number }>()

interface UseCachedFetchResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Hook that returns cached data instantly on mount, then
 * fetches fresh data in the background. No loading skeleton
 * if cached data exists.
 *
 * @param key - Unique cache key for this data
 * @param fetcher - Async function that returns the data
 * @param options - Configuration options
 */
export function useCachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: {
    /** Time-to-live in ms before cached data is considered stale (default: 60s) */
    ttl?: number
    /** Dependencies that invalidate the cache when changed */
    deps?: unknown[]
  },
): UseCachedFetchResult<T> {
  const ttl = options?.ttl ?? 60000
  const deps = options?.deps ?? []

  // Build a compound key from the base key + deps
  const compoundKey = key + (deps.length > 0 ? ':' + JSON.stringify(deps) : '')

  // Initialize from cache synchronously
  const getCached = (): T | null => {
    const entry = cache.get(compoundKey)
    if (entry && Date.now() - entry.timestamp < ttl) {
      return entry.data as T
    }
    return null
  }

  const [data, setData] = useState<T | null>(getCached)
  const [loading, setLoading] = useState<boolean>(data === null)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  const doFetch = useCallback(async () => {
    try {
      const result = await fetcher()
      if (mountedRef.current) {
        cache.set(compoundKey, { data: result, timestamp: Date.now() })
        setData(result)
        setError(null)
        setLoading(false)
      }
    } catch (err: any) {
      if (mountedRef.current) {
        setError(err?.message || 'Fetch failed')
        setLoading(false)
      }
    }
  }, [compoundKey])

  useEffect(() => {
    mountedRef.current = true

    // If we have fresh cache, still fetch in background but don't show loading
    const cached = getCached()
    if (cached !== null) {
      setData(cached)
      setLoading(false)
      // Background refresh
      doFetch()
    } else {
      setLoading(true)
      doFetch()
    }

    return () => {
      mountedRef.current = false
    }
  }, [compoundKey])

  const refetch = useCallback(async () => {
    setLoading(true)
    await doFetch()
  }, [doFetch])

  return { data, loading, error, refetch }
}

/**
 * Invalidate a specific cache key or all keys matching a prefix.
 */
export function invalidateCache(keyOrPrefix?: string) {
  if (!keyOrPrefix) {
    cache.clear()
    return
  }
  for (const k of cache.keys()) {
    if (k === keyOrPrefix || k.startsWith(keyOrPrefix + ':')) {
      cache.delete(k)
    }
  }
}
