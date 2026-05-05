import { useState, useMemo, useEffect } from 'react'
import {
  Search, Inbox, RefreshCw, ChevronRight, Wifi, WifiOff,
  Send, MessageCircle, CheckCircle2, XCircle, Clock,
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
/* Sub-tab: Mensajes (WhatsApp outbox)                         */
/* ────────────────────────────────────────────────────────── */
const DESTINO_META = {
  productor: { label: 'Productor', color: 'var(--color-accent-green)' },
  agronomo:  { label: 'Agrónomo',  color: 'var(--color-accent-blue, #818cf8)' },
  manual:    { label: 'Manual',    color: 'var(--color-accent-amber)' },
}

function MensajesSubtab({ predioId, nodos }) {
  const [mensajes, setMensajes] = useState(null)
  const [search, setSearch] = useState('')
  const [expandido, setExpandido] = useState(null)

  const cargar = () => {
    apiFetch(`/api/wa/outbox?predio_id=${predioId}&limit=200`)
      .then(setMensajes)
      .catch(() => setMensajes([]))
  }
  useEffect(() => { cargar() }, [predioId])

  const nodoNombre = (id) => id ? (nodos.find(n => n.nodo_id === id)?.nombre || `Nodo ${id}`) : null

  const filtrados = useMemo(() => {
    if (!mensajes) return null
    if (!search.trim()) return mensajes
    const q = search.trim().toLowerCase()
    return mensajes.filter(m =>
      (m.mensaje || '').toLowerCase().includes(q) ||
      (m.destino || '').toLowerCase().includes(q) ||
      (m.telefono || '').includes(q)
    )
  }, [mensajes, search])

  if (!mensajes) return <Loading />

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            placeholder="Buscar mensaje, destinatario..."
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
            <Send size={28} className="mx-auto mb-2 opacity-50" />
            <p className="text-xs">
              {mensajes.length === 0
                ? 'No se han enviado mensajes WhatsApp todavía.'
                : 'Ningún mensaje coincide con la búsqueda.'}
            </p>
            <p className="text-[10px] mt-1">El sistema envía alertas críticas + receta diaria de riego al productor y al agrónomo.</p>
          </div>
        ) : filtrados.map(m => {
          const meta = DESTINO_META[m.destino] || { label: m.destino || '?', color: 'var(--color-text-muted)' }
          const exp = expandido === m.id
          const nodo = nodoNombre(m.nodo_id)
          const Icon = m.success ? CheckCircle2 : XCircle
          const iconColor = m.success ? 'var(--color-accent-green)' : 'var(--color-accent-red)'
          return (
            <button
              key={m.id}
              onClick={() => setExpandido(exp ? null : m.id)}
              className="w-full text-left transition-colors hover-surface"
              style={{ borderTop: '1px solid var(--color-border)' }}
            >
              <div className="flex items-start gap-3 px-4 py-3">
                <Icon size={14} className="shrink-0 mt-0.5" style={{ color: iconColor }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: meta.color }}>
                      {meta.label}
                    </span>
                    {m.telefono && (
                      <span className="text-[10px] font-mono" style={{ color: 'var(--color-text-muted)' }}>
                        ···{m.telefono.slice(-4)}
                      </span>
                    )}
                    {nodo && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-secondary)' }}>
                        {nodo}
                      </span>
                    )}
                    <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>· {timeAgo(m.ts)}</span>
                  </div>
                  <p
                    className={`text-[13px] whitespace-pre-wrap ${exp ? '' : 'truncate'}`}
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {m.mensaje}
                  </p>
                  {!m.success && m.error_msg && (
                    <p className="text-[11px] mt-1 font-mono" style={{ color: 'var(--color-accent-red)' }}>
                      {m.error_msg}
                    </p>
                  )}
                </div>
                <span className="text-[10px] shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                  {fmtTime(m.ts)}
                </span>
              </div>
            </button>
          )
        })}
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
          { key: 'nodos',    label: 'Nodos',    count: pendientes > 0 ? pendientes : undefined },
          { key: 'mensajes', label: 'Mensajes' },
          { key: 'notas',    label: 'Notas del equipo' },
        ]}
      />

      <div className="pt-1">
        {subtab === 'nodos' && <NodosSubtab predioId={predioId} onSelect={setSeleccionado} />}
        {subtab === 'mensajes' && <MensajesSubtab predioId={predioId} nodos={nodos} />}
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
