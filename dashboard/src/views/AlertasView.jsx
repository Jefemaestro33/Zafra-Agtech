import { useState } from 'react'
import { useApi } from '../hooks/useApi'
import { Bell, Calendar, BarChart3, CheckCircle, BrainCircuit, Send, FileText, Copy, Check, Loader2, ShieldAlert, Droplets, WifiOff, BatteryWarning } from 'lucide-react'
import KpiCard from '../components/KpiCard'
import EmptyState from '../components/EmptyState'
import Loading from '../components/Loading'

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  return `hace ${days}d`
}

const alertConfig = {
  alerta_phytophthora: {
    border: 'var(--color-accent-red)',
    bg: 'var(--color-glow-red)',
    Icon: ShieldAlert,
    label: 'Alerta Phytophthora',
  },
  necesita_riego: {
    border: 'var(--color-accent-amber)',
    bg: 'var(--color-glow-amber)',
    Icon: Droplets,
    label: 'Necesita riego',
  },
  offline: {
    border: 'var(--color-accent-blue)',
    bg: 'var(--color-glow-cyan)',
    Icon: WifiOff,
    label: 'Sensor offline',
  },
  bateria_baja: {
    border: 'var(--color-accent-amber)',
    bg: 'var(--color-glow-amber)',
    Icon: BatteryWarning,
    label: 'Batería baja',
  },
}

function getAlertConfig(tipo) {
  return alertConfig[tipo] || alertConfig.offline
}

function formatDatos(datos) {
  if (!datos) return null
  if (typeof datos === 'string') {
    try { datos = JSON.parse(datos) } catch { return datos }
  }
  const entries = Object.entries(datos).filter(([k]) =>
    !['score_total', 'nivel', 'umbral', 'diagnostico_ia'].includes(k)
  )
  return entries.slice(0, 6).map(([k, v]) => {
    if (typeof v === 'object' && v !== null) {
      return `${k.replace(/_/g, ' ')}: ${v.valor ?? JSON.stringify(v)} (+${v.puntos ?? 0}pts)`
    }
    return `${k.replace(/_/g, ' ')}: ${typeof v === 'number' ? (v.toFixed ? v.toFixed(2) : v) : v}`
  }).join(' · ')
}

function getDiagnostico(datos) {
  if (!datos) return null
  if (typeof datos === 'string') {
    try { datos = JSON.parse(datos) } catch { return null }
  }
  return datos.diagnostico_ia || null
}

function DiagnosticoSection({ diag }) {
  if (!diag) return null
  const sections = [
    { key: 'diagnostico', label: 'DIAGNÓSTICO', color: 'var(--color-accent-red)', bg: 'var(--color-glow-red)', borderColor: 'rgba(239,68,68,0.2)' },
    { key: 'recomendacion_1', label: 'RECOMENDACIÓN 1', color: 'var(--color-accent-green)', bg: 'var(--color-glow-green)', borderColor: 'rgba(16,185,129,0.2)' },
    { key: 'recomendacion_2', label: 'RECOMENDACIÓN 2', color: 'var(--color-accent-green)', bg: 'var(--color-glow-green)', borderColor: 'rgba(16,185,129,0.2)' },
    { key: 'referencia', label: 'REFERENCIA', color: 'var(--color-accent-blue)', bg: 'var(--color-glow-cyan)', borderColor: 'rgba(59,130,246,0.2)' },
  ]

  return (
    <div className="mt-3 space-y-2">
      {sections.map(s => diag[s.key] && (
        <div
          key={s.key}
          className="px-4 py-3 rounded-xl"
          style={{ background: s.bg, border: `1px solid ${s.borderColor}` }}
        >
          <p className="text-[11px] font-bold mb-1" style={{ color: s.color }}>{s.label}</p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
            {diag[s.key]}
          </p>
        </div>
      ))}
      {diag.raw && !diag.diagnostico && (
        <div className="px-4 py-3 rounded-xl" style={{ background: 'var(--color-surface-3)', border: '1px solid var(--color-border)' }}>
          <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-text-secondary)' }}>{diag.raw}</p>
        </div>
      )}
      {diag.raw_response && !diag.diagnostico && !diag.raw && (
        <div className="px-4 py-3 rounded-xl" style={{ background: 'var(--color-surface-3)', border: '1px solid var(--color-border)' }}>
          <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-text-secondary)' }}>{diag.raw_response}</p>
        </div>
      )}
    </div>
  )
}

function AlertaCard({ a, onDiagnosticoGenerated }) {
  const [loadingDiag, setLoadingDiag] = useState(false)
  const [loadingReporte, setLoadingReporte] = useState(false)
  const [reporte, setReporte] = useState(null)
  const [localDiag, setLocalDiag] = useState(null)
  const [copied, setCopied] = useState(false)

  const diag = localDiag || getDiagnostico(a.datos)
  const config = getAlertConfig(a.tipo)
  const AlertIcon = config.Icon

  const handleGenerarDiagnostico = async () => {
    setLoadingDiag(true)
    try {
      const r = await fetch(`/api/alertas/${a.id}/diagnostico`, { method: 'POST' })
      const data = await r.json()
      setLocalDiag(data.diagnostico)
      if (onDiagnosticoGenerated) onDiagnosticoGenerated()
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingDiag(false)
    }
  }

  const handleEnviarSalvador = () => {
    const d = diag || {}
    const text = [
      `*${config.label}* — ${a.nombre || `Nodo ${a.nodo_id}`}`,
      '',
      d.diagnostico ? `*DIAGNÓSTICO:* ${d.diagnostico}` : '',
      d.recomendacion_1 ? `*RECOMENDACIÓN 1:* ${d.recomendacion_1}` : '',
      d.recomendacion_2 ? `*RECOMENDACIÓN 2:* ${d.recomendacion_2}` : '',
      d.referencia ? `_Ref: ${d.referencia}_` : '',
      '',
      '_Diagnóstico generado por IA. Verificar en campo._',
    ].filter(Boolean).join('\n')
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleGenerarReporte = async () => {
    setLoadingReporte(true)
    try {
      const r = await fetch('/api/reportes/agricultor?predio_id=1', { method: 'POST' })
      const data = await r.json()
      setReporte(data.reporte)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingReporte(false)
    }
  }

  const handleCopiarReporte = () => {
    if (reporte) {
      navigator.clipboard.writeText(reporte).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }
  }

  const isCritical = a.tipo === 'alerta_phytophthora'

  return (
    <div
      className={`rounded-2xl overflow-hidden transition-all duration-200 ${isCritical ? 'pulse-critical' : ''}`}
      style={{
        background: 'var(--color-surface-2)',
        border: '1px solid var(--color-border)',
        borderLeft: `4px solid ${config.border}`,
      }}
    >
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div
            className="rounded-xl p-2.5 shrink-0"
            style={{ background: config.bg, border: `1px solid ${config.border}33` }}
          >
            <AlertIcon size={18} style={{ color: config.border }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {config.label}
              </h3>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {a.nombre || `Nodo ${a.nodo_id}`}
              </span>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>·</span>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {timeAgo(a.tiempo)}
              </span>
            </div>
            <p className="text-xs mt-1.5 line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>
              {formatDatos(a.datos)}
            </p>

            {diag ? (
              <DiagnosticoSection diag={diag} />
            ) : (
              <div className="mt-3">
                <button
                  onClick={handleGenerarDiagnostico}
                  disabled={loadingDiag}
                  className="flex items-center gap-2 text-xs px-4 py-2 rounded-xl font-medium transition-all duration-200 disabled:opacity-50"
                  style={{
                    background: 'var(--color-accent-green-dim)',
                    color: 'var(--color-accent-green)',
                    border: '1px solid rgba(16,185,129,0.3)',
                  }}
                >
                  {loadingDiag ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Generando diagnóstico...
                    </>
                  ) : (
                    <>
                      <BrainCircuit size={14} />
                      Generar diagnóstico IA
                    </>
                  )}
                </button>
              </div>
            )}

            {reporte && (
              <div
                className="mt-3 px-4 py-3 rounded-xl"
                style={{ background: 'var(--color-glow-amber)', border: '1px solid rgba(245,158,11,0.2)' }}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[11px] font-bold" style={{ color: 'var(--color-accent-amber)' }}>REPORTE PARA AGRICULTOR</p>
                  <button
                    onClick={handleCopiarReporte}
                    className="flex items-center gap-1 text-xs"
                    style={{ color: 'var(--color-accent-amber)' }}
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
                <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
                  {reporte}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-4 ml-14">
          <button
            onClick={handleEnviarSalvador}
            disabled={!diag}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all duration-200 disabled:opacity-30"
            style={{
              background: diag ? 'var(--color-accent-green-dim)' : 'var(--color-surface-3)',
              color: diag ? 'var(--color-accent-green)' : 'var(--color-text-muted)',
              border: `1px solid ${diag ? 'rgba(16,185,129,0.3)' : 'var(--color-border)'}`,
            }}
          >
            {copied ? <Check size={12} /> : <Send size={12} />}
            {copied ? 'Copiado' : 'Enviar a Salvador'}
          </button>
          <button
            onClick={handleGenerarReporte}
            disabled={loadingReporte}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all duration-200 disabled:opacity-50"
            style={{
              background: 'var(--color-glow-cyan)',
              color: 'var(--color-accent-cyan)',
              border: '1px solid rgba(34,211,238,0.2)',
            }}
          >
            {loadingReporte ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
            {loadingReporte ? 'Generando...' : 'Generar reporte'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AlertasView({ predioId }) {
  const { data: alertas, loading, refetch } = useApi(`/api/predios/${predioId}/alertas`)

  if (loading) return <Loading />

  const hoy = new Date().toDateString()
  const semana = Date.now() - 7 * 86400000
  const alertasHoy = alertas?.filter(a => new Date(a.tiempo).toDateString() === hoy).length || 0
  const alertasSemana = alertas?.filter(a => new Date(a.tiempo).getTime() > semana).length || 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="animate-in stagger-1">
          <KpiCard title="Alertas activas" value={alertas?.length || 0} icon={Bell} color={alertas?.length > 0 ? 'red' : 'green'} />
        </div>
        <div className="animate-in stagger-2">
          <KpiCard title="Alertas hoy" value={alertasHoy} icon={Calendar} color="blue" />
        </div>
        <div className="animate-in stagger-3">
          <KpiCard title="Alertas esta semana" value={alertasSemana} icon={BarChart3} color="yellow" />
        </div>
      </div>

      {(!alertas || alertas.length === 0) ? (
        <EmptyState
          icon={CheckCircle}
          title="Sin alertas activas"
          description="Todos los nodos operan dentro de parámetros normales. Las alertas se generan automáticamente cuando el motor de reglas detecta condiciones de riesgo."
        />
      ) : (
        <div className="space-y-3">
          {alertas.map((a, i) => (
            <div key={a.id} className={`animate-in stagger-${Math.min(i + 1, 6)}`}>
              <AlertaCard a={a} onDiagnosticoGenerated={refetch} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
