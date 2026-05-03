import { useNavigate } from 'react-router-dom'
import {
  Settings, BellRing, Plug, DatabaseBackup, BookOpen, LogOut,
} from 'lucide-react'

const CONFIG_ITEMS = [
  { icon: Settings, label: 'Configuración de alertas', desc: 'Umbrales Phytophthora, riego, batería', path: '/config/alertas' },
  { icon: BellRing, label: 'Notificaciones', desc: 'Email, WhatsApp, canales', path: '/config/notificaciones' },
  { icon: Plug, label: 'Integraciones', desc: 'API Keys, webhooks, Telegram', path: '/config/integraciones' },
  { icon: DatabaseBackup, label: 'Respaldos', desc: 'Backup y restore de datos', path: '/config/respaldos' },
]

export default function ProfileMenu({ user, compact = false, onClose, onLogout }) {
  const navigate = useNavigate()

  const go = (path) => { onClose(); navigate(path) }

  return (
    <>
      <div className="fixed inset-0" style={{ zIndex: 60 }} onClick={onClose} />
      <div
        className="rounded-2xl py-2 animate-in shadow-2xl"
        style={{
          // position must be set for z-index to apply; the spread below
          // overrides to 'fixed' in compact mode.
          position: 'relative',
          zIndex: 70,
          background: 'var(--color-surface-3)',
          border: '1px solid var(--color-border-light)',
          width: compact ? 220 : undefined,
          ...(compact ? { position: 'fixed', bottom: 60, left: 8 } : {}),
        }}
      >
        <div className="px-4 py-2 mb-1" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <p className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>{user.nombre}</p>
          <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            {user.rol === 'admin' ? 'Administrador' : user.rol === 'agronomo' ? 'Agrónomo' : 'Solo lectura'} · Zafra
          </p>
        </div>

        {!compact && (
          <p className="px-4 pt-2 pb-1 text-[9px] font-semibold uppercase tracking-widest"
            style={{ color: 'var(--color-text-muted)' }}>Configuración</p>
        )}

        {CONFIG_ITEMS.map((item, i) => (
          <button key={i} onClick={() => go(item.path)}
            className="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors hover-surface-4">
            <item.icon size={compact ? 14 : 15} style={{ color: 'var(--color-text-muted)' }} />
            {compact ? (
              <span className="text-xs" style={{ color: 'var(--color-text-primary)' }}>{item.label}</span>
            ) : (
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>{item.label}</p>
                <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{item.desc}</p>
              </div>
            )}
          </button>
        ))}

        <div className="my-1 mx-3" style={{ borderTop: '1px solid var(--color-border)' }} />

        <button onClick={() => go('/docs')}
          className="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors hover-surface-4">
          <BookOpen size={compact ? 14 : 15} style={{ color: 'var(--color-text-muted)' }} />
          {compact ? (
            <span className="text-xs" style={{ color: 'var(--color-text-primary)' }}>Documentación</span>
          ) : (
            <div>
              <p className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>Documentación</p>
              <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Guías y ayuda</p>
            </div>
          )}
        </button>

        <div className="my-1 mx-3" style={{ borderTop: '1px solid var(--color-border)' }} />

        <button onClick={() => { onClose(); onLogout() }}
          className="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors hover-danger">
          <LogOut size={compact ? 14 : 15} style={{ color: 'var(--color-accent-red)' }} />
          <p className="text-xs font-medium" style={{ color: 'var(--color-accent-red)' }}>Cerrar sesión</p>
        </button>
      </div>
    </>
  )
}
