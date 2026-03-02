import type { MatchFormat } from './types'

export interface MatchPlayResult {
  status: string          // "3&2", "1UP", "AS", "2UP thru 12"
  leader: 'team_a' | 'team_b' | 'tie'
  holesPlayed: number
  holesRemaining: number
  isComplete: boolean
  teamAPoints: number     // 1 for win, 0.5 for tie, 0 for loss
  teamBPoints: number
}

export interface HoleResult {
  holeNumber: number
  teamANet: number        // best net score for team_a on this hole
  teamBNet: number        // best net score for team_b on this hole
  winner: 'team_a' | 'team_b' | 'halved'
}

/**
 * Calculate the net score for a player on a hole.
 */
function calcNet(gross: number, strokes: number): number {
  return gross - strokes
}

/**
 * Compute hole-by-hole results from raw scores.
 */
export function getHoleResults(
  scores: { trip_player_id: string; hole_id: string; gross_score: number }[],
  matchPlayers: { trip_player_id: string; side: 'team_a' | 'team_b' }[],
  holes: { id: string; hole_number: number; par: number; handicap_index: number }[],
  playerStrokes: Map<string, Map<number, number>>,
  format: MatchFormat
): HoleResult[] {
  // Build lookup maps
  const holeById = new Map(holes.map(h => [h.id, h]))
  const playerSide = new Map(matchPlayers.map(mp => [mp.trip_player_id, mp.side]))

  // Group scores by hole number
  const scoresByHole = new Map<number, { trip_player_id: string; gross_score: number; side: 'team_a' | 'team_b' }[]>()

  for (const score of scores) {
    const hole = holeById.get(score.hole_id)
    if (!hole) continue
    const side = playerSide.get(score.trip_player_id)
    if (!side) continue

    const holeNum = hole.hole_number
    if (!scoresByHole.has(holeNum)) {
      scoresByHole.set(holeNum, [])
    }
    scoresByHole.get(holeNum)!.push({
      trip_player_id: score.trip_player_id,
      gross_score: score.gross_score,
      side,
    })
  }

  // Determine expected players per side
  const teamAPlayers = matchPlayers.filter(mp => mp.side === 'team_a')
  const teamBPlayers = matchPlayers.filter(mp => mp.side === 'team_b')

  const is2v2 = format === '2v2_best_ball' || format === '2v2_alternate_shot'

  const results: HoleResult[] = []

  // Sort holes by number
  const sortedHoles = [...holes].sort((a, b) => a.hole_number - b.hole_number)

  for (const hole of sortedHoles) {
    const holeScores = scoresByHole.get(hole.hole_number)
    if (!holeScores || holeScores.length === 0) continue

    // Get scores for each side
    const teamAScores = holeScores.filter(s => s.side === 'team_a')
    const teamBScores = holeScores.filter(s => s.side === 'team_b')

    // Need at least one score from each side
    if (teamAScores.length === 0 || teamBScores.length === 0) continue

    // In 1v1, we need exactly 1 from each side.
    // In 2v2, we need at least 1 from each side (best ball uses the best available).

    // Calculate net scores for each player
    const teamANets = teamAScores.map(s => {
      const strokesMap = playerStrokes.get(s.trip_player_id)
      const strokes = strokesMap?.get(hole.hole_number) ?? 0
      return calcNet(s.gross_score, strokes)
    })

    const teamBNets = teamBScores.map(s => {
      const strokesMap = playerStrokes.get(s.trip_player_id)
      const strokes = strokesMap?.get(hole.hole_number) ?? 0
      return calcNet(s.gross_score, strokes)
    })

    // For best ball (2v2), take the lowest net from each side.
    // For 1v1, there's only one score per side anyway.
    const teamANet = Math.min(...teamANets)
    const teamBNet = Math.min(...teamBNets)

    let winner: 'team_a' | 'team_b' | 'halved'
    if (teamANet < teamBNet) {
      winner = 'team_a'
    } else if (teamBNet < teamANet) {
      winner = 'team_b'
    } else {
      winner = 'halved'
    }

    results.push({
      holeNumber: hole.hole_number,
      teamANet,
      teamBNet,
      winner,
    })
  }

  return results
}

/**
 * Calculate match play result from scores.
 *
 * @param scores - Array of scores with trip_player_id, hole_id, and gross_score
 * @param matchPlayers - Array mapping players to sides (team_a or team_b)
 * @param holes - Array of hole definitions with id, hole_number, par, handicap_index
 * @param playerStrokes - Map of trip_player_id -> hole_number -> strokes received on that hole
 * @param format - Match format (1v1_match, 2v2_best_ball, etc.)
 * @param totalHoles - Total holes in the match (defaults to 18)
 */
export function calculateMatchPlay(
  scores: { trip_player_id: string; hole_id: string; gross_score: number }[],
  matchPlayers: { trip_player_id: string; side: 'team_a' | 'team_b' }[],
  holes: { id: string; hole_number: number; par: number; handicap_index: number }[],
  playerStrokes: Map<string, Map<number, number>>,
  format: MatchFormat,
  totalHoles: number = 18
): MatchPlayResult {
  const holeResults = getHoleResults(scores, matchPlayers, holes, playerStrokes, format)

  const holesPlayed = holeResults.length
  const holesRemaining = totalHoles - holesPlayed

  // No holes played yet
  if (holesPlayed === 0) {
    return {
      status: 'AS',
      leader: 'tie',
      holesPlayed: 0,
      holesRemaining: totalHoles,
      isComplete: false,
      teamAPoints: 0,
      teamBPoints: 0,
    }
  }

  // Calculate cumulative lead hole by hole, checking for early clinch
  let lead = 0 // positive = team_a leads, negative = team_b leads
  let clinched = false
  let clinchHole = 0

  for (let i = 0; i < holeResults.length; i++) {
    const hr = holeResults[i]
    if (hr.winner === 'team_a') {
      lead++
    } else if (hr.winner === 'team_b') {
      lead--
    }

    const holesPlayedSoFar = i + 1
    const holesLeft = totalHoles - holesPlayedSoFar

    // Match is clinched when one side is up by more holes than remain
    if (Math.abs(lead) > holesLeft) {
      clinched = true
      clinchHole = holesPlayedSoFar
      break
    }
  }

  // Determine final state
  if (clinched) {
    const absLead = Math.abs(lead)
    const remaining = totalHoles - clinchHole
    const leader: 'team_a' | 'team_b' = lead > 0 ? 'team_a' : 'team_b'

    let status: string
    if (remaining === 0) {
      // Won on the last hole
      status = `${absLead}UP`
    } else {
      status = `${absLead}&${remaining}`
    }

    return {
      status,
      leader,
      holesPlayed: clinchHole,
      holesRemaining: remaining,
      isComplete: true,
      teamAPoints: leader === 'team_a' ? 1 : 0,
      teamBPoints: leader === 'team_b' ? 1 : 0,
    }
  }

  // Not clinched - is the round complete?
  const isComplete = holesRemaining === 0

  if (isComplete) {
    // Match finished all holes
    if (lead === 0) {
      return {
        status: 'AS',
        leader: 'tie',
        holesPlayed,
        holesRemaining: 0,
        isComplete: true,
        teamAPoints: 0.5,
        teamBPoints: 0.5,
      }
    } else {
      const absLead = Math.abs(lead)
      const leader: 'team_a' | 'team_b' = lead > 0 ? 'team_a' : 'team_b'
      return {
        status: `${absLead}UP`,
        leader,
        holesPlayed,
        holesRemaining: 0,
        isComplete: true,
        teamAPoints: leader === 'team_a' ? 1 : 0,
        teamBPoints: leader === 'team_b' ? 1 : 0,
      }
    }
  }

  // Mid-round, match still in progress
  const absLead = Math.abs(lead)
  const leader: 'team_a' | 'team_b' | 'tie' = lead > 0 ? 'team_a' : lead < 0 ? 'team_b' : 'tie'
  const statusText = lead === 0
    ? `AS thru ${holesPlayed}`
    : `${absLead}UP thru ${holesPlayed}`

  return {
    status: statusText,
    leader,
    holesPlayed,
    holesRemaining,
    isComplete: false,
    teamAPoints: 0,
    teamBPoints: 0,
  }
}
