import { createClient } from '@/lib/supabase/server'
import type { ScorecardV2, ScorecardPlayerV2, HoleScoreV2, PlayerV2 } from './types'

/**
 * Get scorecard for a course (roundId = courseId per design).
 * If userId is provided, returns only that user's scores.
 * If omitted, returns all players' scores.
 */
export async function getRoundScorecard(courseId: string, userId?: string): Promise<ScorecardV2 | null> {
  const supabase = await createClient()

  // Get course + trip info
  const { data: course } = await supabase
    .from('courses')
    .select('id, name, par, trip_id, round_number, round_date')
    .eq('id', courseId)
    .maybeSingle()

  if (!course) return null

  const { data: trip } = await supabase
    .from('trips')
    .select('name')
    .eq('id', course.trip_id)
    .maybeSingle()

  // Get holes
  const { data: holes } = await supabase
    .from('holes')
    .select('id, hole_number, par, handicap_index, yardage')
    .eq('course_id', courseId)
    .order('hole_number')

  if (!holes || holes.length === 0) return null

  // Get trip_players (optionally filtered to a specific user)
  let tpQuery = supabase
    .from('trip_players')
    .select('id, player:players(id, name, handicap_index, user_id)')
    .eq('trip_id', course.trip_id)

  const { data: tripPlayers } = await tpQuery

  // If filtering by userId, find the user's group (match players or just the user)
  let filteredTps = tripPlayers ?? []
  let userMatch: { id: string; match_players: { trip_player_id: string }[] | null } | undefined
  if (userId) {
    // Find the user's trip_player
    const userTp = filteredTps.find(tp => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = Array.isArray(tp.player) ? tp.player[0] : tp.player as any
      return p?.user_id === userId
    })

    if (userTp) {
      // Check if the user is in a match on this course
      const { data: matchRows } = await supabase
        .from('matches')
        .select('id, match_players(trip_player_id)')
        .eq('course_id', courseId)

      userMatch = (matchRows ?? []).find(m =>
        (m.match_players ?? []).some(
          (mp: { trip_player_id: string }) => mp.trip_player_id === userTp.id
        )
      )

      if (userMatch) {
        // Filter to all players in this match
        const matchTpIds = new Set(
          (userMatch.match_players ?? []).map((mp: { trip_player_id: string }) => mp.trip_player_id)
        )
        filteredTps = filteredTps.filter(tp => matchTpIds.has(tp.id))
      } else {
        // No match — show only this user
        filteredTps = [userTp]
      }
    } else {
      filteredTps = []
    }
  }

  if (filteredTps.length === 0 && userId) {
    // No trip_player found for this user on this course
    return {
      courseId,
      courseName: course.name,
      date: course.round_date ?? '',
      par: course.par ?? 72,
      roundNumber: course.round_number ?? null,
      players: [],
    }
  }

  const tpIds = filteredTps.map(tp => tp.id)

  // Resolve display names
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerUserIds = filteredTps.map(tp => {
    const p = Array.isArray(tp.player) ? tp.player[0] : tp.player as any
    return p?.user_id as string | undefined
  }).filter(Boolean) as string[]

  const displayNameMap = new Map<string, string>()
  if (playerUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from('player_profiles')
      .select('user_id, display_name, avatar_url')
      .in('user_id', playerUserIds)
    for (const p of profiles ?? []) {
      if (p.display_name) displayNameMap.set(p.user_id, p.display_name)
    }
  }

  // Get handicap strokes
  const { data: handicaps } = await supabase
    .from('player_course_handicaps')
    .select('trip_player_id, handicap_strokes')
    .eq('course_id', courseId)
    .in('trip_player_id', tpIds)

  const handicapMap = new Map((handicaps ?? []).map(h => [h.trip_player_id, h.handicap_strokes ?? 0]))

  // Get round_scores
  const { data: scores } = await supabase
    .from('round_scores')
    .select('trip_player_id, hole_id, gross_score, fairway_hit, gir, putts')
    .eq('course_id', courseId)
    .in('trip_player_id', tpIds)

  // Build score lookup: tpId → holeId → score
  const scoreMap = new Map<string, Map<string, { gross: number; fairway: boolean | null; gir: boolean | null; putts: number | null }>>()
  for (const s of scores ?? []) {
    if (!scoreMap.has(s.trip_player_id)) scoreMap.set(s.trip_player_id, new Map())
    scoreMap.get(s.trip_player_id)!.set(s.hole_id, {
      gross: s.gross_score,
      fairway: s.fairway_hit,
      gir: s.gir,
      putts: s.putts,
    })
  }

  // Build players
  const players: ScorecardPlayerV2[] = filteredTps.map(tp => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = Array.isArray(tp.player) ? tp.player[0] : tp.player as any
    const pUserId = p?.user_id as string | undefined
    const displayName = (pUserId ? displayNameMap.get(pUserId) : undefined) ?? p?.name ?? 'Unknown'
    const hdcp = handicapMap.get(tp.id) ?? 0

    const player: PlayerV2 = {
      id: pUserId ?? p?.id ?? tp.id,
      name: displayName,
      avatarUrl: null,
      handicap: p?.handicap_index ?? null,
      location: null,
    }

    const pScores = scoreMap.get(tp.id) ?? new Map()

    const holeScores: HoleScoreV2[] = holes.map(h => {
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

  return {
    courseId,
    courseName: course.name,
    date: course.round_date ?? '',
    par: course.par ?? 72,
    roundNumber: course.round_number ?? null,
    players,
    matchId: userMatch?.id,
  }
}
