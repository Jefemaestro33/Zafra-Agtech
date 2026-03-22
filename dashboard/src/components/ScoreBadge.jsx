import { ShieldAlert, ShieldCheck, ShieldX, Shield } from 'lucide-react'

const config = {
  BAJO: {
    bg: 'var(--color-accent-green-dim)',
    text: 'var(--color-accent-green)',
    border: 'rgba(16, 185, 129, 0.3)',
    Icon: ShieldCheck,
  },
  MODERADO: {
    bg: 'var(--color-accent-amber-dim)',
    text: 'var(--color-accent-amber)',
    border: 'rgba(245, 158, 11, 0.3)',
    Icon: Shield,
  },
  ALTO: {
    bg: 'rgba(249, 115, 22, 0.15)',
    text: '#f97316',
    border: 'rgba(249, 115, 22, 0.3)',
    Icon: ShieldAlert,
  },
  'CRÍTICO': {
    bg: 'var(--color-accent-red-dim)',
    text: 'var(--color-accent-red)',
    border: 'rgba(239, 68, 68, 0.3)',
    Icon: ShieldX,
  },
}

export default function ScoreBadge({ score, nivel, size = 'md' }) {
  const c = config[nivel] || config.BAJO
  const Icon = c.Icon
  const sz = size === 'lg' ? 'px-3 py-1.5 text-sm gap-1.5' : 'px-2 py-0.5 text-xs gap-1'
  const iconSize = size === 'lg' ? 14 : 12
  const isCritical = nivel === 'CRÍTICO'

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ${sz} ${isCritical ? 'pulse-critical' : ''}`}
      style={{
        background: c.bg,
        color: c.text,
        border: `1px solid ${c.border}`,
      }}
    >
      <Icon size={iconSize} />
      {score}/100 {nivel}
    </span>
  )
}
