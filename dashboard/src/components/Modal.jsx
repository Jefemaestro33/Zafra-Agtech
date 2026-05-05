import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export default function Modal({ open, onClose, title, subtitle, headerExtra, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const widths = { sm: 480, md: 720, lg: 960, xl: 1200 }
  const maxWidth = widths[size] || 720

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full rounded-t-2xl sm:rounded-2xl flex flex-col animate-in"
        style={{
          maxWidth,
          maxHeight: '94vh',
          background: 'var(--color-surface-1)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 16px 64px rgba(0,0,0,0.55)',
        }}
      >
        <div
          className="flex items-start justify-between gap-3 px-5 py-4"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
              {title}
            </h3>
            {subtitle && (
              <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>
                {subtitle}
              </p>
            )}
          </div>
          {headerExtra && <div className="shrink-0">{headerExtra}</div>}
          <button
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-lg transition-colors hover-surface"
            style={{ color: 'var(--color-text-muted)' }}
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer && (
          <div
            className="px-5 py-3 flex flex-wrap justify-end gap-2"
            style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
