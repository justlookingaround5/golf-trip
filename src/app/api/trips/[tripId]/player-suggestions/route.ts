import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireTripRole } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params
  const q = request.nextUrl.searchParams.get('q')?.trim() || ''

  if (q.length < 2) {
    return NextResponse.json([])
  }

  const access = await requireTripRole(tripId, ['owner', 'admin'])
  if (!access) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createClient()

  // Get player IDs already on this trip (to exclude)
  const { data: currentPlayers } = await supabase
    .from('trip_players')
    .select('player_id')
    .eq('trip_id', tripId)

  const excludedIds = new Set((currentPlayers || []).map((tp: { player_id: string }) => tp.player_id))

  // Get player IDs from other trips
  const { data: otherTripPlayers } = await supabase
    .from('trip_players')
    .select('player_id')
    .neq('trip_id', tripId)

  const candidateIds = [
    ...new Set(
      (otherTripPlayers || [])
        .map((tp: { player_id: string }) => tp.player_id)
        .filter((id: string) => !excludedIds.has(id))
    ),
  ]

  if (candidateIds.length === 0) {
    return NextResponse.json([])
  }

  const { data: players, error } = await supabase
    .from('players')
    .select('id, name, email, handicap_index, user_id')
    .in('id', candidateIds)
    .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
    .limit(8)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(players || [])
}
