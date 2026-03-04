'use client'

/**
 * Traditional golf scorecard score indicator.
 * - Eagle or better: double circle (red)
 * - Birdie: circle (red)
 * - Par: no decoration
 * - Bogey: square (blue)
 * - Double bogey+: double square (blue)
 */
export default function ScoreIndicator({
  score,
  par,
  size = 'sm',
}: {
  score: number
  par: number
  size?: 'xs' | 'sm' | 'md'
}) {
  const diff = score - par

  const sizeClasses = {
    xs: { box: 'h-5 w-5 text-[10px]', ring: 'h-5 w-5', outerRing: 'h-7 w-7' },
    sm: { box: 'h-7 w-7 text-xs', ring: 'h-7 w-7', outerRing: 'h-9 w-9' },
    md: { box: 'h-8 w-8 text-sm', ring: 'h-8 w-8', outerRing: 'h-10 w-10' },
  }

  const s = sizeClasses[size]

  // Eagle or better — double circle
  if (diff <= -2) {
    return (
      <span className="relative inline-flex items-center justify-center">
        <span className={`${s.outerRing} rounded-full border-2 border-red-500 flex items-center justify-center`}>
          <span className={`${s.ring} rounded-full border-2 border-red-500 flex items-center justify-center font-bold text-red-600`}>
            {score}
          </span>
        </span>
      </span>
    )
  }

  // Birdie — single circle
  if (diff === -1) {
    return (
      <span className="inline-flex items-center justify-center">
        <span className={`${s.ring} rounded-full border-2 border-red-500 flex items-center justify-center font-bold text-red-600`}>
          {score}
        </span>
      </span>
    )
  }

  // Bogey — single square
  if (diff === 1) {
    return (
      <span className="inline-flex items-center justify-center">
        <span className={`${s.box} border-2 border-blue-500 flex items-center justify-center font-bold text-blue-600`}>
          {score}
        </span>
      </span>
    )
  }

  // Double bogey or worse — double square
  if (diff >= 2) {
    return (
      <span className="relative inline-flex items-center justify-center">
        <span className={`${s.outerRing} border-2 border-blue-500 flex items-center justify-center`}>
          <span className={`${s.box} border-2 border-blue-500 flex items-center justify-center font-bold text-blue-600`}>
            {score}
          </span>
        </span>
      </span>
    )
  }

  // Par — no decoration
  return (
    <span className="inline-flex items-center justify-center">
      <span className={`${s.box} flex items-center justify-center font-semibold text-gray-900`}>
        {score}
      </span>
    </span>
  )
}
