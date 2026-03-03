import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateBalances, minimizePayments } from '@/lib/settlement'

/**
 * GET /api/trips/[tripId]/settlement
 *
 * Returns player balances and minimized payment instructions.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params
  const supabase = await createClient()

  // Fetch ledger entries
  const { data: entries, error: entriesError } = await supabase
    .from('settlement_ledger')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at')

  if (entriesError) {
    return NextResponse.json({ error: entriesError.message }, { status: 500 })
  }

  // Fetch player names
  const { data: tripPlayers } = await supabase
    .from('trip_players')
    .select('id, player:players(name)')
    .eq('trip_id', tripId)

  const playerNames = new Map<string, string>()
  for (const tp of (tripPlayers || [])) {
    const player = Array.isArray(tp.player) ? tp.player[0] : tp.player
    if (player) playerNames.set(tp.id, player.name)
  }

  const balances = calculateBalances(entries || [], playerNames)
  const payments = minimizePayments(balances)

  return NextResponse.json({ balances, payments })
}
