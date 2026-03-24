import { useState, useEffect } from 'react'
import { useApi } from '../hooks/useApi'
import { Bell, Calendar, BarChart3, CheckCircle, BrainCircuit, Send, FileText, Copy, Check, Loader2, ShieldAlert, Droplets, WifiOff, BatteryWarning, ChevronDown, ChevronUp, Star, Trash2, RotateCcw, X } from 'lucide-react'
import KpiCard from '../components/KpiCard'
import EmptyState from '../components/EmptyState'
import Loading from '../components/Loading'

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

const alertConfig = {
  alerta_phytophthora: { border: 'var(--color-accent-red)', bg: 'var(--color-glow-red)', Icon: ShieldAlert, label: 'Alerta Phytophthora' },
  necesita_riego: { border: 'var(--color-accent-amber)', bg: 'var(--color-glow-amber)', Icon: Droplets, label: 'Necesita riego' },
  offline: { border: 'var(--color-accent-blue)', bg: 'var(--color-glow-cyan)', Icon: WifiOff, label: 'Sensor offline' },
  bateria_baja: { border: 'var(--color-accent-amber)', bg: 'var(--color-glow-amber)', Icon: BatteryWarning, label: 'Batería baja' },
}

function getAlertConfig(tipo) { return alertConfig[tipo] || alertConfig.offline }

function formatDatos(datos) {
  if (!datos) return null
  if (typeof datos === 'string') { try { datos = JSON.parse(datos) } catch { return datos } }
  return Object.entries(datos)
    .filter(([k]) => !['score_total','nivel','umbral','diagnostico_ia','_destacada','_destacada_razon','_borrada'].includes(k))
    .slice(0, 6)
    .map(([k, v]) => {
      if (typeof v === 'object' && v !== null) return `${k.replace(/_/g,' ')}: ${v.valor ?? JSON.stringify(v)} (+${v.puntos??0}pts)`
      return `${k.replace(/_/g,' ')}: ${typeof v === 'number' ? v.toFixed(2) : v}`
    }).join(' · ')
}

function getDiagnostico(datos) {
  if (!datos) return null
  if (typeof datos === 'string') { try { datos = JSON.parse(datos) } catch { return null } }
  return datos.diagnostico_ia || null
}

function DiagnosticoSection({ diag }) {
  if (!diag) return null
  const sections = [
    { key: 'diagnostico', label: 'DIAGNÓSTICO', color: 'var(--color-accent-red)', bg: 'var(--color-glow-red)', bc: 'rgba(239,68,68,0.2)' },
    { key: 'recomendacion_1', label: 'RECOMENDACIÓN 1', color: 'var(--color-accent-green)', bg: 'var(--color-glow-green)', bc: 'rgba(16,185,129,0.2)' },
    { key: 'recomendacion_2', label: 'RECOMENDACIÓN 2', color: 'var(--color-accent-green)', bg: 'var(--color-glow-green)', bc: 'rgba(16,185,129,0.2)' },
    { key: 'referencia', label: 'REFERENCIA', color: 'var(--color-accent-blue)', bg: 'var(--color-glow-cyan)', bc: 'rgba(59,130,246,0.2)' },
  ]
  return (
    <div className="mt-3 space-y-2">
      {sections.map(s => diag[s.key] && (
        <div key={s.key} className="px-4 py-3 rounded-xl" style={{ background: s.bg, border: `1px solid ${s.bc}` }}>
          <p className="text-[11px] font-bold mb-1" style={{ color: s.color }}>{s.label}</p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>{diag[s.key]}</p>
        </div>
      ))}
      {diag.raw && !diag.diagnostico && (
        <div className="px-4 py-3 rounded-xl" style={{ background: 'var(--color-surface-3)', border: '1px solid var(--color-border)' }}>
          <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-text-secondary)' }}>{diag.raw}</p>
        </div>
      )}
    </div>
  )
}

function HighlightModal({ open, onConfirm, onCancel }) {
  const [reason, setReason] = useState('')
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="rounded-2xl p-6 max-w-md w-full mx-4 animate-in" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-glow-amber)', border: '1px solid rgba(245,158,11,0.3)' }}>
            <Star size={20} style={{ color: 'var(--color-accent-amber)' }} />
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Destacar alerta</h3>
            <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Esta alerta será marcada como prioritaria para seguimiento</p>
          </div>
        </div>
        <div className="mb-4">
          <label className="text-[11px] font-semibold uppercase tracking-widest mb-2 block" style={{ color: 'var(--color-text-muted)' }}>
            Razón del seguimiento
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Describe por qué esta alerta requiere atención especial (ej: patrón recurrente, zona crítica, verificación pendiente en campo...)"
            rows={3}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none"
            style={{ background: 'var(--color-surface-3)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
            autoFocus
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={() => { setReason(''); onCancel() }} className="px-4 py-2 text-sm rounded-xl font-medium" style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
            Cancelar
          </button>
          <button
            onClick={() => { onConfirm(reason); setReason('') }}
            disabled={!reason.trim()}
            className="px-4 py-2 text-sm rounded-xl font-medium transition-colors disabled:opacity-30"
            style={{ background: 'var(--color-accent-amber-dim)', color: 'var(--color-accent-amber)', border: '1px solid rgba(245,158,11,0.3)' }}
          >
            Destacar alerta
          </button>
        </div>
      </div>
    </div>
  )
}

function AlertaCard({ a, onUpdate, showRestore }) {
  const [loadingDiag, setLoadingDiag] = useState(false)
  const [loadingReporte, setLoadingReporte] = useState(false)
  const [reporte, setReporte] = useState(null)
  const [localDiag, setLocalDiag] = useState(null)
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [showHighlight, setShowHighlight] = useState(false)

  const diag = localDiag || getDiagnostico(a.datos)
  const config = getAlertConfig(a.tipo)
  const AlertIcon = config.Icon
  const hasContent = diag || reporte
  const isHighlighted = a.datos?._destacada
  const isCritical = a.tipo === 'alerta_phytophthora'

  const handleGenerarDiagnostico = async () => {
    setLoadingDiag(true)
    try {
      const r = await fetch(`/api/alertas/${a.id}/diagnostico`, { method: 'POST' })
      const data = await r.json()
      setLocalDiag(data.diagnostico)
      setExpanded(true)
    } catch (e) { console.error(e) }
    finally { setLoadingDiag(false) }
  }

  const handleEnviarAgronomo = () => {
    const d = diag || {}
    const text = [
      `*${config.label}* — ${a.nombre || `Nodo ${a.nodo_id}`}`,
      '', d.diagnostico ? `*DIAGNÓSTICO:* ${d.diagnostico}` : '',
      d.recomendacion_1 ? `*RECOMENDACIÓN 1:* ${d.recomendacion_1}` : '',
      d.recomendacion_2 ? `*RECOMENDACIÓN 2:* ${d.recomendacion_2}` : '',
      d.referencia ? `_Ref: ${d.referencia}_` : '',
      '', '_Diagnóstico generado por IA. Verificar en campo._',
    ].filter(Boolean).join('\n')
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  const handleGenerarReporte = async () => {
    setLoadingReporte(true)
    try {
      const r = await fetch('/api/reportes/agricultor?predio_id=1', { method: 'POST' })
      const data = await r.json()
      setReporte(data.reporte)
      setExpanded(true)
    } catch (e) { console.error(e) }
    finally { setLoadingReporte(false) }
  }

  const handleHighlight = (reason) => {
    const updated = { ...a, datos: { ...(typeof a.datos === 'string' ? JSON.parse(a.datos) : a.datos), _destacada: true, _destacada_razon: reason, _destacada_fecha: new Date().toISOString(), _destacada_por: 'ED' } }
    onUpdate(updated)
    setShowHighlight(false)
  }

  const handleRemoveHighlight = () => {
    const datos = typeof a.datos === 'string' ? JSON.parse(a.datos) : { ...a.datos }
    delete datos._destacada; delete datos._destacada_razon; delete datos._destacada_fecha; delete datos._destacada_por
    onUpdate({ ...a, datos })
  }

  const handleTrash = () => {
    const updated = { ...a, datos: { ...(typeof a.datos === 'string' ? JSON.parse(a.datos) : a.datos), _borrada: true, _borrada_fecha: new Date().toISOString() } }
    onUpdate(updated)
  }

  const handleRestore = () => {
    const datos = typeof a.datos === 'string' ? JSON.parse(a.datos) : { ...a.datos }
    delete datos._borrada; delete datos._borrada_fecha
    onUpdate({ ...a, datos })
  }

  return (
    <>
      <HighlightModal open={showHighlight} onConfirm={handleHighlight} onCancel={() => setShowHighlight(false)} />
      <div
        className={`rounded-2xl overflow-hidden transition-all duration-200 ${isCritical && !showRestore ? 'pulse-critical' : ''}`}
        style={{
          background: 'var(--color-surface-2)',
          border: isHighlighted ? '1px solid rgba(245,158,11,0.4)' : '1px solid var(--color-border)',
          borderLeft: `4px solid ${config.border}`,
        }}
      >
        {/* Highlight banner */}
        {isHighlighted && !showRestore && (
          <div className="px-4 py-2 flex items-center justify-between" style={{ background: 'var(--color-glow-amber)', borderBottom: '1px solid rgba(245,158,11,0.2)' }}>
            <div className="flex items-center gap-2">
              <Star size={12} style={{ color: 'var(--color-accent-amber)', fill: 'var(--color-accent-amber)' }} />
              <span className="text-[11px] font-semibold" style={{ color: 'var(--color-accent-amber)' }}>
                Destacada por {a.datos._destacada_por} — {a.datos._destacada_razon}
              </span>
            </div>
            <button onClick={handleRemoveHighlight} className="p-1 rounded" style={{ color: 'var(--color-accent-amber)' }} title="Quitar destacado">
              <X size={12} />
            </button>
          </div>
        )}

        {/* Header */}
        <div
          className="p-4 flex items-center gap-4 cursor-pointer transition-colors"
          onClick={() => setExpanded(!expanded)}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-3)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div className="rounded-xl p-2.5 shrink-0" style={{ background: config.bg, border: `1px solid ${config.border}33` }}>
            <AlertIcon size={18} style={{ color: config.border }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{config.label}</h3>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{a.nombre || `Nodo ${a.nodo_id}`} · {timeAgo(a.tiempo)}</span>
            </div>
            <p className="text-xs mt-1 line-clamp-1" style={{ color: 'var(--color-text-muted)' }}>{formatDatos(a.datos)}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {hasContent && !expanded && (
              <span className="text-[10px] px-2 py-0.5 rounded-md font-medium" style={{ background: 'var(--color-accent-green-dim)', color: 'var(--color-accent-green)' }}>
                Reporte listo
              </span>
            )}
            {/* Quick action buttons */}
            {!showRestore && (
              <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => setShowHighlight(true)}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: isHighlighted ? 'var(--color-accent-amber)' : 'var(--color-text-muted)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--color-glow-amber)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  title="Destacar"
                >
                  <Star size={14} fill={isHighlighted ? 'currentColor' : 'none'} />
                </button>
                <button
                  onClick={handleTrash}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: 'var(--color-text-muted)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-glow-red)'; e.currentTarget.style.color = 'var(--color-accent-red)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)' }}
                  title="Mover a borrados"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
            {showRestore && (
              <button
                onClick={(e) => { e.stopPropagation(); handleRestore() }}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium"
                style={{ background: 'var(--color-accent-green-dim)', color: 'var(--color-accent-green)', border: '1px solid rgba(16,185,129,0.3)' }}
              >
                <RotateCcw size={12} /> Restaurar
              </button>
            )}
            <div style={{ color: 'var(--color-text-muted)' }}>
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </div>
        </div>

        {/* Expandable content */}
        {expanded && (
          <div className="px-4 pb-4" style={{ borderTop: '1px solid var(--color-border)' }}>
            <div className="pt-3 ml-12">
              {diag ? <DiagnosticoSection diag={diag} /> : (
                <div className="mt-1">
                  <button onClick={(e) => { e.stopPropagation(); handleGenerarDiagnostico() }} disabled={loadingDiag}
                    className="flex items-center gap-2 text-xs px-4 py-2 rounded-xl font-medium transition-all duration-200 disabled:opacity-50"
                    style={{ background: 'var(--color-accent-green-dim)', color: 'var(--color-accent-green)', border: '1px solid rgba(16,185,129,0.3)' }}>
                    {loadingDiag ? <><Loader2 size={14} className="animate-spin" />Generando...</> : <><BrainCircuit size={14} />Generar diagnóstico IA</>}
                  </button>
                </div>
              )}
              {reporte && (
                <div className="mt-3 px-4 py-3 rounded-xl" style={{ background: 'var(--color-glow-amber)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[11px] font-bold" style={{ color: 'var(--color-accent-amber)' }}>REPORTE PARA AGRICULTOR</p>
                    <button onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(reporte).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }) }}
                      className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-accent-amber)' }}>
                      {copied ? <Check size={12} /> : <Copy size={12} />}{copied ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>{reporte}</p>
                </div>
              )}
              <div className="flex gap-2 mt-3">
                <button onClick={e => { e.stopPropagation(); handleEnviarAgronomo() }} disabled={!diag}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all duration-200 disabled:opacity-30"
                  style={{ background: diag ? 'var(--color-accent-green-dim)' : 'var(--color-surface-3)', color: diag ? 'var(--color-accent-green)' : 'var(--color-text-muted)', border: `1px solid ${diag ? 'rgba(16,185,129,0.3)' : 'var(--color-border)'}` }}>
                  {copied ? <Check size={12} /> : <Send size={12} />}{copied ? 'Copiado' : 'Enviar a agrónomos asignados'}
                </button>
                <button onClick={e => { e.stopPropagation(); handleGenerarReporte() }} disabled={loadingReporte}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all duration-200 disabled:opacity-50"
                  style={{ background: 'var(--color-glow-cyan)', color: 'var(--color-accent-cyan)', border: '1px solid rgba(34,211,238,0.2)' }}>
                  {loadingReporte ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}{loadingReporte ? 'Generando...' : 'Generar reporte'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default function AlertasView({ predioId, filter = 'todas' }) {
  const { data: rawAlertas, loading, refetch } = useApi(`/api/predios/${predioId}/alertas`)
  const [localUpdates, setLocalUpdates] = useState({})

  const alertas = rawAlertas?.map(a => {
    if (localUpdates[a.id]) return { ...a, datos: localUpdates[a.id] }
    const d = typeof a.datos === 'string' ? (() => { try { return JSON.parse(a.datos) } catch { return a.datos } })() : a.datos
    return { ...a, datos: d }
  }) || []

  const handleUpdate = (updated) => {
    setLocalUpdates(prev => ({ ...prev, [updated.id]: updated.datos }))
  }

  const filtered = alertas.filter(a => {
    const d = a.datos || {}
    if (filter === 'destacadas') return d._destacada && !d._borrada
    if (filter === 'borradas') return d._borrada
    return !d._borrada
  })

  const hoy = new Date().toDateString()
  const semana = Date.now() - 7 * 86400000
  const active = alertas.filter(a => !a.datos?._borrada)
  const alertasHoy = active.filter(a => new Date(a.tiempo).toDateString() === hoy).length
  const alertasSemana = active.filter(a => new Date(a.tiempo).getTime() > semana).length

  const titles = { todas: 'Todas las alertas', destacadas: 'Alertas destacadas', borradas: 'Alertas borradas' }
  const emptyMessages = {
    todas: 'Todos los nodos operan dentro de parámetros normales. Las alertas se generan automáticamente cuando el motor de reglas detecta condiciones de riesgo.',
    destacadas: 'No hay alertas marcadas como destacadas. Usa el ícono ★ en cualquier alerta para darle seguimiento prioritario.',
    borradas: 'No hay alertas en la papelera. Las alertas borradas se pueden recuperar desde aquí.',
  }

  return (
    <div className="space-y-6">
      {filter === 'todas' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="animate-in stagger-1">
            <KpiCard title="Alertas activas" value={active.length} icon={Bell} color={active.length > 0 ? 'red' : 'green'} />
          </div>
          <div className="animate-in stagger-2">
            <KpiCard title="Alertas hoy" value={alertasHoy} icon={Calendar} color="blue" />
          </div>
          <div className="animate-in stagger-3">
            <KpiCard title="Alertas esta semana" value={alertasSemana} icon={BarChart3} color="yellow" />
          </div>
        </div>
      )}

      {filter !== 'todas' && (
        <div className="animate-in">
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{titles[filter]}</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {filter === 'destacadas' ? `${filtered.length} alerta${filtered.length !== 1 ? 's' : ''} con seguimiento` : `${filtered.length} alerta${filtered.length !== 1 ? 's' : ''} en papelera`}
          </p>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={filter === 'destacadas' ? Star : filter === 'borradas' ? Trash2 : CheckCircle}
          title={filter === 'todas' ? 'Sin alertas activas' : filter === 'destacadas' ? 'Sin alertas destacadas' : 'Papelera vacía'}
          description={emptyMessages[filter]}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((a, i) => (
            <div key={a.id} className={`animate-in stagger-${Math.min(i + 1, 6)}`}>
              <AlertaCard a={a} onUpdate={handleUpdate} showRestore={filter === 'borradas'} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
