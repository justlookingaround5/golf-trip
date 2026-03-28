import { SupabaseClient } from '@supabase/supabase-js'
import { computeRoundStats as computeRoundStatsLegacy, computeTripStats, computeAwards } from '@/lib/stats'
import { getStrokesPerHole } from '@/lib/handicap'

export async function recomputeTripStatsAndAwards(db: SupabaseClient, tripId: string): Promise<void> {
  // Get all courses for this trip with holes
  const { data: courses } = await db
    .from('courses')
    .select('id, par, holes(id, hole_number, par, handicap_index)')
    .eq('trip_id', tripId)
    .order('round_number')

  if (!courses || courses.length === 0) {
    // No courses left — clear trip_stats and trip_awards
    await db.from('trip_stats').delete().eq('trip_id', tripId)
    await db.from('trip_awards').delete().eq('trip_id', tripId)
    return
  }

  // Get trip players
  const { data: tripPlayers } = await db
    .from('trip_players')
    .select('id, player:players(id, name)')
    .eq('trip_id', tripId)

  if (!tripPlayers || tripPlayers.length === 0) return

  const tripPlayerIds = tripPlayers.map(tp => tp.id)
  const allHoleIds = courses.flatMap(c => (c.holes || []).map((h: { id: string }) => h.id))

  // Get all scores
  const { data: allScores } = await db
    .from('round_scores')
    .select('trip_player_id, hole_id, gross_score')
    .in('trip_player_id', tripPlayerIds)
    .in('hole_id', allHoleIds)

  // Get handicaps
  const { data: courseHandicaps } = await db
    .from('player_course_handicaps')
    .select('trip_player_id, course_id, handicap_strokes')
    .in('trip_player_id', tripPlayerIds)

  const { data: roundTees } = await db
    .from('player_round_tees')
    .select('trip_player_id, course_id, course_handicap')
    .in('trip_player_id', tripPlayerIds)

  // Compute round stats for each player on each course
  const allRoundStats: Record<string, ReturnType<typeof computeRoundStatsLegacy>[]> = {}

  for (const tp of tripPlayers) {
    allRoundStats[tp.id] = []
    for (const c of courses) {
      const holes = (c.holes || []).map((h: { id: string; hole_number: number; par: number; handicap_index: number }) => ({
        id: h.id, hole_number: h.hole_number, par: h.par, handicap_index: h.handicap_index, course_id: c.id,
      }))
      const roundTee = (roundTees || []).find(rt => rt.trip_player_id === tp.id && rt.course_id === c.id)
      const courseHcp = (courseHandicaps || []).find(ch => ch.trip_player_id === tp.id && ch.course_id === c.id)
      const handicapStrokes = roundTee?.course_handicap ?? courseHcp?.handicap_strokes ?? 0
      const strokesMap = getStrokesPerHole(handicapStrokes, holes)

      allRoundStats[tp.id].push(
        computeRoundStatsLegacy(c.id, tp.id, allScores || [], holes, strokesMap)
      )
    }
  }

  // Upsert trip_stats
  const now = new Date().toISOString()
  const tripStatsRecords = tripPlayers
    .map(tp => ({ ...computeTripStats(tripId, tp.id, allRoundStats[tp.id]), computed_at: now }))
    .filter(ts => ts.total_holes > 0)

  if (tripStatsRecords.length > 0) {
    await db.from('trip_stats').upsert(tripStatsRecords, { onConflict: 'trip_id,trip_player_id' })
  } else {
    // No stats remain — clean up
    await db.from('trip_stats').delete().eq('trip_id', tripId)
  }

  // Compute and replace awards
  const awardInputs = tripPlayers.map(tp => {
    const playerArr = tp.player as unknown as { id: string; name: string }[] | null
    const player = playerArr?.[0] ?? null
    return {
      trip_player_id: tp.id,
      player_name: player?.name ?? 'Unknown',
      trip_stats: computeTripStats(tripId, tp.id, allRoundStats[tp.id]),
      round_stats: allRoundStats[tp.id],
    }
  })

  const awards = computeAwards(tripId, awardInputs)
  await db.from('trip_awards').delete().eq('trip_id', tripId)
  if (awards.length > 0) {
    await db.from('trip_awards').insert(
      awards.map(a => ({ trip_id: tripId, ...a, computed_at: now }))
    )
  }
}
