import type { GameEngine, GameEngineInput, GameEngineResult } from './types'

/**
 * Rabbit — Win a hole outright = grab the rabbit. Hold it at end of 9 = collect.
 * Two rabbits: front 9 and back 9 (configurable).
 *
 * Config: rabbit_value (5), split_nines (true), use_net (true)
 */
function compute(input: GameEngineInput): GameEngineResult {
  const { scores, players, holes, playerStrokes, config } = input
  const rabbitValue = (config.rabbit_value as number) ?? 5
  const splitNines = config.split_nines !== false
  const useNet = config.use_net !== false

  const pids = players.map(p => p.trip_player_id)
  const sortedHoles = [...holes].sort((a, b) => a.hole_number - b.hole_number)

  interface RabbitEvent {
    [key: string]: unknown
    hole_number: number
    grabbed_by: string
  }

  function runRabbit(holeSubset: typeof sortedHoles): { holder: string | null; events: RabbitEvent[] } {
    let holder: string | null = null
    const events: RabbitEvent[] = []
    for (const hole of holeSubset) {
      const holeScores: { pid: string; score: number }[] = []
      for (const pid of pids) {
        const s = scores.find(sc => sc.trip_player_id === pid && sc.hole_id === hole.id)
        if (!s) continue
        const strokes = useNet ? (playerStrokes.get(pid)?.get(hole.hole_number) ?? 0) : 0
        holeScores.push({ pid, score: s.gross_score - strokes })
      }
      if (holeScores.length < pids.length) continue
      const min = Math.min(...holeScores.map(s => s.score))
      const winners = holeScores.filter(s => s.score === min)
      if (winners.length === 1) {
        holder = winners[0].pid
        events.push({ hole_number: hole.hole_number, grabbed_by: holder })
      }
    }
    return { holder, events }
  }

  const results = new Map<string, number>(pids.map(id => [id, 0]))
  let allEvents: RabbitEvent[] = []

  const groups = splitNines
    ? [sortedHoles.filter(h => h.hole_number <= 9), sortedHoles.filter(h => h.hole_number > 9)]
    : [sortedHoles]

  for (const group of groups) {
    if (group.length === 0) continue
    const { holder, events } = runRabbit(group)
    allEvents = [...allEvents, ...events]
    if (holder) {
      results.set(holder, (results.get(holder) || 0) + rabbitValue * (pids.length - 1))
      for (const pid of pids) {
        if (pid !== holder) results.set(pid, (results.get(pid) || 0) - rabbitValue)
      }
    }
  }

  const sorted = pids.map(id => ({ id, money: results.get(id) || 0 })).sort((a, b) => b.money - a.money)

  return {
    players: sorted.map((p, i) => ({
      trip_player_id: p.id,
      position: i + 1,
      points: p.money > 0 ? 1 : p.money < 0 ? -1 : 0,
      money: p.money,
      details: {},
    })),
    holes: allEvents,
    summary: `Rabbit: ${sorted.map(s => `${s.money > 0 ? '+' : ''}${s.money}`).join(' / ')}`,
  }
}

function validateConfig() { return { valid: true, errors: [] } }
function validatePlayers(c: number) { return c >= 2 ? { valid: true } : { valid: false, error: 'Rabbit requires 2+ players' } }

export const rabbitEngine: GameEngine = { key: 'rabbit', compute, validateConfig, validatePlayers }
