import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/wallet/pay
 *
 * Record that one player paid another (outside the app — Venmo, cash, etc.)
 *
 * Body:
 *   from_player_id: string   — who paid
 *   to_player_id: string     — who received
 *   amount: number           — how much was paid
 *   note?: string            — "Venmo'd after round 3"
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await request.json()
  const { from_player_id, to_player_id, amount, note } = body

  if (!from_player_id || !to_player_id || !amount) {
    return NextResponse.json({ error: 'from_player_id, to_player_id, amount required' }, { status: 400 })
  }

  // Enforce ordering: player_a_id < player_b_id
  const aId = from_player_id < to_player_id ? from_player_id : to_player_id
  const bId = from_player_id < to_player_id ? to_player_id : from_player_id

  // If from < to: from paid to. From A's perspective, A paid B, so A's balance goes up
  const walletAmount = from_player_id < to_player_id ? amount : -amount

  // Upsert wallet
  const { data: existing } = await supabase
    .from('player_wallets')
    .select('id, balance')
    .eq('player_a_id', aId)
    .eq('player_b_id', bId)
    .single()

  let walletId: string
  let newBalance: number

  if (existing) {
    newBalance = Number(existing.balance) + walletAmount
    await supabase
      .from('player_wallets')
      .update({ balance: newBalance, last_updated: new Date().toISOString() })
      .eq('id', existing.id)
    walletId = existing.id
  } else {
    newBalance = walletAmount
    const { data: created, error } = await supabase
      .from('player_wallets')
      .insert({ player_a_id: aId, player_b_id: bId, balance: newBalance })
      .select()
      .single()

    if (error || !created) {
      return NextResponse.json({ error: error?.message || 'Failed to create wallet' }, { status: 500 })
    }
    walletId = created.id
  }

  // Record transaction
  await supabase.from('wallet_transactions').insert({
    wallet_id: walletId,
    source_type: 'manual_payment',
    source_description: note || 'Manual payment',
    amount: walletAmount,
    balance_after: newBalance,
  })

  return NextResponse.json({ wallet_id: walletId, new_balance: newBalance })
}
