import { useState } from 'react'
import { Leaf, Eye, EyeOff, Loader2, AlertTriangle } from 'lucide-react'

export default function LoginView({ onLogin }) {
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [shake, setShake] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!usuario.trim() || !password.trim()) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: usuario.trim().toLowerCase(), password }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || 'Error de autenticación')
      }

      const data = await res.json()
      onLogin(data)
    } catch (err) {
      setError(err.message)
      setShake(true)
      setTimeout(() => setShake(false), 600)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--color-surface-0)' }}
    >
      {/* Background glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 600px 400px at 50% 40%, rgba(16,185,129,0.06) 0%, transparent 70%)',
        }}
      />

      <div
        className={`relative w-full max-w-sm animate-in ${shake ? 'animate-shake' : ''}`}
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{
              background: 'var(--color-glow-green)',
              border: '1px solid var(--color-accent-green-dim)',
              boxShadow: '0 0 40px rgba(16,185,129,0.15)',
            }}
          >
            <Leaf size={28} style={{ color: 'var(--color-accent-green)' }} />
          </div>
          <h1
            className="text-xl font-bold tracking-tight"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Zafra
          </h1>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-6"
          style={{
            background: 'var(--color-surface-1)',
            border: '1px solid var(--color-border)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}
        >
          <h2
            className="text-sm font-semibold mb-5"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Iniciar sesión
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Usuario */}
            <div>
              <label
                className="block text-[11px] font-medium mb-1.5 uppercase tracking-wider"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Usuario
              </label>
              <input
                type="text"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="Usuario"
                autoComplete="username"
                autoFocus
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-all duration-200"
                style={{
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--color-accent-green)'
                  e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.1)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--color-border)'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>

            {/* Password */}
            <div>
              <label
                className="block text-[11px] font-medium mb-1.5 uppercase tracking-wider"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl text-sm outline-none transition-all duration-200"
                  style={{
                    background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--color-accent-green)'
                    e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.1)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--color-border)'
                    e.target.style.boxShadow = 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5"
                  style={{ color: 'var(--color-text-muted)' }}
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs"
                style={{
                  background: 'var(--color-glow-red)',
                  border: '1px solid var(--color-accent-red-dim)',
                  color: 'var(--color-accent-red)',
                }}
              >
                <AlertTriangle size={14} />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !usuario.trim() || !password.trim()}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2"
              style={{
                background: loading ? 'var(--color-accent-green-dim)' : 'var(--color-accent-green)',
                color: '#fff',
                opacity: (!usuario.trim() || !password.trim()) ? 0.5 : 1,
                cursor: loading ? 'wait' : 'pointer',
              }}
              onMouseEnter={(e) => {
                if (!loading) e.target.style.boxShadow = '0 0 20px rgba(16,185,129,0.3)'
              }}
              onMouseLeave={(e) => {
                e.target.style.boxShadow = 'none'
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Verificando...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>
        </div>

      </div>

      {/* Shake animation */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
        .animate-shake { animation: shake 0.5s ease-in-out; }
      `}</style>
    </div>
  )
}
