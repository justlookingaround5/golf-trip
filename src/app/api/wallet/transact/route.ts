import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/wallet/transact
 *
 * Record a wallet transaction (payment between players or trip settlement import).
 *
 * Body:
 *   player_a_id: string    — lower UUID of the pair
 *   player_b_id: string    — higher UUID of the pair
 *   amount: number         — positive = B pays A (from A's perspective)
 *   source_type: string    — 'trip_settlement' | 'manual_payment' | 'adjustment'
 *   source_trip_id?: string
 *   source_description?: string
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await request.json()

  let { player_a_id, player_b_id } = body
  const { amount, source_type, source_trip_id, source_description } = body

  if (!player_a_id || !player_b_id || amount == null || !source_type) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Enforce ordering: player_a_id < player_b_id
  let flipSign = false
  if (player_a_id > player_b_id) {
    ;[player_a_id, player_b_id] = [player_b_id, player_a_id]
    flipSign = true
  }

  const adjustedAmount = flipSign ? -amount : amount

  // Upsert wallet
  const { data: existing } = await supabase
    .from('player_wallets')
    .select('id, balance')
    .eq('player_a_id', player_a_id)
    .eq('player_b_id', player_b_id)
    .single()

  let walletId: string
  let newBalance: number

  if (existing) {
    newBalance = Number(existing.balance) + adjustedAmount
    await supabase
      .from('player_wallets')
      .update({ balance: newBalance, last_trip_id: source_trip_id || null, last_updated: new Date().toISOString() })
      .eq('id', existing.id)
    walletId = existing.id
  } else {
    newBalance = adjustedAmount
    const { data: created, error } = await supabase
      .from('player_wallets')
      .insert({
        player_a_id,
        player_b_id,
        balance: newBalance,
        last_trip_id: source_trip_id || null,
      })
      .select()
      .single()

    if (error || !created) {
      return NextResponse.json({ error: error?.message || 'Failed to create wallet' }, { status: 500 })
    }
    walletId = created.id
  }

  // Record transaction
  const { error: txError } = await supabase.from('wallet_transactions').insert({
    wallet_id: walletId,
    source_type,
    source_trip_id: source_trip_id || null,
    source_description: source_description || null,
    amount: adjustedAmount,
    balance_after: newBalance,
  })

  if (txError) {
    return NextResponse.json({ error: `Wallet updated but audit trail failed: ${txError.message}` }, { status: 500 })
  }

  return NextResponse.json({ wallet_id: walletId, new_balance: newBalance })
}
