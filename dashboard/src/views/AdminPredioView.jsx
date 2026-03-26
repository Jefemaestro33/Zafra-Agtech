import { useState, useEffect } from 'react'
import { useApi, apiFetch } from '../hooks/useApi'
import { getToken } from '../hooks/useAuth'
import {
  MapPin, Sprout, Mountain, Ruler, Calendar, Navigation,
  AlertTriangle, Check, X, Pencil, Save, Loader2, ChevronDown,
} from 'lucide-react'
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
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}

const fields = [
  { key: 'nombre', label: 'Nombre del predio', icon: MapPin, color: 'var(--color-accent-green)', type: 'text' },
  { key: 'cultivo', label: 'Cultivo', icon: Sprout, color: 'var(--color-accent-green)', type: 'text' },
  { key: 'tipo_suelo', label: 'Tipo de suelo', icon: Mountain, color: 'var(--color-accent-amber)', type: 'text' },
  { key: 'hectareas', label: 'Hectáreas', icon: Ruler, color: 'var(--color-accent-cyan)', type: 'number' },
  { key: 'municipio', label: 'Municipio / Ubicación', icon: Navigation, color: 'var(--color-accent-blue)', type: 'text' },
  { key: 'fecha_instalacion', label: 'Fecha de instalación', icon: Calendar, color: 'var(--color-accent-violet)', type: 'text' },
]

export default function AdminPredioView({ predioId, predios, onChangePredio }) {
  const { data: overview, loading, refetch } = useApi(`/api/predios/${predioId}/overview`)
  const [draft, setDraft] = useState({})
  const [editing, setEditing] = useState(null) // field key being edited
  const [confirm, setConfirm] = useState(null) // { key, label, oldVal, newVal }
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  const predio = overview?.predio || predios?.find(p => p.predio_id === predioId)

  // Sync draft when predio loads
  useEffect(() => {
    if (predio) {
      const d = {}
      fields.forEach(f => { d[f.key] = predio[f.key] ?? '' })
      setDraft(d)
    }
  }, [predio?.predio_id, predio?.nombre, predio?.cultivo, predio?.tipo_suelo, predio?.hectareas, predio?.municipio, predio?.fecha_instalacion])

  if (loading) return <Loading />

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }

  const handleEdit = (key) => {
    setEditing(key)
  }

  const handleCancel = () => {
    // Reset draft for this field
    if (editing && predio) {
      setDraft(prev => ({ ...prev, [editing]: predio[editing] ?? '' }))
    }
    setEditing(null)
  }

  const handleSave = (key) => {
    const field = fields.find(f => f.key === key)
    const oldVal = predio?.[key] ?? ''
    const newVal = draft[key]
    if (String(newVal).trim() === String(oldVal).trim()) {
      setEditing(null)
      return
    }
    setConfirm({ key, label: field.label, oldVal: oldVal || '—', newVal })
  }

  const handleConfirm = async () => {
    const { key, newVal } = { key: confirm.key, newVal: draft[confirm.key] }
    setConfirm(null)
    setEditing(null)
    setSaving(true)
    try {
      const headers = { 'Content-Type': 'application/json' }
      const token = getToken()
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`/api/predios/${predioId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ [key]: newVal }),
      })
      if (res.ok) {
        showToast('success', 'Cambio guardado')
        refetch()
      } else {
        showToast('error', 'Error al guardar')
      }
    } catch {
      showToast('error', 'Error de conexión')
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <ConfirmModal
        open={confirm !== null}
        title="Confirmar cambio"
        message={confirm ? `¿Cambiar "${confirm.label}" de "${confirm.oldVal}" a "${confirm.newVal}"?` : ''}
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
      />

      {/* Header */}
      <div className="flex items-center justify-between animate-in">
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Editar Predio
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Modifica la información del predio seleccionado
          </p>
        </div>
        {toast && (
          <span
            className="text-xs px-3 py-1.5 rounded-lg font-medium animate-in"
            style={{
              background: toast.type === 'success' ? 'var(--color-glow-green)' : 'var(--color-glow-red)',
              color: toast.type === 'success' ? 'var(--color-accent-green)' : 'var(--color-accent-red)',
              border: `1px solid ${toast.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            }}
          >
            {toast.type === 'success' ? <Check size={12} className="inline mr-1" /> : <X size={12} className="inline mr-1" />}
            {toast.message}
          </span>
        )}
      </div>

      {/* Predio selector */}
      <div
        className="rounded-2xl p-5 animate-in stagger-1"
        style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-muted)' }}>
          Selecciona predio
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
      </div>

      {/* Editable fields */}
      <div className="animate-in stagger-2">
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
            Datos del predio
          </p>
          <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            Haz clic en el lápiz para editar
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {fields.map(f => {
            const isEditing = editing === f.key
            const Icon = f.icon
            return (
              <div
                key={f.key}
                className="flex items-center gap-4 px-4 py-3.5 rounded-xl transition-colors group"
                style={{
                  background: isEditing ? 'var(--color-surface-3)' : 'var(--color-surface-2)',
                  border: isEditing ? `1px solid ${f.color}40` : '1px solid var(--color-border)',
                }}
                onMouseEnter={e => { if (!isEditing) e.currentTarget.style.background = 'var(--color-surface-3)' }}
                onMouseLeave={e => { if (!isEditing) e.currentTarget.style.background = 'var(--color-surface-2)' }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${f.color}15`, border: `1px solid ${f.color}30` }}
                >
                  <Icon size={18} style={{ color: f.color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium" style={{ color: 'var(--color-text-muted)' }}>{f.label}</p>
                  {isEditing ? (
                    <input
                      type={f.type}
                      value={draft[f.key] ?? ''}
                      onChange={e => setDraft(prev => ({ ...prev, [f.key]: e.target.value }))}
                      className="w-full bg-transparent text-sm font-semibold mt-0.5 outline-none"
                      style={{ color: 'var(--color-text-primary)', borderBottom: `1px solid ${f.color}`, paddingBottom: 2 }}
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSave(f.key)
                        if (e.key === 'Escape') handleCancel()
                      }}
                    />
                  ) : (
                    <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--color-text-primary)' }}>
                      {draft[f.key] || predio?.[f.key] || '—'}
                      {f.key === 'hectareas' && (draft[f.key] || predio?.[f.key]) ? ' hectáreas' : ''}
                    </p>
                  )}
                </div>
                {isEditing ? (
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => handleSave(f.key)}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: 'var(--color-accent-green)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--color-glow-green)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      title="Guardar"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={handleCancel}
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
                    onClick={() => handleEdit(f.key)}
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
            )
          })}
        </div>
      </div>

      {/* Saving overlay */}
      {saving && (
        <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <div className="flex items-center gap-3 px-5 py-3 rounded-xl animate-in" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
            <Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-accent-green)' }} />
            <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>Guardando...</span>
          </div>
        </div>
      )}
    </div>
  )
}
