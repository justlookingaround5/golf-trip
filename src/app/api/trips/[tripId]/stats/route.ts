import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/trips/[tripId]/stats
 *
 * Returns round_stats, trip_stats, and trip_awards for all players in the trip.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params
  const supabase = await createClient()

  // Fetch all trip players
  const { data: tripPlayers, error: tpError } = await supabase
    .from('trip_players')
    .select('id, player:players(id, name)')
    .eq('trip_id', tripId)

  if (tpError) {
    return NextResponse.json({ error: tpError.message }, { status: 500 })
  }

  const tripPlayerIds = (tripPlayers || []).map(tp => tp.id)

  if (tripPlayerIds.length === 0) {
    return NextResponse.json({ round_stats: [], trip_stats: [], awards: [] })
  }

  // Fetch all stats in parallel
  const [roundStatsRes, tripStatsRes, awardsRes] = await Promise.all([
    supabase
      .from('round_stats')
      .select('*')
      .in('trip_player_id', tripPlayerIds),
    supabase
      .from('trip_stats')
      .select('*')
      .eq('trip_id', tripId),
    supabase
      .from('trip_awards')
      .select('*')
      .eq('trip_id', tripId),
  ])

  if (roundStatsRes.error || tripStatsRes.error || awardsRes.error) {
    const errMsg = roundStatsRes.error?.message || tripStatsRes.error?.message || awardsRes.error?.message
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }

  return NextResponse.json({
    round_stats: roundStatsRes.data || [],
    trip_stats: tripStatsRes.data || [],
    awards: awardsRes.data || [],
    players: tripPlayers,
  })
}
