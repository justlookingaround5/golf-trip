import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/join/code?code=XXXX
 *
 * Look up a trip by its 4-digit join code. Public endpoint.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')?.toUpperCase().trim()

  if (!code || code.length !== 4) {
    return NextResponse.json({ error: 'Invalid join code' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: trip, error } = await supabase
    .from('trips')
    .select('id, name, year, location, status')
    .eq('join_code', code)
    .single()

  if (error || !trip) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
  }

  return NextResponse.json({ trip })
}

/**
 * POST /api/join/code
 *
 * Join a trip using its join code. Requires authentication.
 * Body: { code: string }
 *
 * Creates trip_players + trip_members records for the authenticated user.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Check auth
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await request.json()
  const code = (body.code as string)?.toUpperCase().trim()

  if (!code || code.length !== 4) {
    return NextResponse.json({ error: 'Invalid join code' }, { status: 400 })
  }

  // Look up trip
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id, name')
    .eq('join_code', code)
    .single()

  if (tripError || !trip) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
  }

  // Check if user is already a member
  const { data: existingMember } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', trip.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existingMember) {
    return NextResponse.json({
      message: 'Already a member',
      trip_id: trip.id,
    })
  }

  // Get or create player record for this user
  const { data: profile } = await supabase
    .from('player_profiles')
    .select('display_name, handicap_index')
    .eq('user_id', user.id)
    .maybeSingle()

  const playerName = profile?.display_name || user.email?.split('@')[0] || 'Player'

  // Check if player with this user_id exists
  let playerId: string

  const { data: existingPlayer } = await supabase
    .from('players')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existingPlayer) {
    playerId = existingPlayer.id
  } else {
    const { data: newPlayer, error: playerError } = await supabase
      .from('players')
      .insert({
        name: playerName,
        email: user.email,
        handicap_index: profile?.handicap_index ?? null,
        user_id: user.id,
      })
      .select('id')
      .single()

    if (playerError || !newPlayer) {
      return NextResponse.json({ error: 'Failed to create player' }, { status: 500 })
    }
    playerId = newPlayer.id
  }

  // Check if trip_player already exists
  const { data: existingTp } = await supabase
    .from('trip_players')
    .select('id')
    .eq('trip_id', trip.id)
    .eq('player_id', playerId)
    .maybeSingle()

  if (!existingTp) {
    const { error: tpError } = await supabase
      .from('trip_players')
      .insert({ trip_id: trip.id, player_id: playerId })

    if (tpError) {
      return NextResponse.json({ error: 'Failed to join trip' }, { status: 500 })
    }
  }

  // Create trip_members record (upsert to handle race conditions)
  const { error: memberError } = await supabase
    .from('trip_members')
    .upsert(
      { trip_id: trip.id, user_id: user.id, role: 'player' },
      { onConflict: 'trip_id,user_id' }
    )

  if (memberError) {
    return NextResponse.json({ error: 'Failed to create membership' }, { status: 500 })
  }

  return NextResponse.json({
    message: 'Joined successfully',
    trip_id: trip.id,
  })
}
