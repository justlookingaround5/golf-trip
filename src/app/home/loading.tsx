function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg border border-gray-200 bg-white p-5 shadow-sm ${className}`}>
      <div className="mb-3 h-5 w-2/3 rounded bg-gray-200" />
      <div className="mb-2 h-4 w-1/2 rounded bg-gray-100" />
      <div className="h-4 w-1/3 rounded bg-gray-100" />
    </div>
  )
}

export default function HomeLoading() {
  return (
    <div>
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="mb-2 h-7 w-64 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-48 animate-pulse rounded bg-gray-100" />
      </div>

      {/* Groups skeleton */}
      <div className="mb-10">
        <div className="mb-4 flex items-center justify-between">
          <div className="h-6 w-32 animate-pulse rounded bg-gray-200" />
          <div className="h-8 w-24 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>

      {/* Stats + Activity skeleton */}
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <div className="mb-4 h-6 w-28 animate-pulse rounded bg-gray-200" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse rounded-lg border border-gray-200 bg-white p-4">
                <div className="mb-2 h-4 w-16 rounded bg-gray-100" />
                <div className="h-7 w-12 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-4 h-6 w-36 animate-pulse rounded bg-gray-200" />
          <SkeletonCard className="h-48" />
        </div>
      </div>
    </div>
  )
}
