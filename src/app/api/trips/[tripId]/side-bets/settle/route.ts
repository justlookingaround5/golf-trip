import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/trips/[tripId]/side-bets/settle
 *
 * Recalculate settlement ledger entries for all side bets in this trip.
 * Idempotent: deletes existing side_bet entries and recreates them.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Fetch active side bets for this trip
  const { data: sideBets, error: sbError } = await supabase
    .from('side_bets')
    .select('id, bet_type, custom_label, value')
    .eq('trip_id', tripId)
    .eq('active', true)

  if (sbError) {
    return NextResponse.json({ error: sbError.message }, { status: 500 })
  }

  if (!sideBets || sideBets.length === 0) {
    return NextResponse.json({ message: 'No active side bets', entries: 0 })
  }

  const sideBetIds = sideBets.map(sb => sb.id)

  // Fetch all hits for these bets
  const { data: hits, error: hitsError } = await supabase
    .from('side_bet_hits')
    .select('id, side_bet_id, trip_player_id')
    .in('side_bet_id', sideBetIds)

  if (hitsError) {
    return NextResponse.json({ error: hitsError.message }, { status: 500 })
  }

  // Fetch all trip players for this trip
  const { data: tripPlayers } = await supabase
    .from('trip_players')
    .select('id')
    .eq('trip_id', tripId)

  const allPlayerIds = (tripPlayers || []).map(tp => tp.id)
  const numPlayers = allPlayerIds.length

  if (numPlayers < 2) {
    return NextResponse.json({ message: 'Need at least 2 players', entries: 0 })
  }

  // Calculate net per player per side bet
  const ledgerEntries: {
    trip_id: string
    trip_player_id: string
    source_type: 'side_bet'
    source_id: string
    amount: number
    description: string
  }[] = []

  for (const bet of sideBets) {
    const betHits = (hits || []).filter(h => h.side_bet_id === bet.id)
    if (betHits.length === 0) continue

    const label = bet.bet_type === 'custom' && bet.custom_label
      ? bet.custom_label
      : bet.bet_type.charAt(0).toUpperCase() + bet.bet_type.slice(1)

    // Count hits per player
    const hitCounts = new Map<string, number>()
    for (const pid of allPlayerIds) hitCounts.set(pid, 0)
    for (const hit of betHits) {
      hitCounts.set(hit.trip_player_id, (hitCounts.get(hit.trip_player_id) || 0) + 1)
    }

    const totalHits = betHits.length

    // For each player: net = (my_hits * value * (N-1)) - (other_hits * value)
    // other_hits = totalHits - my_hits
    for (const pid of allPlayerIds) {
      const myHits = hitCounts.get(pid) || 0
      const otherHits = totalHits - myHits
      const net = (myHits * bet.value * (numPlayers - 1)) - (otherHits * bet.value)

      if (Math.abs(net) < 0.005) continue

      ledgerEntries.push({
        trip_id: tripId,
        trip_player_id: pid,
        source_type: 'side_bet',
        source_id: bet.id,
        amount: net,
        description: `${label} (${myHits} hit${myHits !== 1 ? 's' : ''})`,
      })
    }
  }

  // Delete existing side_bet entries for this trip (idempotent)
  const { error: deleteError } = await supabase
    .from('settlement_ledger')
    .delete()
    .eq('trip_id', tripId)
    .eq('source_type', 'side_bet')

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  // Insert new entries
  if (ledgerEntries.length > 0) {
    const { error: insertError } = await supabase
      .from('settlement_ledger')
      .insert(ledgerEntries)

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ message: 'Side bet settlement updated', entries: ledgerEntries.length })
}
