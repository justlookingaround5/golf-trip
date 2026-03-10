import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { calculateBalances, minimizePayments, generatePaymentLinks } from '@/lib/settlement'
import SettlementClient from './settlement-client'

export default async function SettlementPage({
  params,
}: {
  params: Promise<{ tripId: string }>
}) {
  const { tripId } = await params
  const supabase = await createClient()

  const { data: trip } = await supabase
    .from('trips')
    .select('name, settled_at')
    .eq('id', tripId)
    .single()

  if (!trip) notFound()

  // Fetch ledger entries + player names (with user_id) + expenses in parallel
  const [entriesRes, playersRes, expensesRes] = await Promise.all([
    supabase
      .from('settlement_ledger')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at'),
    supabase
      .from('trip_players')
      .select('id, player:players(name, user_id)')
      .eq('trip_id', tripId),
    supabase
      .from('trip_expenses')
      .select('*, paid_by:trip_players!paid_by_trip_player_id(id, player:players(name))')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false }),
  ])

  const playerNames = new Map<string, string>()
  const tpToUserId = new Map<string, string>()
  for (const tp of playersRes.data || []) {
    const player = Array.isArray(tp.player) ? tp.player[0] : tp.player
    if (player) {
      const p = player as { name: string; user_id: string | null }
      playerNames.set(tp.id, p.name.split(' ')[0])
      if (p.user_id) tpToUserId.set(tp.id, p.user_id)
    }
  }

  // Fetch payment handles for players who have user accounts
  const userIds = [...new Set(tpToUserId.values())]
  const profileHandles = new Map<string, { venmo?: string; cashapp?: string; zelle_email?: string }>()

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('player_profiles')
      .select('user_id, venmo_username, cashapp_cashtag, zelle_email')
      .in('user_id', userIds)

    for (const p of profiles || []) {
      profileHandles.set(p.user_id, {
        venmo: p.venmo_username || undefined,
        cashapp: p.cashapp_cashtag || undefined,
        zelle_email: p.zelle_email || undefined,
      })
    }
  }

  const balances = calculateBalances(entriesRes.data || [], playerNames)
  const payments = minimizePayments(balances)

  // Populate payment links using recipient's handles
  const paymentsWithLinks = payments.map(payment => {
    const recipientUserId = tpToUserId.get(payment.to_player_id)
    const handles = recipientUserId ? profileHandles.get(recipientUserId) : undefined
    if (handles) {
      const links = generatePaymentLinks(payment.amount, payment.to_player, handles)
      return { ...payment, ...links }
    }
    return payment
  })

  // Find current user's player_id for the wallet tab
  let currentPlayerId: string | null = null
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: playerLink } = await supabase
      .from('players')
      .select('id')
      .eq('user_id', user.id)
      .single()
    if (playerLink) currentPlayerId = playerLink.id
  }

  return (
    <SettlementClient
      tripId={tripId}
      tripName={trip.name}
      balances={balances}
      payments={paymentsWithLinks}
      expenses={expensesRes.data || []}
      tripPlayers={(playersRes.data || []).map(tp => {
        const player = Array.isArray(tp.player) ? tp.player[0] : tp.player
        return { id: tp.id, name: ((player as { name: string } | null)?.name || 'Unknown').split(' ')[0] }
      })}
      currentPlayerId={currentPlayerId}
      settledAt={trip.settled_at || null}
    />
  )
}
