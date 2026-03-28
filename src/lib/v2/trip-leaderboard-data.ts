import { createClient } from '@/lib/supabase/server'
import { calculateMatchPlay } from '@/lib/match-play'
import { getStrokesPerHole } from '@/lib/handicap'
import type { MatchFormat } from '@/lib/types'
import type {
  MatchV2,
  PlayerV2,
  TripRoundV2,
  TripRoundScoreV2,
  PlayerLeaderboardStats,
  HoleLeaderboardStats,
  SkinResultV2,
  TripEarningsRow,
  TripTeamV2,
} from './types'

// ─── Output type ──────────────────────────────────────────────────────────────

export interface TripLeaderboardData {
  matches: MatchV2[]
  rounds: TripRoundV2[]
  players: PlayerV2[]
  playerStats: PlayerLeaderboardStats[]
  roundScores: TripRoundScoreV2[]
  holeStatsByRound: Record<number, HoleLeaderboardStats[]>
  skinsByRound: Record<number, SkinResultV2[]>
  earnings: TripEarningsRow[]
  teams: TripTeamV2[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FORMAT_LABELS: Record<string, string> = {
  '2v2_best_ball':      '2v2 Best Ball',
  '1v1_stroke':         '1v1 Stroke Play',
  '1v1_match':          '1v1 Match Play',
  '2v2_alternate_shot': '2v2 Alt Shot',
}

function extractMargin(result: string | null): string | null {
  if (!result) return null
  const m = result.match(/won\s+(.+)$/i)
  if (m) return m[1].trim()
  // Bare result format (e.g. "3&2", "1UP", "AS", "2UP")
  return result.trim()
}

const TEAM_COLORS = ['#dc2626', '#2563eb', '#d97706', '#16a34a', '#7c3aed', '#0891b2']

// ─── Main fetcher ─────────────────────────────────────────────────────────────

export async function getTripLeaderboardData(tripId: string): Promise<TripLeaderboardData> {
  const supabase = await createClient()

  const empty: TripLeaderboardData = {
    matches: [], rounds: [], players: [], playerStats: [],
    roundScores: [], holeStatsByRound: {}, skinsByRound: {},
    earnings: [], teams: [],
  }

  // ── 1. Courses ──────────────────────────────────────────────────────────────
  const { data: courses } = await supabase
    .from('courses')
    .select('id, name, par, round_number, round_date')
    .eq('trip_id', tripId)
    .order('round_number')

  if (!courses || courses.length === 0) return empty

  const courseIds = courses.map(c => c.id)
  const courseMap = new Map(courses.map(c => [c.id, c]))
  const courseByRound = new Map(courses.map(c => [c.round_number as number, c]))

  // ── 2. Rounds (TripRoundV2) ─────────────────────────────────────────────────
  const rounds: TripRoundV2[] = courses.map(c => ({
    roundNumber: c.round_number as number,
    courseId: c.id,
    courseName: c.name,
    par: c.par ?? 72,
    date: c.round_date ?? undefined,
  }))

  // ── 3. Trip players + player info ───────────────────────────────────────────
  const { data: tripPlayers } = await supabase
    .from('trip_players')
    .select('id, player_id, players(id, name, handicap_index)')
    .eq('trip_id', tripId)

  if (!tripPlayers || tripPlayers.length === 0) return { ...empty, rounds }

  const tpList = tripPlayers.map(tp => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = tp.players as any
    const pr = Array.isArray(raw) ? raw[0] : raw
    return { tpId: tp.id, playerId: pr?.id ?? '', name: pr?.name ?? 'Unknown', handicap: pr?.handicap_index ?? null }
  })
  const tpIds = tpList.map(t => t.tpId)
  const playerIdByTpId = new Map(tpList.map(t => [t.tpId, t.playerId]))
  const playerByPlayerId = new Map(tpList.map(t => [t.playerId, t]))
  const playerByTpId = new Map(tpList.map(t => [t.tpId, t]))

  const players: PlayerV2[] = tpList.map(t => ({
    id: t.playerId,
    name: t.name,
    avatarUrl: null,
    handicap: t.handicap,
    location: null,
  }))

  // ── 4. Teams ────────────────────────────────────────────────────────────────
  const { data: teamRows } = await supabase
    .from('teams')
    .select(`
      id, name,
      team_players(
        trip_player_id,
        trip_players(
          id,
          players(id, name, handicap_index)
        )
      )
    `)
    .eq('trip_id', tripId)

  const tripPlayerToTeam = new Map<string, string>()
  const teams: TripTeamV2[] = []

  for (const t of (teamRows ?? [])) {
    const teamPlayers: PlayerV2[] = []
    for (const tp of t.team_players ?? []) {
      const pr = (tp.trip_players as { players?: { id: string; name: string; handicap_index: number | null } | null } | null)?.players
      if (pr) {
        teamPlayers.push({ id: pr.id, name: pr.name, avatarUrl: null, handicap: pr.handicap_index, location: null })
      }
      tripPlayerToTeam.set(tp.trip_player_id, t.name)
    }
    teams.push({ name: t.name, color: '', players: teamPlayers })
  }

  // Assign colors for all teams
  teams.forEach((t, i) => { t.color = TEAM_COLORS[i % TEAM_COLORS.length] })

  // ── 5. Matches → MatchV2[] ──────────────────────────────────────────────────
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
    .in('trip_player_id', tpIds)
    .in('course_id', courseIds)

  const grossDiffMap = new Map<string, number>()
  for (const rs of roundStats ?? []) {
    if (rs.gross_total != null && rs.par_total != null) {
      grossDiffMap.set(`${rs.trip_player_id}::${rs.course_id}`, rs.gross_total - rs.par_total)
    }
  }

  const matches: MatchV2[] = (matchRows ?? []).map(m => {
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
      tripId,
      teeTime: null,
      thru: null,
      pointValue: pv,
      resultMargin: extractMargin(m.result),
    } satisfies MatchV2
  })

  // ── 5b. Recompute match play status & scoreDiffs from actual scores ─────────
  // Use actual round_scores + calculateMatchPlay for ALL matches (not just
  // in-progress) so the leaderboard always agrees with the scorecard.
  const scoredMatches = matches.filter(m => m.status === 'in_progress' || m.status === 'completed')
  if (scoredMatches.length > 0) {
    const smCourseIds = [...new Set(scoredMatches.map(m => m.courseId))]

    const [{ data: smHoles }, { data: smScores }, { data: smHandicaps }] = await Promise.all([
      supabase.from('holes').select('id, course_id, hole_number, par, handicap_index').in('course_id', smCourseIds).order('hole_number'),
      supabase.from('round_scores').select('trip_player_id, hole_id, gross_score, course_id').in('course_id', smCourseIds),
      supabase.from('player_course_handicaps').select('trip_player_id, course_id, handicap_strokes').in('course_id', smCourseIds),
    ])

    const smHandicapMap = new Map(
      (smHandicaps ?? []).map(h => [`${h.trip_player_id}::${h.course_id}`, h.handicap_strokes ?? 0])
    )

    type HoleInfo = { id: string; course_id: string; hole_number: number; par: number; handicap_index: number }
    const smHolesByCourse = new Map<string, HoleInfo[]>()
    for (const h of smHoles ?? []) {
      const arr = smHolesByCourse.get(h.course_id) ?? []
      arr.push(h as HoleInfo)
      smHolesByCourse.set(h.course_id, arr)
    }

    for (const match of scoredMatches) {
      const courseHoles = smHolesByCourse.get(match.courseId) ?? []
      if (courseHoles.length === 0) continue

      const matchRow = (matchRows ?? []).find(mr => mr.id === match.id)
      if (!matchRow) continue

      const matchPlayersList: { trip_player_id: string; side: 'team_a' | 'team_b' }[] = []
      for (const mp of matchRow.match_players ?? []) {
        matchPlayersList.push({ trip_player_id: mp.trip_player_id, side: mp.side as 'team_a' | 'team_b' })
      }

      // Build playerStrokes map for this match (adjusted relative to low player)
      const playerStrokes = new Map<string, Map<number, number>>()
      const rawMatchStrokes = matchPlayersList.map(mp => ({
        id: mp.trip_player_id,
        strokes: smHandicapMap.get(`${mp.trip_player_id}::${match.courseId}`) ?? 0,
      }))
      const minMatchStrokes = rawMatchStrokes.length > 0 ? Math.min(...rawMatchStrokes.map(p => p.strokes)) : 0
      for (const { id, strokes } of rawMatchStrokes) {
        playerStrokes.set(id, getStrokesPerHole(Math.max(0, strokes - minMatchStrokes), courseHoles))
      }

      // Filter scores for this match's course and players
      const matchTpIds = new Set(matchPlayersList.map(mp => mp.trip_player_id))
      const matchScores = (smScores ?? [])
        .filter(s => s.course_id === match.courseId && matchTpIds.has(s.trip_player_id))
        .map(s => ({ trip_player_id: s.trip_player_id, hole_id: s.hole_id, gross_score: s.gross_score }))

      if (matchScores.length === 0) continue

      const result = calculateMatchPlay(
        matchScores,
        matchPlayersList,
        courseHoles,
        playerStrokes,
        match.format as MatchFormat,
      )

      // Update the match with computed status
      match.resultMargin = result.status
      match.thru = result.holesPlayed
      match.liveLeader = result.leader
      match.statusLabel = match.status === 'completed' ? null : result.isComplete ? 'Final' : `Thru ${result.holesPlayed}`

      // Update points from computed result so standings stay in sync with scores
      if (result.isComplete) {
        match.teamA.points = result.teamAPoints * match.pointValue
        match.teamB.points = result.teamBPoints * match.pointValue
      }

      // Compute player scoreDiffs from actual scores
      const holeIdToParMap = new Map(courseHoles.map(h => [h.id, h.par]))
      const matchScoresByTp = new Map<string, typeof matchScores>()
      for (const s of matchScores) {
        const arr = matchScoresByTp.get(s.trip_player_id) ?? []
        arr.push(s)
        matchScoresByTp.set(s.trip_player_id, arr)
      }

      const aTpIds2: string[] = []
      const bTpIds2: string[] = []
      for (const mp of matchRow.match_players ?? []) {
        if (mp.side === 'team_a') aTpIds2.push(mp.trip_player_id)
        else bTpIds2.push(mp.trip_player_id)
      }

      const computeDiff = (tpId: string): number | null => {
        const scores = matchScoresByTp.get(tpId) ?? []
        if (scores.length === 0) return null
        let grossSum = 0, parSum = 0
        for (const s of scores) {
          if (s.gross_score == null) continue
          const par = holeIdToParMap.get(s.hole_id) ?? 0
          grossSum += s.gross_score
          parSum += par
        }
        return parSum > 0 ? grossSum - parSum : null
      }

      match.teamA.scoreDiffs = aTpIds2.map(computeDiff)
      match.teamB.scoreDiffs = bTpIds2.map(computeDiff)
    }
  }

  // ── Pre-fetch holes (needed for completion check + section 8) ──────────────
  const { data: holes } = await supabase
    .from('holes')
    .select('id, course_id, hole_number, par, handicap_index')
    .in('course_id', courseIds)
    .order('hole_number')

  const holesByCourse = new Map<string, typeof holes>()
  for (const h of holes ?? []) {
    const arr = holesByCourse.get(h.course_id) ?? []
    arr.push(h)
    holesByCourse.set(h.course_id, arr)
  }

  const holeCountByCourse = new Map<string, number>()
  for (const [courseId, courseHoles] of holesByCourse) {
    holeCountByCourse.set(courseId, courseHoles!.length)
  }

  // ── 6. Round scores (TripRoundScoreV2) ──────────────────────────────────────
  const { data: allRoundStats } = await supabase
    .from('round_stats')
    .select('trip_player_id, course_id, gross_total, net_total, holes_played')
    .in('trip_player_id', tpIds)
    .in('course_id', courseIds)

  const roundScores: TripRoundScoreV2[] = (allRoundStats ?? [])
    .filter(rs => {
      const total = holeCountByCourse.get(rs.course_id) ?? 18
      return (rs.holes_played ?? 0) >= total
    })
    .map(rs => {
    const course = courseMap.get(rs.course_id)
    const playerId = playerIdByTpId.get(rs.trip_player_id) ?? ''
    return {
      playerId,
      roundNumber: course?.round_number ?? 0,
      grossScore: rs.gross_total,
      netScore: rs.net_total,
      par: course?.par ?? 72,
    }
  })

  // Build min holes played per course — all trip players must have a round_stats row,
  // otherwise min is 0 (not all players have started).
  const minHolesPlayedByCourse = new Map<string, number>()
  const totalPlayers = tpIds.length
  for (const courseId of courseIds) {
    const courseStats = (allRoundStats ?? []).filter(rs => rs.course_id === courseId)
    if (courseStats.length < totalPlayers) {
      minHolesPlayedByCourse.set(courseId, 0)
    } else {
      const minPlayed = Math.min(...courseStats.map(rs => rs.holes_played ?? 0))
      minHolesPlayedByCourse.set(courseId, minPlayed)
    }
  }

  // ── 7. Player stats (PlayerLeaderboardStats) ───────────────────────────────
  // Match records — derived from recomputed match data (matches array) so they
  // agree with the scorecards, rather than relying on DB winner_side.
  type RecordInfo = { wins: number; losses: number; ties: number; points: number }
  const recordByTp = new Map<string, RecordInfo>()

  for (const m of matches) {
    if (m.status !== 'completed') continue
    const leader = m.liveLeader ?? (m.teamA.points > m.teamB.points ? 'team_a' : m.teamB.points > m.teamA.points ? 'team_b' : 'tie')

    // Find the match_players row to get trip_player_id → side mapping
    const matchRow = (matchRows ?? []).find(mr => mr.id === m.id)
    if (!matchRow) continue

    for (const mp of matchRow.match_players ?? []) {
      const rec = recordByTp.get(mp.trip_player_id) ?? { wins: 0, losses: 0, ties: 0, points: 0 }
      if (leader === 'tie') {
        rec.ties++
        rec.points += m.pointValue / 2
      } else if (leader === mp.side) {
        rec.wins++
        rec.points += m.pointValue
      } else {
        rec.losses++
      }
      recordByTp.set(mp.trip_player_id, rec)
    }
  }

  // Fairway/GIR/Putts from round_stats
  const { data: detailedStats } = await supabase
    .from('round_stats')
    .select('trip_player_id, gross_total, net_total, par_total, holes_played, fairways_hit, fairways_total, greens_in_regulation, total_putts')
    .in('trip_player_id', tpIds)
    .in('course_id', courseIds)

  type StatAgg = {
    grossSum: number; netSum: number; parSum: number; rounds: number
    fwPctSum: number; fwRounds: number
    girPctSum: number; girRounds: number
    puttsSum: number; puttsRounds: number
  }
  const statsByTp = new Map<string, StatAgg>()

  for (const s of detailedStats ?? []) {
    if ((s.holes_played ?? 0) < 18) continue
    const cur = statsByTp.get(s.trip_player_id) ?? { grossSum: 0, netSum: 0, parSum: 0, rounds: 0, fwPctSum: 0, fwRounds: 0, girPctSum: 0, girRounds: 0, puttsSum: 0, puttsRounds: 0 }
    cur.grossSum += s.gross_total ?? 0
    cur.netSum += s.net_total ?? 0
    cur.parSum += s.par_total ?? 0
    cur.rounds++
    if ((s.fairways_total ?? 0) > 0) {
      cur.fwPctSum += (s.fairways_hit / s.fairways_total) * 100
      cur.fwRounds++
    }
    if ((s.holes_played ?? 0) > 0) {
      cur.girPctSum += (s.greens_in_regulation / s.holes_played) * 100
      cur.girRounds++
    }
    if ((s.total_putts ?? 0) > 0) {
      cur.puttsSum += s.total_putts
      cur.puttsRounds++
    }
    statsByTp.set(s.trip_player_id, cur)
  }

  const playerStats: PlayerLeaderboardStats[] = tpList.map(t => {
    const rec = recordByTp.get(t.tpId) ?? { wins: 0, losses: 0, ties: 0, points: 0 }
    const agg = statsByTp.get(t.tpId)

    return {
      player: { id: t.playerId, name: t.name, avatarUrl: null, handicap: t.handicap, location: null },
      matchRecord: { wins: rec.wins, losses: rec.losses, ties: rec.ties },
      points: rec.points,
      grossAvg: agg && agg.rounds > 0 ? parseFloat((agg.grossSum / agg.rounds).toFixed(1)) : null,
      netAvg: agg && agg.rounds > 0 ? parseFloat((agg.netSum / agg.rounds).toFixed(1)) : null,
      skinsWon: 0, // patched after skinsByRound is computed
      fairwayPct: agg && agg.fwRounds > 0 ? Math.round(agg.fwPctSum / agg.fwRounds) : null,
      girPct: agg && agg.girRounds > 0 ? Math.round(agg.girPctSum / agg.girRounds) : null,
      puttsAvg: agg && agg.puttsRounds > 0 ? parseFloat((agg.puttsSum / agg.puttsRounds).toFixed(1)) : null,
    }
  })

  // ── 8. Hole stats by round (HoleLeaderboardStats) ──────────────────────────
  const { data: allScores } = await supabase
    .from('round_scores')
    .select('course_id, hole_id, trip_player_id, gross_score, fairway_hit, gir, putts')
    .in('trip_player_id', tpIds)
    .in('course_id', courseIds)

  // Handicap strokes per player per course
  const { data: handicaps } = await supabase
    .from('player_course_handicaps')
    .select('trip_player_id, course_id, handicap_strokes')
    .in('trip_player_id', tpIds)
    .in('course_id', courseIds)

  const handicapMap = new Map(
    (handicaps ?? []).map(h => [`${h.trip_player_id}::${h.course_id}`, h.handicap_strokes ?? 0])
  )

  // Build handicap strokes per hole for each player/course
  function getPlayerHoleStrokes(courseId: string, tpId: string): Map<number, number> {
    const totalStrokes = handicapMap.get(`${tpId}::${courseId}`) ?? 0
    const courseHoles = (holesByCourse.get(courseId) ?? []).slice().sort((a, b) => (a.handicap_index ?? 18) - (b.handicap_index ?? 18))
    const strokesMap = new Map<number, number>()
    for (const h of courseHoles) {
      strokesMap.set(h.hole_number, 0)
    }
    let remaining = totalStrokes
    // Distribute strokes by handicap index (lowest handicap_index gets strokes first)
    for (const h of courseHoles) {
      if (remaining <= 0) break
      strokesMap.set(h.hole_number, (strokesMap.get(h.hole_number) ?? 0) + 1)
      remaining--
    }
    // Second pass for strokes > 18
    if (remaining > 0) {
      for (const h of courseHoles) {
        if (remaining <= 0) break
        strokesMap.set(h.hole_number, (strokesMap.get(h.hole_number) ?? 0) + 1)
        remaining--
      }
    }
    return strokesMap
  }

  // Group scores by hole_id
  const scoresByHole = new Map<string, { trip_player_id: string; course_id: string; gross_score: number; fairway_hit: boolean | null; gir: boolean | null; putts: number | null }[]>()
  for (const s of allScores ?? []) {
    if (s.gross_score == null) continue
    const arr = scoresByHole.get(s.hole_id) ?? []
    arr.push({ trip_player_id: s.trip_player_id, course_id: s.course_id, gross_score: s.gross_score, fairway_hit: s.fairway_hit, gir: s.gir, putts: s.putts })
    scoresByHole.set(s.hole_id, arr)
  }

  const holeStatsByRound: Record<number, HoleLeaderboardStats[]> = {}

  for (const course of courses) {
    const roundNum = course.round_number as number
    const courseHoles = (holesByCourse.get(course.id) ?? []).slice().sort((a, b) => a.hole_number - b.hole_number)
    if (courseHoles.length === 0) continue

    holeStatsByRound[roundNum] = courseHoles.map(h => {
      const hScores = scoresByHole.get(h.id) ?? []
      const minPlayed = minHolesPlayedByCourse.get(course.id) ?? 0
      if (hScores.length === 0 || h.hole_number > minPlayed) {
        return {
          holeNumber: h.hole_number, par: h.par, handicapIndex: h.handicap_index ?? 0,
          avgGross: null, avgNet: null, birdiesOrBetter: 0, pars: 0, bogeysOrWorse: 0,
          fairwayPct: null, girPct: null, avgPutts: null,
        }
      }

      const grosses = hScores.map(s => s.gross_score)
      const avgGross = parseFloat((grosses.reduce((s, v) => s + v, 0) / grosses.length).toFixed(1))

      // Compute net scores using handicap strokes
      const netScores = hScores.map(s => {
        const strokesMap = getPlayerHoleStrokes(s.course_id, s.trip_player_id)
        return s.gross_score - (strokesMap.get(h.hole_number) ?? 0)
      })
      const avgNet = parseFloat((netScores.reduce((s, v) => s + v, 0) / netScores.length).toFixed(1))

      let birdiesOrBetter = 0, pars = 0, bogeysOrWorse = 0
      for (const g of grosses) {
        const diff = g - h.par
        if (diff <= -1) birdiesOrBetter++
        else if (diff === 0) pars++
        else bogeysOrWorse++
      }

      const fwHits = hScores.filter(s => s.fairway_hit !== null)
      const girHits = hScores.filter(s => s.gir !== null)
      const puttScores = hScores.filter(s => s.putts !== null)

      return {
        holeNumber: h.hole_number,
        par: h.par,
        handicapIndex: h.handicap_index ?? 0,
        avgGross,
        avgNet,
        birdiesOrBetter,
        pars,
        bogeysOrWorse,
        fairwayPct: fwHits.length > 0 ? Math.round((fwHits.filter(s => s.fairway_hit).length / fwHits.length) * 100) : null,
        girPct: girHits.length > 0 ? Math.round((girHits.filter(s => s.gir).length / girHits.length) * 100) : null,
        avgPutts: puttScores.length > 0 ? parseFloat((puttScores.reduce((s, v) => s + (v.putts ?? 0), 0) / puttScores.length).toFixed(1)) : null,
      }
    })
  }

  // ── 9. Skins by round ──────────────────────────────────────────────────────
  const skinsByRound: Record<number, SkinResultV2[]> = {}

  for (const course of courses) {
    const roundNum = course.round_number as number
    const courseHoles = (holesByCourse.get(course.id) ?? []).slice().sort((a, b) => a.hole_number - b.hole_number)
    if (courseHoles.length === 0) continue

    const minPlayed = minHolesPlayedByCourse.get(course.id) ?? 0

    skinsByRound[roundNum] = courseHoles.map(h => {
      const hScores = scoresByHole.get(h.id) ?? []
      if (hScores.length < 2 || h.hole_number > minPlayed) {
        return { holeNumber: h.hole_number, par: h.par, winnerId: null, winnerName: null, grossScore: null, netScore: null }
      }

      // Find lowest net score
      const withNet = hScores.map(s => {
        const strokesMap = getPlayerHoleStrokes(s.course_id, s.trip_player_id)
        const net = s.gross_score - (strokesMap.get(h.hole_number) ?? 0)
        return { ...s, net }
      })

      withNet.sort((a, b) => a.net - b.net)
      const bestNet = withNet[0].net
      const winners = withNet.filter(s => s.net === bestNet)

      if (winners.length === 1) {
        const w = winners[0]
        const playerInfo = playerByTpId.get(w.trip_player_id)
        return {
          holeNumber: h.hole_number,
          par: h.par,
          winnerId: playerInfo?.playerId ?? null,
          winnerName: playerInfo?.name ?? null,
          grossScore: w.gross_score,
          netScore: w.net,
        }
      }

      // Tiebreaker: gross birdie (or better) trumps net-only birdie
      const grossUnderPar = winners.filter(s => s.gross_score < h.par)
      if (grossUnderPar.length === 1) {
        const w = grossUnderPar[0]
        const playerInfo = playerByTpId.get(w.trip_player_id)
        return {
          holeNumber: h.hole_number,
          par: h.par,
          winnerId: playerInfo?.playerId ?? null,
          winnerName: playerInfo?.name ?? null,
          grossScore: w.gross_score,
          netScore: w.net,
        }
      }

      // Still tied — no winner
      return { holeNumber: h.hole_number, par: h.par, winnerId: null, winnerName: null, grossScore: null, netScore: null }
    })
  }

  // Patch skinsWon on playerStats from computed skinsByRound
  const skinsCountByPlayerId = new Map<string, number>()
  for (const skins of Object.values(skinsByRound)) {
    for (const s of skins) {
      if (s.winnerId) {
        skinsCountByPlayerId.set(s.winnerId, (skinsCountByPlayerId.get(s.winnerId) ?? 0) + 1)
      }
    }
  }
  for (const ps of playerStats) {
    ps.skinsWon = skinsCountByPlayerId.get(ps.player.id) ?? 0
  }

  // ── 10. Earnings from settlement_ledger ─────────────────────────────────────
  const { data: ledger } = await supabase
    .from('settlement_ledger')
    .select('trip_player_id, description, amount')
    .eq('trip_id', tripId)
    .eq('source_type', 'game_result')

  const earningsByTp = new Map<string, { team: number; matches: number; skins: number }>()

  for (const entry of ledger ?? []) {
    const cur = earningsByTp.get(entry.trip_player_id) ?? { team: 0, matches: 0, skins: 0 }
    const amt = Number(entry.amount ?? 0)
    const desc = (entry.description ?? '').toLowerCase()

    if (desc.includes('team')) {
      cur.team += amt
    } else if (desc.includes('skin')) {
      cur.skins += amt
    } else {
      cur.matches += amt
    }
    earningsByTp.set(entry.trip_player_id, cur)
  }

  const hasTeamEarnings = [...earningsByTp.values()].some(e => e.team !== 0)

  const earnings: TripEarningsRow[] = tpList.map(t => {
    const e = earningsByTp.get(t.tpId) ?? { team: 0, matches: 0, skins: 0 }
    return {
      player: { id: t.playerId, name: t.name, avatarUrl: null, handicap: t.handicap, location: null },
      team: hasTeamEarnings ? e.team : null,
      matches: e.matches,
      skins: e.skins,
      netTotal: (hasTeamEarnings ? e.team : 0) + e.matches + e.skins,
    }
  })

  return {
    matches, rounds, players, playerStats, roundScores,
    holeStatsByRound, skinsByRound, earnings, teams,
  }
}
