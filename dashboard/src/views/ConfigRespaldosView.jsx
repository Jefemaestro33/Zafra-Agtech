import { useState, useEffect } from 'react'
import { getToken } from '../hooks/useAuth'
import {
  DatabaseBackup, Download, HardDrive, Server, Check, X,
  Loader2, Clock, Shield, RefreshCw, FileDown, AlertTriangle,
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

function SectionCard({ title, icon: Icon, color, glowColor, children }) {
  return (
    <div
      className="rounded-2xl p-5 animate-in"
      style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: glowColor, border: `1px solid ${color}33` }}
        >
          <Icon size={20} style={{ color }} />
        </div>
        <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{title}</h3>
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

function ExportButton({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-left transition-colors"
      style={{
        background: 'var(--color-surface-1)',
        border: '1px solid var(--color-border)',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-3)'; e.currentTarget.style.borderColor = 'var(--color-accent-green)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-surface-1)'; e.currentTarget.style.borderColor = 'var(--color-border)' }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: 'var(--color-accent-green-dim)', border: '1px solid rgba(16,185,129,0.2)' }}
      >
        <Icon size={16} style={{ color: 'var(--color-accent-green)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>{label}</p>
      </div>
      <Download size={14} style={{ color: 'var(--color-text-muted)' }} />
    </button>
  )
}

// ── Main view ──

export default function ConfigRespaldosView() {
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [verificacion, setVerificacion] = useState(null)

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchHealth = () => {
    fetch('/api/health', { headers: authHeaders() })
      .then(r => {
        if (!r.ok) throw new Error(r.status)
        return r.json()
      })
      .then(data => {
        setHealth(data)
        setVerificacion(new Date().toLocaleString('es-MX', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit', second: '2-digit',
        }))
      })
      .catch(() => {
        setHealth(null)
        showToast('error', 'No se pudo verificar el estado de la base de datos')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchHealth() }, [])

  const dbOk = health && (health.status === 'ok' || health.status === 'healthy')
  const lecturas = health?.lecturas ?? health?.readings_count ?? health?.total_lecturas ?? '—'

  const handleExport = (label) => {
    showToast('success', `Proximamente: exportar ${label}`)
  }

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
          Respaldos
        </h2>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Estado de los respaldos y herramientas de exportacion de datos.
        </p>
      </div>

      {/* Respaldos automaticos */}
      <SectionCard
        title="Respaldos automaticos"
        icon={DatabaseBackup}
        color="var(--color-accent-green)"
        glowColor="var(--color-glow-green)"
      >
        <div
          className="rounded-xl p-4 space-y-1"
          style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <StatusDot ok={true} />
            <span className="text-xs font-semibold" style={{ color: 'var(--color-accent-green)' }}>
              Activos — gestionados por Railway
            </span>
          </div>
          <InfoRow icon={Clock} label="Frecuencia" value="Diario" />
          <InfoRow icon={Shield} label="Retencion" value="7 dias" />
        </div>
        <p className="text-[11px] mt-3 px-1" style={{ color: 'var(--color-text-muted)' }}>
          Railway realiza respaldos automaticos de PostgreSQL. No requiere configuracion.
        </p>
      </SectionCard>

      {/* Exportar datos */}
      <SectionCard
        title="Exportar datos"
        icon={Download}
        color="var(--color-accent-cyan)"
        glowColor="var(--color-glow-cyan)"
      >
        <div className="space-y-2">
          <ExportButton
            icon={HardDrive}
            label="Exportar lecturas (CSV)"
            onClick={() => handleExport('lecturas')}
          />
          <ExportButton
            icon={AlertTriangle}
            label="Exportar alertas (CSV)"
            onClick={() => handleExport('alertas')}
          />
          <ExportButton
            icon={FileDown}
            label="Exportar firma hidrica (CSV)"
            onClick={() => handleExport('firma hidrica')}
          />
        </div>
        <p className="text-[11px] mt-3 px-1" style={{ color: 'var(--color-text-muted)' }}>
          Descarga datos del sistema en formato CSV para analisis externo.
        </p>
      </SectionCard>

      {/* Estado de la base de datos */}
      <SectionCard
        title="Estado de la base de datos"
        icon={Server}
        color="var(--color-accent-amber)"
        glowColor="var(--color-glow-amber)"
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
          <InfoRow label="Lecturas totales" value={lecturas} />
          <InfoRow icon={Clock} label="Ultima verificacion" value={verificacion || '—'} />
        </div>
        <div className="mt-3">
          <button
            onClick={() => { setLoading(true); fetchHealth() }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
            style={{
              background: 'var(--color-surface-3)',
              color: 'var(--color-text-muted)',
              border: '1px solid var(--color-border)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-4)'; e.currentTarget.style.color = 'var(--color-text-primary)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-surface-3)'; e.currentTarget.style.color = 'var(--color-text-muted)' }}
          >
            <RefreshCw size={14} />
            Verificar ahora
          </button>
        </div>
      </SectionCard>
    </div>
  )
}
