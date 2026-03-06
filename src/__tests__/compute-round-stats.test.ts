import { computeRoundStats } from '@/lib/compute-round-stats'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeHole = (num: number, par: number) => ({
  id: `hole-${num}`,
  hole_number: num,
  par,
  handicap_index: num,
})

const makeScore = (
  holeId: string,
  gross: number,
  extras?: { fairway_hit?: boolean | null; gir?: boolean | null; putts?: number | null },
) => ({
  hole_id: holeId,
  gross_score: gross,
  fairway_hit: extras?.fairway_hit ?? null,
  gir: extras?.gir ?? null,
  putts: extras?.putts ?? null,
})

// Standard 18-hole layout: par 4,3,5,4,4,3,4,5,4,  4,3,5,4,4,3,4,5,4
const standardHoles = [
  makeHole(1, 4), makeHole(2, 3), makeHole(3, 5),
  makeHole(4, 4), makeHole(5, 4), makeHole(6, 3),
  makeHole(7, 4), makeHole(8, 5), makeHole(9, 4),
  makeHole(10, 4), makeHole(11, 3), makeHole(12, 5),
  makeHole(13, 4), makeHole(14, 4), makeHole(15, 3),
  makeHole(16, 4), makeHole(17, 5), makeHole(18, 4),
]

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('computeRoundStats', () => {
  test('gross total and holes played', () => {
    const scores = standardHoles.map(h => makeScore(h.id, h.par))
    const stats = computeRoundStats(scores, standardHoles, 0)

    expect(stats.holes_played).toBe(18)
    const expectedPar = standardHoles.reduce((s, h) => s + h.par, 0)
    expect(stats.gross_total).toBe(expectedPar)
    expect(stats.par_total).toBe(expectedPar)
    expect(stats.scoring_average).toBe(Math.round((expectedPar / 18) * 100) / 100)
  })

  test('scoring distribution (birdies, pars, bogeys, doubles)', () => {
    const scores = standardHoles.map(h => makeScore(h.id, h.par))
    // Override specific holes
    scores[0] = makeScore('hole-1', 2)   // eagle on par 4 (vs_par = -2)
    scores[1] = makeScore('hole-2', 2)   // birdie on par 3 (vs_par = -1)
    scores[3] = makeScore('hole-4', 5)   // bogey on par 4 (vs_par = +1)
    scores[4] = makeScore('hole-5', 6)   // double on par 4 (vs_par = +2)
    scores[5] = makeScore('hole-6', 7)   // other on par 3 (vs_par = +4)

    const stats = computeRoundStats(scores, standardHoles, 0)

    expect(stats.eagles).toBe(1)
    expect(stats.birdies).toBe(1)
    expect(stats.pars).toBe(13) // 18 - 5 modified
    expect(stats.bogeys).toBe(1)
    expect(stats.double_bogeys).toBe(1)
    expect(stats.others).toBe(1)
  })

  test('fairways hit counting (only par 4+ holes with non-null fairway_hit)', () => {
    // 3 holes: par 3 (no fairway), par 4 (hit), par 5 (missed)
    const holes = [makeHole(1, 3), makeHole(2, 4), makeHole(3, 5)]
    const scores = [
      makeScore('hole-1', 3, { fairway_hit: true }),  // par 3 — excluded from fairway count
      makeScore('hole-2', 4, { fairway_hit: true }),   // par 4 — counted, hit
      makeScore('hole-3', 5, { fairway_hit: false }),   // par 5 — counted, missed
    ]

    const stats = computeRoundStats(scores, holes, 0)

    expect(stats.fairways_hit).toBe(1)
    expect(stats.fairways_total).toBe(2)
  })

  test('fairways with null values are excluded from total', () => {
    const holes = [makeHole(1, 4), makeHole(2, 4), makeHole(3, 4)]
    const scores = [
      makeScore('hole-1', 4, { fairway_hit: true }),
      makeScore('hole-2', 4, { fairway_hit: null }),  // not tracked
      makeScore('hole-3', 4, { fairway_hit: false }),
    ]

    const stats = computeRoundStats(scores, holes, 0)

    expect(stats.fairways_hit).toBe(1)
    expect(stats.fairways_total).toBe(2) // only 2 non-null
  })

  test('GIR and putts counting', () => {
    const holes = [makeHole(1, 4), makeHole(2, 4), makeHole(3, 4)]
    const scores = [
      makeScore('hole-1', 4, { gir: true, putts: 2 }),
      makeScore('hole-2', 5, { gir: false, putts: 3 }),
      makeScore('hole-3', 4, { gir: true, putts: null }),
    ]

    const stats = computeRoundStats(scores, holes, 0)

    expect(stats.greens_in_regulation).toBe(2)
    expect(stats.total_putts).toBe(5) // 2 + 3, hole 3 excluded (null)
    expect(stats.putts_per_hole).toBe(2.5) // 5 / 2 holes with putts
  })

  test('putts_per_hole is null when no putts are tracked', () => {
    const holes = [makeHole(1, 4)]
    const scores = [makeScore('hole-1', 4, { putts: null })]

    const stats = computeRoundStats(scores, holes, 0)

    expect(stats.total_putts).toBe(0)
    expect(stats.putts_per_hole).toBeNull()
  })

  test('net total with handicap strokes', () => {
    const holes = [
      makeHole(1, 4),  // handicap_index 1 (hardest)
      makeHole(2, 4),  // handicap_index 2
      makeHole(3, 4),  // handicap_index 3
    ]
    // All bogeys (5 on par 4)
    const scores = holes.map(h => makeScore(h.id, 5))

    // 2 handicap strokes: distributed to hole 1 (idx 1) and hole 2 (idx 2)
    const stats = computeRoundStats(scores, holes, 2)

    expect(stats.gross_total).toBe(15) // 5*3
    // Net: hole1 = 5-1=4, hole2 = 5-1=4, hole3 = 5-0=5 => 13
    expect(stats.net_total).toBe(13)
  })

  test('handicap strokes > 18 wraps for second pass', () => {
    // 3 holes with handicap 20 strokes
    const holes = [
      makeHole(1, 4),  // idx 1
      makeHole(2, 4),  // idx 2
      makeHole(3, 4),  // idx 3
    ]
    const scores = holes.map(h => makeScore(h.id, 8))

    // 5 strokes on 3 holes: first pass gives 1 each (3 used), second pass gives 1 to idx 1 and idx 2
    // hole1: 2 strokes, hole2: 2 strokes, hole3: 1 stroke
    const stats = computeRoundStats(scores, holes, 5)

    expect(stats.gross_total).toBe(24)
    // Net: hole1=8-2=6, hole2=8-2=6, hole3=8-1=7 => 19
    expect(stats.net_total).toBe(19)
  })

  test('best/worst hole detection', () => {
    const holes = [makeHole(1, 4), makeHole(2, 3), makeHole(3, 5)]
    const scores = [
      makeScore('hole-1', 4),  // par, vs_par = 0
      makeScore('hole-2', 2),  // birdie on par 3, vs_par = -1
      makeScore('hole-3', 8),  // +3 on par 5, vs_par = +3
    ]

    const stats = computeRoundStats(scores, holes, 0)

    expect(stats.best_hole_score).toBe(2)
    expect(stats.best_hole_number).toBe(2)
    expect(stats.best_hole_vs_par).toBe(-1)
    expect(stats.worst_hole_score).toBe(8)
    expect(stats.worst_hole_number).toBe(3)
    expect(stats.worst_hole_vs_par).toBe(3)
  })

  test('par-type breakdown (par 3/4/5 subtotals)', () => {
    // All pars
    const scores = standardHoles.map(h => makeScore(h.id, h.par))
    const stats = computeRoundStats(scores, standardHoles, 0)

    const par3Count = standardHoles.filter(h => h.par === 3).length
    const par4Count = standardHoles.filter(h => h.par === 4).length
    const par5Count = standardHoles.filter(h => h.par === 5).length

    expect(stats.par3_count).toBe(par3Count)
    expect(stats.par4_count).toBe(par4Count)
    expect(stats.par5_count).toBe(par5Count)
    expect(stats.par3_total).toBe(3 * par3Count)
    expect(stats.par4_total).toBe(4 * par4Count)
    expect(stats.par5_total).toBe(5 * par5Count)
  })

  test('front and back nine breakdown', () => {
    const scores = standardHoles.map(h => makeScore(h.id, h.par))
    const stats = computeRoundStats(scores, standardHoles, 0)

    const frontPar = standardHoles.filter(h => h.hole_number <= 9).reduce((s, h) => s + h.par, 0)
    const backPar = standardHoles.filter(h => h.hole_number > 9).reduce((s, h) => s + h.par, 0)

    expect(stats.front_nine_gross).toBe(frontPar)
    expect(stats.back_nine_gross).toBe(backPar)
    expect(stats.front_nine_net).toBe(frontPar) // no handicap
    expect(stats.back_nine_net).toBe(backPar)
  })

  test('bounce backs (par-or-better after double-bogey-or-worse)', () => {
    const holes = [
      makeHole(1, 4), makeHole(2, 4), makeHole(3, 4),
      makeHole(4, 4), makeHole(5, 4),
    ]
    const scores = [
      makeScore('hole-1', 6),  // double bogey (+2) — qualifies as trigger
      makeScore('hole-2', 4),  // par (0) — bounce back!
      makeScore('hole-3', 5),  // bogey (+1) — NOT a trigger (only +1)
      makeScore('hole-4', 4),  // par — NOT a bounce back (prev was only bogey)
      makeScore('hole-5', 4),  // par
    ]

    const stats = computeRoundStats(scores, holes, 0)

    expect(stats.bounce_backs).toBe(1)
  })

  test('multiple bounce backs', () => {
    const holes = [
      makeHole(1, 4), makeHole(2, 4), makeHole(3, 4),
      makeHole(4, 4), makeHole(5, 4),
    ]
    const scores = [
      makeScore('hole-1', 7),  // triple (+3) — trigger
      makeScore('hole-2', 3),  // birdie (-1) — bounce back
      makeScore('hole-3', 6),  // double (+2) — trigger
      makeScore('hole-4', 4),  // par (0) — bounce back
      makeScore('hole-5', 4),  // par
    ]

    const stats = computeRoundStats(scores, holes, 0)

    expect(stats.bounce_backs).toBe(2)
  })

  test('empty scores returns zeros', () => {
    const stats = computeRoundStats([], standardHoles, 0)

    expect(stats.holes_played).toBe(0)
    expect(stats.gross_total).toBe(0)
    expect(stats.net_total).toBe(0)
    expect(stats.fairways_hit).toBe(0)
    expect(stats.putts_per_hole).toBeNull()
  })

  test('streaks are computed correctly', () => {
    const holes = [
      makeHole(1, 4), makeHole(2, 4), makeHole(3, 4),
      makeHole(4, 4), makeHole(5, 4), makeHole(6, 4),
    ]
    const scores = [
      makeScore('hole-1', 3),  // birdie (-1): par streak=1, bogey streak=1
      makeScore('hole-2', 4),  // par (0): par streak=2, bogey streak=2
      makeScore('hole-3', 4),  // par (0): par streak=3, bogey streak=3
      makeScore('hole-4', 6),  // double (+2): breaks both
      makeScore('hole-5', 5),  // bogey (+1): par streak=0, bogey streak=1
      makeScore('hole-6', 4),  // par (0): par streak=1, bogey streak=2
    ]

    const stats = computeRoundStats(scores, holes, 0)

    expect(stats.par_or_better_streak).toBe(3)
    expect(stats.bogey_or_better_streak).toBe(3)
  })
})
