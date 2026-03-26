import { useState, useEffect } from 'react'
import { getToken } from '../hooks/useAuth'
import {
  Shield, Droplets, Wifi, Battery, RotateCcw, Save, Loader2,
  Thermometer, Clock, CloudRain, CloudSun, Wind, AlertTriangle,
  ChevronDown, ChevronRight, Check, X,
} from 'lucide-react'

const API_BASE = '/api/config/alertas'

function authHeaders() {
  const token = getToken()
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' }
}

// ── Field metadata for Phytophthora grouped sections ──

const phytophthora_groups = [
  {
    key: 'h10',
    label: 'Humedad a 10 cm de profundidad',
    desc: 'Zona de raices finas. Si supera estos umbrales de % VWC, suma puntos al score.',
    icon: Droplets,
    color: 'var(--color-accent-cyan)',
    fields: [
      { key: 'h10_umbral_alto', label: 'Umbral alto — % VWC para riesgo alto', step: 1 },
      { key: 'h10_pts_alto', label: 'Puntos que suma si supera umbral alto', step: 1 },
      { key: 'h10_umbral_medio', label: 'Umbral medio — % VWC para riesgo medio', step: 1 },
      { key: 'h10_pts_medio', label: 'Puntos que suma si supera umbral medio', step: 1 },
    ],
  },
  {
    key: 'h20',
    label: 'Humedad a 20 cm de profundidad',
    desc: 'Zona de raices principales. Misma logica que a 10 cm.',
    icon: Droplets,
    color: 'var(--color-accent-blue)',
    fields: [
      { key: 'h20_umbral_alto', label: 'Umbral alto — % VWC para riesgo alto', step: 1 },
      { key: 'h20_pts_alto', label: 'Puntos que suma si supera umbral alto', step: 1 },
      { key: 'h20_umbral_medio', label: 'Umbral medio — % VWC para riesgo medio', step: 1 },
      { key: 'h20_pts_medio', label: 'Puntos que suma si supera umbral medio', step: 1 },
    ],
  },
  {
    key: 'temp',
    label: 'Temperatura del suelo a 20 cm',
    desc: 'Rango optimo para Phytophthora cinnamomi. Dentro del rango = maximo riesgo.',
    icon: Thermometer,
    color: 'var(--color-accent-amber)',
    fields: [
      { key: 'temp_min_optima', label: 'Limite inferior rango optimo — °C', step: 1 },
      { key: 'temp_max_optima', label: 'Limite superior rango optimo — °C', step: 1 },
      { key: 'temp_pts_optimo', label: 'Puntos si esta en rango optimo', step: 1 },
      { key: 'temp_min_riesgo', label: 'Limite inferior rango de riesgo — °C', step: 1 },
      { key: 'temp_pts_riesgo', label: 'Puntos si esta en rango de riesgo', step: 1 },
    ],
  },
  {
    key: 'horas',
    label: 'Horas continuas con suelo humedo',
    desc: 'Cuantas horas seguidas h10 supera el umbral VWC. Mas horas = mas riesgo de pudricion.',
    icon: Clock,
    color: 'var(--color-accent-violet)',
    fields: [
      { key: 'umbral_vwc_humedo', label: 'Umbral de humedad — % VWC que se considera "humedo"', step: 0.1 },
      { key: 'horas_humedo_critico', label: 'Horas para nivel critico', step: 1 },
      { key: 'horas_humedo_pts_critico', label: 'Puntos si supera horas criticas', step: 1 },
      { key: 'horas_humedo_alto', label: 'Horas para nivel alto', step: 1 },
      { key: 'horas_humedo_pts_alto', label: 'Puntos si supera horas altas', step: 1 },
      { key: 'horas_humedo_medio', label: 'Horas para nivel medio', step: 1 },
      { key: 'horas_humedo_pts_medio', label: 'Puntos si supera horas medias', step: 1 },
    ],
  },
  {
    key: 'precip',
    label: 'Precipitacion acumulada (ultimos 7 dias)',
    desc: 'Lluvia total en la ultima semana. Mas lluvia = suelo mas saturado.',
    icon: CloudRain,
    color: 'var(--color-accent-cyan)',
    fields: [
      { key: 'precip_7d_alto', label: 'Umbral alto — mm acumulados en 7 dias', step: 1 },
      { key: 'precip_7d_pts_alto', label: 'Puntos si supera umbral alto', step: 1 },
      { key: 'precip_7d_medio', label: 'Umbral medio — mm acumulados en 7 dias', step: 1 },
      { key: 'precip_7d_pts_medio', label: 'Puntos si supera umbral medio', step: 1 },
    ],
  },
  {
    key: 'pronostico',
    label: 'Pronostico de lluvia (proximas 48 horas)',
    desc: 'Si se espera lluvia fuerte en las proximas 48h, suma puntos preventivamente.',
    icon: CloudSun,
    color: 'var(--color-accent-green)',
    fields: [
      { key: 'pronostico_48h_umbral', label: 'Umbral — mm esperados en proximas 48h', step: 1 },
      { key: 'pronostico_48h_pts', label: 'Puntos si supera el umbral', step: 1 },
    ],
  },
  {
    key: 'hr',
    label: 'Humedad relativa ambiente (promedio 48h)',
    desc: 'HR promedio del aire en las ultimas 48 horas. HR alta dificulta evaporacion.',
    icon: Wind,
    color: 'var(--color-accent-blue)',
    fields: [
      { key: 'hr_48h_umbral', label: 'Umbral — % de humedad relativa', step: 1 },
      { key: 'hr_48h_pts', label: 'Puntos si supera el umbral', step: 1 },
    ],
  },
  {
    key: 'niveles',
    label: 'Clasificacion de niveles de riesgo',
    desc: 'Score total (0-100). Define los cortes para CRITICO, ALTO, MODERADO y BAJO.',
    icon: AlertTriangle,
    color: 'var(--color-accent-red)',
    fields: [
      { key: 'nivel_critico', label: 'Score minimo para CRITICO (rojo)', step: 1 },
      { key: 'nivel_alto', label: 'Score minimo para ALTO (naranja)', step: 1 },
      { key: 'nivel_moderado', label: 'Score minimo para MODERADO (amarillo)', step: 1 },
    ],
  },
]

const riego_fields = [
  { key: 'breaking_point_vwc', label: 'Breaking point — % VWC debajo del cual el arbol necesita riego', step: 0.1 },
  { key: 'lecturas_consecutivas', label: 'Lecturas consecutivas bajo el breaking point antes de alertar (1 lectura = 5 min)', step: 1 },
]

const offline_fields = [
  { key: 'minutos_sin_datos', label: 'Tiempo sin recibir datos antes de marcar como offline (minutos)', step: 1 },
]

const bateria_fields = [
  { key: 'voltaje_minimo', label: 'Voltaje minimo antes de alerta de bateria baja (Volts)', step: 0.1 },
]

// ── Reusable components ──

function Toast({ toast, onClose }) {
  if (!toast) return null
  const isError = toast.type === 'error'
  return (
    <div className="fixed top-16 right-4 z-50 animate-in">
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl"
        style={{
          background: isError ? 'var(--color-glow-red)' : 'var(--color-glow-green)',
          border: `1px solid ${isError ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
          color: isError ? 'var(--color-accent-red)' : 'var(--color-accent-green)',
        }}
      >
        {isError ? <X size={16} /> : <Check size={16} />}
        <span className="text-sm font-medium">{toast.message}</span>
        <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100">
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

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
            style={{ background: 'var(--color-glow-red)', color: 'var(--color-accent-red)', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            Restaurar
          </button>
        </div>
      </div>
    </div>
  )
}

function FieldRow({ label, value, step, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <label className="text-xs font-medium shrink-0" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </label>
      <input
        type="number"
        step={step}
        value={value ?? ''}
        onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        className="w-24 text-right text-sm font-mono px-3 py-1.5 rounded-lg outline-none transition-colors"
        style={{
          background: 'var(--color-surface-1)',
          color: 'var(--color-text-primary)',
          border: '1px solid var(--color-border)',
        }}
        onFocus={e => e.currentTarget.style.borderColor = 'var(--color-accent-green)'}
        onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
      />
    </div>
  )
}

function CollapsibleGroup({ label, desc, icon: Icon, color, fields, values, onChange, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 transition-colors"
        onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-3)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <Icon size={16} style={{ color }} />
        <div className="flex-1 text-left">
          <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {label}
          </span>
          {desc && !open && (
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{desc}</p>
          )}
        </div>
        {open ? <ChevronDown size={14} style={{ color: 'var(--color-text-muted)' }} /> : <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />}
      </button>
      {open && (
        <div className="px-4 pb-3" style={{ borderTop: '1px solid var(--color-border)' }}>
          {desc && (
            <p className="text-[11px] py-2 mb-1" style={{ color: 'var(--color-text-muted)' }}>{desc}</p>
          )}
          {fields.map(f => (
            <FieldRow
              key={f.key}
              label={f.label}
              value={values[f.key]}
              step={f.step}
              onChange={v => onChange(f.key, v)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SectionCard({ title, icon: Icon, color, glowColor, children, saving, onSave }) {
  return (
    <div
      className="rounded-2xl p-5 animate-in"
      style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: glowColor, border: `1px solid ${color}33` }}
          >
            <Icon size={20} style={{ color }} />
          </div>
          <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{title}</h3>
        </div>
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
          style={{
            background: 'var(--color-accent-green-dim)',
            color: 'var(--color-accent-green)',
            border: '1px solid rgba(16,185,129,0.3)',
            opacity: saving ? 0.6 : 1,
          }}
          onMouseEnter={e => { if (!saving) e.currentTarget.style.background = 'rgba(16,185,129,0.25)' }}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--color-accent-green-dim)'}
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Guardar
        </button>
      </div>
      {children}
    </div>
  )
}

// ── Main view ──

export default function ConfigAlertasView() {
  const [config, setConfig] = useState(null)
  const [draft, setDraft] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState({})
  const [toast, setToast] = useState(null)
  const [confirmReset, setConfirmReset] = useState(false)

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3500)
  }

  // Fetch config
  useEffect(() => {
    fetch(API_BASE, { headers: authHeaders() })
      .then(r => {
        if (!r.ok) throw new Error(r.status)
        return r.json()
      })
      .then(data => {
        setConfig(data)
        setDraft(JSON.parse(JSON.stringify(data)))
      })
      .catch(() => showToast('error', 'Error al cargar configuracion'))
      .finally(() => setLoading(false))
  }, [])

  const updateDraft = (section, key, value) => {
    setDraft(prev => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }))
  }

  const saveSection = async (section) => {
    setSaving(prev => ({ ...prev, [section]: true }))
    try {
      const r = await fetch(`${API_BASE}/${section}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(draft[section]),
      })
      if (!r.ok) throw new Error(r.status)
      const data = await r.json()
      setConfig(data)
      setDraft(JSON.parse(JSON.stringify(data)))
      showToast('success', `Seccion "${section}" guardada`)
    } catch {
      showToast('error', `Error al guardar "${section}"`)
    } finally {
      setSaving(prev => ({ ...prev, [section]: false }))
    }
  }

  const handleReset = async () => {
    setConfirmReset(false)
    setSaving(prev => ({ ...prev, reset: true }))
    try {
      const r = await fetch(`${API_BASE}/reset`, {
        method: 'POST',
        headers: authHeaders(),
      })
      if (!r.ok) throw new Error(r.status)
      const data = await r.json()
      setConfig(data)
      setDraft(JSON.parse(JSON.stringify(data)))
      showToast('success', 'Configuracion restaurada a valores por defecto')
    } catch {
      showToast('error', 'Error al restaurar configuracion')
    } finally {
      setSaving(prev => ({ ...prev, reset: false }))
    }
  }

  if (loading || !draft) {
    return (
      <div className="flex items-center justify-center py-20 animate-in">
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-accent-green)' }} />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <ConfirmModal
        open={confirmReset}
        title="Restaurar valores por defecto"
        message="Se perderan todos los cambios personalizados y se restauraran los umbrales originales del sistema. Esta accion no se puede deshacer."
        onConfirm={handleReset}
        onCancel={() => setConfirmReset(false)}
      />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Configuracion de alertas
          </h2>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Ajusta los umbrales que determinan cuando se generan alertas en el sistema.
          </p>
        </div>
        <button
          onClick={() => setConfirmReset(true)}
          disabled={saving.reset}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
          style={{
            background: 'var(--color-surface-3)',
            color: 'var(--color-text-muted)',
            border: '1px solid var(--color-border)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-glow-red)'; e.currentTarget.style.color = 'var(--color-accent-red)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-surface-3)'; e.currentTarget.style.color = 'var(--color-text-muted)' }}
        >
          {saving.reset ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
          Restaurar defaults
        </button>
      </div>

      {/* Phytophthora */}
      <SectionCard
        title="Phytophthora"
        icon={Shield}
        color="var(--color-accent-red)"
        glowColor="var(--color-glow-red)"
        saving={saving.phytophthora}
        onSave={() => saveSection('phytophthora')}
      >
        <div className="space-y-2">
          {phytophthora_groups.map(g => (
            <CollapsibleGroup
              key={g.key}
              label={g.label}
              desc={g.desc}
              icon={g.icon}
              color={g.color}
              fields={g.fields}
              values={draft.phytophthora}
              onChange={(k, v) => updateDraft('phytophthora', k, v)}
            />
          ))}
        </div>
      </SectionCard>

      {/* Riego */}
      <SectionCard
        title="Riego"
        icon={Droplets}
        color="var(--color-accent-cyan)"
        glowColor="var(--color-glow-cyan)"
        saving={saving.riego}
        onSave={() => saveSection('riego')}
      >
        <p className="text-[11px] mb-3 px-1" style={{ color: 'var(--color-text-muted)' }}>
          Determina cuando un nodo genera alerta de "necesita riego". El breaking point es el porcentaje de humedad debajo del cual el arbol empieza a sufrir estres hidrico.
        </p>
        <div className="space-y-0" style={{ paddingLeft: 4, paddingRight: 4 }}>
          {riego_fields.map(f => (
            <FieldRow
              key={f.key}
              label={f.label}
              value={draft.riego[f.key]}
              step={f.step}
              onChange={v => updateDraft('riego', f.key, v)}
            />
          ))}
        </div>
      </SectionCard>

      {/* Offline */}
      <SectionCard
        title="Sensor offline"
        icon={Wifi}
        color="var(--color-accent-amber)"
        glowColor="var(--color-glow-amber)"
        saving={saving.offline}
        onSave={() => saveSection('offline')}
      >
        <p className="text-[11px] mb-3 px-1" style={{ color: 'var(--color-text-muted)' }}>
          Si un nodo deja de enviar datos por mas de este tiempo, se marca como offline. Los nodos envian datos cada 5 minutos, asi que 30 min = 6 lecturas perdidas.
        </p>
        <div className="space-y-0" style={{ paddingLeft: 4, paddingRight: 4 }}>
          {offline_fields.map(f => (
            <FieldRow
              key={f.key}
              label={f.label}
              value={draft.offline[f.key]}
              step={f.step}
              onChange={v => updateDraft('offline', f.key, v)}
            />
          ))}
        </div>
      </SectionCard>

      {/* Bateria */}
      <SectionCard
        title="Bateria"
        icon={Battery}
        color="var(--color-accent-green)"
        glowColor="var(--color-glow-green)"
        saving={saving.bateria}
        onSave={() => saveSection('bateria')}
      >
        <p className="text-[11px] mb-3 px-1" style={{ color: 'var(--color-text-muted)' }}>
          Alerta cuando el voltaje de la bateria del nodo cae debajo del minimo. A 3.3V quedan aprox 1-2 dias de autonomia antes de apagarse.
        </p>
        <div className="space-y-0" style={{ paddingLeft: 4, paddingRight: 4 }}>
          {bateria_fields.map(f => (
            <FieldRow
              key={f.key}
              label={f.label}
              value={draft.bateria[f.key]}
              step={f.step}
              onChange={v => updateDraft('bateria', f.key, v)}
            />
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
