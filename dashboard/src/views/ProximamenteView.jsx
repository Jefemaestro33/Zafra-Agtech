import { Construction } from 'lucide-react'

export default function ProximamenteView({ title, description, icon: Icon }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 animate-in">
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: 'var(--color-surface-3)', border: '1px solid var(--color-border-light)' }}
      >
        {Icon ? <Icon size={36} style={{ color: 'var(--color-text-muted)' }} /> : <Construction size={36} style={{ color: 'var(--color-text-muted)' }} />}
      </div>
      <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>{title}</h2>
      <p className="text-sm text-center max-w-md leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
        {description}
      </p>
      <span
        className="mt-6 text-xs px-4 py-2 rounded-full font-semibold"
        style={{ background: 'var(--color-glow-amber)', color: 'var(--color-accent-amber)', border: '1px solid rgba(245,158,11,0.3)' }}
      >
        Próximamente
      </span>
    </div>
  )
}
