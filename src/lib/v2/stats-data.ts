import { createClient } from '@/lib/supabase/server'
import type { RoundV2, UserHoleStatsV2 } from './types'

export interface UserStatsData {
  userId: string
  userName: string
  rounds: RoundV2[]
  holeStatsByCourse: Record<string, UserHoleStatsV2[]>
  matchRecord: { wins: number; losses: number; ties: number }
  netEarnings: number | null
}

export async function getUserStatsData(userId: string): Promise<UserStatsData> {
  const supabase = await createClient()

  // Get player record
  const { data: player } = await supabase
    .from('players')
    .select('id, name, user_id')
    .eq('user_id', userId)
    .maybeSingle()

  const { data: profile } = await supabase
    .from('player_profiles')
    .select('display_name')
    .eq('user_id', userId)
    .maybeSingle()

  const userName = profile?.display_name ?? player?.name ?? 'Player'

  if (!player) {
    return { userId, userName, rounds: [], holeStatsByCourse: {}, matchRecord: { wins: 0, losses: 0, ties: 0 }, netEarnings: null }
  }

  // Get trip_players for this player
  const { data: tps } = await supabase
    .from('trip_players')
    .select('id, trip_id')
    .eq('player_id', player.id)

  if (!tps || tps.length === 0) {
    return { userId, userName, rounds: [], holeStatsByCourse: {}, matchRecord: { wins: 0, losses: 0, ties: 0 }, netEarnings: null }
  }

  const tpIds = tps.map(tp => tp.id)
  const tripIds = [...new Set(tps.map(tp => tp.trip_id))]
  const tpToTrip = new Map(tps.map(tp => [tp.id, tp.trip_id]))

  // Get round_stats
  const { data: stats } = await supabase
    .from('round_stats')
    .select('course_id, trip_player_id, gross_total, net_total, par_total, holes_played, computed_at, front_nine_gross, back_nine_gross, greens_in_regulation, fairways_hit, fairways_total, total_putts, eagles, birdies, pars, bogeys, double_bogeys, others')
    .in('trip_player_id', tpIds)

  // Get courses
  const courseIds = [...new Set((stats ?? []).map(s => s.course_id))]
  const [{ data: courses }, { data: trips }] = await Promise.all([
    supabase.from('courses').select('id, name, par, trip_id, latitude, longitude, round_date').in('id', courseIds.length > 0 ? courseIds : ['']),
    supabase.from('trips').select('id, name').in('id', tripIds),
  ])

  const courseMap = new Map((courses ?? []).map(c => [c.id, c]))
  const tripMap = new Map((trips ?? []).map(t => [t.id, t.name]))

  // Fetch holes early so we can compute holeCountByCourse before building rounds
  let holesByCourse = new Map<string, { id: string; course_id: string; hole_number: number; par: number; handicap_index: number | null }[]>()
  const holeCountByCourse = new Map<string, number>()
  if (courseIds.length > 0) {
    const { data: holes } = await supabase
      .from('holes')
      .select('id, course_id, hole_number, par, handicap_index')
      .in('course_id', courseIds)
      .order('hole_number')

    for (const h of holes ?? []) {
      const arr = holesByCourse.get(h.course_id) ?? []
      arr.push(h)
      holesByCourse.set(h.course_id, arr)
    }
    for (const [cid, cHoles] of holesByCourse) {
      holeCountByCourse.set(cid, cHoles.length)
    }
  }

  // Identify completed rounds (holes_played >= total holes on course)
  const completedKeys = new Set<string>()
  for (const s of stats ?? []) {
    const totalHoles = holeCountByCourse.get(s.course_id) ?? 18
    if ((s.holes_played ?? 0) >= totalHoles) {
      completedKeys.add(`${s.trip_player_id}::${s.course_id}`)
    }
  }

  // Build rounds list from round_stats
  const rounds: RoundV2[] = (stats ?? []).map(s => {
    const course = courseMap.get(s.course_id)
    const tripId = tpToTrip.get(s.trip_player_id) ?? null
    return {
      id: s.course_id, // roundId = courseId
      courseId: s.course_id,
      courseName: course?.name ?? 'Unknown',
      date: course?.round_date ?? s.computed_at?.split('T')[0] ?? '',
      userId,
      tripId,
      tripName: tripId ? (tripMap.get(tripId) ?? null) : null,
      isQuickRound: false,
      grossTotal: s.gross_total,
      netTotal: s.net_total,
      par: s.par_total ?? course?.par ?? 72,
      holesPlayed: s.holes_played ?? 18,
      totalHoles: holeCountByCourse.get(s.course_id) ?? 18,
      totalPutts: s.total_putts ?? null,
      latitude: course?.latitude ?? null,
      longitude: course?.longitude ?? null,
    }
  }).sort((a, b) => b.date.localeCompare(a.date))

  // Build hole stats by course from round_scores
  const holeStatsByCourse: Record<string, UserHoleStatsV2[]> = {}
  if (courseIds.length > 0) {
    // Get round_scores
    const { data: scores } = await supabase
      .from('round_scores')
      .select('course_id, hole_id, trip_player_id, gross_score, fairway_hit, gir, putts')
      .in('trip_player_id', tpIds)
      .in('course_id', courseIds)

    // Group scores by hole_id (only completed rounds)
    const scoresByHole = new Map<string, { gross_score: number; fairway_hit: boolean | null; gir: boolean | null; putts: number | null }[]>()
    for (const s of scores ?? []) {
      if (!completedKeys.has(`${s.trip_player_id}::${s.course_id}`)) continue
      const arr = scoresByHole.get(s.hole_id) ?? []
      arr.push(s)
      scoresByHole.set(s.hole_id, arr)
    }

    for (const courseId of courseIds) {
      const courseHoles = holesByCourse.get(courseId) ?? []
      if (courseHoles.length === 0) continue

      holeStatsByCourse[courseId] = courseHoles.map(h => {
        const hScores = scoresByHole.get(h.id) ?? []
        if (hScores.length === 0) {
          return {
            holeNumber: h.hole_number, par: h.par, handicapIndex: h.handicap_index ?? 0,
            avgGross: h.par, avgNet: h.par, bestGross: h.par,
            birdies: 0, pars: 0, bogeys: 0, doubles: 0, eagles: 0,
            avgPutts: null, fairwayPct: null, girPct: null,
          }
        }

        const grosses = hScores.map(s => s.gross_score)
        const avgGross = parseFloat((grosses.reduce((s, v) => s + v, 0) / grosses.length).toFixed(1))
        const bestGross = Math.min(...grosses)

        let eagles = 0, birdies = 0, pars = 0, bogeys = 0, doubles = 0
        for (const g of grosses) {
          const diff = g - h.par
          if (diff <= -2) eagles++
          else if (diff === -1) birdies++
          else if (diff === 0) pars++
          else if (diff === 1) bogeys++
          else doubles++
        }

        const fwHits = hScores.filter(s => s.fairway_hit !== null)
        const girHits = hScores.filter(s => s.gir !== null)
        const puttScores = hScores.filter(s => s.putts !== null)

        return {
          holeNumber: h.hole_number,
          par: h.par,
          handicapIndex: h.handicap_index ?? 0,
          avgGross,
          avgNet: avgGross, // simplified: no per-hole handicap strokes
          bestGross,
          eagles, birdies, pars, bogeys, doubles,
          avgPutts: puttScores.length > 0 ? parseFloat((puttScores.reduce((s, v) => s + (v.putts ?? 0), 0) / puttScores.length).toFixed(1)) : null,
          fairwayPct: fwHits.length > 0 ? Math.round((fwHits.filter(s => s.fairway_hit).length / fwHits.length) * 100) : null,
          girPct: girHits.length > 0 ? Math.round((girHits.filter(s => s.gir).length / girHits.length) * 100) : null,
        }
      })
    }
  }

  // Match record
  const { data: matchPlayers } = await supabase
    .from('match_players')
    .select('match_id, side, trip_player_id')
    .in('trip_player_id', tpIds)

  let wins = 0, losses = 0, ties = 0
  if (matchPlayers && matchPlayers.length > 0) {
    const matchIds = [...new Set(matchPlayers.map(mp => mp.match_id))]
    const { data: matchResults } = await supabase
      .from('matches')
      .select('id, winner_side, status')
      .in('id', matchIds)
      .eq('status', 'completed')

    const resultMap = new Map((matchResults ?? []).map(m => [m.id, m.winner_side]))
    for (const mp of matchPlayers) {
      const winner = resultMap.get(mp.match_id)
      if (winner === undefined) continue
      if (winner === 'tie') ties++
      else if (winner === mp.side) wins++
      else losses++
    }
  }

  // Net earnings from settlement_ledger
  let netEarnings: number | null = null
  const { data: ledger } = await supabase
    .from('settlement_ledger')
    .select('amount')
    .in('trip_player_id', tpIds)

  if (ledger && ledger.length > 0) {
    netEarnings = ledger.reduce((s: number, row: { amount: number }) => s + Number(row.amount), 0)
  }

  return { userId, userName, rounds, holeStatsByCourse, matchRecord: { wins, losses, ties }, netEarnings }
}

export async function getMyStatsData(): Promise<UserStatsData | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return getUserStatsData(user.id)
}
