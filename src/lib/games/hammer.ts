import type { GameEngine, GameEngineInput, GameEngineResult } from './types'

/**
 * Hammer Engine
 *
 * 2-4 players (typically 2, or 2 teams of 2). Match play bet where
 * either side can "Hammer" to double the stakes on a hole.
 * The other side must accept (play at double) or drop (concede at current value).
 *
 * Config:
 *   base_value: number                   (default: 1)
 *   max_hammers_per_hole: number | null  (null = unlimited)
 *   hole_events: Array<{
 *     hole_number: number
 *     hammers: Array<{
 *       by: string            (trip_player_id or 'team_a'/'team_b')
 *       accepted: boolean     (true = play at double, false = concede)
 *     }>
 *   }>
 *
 * Without hole_events, computes as straight match play at base_value per hole.
 */
function compute(input: GameEngineInput): GameEngineResult {
  const { scores, players, holes, playerStrokes, config } = input
  const baseValue = (config.base_value as number) ?? 1

  const holeById = new Map(holes.map(h => [h.id, h]))
  const sortedHoles = [...holes].sort((a, b) => a.hole_number - b.hole_number)

  // Get hole events
  const holeEvents = (config.hole_events as Array<{
    hole_number: number
    hammers: Array<{ by: string; accepted: boolean }>
  }>) || []
  const eventsMap = new Map(holeEvents.map(e => [e.hole_number, e]))

  // Determine sides — if team_based, group by side; otherwise 1v1
  const sideA: string[] = []
  const sideB: string[] = []
  for (const p of players) {
    if (p.side === 'team_b') sideB.push(p.trip_player_id)
    else sideA.push(p.trip_player_id)
  }

  if (sideA.length === 0 || sideB.length === 0) {
    // For 2-player game without explicit sides, assign first to A, second to B
    if (players.length === 2) {
      sideA.length = 0
      sideB.length = 0
      sideA.push(players[0].trip_player_id)
      sideB.push(players[1].trip_player_id)
    } else {
      return {
        players: players.map(p => ({
          trip_player_id: p.trip_player_id, position: 1, points: 0, money: 0,
          details: { error: 'Hammer requires 2 sides' },
        })),
        holes: [],
        summary: 'Error: Hammer requires 2 sides',
      }
    }
  }

  let aTotal = 0
  let bTotal = 0
  const holeResults: Record<string, unknown>[] = []

  for (const hole of sortedHoles) {
    // Best net per side
    function getBestNet(teamIds: string[]): number | null {
      let best = Infinity
      for (const pid of teamIds) {
        const score = scores.find(s => s.trip_player_id === pid && s.hole_id === hole.id)
        if (!score) continue
        const strokesMap = playerStrokes.get(pid)
        const strokes = strokesMap?.get(hole.hole_number) ?? 0
        const net = score.gross_score - strokes
        if (net < best) best = net
      }
      return best < Infinity ? best : null
    }

    const aNet = getBestNet(sideA)
    const bNet = getBestNet(sideB)

    if (aNet == null || bNet == null) {
      holeResults.push({
        hole_number: hole.hole_number,
        result: 'incomplete',
        stake: baseValue,
        a_net: aNet,
        b_net: bNet,
      })
      continue
    }

    // Calculate stake based on hammers
    const events = eventsMap.get(hole.hole_number)
    let stake = baseValue
    let conceded = false
    let concededTo: 'a' | 'b' | null = null

    if (events) {
      for (const hammer of events.hammers) {
        if (!hammer.accepted) {
          // Concede at current stake
          conceded = true
          // The side that hammered wins (the other side conceded)
          const hammerByA = hammer.by === 'team_a' || sideA.includes(hammer.by)
          concededTo = hammerByA ? 'a' : 'b'
          break
        }
        // Accepted — double the stake
        stake *= 2
      }
    }

    let aPoints = 0
    let bPoints = 0

    if (conceded) {
      // Side that hammered wins the current stake
      if (concededTo === 'a') {
        aPoints = stake
        bPoints = -stake
      } else {
        bPoints = stake
        aPoints = -stake
      }
    } else if (aNet < bNet) {
      aPoints = stake
      bPoints = -stake
    } else if (bNet < aNet) {
      bPoints = stake
      aPoints = -stake
    }
    // Tie = 0

    aTotal += aPoints
    bTotal += bPoints

    holeResults.push({
      hole_number: hole.hole_number,
      a_net: aNet,
      b_net: bNet,
      stake,
      hammers: events?.hammers.length || 0,
      conceded,
      a_points: aPoints,
      b_points: bPoints,
    })
  }

  // Build player results
  const results = players.map(p => {
    const isA = sideA.includes(p.trip_player_id)
    const total = isA ? aTotal : bTotal
    return {
      trip_player_id: p.trip_player_id,
      position: total >= 0 ? 1 : 2,
      points: total,
      money: total,
      details: {
        side: isA ? 'team_a' : 'team_b',
        total,
      },
    }
  })

  const totalHammers = holeEvents.reduce((sum, e) => sum + e.hammers.length, 0)
  const summary = `Hammer: ${Math.abs(aTotal)} point spread${totalHammers > 0 ? ` (${totalHammers} hammers)` : ''}. ${aTotal > 0 ? 'Side A' : aTotal < 0 ? 'Side B' : 'Tied'} ${aTotal !== 0 ? `wins` : ''}`

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
  if (count < 2) return { valid: false, error: 'Hammer requires at least 2 players' }
  if (count > 4) return { valid: false, error: 'Hammer supports at most 4 players' }
  return { valid: true }
}

export const hammerEngine: GameEngine = {
  key: 'hammer',
  compute,
  validateConfig,
  validatePlayers,
}
