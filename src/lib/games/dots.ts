import type { GameEngine, GameEngineInput, GameEngineResult } from './types'

/**
 * Dots / Trash / Garbage Engine
 *
 * Players earn (or lose) points for specific achievements per hole.
 * Configured per game — admin enables which dots count and their values.
 *
 * Standard achievements:
 *   greenie    — Closest to pin on par 3, must make par or better (+1)
 *   sandy      — Up-and-down from a bunker for par or better (+1)
 *   barkie     — Hit a tree, still make par or better (+1)
 *   polie      — One-putt (+1)
 *   chippy     — Chip in from off the green (+2)
 *   birdie     — Make birdie (+2)
 *   eagle      — Make eagle (+4)
 *   double     — Make double bogey or worse (-1)
 *   three_putt — Three-putt (-1)
 *   water      — Hit it in the water (-1)
 *   ob         — Hit it out of bounds (-1)
 *
 * Achievements recorded in player metadata per hole:
 *   dots_hits: { [hole_number]: string[] }
 *   e.g. { "3": ["greenie", "polie"], "7": ["sandy"], "12": ["double"] }
 *
 * Config:
 *   dot_values: Record<string, number>  — override default point values
 *   enabled_dots: string[]              — which dots are active (default: all)
 *   per_point_value: number             — dollar value per point (default: 1)
 */

const DEFAULT_VALUES: Record<string, number> = {
  greenie: 1, sandy: 1, barkie: 1, polie: 1, chippy: 2,
  birdie: 2, eagle: 4, double: -1, three_putt: -1, water: -1, ob: -1,
}

const ALL_DOTS = Object.keys(DEFAULT_VALUES)

function compute(input: GameEngineInput): GameEngineResult {
  const { scores, players, holes, config } = input
  const dotValues = { ...DEFAULT_VALUES, ...((config.dot_values as Record<string, number>) || {}) }
  const enabledDots = (config.enabled_dots as string[]) || ALL_DOTS
  const perPointValue = (config.per_point_value as number) ?? 1

  const pids = players.map(p => p.trip_player_id)
  const sortedHoles = [...holes].sort((a, b) => a.hole_number - b.hole_number)

  const playerDots = new Map<string, { total: number; hits: { hole: number; dot: string; value: number }[] }>()
  pids.forEach(id => playerDots.set(id, { total: 0, hits: [] }))

  for (const p of players) {
    const pid = p.trip_player_id
    const data = playerDots.get(pid)!
    const manualHits = (p.metadata?.dots_hits || {}) as Record<string, string[]>

    for (const hole of sortedHoles) {
      const holeNum = hole.hole_number
      const holeHits = [...(manualHits[holeNum.toString()] || [])]

      // Auto-detect scoring-based dots
      const score = scores.find(s => s.trip_player_id === pid && s.hole_id === hole.id)
      if (score) {
        const vsPar = score.gross_score - hole.par
        if (vsPar <= -2 && !holeHits.includes('eagle') && enabledDots.includes('eagle')) holeHits.push('eagle')
        else if (vsPar === -1 && !holeHits.includes('birdie') && enabledDots.includes('birdie')) holeHits.push('birdie')
        if (vsPar >= 2 && !holeHits.includes('double') && enabledDots.includes('double')) holeHits.push('double')
      }

      for (const dot of holeHits) {
        if (enabledDots.includes(dot) && dotValues[dot] != null) {
          data.total += dotValues[dot]
          data.hits.push({ hole: holeNum, dot, value: dotValues[dot] })
        }
      }
    }
  }

  const sorted = pids.map(id => ({ id, ...playerDots.get(id)! })).sort((a, b) => b.total - a.total)

  return {
    players: sorted.map((p, i) => ({
      trip_player_id: p.id,
      position: i + 1,
      points: p.total,
      money: p.total * perPointValue,
      details: {
        hits: p.hits,
        total_dots: p.hits.length,
        positive: p.hits.filter(h => h.value > 0).length,
        negative: p.hits.filter(h => h.value < 0).length,
      },
    })),
    holes: [],
    summary: `Dots: ${sorted.map(s => s.total).join(' / ')}`,
  }
}

function validateConfig() { return { valid: true, errors: [] } }
function validatePlayers(c: number) { return c >= 2 ? { valid: true } : { valid: false, error: 'Dots requires 2+ players' } }

export const dotsEngine: GameEngine = { key: 'dots', compute, validateConfig, validatePlayers }
