import type { GameEngine, GameEngineInput, GameEngineResult } from './types'

/**
 * 20-Ball Game Engine
 *
 * 2-player game where each player locks in exactly N holes (8-12 each, totaling 20).
 * Lowest combined net score on locked holes wins.
 *
 * Lock state is stored in player metadata:
 *   metadata.locked_holes = string[] (hole IDs that are locked in)
 *
 * Config:
 *   min_holes_per_player: number (default 8)
 *   max_holes_per_player: number (default 12)
 *   total_locks: number (default 20)
 */
export const twentyBallEngine: GameEngine = {
  key: 'twenty_ball',

  compute(input: GameEngineInput): GameEngineResult {
    const { scores, players, holes, playerStrokes, config } = input
    const totalLocks = (config.total_locks as number) ?? 20

    // Build score lookup: trip_player_id -> hole_id -> gross_score
    const scoreMap = new Map<string, Map<string, number>>()
    for (const s of scores) {
      if (!scoreMap.has(s.trip_player_id)) {
        scoreMap.set(s.trip_player_id, new Map())
      }
      scoreMap.get(s.trip_player_id)!.set(s.hole_id, s.gross_score)
    }

    // Hole lookup by id
    const holeById = new Map(holes.map(h => [h.id, h]))

    // Per-player results
    const playerResults = players.map(p => {
      const lockedHoles: string[] = (p.metadata.locked_holes as string[]) || []
      const playerScores = scoreMap.get(p.trip_player_id) || new Map()
      const strokesMap = playerStrokes.get(p.trip_player_id)

      let lockedGross = 0
      let lockedNet = 0
      let lockedCount = 0

      for (const holeId of lockedHoles) {
        const gross = playerScores.get(holeId)
        const hole = holeById.get(holeId)
        if (gross !== undefined && hole) {
          const strokes = strokesMap?.get(hole.hole_number) ?? 0
          lockedGross += gross
          lockedNet += gross - strokes
          lockedCount++
        }
      }

      return {
        trip_player_id: p.trip_player_id,
        lockedHoles,
        lockedCount,
        lockedGross,
        lockedNet,
        totalHolesScored: playerScores.size,
      }
    })

    // Sort by locked net (lower is better)
    const sorted = [...playerResults].sort((a, b) => a.lockedNet - b.lockedNet)

    // Check if game is complete (total locked = totalLocks and all holes scored)
    const totalLocked = playerResults.reduce((sum, p) => sum + p.lockedCount, 0)
    const isComplete = totalLocked === totalLocks && playerResults.every(p => p.totalHolesScored >= holes.length)

    // Determine positions
    const results = sorted.map((p, i) => ({
      trip_player_id: p.trip_player_id,
      position: i + 1,
      points: p.lockedNet,
      money: 0, // Settlement handled externally
      details: {
        locked_holes: p.lockedHoles,
        locked_count: p.lockedCount,
        locked_gross: p.lockedGross,
        locked_net: p.lockedNet,
        total_holes_scored: p.totalHolesScored,
        is_complete: isComplete,
      },
    }))

    // Build hole breakdown
    const holeBreakdown = holes.map(h => {
      const entries: Record<string, unknown> = {
        hole_number: h.hole_number,
        par: h.par,
      }
      for (const p of players) {
        const gross = scoreMap.get(p.trip_player_id)?.get(h.id)
        const locked = ((p.metadata.locked_holes as string[]) || []).includes(h.id)
        entries[p.trip_player_id] = { gross, locked }
      }
      return entries
    })

    // Summary
    let summary = `20-Ball: ${totalLocked}/${totalLocks} holes locked`
    if (isComplete && sorted.length >= 2) {
      const margin = sorted[1].lockedNet - sorted[0].lockedNet
      summary = margin === 0
        ? '20-Ball: Tied!'
        : `20-Ball: Leader by ${margin} net strokes`
    }

    return {
      players: results,
      holes: holeBreakdown,
      summary,
    }
  },

  validateConfig(config: Record<string, unknown>) {
    const errors: string[] = []
    const min = config.min_holes_per_player
    const max = config.max_holes_per_player
    const total = config.total_locks

    if (min !== undefined && (typeof min !== 'number' || min < 1)) {
      errors.push('min_holes_per_player must be a positive number')
    }
    if (max !== undefined && (typeof max !== 'number' || max < 1)) {
      errors.push('max_holes_per_player must be a positive number')
    }
    if (total !== undefined && (typeof total !== 'number' || total < 1)) {
      errors.push('total_locks must be a positive number')
    }
    if (typeof min === 'number' && typeof max === 'number' && min > max) {
      errors.push('min_holes_per_player cannot exceed max_holes_per_player')
    }

    return { valid: errors.length === 0, errors }
  },

  validatePlayers(playerCount: number) {
    if (playerCount !== 2) {
      return { valid: false, error: '20-Ball requires exactly 2 players' }
    }
    return { valid: true }
  },
}
