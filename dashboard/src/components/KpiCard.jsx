export default function KpiCard({ title, value, subtitle, icon, color = 'blue' }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    orange: 'bg-orange-50 text-orange-700',
    red: 'bg-red-50 text-red-700',
    gray: 'bg-gray-50 text-gray-700',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
      {icon && (
        <div className={`rounded-lg p-2.5 ${colors[color] || colors.blue}`}>
          <span className="text-xl">{icon}</span>
        </div>
      )}
      <div className="min-w-0">
        <p className="text-sm text-gray-500 truncate">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value ?? '—'}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  )
}
