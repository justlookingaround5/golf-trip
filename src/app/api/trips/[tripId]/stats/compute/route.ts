import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStrokesPerHole } from '@/lib/handicap'
import { computeRoundStats, computeTripStats, computeAwards } from '@/lib/stats'

/**
 * POST /api/trips/[tripId]/stats/compute
 *
 * Recomputes round_stats, trip_stats, and trip_awards for all players
 * in the trip. Upserts results idempotently.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params
  const supabase = await createClient()

  // Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // 1. Fetch trip players with player names
  const { data: tripPlayers, error: tpError } = await supabase
    .from('trip_players')
    .select('id, player:players(id, name)')
    .eq('trip_id', tripId)

  if (tpError || !tripPlayers || tripPlayers.length === 0) {
    return NextResponse.json(
      { error: tpError?.message || 'No players found' },
      { status: tpError ? 500 : 404 }
    )
  }

  // 2. Fetch all courses for this trip with holes
  const { data: courses, error: coursesError } = await supabase
    .from('courses')
    .select('id, par, holes(id, hole_number, par, handicap_index)')
    .eq('trip_id', tripId)
    .order('round_number')

  if (coursesError || !courses || courses.length === 0) {
    return NextResponse.json(
      { error: coursesError?.message || 'No courses found' },
      { status: coursesError ? 500 : 404 }
    )
  }

  const tripPlayerIds = tripPlayers.map(tp => tp.id)
  const allHoleIds = courses.flatMap(c => (c.holes || []).map(h => h.id))

  // 3. Fetch all scores for these players across all holes
  const { data: allScores, error: scoresError } = await supabase
    .from('round_scores')
    .select('trip_player_id, hole_id, gross_score')
    .in('trip_player_id', tripPlayerIds)
    .in('hole_id', allHoleIds)

  if (scoresError) {
    return NextResponse.json({ error: scoresError.message }, { status: 500 })
  }

  // 4. Fetch course handicaps for all players
  const { data: courseHandicaps } = await supabase
    .from('player_course_handicaps')
    .select('trip_player_id, course_id, handicap_strokes')
    .in('trip_player_id', tripPlayerIds)

  // Also check player_round_tees for per-round tee-based handicaps
  const { data: roundTees } = await supabase
    .from('player_round_tees')
    .select('trip_player_id, course_id, course_handicap')
    .in('trip_player_id', tripPlayerIds)

  // 5. Compute round stats for each player on each course
  const allRoundStats: Record<string, ReturnType<typeof computeRoundStats>[]> = {}

  for (const tp of tripPlayers) {
    allRoundStats[tp.id] = []

    for (const course of courses) {
      const holes = (course.holes || []).map(h => ({
        id: h.id,
        hole_number: h.hole_number,
        par: h.par,
        handicap_index: h.handicap_index,
        course_id: course.id,
      }))

      // Get handicap strokes for this player on this course
      // Prefer player_round_tees (per-round tee), fallback to player_course_handicaps
      const roundTee = (roundTees || []).find(
        rt => rt.trip_player_id === tp.id && rt.course_id === course.id
      )
      const courseHcp = (courseHandicaps || []).find(
        ch => ch.trip_player_id === tp.id && ch.course_id === course.id
      )
      const handicapStrokes = roundTee?.course_handicap ?? courseHcp?.handicap_strokes ?? 0
      const strokesMap = getStrokesPerHole(handicapStrokes, holes)

      const roundStat = computeRoundStats(
        course.id,
        tp.id,
        allScores || [],
        holes,
        strokesMap,
      )

      allRoundStats[tp.id].push(roundStat)
    }
  }

  // 6. Upsert round_stats
  const roundStatsRecords = Object.values(allRoundStats)
    .flat()
    .filter(rs => rs.holes_played > 0)
    .map(rs => ({
      ...rs,
      computed_at: new Date().toISOString(),
    }))

  if (roundStatsRecords.length > 0) {
    const { error: rsError } = await supabase
      .from('round_stats')
      .upsert(roundStatsRecords, { onConflict: 'course_id,trip_player_id' })

    if (rsError) {
      return NextResponse.json({ error: `round_stats upsert: ${rsError.message}` }, { status: 500 })
    }
  }

  // 7. Compute and upsert trip_stats
  const tripStatsRecords = tripPlayers.map(tp => {
    const tripStat = computeTripStats(tripId, tp.id, allRoundStats[tp.id])
    return {
      ...tripStat,
      computed_at: new Date().toISOString(),
    }
  }).filter(ts => ts.total_holes > 0)

  if (tripStatsRecords.length > 0) {
    const { error: tsError } = await supabase
      .from('trip_stats')
      .upsert(tripStatsRecords, { onConflict: 'trip_id,trip_player_id' })

    if (tsError) {
      return NextResponse.json({ error: `trip_stats upsert: ${tsError.message}` }, { status: 500 })
    }
  }

  // 8. Compute and upsert awards
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

  if (awards.length > 0) {
    // Delete existing awards for this trip (replace all)
    await supabase
      .from('trip_awards')
      .delete()
      .eq('trip_id', tripId)

    const awardRecords = awards.map(a => ({
      trip_id: tripId,
      ...a,
      computed_at: new Date().toISOString(),
    }))

    const { error: awError } = await supabase
      .from('trip_awards')
      .insert(awardRecords)

    if (awError) {
      return NextResponse.json({ error: `trip_awards insert: ${awError.message}` }, { status: 500 })
    }
  }

  return NextResponse.json({
    round_stats_count: roundStatsRecords.length,
    trip_stats_count: tripStatsRecords.length,
    awards_count: awards.length,
    awards: awards.map(a => ({ award_name: a.award_name, trip_player_id: a.trip_player_id, value: a.value })),
  })
}
