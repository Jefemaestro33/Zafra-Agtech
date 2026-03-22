function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse rounded-lg ${className}`}
      style={{ background: 'var(--color-surface-3)' }}
    />
  )
}

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-2xl p-5 flex items-start gap-4"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
          >
            <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2.5">
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="h-7 w-16 rounded" />
            </div>
          </div>
        ))}
      </div>
      <div
        className="rounded-2xl p-5"
        style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
      >
        <Skeleton className="h-4 w-48 mb-4 rounded" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
      <div
        className="rounded-2xl p-5 space-y-3"
        style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
      >
        <Skeleton className="h-4 w-32 rounded" />
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded" />
        ))}
      </div>
    </div>
  )
}
