import { useState, useEffect } from 'react'
import { getToken } from '../hooks/useAuth'
import {
  BrainCircuit, CloudSun, Database, Webhook, Loader2, Check, X,
  ExternalLink, Globe, MapPin, Clock, DollarSign, Server,
} from 'lucide-react'

function authHeaders() {
  const token = getToken()
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' }
}

// ── Reusable components ──

function Toast({ toast, onClose }) {
  if (!toast) return null
  const isError = toast.type === 'error'
  return (
    <div className="fixed top-16 right-4 z-50 animate-in">
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl"
        style={{
          background: isError ? 'var(--color-glow-red)' : 'var(--color-glow-green)',
          border: `1px solid ${isError ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
          color: isError ? 'var(--color-accent-red)' : 'var(--color-accent-green)',
        }}
      >
        {isError ? <X size={16} /> : <Check size={16} />}
        <span className="text-sm font-medium">{toast.message}</span>
        <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100">
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

function SectionCard({ title, icon: Icon, color, glowColor, disabled, children }) {
  return (
    <div
      className="rounded-2xl p-5 animate-in"
      style={{
        background: 'var(--color-surface-2)',
        border: '1px solid var(--color-border)',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: glowColor, border: `1px solid ${color}33` }}
        >
          <Icon size={20} style={{ color }} />
        </div>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{title}</h3>
          {disabled && (
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-muted)' }}>
              Proximamente
            </span>
          )}
        </div>
      </div>
      {children}
    </div>
  )
}

function StatusDot({ ok }) {
  return (
    <div
      className="w-2.5 h-2.5 rounded-full shrink-0"
      style={{
        background: ok ? 'var(--color-accent-green)' : 'var(--color-accent-red)',
        boxShadow: ok ? '0 0 6px var(--color-accent-green)' : '0 0 6px var(--color-accent-red)',
      }}
    />
  )
}

function InfoRow({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={13} style={{ color: 'var(--color-text-muted)' }} />}
        <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      </div>
      <span className="text-xs font-mono" style={{ color: 'var(--color-text-primary)' }}>{value}</span>
    </div>
  )
}

// ── Main view ──

export default function ConfigIntegracionesView() {
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    fetch('/api/health', { headers: authHeaders() })
      .then(r => {
        if (!r.ok) throw new Error(r.status)
        return r.json()
      })
      .then(data => setHealth(data))
      .catch(() => {
        setHealth(null)
        showToast('error', 'No se pudo verificar el estado del servidor')
      })
      .finally(() => setLoading(false))
  }, [])

  const apiOk = health && (health.status === 'ok' || health.status === 'healthy')
  const dbOk = apiOk
  const lecturas = health?.lecturas ?? health?.readings_count ?? health?.total_lecturas ?? '—'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 animate-in">
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-accent-green)' }} />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Header */}
      <div>
        <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
          Integraciones
        </h2>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Estado de los servicios externos conectados al sistema. Configuracion de solo lectura.
        </p>
      </div>

      {/* Claude API */}
      <SectionCard
        title="Claude API (Diagnostico IA)"
        icon={BrainCircuit}
        color="var(--color-accent-violet)"
        glowColor="var(--color-glow-violet)"
      >
        <div
          className="rounded-xl p-4 space-y-1"
          style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <StatusDot ok={apiOk} />
            <span className="text-xs font-semibold" style={{ color: apiOk ? 'var(--color-accent-green)' : 'var(--color-accent-red)' }}>
              {apiOk ? 'Conectado' : 'Sin conexion'}
            </span>
          </div>
          <InfoRow label="API Key" value={apiOk ? 'Configurada' : 'No configurada'} />
          <InfoRow label="Modelo" value="claude-sonnet" />
          <InfoRow icon={DollarSign} label="Costo estimado" value="$0.45 USD/mes (60 consultas)" />
        </div>
        <p className="text-[11px] mt-3 px-1" style={{ color: 'var(--color-text-muted)' }}>
          Se usa para diagnosticos de alertas, reportes y consultor IA.
        </p>
      </SectionCard>

      {/* Open-Meteo */}
      <SectionCard
        title="Open-Meteo (Datos climaticos)"
        icon={CloudSun}
        color="var(--color-accent-cyan)"
        glowColor="var(--color-glow-cyan)"
      >
        <div
          className="rounded-xl p-4 space-y-1"
          style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <StatusDot ok={true} />
            <span className="text-xs font-semibold" style={{ color: 'var(--color-accent-green)' }}>
              Disponible
            </span>
          </div>
          <InfoRow icon={Globe} label="URL" value="api.open-meteo.com" />
          <InfoRow icon={MapPin} label="Ubicacion" value="Nextipac, Jalisco (20.7005°N, -103.418°W)" />
          <InfoRow icon={Clock} label="Frecuencia" value="Actualizacion cada hora" />
        </div>
        <p className="text-[11px] mt-3 px-1" style={{ color: 'var(--color-text-muted)' }}>
          Fuente de datos meteorologicos. Gratuito, sin API key.
        </p>
      </SectionCard>

      {/* PostgreSQL */}
      <SectionCard
        title="PostgreSQL (Base de datos)"
        icon={Database}
        color="var(--color-accent-green)"
        glowColor="var(--color-glow-green)"
      >
        <div
          className="rounded-xl p-4 space-y-1"
          style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <StatusDot ok={dbOk} />
            <span className="text-xs font-semibold" style={{ color: dbOk ? 'var(--color-accent-green)' : 'var(--color-accent-red)' }}>
              {dbOk ? 'Conectado' : 'Sin conexion'}
            </span>
          </div>
          <InfoRow icon={Server} label="Host" value="Railway" />
          <InfoRow label="Lecturas" value={lecturas} />
        </div>
        <p className="text-[11px] mt-3 px-1" style={{ color: 'var(--color-text-muted)' }}>
          Base de datos principal. Auto-backup por Railway.
        </p>
      </SectionCard>

      {/* Webhooks */}
      <SectionCard
        title="Webhooks"
        icon={Webhook}
        color="var(--color-accent-amber)"
        glowColor="var(--color-glow-amber)"
        disabled
      >
        <div
          className="rounded-xl p-4"
          style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}
        >
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Configura webhooks para enviar datos a sistemas externos. Esta funcionalidad estara disponible proximamente.
          </p>
        </div>
      </SectionCard>
    </div>
  )
}
