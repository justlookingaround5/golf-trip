import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireTripRole } from '@/lib/auth'

/**
 * GET /api/trips/[tripId]/rounds/[courseId]/games
 *
 * List all games on a round (course). Includes format details and players.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; courseId: string }> }
) {
  const { tripId, courseId } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('round_games')
    .select(`
      *,
      game_format:game_formats(*),
      round_game_players(
        *,
        trip_player:trip_players(
          *,
          player:players(*)
        )
      )
    `)
    .eq('trip_id', tripId)
    .eq('course_id', courseId)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

/**
 * POST /api/trips/[tripId]/rounds/[courseId]/games
 *
 * Create a new game on a round. Requires owner/admin role.
 * Body: { game_format_id, config?, buy_in?, player_ids: string[], sides?: Record<string, string> }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; courseId: string }> }
) {
  const { tripId, courseId } = await params

  // Auth check
  const auth = await requireTripRole(tripId, ['owner', 'admin'])
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await request.json()
  const { game_format_id, config, buy_in, player_ids, sides } = body

  if (!game_format_id || !player_ids || !Array.isArray(player_ids)) {
    return NextResponse.json(
      { error: 'game_format_id and player_ids are required' },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  // Create the round game
  const { data: roundGame, error: gameError } = await supabase
    .from('round_games')
    .insert({
      course_id: courseId,
      trip_id: tripId,
      game_format_id,
      config: config || {},
      buy_in: buy_in || 0,
      status: 'setup',
      created_by: auth.userId,
    })
    .select()
    .single()

  if (gameError) {
    return NextResponse.json({ error: gameError.message }, { status: 500 })
  }

  // Add players
  const playerRecords = player_ids.map((pid: string) => ({
    round_game_id: roundGame.id,
    trip_player_id: pid,
    side: sides?.[pid] || null,
  }))

  const { error: playersError } = await supabase
    .from('round_game_players')
    .insert(playerRecords)

  if (playersError) {
    // Clean up the round game if players fail
    await supabase.from('round_games').delete().eq('id', roundGame.id)
    return NextResponse.json({ error: playersError.message }, { status: 500 })
  }

  return NextResponse.json(roundGame, { status: 201 })
}

/**
 * DELETE /api/trips/[tripId]/rounds/[courseId]/games?round_game_id=[id]
 *
 * Remove a game from a round. Cleans up players, results, and ledger entries.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; courseId: string }> }
) {
  const { tripId } = await params

  const auth = await requireTripRole(tripId, ['owner', 'admin'])
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const roundGameId = new URL(request.url).searchParams.get('round_game_id')
  if (!roundGameId) {
    return NextResponse.json({ error: 'round_game_id is required' }, { status: 400 })
  }

  const supabase = await createClient()

  // Clean up in order (FK constraints)
  await supabase.from('settlement_ledger').delete().eq('source_id', roundGameId).eq('source_type', 'game_result')
  await supabase.from('game_results').delete().eq('round_game_id', roundGameId)
  await supabase.from('round_game_players').delete().eq('round_game_id', roundGameId)

  const { error } = await supabase.from('round_games').delete().eq('id', roundGameId)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
