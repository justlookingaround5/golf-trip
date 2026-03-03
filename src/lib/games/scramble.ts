import type { GameEngine, GameEngineInput, GameEngineResult } from './types'

/**
 * Scramble Engine
 *
 * Teams of 2-4. On each shot, the team picks the best result and all play
 * from that spot. The app tracks the final team score per hole — all team
 * members enter the same score (or we take the min as the team score).
 *
 * Config:
 *   handicap_formula: '25pct_combined' | '35_15' | 'none'  (default: '25pct_combined')
 *     - 25pct_combined: 25% of combined team handicap
 *     - 35_15: 35% of lowest + 15% of highest on the team
 *     - none: no team handicap applied
 */
function compute(input: GameEngineInput): GameEngineResult {
  const { scores, players, holes, playerStrokes, config } = input
  const formula = (config.handicap_formula as string) || '25pct_combined'

  const holeById = new Map(holes.map(h => [h.id, h]))
  const sortedHoles = [...holes].sort((a, b) => a.hole_number - b.hole_number)
  const totalPar = holes.reduce((sum, h) => sum + h.par, 0)

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
        details: { error: 'Scramble requires at least 2 teams' },
      })),
      holes: [],
      summary: 'Error: Scramble requires at least 2 teams',
    }
  }

  // Calculate team handicap per side
  function getTeamHandicap(teamPlayerIds: string[]): number {
    // Get each player's total course handicap strokes
    const handicaps: number[] = []
    for (const pid of teamPlayerIds) {
      const strokesMap = playerStrokes.get(pid)
      if (strokesMap) {
        // Sum total strokes allocated = course handicap
        let total = 0
        strokesMap.forEach(v => { total += v })
        handicaps.push(total)
      }
    }

    if (handicaps.length === 0) return 0

    handicaps.sort((a, b) => a - b)

    switch (formula) {
      case '35_15': {
        const lowest = handicaps[0]
        const highest = handicaps[handicaps.length - 1]
        return Math.round(lowest * 0.35 + highest * 0.15)
      }
      case 'none':
        return 0
      case '25pct_combined':
      default: {
        const combined = handicaps.reduce((a, b) => a + b, 0)
        return Math.round(combined * 0.25)
      }
    }
  }

  // Get team score per hole (take min of all team members' scores)
  const holeResults: { hole_number: number; par: number; team_scores: Record<string, number> }[] = []
  const teamTotals = new Map<string, number>()
  const teamHandicaps = new Map<string, number>()
  sideKeys.forEach(s => {
    teamTotals.set(s, 0)
    teamHandicaps.set(s, getTeamHandicap(sides.get(s)!))
  })

  for (const hole of sortedHoles) {
    const teamScores: Record<string, number> = {}

    for (const side of sideKeys) {
      const teamPlayerIds = sides.get(side)!
      let minScore = Infinity

      for (const pid of teamPlayerIds) {
        const playerScore = scores.find(
          s => s.trip_player_id === pid && s.hole_id === hole.id
        )
        if (playerScore && playerScore.gross_score < minScore) {
          minScore = playerScore.gross_score
        }
      }

      if (minScore < Infinity) {
        teamScores[side] = minScore
        teamTotals.set(side, (teamTotals.get(side) || 0) + minScore)
      }
    }

    holeResults.push({ hole_number: hole.hole_number, par: hole.par, team_scores: teamScores })
  }

  // Apply team handicap to get net totals
  const teamNetTotals = new Map<string, number>()
  for (const side of sideKeys) {
    const gross = teamTotals.get(side) || 0
    const hcap = teamHandicaps.get(side) || 0
    teamNetTotals.set(side, gross - hcap)
  }

  // Rank by net total (ascending)
  const ranking = sideKeys
    .map(s => ({
      side: s,
      gross: teamTotals.get(s) || 0,
      handicap: teamHandicaps.get(s) || 0,
      net: teamNetTotals.get(s) || 0,
    }))
    .sort((a, b) => a.net - b.net)

  const sidePositions = new Map<string, number>()
  ranking.forEach((r, i) => sidePositions.set(r.side, i + 1))

  const playerResults = players.map(p => {
    const side = p.side || 'team_a'
    const pos = sidePositions.get(side) || 99
    const r = ranking.find(r => r.side === side)!
    return {
      trip_player_id: p.trip_player_id,
      position: pos,
      points: ranking.length - pos + 1,
      money: 0,
      details: {
        side,
        team_gross: r.gross,
        team_handicap: r.handicap,
        team_net: r.net,
        team_vs_par: r.net - totalPar,
      },
    }
  })

  const winner = ranking[0]
  const vsPar = winner.net - totalPar
  const parStr = vsPar === 0 ? 'E' : vsPar > 0 ? `+${vsPar}` : `${vsPar}`
  const summary = `Scramble: ${winner.side} shot ${winner.net} net (${parStr})`

  return {
    players: playerResults,
    holes: holeResults as unknown as Record<string, unknown>[],
    summary,
  }
}

function validateConfig(config: Record<string, unknown>) {
  const errors: string[] = []
  if (config.handicap_formula && !['25pct_combined', '35_15', 'none'].includes(config.handicap_formula as string)) {
    errors.push('handicap_formula must be "25pct_combined", "35_15", or "none"')
  }
  return { valid: errors.length === 0, errors }
}

function validatePlayers(count: number) {
  if (count < 4) return { valid: false, error: 'Scramble requires at least 4 players (2+ teams)' }
  return { valid: true }
}

export const scrambleEngine: GameEngine = {
  key: 'scramble',
  compute,
  validateConfig,
  validatePlayers,
}
