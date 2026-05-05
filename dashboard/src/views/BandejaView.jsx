import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import {
  Search, Inbox, RefreshCw, ChevronRight, Wifi, WifiOff,
  Send, MessageCircle, CheckCircle2, XCircle, Clock,
  Loader2, Sparkles, ShieldAlert, FileText, Droplets,
} from 'lucide-react'
import { useApi, apiFetch } from '../hooks/useApi'
import { narrate, severityRank } from '../lib/nodeNarrative'
import NodoDetalleModal from '../components/NodoDetalleModal'
import Tabs from '../components/Tabs'
import Loading from '../components/Loading'

const SEV_DOT = {
  red:   { color: 'var(--color-accent-red)',   glow: '0 0 10px rgba(239,68,68,0.5)',  label: 'Atender hoy' },
  amber: { color: 'var(--color-accent-amber)', glow: '0 0 8px rgba(245,158,11,0.4)',  label: 'Monitorear' },
  green: { color: 'var(--color-accent-green)', glow: '0 0 8px rgba(16,185,129,0.3)',  label: 'Sin pendientes' },
}

function timeAgo(iso) {
  if (!iso) return '—'
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
  try { return new Date(iso).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) }
  catch { return iso }
}

/* ────────────────────────────────────────────────────────── */
/* Sub-tab: Nodos                                              */
/* ────────────────────────────────────────────────────────── */
function NodosSubtab({ predioId, onSelect }) {
  const { data, loading } = useApi(`/api/predios/${predioId}/overview`)
  const [search, setSearch] = useState('')
  const [filtro, setFiltro] = useState('todos')

  const enriquecidos = useMemo(() => {
    if (!data) return []
    return data.nodos
      .map(n => ({ nodo: n, narrative: narrate(n) }))
      .sort((a, b) => {
        const r = severityRank(a.narrative.severity) - severityRank(b.narrative.severity)
        if (r !== 0) return r
        return (b.nodo.score_phytophthora || 0) - (a.nodo.score_phytophthora || 0)
      })
  }, [data])

  const filtrados = useMemo(() => {
    let lista = enriquecidos
    if (filtro !== 'todos') lista = lista.filter(({ narrative }) => narrative.severity === filtro)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      lista = lista.filter(({ nodo, narrative }) =>
        (nodo.nombre || '').toLowerCase().includes(q) ||
        (nodo.bloque || '').toLowerCase().includes(q) ||
        (narrative.headline || '').toLowerCase().includes(q)
      )
    }
    return lista
  }, [enriquecidos, filtro, search])

  if (loading && !data) return <Loading />

  const counts = {
    todos: enriquecidos.length,
    red: enriquecidos.filter(x => x.narrative.severity === 'red').length,
    amber: enriquecidos.filter(x => x.narrative.severity === 'amber').length,
    green: enriquecidos.filter(x => x.narrative.severity === 'green').length,
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            placeholder="Buscar nodo, bloque, alerta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-lg text-sm outline-none"
            style={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {[
            { key: 'todos', label: 'Todos', count: counts.todos },
            { key: 'red',   label: 'Atender hoy', count: counts.red },
            { key: 'amber', label: 'Monitorear', count: counts.amber },
            { key: 'green', label: 'Sin pendientes', count: counts.green },
          ].map(f => {
            const isActive = filtro === f.key
            return (
              <button
                key={f.key}
                onClick={() => setFiltro(f.key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{
                  background: isActive ? 'var(--color-accent-green-dim)' : 'var(--color-surface-2)',
                  color: isActive ? 'var(--color-accent-green)' : 'var(--color-text-muted)',
                  border: `1px solid ${isActive ? 'rgba(16,185,129,0.3)' : 'var(--color-border)'}`,
                }}
              >
                {f.label}
                <span className="text-[10px] opacity-70">{f.count}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}>
        {filtrados.length === 0 ? (
          <div className="px-6 py-12 text-center" style={{ color: 'var(--color-text-muted)' }}>
            <Inbox size={28} className="mx-auto mb-2 opacity-50" />
            <p className="text-xs">
              {enriquecidos.length === 0 ? 'Este predio no tiene nodos configurados.' : 'Ningún nodo coincide con los filtros.'}
            </p>
          </div>
        ) : filtrados.map(({ nodo, narrative }) => {
          const sev = SEV_DOT[narrative.severity]
          return (
            <button
              key={nodo.nodo_id}
              onClick={() => onSelect(nodo)}
              className="w-full text-left transition-colors hover-surface"
              style={{ borderTop: '1px solid var(--color-border)' }}
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: sev.color, boxShadow: sev.glow }} />
                <div className="min-w-0 w-[200px] hidden sm:block">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{nodo.nombre}</p>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{nodo.bloque || nodo.rol || '—'}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate sm:hidden font-semibold" style={{ color: 'var(--color-text-primary)' }}>{nodo.nombre}</p>
                  <p className="text-[13px] truncate" style={{ color: narrative.severity === 'green' ? 'var(--color-text-muted)' : 'var(--color-text-secondary)' }}>
                    {narrative.headline.split(' — ').slice(1).join(' — ') || narrative.headline}
                  </p>
                  {narrative.why && narrative.severity !== 'green' && (
                    <p className="hidden md:block text-[11px] truncate mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{narrative.why}</p>
                  )}
                </div>
                <div className="hidden md:block text-right shrink-0 w-[100px]">
                  <p className="text-[11px] font-mono" style={{ color: 'var(--color-text-muted)' }}>{timeAgo(nodo.ultima_lectura?.tiempo)}</p>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    {nodo.online ? <Wifi size={10} style={{ color: 'var(--color-accent-green)' }} /> : <WifiOff size={10} style={{ color: 'var(--color-accent-red)' }} />}
                    <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{nodo.online ? 'online' : 'offline'}</span>
                  </div>
                </div>
                <ChevronRight size={14} className="shrink-0" style={{ color: 'var(--color-text-muted)' }} />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────── */
/* Sub-tab: Chat con el productor / agrónomo                    */
/* ────────────────────────────────────────────────────────── */
const DESTINO_META = {
  productor: { label: 'Productor', short: 'al productor', color: 'var(--color-accent-green)' },
  agronomo:  { label: 'Agrónomo',  short: 'al agrónomo',  color: 'var(--color-accent-blue, #818cf8)' },
  equipo:    { label: 'Equipo',    short: 'al equipo',    color: 'var(--color-accent-amber)' },
  manual:    { label: 'Manual',    short: 'manual',       color: 'var(--color-accent-amber)' },
}

const PLANTILLAS = [
  { key: 'riego',    label: 'Riego del día',     Icon: Droplets },
  { key: 'alertas',  label: 'Alertas críticas',  Icon: ShieldAlert },
  { key: 'reporte',  label: 'Reporte semanal',   Icon: FileText },
]

function BubbleIn({ item }) {
  const orig = item.origen === 'productor' ? 'Productor'
    : item.origen === 'agronomo' ? 'Agrónomo'
    : item.telefono ? `···${item.telefono.slice(-4)}` : 'Entrante'
  return (
    <div className="flex">
      <div
        className="rounded-2xl rounded-tl-sm px-3.5 py-2.5 max-w-[78%]"
        style={{
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{orig}</span>
          <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>· {timeAgo(item.ts)}</span>
        </div>
        <p className="text-[13px] whitespace-pre-wrap leading-snug" style={{ color: 'var(--color-text-primary)' }}>{item.mensaje}</p>
      </div>
    </div>
  )
}

function BubbleOut({ item }) {
  const meta = DESTINO_META[item.destino] || DESTINO_META.productor
  return (
    <div className="flex justify-end">
      <div
        className="rounded-2xl rounded-tr-sm px-3.5 py-2.5 max-w-[78%]"
        style={{
          background: item.success ? 'rgba(37,211,102,0.12)' : 'rgba(239,68,68,0.10)',
          border: `1px solid ${item.success ? 'rgba(37,211,102,0.25)' : 'rgba(239,68,68,0.3)'}`,
          opacity: item._pending ? 0.65 : 1,
        }}
      >
        <div className="flex items-center gap-2 mb-1 justify-end">
          <span className="text-[10px] font-semibold" style={{ color: meta.color }}>
            {meta.short}
          </span>
          {item._pending
            ? <Loader2 size={10} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
            : item.success
              ? <CheckCircle2 size={10} style={{ color: '#25d366' }} />
              : <XCircle size={10} style={{ color: 'var(--color-accent-red)' }} />
          }
          <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{timeAgo(item.ts)}</span>
        </div>
        <p className="text-[13px] whitespace-pre-wrap leading-snug" style={{ color: 'var(--color-text-primary)' }}>{item.mensaje}</p>
        {!item.success && item.error_msg && (
          <p className="text-[10px] font-mono mt-1" style={{ color: 'var(--color-accent-red)' }}>{item.error_msg}</p>
        )}
      </div>
    </div>
  )
}

function ChatSubtab({ predioId }) {
  const [items, setItems] = useState(null)
  const [destino, setDestino] = useState('productor')
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingPlantilla, setLoadingPlantilla] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  const cargar = useCallback(async (silent = false) => {
    if (!silent) setItems(null)
    try {
      const data = await apiFetch(`/api/wa/conversacion?predio_id=${predioId}&limit=300`)
      setItems(prev => {
        if (!prev) return data
        const pendientes = prev.filter(i => i._pending && !data.find(d => d.id === i.id))
        return [...data, ...pendientes]
      })
    } catch (e) {
      if (!silent) setItems([])
    }
  }, [predioId])

  useEffect(() => { cargar() }, [cargar])
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [items])

  // Poll cada 20s para mensajes nuevos del productor
  useEffect(() => {
    const id = setInterval(() => cargar(true), 20_000)
    return () => clearInterval(id)
  }, [cargar])

  const enviar = async () => {
    const mensaje = reply.trim()
    if (!mensaje) return
    const tempId = `tmp-${Date.now()}`
    const optimista = {
      kind: 'out', id: tempId, ts: new Date().toISOString(),
      destino, mensaje, success: true, _pending: true,
    }
    setItems(prev => [...(prev || []), optimista])
    setReply('')
    setSending(true)
    setErrorMsg(null)
    try {
      const r = await apiFetch('/api/wa/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje, destino, predio_id: predioId }),
      })
      // Refresh para traer la versión real con id, success, etc.
      await cargar(true)
      if (!r.enviado) {
        setErrorMsg('Mensaje guardado en log. WhatsApp no está configurado en el servidor (faltan credenciales Meta).')
        setTimeout(() => setErrorMsg(null), 8000)
      }
    } catch (e) {
      setItems(prev => (prev || []).map(i => i.id === tempId ? { ...i, _pending: false, success: false, error_msg: e.message } : i))
      setErrorMsg(e.message || 'Error al enviar')
      setTimeout(() => setErrorMsg(null), 6000)
    } finally {
      setSending(false)
    }
  }

  const cargarPlantilla = async (tipo) => {
    setLoadingPlantilla(tipo)
    try {
      const r = await apiFetch('/api/wa/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, predio_id: predioId }),
      })
      setReply(r.mensaje || '')
      setTimeout(() => inputRef.current?.focus(), 50)
    } catch (e) {
      setErrorMsg(`No se pudo generar la plantilla: ${e.message}`)
      setTimeout(() => setErrorMsg(null), 6000)
    } finally {
      setLoadingPlantilla(null)
    }
  }

  return (
    <div
      className="rounded-2xl flex flex-col"
      style={{
        background: 'var(--color-surface-1)',
        border: '1px solid var(--color-border)',
        height: 'calc(100vh - 280px)',
        minHeight: 480,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-2.5"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
          Hablando con
        </span>
        <select
          value={destino}
          onChange={(e) => setDestino(e.target.value)}
          className="text-xs px-2 py-1 rounded-md outline-none"
          style={{
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
        >
          <option value="productor">Productor</option>
          <option value="agronomo">Agrónomo</option>
          <option value="equipo">Productor + Agrónomo</option>
        </select>
        <button
          onClick={() => cargar(true)}
          className="ml-auto p-1.5 rounded-md hover-surface"
          style={{ color: 'var(--color-text-muted)' }}
          title="Refrescar"
        >
          <RefreshCw size={13} />
        </button>
      </div>

      {/* Mensajes */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {items === null && (
          <div className="text-center py-8 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            <Loader2 size={16} className="animate-spin inline-block mr-2" />Cargando conversación...
          </div>
        )}
        {items && items.length === 0 && (
          <div className="text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
            <MessageCircle size={32} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Sin mensajes todavía</p>
            <p className="text-[11px] mt-1.5">Usa una plantilla o escribe directo abajo. Lo que envíes y reciba el productor queda aquí.</p>
          </div>
        )}
        {items && items.map(item =>
          item.kind === 'in'
            ? <BubbleIn key={item.id} item={item} />
            : <BubbleOut key={item.id} item={item} />
        )}
      </div>

      {/* Toast errores */}
      {errorMsg && (
        <div
          className="px-4 py-2 text-[12px]"
          style={{
            background: 'rgba(245,158,11,0.08)',
            color: 'var(--color-accent-amber)',
            borderTop: '1px solid rgba(245,158,11,0.25)',
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* Plantillas */}
      <div className="px-4 pt-3 pb-1.5 flex gap-2 flex-wrap" style={{ borderTop: '1px solid var(--color-border)' }}>
        <span className="text-[10px] uppercase tracking-wider self-center" style={{ color: 'var(--color-text-muted)' }}>
          Plantillas:
        </span>
        {PLANTILLAS.map(p => (
          <button
            key={p.key}
            onClick={() => cargarPlantilla(p.key)}
            disabled={loadingPlantilla !== null}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors hover-surface"
            style={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
              opacity: loadingPlantilla !== null && loadingPlantilla !== p.key ? 0.4 : 1,
            }}
          >
            {loadingPlantilla === p.key
              ? <Loader2 size={10} className="animate-spin" />
              : <p.Icon size={10} />
            }
            {p.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="px-4 pt-2 pb-3 flex gap-2 items-end">
        <textarea
          ref={inputRef}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !sending && reply.trim()) {
              e.preventDefault()
              enviar()
            }
          }}
          disabled={sending}
          rows={Math.min(6, Math.max(1, reply.split('\n').length))}
          placeholder="Escribe al productor... Enter para enviar · Shift+Enter para línea nueva"
          className="flex-1 px-3.5 py-2 rounded-xl text-sm outline-none resize-none"
          style={{
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
            maxHeight: 140,
          }}
        />
        <button
          onClick={enviar}
          disabled={sending || !reply.trim()}
          className="px-3.5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors shrink-0"
          style={{
            background: reply.trim() ? '#25d366' : 'var(--color-surface-3)',
            color: reply.trim() ? '#fff' : 'var(--color-text-muted)',
            opacity: sending ? 0.6 : 1,
            cursor: sending || !reply.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          Enviar
        </button>
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────── */
/* Sub-tab: Notas del equipo                                   */
/* ────────────────────────────────────────────────────────── */
function NotasSubtab({ predioId, onSelectNodo, nodos }) {
  const [notas, setNotas] = useState(null)
  const [search, setSearch] = useState('')

  const cargar = () => {
    apiFetch(`/api/predios/${predioId}/notas?limit=200`)
      .then(setNotas)
      .catch(() => setNotas([]))
  }
  useEffect(() => { cargar() }, [predioId])

  const filtrados = useMemo(() => {
    if (!notas) return null
    if (!search.trim()) return notas
    const q = search.trim().toLowerCase()
    return notas.filter(n =>
      (n.contenido || '').toLowerCase().includes(q) ||
      (n.autor || '').toLowerCase().includes(q) ||
      (n.nodo_nombre || '').toLowerCase().includes(q)
    )
  }, [notas, search])

  if (!notas) return <Loading />

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            placeholder="Buscar nota, autor, nodo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
          />
        </div>
        <button
          onClick={cargar}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
          style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
        >
          <RefreshCw size={13} />
          Refrescar
        </button>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}>
        {filtrados.length === 0 ? (
          <div className="px-6 py-12 text-center" style={{ color: 'var(--color-text-muted)' }}>
            <MessageCircle size={28} className="mx-auto mb-2 opacity-50" />
            <p className="text-xs">
              {notas.length === 0
                ? 'Sin notas todavía. Abre cualquier nodo y escribe la primera.'
                : 'Ninguna nota coincide con la búsqueda.'}
            </p>
          </div>
        ) : filtrados.map(n => {
          const nodo = nodos.find(x => x.nodo_id === n.nodo_id)
          return (
            <button
              key={n.id}
              onClick={() => nodo && onSelectNodo(nodo)}
              className="w-full text-left transition-colors hover-surface"
              style={{ borderTop: '1px solid var(--color-border)' }}
            >
              <div className="flex items-start gap-3 px-4 py-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold"
                  style={{ background: 'var(--color-accent-green-dim)', color: 'var(--color-accent-green)', border: '1px solid rgba(16,185,129,0.25)' }}
                >
                  {(n.autor || '?')[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[12px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>{n.autor || 'Anónimo'}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-secondary)' }}>
                      {n.nodo_nombre}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>· {timeAgo(n.ts)}</span>
                  </div>
                  <p className="text-[13px] whitespace-pre-wrap leading-snug" style={{ color: 'var(--color-text-secondary)' }}>{n.contenido}</p>
                </div>
                <ChevronRight size={14} className="shrink-0 mt-1" style={{ color: 'var(--color-text-muted)' }} />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────── */
/* BandejaView                                                 */
/* ────────────────────────────────────────────────────────── */
export default function BandejaView({ predioId }) {
  const { data } = useApi(`/api/predios/${predioId}/overview`)
  const [subtab, setSubtab] = useState('nodos')
  const [seleccionado, setSeleccionado] = useState(null)

  const nodos = data?.nodos || []
  const pendientes = useMemo(() => nodos.filter(n => narrate(n).severity !== 'green').length, [nodos])

  return (
    <div className="space-y-4 animate-in">
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--color-glow-green)', border: '1px solid var(--color-accent-green-dim)' }}
        >
          <Inbox size={16} style={{ color: 'var(--color-accent-green)' }} />
        </div>
        <div>
          <h1 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Bandeja{data?.predio?.nombre ? ` — ${data.predio.nombre}` : ''}
          </h1>
          <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            Nodos como conversaciones · alertas que el sistema mandó · notas del equipo
          </p>
        </div>
      </div>

      <Tabs
        active={subtab}
        onChange={setSubtab}
        tabs={[
          { key: 'nodos', label: 'Nodos', count: pendientes > 0 ? pendientes : undefined },
          { key: 'chat',  label: 'Chat con productor' },
          { key: 'notas', label: 'Notas del equipo' },
        ]}
      />

      <div className="pt-1">
        {subtab === 'nodos' && <NodosSubtab predioId={predioId} onSelect={setSeleccionado} />}
        {subtab === 'chat'  && <ChatSubtab predioId={predioId} />}
        {subtab === 'notas' && <NotasSubtab predioId={predioId} nodos={nodos} onSelectNodo={setSeleccionado} />}
      </div>

      <NodoDetalleModal
        nodo={seleccionado}
        open={!!seleccionado}
        onClose={() => setSeleccionado(null)}
      />
    </div>
  )
}
