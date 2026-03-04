import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getEngine } from '@/lib/games'
import { getStrokesPerHole } from '@/lib/handicap'
import type { GameEngineInput } from '@/lib/types'

// Service role client bypasses RLS for writing game results
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * POST /api/games/[roundGameId]/compute
 *
 * Fetches all relevant data, runs the game engine, and writes results.
 * Idempotent — can be called multiple times (overwrites previous results).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roundGameId: string }> }
) {
  const { roundGameId } = await params
  const supabase = getServiceClient()

  // 1. Fetch the round game with format and players
  const { data: roundGame, error: gameError } = await supabase
    .from('round_games')
    .select(`
      *,
      game_format:game_formats(*),
      round_game_players(
        *,
        trip_player:trip_players(*)
      )
    `)
    .eq('id', roundGameId)
    .single()

  if (gameError || !roundGame) {
    return NextResponse.json({ error: 'Round game not found' }, { status: 404 })
  }

  const engineKey = roundGame.game_format?.engine_key
  if (!engineKey) {
    return NextResponse.json({ error: 'No engine key found for this game format' }, { status: 400 })
  }

  const engine = getEngine(engineKey)
  if (!engine) {
    return NextResponse.json({ error: `Engine "${engineKey}" not found` }, { status: 400 })
  }

  // 2. Fetch holes for this course
  const { data: holes, error: holesError } = await supabase
    .from('holes')
    .select('*')
    .eq('course_id', roundGame.course_id)
    .order('hole_number')

  if (holesError || !holes) {
    return NextResponse.json({ error: 'Failed to fetch holes' }, { status: 500 })
  }

  // 3. Fetch all scores for players in this game on this course
  const playerIds = roundGame.round_game_players.map(
    (rgp: { trip_player_id: string }) => rgp.trip_player_id
  )
  const holeIds = holes.map((h: { id: string }) => h.id)

  const { data: scores, error: scoresError } = await supabase
    .from('scores')
    .select('*')
    .in('trip_player_id', playerIds)
    .in('hole_id', holeIds)

  if (scoresError) {
    return NextResponse.json({ error: 'Failed to fetch scores' }, { status: 500 })
  }

  // 4. Fetch course handicaps for these players
  const { data: courseHandicaps } = await supabase
    .from('player_course_handicaps')
    .select('*')
    .in('trip_player_id', playerIds)
    .eq('course_id', roundGame.course_id)

  // 5. Build player strokes maps
  const playerStrokes = new Map<string, Map<number, number>>()
  for (const ch of (courseHandicaps || [])) {
    const strokesMap = getStrokesPerHole(ch.handicap_strokes, holes)
    playerStrokes.set(ch.trip_player_id, strokesMap)
  }

  // 6. Build engine input
  const mergedConfig = {
    ...roundGame.game_format.default_config,
    ...roundGame.config,
  }

  const engineInput: GameEngineInput = {
    scores: (scores || []).map((s: { trip_player_id: string; hole_id: string; gross_score: number }) => ({
      trip_player_id: s.trip_player_id,
      hole_id: s.hole_id,
      gross_score: s.gross_score,
    })),
    players: roundGame.round_game_players.map(
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

  // 7. Run engine
  const result = engine.compute(engineInput)

  // 8. Write results (upsert — idempotent)
  const resultRecords = result.players.map((pr: { trip_player_id: string; position: number; points: number; money: number; details: Record<string, unknown> }) => ({
    round_game_id: roundGameId,
    trip_player_id: pr.trip_player_id,
    position: pr.position,
    points: pr.points,
    money: pr.money,
    details: pr.details,
    computed_at: new Date().toISOString(),
  }))

  const { error: upsertError } = await supabase
    .from('game_results')
    .upsert(resultRecords, { onConflict: 'round_game_id,trip_player_id' })

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  // 8b. Write settlement_ledger entries (idempotent — delete + re-insert)
  const formatName = roundGame.game_format?.name || engineKey
  const tripId = roundGame.trip_id

  // Delete previous entries for this game
  await supabase
    .from('settlement_ledger')
    .delete()
    .eq('source_type', 'game_result')
    .eq('source_id', roundGameId)

  // Insert new entries for each player with a non-zero money result
  const ledgerEntries = result.players
    .filter((pr: { money: number }) => Math.abs(pr.money) > 0.005)
    .map((pr: { trip_player_id: string; money: number }) => ({
      trip_id: tripId,
      trip_player_id: pr.trip_player_id,
      source_type: 'game_result' as const,
      source_id: roundGameId,
      amount: pr.money,
      description: formatName,
    }))

  if (ledgerEntries.length > 0) {
    const { error: ledgerError } = await supabase
      .from('settlement_ledger')
      .insert(ledgerEntries)

    if (ledgerError) {
      console.error('Failed to write settlement ledger:', ledgerError.message)
      // Non-fatal — game results are saved, ledger is secondary
    }
  }

  // 9. Update round game status (only if still in setup — don't revert finalized games)
  if (roundGame.status === 'setup') {
    await supabase
      .from('round_games')
      .update({ status: 'active' })
      .eq('id', roundGameId)
  }

  return NextResponse.json({
    summary: result.summary,
    players: result.players,
    holes: result.holes,
  })
}
