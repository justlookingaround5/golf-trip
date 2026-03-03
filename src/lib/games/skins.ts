import type { GameEngine, GameEngineInput, GameEngineResult } from './types'

interface SkinResult {
  hole_number: number
  par: number
  winner_id: string | null    // null = carried over
  scores: { trip_player_id: string; gross: number; net: number }[]
  carried: boolean
  skin_value: number           // how many skins this hole is worth (1 + carry-overs)
}

/**
 * Skins Engine
 *
 * Each hole is worth one skin. Sole lowest net (or gross) score wins.
 * Ties carry over, making the next hole worth more.
 *
 * Config:
 *   mode: 'gross' | 'net' | 'both'  (default: 'net')
 *   carry_over: boolean              (default: true)
 *   value_per_skin: number | null    (null = split pot evenly)
 */
function compute(input: GameEngineInput): GameEngineResult {
  const { scores, players, holes, playerStrokes, config } = input
  const mode = (config.mode as string) || 'net'
  const carryOver = config.carry_over !== false

  // Build hole lookup
  const holeById = new Map(holes.map(h => [h.id, h]))
  const sortedHoles = [...holes].sort((a, b) => a.hole_number - b.hole_number)

  // Group scores by hole number
  const scoresByHole = new Map<number, { trip_player_id: string; gross: number; net: number }[]>()

  for (const score of scores) {
    const hole = holeById.get(score.hole_id)
    if (!hole) continue

    const strokesMap = playerStrokes.get(score.trip_player_id)
    const strokes = strokesMap?.get(hole.hole_number) ?? 0
    const net = score.gross_score - strokes

    if (!scoresByHole.has(hole.hole_number)) {
      scoresByHole.set(hole.hole_number, [])
    }
    scoresByHole.get(hole.hole_number)!.push({
      trip_player_id: score.trip_player_id,
      gross: score.gross_score,
      net,
    })
  }

  // Process holes in order
  const holeResults: SkinResult[] = []
  const playerSkins = new Map<string, number>() // trip_player_id -> skins won
  let carryCount = 0

  for (const hole of sortedHoles) {
    const holeScores = scoresByHole.get(hole.hole_number)
    if (!holeScores || holeScores.length === 0) continue

    // Not all players posted scores for this hole
    if (holeScores.length < players.length) {
      // Skip incomplete holes — carry over
      holeResults.push({
        hole_number: hole.hole_number,
        par: hole.par,
        winner_id: null,
        scores: holeScores,
        carried: true,
        skin_value: 1 + carryCount,
      })
      if (carryOver) carryCount++
      continue
    }

    // Find lowest score
    const useNet = mode === 'net' || mode === 'both'
    const sorted = [...holeScores].sort((a, b) =>
      useNet ? a.net - b.net : a.gross - b.gross
    )
    const bestScore = useNet ? sorted[0].net : sorted[0].gross
    const winners = sorted.filter(s =>
      (useNet ? s.net : s.gross) === bestScore
    )

    const skinValue = 1 + carryCount

    if (winners.length === 1) {
      // Sole winner — wins the skin(s)
      const winnerId = winners[0].trip_player_id
      playerSkins.set(winnerId, (playerSkins.get(winnerId) || 0) + skinValue)

      holeResults.push({
        hole_number: hole.hole_number,
        par: hole.par,
        winner_id: winnerId,
        scores: holeScores,
        carried: false,
        skin_value: skinValue,
      })
      carryCount = 0
    } else {
      // Tie — carry over
      holeResults.push({
        hole_number: hole.hole_number,
        par: hole.par,
        winner_id: null,
        scores: holeScores,
        carried: true,
        skin_value: skinValue,
      })
      if (carryOver) {
        carryCount = skinValue // carry cumulative value
      } else {
        carryCount = 0 // no carry — skins are lost
      }
    }
  }

  // Calculate total skins available
  const totalSkinsWon = Array.from(playerSkins.values()).reduce((a, b) => a + b, 0)

  // Build results sorted by skins won
  const playerResults = players.map(p => {
    const skins = playerSkins.get(p.trip_player_id) || 0
    return {
      trip_player_id: p.trip_player_id,
      position: 0, // set below
      points: skins,
      money: 0, // calculated by settlement based on buy-in
      details: { skins_won: skins, total_skins: totalSkinsWon },
    }
  })

  // Sort by skins won (descending) and assign positions
  playerResults.sort((a, b) => b.points - a.points)
  playerResults.forEach((r, i) => { r.position = i + 1 })

  // Summary
  const summary = totalSkinsWon > 0
    ? `${totalSkinsWon} skins awarded.${carryCount > 0 ? ` ${carryCount} carried to 19th hole.` : ''}`
    : 'No skins awarded — all holes tied.'

  return {
    players: playerResults,
    holes: holeResults as unknown as Record<string, unknown>[],
    summary,
  }
}

function validateConfig(config: Record<string, unknown>) {
  const errors: string[] = []
  if (config.mode && !['gross', 'net', 'both'].includes(config.mode as string)) {
    errors.push('mode must be "gross", "net", or "both"')
  }
  return { valid: errors.length === 0, errors }
}

function validatePlayers(count: number) {
  if (count < 2) return { valid: false, error: 'Skins requires at least 2 players' }
  return { valid: true }
}

export const skinsEngine: GameEngine = {
  key: 'skins',
  compute,
  validateConfig,
  validatePlayers,
}
