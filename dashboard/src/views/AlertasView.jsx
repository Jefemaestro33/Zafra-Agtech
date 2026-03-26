import { useState, useEffect } from 'react'
import { useApi, apiFetch } from '../hooks/useApi'
import { getToken } from '../hooks/useAuth'
import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip } from 'recharts'
import { Bell, Calendar, BarChart3, CheckCircle, BrainCircuit, Send, FileText, Copy, Check, Loader2, ShieldAlert, Droplets, WifiOff, BatteryWarning, ChevronDown, ChevronUp, Star, Trash2, RotateCcw, X, HelpCircle, TrendingUp, Clock, AlertTriangle } from 'lucide-react'
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
  return Object.entries(datos)
    .filter(([k]) => !['score_total','nivel','umbral','diagnostico_ia','_destacada','_destacada_razon','_destacada_fecha','_destacada_por','_borrada','_borrada_fecha'].includes(k))
    .slice(0, 6)
    .map(([k, v]) => {
      if (typeof v === 'object' && v !== null) return `${k.replace(/_/g,' ')}: ${v.valor ?? JSON.stringify(v)} (+${v.puntos??0}pts)`
      return `${k.replace(/_/g,' ')}: ${typeof v === 'number' ? v.toFixed(2) : v}`
    }).join(' · ')
}

function getDiagnostico(datos) {
  if (!datos) return null
  return datos.diagnostico_ia || null
}

/* ── Score desglose visual ── */
const factorConfig = {
  humedad_10cm: { label: 'Humedad 10cm', unit: '% VWC', max: 20, thresholds: [{ val: 45, label: 'ALTO' }, { val: 40, label: 'MODERADO' }], color: '#22d3ee' },
  humedad_20cm: { label: 'Humedad 20cm', unit: '% VWC', max: 20, thresholds: [{ val: 45, label: 'ALTO' }, { val: 40, label: 'MODERADO' }], color: '#3b82f6' },
  temperatura_20cm: { label: 'Temperatura 20cm', unit: '°C', max: 30, thresholds: [{ val: 22, label: 'ÓPTIMO (22-28°C)' }, { val: 15, label: 'PARCIAL (15-22°C)' }], color: '#f59e0b' },
  horas_humedo: { label: 'Horas húmedo continuo', unit: 'h', max: 30, thresholds: [{ val: 72, label: 'CRÍTICO' }, { val: 48, label: 'ALTO' }, { val: 24, label: 'MODERADO' }], color: '#8b5cf6' },
}

function ScoreBar({ factorKey, valor, puntos, maxPuntos }) {
  const cfg = factorConfig[factorKey]
  if (!cfg) return null
  const pct = maxPuntos > 0 ? (puntos / maxPuntos) * 100 : 0
  const barColor = puntos >= maxPuntos * 0.7 ? 'var(--color-accent-red)' : puntos > 0 ? 'var(--color-accent-amber)' : 'var(--color-accent-green)'
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>{cfg.label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono" style={{ color: 'var(--color-text-primary)' }}>{valor}{cfg.unit ? ` ${cfg.unit}` : ''}</span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${barColor}20`, color: barColor }}>+{puntos}</span>
        </div>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-4)' }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(pct, 100)}%`, background: barColor }} />
      </div>
    </div>
  )
}

function ScoreDesglose({ datos }) {
  if (!datos?.score_total) return null
  const scoreFactors = Object.entries(datos).filter(([k]) => factorConfig[k] && datos[k]?.puntos !== undefined)
  if (!scoreFactors.length) return null
  return (
    <div className="rounded-xl px-4 py-3 space-y-3" style={{ background: 'var(--color-surface-3)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Desglose del score</span>
        <span className="text-sm font-bold font-mono" style={{ color: datos.score_total >= 76 ? 'var(--color-accent-red)' : datos.score_total >= 51 ? 'var(--color-accent-amber)' : 'var(--color-accent-green)' }}>
          {datos.score_total}/100
        </span>
      </div>
      {scoreFactors.map(([k, v]) => (
        <ScoreBar key={k} factorKey={k} valor={v.valor} puntos={v.puntos} maxPuntos={factorConfig[k]?.max || 30} />
      ))}
    </div>
  )
}

/* ── Explicación paso a paso ── */
function ExplicacionLogica({ datos, tipo }) {
  if (tipo !== 'alerta_phytophthora' || !datos?.score_total) return null
  const steps = []
  const d = datos

  if (d.humedad_10cm) {
    const v = d.humedad_10cm.valor
    if (v > 45) steps.push({ status: 'danger', text: `Humedad a 10cm = ${v}% VWC — supera el umbral crítico de 45%. El suelo está saturado en la zona radicular superficial, creando condiciones anóxicas.`, factor: `+${d.humedad_10cm.puntos} puntos` })
    else if (v > 40) steps.push({ status: 'warning', text: `Humedad a 10cm = ${v}% VWC — por encima del 40%. Zona de precaución, la raíz empieza a tener estrés por exceso de agua.`, factor: `+${d.humedad_10cm.puntos} puntos` })
    else steps.push({ status: 'ok', text: `Humedad a 10cm = ${v}% VWC — dentro de rango normal (<40%).`, factor: '+0 puntos' })
  }
  if (d.humedad_20cm) {
    const v = d.humedad_20cm.valor
    if (v > 45) steps.push({ status: 'danger', text: `Humedad a 20cm = ${v}% VWC — zona de raíces principales saturada. P. cinnamomi necesita agua libre para liberar zoosporas.`, factor: `+${d.humedad_20cm.puntos} puntos` })
    else if (v > 40) steps.push({ status: 'warning', text: `Humedad a 20cm = ${v}% VWC — elevada pero no crítica todavía.`, factor: `+${d.humedad_20cm.puntos} puntos` })
    else steps.push({ status: 'ok', text: `Humedad a 20cm = ${v}% VWC — OK.`, factor: '+0 puntos' })
  }
  if (d.temperatura_20cm) {
    const v = d.temperatura_20cm.valor
    if (v >= 22 && v <= 28) steps.push({ status: 'danger', text: `Temperatura suelo = ${v}°C — rango óptimo para esporulación de P. cinnamomi (22-28°C). Máxima actividad del patógeno.`, factor: `+${d.temperatura_20cm.puntos} puntos` })
    else if (v >= 15) steps.push({ status: 'warning', text: `Temperatura suelo = ${v}°C — puede esporular pero más lento (15-22°C).`, factor: `+${d.temperatura_20cm.puntos} puntos` })
    else steps.push({ status: 'ok', text: `Temperatura suelo = ${v}°C — por debajo de 15°C. P. cinnamomi no esporula activamente.`, factor: '+0 puntos' })
  }
  if (d.horas_humedo) {
    const v = d.horas_humedo.valor
    if (v > 72) steps.push({ status: 'danger', text: `${v} horas de suelo húmedo continuo — más de 72h de condiciones favorables. Riesgo extremo de esporulación masiva.`, factor: `+${d.horas_humedo.puntos} puntos` })
    else if (v > 48) steps.push({ status: 'warning', text: `${v} horas húmedo — duración significativa, acumulando riesgo.`, factor: `+${d.horas_humedo.puntos} puntos` })
    else if (v > 24) steps.push({ status: 'warning', text: `${v} horas húmedo — moderado, monitorear.`, factor: `+${d.horas_humedo.puntos} puntos` })
    else steps.push({ status: 'ok', text: `${v} horas húmedo — duración baja.`, factor: '+0 puntos' })
  }

  const statusColors = {
    danger: { dot: 'var(--color-accent-red)', bg: 'var(--color-glow-red)', border: 'rgba(239,68,68,0.2)' },
    warning: { dot: 'var(--color-accent-amber)', bg: 'var(--color-glow-amber)', border: 'rgba(245,158,11,0.2)' },
    ok: { dot: 'var(--color-accent-green)', bg: 'var(--color-glow-green)', border: 'rgba(16,185,129,0.2)' },
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-surface-3)', border: '1px solid var(--color-border)' }}>
      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-2">
          <HelpCircle size={14} style={{ color: 'var(--color-accent-cyan)' }} />
          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-accent-cyan)' }}>
            ¿Por qué esta alerta?
          </span>
        </div>
        <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
          El score de Phytophthora se calcula evaluando cada factor de riesgo:
        </p>
      </div>
      <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
        {steps.map((step, i) => {
          const sc = statusColors[step.status]
          return (
            <div key={i} className="px-4 py-3 flex gap-3" style={{ background: i % 2 === 0 ? 'transparent' : 'var(--color-surface-2)' }}>
              <div className="flex flex-col items-center gap-1 pt-1 shrink-0">
                <div className="w-3 h-3 rounded-full" style={{ background: sc.dot, boxShadow: `0 0 6px ${sc.dot}50` }} />
                {i < steps.length - 1 && <div className="w-px flex-1" style={{ background: 'var(--color-border)' }} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>{step.text}</p>
                <span className="text-[10px] font-mono font-bold mt-1 inline-block px-2 py-0.5 rounded" style={{ background: sc.bg, color: sc.dot, border: `1px solid ${sc.border}` }}>
                  {step.factor}
                </span>
              </div>
            </div>
          )
        })}
      </div>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-2)' }}>
        <span className="text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Score total</span>
        <span className="text-lg font-bold font-mono" style={{ color: datos.score_total >= 76 ? 'var(--color-accent-red)' : 'var(--color-accent-amber)' }}>
          {datos.score_total}/100 — {datos.nivel}
        </span>
      </div>
    </div>
  )
}

/* ── Sparkline mini ── */
function Sparkline({ nodoId }) {
  const [data, setData] = useState([])
  useEffect(() => {
    apiFetch(`/api/nodos/${nodoId}/lecturas?intervalo=1h`)
      .then(d => {
        const pts = (d.datos || []).slice(-48).map(r => ({
          t: new Date(r.tiempo).toLocaleTimeString('es-MX', { hour: '2-digit' }),
          h10: r.h10_avg,
        }))
        setData(pts)
      })
      .catch(() => {})
  }, [nodoId])

  if (data.length < 2) return null
  return (
    <div className="rounded-xl px-4 py-3" style={{ background: 'var(--color-surface-3)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp size={12} style={{ color: 'var(--color-accent-cyan)' }} />
        <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
          Tendencia h10 — últimas 48h
        </span>
      </div>
      <ResponsiveContainer width="100%" height={80}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`spark-${nodoId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="t" hide />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              return (
                <div className="text-[10px] px-2 py-1 rounded" style={{ background: 'var(--color-surface-4)', color: 'var(--color-text-primary)' }}>
                  {payload[0].value?.toFixed(1)}% VWC
                </div>
              )
            }}
          />
          <Area type="monotone" dataKey="h10" stroke="#22d3ee" fill={`url(#spark-${nodoId})`} strokeWidth={1.5} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ── Timeline ── */
function Timeline({ datos }) {
  if (!datos) return null
  const events = []
  if (datos.horas_humedo?.valor) {
    const h = datos.horas_humedo.valor
    events.push({ time: `Hace ~${h}h`, label: 'Inicio de condiciones húmedas', desc: `Humedad 10cm superó 40% VWC y no ha bajado`, color: 'var(--color-accent-cyan)' })
    if (h > 24) events.push({ time: `Hace ~${Math.round(h - 24)}h`, label: '24h de humedad sostenida', desc: 'Score de duración incrementó — primer umbral', color: 'var(--color-accent-amber)' })
    if (h > 48) events.push({ time: `Hace ~${Math.round(h - 48)}h`, label: '48h de humedad sostenida', desc: 'Condiciones prolongadas — riesgo subiendo', color: 'var(--color-accent-amber)' })
    if (h > 72) events.push({ time: `Hace ~${Math.round(h - 72)}h`, label: '72h de humedad — umbral crítico', desc: 'Duración máxima superada — esporulación probable', color: 'var(--color-accent-red)' })
  }
  events.push({ time: 'Ahora', label: 'Alerta generada', desc: `Score: ${datos.score_total}/100 (${datos.nivel})`, color: datos.score_total >= 76 ? 'var(--color-accent-red)' : 'var(--color-accent-amber)' })

  return (
    <div className="rounded-xl px-4 py-3" style={{ background: 'var(--color-surface-3)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-center gap-2 mb-3">
        <Clock size={12} style={{ color: 'var(--color-accent-violet)' }} />
        <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Timeline del evento</span>
      </div>
      <div className="space-y-0">
        {events.map((ev, i) => (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center shrink-0" style={{ width: 16 }}>
              <div className="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5" style={{ background: ev.color, boxShadow: `0 0 6px ${ev.color}50` }} />
              {i < events.length - 1 && <div className="w-px flex-1 my-1" style={{ background: 'var(--color-border)' }} />}
            </div>
            <div className="pb-3 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-semibold" style={{ color: ev.color }}>{ev.time}</span>
              </div>
              <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--color-text-primary)' }}>{ev.label}</p>
              <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{ev.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Diagnóstico IA ── */
function DiagnosticoSection({ diag }) {
  if (!diag) return null
  const sections = [
    { key: 'diagnostico', label: 'DIAGNÓSTICO', color: 'var(--color-accent-red)', bg: 'var(--color-glow-red)', bc: 'rgba(239,68,68,0.2)' },
    { key: 'recomendacion_1', label: 'RECOMENDACIÓN 1', color: 'var(--color-accent-green)', bg: 'var(--color-glow-green)', bc: 'rgba(16,185,129,0.2)' },
    { key: 'recomendacion_2', label: 'RECOMENDACIÓN 2', color: 'var(--color-accent-green)', bg: 'var(--color-glow-green)', bc: 'rgba(16,185,129,0.2)' },
    { key: 'referencia', label: 'REFERENCIA', color: 'var(--color-accent-blue)', bg: 'var(--color-glow-cyan)', bc: 'rgba(59,130,246,0.2)' },
  ]
  return (
    <div className="space-y-2">
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

/* ── Modales ── */
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
            <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Será marcada como prioritaria para seguimiento</p>
          </div>
        </div>
        <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Razón del seguimiento (ej: patrón recurrente, zona crítica, verificación pendiente...)" rows={3}
          className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none mb-4"
          style={{ background: 'var(--color-surface-3)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} autoFocus />
        <div className="flex gap-2 justify-end">
          <button onClick={() => { setReason(''); onCancel() }} className="px-4 py-2 text-sm rounded-xl font-medium" style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>Cancelar</button>
          <button onClick={() => { onConfirm(reason); setReason('') }} disabled={!reason.trim()} className="px-4 py-2 text-sm rounded-xl font-medium disabled:opacity-30"
            style={{ background: 'var(--color-accent-amber-dim)', color: 'var(--color-accent-amber)', border: '1px solid rgba(245,158,11,0.3)' }}>Destacar</button>
        </div>
      </div>
    </div>
  )
}

/* ── Alerta Card ── */
function AlertaCard({ a, onUpdate, showRestore, predioId }) {
  const [loadingDiag, setLoadingDiag] = useState(false)
  const [loadingReporte, setLoadingReporte] = useState(false)
  const [reporte, setReporte] = useState(null)
  const [localDiag, setLocalDiag] = useState(null)
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [showHighlight, setShowHighlight] = useState(false)
  const [showExplain, setShowExplain] = useState(false)
  const [showTimeline, setShowTimeline] = useState(false)

  const diag = localDiag || getDiagnostico(a.datos)
  const config = getAlertConfig(a.tipo)
  const AlertIcon = config.Icon
  const hasContent = diag || reporte
  const isHighlighted = a.datos?._destacada
  const isCritical = a.tipo === 'alerta_phytophthora'
  const isPhyto = a.tipo === 'alerta_phytophthora'

  const [diagError, setDiagError] = useState(null)
  const handleGenerarDiagnostico = async () => {
    setLoadingDiag(true); setDiagError(null)
    const headers = {}; const token = getToken(); if (token) headers['Authorization'] = `Bearer ${token}`
    try { const r = await fetch(`/api/alertas/${a.id}/diagnostico`, { method: 'POST', headers }); if (!r.ok) throw new Error('Error del servidor'); const data = await r.json(); setLocalDiag(data.diagnostico); setExpanded(true) }
    catch (e) { setDiagError('No se pudo generar el diagnóstico. Verifica la conexión o la API de Claude.') } finally { setLoadingDiag(false) }
  }
  const handleEnviarAgronomo = () => {
    const d = diag || {}
    const text = [`*${config.label}* — ${a.nombre || `Nodo ${a.nodo_id}`}`, '', d.diagnostico ? `*DIAGNÓSTICO:* ${d.diagnostico}` : '', d.recomendacion_1 ? `*RECOMENDACIÓN 1:* ${d.recomendacion_1}` : '', d.recomendacion_2 ? `*RECOMENDACIÓN 2:* ${d.recomendacion_2}` : '', d.referencia ? `_Ref: ${d.referencia}_` : '', '', '_Diagnóstico IA. Verificar en campo._'].filter(Boolean).join('\n')
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }
  const [reporteError, setReporteError] = useState(null)
  const handleGenerarReporte = async () => {
    setLoadingReporte(true); setReporteError(null)
    const headers = {}; const token = getToken(); if (token) headers['Authorization'] = `Bearer ${token}`
    try { const r = await fetch(`/api/reportes/agricultor?predio_id=${predioId || 1}`, { method: 'POST', headers }); if (!r.ok) throw new Error('Error del servidor'); const data = await r.json(); setReporte(data.reporte); setExpanded(true) }
    catch (e) { setReporteError('No se pudo generar el reporte.') } finally { setLoadingReporte(false) }
  }
  const handleHighlight = (reason) => {
    onUpdate({ ...a, datos: { ...a.datos, _destacada: true, _destacada_razon: reason, _destacada_fecha: new Date().toISOString(), _destacada_por: 'ED' } })
    setShowHighlight(false)
  }
  const handleRemoveHighlight = () => { const d = { ...a.datos }; delete d._destacada; delete d._destacada_razon; delete d._destacada_fecha; delete d._destacada_por; onUpdate({ ...a, datos: d }) }
  const handleTrash = () => { onUpdate({ ...a, datos: { ...a.datos, _borrada: true, _borrada_fecha: new Date().toISOString() } }) }
  const handleRestore = () => { const d = { ...a.datos }; delete d._borrada; delete d._borrada_fecha; onUpdate({ ...a, datos: d }) }

  return (
    <>
      <HighlightModal open={showHighlight} onConfirm={handleHighlight} onCancel={() => setShowHighlight(false)} />
      <div className={`rounded-2xl overflow-hidden transition-all duration-200 ${isCritical && !showRestore ? 'pulse-critical' : ''}`}
        style={{ background: 'var(--color-surface-2)', border: isHighlighted ? '1px solid rgba(245,158,11,0.4)' : '1px solid var(--color-border)', borderLeft: `4px solid ${config.border}` }}>

        {isHighlighted && !showRestore && (
          <div className="px-4 py-2 flex items-center justify-between" style={{ background: 'var(--color-glow-amber)', borderBottom: '1px solid rgba(245,158,11,0.2)' }}>
            <div className="flex items-center gap-2">
              <Star size={12} style={{ color: 'var(--color-accent-amber)', fill: 'var(--color-accent-amber)' }} />
              <span className="text-[11px] font-semibold" style={{ color: 'var(--color-accent-amber)' }}>Destacada — {a.datos._destacada_razon}</span>
            </div>
            <button onClick={handleRemoveHighlight} className="p-1 rounded" style={{ color: 'var(--color-accent-amber)' }}><X size={12} /></button>
          </div>
        )}

        {/* Header */}
        <div className="p-4 flex items-center gap-4 cursor-pointer transition-colors" onClick={() => setExpanded(!expanded)}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-3)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
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
            {hasContent && !expanded && <span className="text-[10px] px-2 py-0.5 rounded-md font-medium" style={{ background: 'var(--color-accent-green-dim)', color: 'var(--color-accent-green)' }}>Reporte listo</span>}
            {!showRestore && (
              <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                <button onClick={() => setShowHighlight(true)} className="p-1.5 rounded-lg transition-colors" style={{ color: isHighlighted ? 'var(--color-accent-amber)' : 'var(--color-text-muted)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--color-glow-amber)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}><Star size={14} fill={isHighlighted ? 'currentColor' : 'none'} /></button>
                <button onClick={handleTrash} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--color-text-muted)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-glow-red)'; e.currentTarget.style.color = 'var(--color-accent-red)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)' }}><Trash2 size={14} /></button>
              </div>
            )}
            {showRestore && <button onClick={e => { e.stopPropagation(); handleRestore() }} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium"
              style={{ background: 'var(--color-accent-green-dim)', color: 'var(--color-accent-green)', border: '1px solid rgba(16,185,129,0.3)' }}><RotateCcw size={12} /> Restaurar</button>}
            <div style={{ color: 'var(--color-text-muted)' }}>{expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</div>
          </div>
        </div>

        {/* Expanded */}
        {expanded && (
          <div className="px-4 pb-4" style={{ borderTop: '1px solid var(--color-border)' }}>
            <div className="pt-3 ml-12 space-y-3">
              {/* Score desglose */}
              {isPhyto && <ScoreDesglose datos={a.datos} />}

              {/* Interactive buttons row */}
              {isPhyto && (
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => setShowExplain(!showExplain)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                    style={{ background: showExplain ? 'var(--color-glow-cyan)' : 'var(--color-surface-3)', color: showExplain ? 'var(--color-accent-cyan)' : 'var(--color-text-muted)', border: `1px solid ${showExplain ? 'rgba(34,211,238,0.3)' : 'var(--color-border)'}` }}>
                    <HelpCircle size={12} /> {showExplain ? 'Ocultar explicación' : 'Explícame esta alerta'}
                  </button>
                  <button onClick={() => setShowTimeline(!showTimeline)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                    style={{ background: showTimeline ? 'var(--color-glow-amber)' : 'var(--color-surface-3)', color: showTimeline ? 'var(--color-accent-violet)' : 'var(--color-text-muted)', border: `1px solid ${showTimeline ? 'rgba(139,92,246,0.3)' : 'var(--color-border)'}` }}>
                    <Clock size={12} /> {showTimeline ? 'Ocultar timeline' : 'Timeline del evento'}
                  </button>
                </div>
              )}

              {showExplain && <ExplicacionLogica datos={a.datos} tipo={a.tipo} />}
              {showTimeline && <Timeline datos={a.datos} />}

              {/* Sparkline */}
              {isPhyto && <Sparkline nodoId={a.nodo_id} />}

              {/* Diagnóstico IA */}
              {diag ? <DiagnosticoSection diag={diag} /> : (
                <button onClick={e => { e.stopPropagation(); handleGenerarDiagnostico() }} disabled={loadingDiag}
                  className="flex items-center gap-2 text-xs px-4 py-2 rounded-xl font-medium transition-all disabled:opacity-50"
                  style={{ background: 'var(--color-accent-green-dim)', color: 'var(--color-accent-green)', border: '1px solid rgba(16,185,129,0.3)' }}>
                  {loadingDiag ? <><Loader2 size={14} className="animate-spin" />Generando...</> : <><BrainCircuit size={14} />Generar diagnóstico IA</>}
                </button>
              )}
              {diagError && (
                <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'var(--color-glow-red)', color: 'var(--color-accent-red)', border: '1px solid rgba(239,68,68,0.2)' }}>{diagError}</p>
              )}

              {reporte && (
                <div className="px-4 py-3 rounded-xl" style={{ background: 'var(--color-glow-amber)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[11px] font-bold" style={{ color: 'var(--color-accent-amber)' }}>REPORTE AGRICULTOR</p>
                    <button onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(reporte).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }) }}
                      className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-accent-amber)' }}>{copied ? <Check size={12} /> : <Copy size={12} />}{copied ? 'Copiado' : 'Copiar'}</button>
                  </div>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>{reporte}</p>
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={e => { e.stopPropagation(); handleEnviarAgronomo() }} disabled={!diag} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all disabled:opacity-30"
                  style={{ background: diag ? 'var(--color-accent-green-dim)' : 'var(--color-surface-3)', color: diag ? 'var(--color-accent-green)' : 'var(--color-text-muted)', border: `1px solid ${diag ? 'rgba(16,185,129,0.3)' : 'var(--color-border)'}` }}>
                  {copied ? <Check size={12} /> : <Send size={12} />}{copied ? 'Copiado' : 'Enviar a agrónomos asignados'}
                </button>
                <button onClick={e => { e.stopPropagation(); handleGenerarReporte() }} disabled={loadingReporte} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all disabled:opacity-50"
                  style={{ background: 'var(--color-glow-cyan)', color: 'var(--color-accent-cyan)', border: '1px solid rgba(34,211,238,0.2)' }}>
                  {loadingReporte ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}{loadingReporte ? 'Generando...' : 'Generar reporte'}
                </button>
              </div>
              {reporteError && (
                <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'var(--color-glow-red)', color: 'var(--color-accent-red)', border: '1px solid rgba(239,68,68,0.2)' }}>{reporteError}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

/* ── Vista principal ── */
export default function AlertasView({ predioId, filter = 'todas' }) {
  const { data: rawAlertas, loading, refetch } = useApi(`/api/predios/${predioId}/alertas`)
  const [localUpdates, setLocalUpdates] = useState({})

  const alertas = rawAlertas?.map(a => {
    const d = typeof a.datos === 'string' ? (() => { try { return JSON.parse(a.datos) } catch { return a.datos } })() : (a.datos || {})
    if (localUpdates[a.id]) return { ...a, datos: { ...d, ...localUpdates[a.id] } }
    return { ...a, datos: d }
  }) || []

  const handleUpdate = (updated) => { setLocalUpdates(prev => ({ ...prev, [updated.id]: updated.datos })) }

  const filtered = alertas.filter(a => {
    if (filter === 'destacadas') return a.datos?._destacada && !a.datos?._borrada
    if (filter === 'borradas') return a.datos?._borrada
    return !a.datos?._borrada
  })

  const active = alertas.filter(a => !a.datos?._borrada)
  const hoy = new Date().toDateString()
  const semana = Date.now() - 7 * 86400000

  const titles = { todas: 'Todas las alertas', destacadas: 'Alertas destacadas', borradas: 'Alertas borradas' }
  const emptyMsgs = {
    todas: 'Todos los nodos operan dentro de parámetros normales.',
    destacadas: 'No hay alertas destacadas. Usa ★ para dar seguimiento.',
    borradas: 'Papelera vacía.',
  }

  return (
    <div className="space-y-6">
      {filter === 'todas' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="animate-in stagger-1"><KpiCard title="Alertas activas" value={active.length} icon={Bell} color={active.length > 0 ? 'red' : 'green'} /></div>
          <div className="animate-in stagger-2"><KpiCard title="Alertas hoy" value={active.filter(a => new Date(a.tiempo).toDateString() === hoy).length} icon={Calendar} color="blue" /></div>
          <div className="animate-in stagger-3"><KpiCard title="Esta semana" value={active.filter(a => new Date(a.tiempo).getTime() > semana).length} icon={BarChart3} color="yellow" /></div>
        </div>
      )}
      {filter !== 'todas' && (
        <div className="animate-in">
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{titles[filter]}</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>{filtered.length} alerta{filtered.length !== 1 ? 's' : ''}</p>
        </div>
      )}
      {filtered.length === 0 ? (
        <EmptyState icon={filter === 'destacadas' ? Star : filter === 'borradas' ? Trash2 : CheckCircle} title={filter === 'todas' ? 'Sin alertas activas' : titles[filter]} description={emptyMsgs[filter]} />
      ) : (
        <div className="space-y-3">
          {filtered.map((a, i) => (
            <div key={a.id} className={`animate-in stagger-${Math.min(i + 1, 6)}`}>
              <AlertaCard a={a} onUpdate={handleUpdate} showRestore={filter === 'borrados'} predioId={predioId} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
