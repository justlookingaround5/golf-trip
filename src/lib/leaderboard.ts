import type {
  TripPlayer,
  Course,
  Score,
  PlayerCourseHandicap,
  Match,
  MatchPlayer,
  Hole,
} from './types'
import { getStrokesPerHole } from './handicap'
import { calculateMatchPlay } from './match-play'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RoundScore {
  courseId: string
  courseName: string
  roundNumber: number
  gross: number
  net: number
  par: number       // sum of par for holes played in this round
  holesPlayed: number
}

export interface PlayerStanding {
  tripPlayerId: string
  playerName: string
  totalGross: number
  totalNet: number
  totalPar: number   // sum of par for all holes played
  roundScores: RoundScore[]
}

export interface MatchPlayRecord {
  tripPlayerId: string
  playerName: string
  wins: number
  losses: number
  ties: number
  points: number    // total match play points earned
}

export interface LeaderboardData {
  grossStandings: PlayerStanding[]
  netStandings: PlayerStanding[]
  matchPlayRecords: MatchPlayRecord[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPlayerName(tripPlayer: TripPlayer): string {
  return (tripPlayer.player?.name ?? 'Unknown').split(' ')[0]
}

/**
 * Build a Map<tripPlayerId, Map<holeNumber, strokes>> for a given course.
 */
function buildPlayerStrokesMap(
  courseId: string,
  holes: Hole[],
  courseHandicaps: PlayerCourseHandicap[]
): Map<string, Map<number, number>> {
  const map = new Map<string, Map<number, number>>()
  const courseHoles = holes.filter(h => h.course_id === courseId)

  for (const ch of courseHandicaps) {
    if (ch.course_id !== courseId) continue
    const strokesMap = getStrokesPerHole(ch.handicap_strokes, courseHoles)
    map.set(ch.trip_player_id, strokesMap)
  }

  return map
}

// ---------------------------------------------------------------------------
// Main calculation
// ---------------------------------------------------------------------------

export function calculateLeaderboard(params: {
  tripPlayers: TripPlayer[]
  courses: Course[]          // with holes populated
  scores: Score[]
  courseHandicaps: PlayerCourseHandicap[]
  matches: Match[]           // with match_players populated
}): LeaderboardData {
  const { tripPlayers, courses, scores, courseHandicaps, matches } = params

  // Build a lookup of all holes by id
  const allHoles: Hole[] = []
  for (const course of courses) {
    if (course.holes) {
      allHoles.push(...course.holes)
    }
  }
  const holeById = new Map(allHoles.map(h => [h.id, h]))

  // Build course lookup
  const courseById = new Map(courses.map(c => [c.id, c]))

  // ---------------------------------------------------------------------------
  // Gross / Net standings
  // ---------------------------------------------------------------------------

  const standingsMap = new Map<string, PlayerStanding>()

  // Initialize for all trip players
  for (const tp of tripPlayers) {
    standingsMap.set(tp.id, {
      tripPlayerId: tp.id,
      playerName: getPlayerName(tp),
      totalGross: 0,
      totalNet: 0,
      totalPar: 0,
      roundScores: [],
    })
  }

  // Group scores by trip_player_id and course
  // We need to figure out which course each score belongs to via the hole
  const playerCourseScores = new Map<string, Map<string, Score[]>>()
  // key: tripPlayerId -> courseId -> Score[]

  for (const score of scores) {
    const hole = holeById.get(score.hole_id)
    if (!hole) continue

    const courseId = hole.course_id
    const tpId = score.trip_player_id

    if (!playerCourseScores.has(tpId)) {
      playerCourseScores.set(tpId, new Map())
    }
    const courseMap = playerCourseScores.get(tpId)!
    if (!courseMap.has(courseId)) {
      courseMap.set(courseId, [])
    }
    courseMap.get(courseId)!.push(score)
  }

  // Calculate round scores per player per course
  for (const tp of tripPlayers) {
    const standing = standingsMap.get(tp.id)!
    const courseMap = playerCourseScores.get(tp.id)

    if (!courseMap) continue

    for (const [courseId, courseScores] of courseMap) {
      const course = courseById.get(courseId)
      if (!course) continue

      const courseHoles = allHoles.filter(h => h.course_id === courseId)

      // Get handicap strokes for this player on this course
      const ch = courseHandicaps.find(
        c => c.trip_player_id === tp.id && c.course_id === courseId
      )
      const handicapStrokes = ch?.handicap_strokes ?? 0
      const strokesMap = getStrokesPerHole(handicapStrokes, courseHoles)

      let roundGross = 0
      let roundNet = 0
      let roundPar = 0
      let holesPlayed = 0

      for (const score of courseScores) {
        const hole = holeById.get(score.hole_id)
        if (!hole) continue

        const strokes = strokesMap.get(hole.hole_number) ?? 0
        roundGross += score.gross_score
        roundNet += (score.gross_score - strokes)
        roundPar += hole.par
        holesPlayed++
      }

      standing.roundScores.push({
        courseId,
        courseName: course.name,
        roundNumber: course.round_number,
        gross: roundGross,
        net: roundNet,
        par: roundPar,
        holesPlayed,
      })

      standing.totalGross += roundGross
      standing.totalNet += roundNet
      standing.totalPar += roundPar
    }

    // Sort round scores by round number
    standing.roundScores.sort((a, b) => a.roundNumber - b.roundNumber)
  }

  // Build sorted arrays - only include players who have scores
  const allStandings = Array.from(standingsMap.values()).filter(
    s => s.totalPar > 0
  )

  // Gross standings sorted by total gross relative to par (ascending = best first)
  const grossStandings = [...allStandings].sort(
    (a, b) => (a.totalGross - a.totalPar) - (b.totalGross - b.totalPar)
  )

  // Net standings sorted by total net relative to par (ascending = best first)
  const netStandings = [...allStandings].sort(
    (a, b) => (a.totalNet - a.totalPar) - (b.totalNet - b.totalPar)
  )

  // ---------------------------------------------------------------------------
  // Match play records
  // ---------------------------------------------------------------------------

  const recordsMap = new Map<string, MatchPlayRecord>()

  for (const tp of tripPlayers) {
    recordsMap.set(tp.id, {
      tripPlayerId: tp.id,
      playerName: getPlayerName(tp),
      wins: 0,
      losses: 0,
      ties: 0,
      points: 0,
    })
  }

  for (const match of matches) {
    if (!match.match_players || match.match_players.length === 0) continue

    // Get the course for this match
    const course = courseById.get(match.course_id)
    if (!course) continue

    const courseHoles = allHoles.filter(h => h.course_id === match.course_id)
    if (courseHoles.length === 0) continue

    // Get scores for this match
    const matchScores = scores.filter(s => s.match_id === match.id)
    if (matchScores.length === 0) continue

    // Build player strokes map for this match (adjusted relative to low player)
    const rawStrokesMap = buildPlayerStrokesMap(
      match.course_id,
      allHoles,
      courseHandicaps
    )
    const matchTpIds = match.match_players.map(mp => mp.trip_player_id)
    const matchRawStrokes = matchTpIds.map(id => {
      const ch = courseHandicaps.find(c => c.trip_player_id === id && c.course_id === match.course_id)
      return ch?.handicap_strokes ?? 0
    })
    const minStrokes = matchRawStrokes.length > 0 ? Math.min(...matchRawStrokes) : 0
    const playerStrokesMap = new Map<string, Map<number, number>>()
    for (const mp of match.match_players) {
      const ch = courseHandicaps.find(c => c.trip_player_id === mp.trip_player_id && c.course_id === match.course_id)
      const raw = ch?.handicap_strokes ?? 0
      playerStrokesMap.set(mp.trip_player_id, getStrokesPerHole(Math.max(0, raw - minStrokes), courseHoles))
    }

    // Calculate match result
    const result = calculateMatchPlay(
      matchScores,
      match.match_players,
      courseHoles,
      playerStrokesMap,
      match.format
    )

    if (!result.isComplete) continue

    // Apply result to each player in the match
    for (const mp of match.match_players) {
      const record = recordsMap.get(mp.trip_player_id)
      if (!record) continue

      if (result.leader === 'tie') {
        record.ties++
        record.points += match.point_value * 0.5
      } else if (result.leader === mp.side) {
        record.wins++
        record.points += match.point_value
      } else {
        record.losses++
      }
    }
  }

  const matchPlayRecords = Array.from(recordsMap.values())
    .filter(r => r.wins + r.losses + r.ties > 0)
    .sort((a, b) => b.points - a.points || b.wins - a.wins)

  return {
    grossStandings,
    netStandings,
    matchPlayRecords,
  }
}

// ---------------------------------------------------------------------------
// Team standings calculation
// ---------------------------------------------------------------------------

export interface TeamStanding {
  teamId: string
  teamName: string
  points: number
  matchesPlayed: number
  wins: number
  losses: number
  ties: number
}

export function calculateTeamStandings(params: {
  teams: { id: string; name: string; players?: TripPlayer[] }[]
  matches: Match[]
  courses: Course[]
  scores: Score[]
  courseHandicaps: PlayerCourseHandicap[]
}): TeamStanding[] {
  const { teams, matches, courses, scores, courseHandicaps } = params

  // Build a lookup: tripPlayerId -> teamId
  const playerTeamMap = new Map<string, string>()
  for (const team of teams) {
    if (team.players) {
      for (const tp of team.players) {
        playerTeamMap.set(tp.id, team.id)
      }
    }
  }

  // Build all holes
  const allHoles: Hole[] = []
  for (const course of courses) {
    if (course.holes) {
      allHoles.push(...course.holes)
    }
  }

  const standingsMap = new Map<string, TeamStanding>()
  for (const team of teams) {
    standingsMap.set(team.id, {
      teamId: team.id,
      teamName: team.name,
      points: 0,
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      ties: 0,
    })
  }

  for (const match of matches) {
    if (!match.match_players || match.match_players.length === 0) continue

    const courseHoles = allHoles.filter(h => h.course_id === match.course_id)
    if (courseHoles.length === 0) continue

    const matchScores = scores.filter(s => s.match_id === match.id)
    if (matchScores.length === 0) continue

    const playerStrokesMap = new Map<string, Map<number, number>>()
    const matchRawStrokes2 = match.match_players.map(mp => {
      const ch = courseHandicaps.find(c => c.trip_player_id === mp.trip_player_id && c.course_id === match.course_id)
      return { id: mp.trip_player_id, strokes: ch?.handicap_strokes ?? 0 }
    })
    const minStrokes2 = matchRawStrokes2.length > 0 ? Math.min(...matchRawStrokes2.map(p => p.strokes)) : 0
    for (const { id, strokes } of matchRawStrokes2) {
      playerStrokesMap.set(id, getStrokesPerHole(Math.max(0, strokes - minStrokes2), courseHoles))
    }

    const result = calculateMatchPlay(
      matchScores,
      match.match_players,
      courseHoles,
      playerStrokesMap,
      match.format
    )

    if (!result.isComplete) continue

    // Figure out which team is on team_a and team_b
    const teamASide = match.match_players.filter(mp => mp.side === 'team_a')
    const teamBSide = match.match_players.filter(mp => mp.side === 'team_b')

    // Get team IDs for each side (use first player's team)
    const teamAId = teamASide.length > 0 ? playerTeamMap.get(teamASide[0].trip_player_id) : undefined
    const teamBId = teamBSide.length > 0 ? playerTeamMap.get(teamBSide[0].trip_player_id) : undefined

    // Apply result to teams
    if (teamAId) {
      const standing = standingsMap.get(teamAId)
      if (standing) {
        standing.matchesPlayed++
        if (result.leader === 'tie') {
          standing.ties++
          standing.points += match.point_value * 0.5
        } else if (result.leader === 'team_a') {
          standing.wins++
          standing.points += match.point_value
        } else {
          standing.losses++
        }
      }
    }

    if (teamBId) {
      const standing = standingsMap.get(teamBId)
      if (standing) {
        standing.matchesPlayed++
        if (result.leader === 'tie') {
          standing.ties++
          standing.points += match.point_value * 0.5
        } else if (result.leader === 'team_b') {
          standing.wins++
          standing.points += match.point_value
        } else {
          standing.losses++
        }
      }
    }
  }

  return Array.from(standingsMap.values())
    .sort((a, b) => b.points - a.points)
}
