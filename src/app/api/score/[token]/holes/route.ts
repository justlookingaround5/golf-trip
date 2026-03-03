import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { detectScoringEvents } from '@/lib/activity'
import { getEngine } from '@/lib/games'
import { getStrokesPerHole } from '@/lib/handicap'
import type { GameEngineInput } from '@/lib/types'

// Service role client bypasses RLS — scorer is not a Supabase user
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface ScoreEntry {
  trip_player_id: string
  gross_score: number
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  // 1. Validate the scorer token
  const { data: match, error: matchError } = await getServiceClient()
    .from('matches')
    .select('id, status, course_id')
    .eq('scorer_token', token)
    .single()

  if (matchError || !match) {
    return NextResponse.json(
      { error: 'Invalid scorer token' },
      { status: 404 }
    )
  }

  // 2. Parse request body
  const body = await request.json()
  const { hole_id, scores } = body as {
    hole_id: string
    scores: ScoreEntry[]
  }

  if (!hole_id) {
    return NextResponse.json(
      { error: 'hole_id is required' },
      { status: 400 }
    )
  }

  if (!scores || !Array.isArray(scores) || scores.length === 0) {
    return NextResponse.json(
      { error: 'scores array is required' },
      { status: 400 }
    )
  }

  // Validate each score entry
  for (const entry of scores) {
    if (!entry.trip_player_id || typeof entry.gross_score !== 'number') {
      return NextResponse.json(
        { error: 'Each score must have trip_player_id and gross_score' },
        { status: 400 }
      )
    }
    if (entry.gross_score < 1 || entry.gross_score > 20) {
      return NextResponse.json(
        { error: 'gross_score must be between 1 and 20' },
        { status: 400 }
      )
    }
  }

  // 3. Upsert scores for each player on this hole
  const upsertData = scores.map((entry: ScoreEntry) => ({
    match_id: match.id,
    trip_player_id: entry.trip_player_id,
    hole_id,
    gross_score: entry.gross_score,
    updated_at: new Date().toISOString(),
  }))

  const { error: upsertError } = await getServiceClient()
    .from('scores')
    .upsert(upsertData, {
      onConflict: 'match_id,trip_player_id,hole_id',
    })

  if (upsertError) {
    return NextResponse.json(
      { error: upsertError.message },
      { status: 500 }
    )
  }

  // 4. If match is pending, update to in_progress
  if (match.status === 'pending') {
    await getServiceClient()
      .from('matches')
      .update({ status: 'in_progress' })
      .eq('id', match.id)
  }

  // 5. Return updated scores for this match
  const { data: updatedScores, error: fetchError } = await getServiceClient()
    .from('scores')
    .select('*')
    .eq('match_id', match.id)

  if (fetchError) {
    return NextResponse.json(
      { error: 'Scores saved but failed to fetch updated scores' },
      { status: 500 }
    )
  }

  // 6. Fire-and-forget: activity feed events + game engine recomputation
  processScoreEvents(match.id, match.course_id, hole_id, scores).catch(
    (err) => console.error('Score event processing error:', err)
  )

  return NextResponse.json({
    scores: updatedScores || [],
    matchStatus: match.status === 'pending' ? 'in_progress' : match.status,
  })
}

/**
 * Non-blocking post-score processing:
 * 1. Detect birdie/eagle events for the activity feed
 * 2. Recompute any active round games for this course
 */
async function processScoreEvents(
  matchId: string,
  courseId: string,
  holeId: string,
  scoreEntries: ScoreEntry[]
) {
  const db = getServiceClient()

  // Get hole info (par, number) and course's trip_id
  const [holeRes, courseRes] = await Promise.all([
    db.from('holes').select('id, hole_number, par, handicap_index').eq('id', holeId).single(),
    db.from('courses').select('id, trip_id').eq('id', courseId).single(),
  ])

  if (!holeRes.data || !courseRes.data) return
  const hole = holeRes.data
  const tripId = courseRes.data.trip_id

  // Get player names and handicap strokes for scoring event detection
  const tripPlayerIds = scoreEntries.map((s) => s.trip_player_id)
  const [playersRes, handicapsRes] = await Promise.all([
    db
      .from('trip_players')
      .select('id, player:players(name)')
      .in('id', tripPlayerIds),
    db
      .from('player_course_handicaps')
      .select('trip_player_id, handicap_strokes')
      .eq('course_id', courseId)
      .in('trip_player_id', tripPlayerIds),
  ])

  // Build lookup maps
  const playerNames = new Map<string, string>()
  for (const tp of playersRes.data || []) {
    const playerArr = tp.player as unknown as { name: string }[] | null
    const name = playerArr?.[0]?.name || 'Unknown'
    playerNames.set(tp.id, name)
  }

  const handicapStrokes = new Map<string, number>()
  for (const ch of handicapsRes.data || []) {
    handicapStrokes.set(ch.trip_player_id, ch.handicap_strokes)
  }

  // Get all holes for stroke allocation
  const { data: allHoles } = await db
    .from('holes')
    .select('hole_number, handicap_index')
    .eq('course_id', courseId)
    .order('hole_number')

  // Detect birdie/eagle for each score entry
  for (const entry of scoreEntries) {
    const hcStrokes = handicapStrokes.get(entry.trip_player_id) ?? 0
    const strokesMap = getStrokesPerHole(hcStrokes, allHoles || [])
    const strokesOnHole = strokesMap.get(hole.hole_number) ?? 0
    const netScore = entry.gross_score - strokesOnHole

    await detectScoringEvents({
      trip_id: tripId,
      trip_player_id: entry.trip_player_id,
      player_name: playerNames.get(entry.trip_player_id) || 'Unknown',
      course_id: courseId,
      hole_number: hole.hole_number,
      hole_id: holeId,
      gross_score: entry.gross_score,
      par: hole.par,
      net_score: netScore,
      client: db,
    })
  }

  // Recompute active round games for this course
  await recomputeRoundGames(db, courseId)
}

/**
 * Find all non-cancelled round games for a course and recompute via engine.
 */
async function recomputeRoundGames(
  db: ReturnType<typeof getServiceClient>,
  courseId: string
) {
  const { data: roundGames } = await db
    .from('round_games')
    .select(`
      *,
      game_format:game_formats(*),
      round_game_players(*, trip_player:trip_players(*))
    `)
    .eq('course_id', courseId)
    .neq('status', 'cancelled')

  if (!roundGames || roundGames.length === 0) return

  // Fetch holes once for all games
  const { data: holes } = await db
    .from('holes')
    .select('*')
    .eq('course_id', courseId)
    .order('hole_number')

  if (!holes || holes.length === 0) return
  const holeIds = holes.map((h: { id: string }) => h.id)

  for (const rg of roundGames) {
    const engineKey = rg.game_format?.engine_key
    if (!engineKey) continue

    const engine = getEngine(engineKey)
    if (!engine) continue

    const playerIds = rg.round_game_players.map(
      (rgp: { trip_player_id: string }) => rgp.trip_player_id
    )
    if (playerIds.length === 0) continue

    // Fetch scores and handicaps for this game's players
    const [scoresRes, handicapsRes] = await Promise.all([
      db.from('scores').select('*').in('trip_player_id', playerIds).in('hole_id', holeIds),
      db.from('player_course_handicaps').select('*').in('trip_player_id', playerIds).eq('course_id', courseId),
    ])

    // Build player strokes maps
    const playerStrokes = new Map<string, Map<number, number>>()
    for (const ch of handicapsRes.data || []) {
      playerStrokes.set(ch.trip_player_id, getStrokesPerHole(ch.handicap_strokes, holes))
    }

    // Build engine input
    const mergedConfig = {
      ...rg.game_format.default_config,
      ...rg.config,
    }

    const engineInput: GameEngineInput = {
      scores: (scoresRes.data || []).map((s: { trip_player_id: string; hole_id: string; gross_score: number }) => ({
        trip_player_id: s.trip_player_id,
        hole_id: s.hole_id,
        gross_score: s.gross_score,
      })),
      players: rg.round_game_players.map(
        (rgp: { trip_player_id: string; side: string | null; metadata: Record<string, unknown> }) => ({
          trip_player_id: rgp.trip_player_id,
          side: rgp.side,
          metadata: rgp.metadata || {},
        })
      ),
      holes: holes.map((h: { id: string; hole_number: number; par: number; handicap_index: number }) => ({
        id: h.id,
        hole_number: h.hole_number,
        par: h.par,
        handicap_index: h.handicap_index,
      })),
      playerStrokes,
      config: mergedConfig,
    }

    // Run engine
    const result = engine.compute(engineInput)

    // Upsert results
    const resultRecords = result.players.map((pr) => ({
      round_game_id: rg.id,
      trip_player_id: pr.trip_player_id,
      position: pr.position,
      points: pr.points,
      money: pr.money,
      details: pr.details,
      computed_at: new Date().toISOString(),
    }))

    await db
      .from('game_results')
      .upsert(resultRecords, { onConflict: 'round_game_id,trip_player_id' })

    // Update game status to active if it was setup
    if (rg.status === 'setup') {
      await db.from('round_games').update({ status: 'active' }).eq('id', rg.id)
    }
  }
}
