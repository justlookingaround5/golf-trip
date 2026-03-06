/**
 * Pure function to compute detailed round stats from raw score data.
 *
 * This is the "v2" stats engine that works with the live scoring
 * round_scores table (which includes fairway_hit, gir, putts).
 */

export interface ScoreInput {
  hole_id: string
  gross_score: number
  fairway_hit?: boolean | null
  gir?: boolean | null
  putts?: number | null
}

export interface HoleInput {
  id: string
  hole_number: number
  par: number
  handicap_index: number
}

export interface RoundStatsResult {
  gross_total: number
  net_total: number
  par_total: number
  holes_played: number
  eagles: number
  birdies: number
  pars: number
  bogeys: number
  double_bogeys: number
  others: number
  par_or_better_streak: number
  bogey_or_better_streak: number
  best_hole_score: number
  best_hole_number: number
  worst_hole_score: number
  worst_hole_number: number
  best_hole_vs_par: number
  worst_hole_vs_par: number
  par3_total: number
  par3_count: number
  par4_total: number
  par4_count: number
  par5_total: number
  par5_count: number
  front_nine_gross: number
  front_nine_net: number
  back_nine_gross: number
  back_nine_net: number
  greens_in_regulation: number
  bounce_backs: number
  scoring_average: number
  fairways_hit: number
  fairways_total: number
  total_putts: number
  putts_per_hole: number | null
}

/**
 * Distribute handicap strokes across holes by handicap_index (ascending = hardest first).
 * Returns a Map<hole_id, strokes_for_that_hole>.
 * If handicapStrokes > number of holes, does a second pass.
 */
function distributeStrokes(
  handicapStrokes: number,
  holes: HoleInput[],
): Map<string, number> {
  const strokeMap = new Map<string, number>()
  const sorted = [...holes].sort((a, b) => a.handicap_index - b.handicap_index)

  let remaining = handicapStrokes
  // First pass
  for (const hole of sorted) {
    if (remaining <= 0) break
    strokeMap.set(hole.id, (strokeMap.get(hole.id) || 0) + 1)
    remaining--
  }
  // Second pass if handicap > number of holes
  for (const hole of sorted) {
    if (remaining <= 0) break
    strokeMap.set(hole.id, (strokeMap.get(hole.id) || 0) + 1)
    remaining--
  }

  return strokeMap
}

export function computeRoundStats(
  scores: ScoreInput[],
  holes: HoleInput[],
  handicapStrokes: number,
): RoundStatsResult {
  const holeById = new Map(holes.map(h => [h.id, h]))
  const strokeMap = distributeStrokes(handicapStrokes, holes)

  // Build hole-by-hole data sorted by hole_number
  const holeData: {
    hole_number: number
    par: number
    gross: number
    net: number
    vs_par: number
    fairway_hit: boolean | null
    gir: boolean | null
    putts: number | null
  }[] = []

  for (const score of scores) {
    const hole = holeById.get(score.hole_id)
    if (!hole) continue

    const strokes = strokeMap.get(score.hole_id) ?? 0
    const net = score.gross_score - strokes

    holeData.push({
      hole_number: hole.hole_number,
      par: hole.par,
      gross: score.gross_score,
      net,
      vs_par: score.gross_score - hole.par,
      fairway_hit: score.fairway_hit ?? null,
      gir: score.gir ?? null,
      putts: score.putts ?? null,
    })
  }

  // Sort by hole_number for streak/bounce-back calculations
  holeData.sort((a, b) => a.hole_number - b.hole_number)

  const holesPlayed = holeData.length

  if (holesPlayed === 0) {
    return {
      gross_total: 0, net_total: 0, par_total: 0, holes_played: 0,
      eagles: 0, birdies: 0, pars: 0, bogeys: 0, double_bogeys: 0, others: 0,
      par_or_better_streak: 0, bogey_or_better_streak: 0,
      best_hole_score: 0, best_hole_number: 0,
      worst_hole_score: 0, worst_hole_number: 0,
      best_hole_vs_par: 0, worst_hole_vs_par: 0,
      par3_total: 0, par3_count: 0, par4_total: 0, par4_count: 0,
      par5_total: 0, par5_count: 0,
      front_nine_gross: 0, front_nine_net: 0,
      back_nine_gross: 0, back_nine_net: 0,
      greens_in_regulation: 0, bounce_backs: 0, scoring_average: 0,
      fairways_hit: 0, fairways_total: 0, total_putts: 0, putts_per_hole: null,
    }
  }

  // Core totals
  const grossTotal = holeData.reduce((s, h) => s + h.gross, 0)
  const netTotal = holeData.reduce((s, h) => s + h.net, 0)
  const parTotal = holeData.reduce((s, h) => s + h.par, 0)

  // Scoring distribution (based on gross vs par)
  let eagles = 0, birdies = 0, pars = 0, bogeys = 0, doubleBogeys = 0, others = 0
  for (const h of holeData) {
    const diff = h.vs_par
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
    if (h.vs_par <= 0) {
      parStreak++
      maxParStreak = Math.max(maxParStreak, parStreak)
    } else {
      parStreak = 0
    }
    if (h.vs_par <= 1) {
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

  // GIR: count holes where gir === true
  const gir = holeData.filter(h => h.gir === true).length

  // Bounce-backs: par-or-better after double-bogey-or-worse (vs_par >= 2)
  let bounceBacks = 0
  for (let i = 1; i < holeData.length; i++) {
    if (holeData[i - 1].vs_par >= 2 && holeData[i].vs_par <= 0) {
      bounceBacks++
    }
  }

  // Fairways: only count par 4+ holes where fairway_hit is not null
  const fairwayEligible = holeData.filter(h => h.par >= 4 && h.fairway_hit !== null)
  const fairwaysHit = fairwayEligible.filter(h => h.fairway_hit === true).length
  const fairwaysTotal = fairwayEligible.length

  // Putts: only count holes where putts is not null
  const puttHoles = holeData.filter(h => h.putts !== null)
  const totalPutts = puttHoles.reduce((s, h) => s + (h.putts ?? 0), 0)
  const puttsPerHole = puttHoles.length > 0
    ? Math.round((totalPutts / puttHoles.length) * 100) / 100
    : null

  return {
    gross_total: grossTotal,
    net_total: netTotal,
    par_total: parTotal,
    holes_played: holesPlayed,
    eagles,
    birdies,
    pars,
    bogeys,
    double_bogeys: doubleBogeys,
    others,
    par_or_better_streak: maxParStreak,
    bogey_or_better_streak: maxBogeyStreak,
    best_hole_score: bestScore,
    best_hole_number: bestHole,
    worst_hole_score: worstScore,
    worst_hole_number: worstHole,
    best_hole_vs_par: bestVsPar,
    worst_hole_vs_par: worstVsPar,
    par3_total: par3s.reduce((s, h) => s + h.gross, 0),
    par3_count: par3s.length,
    par4_total: par4s.reduce((s, h) => s + h.gross, 0),
    par4_count: par4s.length,
    par5_total: par5s.reduce((s, h) => s + h.gross, 0),
    par5_count: par5s.length,
    front_nine_gross: frontNine.reduce((s, h) => s + h.gross, 0),
    front_nine_net: frontNine.reduce((s, h) => s + h.net, 0),
    back_nine_gross: backNine.reduce((s, h) => s + h.gross, 0),
    back_nine_net: backNine.reduce((s, h) => s + h.net, 0),
    greens_in_regulation: gir,
    bounce_backs: bounceBacks,
    scoring_average: Math.round((grossTotal / holesPlayed) * 100) / 100,
    fairways_hit: fairwaysHit,
    fairways_total: fairwaysTotal,
    total_putts: totalPutts,
    putts_per_hole: puttsPerHole,
  }
}
