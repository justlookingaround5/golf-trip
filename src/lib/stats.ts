import type { RoundStats, TripStats } from './types'

/**
 * Stats Computation Engine
 *
 * Pure functions that compute round stats, trip stats, and awards
 * from raw scores and hole data. No database access.
 */

interface ScoreInput {
  trip_player_id: string
  hole_id: string
  gross_score: number
}

interface HoleInput {
  id: string
  hole_number: number
  par: number
  handicap_index: number
  course_id: string
}

// ---------------------------------------------------------------------------
// Round Stats
// ---------------------------------------------------------------------------

/**
 * Compute stats for a single player on a single round (course).
 */
export function computeRoundStats(
  courseId: string,
  tripPlayerId: string,
  scores: ScoreInput[],
  holes: HoleInput[],
  strokesMap: Map<number, number>,
): Omit<RoundStats, 'id' | 'computed_at'> {
  const playerScores = scores.filter(s => s.trip_player_id === tripPlayerId)
  const holeById = new Map(holes.map(h => [h.id, h]))
  const sortedHoles = [...holes].sort((a, b) => a.hole_number - b.hole_number)

  // Build hole-by-hole data
  const holeData: {
    hole_number: number
    par: number
    gross: number
    net: number
    vs_par: number
    net_vs_par: number
  }[] = []

  for (const hole of sortedHoles) {
    const score = playerScores.find(s => s.hole_id === hole.id)
    if (!score) continue

    const strokes = strokesMap.get(hole.hole_number) ?? 0
    const net = score.gross_score - strokes

    holeData.push({
      hole_number: hole.hole_number,
      par: hole.par,
      gross: score.gross_score,
      net,
      vs_par: score.gross_score - hole.par,
      net_vs_par: net - hole.par,
    })
  }

  if (holeData.length === 0) {
    return emptyRoundStats(courseId, tripPlayerId)
  }

  // Core totals
  const grossTotal = holeData.reduce((s, h) => s + h.gross, 0)
  const netTotal = holeData.reduce((s, h) => s + h.net, 0)
  const parTotal = holeData.reduce((s, h) => s + h.par, 0)

  // Scoring distribution (based on NET vs par)
  let eagles = 0, birdies = 0, pars = 0, bogeys = 0, doubleBogeys = 0, others = 0
  for (const h of holeData) {
    const diff = h.net_vs_par
    if (diff <= -2) eagles++
    else if (diff === -1) birdies++
    else if (diff === 0) pars++
    else if (diff === 1) bogeys++
    else if (diff === 2) doubleBogeys++
    else others++
  }

  // Streaks
  let parStreak = 0, maxParStreak = 0
  let bogeyStreak = 0, maxBogeyStreak = 0
  for (const h of holeData) {
    if (h.net_vs_par <= 0) {
      parStreak++
      maxParStreak = Math.max(maxParStreak, parStreak)
    } else {
      parStreak = 0
    }
    if (h.net_vs_par <= 1) {
      bogeyStreak++
      maxBogeyStreak = Math.max(maxBogeyStreak, bogeyStreak)
    } else {
      bogeyStreak = 0
    }
  }

  // Extremes
  let bestScore = Infinity, bestHole = 0, bestVsPar = Infinity
  let worstScore = -Infinity, worstHole = 0, worstVsPar = -Infinity
  for (const h of holeData) {
    if (h.gross < bestScore) { bestScore = h.gross; bestHole = h.hole_number }
    if (h.gross > worstScore) { worstScore = h.gross; worstHole = h.hole_number }
    if (h.vs_par < bestVsPar) bestVsPar = h.vs_par
    if (h.vs_par > worstVsPar) worstVsPar = h.vs_par
  }

  // Par-type breakdown
  const par3s = holeData.filter(h => h.par === 3)
  const par4s = holeData.filter(h => h.par === 4)
  const par5s = holeData.filter(h => h.par === 5)

  // Nine breakdown
  const frontNine = holeData.filter(h => h.hole_number <= 9)
  const backNine = holeData.filter(h => h.hole_number > 9)

  // GIR approximation: net score <= par on the hole
  const gir = holeData.filter(h => h.net_vs_par <= 0).length

  // Bounce-backs: par or better immediately after bogey+
  let bounceBacks = 0
  for (let i = 1; i < holeData.length; i++) {
    if (holeData[i - 1].net_vs_par > 0 && holeData[i].net_vs_par <= 0) {
      bounceBacks++
    }
  }

  return {
    course_id: courseId,
    trip_player_id: tripPlayerId,
    gross_total: grossTotal,
    net_total: netTotal,
    par_total: parTotal,
    holes_played: holeData.length,
    eagles,
    birdies,
    pars,
    bogeys,
    double_bogeys: doubleBogeys,
    others,
    par_or_better_streak: maxParStreak,
    bogey_or_better_streak: maxBogeyStreak,
    best_hole_score: bestScore === Infinity ? null : bestScore,
    best_hole_number: bestScore === Infinity ? null : bestHole,
    worst_hole_score: worstScore === -Infinity ? null : worstScore,
    worst_hole_number: worstScore === -Infinity ? null : worstHole,
    best_hole_vs_par: bestVsPar === Infinity ? null : bestVsPar,
    worst_hole_vs_par: worstVsPar === -Infinity ? null : worstVsPar,
    par3_total: par3s.length > 0 ? par3s.reduce((s, h) => s + h.gross, 0) : null,
    par3_count: par3s.length,
    par4_total: par4s.length > 0 ? par4s.reduce((s, h) => s + h.gross, 0) : null,
    par4_count: par4s.length,
    par5_total: par5s.length > 0 ? par5s.reduce((s, h) => s + h.gross, 0) : null,
    par5_count: par5s.length,
    front_nine_gross: frontNine.length > 0 ? frontNine.reduce((s, h) => s + h.gross, 0) : null,
    front_nine_net: frontNine.length > 0 ? frontNine.reduce((s, h) => s + h.net, 0) : null,
    back_nine_gross: backNine.length > 0 ? backNine.reduce((s, h) => s + h.gross, 0) : null,
    back_nine_net: backNine.length > 0 ? backNine.reduce((s, h) => s + h.net, 0) : null,
    greens_in_regulation: gir,
    bounce_backs: bounceBacks,
    scoring_average: holeData.length > 0
      ? Math.round((grossTotal / holeData.length) * 100) / 100
      : null,
    fairways_hit: 0,
    fairways_total: 0,
    total_putts: 0,
    putts_per_hole: null,
  }
}

function emptyRoundStats(courseId: string, tripPlayerId: string): Omit<RoundStats, 'id' | 'computed_at'> {
  return {
    course_id: courseId,
    trip_player_id: tripPlayerId,
    gross_total: null, net_total: null, par_total: null, holes_played: 0,
    eagles: 0, birdies: 0, pars: 0, bogeys: 0, double_bogeys: 0, others: 0,
    par_or_better_streak: 0, bogey_or_better_streak: 0,
    best_hole_score: null, best_hole_number: null,
    worst_hole_score: null, worst_hole_number: null,
    best_hole_vs_par: null, worst_hole_vs_par: null,
    par3_total: null, par3_count: 0, par4_total: null, par4_count: 0,
    par5_total: null, par5_count: 0,
    front_nine_gross: null, front_nine_net: null,
    back_nine_gross: null, back_nine_net: null,
    greens_in_regulation: 0, bounce_backs: 0, scoring_average: null,
    fairways_hit: 0, fairways_total: 0, total_putts: 0, putts_per_hole: null,
  }
}

// ---------------------------------------------------------------------------
// Trip Stats (aggregate round stats)
// ---------------------------------------------------------------------------

export function computeTripStats(
  tripId: string,
  tripPlayerId: string,
  roundStats: Omit<RoundStats, 'id' | 'computed_at'>[],
): Omit<TripStats, 'id' | 'computed_at'> {
  const played = roundStats.filter(r => r.holes_played > 0)

  if (played.length === 0) {
    return {
      trip_id: tripId,
      trip_player_id: tripPlayerId,
      total_gross: null, total_net: null, total_par: null,
      total_holes: 0, total_rounds: 0,
      total_eagles: 0, total_birdies: 0, total_pars: 0,
      total_bogeys: 0, total_double_bogeys: 0, total_others: 0,
      best_round_gross: null, best_round_course_id: null,
      worst_round_gross: null, worst_round_course_id: null,
      longest_par_streak: 0, longest_bogey_streak: 0,
      total_bounce_backs: 0, scoring_average: null,
    }
  }

  const totalGross = played.reduce((s, r) => s + (r.gross_total ?? 0), 0)
  const totalNet = played.reduce((s, r) => s + (r.net_total ?? 0), 0)
  const totalPar = played.reduce((s, r) => s + (r.par_total ?? 0), 0)
  const totalHoles = played.reduce((s, r) => s + r.holes_played, 0)

  // Find best/worst rounds
  let bestGross = Infinity, bestCourse: string | null = null
  let worstGross = -Infinity, worstCourse: string | null = null
  for (const r of played) {
    if (r.gross_total != null && r.gross_total < bestGross) {
      bestGross = r.gross_total; bestCourse = r.course_id
    }
    if (r.gross_total != null && r.gross_total > worstGross) {
      worstGross = r.gross_total; worstCourse = r.course_id
    }
  }

  return {
    trip_id: tripId,
    trip_player_id: tripPlayerId,
    total_gross: totalGross,
    total_net: totalNet,
    total_par: totalPar,
    total_holes: totalHoles,
    total_rounds: played.length,
    total_eagles: played.reduce((s, r) => s + r.eagles, 0),
    total_birdies: played.reduce((s, r) => s + r.birdies, 0),
    total_pars: played.reduce((s, r) => s + r.pars, 0),
    total_bogeys: played.reduce((s, r) => s + r.bogeys, 0),
    total_double_bogeys: played.reduce((s, r) => s + r.double_bogeys, 0),
    total_others: played.reduce((s, r) => s + r.others, 0),
    best_round_gross: bestGross === Infinity ? null : bestGross,
    best_round_course_id: bestCourse,
    worst_round_gross: worstGross === -Infinity ? null : worstGross,
    worst_round_course_id: worstCourse,
    longest_par_streak: Math.max(...played.map(r => r.par_or_better_streak)),
    longest_bogey_streak: Math.max(...played.map(r => r.bogey_or_better_streak)),
    total_bounce_backs: played.reduce((s, r) => s + r.bounce_backs, 0),
    scoring_average: totalHoles > 0
      ? Math.round((totalGross / totalHoles) * 100) / 100
      : null,
  }
}

// ---------------------------------------------------------------------------
// Trip Awards (auto-generated superlatives)
// ---------------------------------------------------------------------------

interface AwardInput {
  trip_player_id: string
  player_name: string
  trip_stats: Omit<TripStats, 'id' | 'computed_at'>
  round_stats: Omit<RoundStats, 'id' | 'computed_at'>[]
}

export interface AwardResult {
  award_key: string
  award_name: string
  award_description: string
  award_icon: string
  trip_player_id: string
  value: string
}

export function computeAwards(
  _tripId: string,
  players: AwardInput[],
): AwardResult[] {
  const awards: AwardResult[] = []
  const active = players.filter(p => p.trip_stats.total_holes > 0)

  if (active.length === 0) return awards

  function maxBy(fn: (p: AwardInput) => number, minThreshold = 0): AwardInput | null {
    let best: AwardInput | null = null
    let bestVal = -Infinity
    for (const p of active) {
      const v = fn(p)
      if (v > bestVal && v > minThreshold) { bestVal = v; best = p }
    }
    return best
  }

  function minBy(fn: (p: AwardInput) => number): AwardInput | null {
    let best: AwardInput | null = null
    let bestVal = Infinity
    for (const p of active) {
      const v = fn(p)
      if (v < bestVal) { bestVal = v; best = p }
    }
    return best
  }

  // 1. Low Gross Champion
  const lowGross = minBy(p => p.trip_stats.total_gross ?? Infinity)
  if (lowGross && lowGross.trip_stats.total_gross != null) {
    const diff = lowGross.trip_stats.total_gross - (lowGross.trip_stats.total_par ?? 0)
    const diffStr = diff === 0 ? 'E' : diff > 0 ? `+${diff}` : `${diff}`
    awards.push({
      award_key: 'low_gross', award_name: 'Low Gross Champion',
      award_description: 'Lowest total gross score across all rounds',
      award_icon: '🥇',
      trip_player_id: lowGross.trip_player_id,
      value: `${lowGross.trip_stats.total_gross} (${diffStr})`,
    })
  }

  // 2. Low Net Champion
  const lowNet = minBy(p => p.trip_stats.total_net ?? Infinity)
  if (lowNet && lowNet.trip_stats.total_net != null) {
    awards.push({
      award_key: 'low_net', award_name: 'Low Net Champion',
      award_description: 'Lowest total net score across all rounds',
      award_icon: '🥈',
      trip_player_id: lowNet.trip_player_id,
      value: `${lowNet.trip_stats.total_net}`,
    })
  }

  // 3. Birdie Machine
  const birdieKing = maxBy(p => p.trip_stats.total_birdies + p.trip_stats.total_eagles)
  if (birdieKing) {
    const total = birdieKing.trip_stats.total_birdies + birdieKing.trip_stats.total_eagles
    awards.push({
      award_key: 'most_birdies', award_name: 'Birdie Machine',
      award_description: 'Most birdies (and eagles) across all rounds',
      award_icon: '🐦',
      trip_player_id: birdieKing.trip_player_id,
      value: `${total} birdies/eagles`,
    })
  }

  // 4. Mr. Consistent
  const consistent = maxBy(p => p.trip_stats.longest_bogey_streak)
  if (consistent && consistent.trip_stats.longest_bogey_streak >= 4) {
    awards.push({
      award_key: 'most_consistent', award_name: 'Mr. Consistent',
      award_description: 'Longest streak of bogey or better',
      award_icon: '📏',
      trip_player_id: consistent.trip_player_id,
      value: `${consistent.trip_stats.longest_bogey_streak} holes`,
    })
  }

  // 5. Comeback Kid
  const bouncer = maxBy(p => p.trip_stats.total_bounce_backs, 1)
  if (bouncer) {
    awards.push({
      award_key: 'comeback_kid', award_name: 'Comeback Kid',
      award_description: 'Most bounce-backs (par or better after a bogey+)',
      award_icon: '💪',
      trip_player_id: bouncer.trip_player_id,
      value: `${bouncer.trip_stats.total_bounce_backs} bounce-backs`,
    })
  }

  // 6. Biggest Blowup
  let worstHoleVsPar = -Infinity
  let blowupPlayer: AwardInput | null = null
  let blowupHole = ''
  for (const p of active) {
    for (const rs of p.round_stats) {
      if (rs.worst_hole_vs_par != null && rs.worst_hole_vs_par > worstHoleVsPar) {
        worstHoleVsPar = rs.worst_hole_vs_par
        blowupPlayer = p
        blowupHole = `Hole ${rs.worst_hole_number}: ${rs.worst_hole_score} (+${rs.worst_hole_vs_par})`
      }
    }
  }
  if (blowupPlayer && worstHoleVsPar >= 3) {
    awards.push({
      award_key: 'biggest_blowup', award_name: 'The Snowman',
      award_description: 'Worst single hole relative to par',
      award_icon: '⛄',
      trip_player_id: blowupPlayer.trip_player_id,
      value: blowupHole,
    })
  }

  // 7. Par 3 Specialist
  const par3best = minBy(p => {
    const total = p.round_stats.reduce((s, r) => s + (r.par3_total ?? 0), 0)
    const count = p.round_stats.reduce((s, r) => s + r.par3_count, 0)
    return count > 0 ? total / count : Infinity
  })
  if (par3best) {
    const total = par3best.round_stats.reduce((s, r) => s + (r.par3_total ?? 0), 0)
    const count = par3best.round_stats.reduce((s, r) => s + r.par3_count, 0)
    if (count > 0) {
      awards.push({
        award_key: 'par3_specialist', award_name: 'Par 3 Specialist',
        award_description: 'Best average score on par 3s',
        award_icon: '🎯',
        trip_player_id: par3best.trip_player_id,
        value: `${(total / count).toFixed(2)} avg on ${count} par 3s`,
      })
    }
  }

  // 8. Mr. Second Half
  let biggestImprovement = -Infinity
  let improver: AwardInput | null = null
  for (const p of active) {
    for (const rs of p.round_stats) {
      if (rs.front_nine_gross != null && rs.back_nine_gross != null) {
        const improvement = rs.front_nine_gross - rs.back_nine_gross
        if (improvement > biggestImprovement) {
          biggestImprovement = improvement
          improver = p
        }
      }
    }
  }
  if (improver && biggestImprovement >= 3) {
    awards.push({
      award_key: 'second_half', award_name: 'Mr. Second Half',
      award_description: 'Biggest front-to-back nine improvement in a single round',
      award_icon: '📈',
      trip_player_id: improver.trip_player_id,
      value: `${biggestImprovement} strokes better on back 9`,
    })
  }

  return awards
}
