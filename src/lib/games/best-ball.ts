import type { GameEngine, GameEngineInput, GameEngineResult } from './types'

/**
 * Best Ball Engine
 *
 * Teams of 2+. Each player plays own ball. Lowest net per team per hole counts.
 * Scored as match play (holes won) or stroke play (total).
 *
 * Config:
 *   scoring: 'match_play' | 'stroke_play'  (default: 'match_play')
 *   handicap_pct: number                    (default: 100)
 */
function compute(input: GameEngineInput): GameEngineResult {
  const { scores, players, holes, playerStrokes, config } = input
  const scoring = (config.scoring as string) || 'match_play'

  const holeById = new Map(holes.map(h => [h.id, h]))
  const sortedHoles = [...holes].sort((a, b) => a.hole_number - b.hole_number)

  // Group players by side
  const sides = new Map<string, string[]>()
  for (const p of players) {
    const side = p.side || 'team_a'
    if (!sides.has(side)) sides.set(side, [])
    sides.get(side)!.push(p.trip_player_id)
  }

  const sideKeys = Array.from(sides.keys()).sort()
  if (sideKeys.length < 2) {
    return {
      players: players.map(p => ({
        trip_player_id: p.trip_player_id, position: 1, points: 0, money: 0,
        details: { error: 'Best ball requires at least 2 teams' },
      })),
      holes: [],
      summary: 'Error: Best ball requires at least 2 teams',
    }
  }

  // Compute best net per side per hole
  const holeResults: { hole_number: number; par: number; best_by_side: Record<string, number>; winner: string | null }[] = []
  const sideWins = new Map<string, number>()
  const sideTotals = new Map<string, number>()
  sideKeys.forEach(s => { sideWins.set(s, 0); sideTotals.set(s, 0) })

  for (const hole of sortedHoles) {
    const bestBySide: Record<string, number> = {}

    for (const side of sideKeys) {
      const sidePlayerIds = sides.get(side)!
      let bestNet = Infinity

      for (const playerId of sidePlayerIds) {
        const playerScore = scores.find(
          s => s.trip_player_id === playerId && s.hole_id === hole.id
        )
        if (!playerScore) continue

        const strokesMap = playerStrokes.get(playerId)
        const strokes = strokesMap?.get(hole.hole_number) ?? 0
        const net = playerScore.gross_score - strokes
        if (net < bestNet) bestNet = net
      }

      if (bestNet < Infinity) {
        bestBySide[side] = bestNet
        sideTotals.set(side, (sideTotals.get(side) || 0) + bestNet)
      }
    }

    // Determine hole winner
    const completeSides = sideKeys.filter(s => bestBySide[s] != null)
    let winner: string | null = null
    if (completeSides.length >= 2) {
      const sorted = completeSides.sort((a, b) => bestBySide[a] - bestBySide[b])
      if (bestBySide[sorted[0]] < bestBySide[sorted[1]]) {
        winner = sorted[0]
        sideWins.set(sorted[0], (sideWins.get(sorted[0]) || 0) + 1)
      }
    }

    holeResults.push({ hole_number: hole.hole_number, par: hole.par, best_by_side: bestBySide, winner })
  }

  // Build results
  const isMatchPlay = scoring === 'match_play'

  // Rank sides
  const sideRanking = sideKeys.map(s => ({
    side: s,
    wins: sideWins.get(s) || 0,
    total: sideTotals.get(s) || 0,
  }))

  if (isMatchPlay) {
    sideRanking.sort((a, b) => b.wins - a.wins)
  } else {
    sideRanking.sort((a, b) => a.total - b.total)
  }

  // Assign position to each side
  const sidePositions = new Map<string, number>()
  sideRanking.forEach((s, i) => sidePositions.set(s.side, i + 1))

  const playerResults = players.map(p => {
    const side = p.side || 'team_a'
    const pos = sidePositions.get(side) || 99
    return {
      trip_player_id: p.trip_player_id,
      position: pos,
      points: sideWins.get(side) || 0,
      money: 0,
      details: {
        side,
        team_wins: sideWins.get(side) || 0,
        team_total: sideTotals.get(side) || 0,
      },
    }
  })

  const winningSide = sideRanking[0]
  const summary = isMatchPlay
    ? `Best Ball (Match Play): ${winningSide.side} won ${winningSide.wins} holes`
    : `Best Ball (Stroke): ${winningSide.side} shot ${winningSide.total}`

  return {
    players: playerResults,
    holes: holeResults as unknown as Record<string, unknown>[],
    summary,
  }
}

function validateConfig(config: Record<string, unknown>) {
  const errors: string[] = []
  if (config.scoring && !['match_play', 'stroke_play'].includes(config.scoring as string)) {
    errors.push('scoring must be "match_play" or "stroke_play"')
  }
  return { valid: errors.length === 0, errors }
}

function validatePlayers(count: number) {
  if (count < 4) return { valid: false, error: 'Best ball requires at least 4 players (2 teams of 2)' }
  return { valid: true }
}

export const bestBallEngine: GameEngine = {
  key: 'best_ball',
  compute,
  validateConfig,
  validatePlayers,
}
