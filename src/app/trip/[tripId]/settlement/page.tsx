import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { calculateBalances, minimizePayments } from '@/lib/settlement'
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
    .select('name')
    .eq('id', tripId)
    .single()

  if (!trip) notFound()

  // Fetch ledger entries + player names + expenses in parallel
  const [entriesRes, playersRes, expensesRes] = await Promise.all([
    supabase
      .from('settlement_ledger')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at'),
    supabase
      .from('trip_players')
      .select('id, player:players(name)')
      .eq('trip_id', tripId),
    supabase
      .from('trip_expenses')
      .select('*, paid_by:trip_players!paid_by_trip_player_id(id, player:players(name))')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false }),
  ])

  const playerNames = new Map<string, string>()
  for (const tp of playersRes.data || []) {
    const player = Array.isArray(tp.player) ? tp.player[0] : tp.player
    if (player) playerNames.set(tp.id, (player as { name: string }).name)
  }

  const balances = calculateBalances(entriesRes.data || [], playerNames)
  const payments = minimizePayments(balances)

  return (
    <SettlementClient
      tripId={tripId}
      tripName={trip.name}
      balances={balances}
      payments={payments}
      expenses={expensesRes.data || []}
      tripPlayers={(playersRes.data || []).map(tp => {
        const player = Array.isArray(tp.player) ? tp.player[0] : tp.player
        return { id: tp.id, name: (player as { name: string } | null)?.name || 'Unknown' }
      })}
    />
  )
}
