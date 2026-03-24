import { useState, useEffect } from 'react'
import { useApi } from '../hooks/useApi'
import { MapPin, Sprout, Mountain, Ruler, Calendar, Server, Database, Cpu, Wifi, Clock, ChevronDown, Pencil, Check, X, AlertTriangle, StickyNote, Save, Trash2, Plus } from 'lucide-react'
import Loading from '../components/Loading'

function ConfirmModal({ open, title, message, onConfirm, onCancel }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div
        className="rounded-2xl p-6 max-w-sm w-full mx-4 animate-in"
        style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--color-glow-amber)', border: '1px solid rgba(245,158,11,0.3)' }}
          >
            <AlertTriangle size={20} style={{ color: 'var(--color-accent-amber)' }} />
          </div>
          <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{title}</h3>
        </div>
        <p className="text-sm mb-5" style={{ color: 'var(--color-text-muted)' }}>{message}</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-xl font-medium transition-colors"
            style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm rounded-xl font-medium transition-colors"
            style={{ background: 'var(--color-accent-green-dim)', color: 'var(--color-accent-green)', border: '1px solid rgba(16,185,129,0.3)' }}
          >
            Confirmar cambio
          </button>
        </div>
      </div>
    </div>
  )
}

function EditableField({ icon: Icon, label, value, fieldKey, color = 'var(--color-accent-green)', onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value || '')
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => { setDraft(value || '') }, [value])

  const handleSave = () => {
    if (draft !== value) {
      setShowConfirm(true)
    } else {
      setEditing(false)
    }
  }

  const handleConfirm = () => {
    onSave(fieldKey, draft)
    setShowConfirm(false)
    setEditing(false)
  }

  return (
    <>
      <ConfirmModal
        open={showConfirm}
        title="Confirmar cambio"
        message={`¿Cambiar "${label}" de "${value || '—'}" a "${draft}"?`}
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirm(false)}
      />
      <div
        className="flex items-center gap-4 px-4 py-3.5 rounded-xl transition-colors group"
        style={{ background: editing ? 'var(--color-surface-3)' : 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
        onMouseEnter={e => { if (!editing) e.currentTarget.style.background = 'var(--color-surface-3)' }}
        onMouseLeave={e => { if (!editing) e.currentTarget.style.background = 'var(--color-surface-2)' }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${color}15`, border: `1px solid ${color}30` }}
        >
          <Icon size={18} style={{ color }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
          {editing ? (
            <input
              value={draft}
              onChange={e => setDraft(e.target.value)}
              className="w-full bg-transparent text-sm font-semibold mt-0.5 outline-none"
              style={{ color: 'var(--color-text-primary)', borderBottom: `1px solid var(--color-accent-green)`, paddingBottom: 2 }}
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setDraft(value || ''); setEditing(false) } }}
            />
          ) : (
            <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--color-text-primary)' }}>{value || '—'}</p>
          )}
        </div>
        {editing ? (
          <div className="flex gap-1 shrink-0">
            <button
              onClick={handleSave}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--color-accent-green)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--color-glow-green)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              title="Guardar"
            >
              <Check size={16} />
            </button>
            <button
              onClick={() => { setDraft(value || ''); setEditing(false) }}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-4)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              title="Cancelar"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100 shrink-0"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-4)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            title="Editar"
          >
            <Pencil size={14} />
          </button>
        )}
      </div>
    </>
  )
}

function StatusDot({ ok }) {
  return (
    <span
      className="w-2 h-2 rounded-full inline-block"
      style={{
        background: ok ? 'var(--color-accent-green)' : 'var(--color-accent-red)',
        boxShadow: ok ? '0 0 6px rgba(16,185,129,0.4)' : '0 0 6px rgba(239,68,68,0.4)',
      }}
    />
  )
}

function NotesSection({ predioId }) {
  const [notes, setNotes] = useState([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  // Load notes from localStorage (keyed by predioId)
  useEffect(() => {
    const stored = localStorage.getItem(`agtech_notes_${predioId}`)
    if (stored) {
      try { setNotes(JSON.parse(stored)) } catch { setNotes([]) }
    } else {
      setNotes([])
    }
  }, [predioId])

  const saveNotes = (updated) => {
    setNotes(updated)
    localStorage.setItem(`agtech_notes_${predioId}`, JSON.stringify(updated))
  }

  const handleAdd = () => {
    if (!draft.trim()) return
    const newNote = {
      id: Date.now(),
      text: draft.trim(),
      author: 'ED',
      timestamp: new Date().toISOString(),
    }
    saveNotes([newNote, ...notes])
    setDraft('')
  }

  const handleDelete = (id) => {
    saveNotes(notes.filter(n => n.id !== id))
    setDeleteConfirm(null)
  }

  return (
    <>
      <ConfirmModal
        open={deleteConfirm !== null}
        title="Eliminar nota"
        message="¿Estás seguro de que quieres eliminar esta nota? Esta acción no se puede deshacer."
        onConfirm={() => handleDelete(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
      />
      <div className="animate-in stagger-5">
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-3 px-1" style={{ color: 'var(--color-text-muted)' }}>
          Notas del predio
        </p>

        {/* Add note */}
        <div
          className="rounded-2xl p-4 mb-3"
          style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
        >
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Escribe una nota... (observaciones, pendientes, instrucciones para el equipo de campo)"
            rows={3}
            className="w-full bg-transparent text-sm outline-none resize-none"
            style={{ color: 'var(--color-text-primary)' }}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAdd() }}
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
              Ctrl+Enter para guardar
            </p>
            <button
              onClick={handleAdd}
              disabled={!draft.trim()}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all duration-200 disabled:opacity-30"
              style={{
                background: draft.trim() ? 'var(--color-accent-green-dim)' : 'var(--color-surface-3)',
                color: draft.trim() ? 'var(--color-accent-green)' : 'var(--color-text-muted)',
                border: `1px solid ${draft.trim() ? 'rgba(16,185,129,0.3)' : 'var(--color-border)'}`,
              }}
            >
              <Plus size={14} />
              Agregar nota
            </button>
          </div>
        </div>

        {/* Notes list */}
        {notes.length > 0 ? (
          <div className="space-y-2">
            {notes.map(n => (
              <div
                key={n.id}
                className="rounded-xl px-4 py-3 group transition-colors"
                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--color-surface-2)'}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--color-text-primary)' }}>
                      {n.text}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[11px] font-medium" style={{ color: 'var(--color-accent-green)' }}>{n.author}</span>
                      <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>·</span>
                      <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                        {new Date(n.timestamp).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setDeleteConfirm(n.id)}
                    className="p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100 shrink-0"
                    style={{ color: 'var(--color-text-muted)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-glow-red)'; e.currentTarget.style.color = 'var(--color-accent-red)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)' }}
                    title="Eliminar nota"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            className="rounded-xl px-4 py-8 text-center"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
          >
            <StickyNote size={24} style={{ color: 'var(--color-text-muted)', margin: '0 auto 8px' }} />
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Sin notas todavía</p>
            <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Las notas se guardan localmente en este dispositivo
            </p>
          </div>
        )}
      </div>
    </>
  )
}

export default function PredioView({ predioId, onChangePredio, predios }) {
  const { data: overview, loading, refetch } = useApi(`/api/predios/${predioId}/overview`)
  const { data: health } = useApi('/api/health')
  const [saveStatus, setSaveStatus] = useState(null)

  if (loading) return <Loading />

  const predio = overview?.predio || predios?.find(p => p.predio_id === predioId)
  const kpis = overview?.kpis

  const handleFieldSave = async (fieldKey, newValue) => {
    try {
      const res = await fetch(`/api/predios/${predioId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [fieldKey]: newValue }),
      })
      if (res.ok) {
        setSaveStatus({ type: 'success', message: 'Cambio guardado' })
        refetch()
      } else {
        setSaveStatus({ type: 'error', message: 'Error al guardar — el endpoint PUT puede no existir todavía' })
      }
    } catch {
      setSaveStatus({ type: 'error', message: 'Error de conexión' })
    }
    setTimeout(() => setSaveStatus(null), 3000)
  }

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div className="flex items-center justify-between animate-in">
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Información del Predio
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Configuración, datos del predio y estado del sistema
          </p>
        </div>
        {saveStatus && (
          <span
            className="text-xs px-3 py-1.5 rounded-lg font-medium animate-in"
            style={{
              background: saveStatus.type === 'success' ? 'var(--color-glow-green)' : 'var(--color-glow-red)',
              color: saveStatus.type === 'success' ? 'var(--color-accent-green)' : 'var(--color-accent-red)',
              border: `1px solid ${saveStatus.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            }}
          >
            {saveStatus.message}
          </span>
        )}
      </div>

      {/* Predio selector */}
      <div
        className="rounded-2xl p-5 animate-in stagger-1"
        style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-muted)' }}>
          Predio activo
        </p>
        <div
          className="relative flex items-center rounded-xl"
          style={{ background: 'var(--color-surface-3)', border: '1px solid var(--color-border)' }}
        >
          <select
            value={predioId}
            onChange={e => onChangePredio(Number(e.target.value))}
            className="w-full appearance-none bg-transparent px-4 py-3 pr-10 text-sm font-semibold outline-none cursor-pointer"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {predios?.map(p => (
              <option key={p.predio_id} value={p.predio_id} style={{ background: '#1e2231', color: '#f0f2f5' }}>
                {p.nombre}
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-3 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
        </div>
        <p className="text-[11px] mt-2" style={{ color: 'var(--color-text-muted)' }}>
          Selecciona un predio para actualizar todos los dashboards
        </p>
      </div>

      {/* Predio details — editable */}
      <div className="animate-in stagger-2">
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
            Datos del predio
          </p>
          <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            Hover sobre un campo para editar
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <EditableField icon={MapPin} label="Nombre" value={predio?.nombre || 'Nextipac Piloto'} fieldKey="nombre" onSave={handleFieldSave} />
          <EditableField icon={Sprout} label="Cultivo" value={predio?.cultivo || 'Aguacate Hass'} fieldKey="cultivo" color="var(--color-accent-green)" onSave={handleFieldSave} />
          <EditableField icon={Mountain} label="Tipo de suelo" value={predio?.tipo_suelo || 'Andisol volcánico'} fieldKey="tipo_suelo" color="var(--color-accent-amber)" onSave={handleFieldSave} />
          <EditableField icon={Ruler} label="Superficie" value={`${predio?.hectareas || 4} hectáreas`} fieldKey="hectareas" color="var(--color-accent-cyan)" onSave={handleFieldSave} />
          <EditableField icon={MapPin} label="Ubicación" value={predio?.municipio || 'Nextipac, Jalisco'} fieldKey="municipio" color="var(--color-accent-blue)" onSave={handleFieldSave} />
          <EditableField icon={Calendar} label="Fecha de instalación" value={predio?.fecha_instalacion || 'Pendiente — junio 2026'} fieldKey="fecha_instalacion" color="var(--color-accent-violet)" onSave={handleFieldSave} />
        </div>
      </div>

      {/* Quick stats */}
      {kpis && (
        <div className="animate-in stagger-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-3 px-1" style={{ color: 'var(--color-text-muted)' }}>
            Resumen operativo
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { icon: Wifi, label: 'Nodos online', value: `${kpis.nodos_online}/${kpis.nodos_total}`, color: 'var(--color-accent-green)' },
              { icon: Sprout, label: 'Score Phytophthora máx.', value: `${kpis.score_phytophthora_max}/100`, color: kpis.score_phytophthora_max >= 51 ? 'var(--color-accent-red)' : 'var(--color-accent-green)' },
              { icon: Ruler, label: 'Necesitan riego', value: String(kpis.nodos_necesitan_riego), color: 'var(--color-accent-amber)' },
              { icon: Clock, label: 'ETo del día', value: `${kpis.eto_dia_mm} mm`, color: 'var(--color-accent-amber)' },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-4 px-4 py-3.5 rounded-xl transition-colors"
                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--color-surface-2)'}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${item.color}15`, border: `1px solid ${item.color}30` }}
                >
                  <item.icon size={18} style={{ color: item.color }} />
                </div>
                <div>
                  <p className="text-[11px] font-medium" style={{ color: 'var(--color-text-muted)' }}>{item.label}</p>
                  <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--color-text-primary)' }}>{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System status */}
      <div className="animate-in stagger-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-3 px-1" style={{ color: 'var(--color-text-muted)' }}>
          Estado del sistema
        </p>
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
        >
          {[
            { icon: Server, label: 'API Backend', value: health?.status === 'ok' ? 'Operativo' : 'Sin respuesta', ok: health?.status === 'ok' },
            { icon: Database, label: 'PostgreSQL (Railway)', value: health?.database || 'Conectado', ok: health?.status === 'ok' },
            { icon: Cpu, label: 'VPS / Hosting', value: 'Railway · Auto-deploy', ok: true },
            { icon: Wifi, label: 'Nodos IoT', value: kpis ? `${kpis.nodos_online}/${kpis.nodos_total} online` : '—', ok: kpis?.nodos_online === kpis?.nodos_total },
            { icon: Clock, label: 'Último refresh', value: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }), ok: true },
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between px-5 py-3.5 transition-colors"
              style={{ borderBottom: i < 4 ? '1px solid var(--color-border)' : 'none' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div className="flex items-center gap-3">
                <item.icon size={16} style={{ color: 'var(--color-text-muted)' }} />
                <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{item.label}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-mono" style={{ color: 'var(--color-text-primary)' }}>{item.value}</span>
                <StatusDot ok={item.ok} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      <NotesSection predioId={predioId} />
    </div>
  )
}
