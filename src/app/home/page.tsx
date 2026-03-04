import { createClient } from '@/lib/supabase/server'
import GroupsSection from './components/GroupsSection'
import PersonalStats from './components/PersonalStats'
import RecentActivity from './components/RecentActivity'

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

  // Fetch group members for each group (for display)
  const groupIds = groups.map(g => g.id)
  let groupMembersMap: Record<string, { user_id: string; role: string; display_name: string | null }[]> = {}

  if (groupIds.length > 0) {
    const { data: allGroupMembers } = await supabase
      .from('group_members')
      .select('group_id, user_id, role')
      .in('group_id', groupIds)

    // Get profile info for all members
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

  // Get player profile for stats queries
  const { data: playerProfile } = await supabase
    .from('player_profiles')
    .select('id, display_name')
    .eq('user_id', user!.id)
    .single()

  // Find trip_player IDs for this user (needed for stats)
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

  // Personal stats from game_results
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

  // Recent activity from game_results
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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {playerProfile?.display_name || 'Golfer'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Your groups, trips, and stats at a glance.
        </p>
      </div>

      <div className="space-y-10">
        <GroupsSection
          groups={groups}
          trips={trips}
          groupMembersMap={groupMembersMap}
          userId={user!.id}
        />

        <div className="grid gap-8 lg:grid-cols-2">
          <PersonalStats
            totalRounds={totalRounds}
            totalWinnings={totalWinnings}
            bestGross={bestGross}
            tripsCount={trips.length}
          />
          <RecentActivity activity={recentActivity} />
        </div>
      </div>
    </div>
  )
}
