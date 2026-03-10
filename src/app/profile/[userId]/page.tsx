import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import PlayerProfileTabs from '@/app/trip/[tripId]/players/[tripPlayerId]/player-profile-tabs'
import FriendsSection from '@/components/FriendsSection'
import type { CoursePinData } from '@/components/CourseMap'
import type { FriendProfile, PendingItem, ViewerFriendship } from '@/components/FriendsSection'

export default async function GlobalProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId: profileUserId } = await params
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  const currentUserId = user.id

  // Fetch profile
  const { data: profile } = await supabase
    .from('player_profiles')
    .select('display_name, avatar_url, bio')
    .eq('user_id', profileUserId)
    .single()

  if (!profile) notFound()

  // Resolve player record
  const { data: playerRecord } = await supabase
    .from('players')
    .select('id, name, handicap_index')
    .eq('user_id', profileUserId)
    .maybeSingle()

  const displayName = profile.display_name || playerRecord?.name || 'Unknown'
  const avatarUrl = profile.avatar_url
  const bio = profile.bio ?? null
  const handicapIndex = playerRecord?.handicap_index ?? null
  const playerId = playerRecord?.id ?? null

  // ── All trip_players for this player ───────────────────────────────────────
  const { data: allTripPlayers } = playerId
    ? await supabase
        .from('trip_players')
        .select('id, trip_id, player_id')
        .eq('player_id', playerId)
    : { data: [] }

  const allTripPlayerIds = (allTripPlayers || []).map((tp) => tp.id)
  const allTripIds = (allTripPlayers || []).map((tp) => tp.trip_id)

  // ── Score History (all trips) ───────────────────────────────────────────────
  const rounds: Array<{
    courseId: string
    tripId: string
    courseName: string
    tripName: string
    roundNumber: number
    roundDate: string | null
    par: number
    gross: number | null
    net: number | null
    holesPlayed: number
  }> = []

  if (allTripPlayerIds.length > 0) {
    const { data: roundStats } = await supabase
      .from('round_stats')
      .select(`
        gross_total,
        net_total,
        par_total,
        holes_played,
        course:courses!inner(id, name, par, round_number, round_date, trip_id, trip:trips!inner(id, name))
      `)
      .in('trip_player_id', allTripPlayerIds)

    for (const rs of roundStats || []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const course = Array.isArray(rs.course) ? rs.course[0] : rs.course as any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tripInfo = Array.isArray(course?.trip) ? course.trip[0] : course?.trip as any
      if (rs.gross_total == null) continue
      rounds.push({
        courseId: course?.id as string,
        tripId: course?.trip_id as string,
        courseName: (course?.name as string) || 'Unknown',
        tripName: (tripInfo?.name as string) || 'Unknown Trip',
        roundNumber: (course?.round_number as number) || 0,
        roundDate: (course?.round_date as string | null) ?? null,
        par: (course?.par as number) || 72,
        gross: rs.gross_total as number | null,
        net: rs.net_total as number | null,
        holesPlayed: (rs.holes_played as number) || 0,
      })
    }
    rounds.sort((a, b) => {
      if (a.roundDate && b.roundDate) return new Date(b.roundDate).getTime() - new Date(a.roundDate).getTime()
      if (a.roundDate) return -1
      if (b.roundDate) return 1
      return 0
    })
  }

  // ── Map Pins (all trips) ────────────────────────────────────────────────────
  const mapPins: CoursePinData[] = []
  if (allTripPlayerIds.length > 0) {
    const { data: mapStats } = await supabase
      .from('round_stats')
      .select(`
        gross_total,
        net_total,
        course:courses!inner(id, name, par, latitude, longitude, round_date, trip:trips!inner(id, name))
      `)
      .in('trip_player_id', allTripPlayerIds)

    for (const rs of mapStats || []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const course = Array.isArray(rs.course) ? rs.course[0] : rs.course as any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tripInfo = Array.isArray(course?.trip) ? course.trip[0] : course?.trip as any
      if (!course?.latitude || !course?.longitude) continue
      mapPins.push({
        courseId: course.id as string,
        courseName: (course.name as string) || 'Unknown',
        tripName: (tripInfo?.name as string) || 'Unknown Trip',
        roundDate: (course.round_date as string | null) ?? null,
        gross: rs.gross_total as number | null,
        net: rs.net_total as number | null,
        par: (course.par as number) || 72,
        latitude: course.latitude as number,
        longitude: course.longitude as number,
      })
    }
  }

  // ── Match History (all trips) ───────────────────────────────────────────────
  const matchRows: Array<{
    matchId: string
    format: string
    result: string | null
    outcome: 'win' | 'loss' | 'tie' | 'pending'
    opponentNames: string
    courseName: string
    roundNumber: number
    roundDate: string | null
  }> = []

  if (allTripPlayerIds.length > 0) {
    const { data: myMatchPlayers } = await supabase
      .from('match_players')
      .select('match_id, side, trip_player_id')
      .in('trip_player_id', allTripPlayerIds)

    const matchIds = (myMatchPlayers || []).map((mp) => mp.match_id)
    const mySideMap = new Map(
      (myMatchPlayers || []).map((mp) => [mp.match_id, { side: mp.side, tpId: mp.trip_player_id }])
    )

    if (matchIds.length > 0) {
      const { data: matches } = await supabase
        .from('matches')
        .select(`
          id,
          format,
          result,
          winner_side,
          status,
          course:courses!inner(name, round_number, round_date),
          match_players(
            trip_player_id,
            side,
            trip_player:trip_players(player:players(name, user_id))
          )
        `)
        .in('id', matchIds)
        .order('created_at', { ascending: false })

      const allUserIds: string[] = []
      for (const m of matches || []) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const mp of (m as any).match_players || []) {
          const tp = Array.isArray(mp.trip_player) ? mp.trip_player[0] : mp.trip_player
          const p = Array.isArray(tp?.player) ? tp.player[0] : tp?.player
          if (p?.user_id) allUserIds.push(p.user_id)
        }
      }
      const profileNameMap = new Map<string, string>()
      const uniqueUserIds = [...new Set(allUserIds)]
      if (uniqueUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('player_profiles')
          .select('user_id, display_name')
          .in('user_id', uniqueUserIds)
        for (const p of profiles || []) {
          if (p.display_name) profileNameMap.set(p.user_id, p.display_name)
        }
      }

      for (const match of matches || []) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const m = match as any
        const course = Array.isArray(m.course) ? m.course[0] : m.course
        const myInfo = mySideMap.get(m.id)
        const mySide = myInfo?.side

        let outcome: 'win' | 'loss' | 'tie' | 'pending' = 'pending'
        if (m.status === 'completed') {
          if (!m.winner_side || m.winner_side === 'tie') outcome = 'tie'
          else if (m.winner_side === mySide) outcome = 'win'
          else outcome = 'loss'
        }

        const opponents: string[] = []
        for (const mp of m.match_players || []) {
          if (mp.side === mySide) continue
          const tp = Array.isArray(mp.trip_player) ? mp.trip_player[0] : mp.trip_player
          const p = Array.isArray(tp?.player) ? tp.player[0] : tp?.player
          const name = (p?.user_id ? profileNameMap.get(p.user_id) : undefined) || p?.name || 'Unknown'
          opponents.push(name)
        }

        matchRows.push({
          matchId: m.id,
          format: m.format,
          result: m.result ?? null,
          outcome,
          opponentNames: opponents.join(' & ') || 'Unknown',
          courseName: course?.name || 'Unknown',
          roundNumber: course?.round_number || 0,
          roundDate: course?.round_date ?? null,
        })
      }
    }
  }

  // ── Earnings (all trips) ───────────────────────────────────────────────────
  interface EarningsByTrip {
    tripId: string
    tripName: string
    lines: { label: string; amount: number }[]
    total: number
  }

  const earningsByTrip: EarningsByTrip[] = []
  let careerTotal = 0

  if (allTripPlayerIds.length > 0) {
    const { data: ledger } = await supabase
      .from('settlement_ledger')
      .select('trip_id, trip_player_id, source_type, amount, description')
      .in('trip_player_id', allTripPlayerIds)

    const ledgerTripIds = [...new Set((ledger || []).map((l) => l.trip_id))]
    const tripNameMap = new Map<string, string>()
    if (ledgerTripIds.length > 0) {
      const { data: trips } = await supabase
        .from('trips')
        .select('id, name')
        .in('id', ledgerTripIds)
      for (const t of trips || []) tripNameMap.set(t.id, t.name)
    }

    const byTrip = new Map<string, Map<string, number>>()
    for (const entry of ledger || []) {
      if (!byTrip.has(entry.trip_id)) byTrip.set(entry.trip_id, new Map())
      const byLabel = byTrip.get(entry.trip_id)!
      const label = entry.description || entry.source_type || 'Other'
      byLabel.set(label, (byLabel.get(label) ?? 0) + (entry.amount ?? 0))
    }

    for (const [tId, byLabel] of byTrip) {
      const lines = [...byLabel.entries()].map(([label, amount]) => ({ label, amount }))
      const total = lines.reduce((s, l) => s + l.amount, 0)
      careerTotal += total
      earningsByTrip.push({ tripId: tId, tripName: tripNameMap.get(tId) || 'Unknown Trip', lines, total })
    }
  }

  // ── Friends data ───────────────────────────────────────────────────────────
  let friends: FriendProfile[] = []
  let pendingIncoming: PendingItem[] = []
  let pendingOutgoing: PendingItem[] = []
  let suggestions: FriendProfile[] = []
  let viewerFriendship: ViewerFriendship | null = null
  const isOwnProfile = currentUserId === profileUserId

  if (isOwnProfile) {
    const { data: allFships } = await supabase
      .from('friendships')
      .select('id, requester_id, addressee_id, status')
      .or(`requester_id.eq.${currentUserId},addressee_id.eq.${currentUserId}`)

    const allFriendUserIds = new Set<string>()
    const acceptedFriendIds: string[] = []
    const incomingPairs: { fid: string; uid: string }[] = []
    const outgoingPairs: { fid: string; uid: string }[] = []

    for (const f of allFships || []) {
      const otherId = f.requester_id === currentUserId ? f.addressee_id : f.requester_id
      allFriendUserIds.add(otherId)
      if (f.status === 'accepted') acceptedFriendIds.push(otherId)
      else if (f.status === 'pending' && f.addressee_id === currentUserId)
        incomingPairs.push({ fid: f.id, uid: otherId })
      else if (f.status === 'pending' && f.requester_id === currentUserId)
        outgoingPairs.push({ fid: f.id, uid: otherId })
    }

    const allRelevantIds = [...allFriendUserIds]
    const profilesForFriends = new Map<string, FriendProfile>()
    if (allRelevantIds.length > 0) {
      const { data: fProfiles } = await supabase
        .from('player_profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', allRelevantIds)
      for (const p of fProfiles || []) {
        profilesForFriends.set(p.user_id, {
          userId: p.user_id,
          displayName: p.display_name || 'Unknown',
          avatarUrl: p.avatar_url,
        })
      }
    }

    friends = acceptedFriendIds
      .map((uid) => profilesForFriends.get(uid))
      .filter(Boolean) as FriendProfile[]

    pendingIncoming = incomingPairs
      .map(({ fid, uid }) => {
        const u = profilesForFriends.get(uid)
        return u ? { friendshipId: fid, user: u } : null
      })
      .filter(Boolean) as PendingItem[]

    pendingOutgoing = outgoingPairs
      .map(({ fid, uid }) => {
        const u = profilesForFriends.get(uid)
        return u ? { friendshipId: fid, user: u } : null
      })
      .filter(Boolean) as PendingItem[]

    // Suggestions from shared trips
    if (allTripIds.length > 0 && playerId) {
      const { data: coTripPlayers } = await supabase
        .from('trip_players')
        .select('player_id, player:players(user_id)')
        .in('trip_id', allTripIds)
        .neq('player_id', playerId)

      const suggestionUserIds = new Set<string>()
      for (const tp of coTripPlayers || []) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const p = Array.isArray(tp.player) ? tp.player[0] : tp.player as any
        const uid = p?.user_id as string | undefined
        if (!uid || uid === currentUserId || allFriendUserIds.has(uid)) continue
        suggestionUserIds.add(uid)
      }

      if (suggestionUserIds.size > 0) {
        const { data: sProfiles } = await supabase
          .from('player_profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', [...suggestionUserIds])
          .limit(10)
        suggestions = (sProfiles || []).map((p) => ({
          userId: p.user_id,
          displayName: p.display_name || 'Unknown',
          avatarUrl: p.avatar_url,
        }))
      }
    }
  } else {
    // Viewing someone else — fetch their friends + viewer's status
    const [{ data: profileFships }, viewerFshipResult] = await Promise.all([
      supabase
        .from('friendships')
        .select('id, requester_id, addressee_id')
        .or(`requester_id.eq.${profileUserId},addressee_id.eq.${profileUserId}`)
        .eq('status', 'accepted'),
      supabase
        .from('friendships')
        .select('id, requester_id, addressee_id, status')
        .or(
          `and(requester_id.eq.${currentUserId},addressee_id.eq.${profileUserId}),and(requester_id.eq.${profileUserId},addressee_id.eq.${currentUserId})`
        )
        .maybeSingle(),
    ])

    const friendUserIds = (profileFships || []).map((f) =>
      f.requester_id === profileUserId ? f.addressee_id : f.requester_id
    )
    if (friendUserIds.length > 0) {
      const { data: fProfiles } = await supabase
        .from('player_profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', friendUserIds)
      friends = (fProfiles || []).map((p) => ({
        userId: p.user_id,
        displayName: p.display_name || 'Unknown',
        avatarUrl: p.avatar_url,
      }))
    }

    const vf = viewerFshipResult.data
    if (vf) {
      viewerFriendship = {
        friendshipId: vf.id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        status: (vf as any).status,
        isRequester: vf.requester_id === currentUserId,
      }
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-golf-800 px-4 py-6 text-white">
        <div className="mx-auto max-w-lg">
          <Link
            href="/"
            className="mb-3 inline-flex items-center gap-1 text-sm text-golf-300 hover:text-white"
          >
            &larr; Home
          </Link>

          <div className="flex items-center gap-4">
            {avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={avatarUrl}
                alt={displayName}
                className="h-16 w-16 rounded-full object-cover ring-2 ring-white/30"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-golf-600 text-2xl font-bold text-white ring-2 ring-white/30">
                {displayName[0]?.toUpperCase()}
              </div>
            )}

            <div>
              <h1 className="text-2xl font-bold">{displayName}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-golf-200">
                {handicapIndex != null && <span>HCP {handicapIndex}</span>}
                {rounds.length > 0 && (
                  <span>{rounds.length} round{rounds.length !== 1 ? 's' : ''} played</span>
                )}
              </div>
              {bio && <p className="mt-1 text-xs text-golf-300">{bio}</p>}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-6 space-y-8">
        <div>
          <h2 className="mb-4 text-lg font-bold text-gray-900">Stats</h2>
          <PlayerProfileTabs
            rounds={rounds}
            matches={matchRows}
            earnings={earningsByTrip}
            careerTotal={careerTotal}
            mapPins={mapPins}
          />
        </div>

        <FriendsSection
          currentUserId={currentUserId}
          profileUserId={profileUserId}
          isOwnProfile={isOwnProfile}
          friends={friends}
          pendingIncoming={pendingIncoming}
          pendingOutgoing={pendingOutgoing}
          suggestions={suggestions}
          viewerFriendship={viewerFriendship}
        />
      </div>
    </div>
  )
}
