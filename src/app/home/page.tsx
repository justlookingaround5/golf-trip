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

type GroupWithRole = {
  id: string
  name: string
  description: string | null
  role: string
}

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch groups the user belongs to
  const { data: groupMemberships } = await supabase
    .from('group_members')
    .select('role, group:groups(id, name, description)')
    .eq('user_id', user!.id)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const groups: GroupWithRole[] = (groupMemberships || [])
    .filter((m: any) => m.group != null)
    .map((m: any) => {
      const group = Array.isArray(m.group) ? m.group[0] : m.group
      return { ...group, role: m.role }
    })

  // Fetch trips the user is a member of
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

  // Fetch group members for each group
  const groupIds = groups.map(g => g.id)
  const groupMembersMap: Record<string, { user_id: string; role: string; display_name: string | null }[]> = {}

  if (groupIds.length > 0) {
    const { data: allGroupMembers } = await supabase
      .from('group_members')
      .select('group_id, user_id, role')
      .in('group_id', groupIds)

    const memberUserIds = [...new Set((allGroupMembers || []).map(m => m.user_id))]
    const { data: profiles } = memberUserIds.length > 0
      ? await supabase
        .from('player_profiles')
        .select('user_id, display_name')
        .in('user_id', memberUserIds)
      : { data: [] }

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p.display_name]))

    for (const member of allGroupMembers || []) {
      if (!groupMembersMap[member.group_id]) {
        groupMembersMap[member.group_id] = []
      }
      groupMembersMap[member.group_id].push({
        user_id: member.user_id,
        role: member.role,
        display_name: profileMap.get(member.user_id) || null,
      })
    }
  }

  // Get player profile
  const { data: playerProfile } = await supabase
    .from('player_profiles')
    .select('id, display_name')
    .eq('user_id', user!.id)
    .single()

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

  // Find trip_player IDs for this user
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

  // Outstanding balances
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
      balances.push({
        player_name: playerNameMap.get(w.player_b_id) || 'Unknown',
        amount: w.balance,
      })
    }
    for (const w of walletsB || []) {
      balances.push({
        player_name: playerNameMap.get(w.player_a_id) || 'Unknown',
        amount: -w.balance,
      })
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

  // Recent activity
  let recentActivity: {
    id: string
    money: number
    points: number
    game_name: string | null
    computed_at: string
  }[] = []

  if (tripPlayerIds.length > 0) {
    const { data: recent } = await supabase
      .from('game_results')
      .select('id, money, points, computed_at, round_game:round_games(game_format:game_formats(name))')
      .in('trip_player_id', tripPlayerIds)
      .order('computed_at', { ascending: false })
      .limit(10)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recentActivity = (recent || []).map((r: any) => ({
      id: r.id,
      money: r.money,
      points: r.points,
      game_name: r.round_game?.game_format?.name || null,
      computed_at: r.computed_at,
    }))
  }

  // Detect default tab
  const today = new Date().toISOString().split('T')[0]
  const hasRoundToday = upcomingRounds.some(r => r.round_date === today)
  const hasSetupTrips = trips.some(t => t.status === 'setup')
  const isNewUser = trips.length === 0 && groups.length === 0 && pendingInvites.length === 0

  let defaultTab: 'plan' | 'play' | 'review' = 'plan'
  if (hasRoundToday) {
    defaultTab = 'play'
  } else if (!hasSetupTrips && (totalRounds > 0 || balances.length > 0)) {
    defaultTab = 'review'
  }

  return (
    <HomeClient
      defaultTab={defaultTab}
      displayName={playerProfile?.display_name || 'Golfer'}
      groups={groups}
      trips={trips}
      groupMembersMap={groupMembersMap}
      userId={user!.id}
      pendingInvites={pendingInvites}
      isNewUser={isNewUser}
      upcomingRounds={upcomingRounds}
      hasRoundToday={hasRoundToday}
      totalRounds={totalRounds}
      totalWinnings={totalWinnings}
      bestGross={bestGross}
      tripsCount={trips.length}
      balances={balances}
      recentActivity={recentActivity}
    />
  )
}
