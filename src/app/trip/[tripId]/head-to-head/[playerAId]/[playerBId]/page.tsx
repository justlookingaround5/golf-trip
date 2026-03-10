import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function HeadToHeadComparisonPage({
  params,
}: {
  params: Promise<{ tripId: string; playerAId: string; playerBId: string }>
}) {
  const { tripId, playerAId, playerBId } = await params
  const supabase = await createClient()

  const { data: trip } = await supabase
    .from('trips')
    .select('id, name')
    .eq('id', tripId)
    .single()

  if (!trip) notFound()

  // Fetch player names
  const { data: tpA } = await supabase
    .from('trip_players')
    .select('id, player:players(id, name, user_id)')
    .eq('id', playerAId)
    .single()

  const { data: tpB } = await supabase
    .from('trip_players')
    .select('id, player:players(id, name, user_id)')
    .eq('id', playerBId)
    .single()

  if (!tpA || !tpB) notFound()

  const playerAData = Array.isArray(tpA.player) ? tpA.player[0] : tpA.player
  const playerBData = Array.isArray(tpB.player) ? tpB.player[0] : tpB.player
  const pA = playerAData as { id?: string; name?: string; user_id?: string } | null
  const pB = playerBData as { id?: string; name?: string; user_id?: string } | null

  // Resolve display names
  const userIds = [pA?.user_id, pB?.user_id].filter(Boolean) as string[]
  let profileMap = new Map<string, string>()
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('player_profiles')
      .select('user_id, display_name')
      .in('user_id', userIds)
    for (const p of profiles || []) {
      if (p.display_name) profileMap.set(p.user_id, p.display_name)
    }
  }

  const nameA = ((pA?.user_id ? profileMap.get(pA.user_id) : undefined) || pA?.name || 'Player A').split(' ')[0]
  const nameB = ((pB?.user_id ? profileMap.get(pB.user_id) : undefined) || pB?.name || 'Player B').split(' ')[0]

  // Find matches both players participated in
  const { data: matchPlayersA } = await supabase
    .from('match_players')
    .select('match_id, side')
    .eq('trip_player_id', playerAId)

  const { data: matchPlayersB } = await supabase
    .from('match_players')
    .select('match_id, side')
    .eq('trip_player_id', playerBId)

  const aMatchIds = new Set((matchPlayersA || []).map(mp => mp.match_id))
  const commonMatchIds = (matchPlayersB || [])
    .filter(mp => aMatchIds.has(mp.match_id))
    .map(mp => mp.match_id)

  let wins = 0, losses = 0, ties = 0
  interface MatchHistoryItem {
    id: string
    format: string
    result: string | null
    outcome: 'win' | 'loss' | 'tie'
    created_at: string
  }
  const matchHistory: MatchHistoryItem[] = []

  if (commonMatchIds.length > 0) {
    const { data: matches } = await supabase
      .from('matches')
      .select('id, format, result, winner_side, status, created_at')
      .in('id', commonMatchIds)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })

    const aSideMap = new Map((matchPlayersA || []).map(mp => [mp.match_id, mp.side]))

    for (const match of matches || []) {
      const aSide = aSideMap.get(match.id)
      let outcome: 'win' | 'loss' | 'tie' = 'tie'
      if (match.winner_side === 'tie' || !match.winner_side) {
        ties++
        outcome = 'tie'
      } else if (match.winner_side === aSide) {
        wins++
        outcome = 'win'
      } else {
        losses++
        outcome = 'loss'
      }
      matchHistory.push({
        id: match.id,
        format: match.format,
        result: match.result,
        outcome,
        created_at: match.created_at,
      })
    }
  }

  // Fetch trip stats for both players
  const { data: statsA } = await supabase
    .from('trip_stats')
    .select('*')
    .eq('trip_id', tripId)
    .eq('trip_player_id', playerAId)
    .single()

  const { data: statsB } = await supabase
    .from('trip_stats')
    .select('*')
    .eq('trip_id', tripId)
    .eq('trip_player_id', playerBId)
    .single()

  // Fetch wallet balance between players
  const { data: wallet } = await supabase
    .from('player_wallets')
    .select('balance')
    .or(`and(player_a_id.eq.${playerAId},player_b_id.eq.${playerBId}),and(player_a_id.eq.${playerBId},player_b_id.eq.${playerAId})`)
    .single()

  const formatLabels: Record<string, string> = {
    '1v1_stroke': 'Stroke',
    '2v2_best_ball': 'Best Ball',
    '1v1_match': 'Match Play',
    '2v2_alternate_shot': 'Alt Shot',
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-golf-800 px-4 py-6 text-white">
        <div className="mx-auto max-w-2xl">
          <Link
            href={`/trip/${tripId}/head-to-head`}
            className="mb-2 inline-flex items-center gap-1 text-sm text-golf-300 hover:text-white"
          >
            &larr; Back
          </Link>
          <h1 className="text-2xl font-bold">Head-to-Head</h1>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6 space-y-4">
        {/* Record Banner */}
        <div className="rounded-xl bg-white border border-gray-200 p-6 shadow-sm text-center">
          <div className="flex items-center justify-center gap-4">
            <div className="text-right">
              <p className="text-lg font-bold text-gray-900">{nameA}</p>
              <p className="text-3xl font-black text-golf-700">{wins}</p>
            </div>
            <div className="text-gray-400 text-sm">
              <p className="text-xl font-bold">{ties}</p>
              <p>ties</p>
            </div>
            <div className="text-left">
              <p className="text-lg font-bold text-gray-900">{nameB}</p>
              <p className="text-3xl font-black text-golf-700">{losses}</p>
            </div>
          </div>
          {wallet && (
            <p className="mt-3 text-sm text-gray-500">
              Net balance: <span className={`font-bold ${wallet.balance > 0 ? 'text-green-600' : wallet.balance < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                ${Math.abs(wallet.balance).toFixed(0)} {wallet.balance > 0 ? `to ${nameA}` : wallet.balance < 0 ? `to ${nameB}` : 'even'}
              </span>
            </p>
          )}
        </div>

        {/* Stat Comparison */}
        {(statsA || statsB) && (
          <div className="rounded-xl bg-white border border-gray-200 p-5 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-3">Trip Stats</h3>
            <div className="space-y-2">
              <StatRow label="Scoring Avg" valA={statsA?.scoring_average?.toFixed(1)} valB={statsB?.scoring_average?.toFixed(1)} lowerBetter />
              <StatRow label="Best Round" valA={statsA?.best_round_gross} valB={statsB?.best_round_gross} lowerBetter />
              <StatRow label="Birdies" valA={statsA?.total_birdies} valB={statsB?.total_birdies} />
              <StatRow label="Eagles" valA={statsA?.total_eagles} valB={statsB?.total_eagles} />
              <StatRow label="Rounds" valA={statsA?.total_rounds} valB={statsB?.total_rounds} />
              <StatRow label="Holes Played" valA={statsA?.total_holes} valB={statsB?.total_holes} />
            </div>
          </div>
        )}

        {/* Match History */}
        {matchHistory.length > 0 && (
          <div className="rounded-xl bg-white border border-gray-200 p-5 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-3">Match History</h3>
            <div className="space-y-2">
              {matchHistory.map(m => (
                <div key={m.id} className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      m.outcome === 'win' ? 'bg-green-500' : m.outcome === 'loss' ? 'bg-red-500' : 'bg-gray-400'
                    }`} />
                    <span className="font-medium text-gray-900">
                      {formatLabels[m.format] || m.format}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.result && <span className="text-xs text-gray-500">{m.result}</span>}
                    <span className={`text-xs font-bold ${
                      m.outcome === 'win' ? 'text-green-600' : m.outcome === 'loss' ? 'text-red-600' : 'text-gray-500'
                    }`}>
                      {m.outcome === 'win' ? `${nameA} W` : m.outcome === 'loss' ? `${nameB} W` : 'Tie'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {commonMatchIds.length === 0 && (
          <div className="rounded-xl bg-white border border-gray-200 p-6 shadow-sm text-center">
            <p className="text-gray-500">No completed matches between these players yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function StatRow({
  label,
  valA,
  valB,
  lowerBetter = false,
}: {
  label: string
  valA: string | number | null | undefined
  valB: string | number | null | undefined
  lowerBetter?: boolean
}) {
  const a = valA != null ? Number(valA) : null
  const b = valB != null ? Number(valB) : null

  let highlightA = false
  let highlightB = false
  if (a != null && b != null && a !== b) {
    if (lowerBetter) {
      highlightA = a < b
      highlightB = b < a
    } else {
      highlightA = a > b
      highlightB = b > a
    }
  }

  return (
    <div className="flex items-center text-sm">
      <span className={`w-16 text-right font-bold ${highlightA ? 'text-golf-700' : 'text-gray-900'}`}>
        {valA ?? '-'}
      </span>
      <span className="flex-1 text-center text-xs text-gray-500">{label}</span>
      <span className={`w-16 text-left font-bold ${highlightB ? 'text-golf-700' : 'text-gray-900'}`}>
        {valB ?? '-'}
      </span>
    </div>
  )
}
