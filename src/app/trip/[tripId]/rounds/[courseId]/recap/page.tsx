import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function RoundRecapPage({
  params,
}: {
  params: Promise<{ tripId: string; courseId: string }>
}) {
  const { tripId, courseId } = await params
  const supabase = await createClient()

  const { data: course } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single()

  if (!course) notFound()

  const { data: trip } = await supabase
    .from('trips')
    .select('name')
    .eq('id', tripId)
    .single()

  // Round stats sorted by gross
  const { data: roundStats } = await supabase
    .from('round_stats')
    .select('*, trip_player:trip_players(*, player:players(name))')
    .eq('course_id', courseId)
    .order('gross_total', { ascending: true })

  // Game results for this round
  const { data: roundGames } = await supabase
    .from('round_games')
    .select(`
      *,
      game_format:game_formats(name, icon),
      game_results(*, trip_player:trip_players(*, player:players(name)))
    `)
    .eq('course_id', courseId)
    .eq('trip_id', tripId)
    .neq('status', 'cancelled')

  // Notable events
  const { data: events } = await supabase
    .from('activity_feed')
    .select('*')
    .eq('trip_id', tripId)
    .eq('course_id', courseId)
    .in('event_type', ['birdie', 'eagle', 'skin_won', 'game_result'])
    .order('created_at')
    .limit(30)

  const getName = (stat: { trip_player?: { player?: { name: string } | { name: string }[] } }) => {
    const tp = stat.trip_player
    const p = Array.isArray(tp?.player) ? tp?.player[0] : tp?.player
    return p?.name || 'Unknown'
  }

  const topPlayer = roundStats?.[0]
  const birdies = events?.filter(e => e.event_type === 'birdie') || []
  const eagles = events?.filter(e => e.event_type === 'eagle') || []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Header */}
      <header className="bg-golf-900 text-white">
        <div className="mx-auto max-w-lg px-4 py-8 text-center">
          <p className="text-golf-200 text-sm">{trip?.name} &middot; Round {course.round_number}</p>
          <h1 className="text-3xl font-bold mt-1">{course.name}</h1>
          <p className="text-golf-200 text-sm mt-2">
            Par {course.par}
            {course.round_date && ` · ${new Date(course.round_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-6 space-y-6">

        {/* Low Round Card */}
        {topPlayer && topPlayer.gross_total && (
          <div className="rounded-xl bg-white border border-golf-200 p-5 text-center shadow-sm">
            <p className="text-xs uppercase tracking-wider text-golf-700 font-semibold">Low Round</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{getName(topPlayer)}</p>
            <p className="text-4xl font-bold text-golf-700 mt-1">{topPlayer.gross_total}</p>
            {(() => {
              const diff = topPlayer.gross_total - (topPlayer.par_total ?? 0)
              const diffStr = diff === 0 ? 'Even par' : diff > 0 ? `+${diff}` : `${diff}`
              return (
                <p className="text-sm text-gray-500">
                  {diffStr} &middot; {topPlayer.birdies} birdies
                  {topPlayer.eagles > 0 && ` · ${topPlayer.eagles} eagles`}
                </p>
              )
            })()}
          </div>
        )}

        {/* Leaderboard */}
        {roundStats && roundStats.length > 0 && (
          <div className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-3">Round Leaderboard</h2>
            <div className="space-y-2">
              {roundStats.map((stat: {
                id: string
                gross_total: number | null
                par_total: number | null
                birdies: number
                eagles: number
                trip_player?: { player?: { name: string } | { name: string }[] }
              }, i: number) => {
                if (!stat.gross_total) return null
                const diff = stat.gross_total - (stat.par_total ?? 0)
                const diffStr = diff === 0 ? 'E' : diff > 0 ? `+${diff}` : `${diff}`
                return (
                  <div key={stat.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 text-center font-bold ${i === 0 ? 'text-golf-700 text-lg' : 'text-gray-400'}`}>
                        {i + 1}
                      </span>
                      <div>
                        <span className="font-medium text-gray-900">{getName(stat)}</span>
                        <span className="ml-2 text-gray-400">
                          {stat.birdies > 0 && `🐦${stat.birdies}`}
                          {stat.eagles > 0 && ` 🦅${stat.eagles}`}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-gray-900">{stat.gross_total}</span>
                      <span className={`ml-2 text-sm font-semibold ${diff < 0 ? 'text-red-600' : diff > 0 ? 'text-blue-600' : 'text-gray-500'}`}>
                        {diffStr}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Game Results */}
        {roundGames && roundGames.length > 0 && (
          <div className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-3">Game Results</h2>
            <div className="space-y-3">
              {roundGames.map((game: {
                id: string
                buy_in: number
                game_format?: { name: string; icon: string }
                game_results?: {
                  id: string
                  position: number
                  points: number
                  money: number
                  trip_player?: { player?: { name: string } | { name: string }[] }
                }[]
              }) => {
                const results = (game.game_results || []).sort((a, b) => a.position - b.position)
                return (
                  <div key={game.id} className="rounded-lg bg-gray-50 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{game.game_format?.icon}</span>
                      <span className="font-semibold text-gray-900">{game.game_format?.name}</span>
                      {game.buy_in > 0 && (
                        <span className="text-xs text-gray-500">${game.buy_in} buy-in</span>
                      )}
                    </div>
                    <div className="space-y-1">
                      {results.map((r) => {
                        const p = Array.isArray(r.trip_player?.player)
                          ? r.trip_player?.player[0] : r.trip_player?.player
                        return (
                          <div key={r.id} className="flex items-center justify-between text-sm">
                            <span className={r.position === 1 ? 'font-semibold text-golf-700' : 'text-gray-700'}>
                              {r.position === 1 && '🏆 '}{p?.name || 'Unknown'}
                            </span>
                            <span className="text-gray-500">
                              {r.points > 0 && `${r.points} pts`}
                              {r.money !== 0 && ` · ${r.money > 0 ? '+' : ''}$${r.money}`}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Key Moments */}
        {(birdies.length > 0 || eagles.length > 0) && (
          <div className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-3">Key Moments</h2>
            <div className="space-y-2">
              {[...eagles, ...birdies].map(event => (
                <div key={event.id} className="flex gap-3 text-sm">
                  <span className="text-lg">{event.icon}</span>
                  <div>
                    <p className="font-medium text-gray-900">{event.title}</p>
                    {event.detail && <p className="text-xs text-gray-500">{event.detail}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Share / Join CTA */}
        <div className="rounded-xl bg-golf-50 border border-golf-200 p-5 text-center">
          <p className="text-sm text-golf-800 font-medium">Want in on the next trip?</p>
          <p className="text-sm text-golf-700 mt-1">Ask your trip organizer to send you an invite.</p>
        </div>

      </div>
    </div>
  )
}
