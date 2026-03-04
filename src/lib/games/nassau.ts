import type { GameEngine, GameEngineInput, GameEngineResult } from './types'

interface NassauBet {
  name: string              // "Front 9", "Back 9", "Overall", "Press F-3"
  start_hole: number
  end_hole: number
  player_a_score: number    // holes won by player A in this segment
  player_b_score: number
  winner: string | null     // trip_player_id or null for tie
  amount: number
  is_press: boolean
}

interface GroupNassauBet {
  name: string
  start_hole: number
  end_hole: number
  player_points: Record<string, number>  // trip_player_id -> points in segment
  winner: string | null                  // sole leader or null for tie
  amount: number
  is_press: boolean
}

/**
 * Nassau Engine
 *
 * Three match play bets: front 9, back 9, overall 18.
 * Optional auto-press when 2-down in a segment.
 *
 * Config:
 *   bet_amount: number       (default: 5)
 *   auto_press: boolean      (default: true)
 *   press_trigger: number    (default: 2, how many down triggers a press)
 *   press_amount: number|null (null = same as bet_amount)
 *
 * Players: 2-4. 2 = head-to-head match play, 3-4 = group (sole low net wins point).
 */
function compute(input: GameEngineInput): GameEngineResult {
  const { players } = input

  if (players.length < 2 || players.length > 4) {
    return {
      players: players.map(p => ({
        trip_player_id: p.trip_player_id,
        position: 1,
        points: 0,
        money: 0,
        details: { error: 'Nassau requires 2-4 players' },
      })),
      holes: [],
      summary: 'Error: Nassau requires 2-4 players',
    }
  }

  // Branch: group (3-4) vs head-to-head (2)
  if (players.length > 2) {
    return computeGroup(input)
  }

  const { scores, holes, playerStrokes, config } = input
  const betAmount = (config.bet_amount as number) ?? 5
  const autoPress = config.auto_press !== false
  const pressTrigger = (config.press_trigger as number) ?? 2
  const pressAmount = (config.press_amount as number) ?? betAmount

  const playerA = players[0].trip_player_id
  const playerB = players[1].trip_player_id

  // Build hole lookup and sort
  const holeById = new Map(holes.map(h => [h.id, h]))

  // Calculate net scores per hole per player
  const holeNets = new Map<number, { a: number; b: number }>()

  for (const score of scores) {
    const hole = holeById.get(score.hole_id)
    if (!hole) continue

    const strokesMap = playerStrokes.get(score.trip_player_id)
    const strokes = strokesMap?.get(hole.hole_number) ?? 0
    const net = score.gross_score - strokes

    if (!holeNets.has(hole.hole_number)) {
      holeNets.set(hole.hole_number, { a: 0, b: 0 })
    }
    const entry = holeNets.get(hole.hole_number)!
    if (score.trip_player_id === playerA) entry.a = net
    if (score.trip_player_id === playerB) entry.b = net
  }

  // Helper: compute match play within a range of holes
  function computeSegment(startHole: number, endHole: number): { aWins: number; bWins: number } {
    let aWins = 0
    let bWins = 0
    for (let h = startHole; h <= endHole; h++) {
      const nets = holeNets.get(h)
      if (!nets) continue
      if (nets.a < nets.b) aWins++
      else if (nets.b < nets.a) bWins++
    }
    return { aWins, bWins }
  }

  // Core bets
  const bets: NassauBet[] = []

  // Front 9
  const front = computeSegment(1, 9)
  bets.push({
    name: 'Front 9',
    start_hole: 1,
    end_hole: 9,
    player_a_score: front.aWins,
    player_b_score: front.bWins,
    winner: front.aWins > front.bWins ? playerA : front.bWins > front.aWins ? playerB : null,
    amount: betAmount,
    is_press: false,
  })

  // Back 9
  const back = computeSegment(10, 18)
  bets.push({
    name: 'Back 9',
    start_hole: 10,
    end_hole: 18,
    player_a_score: back.aWins,
    player_b_score: back.bWins,
    winner: back.aWins > back.bWins ? playerA : back.bWins > back.aWins ? playerB : null,
    amount: betAmount,
    is_press: false,
  })

  // Overall
  const overall = computeSegment(1, 18)
  bets.push({
    name: 'Overall',
    start_hole: 1,
    end_hole: 18,
    player_a_score: overall.aWins,
    player_b_score: overall.bWins,
    winner: overall.aWins > overall.bWins ? playerA : overall.bWins > overall.aWins ? playerB : null,
    amount: betAmount,
    is_press: false,
  })

  // Auto-presses
  if (autoPress) {
    // Check front 9 for press opportunities
    let frontRunning = 0 // positive = A ahead, negative = B ahead
    for (let h = 1; h <= 9; h++) {
      const nets = holeNets.get(h)
      if (!nets) continue
      if (nets.a < nets.b) frontRunning++
      else if (nets.b < nets.a) frontRunning--

      // If either player is down by press_trigger, create a press
      if (Math.abs(frontRunning) === pressTrigger && h < 9) {
        const pressStart = h + 1
        const pressResult = computeSegment(pressStart, 9)
        const pressName = `Press F-${pressStart}`
        bets.push({
          name: pressName,
          start_hole: pressStart,
          end_hole: 9,
          player_a_score: pressResult.aWins,
          player_b_score: pressResult.bWins,
          winner: pressResult.aWins > pressResult.bWins ? playerA
                : pressResult.bWins > pressResult.aWins ? playerB : null,
          amount: pressAmount,
          is_press: true,
        })
        // Reset running count for next potential press
        frontRunning = 0
      }
    }

    // Check back 9 for press opportunities
    let backRunning = 0
    for (let h = 10; h <= 18; h++) {
      const nets = holeNets.get(h)
      if (!nets) continue
      if (nets.a < nets.b) backRunning++
      else if (nets.b < nets.a) backRunning--

      if (Math.abs(backRunning) === pressTrigger && h < 18) {
        const pressStart = h + 1
        const pressResult = computeSegment(pressStart, 18)
        const pressName = `Press B-${pressStart}`
        bets.push({
          name: pressName,
          start_hole: pressStart,
          end_hole: 18,
          player_a_score: pressResult.aWins,
          player_b_score: pressResult.bWins,
          winner: pressResult.aWins > pressResult.bWins ? playerA
                : pressResult.bWins > pressResult.aWins ? playerB : null,
          amount: pressAmount,
          is_press: true,
        })
        backRunning = 0
      }
    }
  }

  // Tally money
  let aMoney = 0
  let bMoney = 0
  for (const bet of bets) {
    if (bet.winner === playerA) {
      aMoney += bet.amount
      bMoney -= bet.amount
    } else if (bet.winner === playerB) {
      bMoney += bet.amount
      aMoney -= bet.amount
    }
  }

  const presses = bets.filter(b => b.is_press).length
  const summary = `Nassau: ${bets.length} bets (${presses} presses). Net: ${aMoney > 0 ? '+' : ''}${aMoney} / ${bMoney > 0 ? '+' : ''}${bMoney}`

  return {
    players: [
      {
        trip_player_id: playerA,
        position: aMoney >= bMoney ? 1 : 2,
        points: overall.aWins,
        money: aMoney,
        details: { bets, holes_won: overall.aWins },
      },
      {
        trip_player_id: playerB,
        position: bMoney >= aMoney ? 1 : 2,
        points: overall.bWins,
        money: bMoney,
        details: { bets, holes_won: overall.bWins },
      },
    ],
    holes: bets as unknown as Record<string, unknown>[],
    summary,
  }
}

/**
 * Group Nassau (3-4 players)
 *
 * Each hole: sole lowest net score wins 1 point (ties = no points).
 * Three bets: Front 9, Back 9, Overall.
 * Sole leader in points for a segment wins bet_amount from each other player.
 * Auto-press: when any player leads all others by press_trigger points.
 */
function computeGroup(input: GameEngineInput): GameEngineResult {
  const { scores, players, holes, playerStrokes, config } = input
  const betAmount = (config.bet_amount as number) ?? 5
  const autoPress = config.auto_press !== false
  const pressTrigger = (config.press_trigger as number) ?? 2
  const pressAmount = (config.press_amount as number) ?? betAmount
  const playerIds = players.map(p => p.trip_player_id)
  const N = players.length

  // Build hole lookup
  const holeById = new Map(holes.map(h => [h.id, h]))

  // Calculate net scores per hole per player
  const holeNets = new Map<number, Map<string, number>>()
  for (const score of scores) {
    const hole = holeById.get(score.hole_id)
    if (!hole) continue
    const strokesMap = playerStrokes.get(score.trip_player_id)
    const strokes = strokesMap?.get(hole.hole_number) ?? 0
    const net = score.gross_score - strokes
    if (!holeNets.has(hole.hole_number)) {
      holeNets.set(hole.hole_number, new Map())
    }
    holeNets.get(hole.hole_number)!.set(score.trip_player_id, net)
  }

  // Find sole lowest net score winner for a hole (null if tie)
  function getHoleWinner(holeNumber: number): string | null {
    const nets = holeNets.get(holeNumber)
    if (!nets || nets.size < N) return null
    let bestScore = Infinity
    let bestPlayer: string | null = null
    let tied = false
    for (const [pid, net] of nets) {
      if (net < bestScore) {
        bestScore = net
        bestPlayer = pid
        tied = false
      } else if (net === bestScore) {
        tied = true
      }
    }
    return tied ? null : bestPlayer
  }

  // Tally points per player in a hole range
  function computeSegmentPoints(startHole: number, endHole: number): Record<string, number> {
    const points: Record<string, number> = {}
    for (const pid of playerIds) points[pid] = 0
    for (let h = startHole; h <= endHole; h++) {
      const winner = getHoleWinner(h)
      if (winner) points[winner]++
    }
    return points
  }

  // Find sole leader from points map (null if tied for lead)
  function getSoleLeader(points: Record<string, number>): string | null {
    let maxPoints = -1
    let leader: string | null = null
    let tied = false
    for (const pid of playerIds) {
      if (points[pid] > maxPoints) {
        maxPoints = points[pid]
        leader = pid
        tied = false
      } else if (points[pid] === maxPoints) {
        tied = true
      }
    }
    return tied ? null : leader
  }

  // Core bets
  const bets: GroupNassauBet[] = []

  const frontPoints = computeSegmentPoints(1, 9)
  bets.push({
    name: 'Front 9',
    start_hole: 1,
    end_hole: 9,
    player_points: frontPoints,
    winner: getSoleLeader(frontPoints),
    amount: betAmount,
    is_press: false,
  })

  const backPoints = computeSegmentPoints(10, 18)
  bets.push({
    name: 'Back 9',
    start_hole: 10,
    end_hole: 18,
    player_points: backPoints,
    winner: getSoleLeader(backPoints),
    amount: betAmount,
    is_press: false,
  })

  const overallPoints = computeSegmentPoints(1, 18)
  bets.push({
    name: 'Overall',
    start_hole: 1,
    end_hole: 18,
    player_points: overallPoints,
    winner: getSoleLeader(overallPoints),
    amount: betAmount,
    is_press: false,
  })

  // Auto-presses: when any player leads ALL others by press_trigger points
  if (autoPress) {
    function checkPresses(segStart: number, segEnd: number, prefix: string) {
      const runningPoints: Record<string, number> = {}
      for (const pid of playerIds) runningPoints[pid] = 0

      for (let h = segStart; h <= segEnd; h++) {
        const winner = getHoleWinner(h)
        if (winner) runningPoints[winner]++

        if (h >= segEnd) continue // no press on last hole

        // Check if any player leads all others by pressTrigger
        for (const pid of playerIds) {
          const leadsAll = playerIds.every(
            other => other === pid || runningPoints[pid] - runningPoints[other] >= pressTrigger
          )
          if (leadsAll) {
            const pressStart = h + 1
            const pressPoints = computeSegmentPoints(pressStart, segEnd)
            bets.push({
              name: `Press ${prefix}-${pressStart}`,
              start_hole: pressStart,
              end_hole: segEnd,
              player_points: pressPoints,
              winner: getSoleLeader(pressPoints),
              amount: pressAmount,
              is_press: true,
            })
            // Reset running points for next potential press
            for (const id of playerIds) runningPoints[id] = 0
            break // only one press per trigger point
          }
        }
      }
    }

    checkPresses(1, 9, 'F')
    checkPresses(10, 18, 'B')
  }

  // Tally money: winner of each bet collects bet amount from each loser
  const money: Record<string, number> = {}
  for (const pid of playerIds) money[pid] = 0

  for (const bet of bets) {
    if (bet.winner) {
      for (const pid of playerIds) {
        if (pid === bet.winner) {
          money[pid] += bet.amount * (N - 1)
        } else {
          money[pid] -= bet.amount
        }
      }
    }
  }

  // Build results
  const presses = bets.filter(b => b.is_press).length
  const summary = `Nassau: ${bets.length} bets (${presses} presses). ${playerIds.map(pid => {
    const m = money[pid]
    return `${m > 0 ? '+' : ''}${m}`
  }).join(' / ')}`

  const playerResults = playerIds.map(pid => ({
    trip_player_id: pid,
    position: 0,
    points: overallPoints[pid],
    money: money[pid],
    details: { bets, holes_won: overallPoints[pid] },
  }))

  // Sort by money descending and assign positions
  playerResults.sort((a, b) => b.money - a.money)
  playerResults.forEach((r, i) => { r.position = i + 1 })

  return {
    players: playerResults,
    holes: bets as unknown as Record<string, unknown>[],
    summary,
  }
}

function validateConfig(config: Record<string, unknown>) {
  const errors: string[] = []
  if (config.bet_amount != null && (typeof config.bet_amount !== 'number' || config.bet_amount < 0)) {
    errors.push('bet_amount must be a non-negative number')
  }
  return { valid: errors.length === 0, errors }
}

function validatePlayers(count: number) {
  if (count < 2 || count > 4) return { valid: false, error: 'Nassau requires 2-4 players' }
  return { valid: true }
}

export const nassauEngine: GameEngine = {
  key: 'nassau',
  compute,
  validateConfig,
  validatePlayers,
}
