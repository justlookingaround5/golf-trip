import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { postActivity } from '@/lib/activity'

/**
 * GET /api/trips/[tripId]/expenses
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('trip_expenses')
    .select(`
      *,
      paid_by:trip_players!paid_by_trip_player_id(
        id, player:players(name)
      )
    `)
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

/**
 * POST /api/trips/[tripId]/expenses
 * Body: { description, category, amount, paid_by_trip_player_id, split_among? }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await request.json()
  const { description, category, amount, paid_by_trip_player_id, split_among } = body

  if (!description || !amount || !paid_by_trip_player_id) {
    return NextResponse.json(
      { error: 'description, amount, and paid_by_trip_player_id are required' },
      { status: 400 }
    )
  }

  // Insert expense
  const { data: expense, error } = await supabase
    .from('trip_expenses')
    .insert({
      trip_id: tripId,
      description,
      category: category || 'other',
      amount,
      paid_by_trip_player_id,
      split_among: split_among || null,
      split_method: 'even',
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Calculate settlement entries
  const { data: allTripPlayers } = await supabase
    .from('trip_players')
    .select('id, player:players(name)')
    .eq('trip_id', tripId)

  const participants = split_among
    ? (allTripPlayers || []).filter((tp: { id: string }) => split_among.includes(tp.id))
    : (allTripPlayers || [])

  if (participants.length > 0) {
    const perPerson = amount / participants.length
    const ledgerEntries = []

    // Payer gets credited (they paid full, but owe their share)
    ledgerEntries.push({
      trip_id: tripId,
      trip_player_id: paid_by_trip_player_id,
      source_type: 'expense' as const,
      source_id: expense.id,
      amount: amount - perPerson,
      description: `Paid for: ${description}`,
    })

    // Everyone else owes their share
    for (const tp of participants) {
      if (tp.id === paid_by_trip_player_id) continue
      ledgerEntries.push({
        trip_id: tripId,
        trip_player_id: tp.id,
        source_type: 'expense' as const,
        source_id: expense.id,
        amount: -perPerson,
        description: `Share of: ${description}`,
      })
    }

    await supabase.from('settlement_ledger').insert(ledgerEntries)
  }

  // Post to activity feed
  const payer = (allTripPlayers || []).find((tp: { id: string }) => tp.id === paid_by_trip_player_id)
  const payerPlayer = Array.isArray(payer?.player) ? payer?.player[0] : payer?.player
  const payerName = (payerPlayer as { name: string } | undefined)?.name || 'Someone'
  await postActivity({
    trip_id: tripId,
    event_type: 'expense_added',
    title: `${payerName} added expense: ${description}`,
    detail: `$${amount} split ${participants.length} ways`,
    trip_player_id: paid_by_trip_player_id,
  }).catch(() => {}) // Non-blocking

  return NextResponse.json(expense, { status: 201 })
}
