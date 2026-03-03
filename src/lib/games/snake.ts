import type { GameEngine, GameEngineInput, GameEngineResult } from './types'

/**
 * Snake — Track 3-putts. Last person to 3-putt "holds the snake" and pays everyone.
 *
 * Config: snake_value (5) — what holder pays each other player
 * Player metadata: putts: { [hole_number]: number }
 */
function compute(input: GameEngineInput): GameEngineResult {
  const { players, holes, config } = input
  const snakeValue = (config.snake_value as number) ?? 5
  const pids = players.map(p => p.trip_player_id)
  const sortedHoles = [...holes].sort((a, b) => a.hole_number - b.hole_number)

  const threePutts: { pid: string; hole: number }[] = []
  for (const p of players) {
    const putts = (p.metadata?.putts || {}) as Record<string, number>
    for (const hole of sortedHoles) {
      const count = putts[hole.hole_number.toString()]
      if (count != null && count >= 3) threePutts.push({ pid: p.trip_player_id, hole: hole.hole_number })
    }
  }

  threePutts.sort((a, b) => b.hole - a.hole)
  const snakeHolder = threePutts.length > 0 ? threePutts[0].pid : null
  const otherCount = pids.length - 1

  const threePuttCount = new Map<string, number>(pids.map(id => [id, 0]))
  for (const tp of threePutts) threePuttCount.set(tp.pid, (threePuttCount.get(tp.pid) || 0) + 1)

  return {
    players: pids.map(id => {
      const holds = id === snakeHolder
      return {
        trip_player_id: id,
        position: holds ? pids.length : 1,
        points: holds ? -1 : (snakeHolder ? 1 : 0),
        money: holds ? -(snakeValue * otherCount) : (snakeHolder ? snakeValue : 0),
        details: { holds_snake: holds, three_putt_count: threePuttCount.get(id) || 0 },
      }
    }),
    holes: threePutts.map(tp => ({ hole_number: tp.hole, player: tp.pid, event: 'three_putt' })),
    summary: snakeHolder ? `Snake: held on hole ${threePutts[0].hole}` : 'Snake: no 3-putts!',
  }
}

function validateConfig() { return { valid: true, errors: [] } }
function validatePlayers(c: number) { return c >= 2 ? { valid: true } : { valid: false, error: 'Snake requires 2+ players' } }

export const snakeEngine: GameEngine = { key: 'snake', compute, validateConfig, validatePlayers }
