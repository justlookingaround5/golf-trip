import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/friends?userId=<userId> — accepted friends of any user (public)
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const { data: fships } = await supabase
    .from('friendships')
    .select('id, requester_id, addressee_id')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .eq('status', 'accepted')

  const friendUserIds = (fships || []).map((f) =>
    f.requester_id === userId ? f.addressee_id : f.requester_id
  )

  if (friendUserIds.length === 0) return NextResponse.json({ friends: [] })

  const { data: profiles } = await supabase
    .from('player_profiles')
    .select('user_id, display_name, avatar_url, handicap_index')
    .in('user_id', friendUserIds)

  // Check which friends have an active round
  const activeRoundUserIds = new Set<string>()
  const includeActive = req.nextUrl.searchParams.get('includeActiveRounds') === 'true'

  if (includeActive && friendUserIds.length > 0) {
    // Get player records for friends
    const { data: friendPlayers } = await supabase
      .from('players')
      .select('id, user_id')
      .in('user_id', friendUserIds)

    if (friendPlayers && friendPlayers.length > 0) {
      const playerIdToUserId = new Map(friendPlayers.map(p => [p.id, p.user_id]))
      const playerIds = friendPlayers.map(p => p.id)

      // Get active trips
      const { data: activeTrips } = await supabase
        .from('trips')
        .select('id')
        .eq('status', 'active')

      if (activeTrips && activeTrips.length > 0) {
        const activeTripIds = activeTrips.map(t => t.id)

        // Get trip_players for friends in active trips
        const { data: tripPlayers } = await supabase
          .from('trip_players')
          .select('id, player_id, trip_id')
          .in('player_id', playerIds)
          .in('trip_id', activeTripIds)

        if (tripPlayers && tripPlayers.length > 0) {
          const tpIds = tripPlayers.map(tp => tp.id)
          const tpToPlayerId = new Map(tripPlayers.map(tp => [tp.id, tp.player_id]))
          const tpTripIds = [...new Set(tripPlayers.map(tp => tp.trip_id))]

          const { data: courses } = await supabase
            .from('courses')
            .select('id')
            .in('trip_id', tpTripIds)

          if (courses && courses.length > 0) {
            const courseIds = courses.map(c => c.id)

            const { data: scores } = await supabase
              .from('round_scores')
              .select('trip_player_id, course_id')
              .in('trip_player_id', tpIds)
              .in('course_id', courseIds)

            // Count scores per trip_player per course
            const countMap = new Map<string, number>()
            for (const s of scores ?? []) {
              const key = `${s.trip_player_id}::${s.course_id}`
              countMap.set(key, (countMap.get(key) ?? 0) + 1)
            }

            for (const [key, count] of countMap) {
              if (count > 0 && count < 18) {
                const tpId = key.split('::')[0]
                const playerId = tpToPlayerId.get(tpId)
                const userIdForPlayer = playerId ? playerIdToUserId.get(playerId) : null
                if (userIdForPlayer) activeRoundUserIds.add(userIdForPlayer)
              }
            }
          }
        }
      }
    }
  }

  return NextResponse.json({
    friends: (profiles || []).map((p) => ({
      userId: p.user_id,
      displayName: p.display_name || 'Unknown',
      avatarUrl: p.avatar_url,
      handicap: p.handicap_index ?? null,
      ...(includeActive ? { hasActiveRound: activeRoundUserIds.has(p.user_id) } : {}),
    })),
  })
}

// POST /api/friends — send a friend request
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { addresseeUserId } = body
  if (!addresseeUserId || addresseeUserId === user.id) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Check for existing friendship (either direction)
  const { data: existing } = await supabase
    .from('friendships')
    .select('id, status')
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${addresseeUserId}),and(requester_id.eq.${addresseeUserId},addressee_id.eq.${user.id})`
    )
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Friendship already exists', existing }, { status: 409 })
  }

  const { data, error } = await supabase
    .from('friendships')
    .insert({ requester_id: user.id, addressee_id: addresseeUserId })
    .select('id, status')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
