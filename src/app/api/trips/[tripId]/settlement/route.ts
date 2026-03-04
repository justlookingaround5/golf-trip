import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateBalances, minimizePayments, generatePaymentLinks } from '@/lib/settlement'

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

  // Fetch payment handles for all trip players
  const { data: tpWithProfiles } = await supabase
    .from('trip_players')
    .select('id, player:players(user_id)')
    .eq('trip_id', tripId)

  // Build map: trip_player_id → user_id
  const tpToUserId = new Map<string, string>()
  for (const tp of (tpWithProfiles || [])) {
    const player = Array.isArray(tp.player) ? tp.player[0] : tp.player
    if (player?.user_id) tpToUserId.set(tp.id, player.user_id)
  }

  // Fetch player_profiles for users who have them
  const userIds = [...new Set(tpToUserId.values())]
  const profileHandles = new Map<string, { venmo?: string; cashapp?: string; zelle_email?: string }>()

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('player_profiles')
      .select('user_id, venmo_username, cashapp_cashtag, zelle_email')
      .in('user_id', userIds)

    for (const p of (profiles || [])) {
      profileHandles.set(p.user_id, {
        venmo: p.venmo_username || undefined,
        cashapp: p.cashapp_cashtag || undefined,
        zelle_email: p.zelle_email || undefined,
      })
    }
  }

  // Populate payment links using the recipient's handles
  const paymentsWithLinks = payments.map(payment => {
    const recipientUserId = tpToUserId.get(payment.to_player_id)
    const handles = recipientUserId ? profileHandles.get(recipientUserId) : undefined

    if (handles) {
      const links = generatePaymentLinks(payment.amount, payment.to_player, handles)
      return { ...payment, ...links }
    }
    return payment
  })

  return NextResponse.json({ balances, payments: paymentsWithLinks })
}

/**
 * POST /api/trips/[tripId]/settlement
 *
 * Finalize trip settlement — compute payments and push to wallet.
 * Called by admin when they want to "close the books" on a trip.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params
  const supabase = await createClient()

  // Compute settlement
  const { data: entries, error: entriesError } = await supabase
    .from('settlement_ledger')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at')

  if (entriesError) {
    return NextResponse.json({ error: entriesError.message }, { status: 500 })
  }

  const { data: tripPlayers } = await supabase
    .from('trip_players')
    .select('id, player_id, player:players(id, name)')
    .eq('trip_id', tripId)

  const playerNames = new Map<string, string>()
  const tpToPlayerId = new Map<string, string>()
  for (const tp of (tripPlayers || [])) {
    const player = Array.isArray(tp.player) ? tp.player[0] : tp.player
    if (player) {
      playerNames.set(tp.id, player.name)
      tpToPlayerId.set(tp.id, player.id)
    }
  }

  const balances = calculateBalances(entries || [], playerNames)
  const payments = minimizePayments(balances)

  // Get trip name for description
  const { data: trip } = await supabase.from('trips').select('name').eq('id', tripId).single()
  const tripName = trip?.name || 'Unknown Trip'

  const results: { from: string; to: string; amount: number; status: string }[] = []

  // For each payment instruction, create a wallet transaction
  for (const payment of payments) {
    // Use trip_player_id from payment to look up player_id
    const fromPlayerId = tpToPlayerId.get(payment.from_player_id)
    const toPlayerId = tpToPlayerId.get(payment.to_player_id)

    if (!fromPlayerId || !toPlayerId) {
      results.push({ from: payment.from_player, to: payment.to_player, amount: payment.amount, status: 'skipped' })
      continue
    }

    // Enforce ordering for wallet
    const aId = fromPlayerId < toPlayerId ? fromPlayerId : toPlayerId
    const bId = fromPlayerId < toPlayerId ? toPlayerId : fromPlayerId
    // If from < to: from owes to, so amount is negative from A's perspective
    const walletAmount = fromPlayerId < toPlayerId ? -payment.amount : payment.amount

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
        .update({ balance: newBalance, last_trip_id: tripId, last_updated: new Date().toISOString() })
        .eq('id', existing.id)
      walletId = existing.id
    } else {
      newBalance = walletAmount
      const { data: created, error: createErr } = await supabase
        .from('player_wallets')
        .insert({ player_a_id: aId, player_b_id: bId, balance: newBalance, last_trip_id: tripId })
        .select()
        .single()

      if (createErr || !created) {
        results.push({ from: payment.from_player, to: payment.to_player, amount: payment.amount, status: 'failed' })
        continue
      }
      walletId = created.id
    }

    // Record transaction
    const { error: txError } = await supabase.from('wallet_transactions').insert({
      wallet_id: walletId,
      source_type: 'trip_settlement',
      source_trip_id: tripId,
      source_description: `${tripName}: ${payment.from_player} → ${payment.to_player}`,
      amount: walletAmount,
      balance_after: newBalance,
    })

    results.push({
      from: payment.from_player, to: payment.to_player, amount: payment.amount,
      status: txError ? 'wallet_ok_audit_failed' : 'recorded',
    })
  }

  // Mark trip as settled
  await supabase
    .from('trips')
    .update({ settled_at: new Date().toISOString() })
    .eq('id', tripId)

  return NextResponse.json({ results, count: results.length })
}
