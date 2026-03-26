import { useState, useEffect, useCallback, useRef } from 'react'
import { getToken } from './useAuth'

const REFRESH_INTERVAL = 30000 // 30 seconds

function authHeaders() {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export function useApi(path, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const isFirstLoad = useRef(true)

  const refetch = useCallback(() => {
    if (!path) { setLoading(false); return }
    // Only show loading spinner on first load
    if (isFirstLoad.current) setLoading(true)
    fetch(path, { headers: authHeaders() })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json() })
      .then(d => { setData(d); setError(null); isFirstLoad.current = false })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [path, ...deps])

  useEffect(() => {
    isFirstLoad.current = true
    refetch()
  }, [refetch])

  // Auto-refresh every 30s (silent — no spinner)
  useEffect(() => {
    if (!path) return
    const id = setInterval(refetch, REFRESH_INTERVAL)
    return () => clearInterval(id)
  }, [path, refetch])

  return { data, loading, error, refetch }
}

export async function apiFetch(path, options = {}) {
  const r = await fetch(path, {
    ...options,
    headers: { ...authHeaders(), ...options.headers },
  })
  if (!r.ok) throw new Error(r.status)
  return r.json()
}
