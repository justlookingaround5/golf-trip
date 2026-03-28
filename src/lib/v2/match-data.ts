import { createClient } from '@/lib/supabase/server'
import type { MatchV2, PlayerV2, ScorecardV2, ScorecardPlayerV2, HoleScoreV2 } from './types'

const FORMAT_LABELS: Record<string, string> = {
  '2v2_best_ball': '2v2 Best Ball',
  '1v1_stroke': '1v1 Stroke Play',
  '1v1_match': '1v1 Match Play',
  '2v2_alternate_shot': '2v2 Alt Shot',
}

export interface MatchScorecardData {
  match: MatchV2
  scorecard: ScorecardV2
}

export async function getMatchScorecard(matchId: string): Promise<MatchScorecardData | null> {
  const supabase = await createClient()

  // Get match with players
  const { data: match } = await supabase
    .from('matches')
    .select(`
      id, format, status, result, winner_side, point_value, course_id,
      match_players(
        side, trip_player_id,
        trip_players(
          id,
          players(id, name, handicap_index, user_id)
        )
      )
    `)
    .eq('id', matchId)
    .maybeSingle()

  if (!match) return null

  // Get course + trip
  const { data: course } = await supabase
    .from('courses')
    .select('id, name, par, trip_id, round_number, round_date')
    .eq('id', match.course_id)
    .maybeSingle()

  if (!course) return null

  const { data: trip } = await supabase
    .from('trips')
    .select('id, name')
    .eq('id', course.trip_id)
    .maybeSingle()

  // Resolve display names
  const playerUserIds: string[] = []
  for (const mp of match.match_players ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tp = mp.trip_players as any
    const p = tp?.players
    if (p?.user_id) playerUserIds.push(p.user_id)
  }

  const displayNameMap = new Map<string, string>()
  if (playerUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from('player_profiles')
      .select('user_id, display_name')
      .in('user_id', playerUserIds)
    for (const p of profiles ?? []) {
      if (p.display_name) displayNameMap.set(p.user_id, p.display_name)
    }
  }

  // Build match teams
  const aPlayers: PlayerV2[] = []
  const bPlayers: PlayerV2[] = []
  const allTpIds: string[] = []

  for (const mp of match.match_players ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tp = mp.trip_players as any
    const p = tp?.players
    if (!p) continue
    const name = (p.user_id ? displayNameMap.get(p.user_id) : undefined) ?? p.name
    const pv2: PlayerV2 = { id: p.user_id ?? p.id, name, avatarUrl: null, handicap: p.handicap_index, location: null }
    if (mp.side === 'team_a') aPlayers.push(pv2)
    else bPlayers.push(pv2)
    allTpIds.push(tp.id)
  }

  const pv = Number(match.point_value ?? 1)
  const aPoints = match.winner_side === 'team_a' ? pv : match.winner_side === 'tie' ? pv / 2 : 0
  const bPoints = match.winner_side === 'team_b' ? pv : match.winner_side === 'tie' ? pv / 2 : 0

  const matchV2: MatchV2 = {
    id: match.id,
    roundNumber: course.round_number ?? 0,
    format: match.format,
    formatLabel: FORMAT_LABELS[match.format] ?? match.format,
    status: match.status as MatchV2['status'],
    teamA: { name: 'Team A', players: aPlayers, points: aPoints, scoreDiffs: [] },
    teamB: { name: 'Team B', players: bPlayers, points: bPoints, scoreDiffs: [] },
    result: match.result,
    statusLabel: match.status === 'completed' ? null : match.status === 'in_progress' ? 'Live' : 'Upcoming',
    courseId: match.course_id,
    courseName: course.name,
    tripId: course.trip_id,
    teeTime: null,
    thru: null,
    pointValue: pv,
    resultMargin: null,
  }

  // Build scorecard from match scores (scores table)
  const { data: holes } = await supabase
    .from('holes')
    .select('id, hole_number, par, handicap_index, yardage')
    .eq('course_id', match.course_id)
    .order('hole_number')

  // Get handicaps
  const { data: handicaps } = await supabase
    .from('player_course_handicaps')
    .select('trip_player_id, handicap_strokes')
    .eq('course_id', match.course_id)
    .in('trip_player_id', allTpIds)

  const handicapMap = new Map((handicaps ?? []).map(h => [h.trip_player_id, h.handicap_strokes ?? 0]))

  // Try match scores first, fallback to round_scores
  const { data: matchScores } = await supabase
    .from('scores')
    .select('trip_player_id, hole_id, gross_score, fairway_hit, gir, putts')
    .eq('match_id', matchId)

  let scoreData = matchScores
  if (!scoreData || scoreData.length === 0) {
    const { data: roundScores } = await supabase
      .from('round_scores')
      .select('trip_player_id, hole_id, gross_score, fairway_hit, gir, putts')
      .eq('course_id', match.course_id)
      .in('trip_player_id', allTpIds)
    scoreData = roundScores
  }

  const scoreMap = new Map<string, Map<string, { gross: number; fairway: boolean | null; gir: boolean | null; putts: number | null }>>()
  for (const s of scoreData ?? []) {
    if (!scoreMap.has(s.trip_player_id)) scoreMap.set(s.trip_player_id, new Map())
    scoreMap.get(s.trip_player_id)!.set(s.hole_id, {
      gross: s.gross_score,
      fairway: s.fairway_hit,
      gir: s.gir,
      putts: s.putts,
    })
  }

  // Build scorecard players
  const scorecardPlayers: ScorecardPlayerV2[] = (match.match_players ?? []).map(mp => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tp = mp.trip_players as any
    const p = tp?.players
    const name = (p?.user_id ? displayNameMap.get(p.user_id) : undefined) ?? p?.name ?? 'Unknown'
    const hdcp = handicapMap.get(tp?.id) ?? 0

    const player: PlayerV2 = {
      id: p?.user_id ?? p?.id ?? '',
      name,
      avatarUrl: null,
      handicap: p?.handicap_index ?? null,
      location: null,
    }

    const pScores = scoreMap.get(tp?.id) ?? new Map()
    const holeScores: HoleScoreV2[] = (holes ?? []).map(h => {
      const s = pScores.get(h.id)
      return {
        holeId: h.id,
        holeNumber: h.hole_number,
        par: h.par,
        handicapIndex: h.handicap_index,
        gross: s?.gross ?? null,
        net: s ? s.gross - (h.handicap_index <= hdcp ? 1 : 0) : null,
        fairwayHit: s?.fairway ?? null,
        gir: s?.gir ?? null,
        putts: s?.putts ?? null,
        yardage: (h.yardage && typeof h.yardage === 'object' && Object.keys(h.yardage).length > 0) ? h.yardage as Record<string, number> : null,
      }
    })

    const grossTotal = holeScores.reduce((sum, h) => sum + (h.gross ?? 0), 0)
    const hasAnyScore = holeScores.some(h => h.gross !== null)

    return {
      player,
      holes: holeScores,
      grossTotal: hasAnyScore ? grossTotal : null,
      netTotal: hasAnyScore ? grossTotal - hdcp : null,
    }
  })

  const scorecard: ScorecardV2 = {
    courseId: match.course_id,
    courseName: course.name,
    date: course.round_date ?? '',
    par: course.par ?? 72,
    roundNumber: course.round_number ?? null,
    players: scorecardPlayers,
  }

  return { match: matchV2, scorecard }
}
