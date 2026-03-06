/**
 * Tests for quick round input validation logic.
 * Mirrors the validation in quick-round-client.tsx and route.ts.
 */

interface PlayerInput {
  name: string
  handicap?: number | null
}

function validateQuickRoundInput(data: {
  courseName: string
  players: PlayerInput[]
}): string | null {
  if (!data.courseName || data.courseName.trim().length === 0) {
    return 'Course name is required'
  }
  if (!data.players || data.players.length === 0 || data.players.length > 4) {
    return '1-4 players required'
  }
  if (data.players.some(p => !p.name || p.name.trim().length === 0)) {
    return 'All players must have a name'
  }
  return null
}

function canSubmit(courseName: string, players: { name: string }[], submitting: boolean): boolean {
  return (
    courseName.trim().length > 0 &&
    players.every(p => p.name.trim().length > 0) &&
    !submitting
  )
}

describe('quick round input validation', () => {
  it('passes with valid course and players', () => {
    const error = validateQuickRoundInput({
      courseName: 'Test Course',
      players: [{ name: 'James', handicap: 15 }],
    })
    expect(error).toBeNull()
  })

  it('fails with empty course name', () => {
    const error = validateQuickRoundInput({
      courseName: '',
      players: [{ name: 'James' }],
    })
    expect(error).toBe('Course name is required')
  })

  it('fails with whitespace-only course name', () => {
    const error = validateQuickRoundInput({
      courseName: '   ',
      players: [{ name: 'James' }],
    })
    expect(error).toBe('Course name is required')
  })

  it('fails with no players', () => {
    const error = validateQuickRoundInput({
      courseName: 'Test Course',
      players: [],
    })
    expect(error).toBe('1-4 players required')
  })

  it('fails with more than 4 players', () => {
    const error = validateQuickRoundInput({
      courseName: 'Test Course',
      players: [
        { name: 'A' }, { name: 'B' }, { name: 'C' },
        { name: 'D' }, { name: 'E' },
      ],
    })
    expect(error).toBe('1-4 players required')
  })

  it('fails when a player has empty name', () => {
    const error = validateQuickRoundInput({
      courseName: 'Test Course',
      players: [{ name: 'James' }, { name: '' }],
    })
    expect(error).toBe('All players must have a name')
  })

  it('allows null handicap', () => {
    const error = validateQuickRoundInput({
      courseName: 'Test Course',
      players: [{ name: 'James', handicap: null }],
    })
    expect(error).toBeNull()
  })

  it('allows up to 4 players', () => {
    const error = validateQuickRoundInput({
      courseName: 'Test Course',
      players: [{ name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }],
    })
    expect(error).toBeNull()
  })
})

describe('canSubmit (client-side)', () => {
  it('returns true with valid inputs', () => {
    expect(canSubmit('Test Course', [{ name: 'James' }], false)).toBe(true)
  })

  it('returns false when course is empty', () => {
    expect(canSubmit('', [{ name: 'James' }], false)).toBe(false)
  })

  it('returns false when player name is empty', () => {
    expect(canSubmit('Test', [{ name: 'James' }, { name: '' }], false)).toBe(false)
  })

  it('returns false when submitting', () => {
    expect(canSubmit('Test', [{ name: 'James' }], true)).toBe(false)
  })

  it('returns false with whitespace-only course', () => {
    expect(canSubmit('   ', [{ name: 'James' }], false)).toBe(false)
  })
})
