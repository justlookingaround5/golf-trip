/**
 * Tests for game format filtering logic used in quick-round-client.tsx
 * This mirrors the `availableGames` computed filter in the component.
 */

interface GameFormat {
  id: string
  name: string
  description: string
  icon: string
  min_players: number
  max_players: number
  team_based: boolean
}

function filterGamesByPlayerCount(games: GameFormat[], playerCount: number): GameFormat[] {
  return games.filter(
    g => playerCount >= g.min_players && playerCount <= g.max_players
  )
}

const testFormats: GameFormat[] = [
  { id: '1', name: 'Match Play', description: '1v1', icon: '🏆', min_players: 2, max_players: 2, team_based: false },
  { id: '2', name: 'Nassau', description: 'Front/back/total', icon: '💰', min_players: 2, max_players: 4, team_based: false },
  { id: '3', name: 'Skins', description: 'Per-hole pot', icon: '🎰', min_players: 2, max_players: 4, team_based: false },
  { id: '4', name: 'Wolf', description: 'Rotating picker', icon: '🐺', min_players: 4, max_players: 4, team_based: true },
  { id: '5', name: 'Best Ball', description: 'Team best score', icon: '⭐', min_players: 4, max_players: 4, team_based: true },
  { id: '6', name: 'Stableford', description: 'Points system', icon: '📊', min_players: 1, max_players: 4, team_based: false },
]

describe('game filtering by player count', () => {
  it('shows solo games for 1 player', () => {
    const result = filterGamesByPlayerCount(testFormats, 1)
    expect(result.map(g => g.name)).toEqual(['Stableford'])
  })

  it('shows 2-player games for 2 players', () => {
    const result = filterGamesByPlayerCount(testFormats, 2)
    const names = result.map(g => g.name)
    expect(names).toContain('Match Play')
    expect(names).toContain('Nassau')
    expect(names).toContain('Skins')
    expect(names).toContain('Stableford')
    expect(names).not.toContain('Wolf')
    expect(names).not.toContain('Best Ball')
  })

  it('shows 3-player games for 3 players', () => {
    const result = filterGamesByPlayerCount(testFormats, 3)
    const names = result.map(g => g.name)
    expect(names).toContain('Nassau')
    expect(names).toContain('Skins')
    expect(names).toContain('Stableford')
    expect(names).not.toContain('Match Play')  // max 2
    expect(names).not.toContain('Wolf')         // min 4
  })

  it('shows all 4-player games for 4 players', () => {
    const result = filterGamesByPlayerCount(testFormats, 4)
    const names = result.map(g => g.name)
    expect(names).toContain('Nassau')
    expect(names).toContain('Skins')
    expect(names).toContain('Wolf')
    expect(names).toContain('Best Ball')
    expect(names).toContain('Stableford')
    expect(names).not.toContain('Match Play')  // max 2
  })

  it('returns empty for 0 players', () => {
    const result = filterGamesByPlayerCount(testFormats, 0)
    expect(result).toEqual([])
  })

  it('returns empty for 5 players (all max at 4)', () => {
    const result = filterGamesByPlayerCount(testFormats, 5)
    expect(result).toEqual([])
  })
})

describe('game buy-in state management', () => {
  it('tracks buy-in per selected game', () => {
    const selected = new Map<string, number>()
    selected.set('1', 5)
    selected.set('3', 10)

    expect(selected.get('1')).toBe(5)
    expect(selected.get('3')).toBe(10)
    expect(selected.has('2')).toBe(false)
  })

  it('defaults buy-in to 0 when game is toggled on', () => {
    const selected = new Map<string, number>()
    selected.set('1', 0)
    expect(selected.get('1')).toBe(0)
  })

  it('removes game when toggled off', () => {
    const selected = new Map<string, number>()
    selected.set('1', 5)
    selected.delete('1')
    expect(selected.has('1')).toBe(false)
  })

  it('serializes to API format correctly', () => {
    const selected = new Map<string, number>()
    selected.set('abc-123', 5)
    selected.set('def-456', 0)

    const payload = Array.from(selected.entries()).map(([id, buyIn]) => ({
      formatId: id,
      buyIn,
    }))

    expect(payload).toEqual([
      { formatId: 'abc-123', buyIn: 5 },
      { formatId: 'def-456', buyIn: 0 },
    ])
  })
})
