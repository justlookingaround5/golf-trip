import { createClient } from '@/lib/supabase/server'
import { calculateMatchPlay } from '@/lib/match-play'
import { getStrokesPerHole } from '@/lib/handicap'
import type { MatchFormat } from '@/lib/types'
import type { MatchV2, PlayerV2, TripTeamV2 } from './types'

// ─── Output types ─────────────────────────────────────────────────────────────

export interface ActiveRoundInfo {
  courseId: string
  courseName: string
  tripId: string
  tripName: string
  holesPlayed: number
  par: number
  matchId: string | null
  teamANames: string[]
  teamBNames: string[]
  formatLabel: string | null
}

export interface FriendActiveRound {
  userId: string
  userName: string
  userAvatarUrl: string | null
  roundId: string
  courseName: string
  holesPlayed: number
  currentGross: number
  par: number
}

export interface FriendRoundFeedItem {
  key: string
  userId: string
  courseId: string
  playerName: string
  playerAvatarUrl: string | null
  courseName: string
  tripName: string
  par: number
  grossScore: number
  netScore: number | null
  matchFormatLabel: string | null
  matchResult: string | null   // e.g. "Won 4&3" or "Lost 2&1"
  matchWon: boolean | null     // true=won, false=lost, null=tie/unknown
  netEarnings: number | null
  completedAt: string
  commentCount: number
  reactions: { emoji: string; count: number; user_ids: string[] }[]
}

export interface FriendMatchGroup {
  matchId: string
  courseId: string
  courseName: string
  tripId: string
  friendUserId: string  // user_id of a friend in the match, used for scorecard URL
  formatLabel: string
  holesPlayed: number
  resultLabel: string | null  // e.g. "2UP", "AS", "3&2"
  leader: 'team_a' | 'team_b' | 'tie' | null
  teamA: { name: string; scoreDiff: number | null }[]
  teamB: { name: string; scoreDiff: number | null }[]
}

export interface HomePageData {
  trip: { id: string; name: string; location: string | null } | null
  teams: TripTeamV2[]
  matches: MatchV2[]
  activeRound: ActiveRoundInfo | null
  friendMatchGroups: FriendMatchGroup[]
  friendActiveRounds: FriendActiveRound[]
  friendRounds: FriendRoundFeedItem[]
  currentUserId: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FORMAT_LABELS: Record<string, string> = {
  '2v2_best_ball':       '2v2 Best Ball',
  '1v1_stroke':          '1v1 Stroke Play',
  '1v1_match':           '1v1 Match Play',
  '2v2_alternate_shot':  '2v2 Alt Shot',
}

/** Extracts "4&3" / "2&1" / "1UP" from a result string like "Team X won 4&3" */
function extractMargin(result: string | null): string | null {
  if (!result) return null
  const m = result.match(/won\s+(.+)$/i)
  return m?.[1]?.trim() ?? null
}

// ─── Main fetcher ─────────────────────────────────────────────────────────────

export async function getHomePageData(): Promise<HomePageData> {
  const supabase = await createClient()
  const empty: HomePageData = {
    trip: null, teams: [], matches: [],
    activeRound: null, friendMatchGroups: [], friendActiveRounds: [], friendRounds: [],
    currentUserId: null,
  }

  // ── 0. Current user ───────────────────────────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser()

  // ── 1. Active trip (filtered by user membership) ──────────────────────────────
  const { data: activeTrips } = await supabase
    .from('trips')
    .select('id, name, location, is_quick_round')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  // Filter active trips to only those the user is a member of
  let myPlayer: { id: string } | null = null
  let filteredActiveTrips = activeTrips ?? []

  if (user) {
    const { data: mp } = await supabase
      .from('players')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()
    myPlayer = mp

    if (myPlayer) {
      const allActiveTripIds = (activeTrips ?? []).map(t => t.id)
      if (allActiveTripIds.length > 0) {
        const { data: memberTps } = await supabase
          .from('trip_players')
          .select('trip_id')
          .eq('player_id', myPlayer.id)
          .in('trip_id', allActiveTripIds)
        const memberTripIds = new Set((memberTps ?? []).map(tp => tp.trip_id))
        filteredActiveTrips = (activeTrips ?? []).filter(t => memberTripIds.has(t.id))
      }
    } else {
      filteredActiveTrips = []
    }
  } else {
    filteredActiveTrips = []
  }

  const mainTrip = filteredActiveTrips.find(t => !t.is_quick_round) ?? filteredActiveTrips[0] ?? null
  const trip = mainTrip ? { id: mainTrip.id, name: mainTrip.name, location: mainTrip.location } : null

  if (!trip) return { ...empty, currentUserId: user?.id ?? null }

  // ── 2. Courses ───────────────────────────────────────────────────────────────
  const { data: courses } = await supabase
    .from('courses')
    .select('id, name, par, round_number')
    .eq('trip_id', trip.id)

  const courseIds = (courses ?? []).map(c => c.id)
  const courseMap = new Map((courses ?? []).map(c => [c.id, c]))

  // ── 3. Teams + players ───────────────────────────────────────────────────────
  const { data: teamRows } = await supabase
    .from('teams')
    .select(`
      id, name,
      team_players(
        trip_player_id,
        trip_players(
          id,
          players(id, name, handicap_index, user_id)
        )
      )
    `)
    .eq('trip_id', trip.id)

  const tripPlayerToTeam = new Map<string, string>()
  const teams: TripTeamV2[] = []
  const TEAM_COLORS = ['#dc2626', '#2563eb', '#d97706', '#16a34a', '#7c3aed', '#0891b2']

  for (const t of (teamRows ?? [])) {
    const players: PlayerV2[] = []
    for (const tp of t.team_players ?? []) {
      const pr = (tp.trip_players as { players?: { id: string; name: string; handicap_index: number | null; user_id: string | null } | null } | null)?.players
      if (pr) {
        players.push({ id: pr.id, name: pr.name, avatarUrl: null, handicap: pr.handicap_index, location: null })
      }
      tripPlayerToTeam.set(tp.trip_player_id, t.name)
    }
    teams.push({ name: t.name, color: '', players })
  }

  // Assign colors for all teams
  teams.forEach((t, i) => { t.color = TEAM_COLORS[i % TEAM_COLORS.length] })

  // ── 4. Matches ───────────────────────────────────────────────────────────────
  let matches: MatchV2[] = []
  if (courseIds.length > 0) {
    const { data: matchRows } = await supabase
      .from('matches')
      .select(`
        id, format, status, result, winner_side, point_value, course_id,
        match_players(
          side, trip_player_id,
          trip_players(
            id,
            players(id, name, handicap_index)
          )
        )
      `)
      .in('course_id', courseIds)

    // Fetch round_stats for scoreDiffs
    const { data: roundStats } = await supabase
      .from('round_stats')
      .select('trip_player_id, course_id, gross_total, par_total')
      .in('course_id', courseIds)

    const grossDiffMap = new Map<string, number>()
    for (const rs of roundStats ?? []) {
      if (rs.gross_total != null && rs.par_total != null) {
        grossDiffMap.set(`${rs.trip_player_id}::${rs.course_id}`, rs.gross_total - rs.par_total)
      }
    }

    matches = (matchRows ?? []).map(m => {
      const course = courseMap.get(m.course_id)
      const aPlayers: PlayerV2[] = []
      const bPlayers: PlayerV2[] = []
      const aTpIds: string[] = []
      const bTpIds: string[] = []

      for (const mp of m.match_players ?? []) {
        const pr = (mp.trip_players as { players?: { id: string; name: string; handicap_index: number | null } | null } | null)?.players
        if (!pr) continue
        const pv2: PlayerV2 = { id: pr.id, name: pr.name, avatarUrl: null, handicap: pr.handicap_index, location: null }
        if (mp.side === 'team_a') { aPlayers.push(pv2); aTpIds.push(mp.trip_player_id) }
        else { bPlayers.push(pv2); bTpIds.push(mp.trip_player_id) }
      }

      const aTeamName = aPlayers.length > 0 ? (tripPlayerToTeam.get(aTpIds[0] ?? '') ?? 'Team A') : 'Team A'
      const bTeamName = bPlayers.length > 0 ? (tripPlayerToTeam.get(bTpIds[0] ?? '') ?? 'Team B') : 'Team B'

      const pv = Number(m.point_value ?? 1)
      const aPoints = m.winner_side === 'team_a' ? pv : m.winner_side === 'tie' ? pv / 2 : 0
      const bPoints = m.winner_side === 'team_b' ? pv : m.winner_side === 'tie' ? pv / 2 : 0

      const aScoreDiffs = aTpIds.map(tpId => grossDiffMap.get(`${tpId}::${m.course_id}`) ?? null)
      const bScoreDiffs = bTpIds.map(tpId => grossDiffMap.get(`${tpId}::${m.course_id}`) ?? null)

      return {
        id: m.id,
        roundNumber: course?.round_number ?? 0,
        format: m.format,
        formatLabel: FORMAT_LABELS[m.format] ?? m.format,
        status: m.status as MatchV2['status'],
        teamA: { name: aTeamName, players: aPlayers, points: aPoints, scoreDiffs: aScoreDiffs },
        teamB: { name: bTeamName, players: bPlayers, points: bPoints, scoreDiffs: bScoreDiffs },
        result: m.result,
        statusLabel: m.status === 'completed' ? null : m.status === 'in_progress' ? 'Live' : 'Upcoming',
        courseId: m.course_id,
        courseName: course?.name ?? '',
        tripId: trip.id,
        teeTime: null,
        thru: null,
        pointValue: pv,
        resultMargin: extractMargin(m.result),
      } satisfies MatchV2
    })

    // ── 4b. Recompute match play status from actual scores ──────────────────────
    const scoredMatches = matches.filter(m => m.status === 'in_progress' || m.status === 'completed')
    if (scoredMatches.length > 0) {
      const ipCourseIds = [...new Set(scoredMatches.map(m => m.courseId))]

      const [{ data: ipHoles }, { data: ipScores }, { data: ipHandicaps }] = await Promise.all([
        supabase.from('holes').select('id, course_id, hole_number, par, handicap_index').in('course_id', ipCourseIds).order('hole_number'),
        supabase.from('round_scores').select('trip_player_id, hole_id, gross_score, course_id').in('course_id', ipCourseIds),
        supabase.from('player_course_handicaps').select('trip_player_id, course_id, handicap_strokes').in('course_id', ipCourseIds),
      ])

      const ipHandicapMap = new Map(
        (ipHandicaps ?? []).map(h => [`${h.trip_player_id}::${h.course_id}`, h.handicap_strokes ?? 0])
      )

      type HoleInfo = { id: string; course_id: string; hole_number: number; par: number; handicap_index: number }
      const ipHolesByCourse = new Map<string, HoleInfo[]>()
      for (const h of ipHoles ?? []) {
        const arr = ipHolesByCourse.get(h.course_id) ?? []
        arr.push(h as HoleInfo)
        ipHolesByCourse.set(h.course_id, arr)
      }

      for (const match of scoredMatches) {
        const courseHoles = ipHolesByCourse.get(match.courseId) ?? []
        if (courseHoles.length === 0) continue

        const matchRow = (matchRows ?? []).find(mr => mr.id === match.id)
        if (!matchRow) continue

        const matchPlayersList: { trip_player_id: string; side: 'team_a' | 'team_b' }[] =
          (matchRow.match_players ?? []).map(mp => ({ trip_player_id: mp.trip_player_id, side: mp.side as 'team_a' | 'team_b' }))

        const playerStrokes = new Map<string, Map<number, number>>()
        const rawStrokes = matchPlayersList.map(mp => ({
          id: mp.trip_player_id,
          strokes: ipHandicapMap.get(`${mp.trip_player_id}::${match.courseId}`) ?? 0,
        }))
        const minStrokes = rawStrokes.length > 0 ? Math.min(...rawStrokes.map(p => p.strokes)) : 0
        for (const { id, strokes } of rawStrokes) {
          playerStrokes.set(id, getStrokesPerHole(Math.max(0, strokes - minStrokes), courseHoles))
        }

        const matchTpIds = new Set(matchPlayersList.map(mp => mp.trip_player_id))
        const matchScores = (ipScores ?? [])
          .filter(s => s.course_id === match.courseId && matchTpIds.has(s.trip_player_id))
          .map(s => ({ trip_player_id: s.trip_player_id, hole_id: s.hole_id, gross_score: s.gross_score }))

        const result = calculateMatchPlay(matchScores, matchPlayersList, courseHoles, playerStrokes, match.format as MatchFormat)

        match.resultMargin = result.status
        match.thru = result.holesPlayed
        match.liveLeader = result.leader
        match.statusLabel = match.status === 'completed' ? null : result.isComplete ? 'Final' : `Thru ${result.holesPlayed}`

        // Update points from computed result so team standings stay in sync
        if (result.isComplete) {
          match.teamA.points = result.teamAPoints * match.pointValue
          match.teamB.points = result.teamBPoints * match.pointValue
        }
      }
    }
  }

  // ── 5. Current user + active round ──────────────────────────────────────────
  // Search across ALL active trips (including quick rounds) for the user's active round
  let activeRound: ActiveRoundInfo | null = null
  const matchPlayerIds = new Set<string>()
  let myTripIds = new Set<string>()

  if (user && myPlayer) {
      // Find ALL trip_players for this player across all active trips
      const allActiveTripIds = (activeTrips ?? []).map(t => t.id)
      const { data: myTps } = allActiveTripIds.length > 0
        ? await supabase
            .from('trip_players')
            .select('id, trip_id')
            .eq('player_id', myPlayer.id)
            .in('trip_id', allActiveTripIds)
        : { data: [] }

      myTripIds = new Set(myTps?.map(tp => tp.trip_id) ?? [])

      if (myTps && myTps.length > 0) {
        const myTpIds = myTps.map(tp => tp.id)
        const tpToTrip = new Map(myTps.map(tp => [tp.id, tp.trip_id]))

        // Get all courses across all active trips for this lookup
        const { data: allActiveCourses } = await supabase
          .from('courses')
          .select('id, name, par, trip_id')
          .in('trip_id', allActiveTripIds)

        const allActiveCourseIds = (allActiveCourses ?? []).map(c => c.id)
        const allActiveCourseMap = new Map((allActiveCourses ?? []).map(c => [c.id, c]))

        if (allActiveCourseIds.length > 0) {
          const { data: scoreCounts } = await supabase
            .from('round_scores')
            .select('course_id, trip_player_id')
            .in('trip_player_id', myTpIds)
            .in('course_id', allActiveCourseIds)

          const countByCourse = new Map<string, { count: number; tpId: string }>()
          for (const s of scoreCounts ?? []) {
            const cur = countByCourse.get(s.course_id)
            if (cur) { cur.count++ }
            else { countByCourse.set(s.course_id, { count: 1, tpId: s.trip_player_id }) }
          }

          for (const [cId, { count, tpId }] of countByCourse) {
            if (count > 0 && count < 18) {
              const course = allActiveCourseMap.get(cId)
              const tripId = tpToTrip.get(tpId)
              const tripInfo = (activeTrips ?? []).find(t => t.id === tripId)
              if (course && tripId) {
                // Find the user's match on this course
                const myMatch = matches.find(m =>
                  m.courseId === cId && (
                    m.teamA.players.some(p => p.id === myPlayer.id) ||
                    m.teamB.players.some(p => p.id === myPlayer.id)
                  )
                )
                activeRound = {
                  courseId: cId,
                  courseName: course.name,
                  tripId,
                  tripName: tripInfo?.name ?? '',
                  holesPlayed: count,
                  par: course.par ?? 72,
                  matchId: myMatch?.id ?? null,
                  teamANames: myMatch?.teamA.players.map(p => p.name.split(' ')[0]) ?? [],
                  teamBNames: myMatch?.teamB.players.map(p => p.name.split(' ')[0]) ?? [],
                  formatLabel: myMatch?.formatLabel ?? null,
                }
                if (myMatch) {
                  for (const p of [...myMatch.teamA.players, ...myMatch.teamB.players]) {
                    if (p.id !== myPlayer.id) matchPlayerIds.add(p.id)
                  }
                }
                break
              }
            }
          }
        }
      }
  }

  // ── 6. Friend data ───────────────────────────────────────────────────────────
  let friendMatchGroups: FriendMatchGroup[] = []
  let friendActiveRounds: FriendActiveRound[] = []
  let friendRounds: FriendRoundFeedItem[] = []

  if (user && (activeTrips ?? []).length > 0) {
    const { data: friendships } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq('status', 'accepted')

    const friendUserIds = (friendships ?? []).map(f =>
      f.requester_id === user.id ? f.addressee_id : f.requester_id
    )

    if (friendUserIds.length > 0) {
      const { data: friendPlayers } = await supabase
        .from('players')
        .select('id, name, user_id')
        .in('user_id', friendUserIds)

      const friendPlayerIds = (friendPlayers ?? []).map(p => p.id)
      const playerById = new Map((friendPlayers ?? []).map(p => [p.id, p]))

      const { data: friendProfiles } = await supabase
        .from('player_profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', friendUserIds)
      const profileByUserId = new Map((friendProfiles ?? []).map(p => [p.user_id, p]))

      if (friendPlayerIds.length > 0) {
        // Fetch friends in ALL active trips
        const allActiveTripIdsForFriends = (activeTrips ?? []).map(t => t.id)
        const { data: allFriendTripPlayers } = await supabase
          .from('trip_players')
          .select('id, player_id, trip_id')
          .in('trip_id', allActiveTripIdsForFriends)
          .in('player_id', friendPlayerIds)

        // For "Friends Playing Now": exclude trips the current user belongs to
        const externalFriendTps = (allFriendTripPlayers ?? []).filter(tp => !myTripIds.has(tp.trip_id))
        // For "Recent Activity": use ALL friend trip players (including user's trip)
        const allFriendTps = allFriendTripPlayers ?? []

        const activeTripNameMap = new Map((activeTrips ?? []).map(t => [t.id, t.name]))

        // ── Friends Playing Now (external trips only) ──
        const extTpIds = externalFriendTps.map(tp => tp.id)
        const extTpToPlayer = new Map(externalFriendTps.map(tp => [tp.id, tp.player_id]))

        const extTripIds = [...new Set(externalFriendTps.map(tp => tp.trip_id))]
        const { data: extCourses } = extTripIds.length > 0
          ? await supabase.from('courses').select('id, name, par, trip_id').in('trip_id', extTripIds)
          : { data: [] }
        const extCourseIds = (extCourses ?? []).map(c => c.id)
        const extCourseMap = new Map((extCourses ?? []).map(c => [c.id, c]))

        if (extTpIds.length > 0 && extCourseIds.length > 0) {
          const { data: extHoles } = await supabase
            .from('holes')
            .select('id, course_id, hole_number, par, handicap_index')
            .in('course_id', extCourseIds)
            .order('hole_number')

          const holePars = new Map<string, number[]>()
          type ExtHoleInfo = { id: string; course_id: string; hole_number: number; par: number; handicap_index: number }
          const extHolesByCourse = new Map<string, ExtHoleInfo[]>()
          for (const h of extHoles ?? []) {
            const arr = holePars.get(h.course_id) ?? []
            arr.push(h.par)
            holePars.set(h.course_id, arr)

            const hArr = extHolesByCourse.get(h.course_id) ?? []
            hArr.push(h as ExtHoleInfo)
            extHolesByCourse.set(h.course_id, hArr)
          }

          const { data: extScores } = await supabase
            .from('round_scores')
            .select('trip_player_id, course_id, gross_score')
            .in('trip_player_id', extTpIds)
            .in('course_id', extCourseIds)

          const extScoreMap = new Map<string, { count: number; gross: number }>()
          for (const s of extScores ?? []) {
            const key = `${s.trip_player_id}::${s.course_id}`
            const cur = extScoreMap.get(key) ?? { count: 0, gross: 0 }
            extScoreMap.set(key, {
              count: cur.count + 1,
              gross: cur.gross + (s.gross_score ?? 0),
            })
          }

          // ── Group friends by match ──
          const friendTpIdSet = new Set(extTpIds)
          const extTpToTrip = new Map(externalFriendTps.map(tp => [tp.id, tp.trip_id]))

          const { data: extMatchRows } = await supabase
            .from('matches')
            .select(`
              id, format, course_id,
              match_players(
                trip_player_id, side,
                trip_players(id, players(id, name))
              )
            `)
            .in('course_id', extCourseIds)
            .eq('status', 'in_progress')

          const matchedTpIds = new Set<string>()

          // Collect all tp_ids from matches that include at least one friend
          const friendMatchList = (extMatchRows ?? []).filter(m =>
            (m.match_players ?? []).some(mp => friendTpIdSet.has(mp.trip_player_id))
          )
          const allMatchTpIds = [...new Set(friendMatchList.flatMap(m =>
            (m.match_players ?? []).map(mp => mp.trip_player_id)
          ))]

          // Fetch scores + handicaps for all match players (friends AND non-friends)
          const [{ data: matchHoleScores }, { data: matchHandicaps }] = allMatchTpIds.length > 0
            ? await Promise.all([
                supabase.from('round_scores').select('trip_player_id, hole_id, gross_score, course_id')
                  .in('trip_player_id', allMatchTpIds).in('course_id', extCourseIds),
                supabase.from('player_course_handicaps').select('trip_player_id, course_id, handicap_strokes')
                  .in('trip_player_id', allMatchTpIds).in('course_id', extCourseIds),
              ])
            : [{ data: [] }, { data: [] }]

          // Build aggregated score map for all match players (covers non-friends too)
          const allMatchScoreMap = new Map<string, { count: number; gross: number }>()
          for (const s of matchHoleScores ?? []) {
            const key = `${s.trip_player_id}::${s.course_id}`
            const cur = allMatchScoreMap.get(key) ?? { count: 0, gross: 0 }
            allMatchScoreMap.set(key, { count: cur.count + 1, gross: cur.gross + (s.gross_score ?? 0) })
          }

          const extHandicapMap = new Map(
            (matchHandicaps ?? []).map(h => [`${h.trip_player_id}::${h.course_id}`, h.handicap_strokes ?? 0])
          )

          for (const m of friendMatchList) {
            const players = m.match_players ?? []
            const course = extCourseMap.get(m.course_id)
            if (!course) continue
            const tripId = extTpToTrip.get(players.find(mp => friendTpIdSet.has(mp.trip_player_id))!.trip_player_id) ?? ''

            // Compute live match play status
            const courseHoles = extHolesByCourse.get(m.course_id) ?? []
            let resultLabel: string | null = null
            let matchHolesPlayed = 0
            let matchLeader: 'team_a' | 'team_b' | 'tie' | null = null

            if (courseHoles.length > 0) {
              const matchPlayersList: { trip_player_id: string; side: 'team_a' | 'team_b' }[] =
                players.map(mp => ({ trip_player_id: mp.trip_player_id, side: mp.side as 'team_a' | 'team_b' }))

              const playerStrokes = new Map<string, Map<number, number>>()
              const rawStrokes = matchPlayersList.map(mp => ({
                id: mp.trip_player_id,
                strokes: extHandicapMap.get(`${mp.trip_player_id}::${m.course_id}`) ?? 0,
              }))
              const minStrokes = rawStrokes.length > 0 ? Math.min(...rawStrokes.map(p => p.strokes)) : 0
              for (const { id, strokes } of rawStrokes) {
                playerStrokes.set(id, getStrokesPerHole(Math.max(0, strokes - minStrokes), courseHoles))
              }

              const matchTpIdSet = new Set(matchPlayersList.map(mp => mp.trip_player_id))
              const matchScores = (matchHoleScores ?? [])
                .filter(s => s.course_id === m.course_id && matchTpIdSet.has(s.trip_player_id))
                .map(s => ({ trip_player_id: s.trip_player_id, hole_id: s.hole_id, gross_score: s.gross_score }))

              const result = calculateMatchPlay(matchScores, matchPlayersList, courseHoles, playerStrokes, m.format as MatchFormat)
              resultLabel = result.status.replace(/\s*thru\s+\d+$/i, '')
              matchHolesPlayed = result.holesPlayed
              matchLeader = result.leader ?? null
            }

            // Build teams with scoreDiff from allMatchScoreMap
            const teamA: { name: string; scoreDiff: number | null }[] = []
            const teamB: { name: string; scoreDiff: number | null }[] = []

            for (const mp of players) {
              const pr = (mp.trip_players as unknown as { id: string; players?: { id: string; name: string } | null } | null)?.players
              const name = pr?.name?.split(' ')[0] ?? '?'
              const scoreData = allMatchScoreMap.get(`${mp.trip_player_id}::${m.course_id}`)
              const holesPlayed = scoreData?.count ?? 0
              const parThru = (holePars.get(m.course_id) ?? []).slice(0, holesPlayed).reduce((a, b) => a + b, 0)
              const scoreDiff = scoreData ? scoreData.gross - parThru : null

              if (mp.side === 'team_a') teamA.push({ name, scoreDiff })
              else teamB.push({ name, scoreDiff })

              if (friendTpIdSet.has(mp.trip_player_id)) {
                matchedTpIds.add(mp.trip_player_id)
              }
            }

            // Find the first friend player's user_id for the scorecard URL
            const friendTpId = players.find(mp => friendTpIdSet.has(mp.trip_player_id))?.trip_player_id
            const friendPlayerId = friendTpId ? extTpToPlayer.get(friendTpId) : undefined
            const friendPlayer = friendPlayerId ? playerById.get(friendPlayerId) : undefined
            const friendUserId = friendPlayer?.user_id ?? ''

            friendMatchGroups.push({
              matchId: m.id,
              courseId: m.course_id,
              courseName: course.name,
              tripId,
              friendUserId,
              formatLabel: FORMAT_LABELS[m.format] ?? m.format,
              holesPlayed: matchHolesPlayed,
              resultLabel,
              leader: matchLeader,
              teamA,
              teamB,
            })
          }

          for (const [key, { count, gross }] of extScoreMap) {
            if (count > 0 && count < 18) {
              const [tpId, courseId] = key.split('::')
              if (matchedTpIds.has(tpId)) continue
              const playerId = extTpToPlayer.get(tpId)
              if (playerId && matchPlayerIds.has(playerId)) continue
              const player = playerId ? playerById.get(playerId) : null
              const course = extCourseMap.get(courseId)
              if (!player || !course) continue
              const profile = player.user_id ? profileByUserId.get(player.user_id) : null
              friendActiveRounds.push({
                userId: player.user_id ?? player.id,
                userName: profile?.display_name ?? player.name,
                userAvatarUrl: profile?.avatar_url ?? null,
                roundId: courseId,
                courseName: course.name,
                holesPlayed: count,
                currentGross: gross,
                par: (holePars.get(courseId) ?? []).slice(0, count).reduce((a, b) => a + b, 0),
              })
            }
          }

          friendMatchGroups.sort((a, b) => b.holesPlayed - a.holesPlayed)
          friendActiveRounds.sort((a, b) => b.holesPlayed - a.holesPlayed)
        }

        // ── Recent Activity / Completed rounds (all trips including user's) ──
        const allTpIds = allFriendTps.map(tp => tp.id)
        const allTpToPlayer = new Map(allFriendTps.map(tp => [tp.id, tp.player_id]))

        const allFriendTripIds = [...new Set(allFriendTps.map(tp => tp.trip_id))]
        const { data: allFriendCourses } = allFriendTripIds.length > 0
          ? await supabase.from('courses').select('id, name, par, trip_id').in('trip_id', allFriendTripIds)
          : { data: [] }
        const allFriendCourseIds = (allFriendCourses ?? []).map(c => c.id)
        const allFriendCourseMap = new Map((allFriendCourses ?? []).map(c => [c.id, c]))

        if (allTpIds.length > 0 && allFriendCourseIds.length > 0) {
          const { data: allScores } = await supabase
            .from('round_scores')
            .select('trip_player_id, course_id, hole_id, gross_score, created_at')
            .in('trip_player_id', allTpIds)
            .in('course_id', allFriendCourseIds)

          const scoreMap = new Map<string, { count: number; gross: number; lastAt: string }>()
          for (const s of allScores ?? []) {
            const key = `${s.trip_player_id}::${s.course_id}`
            const cur = scoreMap.get(key) ?? { count: 0, gross: 0, lastAt: s.created_at ?? '' }
            scoreMap.set(key, {
              count: cur.count + 1,
              gross: cur.gross + (s.gross_score ?? 0),
              lastAt: (s.created_at ?? '') > cur.lastAt ? (s.created_at ?? '') : cur.lastAt,
            })
          }

          const completedEntries = [...scoreMap.entries()].filter(([, v]) => v.count === 18)

          if (completedEntries.length > 0) {
            const { data: handicaps } = await supabase
              .from('player_course_handicaps')
              .select('trip_player_id, course_id, handicap_strokes')
              .in('trip_player_id', allTpIds)
              .in('course_id', allFriendCourseIds)
            const handicapMap = new Map(
              (handicaps ?? []).map(h => [`${h.trip_player_id}::${h.course_id}`, h.handicap_strokes ?? 0])
            )

            const { data: matchData } = await supabase
              .from('matches')
              .select('id, format, point_value, course_id, match_players(trip_player_id, side)')
              .in('course_id', allFriendCourseIds)
              .eq('status', 'completed')

            // Fetch holes for recomputing match results
            const { data: completedHoles } = await supabase
              .from('holes')
              .select('id, course_id, hole_number, par, handicap_index')
              .in('course_id', allFriendCourseIds)
              .order('hole_number')

            type CompletedHoleInfo = { id: string; course_id: string; hole_number: number; par: number; handicap_index: number }
            const completedHolesByCourse = new Map<string, CompletedHoleInfo[]>()
            const holeParSum = new Map<string, number>()
            for (const h of completedHoles ?? []) {
              const arr = completedHolesByCourse.get(h.course_id) ?? []
              arr.push(h as CompletedHoleInfo)
              completedHolesByCourse.set(h.course_id, arr)
              holeParSum.set(h.course_id, (holeParSum.get(h.course_id) ?? 0) + h.par)
            }

            // Fetch scores + handicaps for ALL match players (including non-friends)
            const allMatchPlayerTpIds = [...new Set(
              (matchData ?? []).flatMap(m =>
                (m.match_players as { trip_player_id: string; side: string }[]).map(mp => mp.trip_player_id)
              )
            )]

            const [{ data: completedMatchScores }, { data: completedMatchHandicaps }] = allMatchPlayerTpIds.length > 0
              ? await Promise.all([
                  supabase.from('round_scores').select('trip_player_id, hole_id, gross_score, course_id')
                    .in('trip_player_id', allMatchPlayerTpIds).in('course_id', allFriendCourseIds),
                  supabase.from('player_course_handicaps').select('trip_player_id, course_id, handicap_strokes')
                    .in('trip_player_id', allMatchPlayerTpIds).in('course_id', allFriendCourseIds),
                ])
              : [{ data: [] }, { data: [] }]

            const completedHandicapMap = new Map(
              (completedMatchHandicaps ?? []).map(h => [`${h.trip_player_id}::${h.course_id}`, h.handicap_strokes ?? 0])
            )

            // Build matchLookup with recomputed results from live scores
            type MatchInfo = { formatLabel: string; result: string | null; won: boolean | null; pointValue: number }
            const matchLookup = new Map<string, MatchInfo>()
            for (const m of matchData ?? []) {
              const matchPlayersList = (m.match_players as { trip_player_id: string; side: string }[]).map(mp => ({
                trip_player_id: mp.trip_player_id,
                side: mp.side as 'team_a' | 'team_b',
              }))

              const courseHoles = completedHolesByCourse.get(m.course_id) ?? []

              let computedResult: string | null = null
              let computedLeader: 'team_a' | 'team_b' | 'tie' = 'tie'

              if (courseHoles.length > 0) {
                const playerStrokes = new Map<string, Map<number, number>>()
                const rawStrokes = matchPlayersList.map(mp => ({
                  id: mp.trip_player_id,
                  strokes: completedHandicapMap.get(`${mp.trip_player_id}::${m.course_id}`) ?? 0,
                }))
                const minStrokes = rawStrokes.length > 0 ? Math.min(...rawStrokes.map(p => p.strokes)) : 0
                for (const { id, strokes } of rawStrokes) {
                  playerStrokes.set(id, getStrokesPerHole(Math.max(0, strokes - minStrokes), courseHoles))
                }

                const matchTpIdSet = new Set(matchPlayersList.map(mp => mp.trip_player_id))
                const matchScores = (completedMatchScores ?? [])
                  .filter(s => s.course_id === m.course_id && matchTpIdSet.has(s.trip_player_id))
                  .map(s => ({ trip_player_id: s.trip_player_id, hole_id: s.hole_id, gross_score: s.gross_score }))

                const result = calculateMatchPlay(matchScores, matchPlayersList, courseHoles, playerStrokes, m.format as MatchFormat)
                computedResult = result.status
                computedLeader = result.leader
              }

              for (const mp of matchPlayersList) {
                if (!allTpIds.includes(mp.trip_player_id)) continue
                const key = `${mp.trip_player_id}::${m.course_id}`
                const won: boolean | null =
                  computedLeader === 'tie' ? null :
                  mp.side === computedLeader ? true : false
                matchLookup.set(key, {
                  formatLabel: FORMAT_LABELS[m.format] ?? m.format,
                  result: computedResult,
                  won,
                  pointValue: Number(m.point_value ?? 1),
                })
              }
            }

            for (const [key, { gross, lastAt }] of completedEntries) {
              const [tpId, courseId] = key.split('::')
              const playerId = allTpToPlayer.get(tpId)
              const player = playerId ? playerById.get(playerId) : null
              const course = allFriendCourseMap.get(courseId)
              if (!player || !course) continue

              const profile = player.user_id ? profileByUserId.get(player.user_id) : null
              const hdcp = handicapMap.get(key) ?? 0
              const matchInfo = matchLookup.get(key) ?? null
              const margin = matchInfo ? extractMargin(matchInfo.result) : null

              let matchResult: string | null = null
              if (matchInfo) {
                const resultStr = matchInfo.result?.trim() ?? null
                const loserStr = resultStr?.replace(/UP$/i, 'DN') ?? null
                if (matchInfo.won === true)  matchResult = resultStr ? `Won ${resultStr}` : 'Won'
                else if (matchInfo.won === false) matchResult = loserStr ? `Lost ${loserStr}` : 'Lost'
                else matchResult = 'Tied'
              }

              const earnings = matchInfo
                ? matchInfo.won === true  ? matchInfo.pointValue
                : matchInfo.won === false ? -matchInfo.pointValue
                : 0
                : null

              friendRounds.push({
                key,
                userId: player.user_id ?? player.id,
                courseId,
                playerName: profile?.display_name ?? player.name,
                playerAvatarUrl: profile?.avatar_url ?? null,
                courseName: course.name,
                tripName: activeTripNameMap.get(course.trip_id) ?? trip.name,
                par: holeParSum.get(courseId) ?? course.par ?? 72,
                grossScore: gross,
                netScore: gross - hdcp,
                matchFormatLabel: matchInfo?.formatLabel ?? null,
                matchResult,
                matchWon: matchInfo?.won ?? null,
                netEarnings: earnings,
                completedAt: lastAt,
                commentCount: 0,
                reactions: [],
              })
            }

            friendRounds.sort((a, b) => b.completedAt.localeCompare(a.completedAt))
          }
        }
      }
    }
  }

  // ── 7. Comment counts for friend rounds ────────────────────────────────────
  if (friendRounds.length > 0) {
    const roundKeys = friendRounds.map(r => r.key)
    const { data: commentRows } = await supabase
      .from('round_comments')
      .select('round_key')
      .in('round_key', roundKeys)

    const commentCounts = new Map<string, number>()
    for (const r of commentRows ?? []) {
      commentCounts.set(r.round_key, (commentCounts.get(r.round_key) ?? 0) + 1)
    }
    for (const r of friendRounds) {
      r.commentCount = commentCounts.get(r.key) ?? 0
    }
  }

  // ── 8. Reactions for friend rounds ──────────────────────────────────────
  if (friendRounds.length > 0) {
    const roundKeys = friendRounds.map(r => r.key)
    const { data: likeRows } = await supabase
      .from('round_likes')
      .select('round_key, user_id, emoji')
      .in('round_key', roundKeys)

    // Group by round_key + emoji
    const reactionMap = new Map<string, Map<string, string[]>>()
    for (const r of likeRows ?? []) {
      if (!reactionMap.has(r.round_key)) reactionMap.set(r.round_key, new Map())
      const emojiMap = reactionMap.get(r.round_key)!
      if (!emojiMap.has(r.emoji)) emojiMap.set(r.emoji, [])
      emojiMap.get(r.emoji)!.push(r.user_id)
    }
    for (const r of friendRounds) {
      const emojiMap = reactionMap.get(r.key)
      if (emojiMap) {
        r.reactions = [...emojiMap.entries()].map(([emoji, user_ids]) => ({
          emoji,
          count: user_ids.length,
          user_ids,
        }))
      }
    }
  }

  return { trip, teams, matches, activeRound, friendMatchGroups, friendActiveRounds, friendRounds, currentUserId: user?.id ?? null }
}
