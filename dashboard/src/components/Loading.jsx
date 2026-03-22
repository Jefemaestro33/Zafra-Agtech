function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
}

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* KPI skeleton row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
            <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-16" />
            </div>
          </div>
        ))}
      </div>
      {/* Chart skeleton */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <Skeleton className="h-4 w-48 mb-4" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
      {/* Table skeleton */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <Skeleton className="h-4 w-32" />
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  )
}
