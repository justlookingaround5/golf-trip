import type { GameEngine, GameEngineInput, GameEngineResult } from './types'

/**
 * Nine Point (5-3-1) Engine
 *
 * Exactly 3 players. Each hole awards 9 total points.
 * Best net: 5, middle: 3, worst: 1.
 * Ties: two tie best = 4-4-1, two tie worst = 5-2-2, all tie = 3-3-3.
 *
 * Config:
 *   point_split: [5, 3, 1]     (default)
 *   value_per_point: number     (default: 1)
 */
function compute(input: GameEngineInput): GameEngineResult {
  const { scores, players, holes, playerStrokes, config } = input
  const split = (config.point_split as number[]) || [5, 3, 1]

  if (players.length !== 3) {
    return {
      players: players.map(p => ({
        trip_player_id: p.trip_player_id, position: 1, points: 0, money: 0,
        details: { error: 'Nine Point requires exactly 3 players' },
      })),
      holes: [],
      summary: 'Error: Nine Point requires exactly 3 players',
    }
  }

  const holeById = new Map(holes.map(h => [h.id, h]))
  const sortedHoles = [...holes].sort((a, b) => a.hole_number - b.hole_number)
  const playerIds = players.map(p => p.trip_player_id)

  const totalPoints = new Map<string, number>()
  playerIds.forEach(id => totalPoints.set(id, 0))

  const holeResults: Record<string, unknown>[] = []

  for (const hole of sortedHoles) {
    const holeScores: { id: string; net: number }[] = []

    for (const pid of playerIds) {
      const score = scores.find(s => s.trip_player_id === pid && s.hole_id === hole.id)
      if (!score) continue

      const strokesMap = playerStrokes.get(pid)
      const strokes = strokesMap?.get(hole.hole_number) ?? 0
      holeScores.push({ id: pid, net: score.gross_score - strokes })
    }

    if (holeScores.length !== 3) continue

    // Sort by net (ascending)
    holeScores.sort((a, b) => a.net - b.net)

    // Determine point allocation based on ties
    const [a, b, c] = holeScores
    let points: Record<string, number> = {}

    if (a.net === b.net && b.net === c.net) {
      // All three tie: 3-3-3
      points = { [a.id]: 3, [b.id]: 3, [c.id]: 3 }
    } else if (a.net === b.net) {
      // Top two tie: 4-4-1
      const topShare = (split[0] + split[1]) / 2
      points = { [a.id]: topShare, [b.id]: topShare, [c.id]: split[2] }
    } else if (b.net === c.net) {
      // Bottom two tie: 5-2-2
      const botShare = (split[1] + split[2]) / 2
      points = { [a.id]: split[0], [b.id]: botShare, [c.id]: botShare }
    } else {
      // No ties: 5-3-1
      points = { [a.id]: split[0], [b.id]: split[1], [c.id]: split[2] }
    }

    for (const [id, pts] of Object.entries(points)) {
      totalPoints.set(id, (totalPoints.get(id) || 0) + pts)
    }

    holeResults.push({
      hole_number: hole.hole_number,
      scores: holeScores,
      points,
    })
  }

  // Par is 3 points per hole × holes played
  const holesPlayed = holeResults.length
  const parPoints = holesPlayed * 3

  // Sort by total points (descending)
  const sorted = playerIds
    .map(id => ({ id, points: totalPoints.get(id) || 0 }))
    .sort((a, b) => b.points - a.points)

  const valuePerPoint = (config.value_per_point as number) ?? 1

  const results = sorted.map((p, i) => ({
    trip_player_id: p.id,
    position: i + 1,
    points: p.points,
    money: (p.points - parPoints) * valuePerPoint,
    details: {
      total_points: p.points,
      par_points: parPoints,
      vs_par: p.points - parPoints,
    },
  }))

  const summary = `Nine Point: ${sorted[0].points} - ${sorted[1].points} - ${sorted[2].points}`

  return { players: results, holes: holeResults, summary }
}

function validateConfig(config: Record<string, unknown>) {
  const errors: string[] = []
  if (config.point_split) {
    const split = config.point_split as number[]
    if (!Array.isArray(split) || split.length !== 3) {
      errors.push('point_split must be an array of 3 numbers')
    } else if (split.reduce((a, b) => a + b, 0) !== 9) {
      errors.push('point_split must sum to 9')
    }
  }
  return { valid: errors.length === 0, errors }
}

function validatePlayers(count: number) {
  if (count !== 3) return { valid: false, error: 'Nine Point requires exactly 3 players' }
  return { valid: true }
}

export const ninePointEngine: GameEngine = {
  key: 'nine_point',
  compute,
  validateConfig,
  validatePlayers,
}
