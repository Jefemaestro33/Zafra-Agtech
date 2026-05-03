import { useState, useEffect, useCallback } from 'react'
import { Shield, RefreshCw, MapPin, Globe, Monitor, Check, X, Loader2 } from 'lucide-react'
import { apiFetch } from '../hooks/useApi'

function formatTs(iso) {
  try {
    const d = new Date(iso)
    return d.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'medium' })
  } catch {
    return iso
  }
}

function shortUA(ua) {
  if (!ua) return '—'
  // Pick a coarse browser/OS hint without showing the full string
  const m = ua.match(/(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/)
  const os = ua.match(/\(([^)]+)\)/)?.[1]?.split(';')[0]?.trim()
  return [m?.[0]?.split('/')[0], os].filter(Boolean).join(' · ') || ua.slice(0, 60)
}

export default function AccesosView() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch('/api/auth/logs?limit=200')
      setLogs(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-4 animate-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--color-glow-green)', border: '1px solid var(--color-accent-green-dim)' }}>
            <Shield size={16} style={{ color: 'var(--color-accent-green)' }} />
          </div>
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>Accesos</h2>
            <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
              Audit log de inicios de sesión — quién entra, desde dónde, cuándo.
            </p>
          </div>
        </div>
        <button onClick={load}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors"
          style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refrescar
        </button>
      </div>

      {error && (
        <div className="px-3 py-2 rounded-xl text-xs"
          style={{ background: 'var(--color-glow-red)', color: 'var(--color-accent-red)', border: '1px solid var(--color-accent-red-dim)' }}>
          {error}
        </div>
      )}

      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)' }}>
                <th className="text-left px-4 py-2.5 font-semibold uppercase tracking-wider text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Fecha</th>
                <th className="text-left px-4 py-2.5 font-semibold uppercase tracking-wider text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Usuario</th>
                <th className="text-left px-4 py-2.5 font-semibold uppercase tracking-wider text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Rol</th>
                <th className="text-left px-4 py-2.5 font-semibold uppercase tracking-wider text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Ubicación</th>
                <th className="text-left px-4 py-2.5 font-semibold uppercase tracking-wider text-[10px]" style={{ color: 'var(--color-text-muted)' }}>IP</th>
                <th className="text-left px-4 py-2.5 font-semibold uppercase tracking-wider text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Navegador</th>
                <th className="text-left px-4 py-2.5 font-semibold uppercase tracking-wider text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {loading && logs.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center" style={{ color: 'var(--color-text-muted)' }}>
                  <Loader2 size={18} className="animate-spin inline-block mr-2" />Cargando…
                </td></tr>
              )}
              {!loading && logs.length === 0 && !error && (
                <tr><td colSpan={7} className="px-4 py-10 text-center" style={{ color: 'var(--color-text-muted)' }}>
                  Sin accesos aún.
                </td></tr>
              )}
              {logs.map(row => (
                <tr key={row.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                  <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--color-text-primary)' }}>{formatTs(row.ts)}</td>
                  <td className="px-4 py-2.5 font-semibold" style={{ color: 'var(--color-text-primary)' }}>{row.usuario}</td>
                  <td className="px-4 py-2.5">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider"
                      style={{
                        background: row.rol === 'admin' ? 'rgba(245,158,11,0.12)'
                          : row.rol === 'agronomo' ? 'rgba(16,185,129,0.12)'
                          : 'rgba(99,102,241,0.12)',
                        color: row.rol === 'admin' ? 'var(--color-accent-amber)'
                          : row.rol === 'agronomo' ? 'var(--color-accent-green)'
                          : 'var(--color-accent-blue, #818cf8)',
                      }}>
                      {row.rol || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5" style={{ color: 'var(--color-text-primary)' }}>
                    {row.country ? (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin size={11} style={{ color: 'var(--color-text-muted)' }} />
                        {[row.city, row.country].filter(Boolean).join(', ')}
                      </span>
                    ) : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                    {row.ip || '—'}
                    {row.org && <div className="text-[10px] mt-0.5">{row.org}</div>}
                  </td>
                  <td className="px-4 py-2.5" style={{ color: 'var(--color-text-muted)' }}>
                    <span className="inline-flex items-center gap-1.5">
                      <Monitor size={11} />
                      {shortUA(row.user_agent)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {row.success ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: 'var(--color-accent-green)' }}>
                        <Check size={12} /> ok
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: 'var(--color-accent-red)' }}>
                        <X size={12} /> falló
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
        <Globe size={10} className="inline-block mr-1 -mt-0.5" />
        Geolocalización aproximada vía ip-api.com — exactitud ~ciudad. IP privadas no se geolocalizan.
      </p>
    </div>
  )
}
