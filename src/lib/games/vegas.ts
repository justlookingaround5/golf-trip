import type { GameEngine, GameEngineInput, GameEngineResult } from './types'

/**
 * Vegas (Daytona) Engine
 *
 * Two 2-player teams. Combine scores into two-digit number (lower first).
 * Difference = points. Birdie flip: opponent puts higher number first.
 *
 * Config:
 *   point_value: number          (default: 0.25)
 *   flip_on_birdie: boolean      (default: true)
 */
function compute(input: GameEngineInput): GameEngineResult {
  const { scores, players, holes, playerStrokes, config } = input
  const pointValue = (config.point_value as number) ?? 0.25
  const flipOnBirdie = config.flip_on_birdie !== false

  const holeById = new Map(holes.map(h => [h.id, h]))
  const sortedHoles = [...holes].sort((a, b) => a.hole_number - b.hole_number)

  // Group players by side
  const teamA = players.filter(p => p.side === 'team_a').map(p => p.trip_player_id)
  const teamB = players.filter(p => p.side === 'team_b').map(p => p.trip_player_id)

  if (teamA.length !== 2 || teamB.length !== 2) {
    return {
      players: players.map(p => ({
        trip_player_id: p.trip_player_id, position: 1, points: 0, money: 0,
        details: { error: 'Vegas requires exactly 2 teams of 2' },
      })),
      holes: [],
      summary: 'Error: Vegas requires 2 teams of 2',
    }
  }

  let totalDiff = 0 // positive = team_a winning
  const holeResults: Record<string, unknown>[] = []

  for (const hole of sortedHoles) {
    // Get net scores for each team
    function getTeamNets(teamIds: string[]): number[] {
      return teamIds.map(pid => {
        const score = scores.find(s => s.trip_player_id === pid && s.hole_id === hole.id)
        if (!score) return Infinity
        const strokesMap = playerStrokes.get(pid)
        const strokes = strokesMap?.get(hole.hole_number) ?? 0
        return score.gross_score - strokes
      }).filter(n => n < Infinity)
    }

    const aNets = getTeamNets(teamA)
    const bNets = getTeamNets(teamB)

    if (aNets.length !== 2 || bNets.length !== 2) continue

    // Check for birdies (net score < par)
    const aBirdie = aNets.some(n => n < hole.par)
    const bBirdie = bNets.some(n => n < hole.par)

    // Combine into two-digit numbers
    function makeNumber(nets: number[], flip: boolean): number {
      const sorted = [...nets].sort((a, b) => a - b)
      if (flip) {
        return sorted[1] * 10 + sorted[0] // higher first
      }
      return sorted[0] * 10 + sorted[1] // lower first (normal)
    }

    // Normal: lower first. Flip: opponent flipped if you birdie.
    const aNum = makeNumber(aNets, flipOnBirdie && bBirdie)
    const bNum = makeNumber(bNets, flipOnBirdie && aBirdie)

    const diff = bNum - aNum // positive = team_a better (lower number)
    totalDiff += diff

    holeResults.push({
      hole_number: hole.hole_number,
      team_a_nets: aNets,
      team_b_nets: bNets,
      team_a_number: aNum,
      team_b_number: bNum,
      diff,
      a_birdie: aBirdie,
      b_birdie: bBirdie,
    })
  }

  const aMoney = totalDiff * pointValue
  const bMoney = -aMoney

  const results = players.map(p => ({
    trip_player_id: p.trip_player_id,
    position: (p.side === 'team_a' && aMoney >= 0) || (p.side === 'team_b' && bMoney >= 0) ? 1 : 2,
    points: p.side === 'team_a' ? totalDiff : -totalDiff,
    money: p.side === 'team_a' ? aMoney : bMoney,
    details: {
      side: p.side,
      total_diff: p.side === 'team_a' ? totalDiff : -totalDiff,
    },
  }))

  const summary = `Vegas: ${Math.abs(totalDiff)} point spread. ${totalDiff > 0 ? 'Team A' : totalDiff < 0 ? 'Team B' : 'Tied'} ${totalDiff !== 0 ? `wins $${Math.abs(aMoney).toFixed(2)}` : ''}`

  return { players: results, holes: holeResults, summary }
}

function validateConfig(config: Record<string, unknown>) {
  const errors: string[] = []
  if (config.point_value != null && typeof config.point_value !== 'number') {
    errors.push('point_value must be a number')
  }
  return { valid: errors.length === 0, errors }
}

function validatePlayers(count: number) {
  if (count !== 4) return { valid: false, error: 'Vegas requires exactly 4 players (2 teams of 2)' }
  return { valid: true }
}

export const vegasEngine: GameEngine = {
  key: 'vegas',
  compute,
  validateConfig,
  validatePlayers,
}
