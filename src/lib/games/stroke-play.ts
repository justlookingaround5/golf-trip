import type { GameEngine, GameEngineInput, GameEngineResult } from './types'

/**
 * Stroke Play Engine
 *
 * Simplest format: lowest total score wins.
 *
 * Config:
 *   mode: 'gross' | 'net'       (default: 'net')
 *   payout_structure: 'winner' | 'top_3' | 'proportional' (default: 'top_3')
 */
function compute(input: GameEngineInput): GameEngineResult {
  const { scores, players, holes, playerStrokes, config } = input
  const mode = (config.mode as string) || 'net'

  const holeById = new Map(holes.map(h => [h.id, h]))
  const totalPar = holes.reduce((sum, h) => sum + h.par, 0)

  // Calculate totals per player
  const playerTotals = players.map(p => {
    let gross = 0
    let net = 0
    let holesPlayed = 0

    for (const score of scores) {
      if (score.trip_player_id !== p.trip_player_id) continue
      const hole = holeById.get(score.hole_id)
      if (!hole) continue

      const strokesMap = playerStrokes.get(p.trip_player_id)
      const strokes = strokesMap?.get(hole.hole_number) ?? 0

      gross += score.gross_score
      net += score.gross_score - strokes
      holesPlayed++
    }

    const useNet = mode === 'net'
    const total = useNet ? net : gross

    return {
      trip_player_id: p.trip_player_id,
      gross,
      net,
      total,
      holes_played: holesPlayed,
      vs_par: total - totalPar,
    }
  })

  // Sort by total (ascending — lower is better)
  playerTotals.sort((a, b) => a.total - b.total)

  const results = playerTotals.map((p, i) => ({
    trip_player_id: p.trip_player_id,
    position: i + 1,
    points: playerTotals.length - i, // higher position = more points
    money: 0,
    details: {
      gross: p.gross,
      net: p.net,
      total: p.total,
      vs_par: p.vs_par,
      holes_played: p.holes_played,
      mode,
    },
  }))

  const winner = playerTotals[0]
  const parStr = winner.vs_par === 0 ? 'E' : winner.vs_par > 0 ? `+${winner.vs_par}` : `${winner.vs_par}`
  const summary = `${mode === 'net' ? 'Net' : 'Gross'} Stroke Play: Winner shot ${winner.total} (${parStr})`

  return { players: results, holes: [], summary }
}

function validateConfig(config: Record<string, unknown>) {
  const errors: string[] = []
  if (config.mode && !['gross', 'net'].includes(config.mode as string)) {
    errors.push('mode must be "gross" or "net"')
  }
  return { valid: errors.length === 0, errors }
}

function validatePlayers(count: number) {
  if (count < 2) return { valid: false, error: 'Stroke play requires at least 2 players' }
  return { valid: true }
}

export const strokePlayEngine: GameEngine = {
  key: 'stroke_play',
  compute,
  validateConfig,
  validatePlayers,
}
