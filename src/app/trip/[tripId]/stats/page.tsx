import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

export default async function TripStatsPage({
  params,
}: {
  params: Promise<{ tripId: string }>
}) {
  const { tripId } = await params
  const supabase = await createClient()

  const { data: trip } = await supabase
    .from('trips')
    .select('name')
    .eq('id', tripId)
    .single()

  if (!trip) notFound()

  const [statsRes, awardsRes] = await Promise.all([
    supabase
      .from('trip_stats')
      .select('*, trip_player:trip_players(*, player:players(name))')
      .eq('trip_id', tripId)
      .order('scoring_average', { ascending: true }),
    supabase
      .from('trip_awards')
      .select('*, trip_player:trip_players(*, player:players(name))')
      .eq('trip_id', tripId),
  ])

  const tripStats = statsRes.data || []
  const awards = awardsRes.data || []

  const getName = (item: {
    trip_player?: { player?: { name: string } | { name: string }[] } | null
  }) => {
    const tp = item.trip_player
    const p = Array.isArray(tp?.player) ? tp?.player[0] : tp?.player
    return p?.name || 'Unknown'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-golf-900 text-white">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <p className="text-golf-200 text-sm">{trip.name}</p>
          <h1 className="text-2xl font-bold">Player Stats</h1>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        {/* Awards */}
        {awards.length > 0 && (
          <div className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-3">Trip Awards</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {awards.map((a: {
                id: string
                award_icon: string
                award_name: string
                value: string | null
                trip_player?: { player?: { name: string } | { name: string }[] } | null
              }) => (
                <div key={a.id} className="rounded-lg bg-gray-50 p-3 text-center">
                  <div className="text-2xl">{a.award_icon}</div>
                  <div className="text-xs font-semibold text-gray-900 mt-1">{a.award_name}</div>
                  <div className="text-xs text-green-700">{getName(a)}</div>
                  <div className="text-xs text-gray-500">{a.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Player Cards */}
        {tripStats.map((stat: {
          id: string
          total_gross: number | null
          total_par: number | null
          total_holes: number
          total_rounds: number
          scoring_average: number | null
          total_eagles: number
          total_birdies: number
          total_pars: number
          total_bogeys: number
          total_double_bogeys: number
          total_others: number
          total_bounce_backs: number
          longest_par_streak: number
          longest_bogey_streak: number
          best_round_gross: number | null
          trip_player?: { player?: { name: string } | { name: string }[] } | null
        }) => {
          const name = getName(stat)
          const diff = (stat.total_gross || 0) - (stat.total_par || 0)
          const diffStr = diff === 0 ? 'E' : diff > 0 ? `+${diff}` : `${diff}`
          const totalHoles = stat.total_holes || 1

          const dist = [
            { label: 'Eagle+', count: stat.total_eagles, color: 'bg-yellow-500' },
            { label: 'Birdie', count: stat.total_birdies, color: 'bg-red-500' },
            { label: 'Par', count: stat.total_pars, color: 'bg-green-500' },
            { label: 'Bogey', count: stat.total_bogeys, color: 'bg-blue-500' },
            { label: 'Dbl+', count: stat.total_double_bogeys + stat.total_others, color: 'bg-gray-400' },
          ]

          return (
            <div key={stat.id} className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-900">{name}</h3>
                <div className="text-right">
                  <span className="text-2xl font-bold text-gray-900">{stat.total_gross || '-'}</span>
                  <span className={`ml-2 text-sm font-bold ${diff < 0 ? 'text-red-600' : diff > 0 ? 'text-blue-600' : 'text-gray-500'}`}>
                    {diffStr}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 mb-3">
                {[
                  { label: 'Rounds', value: stat.total_rounds },
                  { label: 'Avg', value: stat.scoring_average || '-' },
                  { label: 'Birdies', value: stat.total_birdies + stat.total_eagles, cls: 'text-red-600' },
                  { label: 'Bounce', value: stat.total_bounce_backs, cls: 'text-green-700' },
                ].map(s => (
                  <div key={s.label} className="rounded-md bg-gray-50 p-2 text-center">
                    <div className="text-xs text-gray-500">{s.label}</div>
                    <div className={`font-bold ${s.cls || 'text-gray-900'}`}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Distribution bar */}
              <div className="flex rounded-full overflow-hidden h-3 mb-1">
                {dist.filter(d => d.count > 0).map(d => (
                  <div key={d.label} className={d.color} style={{ width: `${(d.count / totalHoles) * 100}%` }} title={`${d.label}: ${d.count}`} />
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                {dist.filter(d => d.count > 0).map(d => <span key={d.label}>{d.label}: {d.count}</span>)}
              </div>

              <div className="flex gap-4 text-xs text-gray-500 mt-2">
                <span>Par streak: {stat.longest_par_streak}</span>
                <span>Bogey streak: {stat.longest_bogey_streak}</span>
                {stat.best_round_gross && <span>Best: {stat.best_round_gross}</span>}
              </div>
            </div>
          )
        })}

        {tripStats.length === 0 && (
          <p className="text-center text-sm text-gray-500 py-8">
            No stats yet. Stats are computed after scores are entered.
          </p>
        )}
      </div>
    </div>
  )
}
