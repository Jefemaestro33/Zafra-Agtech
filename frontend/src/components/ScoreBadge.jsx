export default function ScoreBadge({ score, nivel, size = 'md' }) {
  const colors = {
    BAJO: 'bg-green-50 text-green-800 border-green-200',
    MODERADO: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    ALTO: 'bg-orange-50 text-orange-800 border-orange-200',
    'CRÍTICO': 'bg-red-50 text-red-800 border-red-200',
  }
  const c = colors[nivel] || colors.BAJO
  const sz = size === 'lg' ? 'px-3 py-1.5 text-base' : 'px-2 py-0.5 text-xs'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-semibold ${c} ${sz}`}>
      {score}/100 {nivel}
    </span>
  )
}
