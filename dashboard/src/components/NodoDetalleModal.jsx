import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Send, Loader2, ShieldAlert, Droplets, WifiOff, BatteryWarning, BrainCircuit,
  Sparkles, MessageCircle, AlertCircle, Activity, MessageSquareText, X as XIcon,
  CheckCircle2, XCircle,
} from 'lucide-react'
import Modal from './Modal'
import Tabs from './Tabs'
import { apiFetch } from '../hooks/useApi'
import { useAuth } from '../hooks/useAuth'
import { narrate } from '../lib/nodeNarrative'

function timeAgo(iso) {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.round(ms / 60_000)
  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `hace ${h}h`
  return `hace ${Math.round(h / 24)}d`
}

function fmtTime(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
  } catch { return iso }
}

const EVENTO_META = {
  alerta_phytophthora: { Icon: ShieldAlert, label: 'Riesgo de pudrición', color: 'var(--color-accent-red)', tono: 'rojo' },
  necesita_riego:     { Icon: Droplets,    label: 'Necesita riego',     color: 'var(--color-accent-amber)', tono: 'ambar' },
  offline:            { Icon: WifiOff,     label: 'Sensor sin señal',   color: 'var(--color-accent-blue, #818cf8)', tono: 'azul' },
  bateria_baja:       { Icon: BatteryWarning, label: 'Pila baja',       color: 'var(--color-accent-amber)', tono: 'ambar' },
  diagnostico:        { Icon: BrainCircuit, label: 'Diagnóstico IA',    color: 'var(--color-accent-green)', tono: 'verde' },
}

function eventoMeta(tipo) {
  return EVENTO_META[tipo] || { Icon: AlertCircle, label: tipo, color: 'var(--color-text-muted)', tono: 'gris' }
}

function describirEvento(tipo, datos) {
  const d = datos || {}
  if (tipo === 'alerta_phytophthora') {
    const score = d.score_total ?? d.score
    const nivel = d.nivel
    if (score != null) return `Score ${score}/100${nivel ? ` (${nivel})` : ''} — el suelo lleva días con humedad alta y la temperatura del subsuelo bajó. Son las condiciones donde aparece la pudrición.`
    return 'Condiciones favorables para Phytophthora detectadas.'
  }
  if (tipo === 'necesita_riego') {
    const h10 = d.h10_promedio ?? d.h10
    const urgencia = d.urgencia
    return `Humedad a 10cm en ${h10 != null ? `${Number(h10).toFixed(1)}%` : 'el rango bajo'}${urgencia ? ` — urgencia ${urgencia}` : ''}. Las raíces empiezan a batallar para absorber agua.`
  }
  if (tipo === 'offline') {
    const min = d.minutos_sin_datos
    if (min) return `Sin reportar desde hace ${Math.round(min / 60)}h${min > 60 ? '' : ` (${Math.round(min)} min)`}. Conviene revisar antena, pila o agua en el chasis.`
    return 'El sensor lleva un rato sin reportar.'
  }
  if (tipo === 'bateria_baja') {
    const b = d.bateria
    return `Pila en ${b != null ? `${Number(b).toFixed(2)}V` : 'rango bajo'}. Lleva pila de repuesto en la próxima vuelta.`
  }
  if (tipo === 'diagnostico') {
    return d.diagnostico_ia || 'Diagnóstico generado.'
  }
  return JSON.stringify(d).slice(0, 200)
}

function BubbleEvento({ item }) {
  const meta = eventoMeta(item.tipo)
  const Icon = meta.Icon
  const desc = describirEvento(item.tipo, item.datos)
  return (
    <div className="flex gap-2 max-w-[88%]">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
        style={{
          background: 'var(--color-surface-3)',
          border: `1px solid ${meta.color}33`,
          color: meta.color,
        }}
      >
        <Icon size={14} />
      </div>
      <div
        className="rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-[13px]"
        style={{
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text-primary)',
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: meta.color }}>
            {meta.label}
          </span>
          <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            · Sistema · {timeAgo(item.ts)}
          </span>
        </div>
        <p className="leading-snug" style={{ color: 'var(--color-text-secondary)' }}>{desc}</p>
      </div>
    </div>
  )
}

function BubbleTratamiento({ item }) {
  const cant = item.cantidad != null ? `${item.cantidad}${item.unidad ? ` ${item.unidad}` : ''}` : null
  return (
    <div className="flex gap-2 max-w-[88%] mx-auto">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
        style={{
          background: 'rgba(245,158,11,0.12)',
          border: '1px solid rgba(245,158,11,0.3)',
          color: 'var(--color-accent-amber)',
        }}
      >
        <Sparkles size={14} />
      </div>
      <div
        className="rounded-2xl px-3.5 py-2.5 text-[13px] flex-1"
        style={{
          background: 'rgba(245,158,11,0.06)',
          border: '1px solid rgba(245,158,11,0.2)',
          color: 'var(--color-text-primary)',
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-accent-amber)' }}>
            Tratamiento aplicado
          </span>
          <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            · {timeAgo(item.ts)}
          </span>
        </div>
        <p className="leading-snug">
          {item.tipo}{item.producto ? ` — ${item.producto}` : ''}{cant ? ` · ${cant}` : ''}
        </p>
        {item.contenido && (
          <p className="mt-1 text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>{item.contenido}</p>
        )}
      </div>
    </div>
  )
}

function BubbleWhatsapp({ item }) {
  const dest = item.destino === 'productor' ? 'al productor'
    : item.destino === 'agronomo' ? 'al agrónomo'
    : item.destino === 'manual' ? 'manual'
    : 'al equipo'
  return (
    <div className="flex gap-2 max-w-[88%]">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
        style={{
          background: 'rgba(37,211,102,0.12)',
          border: '1px solid rgba(37,211,102,0.3)',
          color: '#25d366',
        }}
      >
        <MessageSquareText size={14} />
      </div>
      <div
        className="rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-[13px] flex-1"
        style={{
          background: 'rgba(37,211,102,0.06)',
          border: `1px solid ${item.success ? 'rgba(37,211,102,0.2)' : 'rgba(239,68,68,0.3)'}`,
          color: 'var(--color-text-primary)',
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#25d366' }}>
            WhatsApp {dest}
          </span>
          {item.success
            ? <CheckCircle2 size={10} style={{ color: 'var(--color-accent-green)' }} />
            : <XCircle size={10} style={{ color: 'var(--color-accent-red)' }} />
          }
          {item.telefono && (
            <span className="text-[10px] font-mono" style={{ color: 'var(--color-text-muted)' }}>
              ···{item.telefono.slice(-4)}
            </span>
          )}
          <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>· {timeAgo(item.ts)}</span>
        </div>
        <p className="whitespace-pre-wrap leading-snug" style={{ color: 'var(--color-text-secondary)' }}>{item.contenido}</p>
        {!item.success && item.error_msg && (
          <p className="mt-1 text-[11px] font-mono" style={{ color: 'var(--color-accent-red)' }}>
            {item.error_msg}
          </p>
        )}
      </div>
    </div>
  )
}

function BubbleNota({ item, miNombre }) {
  const esMia = item.autor === miNombre
  const pending = item._pending
  const failed = item._failed
  return (
    <div className={`flex gap-2 max-w-[88%] ${esMia ? 'ml-auto flex-row-reverse' : ''}`}>
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold"
        style={{
          background: 'var(--color-accent-green-dim)',
          border: '1px solid rgba(16,185,129,0.25)',
          color: 'var(--color-accent-green)',
        }}
      >
        {(item.autor || '?')[0]?.toUpperCase()}
      </div>
      <div
        className="rounded-2xl px-3.5 py-2.5 text-[13px]"
        style={{
          background: esMia ? 'var(--color-accent-green-dim)' : 'var(--color-surface-2)',
          border: `1px solid ${esMia ? 'rgba(16,185,129,0.25)' : 'var(--color-border)'}`,
          color: 'var(--color-text-primary)',
          opacity: pending ? 0.65 : failed ? 0.55 : 1,
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-semibold" style={{ color: esMia ? 'var(--color-accent-green)' : 'var(--color-text-secondary)' }}>
            {esMia ? 'Tú' : (item.autor || 'Anónimo')}
          </span>
          <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            · {timeAgo(item.ts)} {pending && '· enviando...'} {failed && '· falló'}
          </span>
        </div>
        <p className="whitespace-pre-wrap leading-snug">{item.contenido}</p>
      </div>
    </div>
  )
}

function ConversacionTab({ nodo, miNombre }) {
  const nodoId = nodo.nodo_id
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [waOpen, setWaOpen] = useState(false)
  const [waText, setWaText] = useState('')
  const [waDestino, setWaDestino] = useState('productor')
  const [waSending, setWaSending] = useState(false)
  const [waMsg, setWaMsg] = useState(null)
  const scrollRef = useRef(null)

  const cargar = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const data = await apiFetch(`/api/nodos/${nodoId}/timeline?limit=200`)
      setItems(prev => {
        const pendientes = prev.filter(i => i._pending && !data.find(d => d.id === i.id))
        return [...data, ...pendientes]
      })
    } catch (e) { /* keep prev */ } finally {
      if (!silent) setLoading(false)
    }
  }, [nodoId])

  useEffect(() => { cargar() }, [cargar])
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [items])

  const enviar = async () => {
    const contenido = reply.trim()
    if (!contenido) return
    const tempId = `tmp-${Date.now()}`
    const optimista = {
      kind: 'nota',
      id: tempId,
      ts: new Date().toISOString(),
      autor: miNombre || 'Tú',
      contenido,
      _pending: true,
    }
    setItems(prev => [...prev, optimista])
    setReply('')
    setSending(true)
    try {
      const created = await apiFetch(`/api/nodos/${nodoId}/notas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contenido }),
      })
      setItems(prev => prev.map(i => i.id === tempId
        ? { kind: 'nota', id: `n${created.id}`, ts: created.ts, autor: created.autor, contenido: created.contenido }
        : i))
    } catch (e) {
      setItems(prev => prev.map(i => i.id === tempId ? { ...i, _pending: false, _failed: true } : i))
    } finally {
      setSending(false)
    }
  }

  const enviarWhatsapp = async () => {
    const mensaje = waText.trim()
    if (!mensaje) return
    setWaSending(true)
    setWaMsg(null)
    try {
      const r = await apiFetch('/api/wa/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje, destino: waDestino, nodo_id: nodoId }),
      })
      setWaText('')
      setWaOpen(false)
      setWaMsg({ ok: true, text: r.enviado ? 'Mensaje enviado por WhatsApp.' : 'Guardado. WhatsApp no está configurado en el servidor — el mensaje quedó en el log.' })
      // Refresh timeline to show the new whatsapp bubble
      cargar(true)
      setTimeout(() => setWaMsg(null), 5000)
    } catch (e) {
      setWaMsg({ ok: false, text: e.message || 'Error al enviar' })
    } finally {
      setWaSending(false)
    }
  }

  return (
    <div className="flex flex-col h-[60vh]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading && items.length === 0 && (
          <div className="text-center py-8 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            <Loader2 size={16} className="animate-spin inline-block mr-2" />Cargando conversación...
          </div>
        )}
        {!loading && items.length === 0 && (
          <div className="text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
            <MessageCircle size={28} className="mx-auto mb-2 opacity-50" />
            <p className="text-xs">Sin actividad todavía. Escribe la primera nota abajo.</p>
          </div>
        )}
        {items.map(item => {
          if (item.kind === 'evento') return <BubbleEvento key={item.id} item={item} />
          if (item.kind === 'tratamiento') return <BubbleTratamiento key={item.id} item={item} />
          if (item.kind === 'whatsapp') return <BubbleWhatsapp key={item.id} item={item} />
          return <BubbleNota key={item.id} item={item} miNombre={miNombre} />
        })}
      </div>

      {/* Toast de feedback de WhatsApp */}
      {waMsg && (
        <div
          className="px-4 py-2 text-[12px]"
          style={{
            background: waMsg.ok ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
            color: waMsg.ok ? 'var(--color-accent-green)' : 'var(--color-accent-red)',
            borderTop: `1px solid ${waMsg.ok ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
          }}
        >
          {waMsg.text}
        </div>
      )}

      {/* Input de WhatsApp manual (panel desplegable) */}
      {waOpen && (
        <div
          className="px-4 py-3 space-y-2"
          style={{ borderTop: '1px solid var(--color-border)', background: 'rgba(37,211,102,0.05)' }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#25d366' }}>
              <MessageSquareText size={12} className="inline-block mr-1" />
              Enviar por WhatsApp
            </span>
            <select
              value={waDestino}
              onChange={(e) => setWaDestino(e.target.value)}
              className="text-[11px] px-2 py-1 rounded-md outline-none"
              style={{
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            >
              <option value="productor">Al productor</option>
              <option value="agronomo">Al agrónomo</option>
              <option value="equipo">A todo el equipo</option>
            </select>
            <button
              onClick={() => setWaOpen(false)}
              className="p-1 rounded hover-surface"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <XIcon size={14} />
            </button>
          </div>
          <textarea
            value={waText}
            onChange={(e) => setWaText(e.target.value)}
            disabled={waSending}
            rows={3}
            placeholder={`Mensaje para ${waDestino}... Se firma automáticamente con tu nombre.`}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
            style={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />
          <div className="flex justify-between items-center">
            <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              {waText.length}/4096 · El mensaje queda en el log y aparece en la conversación.
            </span>
            <button
              onClick={enviarWhatsapp}
              disabled={waSending || !waText.trim()}
              className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors"
              style={{
                background: waText.trim() ? '#25d366' : 'var(--color-surface-3)',
                color: waText.trim() ? '#fff' : 'var(--color-text-muted)',
                opacity: waSending ? 0.6 : 1,
                cursor: waSending || !waText.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {waSending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              Enviar WhatsApp
            </button>
          </div>
        </div>
      )}

      {/* Input de nota interna */}
      <div className="px-4 py-3" style={{ borderTop: '1px solid var(--color-border)' }}>
        <div className="flex gap-2">
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !sending && reply.trim()) { e.preventDefault(); enviar() } }}
            disabled={sending}
            placeholder="Escribe una nota — qué viste, qué hiciste, qué falta..."
            className="flex-1 px-3.5 py-2 rounded-xl text-sm outline-none"
            style={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />
          <button
            onClick={() => setWaOpen(o => !o)}
            className="px-3 py-2 rounded-xl text-sm transition-colors"
            style={{
              background: waOpen ? 'rgba(37,211,102,0.15)' : 'var(--color-surface-2)',
              color: waOpen ? '#25d366' : 'var(--color-text-muted)',
              border: `1px solid ${waOpen ? 'rgba(37,211,102,0.3)' : 'var(--color-border)'}`,
            }}
            title="Enviar por WhatsApp al productor o agrónomo"
          >
            <MessageSquareText size={14} />
          </button>
          <button
            onClick={enviar}
            disabled={sending || !reply.trim()}
            className="px-3.5 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
            style={{
              background: reply.trim() ? 'var(--color-accent-green)' : 'var(--color-surface-3)',
              color: reply.trim() ? '#fff' : 'var(--color-text-muted)',
              opacity: sending ? 0.6 : 1,
              cursor: sending || !reply.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Enviar
          </button>
        </div>
        <p className="text-[10px] mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
          Las notas quedan visibles para todo el equipo. El botón verde envía por WhatsApp.
        </p>
      </div>
    </div>
  )
}

function Stat({ label, valor, tecnico }) {
  return (
    <div
      className="rounded-xl px-3 py-2.5"
      style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
    >
      <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
      <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{valor}</p>
      {tecnico && <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{tecnico}</p>}
    </div>
  )
}

function describirHumedad(v) {
  if (v == null) return '—'
  if (v < 22) return 'raíces secándose'
  if (v < 28) return 'rango bajo'
  if (v < 40) return 'humedad cómoda'
  if (v < 48) return 'húmedo'
  return 'muy húmedo'
}
function describirTemp(v) {
  if (v == null) return '—'
  if (v < 15) return 'frío'
  if (v < 22) return 'fresco'
  if (v < 28) return 'óptimo'
  return 'caliente'
}
function describirEC(v) {
  if (v == null) return '—'
  if (v < 1.0) return 'bajo'
  if (v < 2.0) return 'normal'
  if (v < 3.0) return 'alto'
  return 'muy alto'
}
function describirBateria(v) {
  if (v == null) return '—'
  if (v < 3.1) return 'crítica'
  if (v < 3.3) return 'baja'
  if (v < 3.6) return 'normal'
  return 'llena'
}

function DatosTab({ nodo }) {
  const u = nodo.ultima_lectura || {}
  const n = narrate(nodo)
  return (
    <div className="px-4 py-4 space-y-4">
      {n.headline && (
        <div
          className="rounded-2xl p-4"
          style={{
            background: 'var(--color-surface-2)',
            border: `1px solid ${n.severity === 'red' ? 'rgba(239,68,68,0.25)' : n.severity === 'amber' ? 'rgba(245,158,11,0.25)' : 'rgba(16,185,129,0.25)'}`,
          }}
        >
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
            {n.headline.split(' — ').slice(1).join(' — ') || n.headline}
          </p>
          {n.why && <p className="text-[12px] leading-snug" style={{ color: 'var(--color-text-secondary)' }}>{n.why}</p>}
          <p className="text-[11px] font-mono mt-2" style={{ color: 'var(--color-text-muted)' }}>{n.technical}</p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <Stat label="Humedad 10cm" valor={describirHumedad(u.h10_avg)} tecnico={u.h10_avg != null ? `${Number(u.h10_avg).toFixed(1)}% VWC` : '—'} />
        <Stat label="Humedad 20cm" valor={describirHumedad(u.h20_avg)} tecnico={u.h20_avg != null ? `${Number(u.h20_avg).toFixed(1)}% VWC` : '—'} />
        <Stat label="Humedad 30cm" valor={describirHumedad(u.h30_avg)} tecnico={u.h30_avg != null ? `${Number(u.h30_avg).toFixed(1)}% VWC` : '—'} />
        <Stat label="Temperatura subsuelo" valor={describirTemp(u.t20)} tecnico={u.t20 != null ? `${Number(u.t20).toFixed(1)} °C` : '—'} />
        <Stat label="Salinidad" valor={describirEC(u.ec30)} tecnico={u.ec30 != null ? `${Number(u.ec30).toFixed(2)} dS/m` : '—'} />
        <Stat label="Pila" valor={describirBateria(u.bateria)} tecnico={u.bateria != null ? `${Number(u.bateria).toFixed(2)} V` : '—'} />
      </div>

      <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
        Última lectura: {u.tiempo ? fmtTime(u.tiempo) : '—'} · Score Phytophthora: {nodo.score_phytophthora}/100
      </div>
    </div>
  )
}

function NotasTab({ nodoId, miNombre }) {
  const [notas, setNotas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    apiFetch(`/api/nodos/${nodoId}/notas?limit=200`)
      .then(setNotas)
      .catch(() => setNotas([]))
      .finally(() => setLoading(false))
  }, [nodoId])

  if (loading) return (
    <div className="px-4 py-8 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
      <Loader2 size={16} className="animate-spin inline-block mr-2" />Cargando...
    </div>
  )

  if (notas.length === 0) return (
    <div className="px-4 py-12 text-center" style={{ color: 'var(--color-text-muted)' }}>
      <MessageCircle size={24} className="mx-auto mb-2 opacity-50" />
      <p className="text-xs">Sin notas todavía. Escribe en la pestaña Conversación.</p>
    </div>
  )

  return (
    <div className="px-4 py-4 space-y-2">
      {notas.map(n => {
        const esMia = n.autor === miNombre
        return (
          <div
            key={n.id}
            className="rounded-xl px-4 py-3"
            style={{
              background: esMia ? 'var(--color-accent-green-dim)' : 'var(--color-surface-2)',
              border: `1px solid ${esMia ? 'rgba(16,185,129,0.2)' : 'var(--color-border)'}`,
            }}
          >
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <span className="text-[11px] font-semibold" style={{ color: esMia ? 'var(--color-accent-green)' : 'var(--color-text-primary)' }}>
                {n.autor || 'Anónimo'}
              </span>
              <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{fmtTime(n.ts)}</span>
            </div>
            <p className="text-sm whitespace-pre-wrap leading-snug" style={{ color: 'var(--color-text-primary)' }}>{n.contenido}</p>
          </div>
        )
      })}
    </div>
  )
}

const SEV_COLOR = { red: 'var(--color-accent-red)', amber: 'var(--color-accent-amber)', green: 'var(--color-accent-green)' }

export default function NodoDetalleModal({ nodo, open, onClose }) {
  const [tab, setTab] = useState('conversacion')
  const { user } = useAuth()
  const miNombre = user?.nombre

  useEffect(() => { if (open) setTab('conversacion') }, [open, nodo?.nodo_id])

  if (!nodo) return null
  const n = narrate(nodo)
  const sevColor = SEV_COLOR[n.severity]

  const headerExtra = (
    <span
      className="px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider"
      style={{
        background: `${sevColor}20`,
        color: sevColor,
        border: `1px solid ${sevColor}40`,
      }}
    >
      {n.severity === 'red' ? 'Atender hoy' : n.severity === 'amber' ? 'Monitorear' : 'Sin pendientes'}
    </span>
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={nodo.nombre}
      subtitle={[nodo.bloque, nodo.rol].filter(Boolean).join(' · ')}
      headerExtra={headerExtra}
      size="lg"
    >
      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { key: 'conversacion', label: 'Conversación' },
          { key: 'datos', label: 'Datos' },
          { key: 'notas', label: 'Notas' },
        ]}
      />
      {tab === 'conversacion' && <ConversacionTab nodo={nodo} miNombre={miNombre} />}
      {tab === 'datos' && <DatosTab nodo={nodo} />}
      {tab === 'notas' && <NotasTab nodoId={nodo.nodo_id} miNombre={miNombre} />}
    </Modal>
  )
}
