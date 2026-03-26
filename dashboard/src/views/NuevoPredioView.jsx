import { useState } from 'react'
import { MapPin, Sprout, Mountain, Ruler, Calendar, Navigation, Save, Loader2, CheckCircle, AlertTriangle } from 'lucide-react'
import { getToken } from '../hooks/useAuth'

const campos = [
  { key: 'nombre', label: 'Nombre del predio', placeholder: 'Ej: Huerta Los Pinos', icon: MapPin, color: 'var(--color-accent-green)', required: true },
  { key: 'cultivo', label: 'Cultivo', placeholder: 'Ej: Aguacate Hass', icon: Sprout, color: 'var(--color-accent-green)', required: true },
  { key: 'tipo_suelo', label: 'Tipo de suelo', placeholder: 'Ej: Andisol volcánico', icon: Mountain, color: 'var(--color-accent-amber)', required: false },
  { key: 'hectareas', label: 'Hectáreas', placeholder: 'Ej: 4', icon: Ruler, color: 'var(--color-accent-cyan)', type: 'number', required: true },
  { key: 'municipio', label: 'Ubicación / Municipio', placeholder: 'Ej: Nextipac, Jalisco', icon: Navigation, color: 'var(--color-accent-blue)', required: true },
  { key: 'fecha_instalacion', label: 'Fecha de instalación', placeholder: 'Ej: Junio 2026', icon: Calendar, color: 'var(--color-accent-violet)', required: false },
  { key: 'lat', label: 'Latitud', placeholder: 'Ej: 20.7005', icon: MapPin, color: 'var(--color-text-muted)', type: 'number', step: 'any', required: false },
  { key: 'lon', label: 'Longitud', placeholder: 'Ej: -103.418', icon: MapPin, color: 'var(--color-text-muted)', type: 'number', step: 'any', required: false },
]

export default function NuevoPredioView({ onCreated }) {
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState(null)
  const [errors, setErrors] = useState({})

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => { const n = { ...prev }; delete n[key]; return n })
  }

  const validate = () => {
    const errs = {}
    campos.filter(c => c.required).forEach(c => {
      if (!form[c.key]?.toString().trim()) errs[c.key] = 'Campo obligatorio'
    })
    if (form.hectareas && (isNaN(form.hectareas) || Number(form.hectareas) <= 0)) errs.hectareas = 'Debe ser un número positivo'
    if (form.lat && (isNaN(form.lat) || form.lat < -90 || form.lat > 90)) errs.lat = 'Latitud inválida (-90 a 90)'
    if (form.lon && (isNaN(form.lon) || form.lon < -180 || form.lon > 180)) errs.lon = 'Longitud inválida (-180 a 180)'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSaving(true)
    setResult(null)
    try {
      const body = { ...form }
      if (body.hectareas) body.hectareas = Number(body.hectareas)
      if (body.lat) body.lat = Number(body.lat)
      if (body.lon) body.lon = Number(body.lon)

      const headers = { 'Content-Type': 'application/json' }
      const token = getToken()
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch('/api/predios', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok && (data.ok || data.predio_id)) {
        setResult({ type: 'success', message: `Predio "${form.nombre}" creado exitosamente`, id: data.predio_id })
        setForm({})
      } else {
        setResult({ type: 'error', message: data.error || 'Error al crear el predio' })
      }
    } catch (e) {
      setResult({ type: 'error', message: `Error de conexión: ${e.message}` })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="animate-in">
        <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Crear nuevo predio</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Registra un nuevo predio para comenzar a monitorear. Todos los dashboards se actualizarán al seleccionarlo.
        </p>
      </div>

      {/* Result banner */}
      {result && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl animate-in"
          style={{
            background: result.type === 'success' ? 'var(--color-glow-green)' : 'var(--color-glow-red)',
            border: `1px solid ${result.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          }}
        >
          {result.type === 'success' ? (
            <CheckCircle size={18} style={{ color: 'var(--color-accent-green)' }} />
          ) : (
            <AlertTriangle size={18} style={{ color: 'var(--color-accent-red)' }} />
          )}
          <span className="text-sm font-medium" style={{ color: result.type === 'success' ? 'var(--color-accent-green)' : 'var(--color-accent-red)' }}>
            {result.message}
          </span>
          {result.type === 'success' && result.id && (
            <button
              onClick={() => onCreated(result.id)}
              className="ml-auto text-xs px-3 py-1.5 rounded-lg font-medium"
              style={{ background: 'var(--color-accent-green-dim)', color: 'var(--color-accent-green)', border: '1px solid rgba(16,185,129,0.3)' }}
            >
              Ir al predio →
            </button>
          )}
        </div>
      )}

      {/* Form */}
      <div
        className="rounded-2xl overflow-hidden animate-in stagger-1"
        style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
      >
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
            Información del predio
          </p>
        </div>
        <div className="p-5 space-y-4">
          {campos.map(c => {
            const Icon = c.icon
            const hasError = errors[c.key]
            return (
              <div key={c.key}>
                <label className="flex items-center gap-2 text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  <Icon size={14} style={{ color: c.color }} />
                  {c.label}
                  {c.required && <span style={{ color: 'var(--color-accent-red)' }}>*</span>}
                </label>
                <input
                  type={c.type || 'text'}
                  step={c.step}
                  value={form[c.key] || ''}
                  onChange={e => handleChange(c.key, e.target.value)}
                  placeholder={c.placeholder}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors"
                  style={{
                    background: 'var(--color-surface-3)',
                    border: `1px solid ${hasError ? 'var(--color-accent-red)' : 'var(--color-border)'}`,
                    color: 'var(--color-text-primary)',
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = hasError ? 'var(--color-accent-red)' : 'var(--color-accent-green)'}
                  onBlur={e => e.currentTarget.style.borderColor = hasError ? 'var(--color-accent-red)' : 'var(--color-border)'}
                />
                {hasError && (
                  <p className="text-[11px] mt-1 px-1" style={{ color: 'var(--color-accent-red)' }}>{hasError}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Coordinates helper */}
      <div
        className="rounded-xl px-4 py-3 animate-in stagger-2"
        style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
      >
        <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
          💡 <strong>Tip:</strong> Para obtener las coordenadas, abre Google Maps, haz click derecho en la ubicación del predio y copia la latitud y longitud. Son opcionales pero permiten mostrar el mapa satelital.
        </p>
      </div>

      {/* Submit */}
      <div className="flex gap-3 animate-in stagger-3">
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50"
          style={{
            background: 'var(--color-accent-green-dim)',
            color: 'var(--color-accent-green)',
            border: '1px solid rgba(16,185,129,0.3)',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--color-accent-green-dim)'}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Creando predio...' : 'Crear predio'}
        </button>
      </div>
    </div>
  )
}
