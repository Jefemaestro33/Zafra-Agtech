import { useState, useEffect, useCallback } from 'react'

export function useApi(path, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = useCallback(() => {
    if (!path) { setLoading(false); return }
    setLoading(true)
    fetch(path)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json() })
      .then(d => { setData(d); setError(null) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [path, ...deps])

  useEffect(() => { refetch() }, [refetch])

  return { data, loading, error, refetch }
}

export async function apiFetch(path) {
  const r = await fetch(path)
  if (!r.ok) throw new Error(r.status)
  return r.json()
}
