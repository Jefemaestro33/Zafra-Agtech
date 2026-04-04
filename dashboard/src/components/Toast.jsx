import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { createPortal } from 'react-dom'
import { X, CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react'

const ToastContext = createContext(null)

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const COLORS = {
  success: { bg: 'var(--color-glow-green)', border: 'rgba(16,185,129,0.3)', icon: 'var(--color-accent-green)' },
  error: { bg: 'var(--color-glow-red)', border: 'rgba(239,68,68,0.3)', icon: 'var(--color-accent-red)' },
  warning: { bg: 'var(--color-glow-amber)', border: 'rgba(245,158,11,0.3)', icon: 'var(--color-accent-amber)' },
  info: { bg: 'var(--color-glow-cyan)', border: 'rgba(34,211,238,0.3)', icon: 'var(--color-accent-cyan)' },
}

function ToastItem({ id, type = 'info', message, onDismiss }) {
  const [exiting, setExiting] = useState(false)
  const Icon = ICONS[type] || ICONS.info
  const colors = COLORS[type] || COLORS.info

  useEffect(() => {
    const timer = setTimeout(() => setExiting(true), 3500)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (exiting) {
      const timer = setTimeout(() => onDismiss(id), 300)
      return () => clearTimeout(timer)
    }
  }, [exiting, id, onDismiss])

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl max-w-sm"
      style={{
        background: 'var(--color-surface-3)',
        border: `1px solid ${colors.border}`,
        animation: exiting ? 'toastOut 0.3s ease-in forwards' : 'toastIn 0.3s ease-out',
      }}
    >
      <Icon size={18} style={{ color: colors.icon, flexShrink: 0 }} />
      <p className="text-sm flex-1" style={{ color: 'var(--color-text-primary)' }}>{message}</p>
      <button onClick={() => setExiting(true)} className="toast-close-btn p-1 rounded-lg" style={{ color: 'var(--color-text-muted)' }}>
        <X size={14} />
      </button>
    </div>
  )
}

function ToastContainer({ toasts, onDismiss }) {
  if (!toasts.length) return null
  return createPortal(
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col-reverse gap-2" style={{ pointerEvents: 'none' }}>
      {toasts.map(t => (
        <div key={t.id} style={{ pointerEvents: 'auto' }}>
          <ToastItem {...t} onDismiss={onDismiss} />
        </div>
      ))}
    </div>,
    document.body
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  let counter = 0

  const addToast = useCallback((type, message) => {
    const id = Date.now() + (counter++)
    setToasts(prev => [...prev.slice(-4), { id, type, message }]) // max 5 toasts
  }, [])

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = {
    success: (msg) => addToast('success', msg),
    error: (msg) => addToast('error', msg),
    warning: (msg) => addToast('warning', msg),
    info: (msg) => addToast('info', msg),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
