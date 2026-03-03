import type { GameEngine, GameEngineInput, GameEngineResult } from './types'

const DEFAULT_POINTS: Record<string, number> = {
  'double_eagle_plus': 5,
  'eagle': 4,
  'birdie': 3,
  'par': 2,
  'bogey': 1,
  'double_bogey_plus': 0,
}

/**
 * Stableford Engine
 *
 * Points per hole based on net score relative to par.
 * Highest total points wins. Great equalizer.
 *
 * Config:
 *   modified: boolean (default: false — if true, double bogey+ = -1)
 *   point_scale: Record<string, number> (override default points)
 */
function compute(input: GameEngineInput): GameEngineResult {
  const { scores, players, holes, playerStrokes, config } = input
  const scale = { ...DEFAULT_POINTS, ...(config.point_scale as Record<string, number> || {}) }
  const modified = config.modified === true
  if (modified) {
    scale['double_bogey_plus'] = -1
  }

  const holeById = new Map(holes.map(h => [h.id, h]))

  function getPoints(netScore: number, par: number): number {
    const diff = netScore - par
    if (diff <= -3) return scale['double_eagle_plus']
    if (diff === -2) return scale['eagle']
    if (diff === -1) return scale['birdie']
    if (diff === 0) return scale['par']
    if (diff === 1) return scale['bogey']
    return scale['double_bogey_plus']
  }

  const playerTotals = players.map(p => {
    let totalPoints = 0
    const holeBreakdown: { hole_number: number; gross: number; net: number; par: number; points: number }[] = []

    for (const score of scores) {
      if (score.trip_player_id !== p.trip_player_id) continue
      const hole = holeById.get(score.hole_id)
      if (!hole) continue

      const strokesMap = playerStrokes.get(p.trip_player_id)
      const strokes = strokesMap?.get(hole.hole_number) ?? 0
      const net = score.gross_score - strokes
      const pts = getPoints(net, hole.par)
      totalPoints += pts

      holeBreakdown.push({
        hole_number: hole.hole_number,
        gross: score.gross_score,
        net,
        par: hole.par,
        points: pts,
      })
    }

    holeBreakdown.sort((a, b) => a.hole_number - b.hole_number)

    return {
      trip_player_id: p.trip_player_id,
      total_points: totalPoints,
      hole_breakdown: holeBreakdown,
    }
  })

  // Sort by points descending (higher is better in Stableford)
  playerTotals.sort((a, b) => b.total_points - a.total_points)

  const results = playerTotals.map((p, i) => ({
    trip_player_id: p.trip_player_id,
    position: i + 1,
    points: p.total_points,
    money: 0,
    details: {
      total_points: p.total_points,
      hole_breakdown: p.hole_breakdown,
    },
  }))

  const winner = playerTotals[0]
  const summary = `Stableford: Winner with ${winner.total_points} points`

  return { players: results, holes: [], summary }
}

function validateConfig(config: Record<string, unknown>) {
  const errors: string[] = []
  if (config.point_scale && typeof config.point_scale !== 'object') {
    errors.push('point_scale must be an object')
  }
  return { valid: errors.length === 0, errors }
}

function validatePlayers(count: number) {
  if (count < 2) return { valid: false, error: 'Stableford requires at least 2 players' }
  return { valid: true }
}

export const stablefordEngine: GameEngine = {
  key: 'stableford',
  compute,
  validateConfig,
  validatePlayers,
}
