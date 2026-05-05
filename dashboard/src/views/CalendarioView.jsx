import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Calendar, ChevronLeft, ChevronRight, Plus, Loader2, Trash2,
  MapPin, Wrench, Settings, Sparkles, ShoppingBasket, Users, Microscope, CalendarClock,
  RefreshCw, X as XIcon, MessageSquareText,
} from 'lucide-react'
import { useApi, apiFetch } from '../hooks/useApi'
import { useAuth } from '../hooks/useAuth'
import Modal from '../components/Modal'
import Loading from '../components/Loading'

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const TIPOS = [
  { key: 'cita',          label: 'Cita seguimiento',  Icon: MapPin,         color: 'var(--color-accent-blue, #818cf8)' },
  { key: 'instalacion',   label: 'Instalación',        Icon: Wrench,         color: 'var(--color-accent-amber)' },
  { key: 'mantenimiento', label: 'Mantenimiento',      Icon: Settings,       color: '#a78bfa' },
  { key: 'aplicacion',    label: 'Aplicación',         Icon: Sparkles,       color: 'var(--color-accent-green)' },
  { key: 'cosecha',       label: 'Cosecha',            Icon: ShoppingBasket, color: '#fb923c' },
  { key: 'reunion',       label: 'Reunión',            Icon: Users,          color: 'var(--color-text-muted)' },
  { key: 'laboratorio',   label: 'Laboratorio',        Icon: Microscope,     color: '#22d3ee' },
  { key: 'otro',          label: 'Otro',               Icon: CalendarClock,  color: 'var(--color-text-muted)' },
]

const TIPO_BY_KEY = Object.fromEntries(TIPOS.map(t => [t.key, t]))
const ESTADOS = ['programado', 'completado', 'cancelado']

function tipoMeta(tipo) {
  return TIPO_BY_KEY[tipo] || TIPO_BY_KEY.otro
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmtFecha(s) {
  if (!s) return ''
  const [y, m, d] = s.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]} ${y}`
}

function fmtHora(s) {
  if (!s) return ''
  return s.slice(0, 5)
}

export default function CalendarioView({ predioId }) {
  const { user } = useAuth()
  const { data: predios } = useApi('/api/predios')
  const { data: overview } = useApi(`/api/predios/${predioId}/overview`)
  const nodos = overview?.nodos || []

  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    return { y: d.getFullYear(), m: d.getMonth() }
  })
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroPredio, setFiltroPredio] = useState('actual') // 'actual' | 'todos' | predio_id num
  const [filtroTipos, setFiltroTipos] = useState(new Set())
  const [editando, setEditando] = useState(null) // { isNew, item }
  const [diaExpandido, setDiaExpandido] = useState(null)

  const desde = `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}-01`
  const hasta = (() => {
    const d = new Date(cursor.y, cursor.m + 1, 0)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })()

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ desde, hasta, limit: '500' })
      const pid = filtroPredio === 'actual' ? predioId : (filtroPredio === 'todos' ? null : filtroPredio)
      if (pid != null) params.set('predio_id', pid)
      const data = await apiFetch(`/api/calendario?${params}`)
      setEventos(data)
    } catch (e) { setEventos([]) } finally { setLoading(false) }
  }, [desde, hasta, filtroPredio, predioId])

  useEffect(() => { cargar() }, [cargar])

  const eventosVisibles = useMemo(() => {
    if (filtroTipos.size === 0) return eventos
    return eventos.filter(e => filtroTipos.has(e.tipo))
  }, [eventos, filtroTipos])

  const porDia = useMemo(() => {
    const m = {}
    eventosVisibles.forEach(e => {
      const k = e.fecha
      if (!k) return
      ;(m[k] = m[k] || []).push(e)
    })
    Object.values(m).forEach(list => list.sort((a, b) => (a.hora || '').localeCompare(b.hora || '')))
    return m
  }, [eventosVisibles])

  const firstDay = new Date(cursor.y, cursor.m, 1)
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate()
  const offset = (firstDay.getDay() + 6) % 7 // lunes = 0
  const cells = []
  for (let i = 0; i < offset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const shift = (dir) => setCursor(({ y, m }) => {
    const t = m + dir
    if (t < 0) return { y: y - 1, m: 11 }
    if (t > 11) return { y: y + 1, m: 0 }
    return { y, m: t }
  })

  const irHoy = () => {
    const d = new Date()
    setCursor({ y: d.getFullYear(), m: d.getMonth() })
  }

  const toggleTipo = (key) => {
    setFiltroTipos(prev => {
      const n = new Set(prev)
      if (n.has(key)) n.delete(key); else n.add(key)
      return n
    })
  }

  const today = todayStr()

  const totalMes = eventosVisibles.length
  const proximos7 = useMemo(() => {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
    const limite = new Date(hoy); limite.setDate(limite.getDate() + 7)
    return eventosVisibles
      .filter(e => {
        const d = new Date(e.fecha + 'T00:00:00')
        return d >= hoy && d <= limite && e.estado !== 'cancelado'
      })
      .sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.hora || '').localeCompare(b.hora || ''))
  }, [eventosVisibles])

  return (
    <div className="space-y-4 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--color-glow-green)', border: '1px solid var(--color-accent-green-dim)' }}
          >
            <Calendar size={16} style={{ color: 'var(--color-accent-green)' }} />
          </div>
          <div>
            <h1 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>Calendario</h1>
            <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
              Citas, instalaciones, aplicaciones y mantenimiento del predio.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={cargar}
            className="p-2 rounded-lg hover-surface"
            style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
            title="Refrescar"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setEditando({ isNew: true, item: { fecha: today, estado: 'programado', tipo: 'cita', predio_id: predioId } })}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold"
            style={{ background: 'var(--color-accent-green)', color: '#fff' }}
          >
            <Plus size={13} /> Nuevo evento
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={filtroPredio}
          onChange={(e) => setFiltroPredio(e.target.value === 'actual' || e.target.value === 'todos' ? e.target.value : Number(e.target.value))}
          className="text-xs px-3 py-1.5 rounded-lg outline-none"
          style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
        >
          <option value="actual">Predio actual</option>
          <option value="todos">Todos los predios</option>
          {(predios || []).map(p => (
            <option key={p.predio_id} value={p.predio_id}>{p.nombre}</option>
          ))}
        </select>
        <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Tipos:</span>
        {TIPOS.map(t => {
          const active = filtroTipos.size === 0 || filtroTipos.has(t.key)
          return (
            <button
              key={t.key}
              onClick={() => toggleTipo(t.key)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors"
              style={{
                background: filtroTipos.has(t.key) ? `${t.color}20` : 'var(--color-surface-2)',
                color: filtroTipos.has(t.key) ? t.color : (active ? 'var(--color-text-secondary)' : 'var(--color-text-muted)'),
                border: `1px solid ${filtroTipos.has(t.key) ? `${t.color}50` : 'var(--color-border)'}`,
                opacity: !active ? 0.5 : 1,
              }}
            >
              <t.Icon size={10} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Grid layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_260px] gap-4">
        {/* Calendario */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <div className="flex items-center gap-2">
              <button onClick={() => shift(-1)} className="p-1.5 rounded-md hover-surface" style={{ color: 'var(--color-text-muted)' }}>
                <ChevronLeft size={16} />
              </button>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {MONTHS[cursor.m]} {cursor.y}
              </h2>
              <button onClick={() => shift(1)} className="p-1.5 rounded-md hover-surface" style={{ color: 'var(--color-text-muted)' }}>
                <ChevronRight size={16} />
              </button>
              <button
                onClick={irHoy}
                className="ml-2 px-2 py-1 rounded-md text-[10px] font-medium uppercase tracking-wider hover-surface"
                style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
              >
                Hoy
              </button>
            </div>
            <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
              {totalMes} {totalMes === 1 ? 'evento' : 'eventos'} este mes
            </span>
          </div>

          <div className="grid grid-cols-7 px-2 pt-2 pb-1 text-center">
            {WEEKDAYS.map(w => (
              <div key={w} className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{w}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5 p-3" style={{ gridAutoRows: 'minmax(130px, 1fr)' }}>
            {cells.map((d, i) => {
              if (d === null) return <div key={i} />
              const dateStr = `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
              const items = porDia[dateStr] || []
              const isToday = dateStr === today
              const isExp = diaExpandido === dateStr
              return (
                <div
                  key={i}
                  onClick={() => setDiaExpandido(isExp ? null : dateStr)}
                  className="p-2 rounded-lg text-xs transition-colors cursor-pointer flex flex-col min-w-0"
                  style={{
                    background: isToday ? 'var(--color-accent-green-dim)' : 'var(--color-surface-2)',
                    border: `1px solid ${isToday ? 'rgba(16,185,129,0.4)' : isExp ? 'var(--color-accent-green-dim)' : 'var(--color-border)'}`,
                  }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className="text-sm font-semibold"
                      style={{ color: isToday ? 'var(--color-accent-green)' : 'var(--color-text-secondary)' }}
                    >
                      {d}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditando({ isNew: true, item: { fecha: dateStr, estado: 'programado', tipo: 'cita', predio_id: predioId } })
                      }}
                      className="p-0.5 rounded transition-opacity"
                      style={{ color: 'var(--color-text-muted)', opacity: items.length > 0 ? 0 : 0.4 }}
                      title="Añadir evento"
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = items.length > 0 ? '0' : '0.4'}
                    >
                      <Plus size={11} />
                    </button>
                  </div>
                  <div className="flex-1 space-y-0.5 overflow-hidden">
                    {items.slice(0, 4).map(ev => {
                      const meta = tipoMeta(ev.tipo)
                      return (
                        <div
                          key={ev.id}
                          onClick={(e) => { e.stopPropagation(); setEditando({ isNew: false, item: ev }) }}
                          className="truncate flex items-center gap-1.5 px-1.5 py-1 rounded"
                          style={{
                            background: `${meta.color}18`,
                            color: ev.estado === 'cancelado' ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                            textDecoration: ev.estado === 'cancelado' ? 'line-through' : 'none',
                            opacity: ev.estado === 'cancelado' ? 0.6 : 1,
                          }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: meta.color }} />
                          {ev.hora && <span className="text-[10px] font-mono opacity-70 shrink-0">{fmtHora(ev.hora)}</span>}
                          <span className="truncate text-[11px]">{ev.titulo}</span>
                        </div>
                      )
                    })}
                    {items.length > 4 && (
                      <div className="text-[10px] px-1.5" style={{ color: 'var(--color-text-muted)' }}>+{items.length - 4} más</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Sidebar: próximos 7 días */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Próximos 7 días</h3>
            <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{proximos7.length} eventos</p>
          </div>
          <div className="max-h-[520px] overflow-y-auto">
            {proximos7.length === 0 ? (
              <div className="px-4 py-8 text-center" style={{ color: 'var(--color-text-muted)' }}>
                <Calendar size={20} className="mx-auto mb-2 opacity-50" />
                <p className="text-[11px]">Sin eventos próximos</p>
              </div>
            ) : (
              proximos7.map(ev => {
                const meta = tipoMeta(ev.tipo)
                return (
                  <button
                    key={ev.id}
                    onClick={() => setEditando({ isNew: false, item: ev })}
                    className="w-full text-left px-3 py-2.5 transition-colors hover-surface"
                    style={{ borderTop: '1px solid var(--color-border)' }}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: `${meta.color}15`, color: meta.color, border: `1px solid ${meta.color}30` }}
                      >
                        <meta.Icon size={12} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{ev.titulo}</p>
                        <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                          {fmtFecha(ev.fecha)}{ev.hora ? ` · ${fmtHora(ev.hora)}` : ''}
                        </p>
                        {ev.responsable && (
                          <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{ev.responsable}</p>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      </div>

      {editando && (
        <EventoModal
          editing={editando}
          predios={predios || []}
          nodos={nodos}
          onClose={() => setEditando(null)}
          onSaved={() => { setEditando(null); cargar() }}
          puedeEditar={['admin', 'agronomo'].includes(user?.rol)}
        />
      )}
    </div>
  )
}

const TIPO_OPTIONS = TIPOS.map(t => ({ value: t.key, label: t.label }))

function EventoModal({ editing, predios, nodos, onClose, onSaved, puedeEditar }) {
  const [form, setForm] = useState(editing.item || {})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => { setForm(editing.item || {}) }, [editing])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const guardar = async () => {
    if (!form.titulo?.trim() || !form.fecha) {
      setError('Título y fecha son obligatorios')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const body = {
        titulo: form.titulo.trim(),
        tipo: form.tipo || null,
        fecha: form.fecha,
        hora: form.hora || null,
        duracion_min: form.duracion_min ? Number(form.duracion_min) : null,
        predio_id: form.predio_id ? Number(form.predio_id) : null,
        nodo_id: form.nodo_id ? Number(form.nodo_id) : null,
        responsable: form.responsable || null,
        estado: form.estado || 'programado',
        descripcion: form.descripcion || null,
        recordatorio_wa: !!form.recordatorio_wa,
      }
      if (editing.isNew) {
        await apiFetch('/api/calendario', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        await apiFetch(`/api/calendario/${editing.item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }
      onSaved()
    } catch (e) {
      setError(e.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const borrar = async () => {
    if (!confirm(`¿Borrar el evento "${editing.item.titulo}"?`)) return
    setDeleting(true)
    try {
      await apiFetch(`/api/calendario/${editing.item.id}`, { method: 'DELETE' })
      onSaved()
    } catch (e) {
      setError(e.message || 'Error al borrar')
      setDeleting(false)
    }
  }

  const meta = tipoMeta(form.tipo)
  const Icon = meta.Icon

  const footer = puedeEditar ? (
    <>
      {!editing.isNew && (
        <button
          onClick={borrar}
          disabled={deleting || saving}
          className="px-3 py-1.5 rounded-lg text-xs font-medium mr-auto flex items-center gap-1.5"
          style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--color-accent-red)', border: '1px solid rgba(239,68,68,0.3)' }}
        >
          {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
          Borrar
        </button>
      )}
      <button
        onClick={onClose}
        className="px-3 py-1.5 rounded-lg text-xs"
        style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
      >
        Cancelar
      </button>
      <button
        onClick={guardar}
        disabled={saving || !form.titulo?.trim() || !form.fecha}
        className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"
        style={{
          background: form.titulo?.trim() && form.fecha ? 'var(--color-accent-green)' : 'var(--color-surface-3)',
          color: form.titulo?.trim() && form.fecha ? '#fff' : 'var(--color-text-muted)',
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? <Loader2 size={12} className="animate-spin" /> : null}
        Guardar
      </button>
    </>
  ) : (
    <button
      onClick={onClose}
      className="px-3 py-1.5 rounded-lg text-xs"
      style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
    >
      Cerrar
    </button>
  )

  return (
    <Modal
      open={!!editing}
      onClose={onClose}
      title={editing.isNew ? 'Nuevo evento' : 'Editar evento'}
      subtitle={form.tipo ? meta.label : ''}
      headerExtra={
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${meta.color}15`, color: meta.color, border: `1px solid ${meta.color}30` }}
        >
          <Icon size={16} />
        </div>
      }
      size="md"
      footer={footer}
    >
      <div className="px-5 py-4 space-y-4">
        {/* Título */}
        <Field label="Título" required>
          <input
            type="text"
            value={form.titulo || ''}
            onChange={(e) => set('titulo', e.target.value)}
            placeholder="Ej: Visita técnica Bloque 3"
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
            disabled={!puedeEditar}
          />
        </Field>

        {/* Tipo */}
        <Field label="Tipo">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {TIPOS.map(t => {
              const active = form.tipo === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => set('tipo', t.key)}
                  disabled={!puedeEditar}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-medium transition-colors"
                  style={{
                    background: active ? `${t.color}20` : 'var(--color-surface-2)',
                    color: active ? t.color : 'var(--color-text-muted)',
                    border: `1px solid ${active ? `${t.color}50` : 'var(--color-border)'}`,
                  }}
                >
                  <t.Icon size={11} />
                  {t.label}
                </button>
              )
            })}
          </div>
        </Field>

        {/* Fecha + hora + duración */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Field label="Fecha" required>
            <input
              type="date"
              value={form.fecha || ''}
              onChange={(e) => set('fecha', e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', colorScheme: 'dark' }}
              disabled={!puedeEditar}
            />
          </Field>
          <Field label="Hora">
            <input
              type="time"
              value={(form.hora || '').slice(0, 5)}
              onChange={(e) => set('hora', e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', colorScheme: 'dark' }}
              disabled={!puedeEditar}
            />
          </Field>
          <Field label="Duración (min)">
            <input
              type="number"
              min="0"
              step="15"
              value={form.duracion_min || ''}
              onChange={(e) => set('duracion_min', e.target.value)}
              placeholder="60"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
              disabled={!puedeEditar}
            />
          </Field>
        </div>

        {/* Predio + nodo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Predio">
            <select
              value={form.predio_id || ''}
              onChange={(e) => set('predio_id', e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
              disabled={!puedeEditar}
            >
              <option value="">— Sin asignar —</option>
              {predios.map(p => (
                <option key={p.predio_id} value={p.predio_id}>{p.nombre}</option>
              ))}
            </select>
          </Field>
          <Field label="Nodo (opcional)">
            <select
              value={form.nodo_id || ''}
              onChange={(e) => set('nodo_id', e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
              disabled={!puedeEditar}
            >
              <option value="">— Predio entero —</option>
              {nodos.map(n => (
                <option key={n.nodo_id} value={n.nodo_id}>{n.nombre}{n.bloque ? ` (${n.bloque})` : ''}</option>
              ))}
            </select>
          </Field>
        </div>

        {/* Responsable + estado */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Responsable">
            <input
              type="text"
              value={form.responsable || ''}
              onChange={(e) => set('responsable', e.target.value)}
              placeholder="Quien va a hacer esto"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
              disabled={!puedeEditar}
            />
          </Field>
          <Field label="Estado">
            <select
              value={form.estado || 'programado'}
              onChange={(e) => set('estado', e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
              disabled={!puedeEditar}
            >
              {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>

        {/* Descripción */}
        <Field label="Notas / descripción">
          <textarea
            value={form.descripcion || ''}
            onChange={(e) => set('descripcion', e.target.value)}
            rows={3}
            placeholder="Detalles, materiales requeridos, ubicación específica, etc."
            className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
            disabled={!puedeEditar}
          />
        </Field>

        {/* Recordatorio WhatsApp */}
        <label
          className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer"
          style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
        >
          <input
            type="checkbox"
            checked={!!form.recordatorio_wa}
            onChange={(e) => set('recordatorio_wa', e.target.checked)}
            className="mt-0.5"
            style={{ accentColor: 'var(--color-accent-green)' }}
            disabled={!puedeEditar}
          />
          <div className="flex-1">
            <div className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
              <MessageSquareText size={12} style={{ color: '#25d366' }} />
              Mandar recordatorio por WhatsApp
            </div>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              El sistema enviará un aviso al productor un día antes del evento (cuando el cron de recordatorios esté activo).
            </p>
          </div>
        </label>

        {error && (
          <div
            className="text-[12px] px-3 py-2 rounded-lg"
            style={{ background: 'var(--color-glow-red)', color: 'var(--color-accent-red)', border: '1px solid var(--color-accent-red-dim)' }}
          >
            {error}
          </div>
        )}

        {!puedeEditar && (
          <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            Vista de solo lectura. Para crear o editar eventos necesitas rol agrónomo o admin.
          </p>
        )}
      </div>
    </Modal>
  )
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
        {label}{required ? ' *' : ''}
      </label>
      {children}
    </div>
  )
}
