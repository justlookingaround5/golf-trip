import { skinsEngine } from '@/lib/games/skins'
import type { GameEngineInput } from '@/lib/types'

function makeHoles(count = 18) {
  return Array.from({ length: count }, (_, i) => ({
    id: `hole-${i + 1}`,
    hole_number: i + 1,
    par: 4,
    handicap_index: i + 1,
  }))
}

function makeInput(overrides: Partial<GameEngineInput> = {}): GameEngineInput {
  return {
    scores: [],
    players: [
      { trip_player_id: 'alice', side: null, metadata: {} },
      { trip_player_id: 'bob', side: null, metadata: {} },
    ],
    holes: makeHoles(),
    playerStrokes: new Map(),
    config: { mode: 'gross', carry_over: true },
    ...overrides,
  }
}

describe('Skins Engine', () => {
  it('awards skin to sole lowest score', () => {
    const input = makeInput({
      scores: [
        { trip_player_id: 'alice', hole_id: 'hole-1', gross_score: 3 },
        { trip_player_id: 'bob', hole_id: 'hole-1', gross_score: 4 },
      ],
    })

    const result = skinsEngine.compute(input)
    const alice = result.players.find(p => p.trip_player_id === 'alice')!
    const bob = result.players.find(p => p.trip_player_id === 'bob')!

    expect(alice.points).toBe(1)
    expect(bob.points).toBe(0)
  })

  it('carries over on tie', () => {
    const input = makeInput({
      scores: [
        // Hole 1: tie
        { trip_player_id: 'alice', hole_id: 'hole-1', gross_score: 4 },
        { trip_player_id: 'bob', hole_id: 'hole-1', gross_score: 4 },
        // Hole 2: alice wins
        { trip_player_id: 'alice', hole_id: 'hole-2', gross_score: 3 },
        { trip_player_id: 'bob', hole_id: 'hole-2', gross_score: 5 },
      ],
    })

    const result = skinsEngine.compute(input)
    const alice = result.players.find(p => p.trip_player_id === 'alice')!

    // Hole 2 should be worth 2 skins (1 carried + 1 for hole 2)
    expect(alice.points).toBe(2)
  })

  it('handles all ties — no skins awarded', () => {
    const input = makeInput({
      scores: [
        { trip_player_id: 'alice', hole_id: 'hole-1', gross_score: 4 },
        { trip_player_id: 'bob', hole_id: 'hole-1', gross_score: 4 },
      ],
    })

    const result = skinsEngine.compute(input)
    expect(result.players.every(p => p.points === 0)).toBe(true)
  })

  it('validates player count', () => {
    expect(skinsEngine.validatePlayers(1, {}).valid).toBe(false)
    expect(skinsEngine.validatePlayers(2, {}).valid).toBe(true)
    expect(skinsEngine.validatePlayers(20, {}).valid).toBe(true)
  })
})
