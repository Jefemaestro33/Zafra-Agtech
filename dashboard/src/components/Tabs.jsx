export default function Tabs({ tabs, active, onChange }) {
  return (
    <div
      className="flex items-center gap-1 px-2"
      style={{ borderBottom: '1px solid var(--color-border)' }}
    >
      {tabs.map(t => {
        const isActive = t.key === active
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className="flex items-center gap-2 px-3 py-2.5 text-xs font-medium transition-colors relative"
            style={{
              color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
            }}
          >
            {t.label}
            {typeof t.count === 'number' && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full"
                style={{
                  background: isActive ? 'var(--color-accent-green-dim)' : 'var(--color-surface-3)',
                  color: isActive ? 'var(--color-accent-green)' : 'var(--color-text-muted)',
                }}
              >
                {t.count}
              </span>
            )}
            {isActive && (
              <span
                className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full"
                style={{ background: 'var(--color-accent-green)' }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
