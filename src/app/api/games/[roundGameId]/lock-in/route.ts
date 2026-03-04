import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * POST: Lock or unlock a hole for a player in a 20-Ball game.
 * Body: { trip_player_id, hole_id, action: 'lock' | 'unlock' }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roundGameId: string }> }
) {
  const { roundGameId } = await params

  // Auth check
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { trip_player_id, hole_id, action } = await request.json()

  if (!trip_player_id || !hole_id || !['lock', 'unlock'].includes(action)) {
    return NextResponse.json(
      { error: 'trip_player_id, hole_id, and action (lock|unlock) are required' },
      { status: 400 }
    )
  }

  const db = getServiceClient()

  // Fetch round game with config and players
  const { data: roundGame, error: rgError } = await db
    .from('round_games')
    .select(`
      id, config, status,
      game_format:game_formats(engine_key, default_config),
      round_game_players(id, trip_player_id, metadata)
    `)
    .eq('id', roundGameId)
    .single()

  if (rgError || !roundGame) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  }

  // Supabase returns joined relation as array
  const gameFormatRaw = roundGame.game_format
  const gameFormat = Array.isArray(gameFormatRaw) ? gameFormatRaw[0] : gameFormatRaw
  const engineKey = (gameFormat as { engine_key: string } | null)?.engine_key
  if (engineKey !== 'twenty_ball') {
    return NextResponse.json({ error: 'Lock-in is only for 20-Ball games' }, { status: 400 })
  }

  // Find the player in the game
  const rgPlayer = (roundGame.round_game_players as { id: string; trip_player_id: string; metadata: Record<string, unknown> }[])
    .find(p => p.trip_player_id === trip_player_id)

  if (!rgPlayer) {
    return NextResponse.json({ error: 'Player not in this game' }, { status: 400 })
  }

  // Get config
  const defaultConfig = (gameFormat as { default_config: Record<string, unknown> } | null)?.default_config || {}
  const mergedConfig = { ...defaultConfig, ...roundGame.config }
  const minHoles = (mergedConfig.min_holes_per_player as number) ?? 8
  const maxHoles = (mergedConfig.max_holes_per_player as number) ?? 12
  const totalLocks = (mergedConfig.total_locks as number) ?? 20

  // Current locked holes for this player
  const lockedHoles: string[] = (rgPlayer.metadata?.locked_holes as string[]) || []

  // Get all players' locked counts for total check
  const allPlayers = roundGame.round_game_players as { id: string; trip_player_id: string; metadata: Record<string, unknown> }[]
  const otherPlayerLocks = allPlayers
    .filter(p => p.trip_player_id !== trip_player_id)
    .reduce((sum, p) => sum + ((p.metadata?.locked_holes as string[]) || []).length, 0)

  if (action === 'lock') {
    if (lockedHoles.includes(hole_id)) {
      return NextResponse.json({ error: 'Hole already locked' }, { status: 400 })
    }
    if (lockedHoles.length >= maxHoles) {
      return NextResponse.json({ error: `Cannot lock more than ${maxHoles} holes` }, { status: 400 })
    }
    if (lockedHoles.length + otherPlayerLocks + 1 > totalLocks) {
      return NextResponse.json({ error: `Total locks would exceed ${totalLocks}` }, { status: 400 })
    }

    const newLocked = [...lockedHoles, hole_id]
    const { error: updateError } = await db
      .from('round_game_players')
      .update({ metadata: { ...rgPlayer.metadata, locked_holes: newLocked } })
      .eq('id', rgPlayer.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ locked_holes: newLocked })
  }

  // unlock
  if (!lockedHoles.includes(hole_id)) {
    return NextResponse.json({ error: 'Hole is not locked' }, { status: 400 })
  }

  // Check if unlocking would put player below min once all holes are played
  // (we allow unlocking freely; the min is only enforced at game completion)
  const newLocked = lockedHoles.filter(id => id !== hole_id)
  const { error: updateError } = await db
    .from('round_game_players')
    .update({ metadata: { ...rgPlayer.metadata, locked_holes: newLocked } })
    .eq('id', rgPlayer.id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ locked_holes: newLocked })
}
