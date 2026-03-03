import type { GameEngine, GameEngineInput, GameEngineResult } from './types'

/**
 * Wolf Engine
 *
 * 4-5 players. Rotating "Wolf" each hole picks a partner after seeing
 * tee shots, or goes Lone Wolf (1v3) for double, or Blind Wolf
 * (declares before tee shots) for triple.
 *
 * Config:
 *   point_value: number              (default: 1)
 *   lone_wolf_multiplier: number     (default: 2)
 *   blind_wolf_multiplier: number    (default: 3)
 *   rotation: string[]               (player IDs in tee order — auto-generated if omitted)
 *   hole_decisions: Array<{
 *     hole_number: number
 *     wolf_id: string                (trip_player_id of the wolf)
 *     decision: 'partner' | 'lone' | 'blind'
 *     partner_id?: string            (required if decision = 'partner')
 *   }>
 *
 * If hole_decisions is missing, the engine computes results assuming
 * no decisions have been made yet (returns zero-point placeholder).
 */
function compute(input: GameEngineInput): GameEngineResult {
  const { scores, players, holes, playerStrokes, config } = input
  const pointValue = (config.point_value as number) ?? 1
  const loneMult = (config.lone_wolf_multiplier as number) ?? 2
  const blindMult = (config.blind_wolf_multiplier as number) ?? 3

  const holeById = new Map(holes.map(h => [h.id, h]))
  const sortedHoles = [...holes].sort((a, b) => a.hole_number - b.hole_number)
  const playerIds = players.map(p => p.trip_player_id)
  const playerCount = playerIds.length

  // Build rotation order
  const rotation = (config.rotation as string[]) || playerIds

  // Get per-hole decisions
  const decisions = (config.hole_decisions as Array<{
    hole_number: number
    wolf_id: string
    decision: 'partner' | 'lone' | 'blind'
    partner_id?: string
  }>) || []
  const decisionMap = new Map(decisions.map(d => [d.hole_number, d]))

  // Score tracking
  const playerPoints = new Map<string, number>()
  playerIds.forEach(id => playerPoints.set(id, 0))

  const holeResults: Record<string, unknown>[] = []

  for (let i = 0; i < sortedHoles.length; i++) {
    const hole = sortedHoles[i]
    const wolfId = rotation[i % rotation.length]
    const decision = decisionMap.get(hole.hole_number)

    // Get net scores for this hole
    const holeNets = new Map<string, number>()
    for (const pid of playerIds) {
      const score = scores.find(s => s.trip_player_id === pid && s.hole_id === hole.id)
      if (!score) continue
      const strokesMap = playerStrokes.get(pid)
      const strokes = strokesMap?.get(hole.hole_number) ?? 0
      holeNets.set(pid, score.gross_score - strokes)
    }

    // Not enough scores for this hole
    if (holeNets.size < playerCount) {
      holeResults.push({
        hole_number: hole.hole_number,
        wolf_id: wolfId,
        decision: decision?.decision || null,
        result: 'incomplete',
        points_awarded: {},
      })
      continue
    }

    // No decision recorded for this hole — skip
    if (!decision) {
      holeResults.push({
        hole_number: hole.hole_number,
        wolf_id: wolfId,
        decision: null,
        result: 'no_decision',
        points_awarded: {},
      })
      continue
    }

    let multiplier = pointValue
    let wolfTeam: string[]
    let opposingTeam: string[]

    if (decision.decision === 'blind') {
      multiplier = pointValue * blindMult
      wolfTeam = [wolfId]
      opposingTeam = playerIds.filter(id => id !== wolfId)
    } else if (decision.decision === 'lone') {
      multiplier = pointValue * loneMult
      wolfTeam = [wolfId]
      opposingTeam = playerIds.filter(id => id !== wolfId)
    } else {
      // Partner mode
      wolfTeam = [wolfId, decision.partner_id!]
      opposingTeam = playerIds.filter(id => !wolfTeam.includes(id))
    }

    // Best ball per side
    const wolfBest = Math.min(...wolfTeam.map(id => holeNets.get(id) ?? Infinity))
    const oppBest = Math.min(...opposingTeam.map(id => holeNets.get(id) ?? Infinity))

    const pointsAwarded: Record<string, number> = {}

    if (wolfBest < oppBest) {
      // Wolf team wins
      for (const id of wolfTeam) {
        const pts = multiplier
        playerPoints.set(id, (playerPoints.get(id) || 0) + pts)
        pointsAwarded[id] = pts
      }
      for (const id of opposingTeam) {
        const pts = -multiplier
        playerPoints.set(id, (playerPoints.get(id) || 0) + pts)
        pointsAwarded[id] = pts
      }
    } else if (oppBest < wolfBest) {
      // Opposing team wins
      for (const id of wolfTeam) {
        const pts = -multiplier
        playerPoints.set(id, (playerPoints.get(id) || 0) + pts)
        pointsAwarded[id] = pts
      }
      for (const id of opposingTeam) {
        const pts = multiplier
        playerPoints.set(id, (playerPoints.get(id) || 0) + pts)
        pointsAwarded[id] = pts
      }
    }
    // Tie = no points exchanged

    holeResults.push({
      hole_number: hole.hole_number,
      wolf_id: wolfId,
      decision: decision.decision,
      partner_id: decision.partner_id || null,
      wolf_best: wolfBest,
      opp_best: oppBest,
      multiplier,
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
    money: p.points, // points already scaled by point_value
    details: { total_points: p.points },
  }))

  const topPlayer = sorted[0]
  const summary = decisions.length > 0
    ? `Wolf: Leader at ${topPlayer.points > 0 ? '+' : ''}${topPlayer.points} points`
    : 'Wolf: No decisions recorded yet'

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
  if (count < 4 || count > 5) return { valid: false, error: 'Wolf requires 4-5 players' }
  return { valid: true }
}

export const wolfEngine: GameEngine = {
  key: 'wolf',
  compute,
  validateConfig,
  validatePlayers,
}
