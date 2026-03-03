import type { GameEngine, GameEngineInput, GameEngineResult } from './types'

/**
 * Banker Engine
 *
 * 3-6 players. One player is the Banker each hole (rotates).
 * Each other player plays against the Banker:
 *   - Beat the Banker = win base_value
 *   - Lose to Banker = pay base_value
 *   - Tie = push (no exchange)
 *
 * Bonus: If Banker has the outright best score, they collect from everyone.
 *        If Banker has the outright worst score, they pay everyone double.
 *
 * Config:
 *   base_value: number           (default: 1)
 *   double_on_worst: boolean     (default: true)
 *   rotation: string[]           (player IDs in order — auto if omitted)
 */
function compute(input: GameEngineInput): GameEngineResult {
  const { scores, players, holes, playerStrokes, config } = input
  const baseValue = (config.base_value as number) ?? 1
  const doubleOnWorst = config.double_on_worst !== false

  const holeById = new Map(holes.map(h => [h.id, h]))
  const sortedHoles = [...holes].sort((a, b) => a.hole_number - b.hole_number)
  const playerIds = players.map(p => p.trip_player_id)
  const playerCount = playerIds.length

  // Build rotation
  const rotation = (config.rotation as string[]) || playerIds

  // Track points
  const playerPoints = new Map<string, number>()
  playerIds.forEach(id => playerPoints.set(id, 0))

  const holeResults: Record<string, unknown>[] = []

  for (let i = 0; i < sortedHoles.length; i++) {
    const hole = sortedHoles[i]
    const bankerId = rotation[i % rotation.length]

    // Get net scores
    const holeNets = new Map<string, number>()
    for (const pid of playerIds) {
      const score = scores.find(s => s.trip_player_id === pid && s.hole_id === hole.id)
      if (!score) continue
      const strokesMap = playerStrokes.get(pid)
      const strokes = strokesMap?.get(hole.hole_number) ?? 0
      holeNets.set(pid, score.gross_score - strokes)
    }

    if (holeNets.size < playerCount) {
      holeResults.push({
        hole_number: hole.hole_number,
        banker_id: bankerId,
        result: 'incomplete',
        points_awarded: {},
      })
      continue
    }

    const bankerNet = holeNets.get(bankerId)!
    const others = playerIds.filter(id => id !== bankerId)
    const allNets = Array.from(holeNets.values())
    const bestNet = Math.min(...allNets)
    const worstNet = Math.max(...allNets)

    // Check if banker has sole best or sole worst
    const bankerIsSoleBest = bankerNet === bestNet &&
      allNets.filter(n => n === bestNet).length === 1
    const bankerIsSoleWorst = doubleOnWorst && bankerNet === worstNet &&
      allNets.filter(n => n === worstNet).length === 1

    const pointsAwarded: Record<string, number> = {}
    pointsAwarded[bankerId] = 0

    for (const otherId of others) {
      const otherNet = holeNets.get(otherId)!
      let exchange = 0

      if (bankerIsSoleWorst) {
        // Banker pays everyone double
        exchange = baseValue * 2
      } else if (bankerIsSoleBest) {
        // Banker collects from everyone
        exchange = -baseValue
      } else if (otherNet < bankerNet) {
        // Other player beat the banker
        exchange = baseValue
      } else if (otherNet > bankerNet) {
        // Banker beat this player
        exchange = -baseValue
      }
      // Tie = 0

      pointsAwarded[otherId] = exchange
      pointsAwarded[bankerId] -= exchange
      playerPoints.set(otherId, (playerPoints.get(otherId) || 0) + exchange)
      playerPoints.set(bankerId, (playerPoints.get(bankerId) || 0) - exchange)
    }

    holeResults.push({
      hole_number: hole.hole_number,
      banker_id: bankerId,
      banker_net: bankerNet,
      banker_sole_best: bankerIsSoleBest,
      banker_sole_worst: bankerIsSoleWorst,
      points_awarded: pointsAwarded,
    })
  }

  // Build results sorted by points
  const sorted = playerIds
    .map(id => ({ id, points: playerPoints.get(id) || 0 }))
    .sort((a, b) => b.points - a.points)

  const results = sorted.map((p, i) => ({
    trip_player_id: p.id,
    position: i + 1,
    points: p.points,
    money: p.points, // already scaled by base_value
    details: { total_points: p.points },
  }))

  const summary = `Banker: Leader at ${sorted[0].points > 0 ? '+' : ''}${sorted[0].points} points`

  return { players: results, holes: holeResults, summary }
}

function validateConfig(config: Record<string, unknown>) {
  const errors: string[] = []
  if (config.base_value != null && (typeof config.base_value !== 'number' || config.base_value < 0)) {
    errors.push('base_value must be a non-negative number')
  }
  return { valid: errors.length === 0, errors }
}

function validatePlayers(count: number) {
  if (count < 3) return { valid: false, error: 'Banker requires at least 3 players' }
  if (count > 6) return { valid: false, error: 'Banker supports at most 6 players' }
  return { valid: true }
}

export const bankerEngine: GameEngine = {
  key: 'banker',
  compute,
  validateConfig,
  validatePlayers,
}
