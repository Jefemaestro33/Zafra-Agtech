import { useState, useEffect } from 'react'
import {
  BellRing, MessageCircle, Mail, Send, Monitor, Shield, Droplets,
  Wifi, Battery, Clock, Save, Loader2, Check, X, AlertTriangle,
} from 'lucide-react'

const STORAGE_KEY = 'zafra_notif_config'

const defaultConfig = {
  canales: {
    dashboard: true,
    whatsapp: false,
    email: false,
    telegram: false,
  },
  contacto: {
    whatsapp_phone: '',
    email_address: '',
    telegram_chat_id: '',
  },
  tipos_alerta: {
    phytophthora_critico: true,
    phytophthora_alto: true,
    necesita_riego: true,
    sensor_offline: true,
    bateria_baja: true,
  },
  horario: {
    solo_horario_laboral: false,
    hora_inicio: '07:00',
    hora_fin: '20:00',
  },
}

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

function SectionCard({ title, icon: Icon, color, glowColor, children }) {
  return (
    <div
      className="rounded-2xl p-5 animate-in"
      style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: glowColor, border: `1px solid ${color}33` }}
        >
          <Icon size={20} style={{ color }} />
        </div>
        <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{title}</h3>
      </div>
      {children}
    </div>
  )
}

function Toggle({ enabled, onChange, disabled = false }) {
  return (
    <button
      onClick={() => { if (!disabled) onChange(!enabled) }}
      className="relative w-10 h-[22px] rounded-full transition-colors shrink-0"
      style={{
        background: enabled ? 'var(--color-accent-green)' : 'var(--color-surface-3)',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        border: '1px solid var(--color-border)',
      }}
    >
      <div
        className="absolute top-[2px] w-4 h-4 rounded-full transition-all duration-200"
        style={{
          background: enabled ? '#fff' : 'var(--color-text-muted)',
          left: enabled ? 'calc(100% - 18px)' : '2px',
        }}
      />
    </button>
  )
}

function ChannelRow({ icon: Icon, label, enabled, onChange, disabled = false, children }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Icon size={16} style={{ color: enabled ? 'var(--color-accent-green)' : 'var(--color-text-muted)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{label}</span>
          {disabled && (
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-muted)' }}>
              Siempre activo
            </span>
          )}
        </div>
        <Toggle enabled={enabled} onChange={onChange} disabled={disabled} />
      </div>
      {enabled && children && (
        <div className="mt-3 pl-7">
          {children}
        </div>
      )}
    </div>
  )
}

function AlertTypeRow({ icon: Icon, color, label, description, enabled, onChange }) {
  return (
    <div
      className="flex items-center justify-between gap-4 rounded-xl p-3"
      style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Icon size={16} style={{ color }} />
        <div className="min-w-0">
          <p className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>{label}</p>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{description}</p>
        </div>
      </div>
      <Toggle enabled={enabled} onChange={onChange} />
    </div>
  )
}

// ── Main view ──

export default function ConfigNotificacionesView() {
  const [config, setConfig] = useState(null)
  const [toast, setToast] = useState(null)
  const [saving, setSaving] = useState(false)

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setConfig({ ...defaultConfig, ...parsed })
      } else {
        setConfig({ ...defaultConfig })
      }
    } catch {
      setConfig({ ...defaultConfig })
    }
  }, [])

  const update = (section, key, value) => {
    setConfig(prev => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }))
  }

  const handleSave = () => {
    setSaving(true)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
      setTimeout(() => {
        setSaving(false)
        showToast('success', 'Configuracion de notificaciones guardada')
      }, 400)
    } catch {
      setSaving(false)
      showToast('error', 'Error al guardar configuracion')
    }
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center py-20 animate-in">
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-accent-green)' }} />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Notificaciones
          </h2>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Configura donde y como recibes las alertas del sistema.
          </p>
        </div>
        <button
          onClick={handleSave}
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

      {/* Canales de notificacion */}
      <SectionCard
        title="Canales de notificacion"
        icon={BellRing}
        color="var(--color-accent-cyan)"
        glowColor="var(--color-glow-cyan)"
      >
        <div className="space-y-2">
          <ChannelRow
            icon={Monitor}
            label="Dashboard"
            enabled={config.canales.dashboard}
            onChange={() => {}}
            disabled
          />

          <ChannelRow
            icon={MessageCircle}
            label="WhatsApp"
            enabled={config.canales.whatsapp}
            onChange={v => update('canales', 'whatsapp', v)}
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] shrink-0" style={{ color: 'var(--color-text-muted)' }}>+52</span>
              <input
                type="tel"
                placeholder="10 digitos"
                value={config.contacto.whatsapp_phone}
                onChange={e => update('contacto', 'whatsapp_phone', e.target.value)}
                className="flex-1 text-sm px-3 py-1.5 rounded-lg outline-none transition-colors"
                style={{
                  background: 'var(--color-surface-0)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid var(--color-border)',
                }}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--color-accent-green)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
              />
            </div>
          </ChannelRow>

          <ChannelRow
            icon={Mail}
            label="Email"
            enabled={config.canales.email}
            onChange={v => update('canales', 'email', v)}
          >
            <input
              type="email"
              placeholder="correo@ejemplo.com"
              value={config.contacto.email_address}
              onChange={e => update('contacto', 'email_address', e.target.value)}
              className="w-full text-sm px-3 py-1.5 rounded-lg outline-none transition-colors"
              style={{
                background: 'var(--color-surface-0)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border)',
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--color-accent-green)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
            />
          </ChannelRow>

          <ChannelRow
            icon={Send}
            label="Telegram"
            enabled={config.canales.telegram}
            onChange={v => update('canales', 'telegram', v)}
          >
            <input
              type="text"
              placeholder="Chat ID"
              value={config.contacto.telegram_chat_id}
              onChange={e => update('contacto', 'telegram_chat_id', e.target.value)}
              className="w-full text-sm px-3 py-1.5 rounded-lg outline-none transition-colors"
              style={{
                background: 'var(--color-surface-0)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border)',
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--color-accent-green)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
            />
          </ChannelRow>
        </div>
      </SectionCard>

      {/* Que alertas notificar */}
      <SectionCard
        title="Que alertas notificar"
        icon={AlertTriangle}
        color="var(--color-accent-amber)"
        glowColor="var(--color-glow-amber)"
      >
        <div className="space-y-2">
          <AlertTypeRow
            icon={Shield}
            color="var(--color-accent-red)"
            label="Phytophthora CRITICO"
            description="Score de riesgo en nivel critico. Accion inmediata requerida."
            enabled={config.tipos_alerta.phytophthora_critico}
            onChange={v => update('tipos_alerta', 'phytophthora_critico', v)}
          />
          <AlertTypeRow
            icon={Shield}
            color="var(--color-accent-amber)"
            label="Phytophthora ALTO"
            description="Score de riesgo en nivel alto. Monitoreo cercano recomendado."
            enabled={config.tipos_alerta.phytophthora_alto}
            onChange={v => update('tipos_alerta', 'phytophthora_alto', v)}
          />
          <AlertTypeRow
            icon={Droplets}
            color="var(--color-accent-cyan)"
            label="Necesita riego"
            description="Humedad del suelo por debajo del breaking point. El arbol necesita agua."
            enabled={config.tipos_alerta.necesita_riego}
            onChange={v => update('tipos_alerta', 'necesita_riego', v)}
          />
          <AlertTypeRow
            icon={Wifi}
            color="var(--color-accent-amber)"
            label="Sensor offline"
            description="Un nodo dejo de enviar datos por mas del tiempo configurado."
            enabled={config.tipos_alerta.sensor_offline}
            onChange={v => update('tipos_alerta', 'sensor_offline', v)}
          />
          <AlertTypeRow
            icon={Battery}
            color="var(--color-accent-green)"
            label="Bateria baja"
            description="Voltaje de bateria del nodo por debajo del minimo. Reemplazar pronto."
            enabled={config.tipos_alerta.bateria_baja}
            onChange={v => update('tipos_alerta', 'bateria_baja', v)}
          />
        </div>
      </SectionCard>

      {/* Horario de notificaciones */}
      <SectionCard
        title="Horario de notificaciones"
        icon={Clock}
        color="var(--color-accent-violet)"
        glowColor="var(--color-glow-violet)"
      >
        <div className="space-y-3">
          <div
            className="flex items-center justify-between gap-4 rounded-xl p-4"
            style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}
          >
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                Solo en horario laboral
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                Fuera de este horario las alertas se acumulan y se envian al inicio del siguiente dia laboral.
              </p>
            </div>
            <Toggle
              enabled={config.horario.solo_horario_laboral}
              onChange={v => update('horario', 'solo_horario_laboral', v)}
            />
          </div>

          {config.horario.solo_horario_laboral && (
            <div
              className="flex items-center gap-4 rounded-xl p-4"
              style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}
            >
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Inicio</label>
                <input
                  type="time"
                  value={config.horario.hora_inicio}
                  onChange={e => update('horario', 'hora_inicio', e.target.value)}
                  className="text-sm px-3 py-1.5 rounded-lg outline-none transition-colors"
                  style={{
                    background: 'var(--color-surface-0)',
                    color: 'var(--color-text-primary)',
                    border: '1px solid var(--color-border)',
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--color-accent-green)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Fin</label>
                <input
                  type="time"
                  value={config.horario.hora_fin}
                  onChange={e => update('horario', 'hora_fin', e.target.value)}
                  className="text-sm px-3 py-1.5 rounded-lg outline-none transition-colors"
                  style={{
                    background: 'var(--color-surface-0)',
                    color: 'var(--color-text-primary)',
                    border: '1px solid var(--color-border)',
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--color-accent-green)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                />
              </div>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  )
}
