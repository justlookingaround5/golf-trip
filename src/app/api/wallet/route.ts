import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/wallet?playerId=xxx
 *
 * Returns all wallet balances for a player — who they owe, who owes them.
 */
export async function GET(request: NextRequest) {
  const playerId = request.nextUrl.searchParams.get('playerId')
  if (!playerId) {
    return NextResponse.json({ error: 'playerId required' }, { status: 400 })
  }

  const supabase = await createClient()

  // Get all wallets where this player is A or B
  const { data: walletsA } = await supabase
    .from('player_wallets')
    .select('*, player_b:players!player_b_id(id, name)')
    .eq('player_a_id', playerId)

  const { data: walletsB } = await supabase
    .from('player_wallets')
    .select('*, player_a:players!player_a_id(id, name)')
    .eq('player_b_id', playerId)

  const balances: { other_player_id: string; other_player_name: string; balance: number; wallet_id: string }[] = []

  for (const w of walletsA || []) {
    const other = Array.isArray(w.player_b) ? w.player_b[0] : w.player_b
    balances.push({
      other_player_id: other?.id,
      other_player_name: other?.name || 'Unknown',
      balance: Number(w.balance),
      wallet_id: w.id,
    })
  }

  for (const w of walletsB || []) {
    const other = Array.isArray(w.player_a) ? w.player_a[0] : w.player_a
    balances.push({
      other_player_id: other?.id,
      other_player_name: other?.name || 'Unknown',
      balance: -Number(w.balance),  // Flip perspective
      wallet_id: w.id,
    })
  }

  const totalOwed = balances.filter(b => b.balance > 0).reduce((sum, b) => sum + b.balance, 0)
  const totalOwing = balances.filter(b => b.balance < 0).reduce((sum, b) => sum + Math.abs(b.balance), 0)

  return NextResponse.json({ balances, totalOwed, totalOwing })
}
