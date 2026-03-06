import { createClient } from '@/lib/supabase/server'
import HomeClient from './home-client'

type TripWithRole = {
  id: string
  name: string
  location: string | null
  year: number
  status: string
  role: string
  group_id: string | null
}

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch groups (just for isNewUser check)
  const { data: groupMemberships } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', user!.id)
    .limit(1)

  const hasGroups = (groupMemberships || []).length > 0

  // Fetch trips
  const { data: memberships } = await supabase
    .from('trip_members')
    .select('role, trip:trips(id, name, location, year, status, group_id)')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trips: TripWithRole[] = (memberships || [])
    .filter((m: any) => m.trip != null)
    .map((m: any) => {
      const trip = Array.isArray(m.trip) ? m.trip[0] : m.trip
      return { ...trip, role: m.role }
    })
    .filter((t: TripWithRole) => t.id != null)

  // Pending invites
  const userEmail = user!.email
  let pendingInvites: { id: string; token: string; trip_name: string }[] = []
  if (userEmail) {
    const { data: invites } = await supabase
      .from('trip_invites')
      .select('id, token, trip:trips(name)')
      .eq('email', userEmail)
      .eq('status', 'pending')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pendingInvites = (invites || []).map((inv: any) => ({
      id: inv.id,
      token: inv.token,
      trip_name: Array.isArray(inv.trip) ? inv.trip[0]?.name : inv.trip?.name || 'Unknown Trip',
    }))
  }

  // Find trip_player IDs
  const { data: players } = await supabase
    .from('players')
    .select('id')
    .eq('user_id', user!.id)

  const playerIds = (players || []).map(p => p.id)

  let tripPlayerIds: string[] = []
  if (playerIds.length > 0) {
    const { data: tripPlayers } = await supabase
      .from('trip_players')
      .select('id')
      .in('player_id', playerIds)
    tripPlayerIds = (tripPlayers || []).map(tp => tp.id)
  }

  // Balances
  let balances: { player_name: string; amount: number }[] = []
  if (playerIds.length > 0) {
    const { data: walletsA } = await supabase
      .from('player_wallets')
      .select('player_b_id, balance')
      .in('player_a_id', playerIds)
      .neq('balance', 0)

    const { data: walletsB } = await supabase
      .from('player_wallets')
      .select('player_a_id, balance')
      .in('player_b_id', playerIds)
      .neq('balance', 0)

    const otherPlayerIds = [
      ...(walletsA || []).map(w => w.player_b_id),
      ...(walletsB || []).map(w => w.player_a_id),
    ]

    let playerNameMap = new Map<string, string>()
    if (otherPlayerIds.length > 0) {
      const { data: otherPlayers } = await supabase
        .from('players')
        .select('id, name')
        .in('id', otherPlayerIds)
      playerNameMap = new Map((otherPlayers || []).map(p => [p.id, p.name]))
    }

    for (const w of walletsA || []) {
      balances.push({ player_name: playerNameMap.get(w.player_b_id) || 'Unknown', amount: w.balance })
    }
    for (const w of walletsB || []) {
      balances.push({ player_name: playerNameMap.get(w.player_a_id) || 'Unknown', amount: -w.balance })
    }
  }

  // Upcoming rounds
  const activeTripIds = trips.filter(t => t.status === 'active').map(t => t.id)
  let upcomingRounds: { trip_id: string; trip_name: string; course_name: string; course_id: string; round_date: string }[] = []

  if (activeTripIds.length > 0) {
    const today = new Date().toISOString().split('T')[0]
    const { data: courses } = await supabase
      .from('courses')
      .select('id, trip_id, name, round_date')
      .in('trip_id', activeTripIds)
      .gte('round_date', today)
      .order('round_date', { ascending: true })
      .limit(5)

    const tripNameMap = new Map(trips.map(t => [t.id, t.name]))
    upcomingRounds = (courses || [])
      .filter(c => c.round_date)
      .map(c => ({
        trip_id: c.trip_id,
        trip_name: tripNameMap.get(c.trip_id) || 'Unknown Trip',
        course_name: c.name,
        course_id: c.id,
        round_date: c.round_date!,
      }))
  }

  // Personal stats
  let totalRounds = 0
  let totalWinnings = 0
  let bestGross: number | null = null

  if (tripPlayerIds.length > 0) {
    const { data: gameResults } = await supabase
      .from('game_results')
      .select('money')
      .in('trip_player_id', tripPlayerIds)

    totalWinnings = (gameResults || []).reduce((sum, r) => sum + (r.money || 0), 0)

    const { data: roundStats } = await supabase
      .from('round_stats')
      .select('gross_total')
      .in('trip_player_id', tripPlayerIds)

    totalRounds = (roundStats || []).length
    const grossScores = (roundStats || [])
      .map(r => r.gross_total)
      .filter((g): g is number => g != null)
    if (grossScores.length > 0) {
      bestGross = Math.min(...grossScores)
    }
  }

  // Auto-detect default tab
  const today = new Date().toISOString().split('T')[0]
  const hasRoundToday = upcomingRounds.some(r => r.round_date === today)
  const hasSetupTrips = trips.some(t => t.status === 'setup')
  const isNewUser = trips.length === 0 && !hasGroups && pendingInvites.length === 0

  let defaultTab: 'plan' | 'play' | 'review' = 'plan'
  if (hasRoundToday) {
    defaultTab = 'play'
  } else if (!hasSetupTrips && (totalRounds > 0 || balances.length > 0)) {
    defaultTab = 'review'
  }

  return (
    <HomeClient
      defaultTab={defaultTab}
      trips={trips}
      pendingInvites={pendingInvites}
      isNewUser={isNewUser}
      upcomingRounds={upcomingRounds}
      hasRoundToday={hasRoundToday}
      totalRounds={totalRounds}
      totalWinnings={totalWinnings}
      bestGross={bestGross}
      tripsCount={trips.length}
      balances={balances}
    />
  )
}
