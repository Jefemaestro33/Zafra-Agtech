import { Inbox } from 'lucide-react'

export default function EmptyState({ icon: Icon, title, description }) {
  return (
    <div
      className="rounded-2xl p-12 text-center animate-in"
      style={{
        background: 'var(--color-surface-2)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
        style={{ background: 'var(--color-surface-3)', border: '1px solid var(--color-border-light)' }}
      >
        {Icon ? (
          typeof Icon === 'string' ? (
            <span className="text-3xl">{Icon}</span>
          ) : (
            <Icon size={28} style={{ color: 'var(--color-text-muted)' }} />
          )
        ) : (
          <Inbox size={28} style={{ color: 'var(--color-text-muted)' }} />
        )}
      </div>
      <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
        {title}
      </h3>
      {description && (
        <p className="text-sm mt-2 max-w-md mx-auto leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          {description}
        </p>
      )}
    </div>
  )
}
