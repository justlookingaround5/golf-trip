import { computeRoundStats, computeTripStats, computeAwards } from '../stats'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeHoles(pars: number[] = [4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4]) {
  return pars.map((par, i) => ({
    id: `hole-${i + 1}`,
    hole_number: i + 1,
    par,
    handicap_index: i + 1, // 1 = hardest
    course_id: 'course-1',
  }))
}

function makeScores(
  grossScores: number[],
  playerId = 'player-1',
  holes = makeHoles(),
) {
  return grossScores.map((gross, i) => ({
    trip_player_id: playerId,
    hole_id: holes[i].id,
    gross_score: gross,
  }))
}

const noStrokes = new Map<number, number>()

// ---------------------------------------------------------------------------
// computeRoundStats
// ---------------------------------------------------------------------------

describe('computeRoundStats', () => {
  test('computes gross/net totals for a full round', () => {
    const holes = makeHoles()
    // All pars: sum of pars
    const parScores = holes.map(h => h.par)
    const scores = makeScores(parScores)

    const stats = computeRoundStats('course-1', 'player-1', scores, holes, noStrokes)

    expect(stats.holes_played).toBe(18)
    expect(stats.gross_total).toBe(stats.par_total)
    expect(stats.net_total).toBe(stats.gross_total) // no strokes
    expect(stats.pars).toBe(18)
    expect(stats.birdies).toBe(0)
    expect(stats.bogeys).toBe(0)
  })

  test('computes scoring distribution correctly', () => {
    const holes = makeHoles()
    // Make specific scores: eagle, birdie, par, bogey, double, triple
    const pars = holes.map(h => h.par)
    const grossScores = [...pars]
    grossScores[0] = pars[0] - 2 // eagle
    grossScores[1] = pars[1] - 1 // birdie
    // [2] stays par
    grossScores[3] = pars[3] + 1 // bogey
    grossScores[4] = pars[4] + 2 // double bogey
    grossScores[5] = pars[5] + 3 // other (triple)
    const scores = makeScores(grossScores)

    const stats = computeRoundStats('course-1', 'player-1', scores, holes, noStrokes)

    expect(stats.eagles).toBe(1)
    expect(stats.birdies).toBe(1)
    expect(stats.pars).toBe(13) // 18 - 5 modified = 13 pars remaining
    expect(stats.bogeys).toBe(1)
    expect(stats.double_bogeys).toBe(1)
    expect(stats.others).toBe(1)
  })

  test('computes streaks correctly', () => {
    const holes = makeHoles()
    const pars = holes.map(h => h.par)
    // First 5 holes: par or better, then bogey, then 3 pars
    const grossScores = [...pars]
    grossScores[0] = pars[0] - 1 // birdie
    // [1]-[4] stay par
    grossScores[5] = pars[5] + 2 // double bogey (breaks both streaks)
    // [6]-[8] stay par
    const scores = makeScores(grossScores)

    const stats = computeRoundStats('course-1', 'player-1', scores, holes, noStrokes)

    expect(stats.par_or_better_streak).toBe(12) // holes 7-18 = 12 (or whichever is longest)
    expect(stats.bogey_or_better_streak).toBe(12)
  })

  test('computes best/worst hole', () => {
    const holes = makeHoles()
    const pars = holes.map(h => h.par)
    const grossScores = [...pars]
    grossScores[1] = pars[1] - 1 // hole 2: birdie on par 3 = 2
    grossScores[9] = pars[9] + 4 // hole 10: quad bogey on par 4 = 8

    const scores = makeScores(grossScores)
    const stats = computeRoundStats('course-1', 'player-1', scores, holes, noStrokes)

    expect(stats.best_hole_score).toBe(2) // birdie on par 3
    expect(stats.best_hole_number).toBe(2)
    expect(stats.worst_hole_score).toBe(8) // quad bogey on par 4
    expect(stats.worst_hole_number).toBe(10)
    expect(stats.best_hole_vs_par).toBe(-1)
    expect(stats.worst_hole_vs_par).toBe(4)
  })

  test('computes par-type breakdown', () => {
    const holes = makeHoles() // has par 3s, 4s, and 5s
    const pars = holes.map(h => h.par)
    const scores = makeScores(pars) // all pars

    const stats = computeRoundStats('course-1', 'player-1', scores, holes, noStrokes)

    const par3Count = holes.filter(h => h.par === 3).length
    const par4Count = holes.filter(h => h.par === 4).length
    const par5Count = holes.filter(h => h.par === 5).length

    expect(stats.par3_count).toBe(par3Count)
    expect(stats.par4_count).toBe(par4Count)
    expect(stats.par5_count).toBe(par5Count)

    // All pars, so totals should equal par * count
    expect(stats.par3_total).toBe(3 * par3Count)
    expect(stats.par4_total).toBe(4 * par4Count)
    expect(stats.par5_total).toBe(5 * par5Count)
  })

  test('computes front/back nine', () => {
    const holes = makeHoles()
    const pars = holes.map(h => h.par)
    const scores = makeScores(pars)

    const stats = computeRoundStats('course-1', 'player-1', scores, holes, noStrokes)

    const frontPar = holes.filter(h => h.hole_number <= 9).reduce((s, h) => s + h.par, 0)
    const backPar = holes.filter(h => h.hole_number > 9).reduce((s, h) => s + h.par, 0)

    expect(stats.front_nine_gross).toBe(frontPar)
    expect(stats.back_nine_gross).toBe(backPar)
  })

  test('computes bounce-backs', () => {
    const holes = makeHoles()
    const pars = holes.map(h => h.par)
    const grossScores = [...pars]
    // Bogey then par = 1 bounce-back
    grossScores[2] = pars[2] + 1 // bogey hole 3
    // hole 4 stays par = bounce-back
    // Bogey then birdie = 1 bounce-back
    grossScores[6] = pars[6] + 1 // bogey hole 7
    grossScores[7] = pars[7] - 1 // birdie hole 8 = bounce-back

    const scores = makeScores(grossScores)
    const stats = computeRoundStats('course-1', 'player-1', scores, holes, noStrokes)

    expect(stats.bounce_backs).toBe(2)
  })

  test('handles net scoring with strokes', () => {
    const holes = makeHoles()
    const pars = holes.map(h => h.par)
    // All bogeys gross
    const grossScores = pars.map(p => p + 1)
    const scores = makeScores(grossScores)

    // Give 18 strokes (1 per hole)
    const strokesMap = new Map<number, number>()
    for (let i = 1; i <= 18; i++) strokesMap.set(i, 1)

    const stats = computeRoundStats('course-1', 'player-1', scores, holes, strokesMap)

    // Net should equal par (gross bogey - 1 stroke = par)
    expect(stats.net_total).toBe(stats.par_total)
    // Net scoring distribution: all pars
    expect(stats.pars).toBe(18)
    expect(stats.bogeys).toBe(0)
  })

  test('returns empty stats for no scores', () => {
    const holes = makeHoles()
    const stats = computeRoundStats('course-1', 'player-1', [], holes, noStrokes)

    expect(stats.holes_played).toBe(0)
    expect(stats.gross_total).toBeNull()
    expect(stats.net_total).toBeNull()
  })

  test('computes scoring average', () => {
    const holes = makeHoles()
    const pars = holes.map(h => h.par)
    const scores = makeScores(pars)

    const stats = computeRoundStats('course-1', 'player-1', scores, holes, noStrokes)
    const expectedAvg = Math.round((stats.gross_total! / 18) * 100) / 100

    expect(stats.scoring_average).toBe(expectedAvg)
  })
})

// ---------------------------------------------------------------------------
// computeTripStats
// ---------------------------------------------------------------------------

describe('computeTripStats', () => {
  test('aggregates multiple rounds', () => {
    const holes = makeHoles()
    const pars = holes.map(h => h.par)

    const round1 = computeRoundStats('course-1', 'player-1', makeScores(pars), holes, noStrokes)
    // Round 2: all bogeys
    const round2 = computeRoundStats('course-2', 'player-1', makeScores(pars.map(p => p + 1)), holes, noStrokes)

    const tripStats = computeTripStats('trip-1', 'player-1', [round1, round2])

    expect(tripStats.total_rounds).toBe(2)
    expect(tripStats.total_holes).toBe(36)
    expect(tripStats.total_gross).toBe(round1.gross_total! + round2.gross_total!)
    expect(tripStats.best_round_gross).toBe(round1.gross_total) // all pars
    expect(tripStats.worst_round_gross).toBe(round2.gross_total) // all bogeys
  })

  test('returns empty stats for no rounds', () => {
    const tripStats = computeTripStats('trip-1', 'player-1', [])

    expect(tripStats.total_rounds).toBe(0)
    expect(tripStats.total_holes).toBe(0)
    expect(tripStats.total_gross).toBeNull()
  })

  test('computes trip scoring average', () => {
    const holes = makeHoles()
    const pars = holes.map(h => h.par)
    const round1 = computeRoundStats('course-1', 'player-1', makeScores(pars), holes, noStrokes)

    const tripStats = computeTripStats('trip-1', 'player-1', [round1])

    expect(tripStats.scoring_average).toBe(round1.scoring_average)
  })
})

// ---------------------------------------------------------------------------
// computeAwards
// ---------------------------------------------------------------------------

describe('computeAwards', () => {
  function makePlayerInput(
    playerId: string,
    name: string,
    grossTotal: number,
    netTotal: number,
    birdies: number,
    extras: Partial<ReturnType<typeof computeTripStats>> = {},
  ) {
    const tripStats = {
      trip_id: 'trip-1',
      trip_player_id: playerId,
      total_gross: grossTotal,
      total_net: netTotal,
      total_par: 144, // 2 rounds * 72
      total_holes: 36,
      total_rounds: 2,
      total_eagles: 0,
      total_birdies: birdies,
      total_pars: 36 - birdies,
      total_bogeys: 0,
      total_double_bogeys: 0,
      total_others: 0,
      best_round_gross: Math.floor(grossTotal / 2),
      best_round_course_id: 'course-1',
      worst_round_gross: Math.ceil(grossTotal / 2),
      worst_round_course_id: 'course-2',
      longest_par_streak: 5,
      longest_bogey_streak: 10,
      total_bounce_backs: 2,
      scoring_average: grossTotal / 36,
      ...extras,
    }

    return {
      trip_player_id: playerId,
      player_name: name,
      trip_stats: tripStats,
      round_stats: [] as ReturnType<typeof computeRoundStats>[],
    }
  }

  test('generates low gross and low net awards', () => {
    const players = [
      makePlayerInput('p1', 'Alice', 150, 140, 2),
      makePlayerInput('p2', 'Bob', 160, 145, 1),
    ]

    const awards = computeAwards('trip-1', players)

    const lowGross = awards.find(a => a.award_key === 'low_gross')
    expect(lowGross).toBeDefined()
    expect(lowGross!.trip_player_id).toBe('p1')

    const lowNet = awards.find(a => a.award_key === 'low_net')
    expect(lowNet).toBeDefined()
    expect(lowNet!.trip_player_id).toBe('p1')
  })

  test('generates birdie machine award', () => {
    const players = [
      makePlayerInput('p1', 'Alice', 150, 140, 2),
      makePlayerInput('p2', 'Bob', 160, 145, 5),
    ]

    const awards = computeAwards('trip-1', players)

    const birdieAward = awards.find(a => a.award_key === 'most_birdies')
    expect(birdieAward).toBeDefined()
    expect(birdieAward!.trip_player_id).toBe('p2')
  })

  test('generates mr. consistent award when streak >= 4', () => {
    const players = [
      makePlayerInput('p1', 'Alice', 150, 140, 2, { longest_bogey_streak: 8 }),
      makePlayerInput('p2', 'Bob', 160, 145, 1, { longest_bogey_streak: 12 }),
    ]

    const awards = computeAwards('trip-1', players)

    const consistent = awards.find(a => a.award_key === 'most_consistent')
    expect(consistent).toBeDefined()
    expect(consistent!.trip_player_id).toBe('p2')
  })

  test('generates comeback kid award when bounce-backs > 1', () => {
    const players = [
      makePlayerInput('p1', 'Alice', 150, 140, 2, { total_bounce_backs: 5 }),
      makePlayerInput('p2', 'Bob', 160, 145, 1, { total_bounce_backs: 3 }),
    ]

    const awards = computeAwards('trip-1', players)

    const comeback = awards.find(a => a.award_key === 'comeback_kid')
    expect(comeback).toBeDefined()
    expect(comeback!.trip_player_id).toBe('p1')
  })

  test('returns no awards when no players have played', () => {
    const awards = computeAwards('trip-1', [])
    expect(awards).toEqual([])
  })
})
