import { calculateMatchPlay, getHoleResults } from '../match-play'
import type { MatchFormat } from '../types'

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Create 18 holes with sequential handicap indices. Par defaults to 4 for all holes. */
function makeHoles(count = 18, pars?: number[]) {
  return Array.from({ length: count }, (_, i) => ({
    id: `hole-${i + 1}`,
    hole_number: i + 1,
    par: pars ? pars[i] : 4,
    handicap_index: i + 1, // hole 1 is hardest
  }))
}

/** Create match players for a 1v1 match. */
function make1v1Players() {
  return [
    { trip_player_id: 'player-a', side: 'team_a' as const },
    { trip_player_id: 'player-b', side: 'team_b' as const },
  ]
}

/** Create match players for a 2v2 match. */
function make2v2Players() {
  return [
    { trip_player_id: 'player-a1', side: 'team_a' as const },
    { trip_player_id: 'player-a2', side: 'team_a' as const },
    { trip_player_id: 'player-b1', side: 'team_b' as const },
    { trip_player_id: 'player-b2', side: 'team_b' as const },
  ]
}

/** Create an empty strokes map (no handicap strokes). */
function noStrokes(playerIds: string[]): Map<string, Map<number, number>> {
  const map = new Map<string, Map<number, number>>()
  for (const id of playerIds) {
    map.set(id, new Map())
  }
  return map
}

/**
 * Create strokes map where a specific player gets 1 stroke on each of the
 * given hole numbers.
 */
function makeStrokesMap(
  entries: { playerId: string; strokeHoles: number[] }[]
): Map<string, Map<number, number>> {
  const map = new Map<string, Map<number, number>>()
  for (const { playerId, strokeHoles } of entries) {
    const holeMap = new Map<number, number>()
    for (const h of strokeHoles) {
      holeMap.set(h, (holeMap.get(h) ?? 0) + 1)
    }
    map.set(playerId, holeMap)
  }
  return map
}

/**
 * Generate scores for one player across a range of holes.
 * grossScores[i] corresponds to hole (startHole + i).
 */
function makeScores(
  playerId: string,
  grossScores: number[],
  holes: { id: string; hole_number: number }[],
  startHole = 1
) {
  return grossScores.map((gs, i) => {
    const holeNum = startHole + i
    const hole = holes.find(h => h.hole_number === holeNum)
    if (!hole) throw new Error(`No hole found for hole_number ${holeNum}`)
    return {
      trip_player_id: playerId,
      hole_id: hole.id,
      gross_score: gs,
    }
  })
}

// ---------------------------------------------------------------------------
// 1v1 Match Play tests
// ---------------------------------------------------------------------------
describe('1v1 Match Play', () => {
  const holes = makeHoles()
  const players = make1v1Players()
  const format: MatchFormat = '1v1_match'

  it('should return AS with 0 holes played when no scores exist', () => {
    const strokes = noStrokes(['player-a', 'player-b'])
    const result = calculateMatchPlay([], players, holes, strokes, format)

    expect(result.status).toBe('AS')
    expect(result.leader).toBe('tie')
    expect(result.holesPlayed).toBe(0)
    expect(result.holesRemaining).toBe(18)
    expect(result.isComplete).toBe(false)
    expect(result.teamAPoints).toBe(0)
    expect(result.teamBPoints).toBe(0)
  })

  it('should show correct status after 1 hole where player A wins', () => {
    const strokes = noStrokes(['player-a', 'player-b'])
    // Player A scores 3, Player B scores 5 on hole 1
    const scores = [
      ...makeScores('player-a', [3], holes),
      ...makeScores('player-b', [5], holes),
    ]

    const result = calculateMatchPlay(scores, players, holes, strokes, format)

    expect(result.status).toBe('1UP thru 1')
    expect(result.leader).toBe('team_a')
    expect(result.holesPlayed).toBe(1)
    expect(result.holesRemaining).toBe(17)
    expect(result.isComplete).toBe(false)
  })

  it('should show Player A wins 3&2', () => {
    const strokes = noStrokes(['player-a', 'player-b'])

    // Player A wins holes 1-5, halves 6-10, loses 11-12, halves 13-14, wins 15-16
    // Through 16 holes: A won 7, B won 2, halved 7 => lead = +5
    // But match would end earlier...
    // Let me be more precise:
    // A needs to be 3 up with 2 to play (through 16 holes).
    // Holes 1-16: A wins 3 more holes than B.
    // Let's say: A wins holes 1,2,3. B wins nothing. Rest halved. => 3 up after 3.
    // 15 remaining, 3 up. Not clinched (3 <= 15).
    // Need lead > remaining.
    // After 16 holes: need lead > 2. So lead = 3.
    // A wins holes 1, 5, 10. Rest halved. After 16: 3 up, 2 to play => 3&2.

    const aScores = Array(18).fill(4) // par on everything
    aScores[0] = 3  // wins hole 1
    aScores[4] = 3  // wins hole 5
    aScores[9] = 3  // wins hole 10

    const bScores = Array(18).fill(4) // par on everything

    const scores = [
      ...makeScores('player-a', aScores, holes),
      ...makeScores('player-b', bScores, holes),
    ]

    const result = calculateMatchPlay(scores, players, holes, strokes, format)

    expect(result.status).toBe('3&2')
    expect(result.leader).toBe('team_a')
    expect(result.holesPlayed).toBe(16)
    expect(result.holesRemaining).toBe(2)
    expect(result.isComplete).toBe(true)
    expect(result.teamAPoints).toBe(1)
    expect(result.teamBPoints).toBe(0)
  })

  it('should show Player A wins 1UP after 18 holes', () => {
    const strokes = noStrokes(['player-a', 'player-b'])

    // A wins hole 18, rest halved => 1UP after 18
    const aScores = Array(18).fill(4)
    aScores[17] = 3 // wins hole 18

    const bScores = Array(18).fill(4)

    const scores = [
      ...makeScores('player-a', aScores, holes),
      ...makeScores('player-b', bScores, holes),
    ]

    const result = calculateMatchPlay(scores, players, holes, strokes, format)

    expect(result.status).toBe('1UP')
    expect(result.leader).toBe('team_a')
    expect(result.holesPlayed).toBe(18)
    expect(result.holesRemaining).toBe(0)
    expect(result.isComplete).toBe(true)
    expect(result.teamAPoints).toBe(1)
    expect(result.teamBPoints).toBe(0)
  })

  it('should show AS (all square) after 18 holes when tied', () => {
    const strokes = noStrokes(['player-a', 'player-b'])

    // Both players score the same on every hole
    const aScores = Array(18).fill(4)
    const bScores = Array(18).fill(4)

    const scores = [
      ...makeScores('player-a', aScores, holes),
      ...makeScores('player-b', bScores, holes),
    ]

    const result = calculateMatchPlay(scores, players, holes, strokes, format)

    expect(result.status).toBe('AS')
    expect(result.leader).toBe('tie')
    expect(result.holesPlayed).toBe(18)
    expect(result.holesRemaining).toBe(0)
    expect(result.isComplete).toBe(true)
    expect(result.teamAPoints).toBe(0.5)
    expect(result.teamBPoints).toBe(0.5)
  })

  it('should show partial round status: 2UP thru 9', () => {
    const strokes = noStrokes(['player-a', 'player-b'])

    // Player A wins holes 1 and 3, rest halved through 9 holes
    const aScores = [3, 4, 3, 4, 4, 4, 4, 4, 4] // holes 1-9
    const bScores = [4, 4, 4, 4, 4, 4, 4, 4, 4]

    const scores = [
      ...makeScores('player-a', aScores, holes),
      ...makeScores('player-b', bScores, holes),
    ]

    const result = calculateMatchPlay(scores, players, holes, strokes, format)

    expect(result.status).toBe('2UP thru 9')
    expect(result.leader).toBe('team_a')
    expect(result.holesPlayed).toBe(9)
    expect(result.holesRemaining).toBe(9)
    expect(result.isComplete).toBe(false)
  })

  it('should correctly apply handicap strokes that change the outcome', () => {
    // Player A has 0 strokes, Player B gets 1 stroke on hole 1 (hardest hole)
    // Gross: A=4, B=5 on hole 1. Without strokes, A wins.
    // With strokes: A net=4, B net=4 => halved.
    const strokes = makeStrokesMap([
      { playerId: 'player-a', strokeHoles: [] },
      { playerId: 'player-b', strokeHoles: [1] },
    ])

    // All par 4. Player A scores 4, Player B scores 5 on hole 1.
    // Without handicap: A wins hole 1. With handicap: halved.
    // Then hole 2: A scores 4, B scores 4 => halved regardless.
    const scores = [
      ...makeScores('player-a', [4, 4], holes),
      ...makeScores('player-b', [5, 4], holes),
    ]

    const result = calculateMatchPlay(scores, players, holes, strokes, format)

    expect(result.status).toBe('AS thru 2')
    expect(result.leader).toBe('tie')
    expect(result.holesPlayed).toBe(2)
    expect(result.isComplete).toBe(false)
  })

  it('should show Player B wins when B has better net scores', () => {
    const strokes = noStrokes(['player-a', 'player-b'])

    // Player B wins holes 1, 2, 3. Rest halved through 9.
    // After 9: B is 3 up, 9 remain => not clinched.
    // Through 15: B still 3 up, 3 remain => not clinched (3 > 3 is false).
    // Through 16: B 3 up, 2 remain => 3 > 2. Clinched!
    const aScores = Array(18).fill(4)
    const bScores = Array(18).fill(4)
    bScores[0] = 3  // B wins hole 1
    bScores[1] = 3  // B wins hole 2
    bScores[2] = 3  // B wins hole 3

    const scores = [
      ...makeScores('player-a', aScores, holes),
      ...makeScores('player-b', bScores, holes),
    ]

    const result = calculateMatchPlay(scores, players, holes, strokes, format)

    expect(result.status).toBe('3&2')
    expect(result.leader).toBe('team_b')
    expect(result.isComplete).toBe(true)
    expect(result.teamAPoints).toBe(0)
    expect(result.teamBPoints).toBe(1)
  })

  it('should handle a blowout: 7&6', () => {
    const strokes = noStrokes(['player-a', 'player-b'])

    // A wins every hole. After 12 holes: 12 up, 6 remain => clinched at hole 7.
    // Actually, 7 up after 7 holes, 11 remain => 7 > 11? No.
    // 10 up after 10 holes, 8 remain => 10 > 8 => yes. Wait, let's recalc.
    // Lead after hole 1: 1, remaining 17 => 1 > 17? No
    // Lead after hole 7: 7, remaining 11 => 7 > 11? No
    // Lead after hole 12: 12, remaining 6 => 12 > 6? Yes. Clinched at 12. => 12&6
    // Hmm. For 7&6 we need lead=7 after 12 holes.
    // A wins 7 of the first 12, halves rest.
    const aScores = Array(18).fill(4)
    const bScores = Array(18).fill(4)
    // A wins holes 1-7
    for (let i = 0; i < 7; i++) aScores[i] = 3

    const scores = [
      ...makeScores('player-a', aScores, holes),
      ...makeScores('player-b', bScores, holes),
    ]

    const result = calculateMatchPlay(scores, players, holes, strokes, format)

    // After hole 7: lead=7, remaining=11 => 7 <= 11, not clinched
    // After hole 8-11: still 7 up, 10,9,8,7 remaining
    // After hole 11: 7 up, 7 remain => 7 > 7? No
    // After hole 12: 7 up, 6 remain => 7 > 6. YES => 7&6
    expect(result.status).toBe('7&6')
    expect(result.leader).toBe('team_a')
    expect(result.holesPlayed).toBe(12)
    expect(result.holesRemaining).toBe(6)
    expect(result.isComplete).toBe(true)
  })

  it('should handle 10&8: maximum blowout on front nine', () => {
    const strokes = noStrokes(['player-a', 'player-b'])

    // A wins all 18 holes. After 10: lead=10, remaining=8 => 10 > 8 => clinched
    const aScores = Array(18).fill(3) // birdie every hole
    const bScores = Array(18).fill(5) // bogey every hole

    const scores = [
      ...makeScores('player-a', aScores, holes),
      ...makeScores('player-b', bScores, holes),
    ]

    const result = calculateMatchPlay(scores, players, holes, strokes, format)

    expect(result.status).toBe('10&8')
    expect(result.leader).toBe('team_a')
    expect(result.holesPlayed).toBe(10)
    expect(result.holesRemaining).toBe(8)
    expect(result.isComplete).toBe(true)
  })

  it('should handle match that swings back and forth', () => {
    const strokes = noStrokes(['player-a', 'player-b'])

    // A wins odd holes, B wins even holes through 18 => all square
    const aScores: number[] = []
    const bScores: number[] = []
    for (let i = 0; i < 18; i++) {
      if (i % 2 === 0) {
        aScores.push(3) // A wins odd holes (0-indexed even)
        bScores.push(4)
      } else {
        aScores.push(4)
        bScores.push(3) // B wins even holes
      }
    }

    const scores = [
      ...makeScores('player-a', aScores, holes),
      ...makeScores('player-b', bScores, holes),
    ]

    const result = calculateMatchPlay(scores, players, holes, strokes, format)

    expect(result.status).toBe('AS')
    expect(result.leader).toBe('tie')
    expect(result.isComplete).toBe(true)
    expect(result.teamAPoints).toBe(0.5)
    expect(result.teamBPoints).toBe(0.5)
  })

  it('should handle a match won on the 18th hole (1UP)', () => {
    const strokes = noStrokes(['player-a', 'player-b'])

    // All square through 17, B wins 18
    const aScores = Array(18).fill(4)
    const bScores = Array(18).fill(4)
    bScores[17] = 3 // B wins hole 18

    const scores = [
      ...makeScores('player-a', aScores, holes),
      ...makeScores('player-b', bScores, holes),
    ]

    const result = calculateMatchPlay(scores, players, holes, strokes, format)

    expect(result.status).toBe('1UP')
    expect(result.leader).toBe('team_b')
    expect(result.holesPlayed).toBe(18)
    expect(result.holesRemaining).toBe(0)
    expect(result.isComplete).toBe(true)
    expect(result.teamAPoints).toBe(0)
    expect(result.teamBPoints).toBe(1)
  })

  it('should handle handicap strokes on multiple holes changing a loss to a win', () => {
    // Player B gets strokes on holes 1-10 (10 handicap).
    // Gross scores: A=4 every hole, B=5 on holes 1-10, B=4 on holes 11-18.
    // Without strokes: A wins holes 1-10 (10&8 effectively).
    // With strokes: B net = 4 on holes 1-10 (5-1), matching A => all halved => AS.
    const strokes = makeStrokesMap([
      { playerId: 'player-a', strokeHoles: [] },
      { playerId: 'player-b', strokeHoles: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
    ])

    const aScores = Array(18).fill(4)
    const bScores = [...Array(10).fill(5), ...Array(8).fill(4)]

    const scores = [
      ...makeScores('player-a', aScores, holes),
      ...makeScores('player-b', bScores, holes),
    ]

    const result = calculateMatchPlay(scores, players, holes, strokes, format)

    expect(result.status).toBe('AS')
    expect(result.leader).toBe('tie')
    expect(result.isComplete).toBe(true)
    expect(result.teamAPoints).toBe(0.5)
    expect(result.teamBPoints).toBe(0.5)
  })
})

// ---------------------------------------------------------------------------
// 2v2 Best Ball tests
// ---------------------------------------------------------------------------
describe('2v2 Best Ball', () => {
  const holes = makeHoles()
  const players = make2v2Players()
  const format: MatchFormat = '2v2_best_ball'

  it('should select best (lowest) net from each team', () => {
    const strokes = noStrokes(['player-a1', 'player-a2', 'player-b1', 'player-b2'])

    // Hole 1: A1=5, A2=3 (best=3), B1=4, B2=4 (best=4) => team_a wins
    const scores = [
      { trip_player_id: 'player-a1', hole_id: 'hole-1', gross_score: 5 },
      { trip_player_id: 'player-a2', hole_id: 'hole-1', gross_score: 3 },
      { trip_player_id: 'player-b1', hole_id: 'hole-1', gross_score: 4 },
      { trip_player_id: 'player-b2', hole_id: 'hole-1', gross_score: 4 },
    ]

    const holeResults = getHoleResults(scores, players, holes, strokes, format)
    expect(holeResults).toHaveLength(1)
    expect(holeResults[0].teamANet).toBe(3)
    expect(holeResults[0].teamBNet).toBe(4)
    expect(holeResults[0].winner).toBe('team_a')
  })

  it('should handle Team A winning overall in best ball format', () => {
    const strokes = noStrokes(['player-a1', 'player-a2', 'player-b1', 'player-b2'])

    // 18 holes: Team A best ball beats Team B best ball on 5 holes, rest halved.
    // A wins holes 1-5, halves 6-18.
    // After 5: 5 up, 13 remaining => 5 > 13? No.
    // After 14: 5 up, 4 remaining => 5 > 4. Yes => 5&4.
    const scores: { trip_player_id: string; hole_id: string; gross_score: number }[] = []

    for (let h = 1; h <= 18; h++) {
      const holeId = `hole-${h}`
      if (h <= 5) {
        // Team A wins: A2 birdies, everyone else pars
        scores.push({ trip_player_id: 'player-a1', hole_id: holeId, gross_score: 4 })
        scores.push({ trip_player_id: 'player-a2', hole_id: holeId, gross_score: 3 })
        scores.push({ trip_player_id: 'player-b1', hole_id: holeId, gross_score: 4 })
        scores.push({ trip_player_id: 'player-b2', hole_id: holeId, gross_score: 4 })
      } else {
        // All par
        scores.push({ trip_player_id: 'player-a1', hole_id: holeId, gross_score: 4 })
        scores.push({ trip_player_id: 'player-a2', hole_id: holeId, gross_score: 4 })
        scores.push({ trip_player_id: 'player-b1', hole_id: holeId, gross_score: 4 })
        scores.push({ trip_player_id: 'player-b2', hole_id: holeId, gross_score: 4 })
      }
    }

    const result = calculateMatchPlay(scores, players, holes, strokes, format)

    expect(result.status).toBe('5&4')
    expect(result.leader).toBe('team_a')
    expect(result.holesPlayed).toBe(14)
    expect(result.holesRemaining).toBe(4)
    expect(result.isComplete).toBe(true)
    expect(result.teamAPoints).toBe(1)
    expect(result.teamBPoints).toBe(0)
  })

  it('should handle one player playing badly but partner carrying them', () => {
    const strokes = noStrokes(['player-a1', 'player-a2', 'player-b1', 'player-b2'])

    // Through 18 holes:
    // A1 scores 8 (double-par) every hole, but A2 scores 3 (birdie) every hole
    // B1 and B2 both score 4 every hole
    // Best ball: Team A = 3 (A2 carries), Team B = 4 => A wins every hole
    // After 10: 10 up, 8 remaining => 10 > 8 => clinched at 10. 10&8.
    const scores: { trip_player_id: string; hole_id: string; gross_score: number }[] = []

    for (let h = 1; h <= 18; h++) {
      const holeId = `hole-${h}`
      scores.push({ trip_player_id: 'player-a1', hole_id: holeId, gross_score: 8 })
      scores.push({ trip_player_id: 'player-a2', hole_id: holeId, gross_score: 3 })
      scores.push({ trip_player_id: 'player-b1', hole_id: holeId, gross_score: 4 })
      scores.push({ trip_player_id: 'player-b2', hole_id: holeId, gross_score: 4 })
    }

    const result = calculateMatchPlay(scores, players, holes, strokes, format)

    expect(result.status).toBe('10&8')
    expect(result.leader).toBe('team_a')
    expect(result.isComplete).toBe(true)
  })

  it('should apply handicap strokes correctly before best ball comparison', () => {
    // Player A1: 0 strokes (scratch)
    // Player A2: 0 strokes
    // Player B1: 0 strokes
    // Player B2: gets a stroke on hole 1
    //
    // Hole 1: A1=4, A2=4 => best A=4
    //          B1=5, B2=5 (gross). B2 net = 5-1=4 => best B=4 => halved
    // Hole 2: A1=4, A2=4 => best A=4
    //          B1=5, B2=5 => best B=5 => A wins
    const strokes = makeStrokesMap([
      { playerId: 'player-a1', strokeHoles: [] },
      { playerId: 'player-a2', strokeHoles: [] },
      { playerId: 'player-b1', strokeHoles: [] },
      { playerId: 'player-b2', strokeHoles: [1] },
    ])

    const scores = [
      // Hole 1
      { trip_player_id: 'player-a1', hole_id: 'hole-1', gross_score: 4 },
      { trip_player_id: 'player-a2', hole_id: 'hole-1', gross_score: 4 },
      { trip_player_id: 'player-b1', hole_id: 'hole-1', gross_score: 5 },
      { trip_player_id: 'player-b2', hole_id: 'hole-1', gross_score: 5 },
      // Hole 2
      { trip_player_id: 'player-a1', hole_id: 'hole-2', gross_score: 4 },
      { trip_player_id: 'player-a2', hole_id: 'hole-2', gross_score: 4 },
      { trip_player_id: 'player-b1', hole_id: 'hole-2', gross_score: 5 },
      { trip_player_id: 'player-b2', hole_id: 'hole-2', gross_score: 5 },
    ]

    const holeResults = getHoleResults(scores, players, holes, strokes, format)

    // Hole 1: A best=4, B best=min(5, 5-1=4)=4 => halved
    expect(holeResults[0].winner).toBe('halved')
    expect(holeResults[0].teamANet).toBe(4)
    expect(holeResults[0].teamBNet).toBe(4)

    // Hole 2: A best=4, B best=min(5,5)=5 => team_a wins
    expect(holeResults[1].winner).toBe('team_a')
    expect(holeResults[1].teamANet).toBe(4)
    expect(holeResults[1].teamBNet).toBe(5)
  })

  it('should return AS when no scores exist for 2v2', () => {
    const strokes = noStrokes(['player-a1', 'player-a2', 'player-b1', 'player-b2'])
    const result = calculateMatchPlay([], players, holes, strokes, format)

    expect(result.status).toBe('AS')
    expect(result.leader).toBe('tie')
    expect(result.holesPlayed).toBe(0)
    expect(result.isComplete).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// getHoleResults tests
// ---------------------------------------------------------------------------
describe('getHoleResults', () => {
  const holes = makeHoles()
  const players = make1v1Players()
  const format: MatchFormat = '1v1_match'

  it('should return results sorted by hole number', () => {
    const strokes = noStrokes(['player-a', 'player-b'])

    // Submit scores out of order: hole 3, then hole 1
    const scores = [
      { trip_player_id: 'player-a', hole_id: 'hole-3', gross_score: 4 },
      { trip_player_id: 'player-b', hole_id: 'hole-3', gross_score: 5 },
      { trip_player_id: 'player-a', hole_id: 'hole-1', gross_score: 5 },
      { trip_player_id: 'player-b', hole_id: 'hole-1', gross_score: 4 },
    ]

    const results = getHoleResults(scores, players, holes, strokes, format)

    expect(results).toHaveLength(2)
    expect(results[0].holeNumber).toBe(1)
    expect(results[0].winner).toBe('team_b')
    expect(results[1].holeNumber).toBe(3)
    expect(results[1].winner).toBe('team_a')
  })

  it('should skip holes where only one side has a score', () => {
    const strokes = noStrokes(['player-a', 'player-b'])

    const scores = [
      // Only player A has a score on hole 1
      { trip_player_id: 'player-a', hole_id: 'hole-1', gross_score: 4 },
      // Both have scores on hole 2
      { trip_player_id: 'player-a', hole_id: 'hole-2', gross_score: 4 },
      { trip_player_id: 'player-b', hole_id: 'hole-2', gross_score: 5 },
    ]

    const results = getHoleResults(scores, players, holes, strokes, format)

    expect(results).toHaveLength(1)
    expect(results[0].holeNumber).toBe(2)
  })

  it('should correctly mark halved holes', () => {
    const strokes = noStrokes(['player-a', 'player-b'])

    const scores = [
      { trip_player_id: 'player-a', hole_id: 'hole-1', gross_score: 4 },
      { trip_player_id: 'player-b', hole_id: 'hole-1', gross_score: 4 },
    ]

    const results = getHoleResults(scores, players, holes, strokes, format)

    expect(results).toHaveLength(1)
    expect(results[0].winner).toBe('halved')
    expect(results[0].teamANet).toBe(4)
    expect(results[0].teamBNet).toBe(4)
  })
})

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------
describe('Edge cases', () => {
  const holes = makeHoles()
  const players = make1v1Players()
  const format: MatchFormat = '1v1_match'

  it('should handle a 9-hole match format with result on final hole', () => {
    const strokes = noStrokes(['player-a', 'player-b'])

    // Player A wins hole 9 only, rest halved through 9 => 1UP after 9
    const aScores = [4, 4, 4, 4, 4, 4, 4, 4, 3]
    const bScores = [4, 4, 4, 4, 4, 4, 4, 4, 4]

    const scores = [
      ...makeScores('player-a', aScores, holes),
      ...makeScores('player-b', bScores, holes),
    ]

    const result = calculateMatchPlay(scores, players, holes, strokes, format, 9)

    expect(result.status).toBe('1UP')
    expect(result.leader).toBe('team_a')
    expect(result.holesPlayed).toBe(9)
    expect(result.holesRemaining).toBe(0)
    expect(result.isComplete).toBe(true)
    expect(result.teamAPoints).toBe(1)
  })

  it('should handle a 9-hole match with 2&1 clinch', () => {
    const strokes = noStrokes(['player-a', 'player-b'])

    // Player A wins holes 1 and 2, rest halved through 9
    // After 8: 2 up, 1 remaining => 2 > 1 => clinched => 2&1
    const aScores = [3, 3, 4, 4, 4, 4, 4, 4, 4]
    const bScores = [4, 4, 4, 4, 4, 4, 4, 4, 4]

    const scores = [
      ...makeScores('player-a', aScores, holes),
      ...makeScores('player-b', bScores, holes),
    ]

    const result = calculateMatchPlay(scores, players, holes, strokes, format, 9)

    expect(result.status).toBe('2&1')
    expect(result.leader).toBe('team_a')
    expect(result.holesPlayed).toBe(8)
    expect(result.holesRemaining).toBe(1)
    expect(result.isComplete).toBe(true)
    expect(result.teamAPoints).toBe(1)
  })

  it('should handle early clinch in a 9-hole match', () => {
    const strokes = noStrokes(['player-a', 'player-b'])

    // A wins holes 1-5 in a 9-hole match
    // After 5: 5 up, 4 remain => 5 > 4 => clinched => 5&4
    const aScores = [3, 3, 3, 3, 3, 4, 4, 4, 4]
    const bScores = [4, 4, 4, 4, 4, 4, 4, 4, 4]

    const scores = [
      ...makeScores('player-a', aScores, holes),
      ...makeScores('player-b', bScores, holes),
    ]

    const result = calculateMatchPlay(scores, players, holes, strokes, format, 9)

    expect(result.status).toBe('5&4')
    expect(result.leader).toBe('team_a')
    expect(result.holesPlayed).toBe(5)
    expect(result.holesRemaining).toBe(4)
    expect(result.isComplete).toBe(true)
  })

  it('should handle 2UP on the last hole (winning last 2 holes)', () => {
    const strokes = noStrokes(['player-a', 'player-b'])

    // A wins holes 17 and 18, rest halved => 2UP (not "2&0")
    const aScores = Array(18).fill(4)
    aScores[16] = 3 // wins hole 17
    aScores[17] = 3 // wins hole 18

    const bScores = Array(18).fill(4)

    const scores = [
      ...makeScores('player-a', aScores, holes),
      ...makeScores('player-b', bScores, holes),
    ]

    const result = calculateMatchPlay(scores, players, holes, strokes, format)

    // After hole 17: 1 up, 1 remaining => 1 > 1? No.
    // After hole 18: 2 up, 0 remaining => 2 > 0. Clinched on hole 18 with 0 remaining => "2UP"
    expect(result.status).toBe('2UP')
    expect(result.leader).toBe('team_a')
    expect(result.holesPlayed).toBe(18)
    expect(result.holesRemaining).toBe(0)
    expect(result.isComplete).toBe(true)
  })

  it('should ignore scores for players not in the matchPlayers list', () => {
    const strokes = noStrokes(['player-a', 'player-b'])

    const scores = [
      { trip_player_id: 'player-a', hole_id: 'hole-1', gross_score: 4 },
      { trip_player_id: 'player-b', hole_id: 'hole-1', gross_score: 5 },
      // Random player not in the match
      { trip_player_id: 'player-x', hole_id: 'hole-1', gross_score: 2 },
    ]

    const holeResults = getHoleResults(scores, players, holes, strokes, format)

    expect(holeResults).toHaveLength(1)
    expect(holeResults[0].teamANet).toBe(4)
    expect(holeResults[0].teamBNet).toBe(5)
    expect(holeResults[0].winner).toBe('team_a')
  })

  it('should handle scores for holes not in the holes list', () => {
    const strokes = noStrokes(['player-a', 'player-b'])

    // Score references a hole_id that does not exist in our holes array
    const scores = [
      { trip_player_id: 'player-a', hole_id: 'hole-99', gross_score: 4 },
      { trip_player_id: 'player-b', hole_id: 'hole-99', gross_score: 5 },
    ]

    const holeResults = getHoleResults(scores, players, holes, strokes, format)

    expect(holeResults).toHaveLength(0)
  })
})
