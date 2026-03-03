import { nassauEngine } from '@/lib/games/nassau'
import type { GameEngineInput } from '@/lib/types'

function makeHoles() {
  return Array.from({ length: 18 }, (_, i) => ({
    id: `hole-${i + 1}`,
    hole_number: i + 1,
    par: 4,
    handicap_index: i + 1,
  }))
}

describe('Nassau Engine', () => {
  it('computes front/back/overall correctly', () => {
    const holes = makeHoles()

    // Alice wins holes 1-5 (front heavy), Bob wins holes 10-14 (back heavy)
    const scores = []
    for (let h = 1; h <= 18; h++) {
      if (h <= 5) {
        scores.push({ trip_player_id: 'alice', hole_id: `hole-${h}`, gross_score: 3 })
        scores.push({ trip_player_id: 'bob', hole_id: `hole-${h}`, gross_score: 5 })
      } else if (h >= 10 && h <= 14) {
        scores.push({ trip_player_id: 'alice', hole_id: `hole-${h}`, gross_score: 5 })
        scores.push({ trip_player_id: 'bob', hole_id: `hole-${h}`, gross_score: 3 })
      } else {
        scores.push({ trip_player_id: 'alice', hole_id: `hole-${h}`, gross_score: 4 })
        scores.push({ trip_player_id: 'bob', hole_id: `hole-${h}`, gross_score: 4 })
      }
    }

    const input: GameEngineInput = {
      scores,
      players: [
        { trip_player_id: 'alice', side: null, metadata: {} },
        { trip_player_id: 'bob', side: null, metadata: {} },
      ],
      holes,
      playerStrokes: new Map(),
      config: { bet_amount: 10, auto_press: false },
    }

    const result = nassauEngine.compute(input)
    const alice = result.players.find(p => p.trip_player_id === 'alice')!
    const bob = result.players.find(p => p.trip_player_id === 'bob')!

    // Alice wins front (+10), Bob wins back (+10), tied overall (0)
    // Alice: +10 - 10 = 0, Bob: -10 + 10 = 0
    expect(alice.money).toBe(0)
    expect(bob.money).toBe(0)
  })

  it('requires exactly 2 players', () => {
    expect(nassauEngine.validatePlayers(1, {}).valid).toBe(false)
    expect(nassauEngine.validatePlayers(2, {}).valid).toBe(true)
    expect(nassauEngine.validatePlayers(3, {}).valid).toBe(false)
  })
})
