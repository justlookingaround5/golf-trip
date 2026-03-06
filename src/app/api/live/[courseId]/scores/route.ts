import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { processScoreEvents } from '@/lib/score-processing'
import { computeRoundStats } from '@/lib/compute-round-stats'
import { computeRoundStats as computeRoundStatsLegacy, computeTripStats, computeAwards } from '@/lib/stats'
import { getStrokesPerHole } from '@/lib/handicap'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface ScoreEntry {
  trip_player_id: string
  gross_score: number
  fairway_hit?: boolean | null
  gir?: boolean | null
  putts?: number | null
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params

  // Auth check
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { hole_id, scores } = body as {
    hole_id: string
    scores: ScoreEntry[]
  }

  if (!hole_id) {
    return NextResponse.json({ error: 'hole_id is required' }, { status: 400 })
  }
  if (!scores || !Array.isArray(scores) || scores.length === 0) {
    return NextResponse.json({ error: 'scores array is required' }, { status: 400 })
  }

  for (const entry of scores) {
    if (!entry.trip_player_id || typeof entry.gross_score !== 'number') {
      return NextResponse.json({ error: 'Each score must have trip_player_id and gross_score' }, { status: 400 })
    }
    if (entry.gross_score < 1 || entry.gross_score > 20) {
      return NextResponse.json({ error: 'gross_score must be between 1 and 20' }, { status: 400 })
    }
  }

  const db = getServiceClient()

  // 1. Upsert into round_scores (including optional stats)
  const roundScoreData = scores.map((entry) => ({
    course_id: courseId,
    trip_player_id: entry.trip_player_id,
    hole_id,
    gross_score: entry.gross_score,
    entered_by: user.id,
    updated_at: new Date().toISOString(),
    ...(entry.fairway_hit !== undefined && entry.fairway_hit !== null ? { fairway_hit: entry.fairway_hit } : {}),
    ...(entry.gir !== undefined && entry.gir !== null ? { gir: entry.gir } : {}),
    ...(entry.putts !== undefined && entry.putts !== null ? { putts: entry.putts } : {}),
  }))

  const { error: roundScoreError } = await db
    .from('round_scores')
    .upsert(roundScoreData, { onConflict: 'course_id,trip_player_id,hole_id' })

  if (roundScoreError) {
    return NextResponse.json({ error: roundScoreError.message }, { status: 500 })
  }

  // 2. Sync to scores table via synthetic round match
  const syntheticToken = `live_round_${courseId}`
  let { data: match } = await db
    .from('matches')
    .select('id, status')
    .eq('scorer_token', syntheticToken)
    .single()

  if (!match) {
    // Get course info for match creation
    const { data: course } = await db
      .from('courses')
      .select('id, trip_id')
      .eq('id', courseId)
      .single()

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Create synthetic match
    const { data: newMatch, error: matchError } = await db
      .from('matches')
      .insert({
        course_id: courseId,
        format: '1v1_stroke',
        point_value: 0,
        scorer_token: syntheticToken,
        status: 'in_progress',
      })
      .select('id, status')
      .single()

    if (matchError || !newMatch) {
      return NextResponse.json({ error: 'Failed to create round match' }, { status: 500 })
    }
    match = newMatch

    // Add all trip players to match
    const { data: tripPlayers } = await db
      .from('trip_players')
      .select('id')
      .eq('trip_id', course.trip_id)

    if (tripPlayers && tripPlayers.length > 0) {
      const matchPlayers = tripPlayers.map((tp, i) => ({
        match_id: newMatch.id,
        trip_player_id: tp.id,
        side: i % 2 === 0 ? 'team_a' : 'team_b',
      }))

      await db.from('match_players').insert(matchPlayers)
    }
  }

  // Upsert into scores table
  const scoreData = scores.map((entry) => ({
    match_id: match.id,
    trip_player_id: entry.trip_player_id,
    hole_id,
    gross_score: entry.gross_score,
    updated_at: new Date().toISOString(),
  }))

  const { error: scoreError } = await db
    .from('scores')
    .upsert(scoreData, { onConflict: 'match_id,trip_player_id,hole_id' })

  if (scoreError) {
    console.error('Failed to sync to scores table:', scoreError.message)
  }

  // 3. Return updated round_scores
  const { data: updatedScores } = await db
    .from('round_scores')
    .select('*')
    .eq('course_id', courseId)

  // 4. Fire-and-forget: process events + recompute games
  processScoreEvents(db, courseId, hole_id, scores).catch(
    (err) => console.error('Live score event processing error:', err)
  )

  // 5. Fire-and-forget: recompute round stats, then trip stats + awards
  recomputeRoundStats(db, courseId).then(() =>
    recomputeTripStats(db, courseId)
  ).catch(
    (err) => console.error('Stats recompute error:', err)
  )

  return NextResponse.json({
    roundScores: updatedScores || [],
  })
}

// ---------------------------------------------------------------------------
// Recompute round stats for all players on a course
// ---------------------------------------------------------------------------

async function recomputeRoundStats(db: SupabaseClient, courseId: string) {
  // 1. Fetch all round_scores for this course
  const { data: allScores, error: scoresErr } = await db
    .from('round_scores')
    .select('trip_player_id, hole_id, gross_score, fairway_hit, gir, putts')
    .eq('course_id', courseId)

  if (scoresErr || !allScores) {
    console.error('recomputeRoundStats: failed to fetch scores', scoresErr?.message)
    return
  }

  // 2. Fetch all holes for this course
  const { data: holes, error: holesErr } = await db
    .from('holes')
    .select('id, hole_number, par, handicap_index')
    .eq('course_id', courseId)

  if (holesErr || !holes || holes.length === 0) {
    console.error('recomputeRoundStats: failed to fetch holes', holesErr?.message)
    return
  }

  // 3. Fetch course to get trip_id
  const { data: course } = await db
    .from('courses')
    .select('trip_id')
    .eq('id', courseId)
    .single()

  if (!course) return

  // 4. Fetch player_course_handicaps for this course
  const { data: handicaps } = await db
    .from('player_course_handicaps')
    .select('trip_player_id, handicap_strokes')
    .eq('course_id', courseId)

  // Also check player_round_tees for per-round tee-based handicaps
  const { data: roundTees } = await db
    .from('player_round_tees')
    .select('trip_player_id, course_handicap')
    .eq('course_id', courseId)

  // 5. Group scores by trip_player_id
  const scoresByPlayer = new Map<string, typeof allScores>()
  for (const score of allScores) {
    const existing = scoresByPlayer.get(score.trip_player_id) || []
    existing.push(score)
    scoresByPlayer.set(score.trip_player_id, existing)
  }

  // 6. For each player, compute and upsert round stats
  const now = new Date().toISOString()

  for (const [tripPlayerId, playerScores] of scoresByPlayer) {
    // Prefer player_round_tees, fallback to player_course_handicaps
    const roundTee = (roundTees || []).find(rt => rt.trip_player_id === tripPlayerId)
    const courseHcp = (handicaps || []).find(h => h.trip_player_id === tripPlayerId)
    const handicapStrokes = roundTee?.course_handicap ?? courseHcp?.handicap_strokes ?? 0

    const stats = computeRoundStats(
      playerScores.map(s => ({
        hole_id: s.hole_id,
        gross_score: s.gross_score,
        fairway_hit: s.fairway_hit,
        gir: s.gir,
        putts: s.putts,
      })),
      holes,
      handicapStrokes,
    )

    await db
      .from('round_stats')
      .upsert(
        {
          course_id: courseId,
          trip_player_id: tripPlayerId,
          ...stats,
          computed_at: now,
        },
        { onConflict: 'course_id,trip_player_id' },
      )
  }
}

// ---------------------------------------------------------------------------
// Recompute trip stats + awards after round stats are fresh
// ---------------------------------------------------------------------------

async function recomputeTripStats(db: SupabaseClient, courseId: string) {
  // Get trip_id from course
  const { data: course } = await db
    .from('courses')
    .select('trip_id')
    .eq('id', courseId)
    .single()

  if (!course) return

  const tripId = course.trip_id

  // Get all courses for this trip with holes
  const { data: courses } = await db
    .from('courses')
    .select('id, par, holes(id, hole_number, par, handicap_index)')
    .eq('trip_id', tripId)
    .order('round_number')

  if (!courses || courses.length === 0) return

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
    .from('scores')
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

  // Compute round stats for each player on each course (using legacy function that works with scores table)
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
  if (awards.length > 0) {
    await db.from('trip_awards').delete().eq('trip_id', tripId)
    await db.from('trip_awards').insert(
      awards.map(a => ({ trip_id: tripId, ...a, computed_at: now }))
    )
  }
}
