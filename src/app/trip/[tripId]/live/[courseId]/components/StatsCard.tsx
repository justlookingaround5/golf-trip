'use client'

interface StatsCardProps {
  stats: {
    holes_played: number
    gross_total: number
    net_total: number
    par_total: number
    birdies: number
    pars: number
    bogeys: number
    double_bogeys: number
    others: number
    eagles: number
    greens_in_regulation: number
    fairways_hit: number
    fairways_total: number
    total_putts: number
    putts_per_hole: number | null
    bounce_backs: number
    best_hole_number: number | null
    best_hole_vs_par: number | null
    worst_hole_number: number | null
    worst_hole_vs_par: number | null
    front_nine_gross: number | null
    back_nine_gross: number | null
  } | null
  playerName: string
}

function formatVsPar(vsPar: number): string {
  if (vsPar === 0) return 'E'
  return vsPar > 0 ? `+${vsPar}` : `${vsPar}`
}

function vsParColor(vsPar: number): string {
  if (vsPar < 0) return 'text-red-600'
  if (vsPar > 0) return 'text-blue-600'
  return 'text-gray-500'
}

export default function StatsCard({ stats, playerName }: StatsCardProps) {
  if (!stats || stats.holes_played === 0) return null

  const vsPar = stats.gross_total - stats.par_total
  const fairwayPct = stats.fairways_total > 0
    ? Math.round((stats.fairways_hit / stats.fairways_total) * 100)
    : null
  const girPct = stats.holes_played > 0
    ? Math.round((stats.greens_in_regulation / stats.holes_played) * 100)
    : null

  return (
    <div className="mb-4 rounded-xl bg-white border border-golf-200 p-4 shadow-sm">
      {/* Header */}
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
        {playerName}&apos;s Stats
      </h3>

      {/* Score summary row */}
      <div className="mb-3 grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-golf-50 p-2.5 text-center">
          <div className="text-xs text-gray-500">Gross</div>
          <div className="text-xl font-bold text-gray-900">{stats.gross_total}</div>
        </div>
        <div className="rounded-lg bg-golf-50 p-2.5 text-center">
          <div className="text-xs text-gray-500">Net</div>
          <div className="text-xl font-bold text-gray-900">{stats.net_total}</div>
        </div>
        <div className="rounded-lg bg-golf-50 p-2.5 text-center">
          <div className="text-xs text-gray-500">vs Par</div>
          <div className={`text-xl font-bold ${vsParColor(vsPar)}`}>
            {formatVsPar(vsPar)}
          </div>
        </div>
      </div>

      {/* Scoring distribution */}
      <div className="mb-3 flex items-center justify-around rounded-lg bg-gray-50 px-2 py-2.5">
        {stats.eagles > 0 && (
          <div className="text-center">
            <div className="text-lg font-bold text-yellow-600">{stats.eagles}</div>
            <div className="text-[10px] text-gray-500">Eagle</div>
          </div>
        )}
        <div className="text-center">
          <div className="text-lg font-bold text-red-600">{stats.birdies}</div>
          <div className="text-[10px] text-gray-500">Birdie</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-green-600">{stats.pars}</div>
          <div className="text-[10px] text-gray-500">Par</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-blue-600">{stats.bogeys}</div>
          <div className="text-[10px] text-gray-500">Bogey</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-purple-600">{stats.double_bogeys + stats.others}</div>
          <div className="text-[10px] text-gray-500">Dbl+</div>
        </div>
      </div>

      {/* Detailed stats */}
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Fairways</span>
          <span className="font-medium text-gray-900">
            {stats.fairways_hit}/{stats.fairways_total}
            {fairwayPct !== null && ` (${fairwayPct}%)`}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Greens (GIR)</span>
          <span className="font-medium text-gray-900">
            {stats.greens_in_regulation}/{stats.holes_played}
            {girPct !== null && ` (${girPct}%)`}
          </span>
        </div>
        {stats.total_putts > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-500">Putts</span>
            <span className="font-medium text-gray-900">
              {stats.total_putts}
              {stats.putts_per_hole !== null && ` (${stats.putts_per_hole.toFixed(1)}/hole)`}
            </span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-500">Bounce Backs</span>
          <span className="font-medium text-gray-900">{stats.bounce_backs}</span>
        </div>
        {stats.front_nine_gross !== null && stats.back_nine_gross !== null && (
          <div className="flex justify-between">
            <span className="text-gray-500">Front / Back</span>
            <span className="font-medium text-gray-900">
              {stats.front_nine_gross} / {stats.back_nine_gross}
            </span>
          </div>
        )}
        {stats.best_hole_number !== null && stats.best_hole_vs_par !== null && (
          <div className="flex justify-between">
            <span className="text-gray-500">Best Hole</span>
            <span className="font-medium text-gray-900">
              #{stats.best_hole_number} ({formatVsPar(stats.best_hole_vs_par)})
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
