import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

const iconColors = {
  green: { bg: 'var(--color-glow-green)', border: 'var(--color-accent-green-dim)', icon: 'var(--color-accent-green)' },
  blue: { bg: 'var(--color-glow-cyan)', border: 'var(--color-accent-cyan-dim)', icon: 'var(--color-accent-cyan)' },
  yellow: { bg: 'var(--color-glow-amber)', border: 'var(--color-accent-amber-dim)', icon: 'var(--color-accent-amber)' },
  orange: { bg: 'var(--color-glow-amber)', border: 'var(--color-accent-amber-dim)', icon: 'var(--color-accent-amber)' },
  red: { bg: 'var(--color-glow-red)', border: 'var(--color-accent-red-dim)', icon: 'var(--color-accent-red)' },
  gray: { bg: 'var(--color-surface-4)', border: 'var(--color-border)', icon: 'var(--color-text-muted)' },
}

export default function KpiCard({ title, value, subtitle, icon: Icon, color = 'blue', trend }) {
  const c = iconColors[color] || iconColors.blue

  return (
    <div
      className="card-glow animate-in rounded-2xl p-5 flex items-start gap-4"
      style={{
        background: 'var(--color-surface-2)',
        border: '1px solid var(--color-border)',
      }}
    >
      {Icon && (
        <div
          className="rounded-xl p-2.5 shrink-0"
          style={{ background: c.bg, border: `1px solid ${c.border}` }}
        >
          {typeof Icon === 'string' ? (
            <span className="text-xl block w-5 h-5 flex items-center justify-center">{Icon}</span>
          ) : (
            <Icon size={20} style={{ color: c.icon }} />
          )}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text-muted)' }}>
          {title}
        </p>
        <div className="flex items-baseline gap-2 mt-1">
          <p className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
            {value ?? '—'}
          </p>
          {trend && (
            <span className="flex items-center gap-0.5 text-xs font-semibold" style={{
              color: trend > 0 ? 'var(--color-accent-green)' : trend < 0 ? 'var(--color-accent-red)' : 'var(--color-text-muted)'
            }}>
              {trend > 0 ? <TrendingUp size={12} /> : trend < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
              {trend > 0 ? '+' : ''}{trend}%
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-[11px] mt-1.5" style={{ color: 'var(--color-text-muted)' }}>{subtitle}</p>
        )}
      </div>
    </div>
  )
}
