import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

const STORAGE_KEY = 'agtech_auth'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Restaurar sesión de localStorage al montar
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        // Verificar que el token siga siendo válido
        fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${parsed.token}` },
        })
          .then((r) => {
            if (r.ok) {
              setUser(parsed)
            } else {
              localStorage.removeItem(STORAGE_KEY)
            }
          })
          .catch(() => localStorage.removeItem(STORAGE_KEY))
          .finally(() => setLoading(false))
      } catch {
        localStorage.removeItem(STORAGE_KEY)
        setLoading(false)
      }
    } else {
      setLoading(false)
    }
  }, [])

  const login = (data) => {
    setUser(data)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function getToken() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored).token
  } catch {}
  return null
}
