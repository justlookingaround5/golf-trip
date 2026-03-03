import type { GameEngine, GameEngineInput, GameEngineResult } from './types'

/**
 * Match Play V2 Engine
 *
 * Wraps existing match-play logic into the new engine interface.
 * Head-to-head, hole-by-hole. Lower net wins the hole.
 *
 * Config:
 *   handicap_pct: number (default: 100)
 */
function compute(input: GameEngineInput): GameEngineResult {
  const { scores, players, holes, playerStrokes } = input

  if (players.length !== 2) {
    return {
      players: players.map(p => ({
        trip_player_id: p.trip_player_id, position: 1, points: 0, money: 0,
        details: { error: 'Match play requires exactly 2 players' },
      })),
      holes: [],
      summary: 'Error: Match play requires exactly 2 players',
    }
  }

  const playerA = players[0].trip_player_id
  const playerB = players[1].trip_player_id
  const holeById = new Map(holes.map(h => [h.id, h]))
  const sortedHoles = [...holes].sort((a, b) => a.hole_number - b.hole_number)
  const totalHoles = sortedHoles.length

  // Calculate net per hole per player
  const holeResults: { hole_number: number; a_net: number; b_net: number; winner: string | null }[] = []
  let lead = 0 // positive = A leads
  let clinched = false
  let clinchHole = 0

  for (let i = 0; i < sortedHoles.length; i++) {
    const hole = sortedHoles[i]
    const scoreA = scores.find(s => s.trip_player_id === playerA && s.hole_id === hole.id)
    const scoreB = scores.find(s => s.trip_player_id === playerB && s.hole_id === hole.id)
    if (!scoreA || !scoreB) continue

    const strokesA = playerStrokes.get(playerA)?.get(hole.hole_number) ?? 0
    const strokesB = playerStrokes.get(playerB)?.get(hole.hole_number) ?? 0
    const netA = scoreA.gross_score - strokesA
    const netB = scoreB.gross_score - strokesB

    let winner: string | null = null
    if (netA < netB) { lead++; winner = playerA }
    else if (netB < netA) { lead--; winner = playerB }

    holeResults.push({ hole_number: hole.hole_number, a_net: netA, b_net: netB, winner })

    const holesLeft = totalHoles - (i + 1)
    if (Math.abs(lead) > holesLeft) {
      clinched = true
      clinchHole = i + 1
      break
    }
  }

  const holesPlayed = holeResults.length
  const holesRemaining = totalHoles - (clinched ? clinchHole : holesPlayed)
  const absLead = Math.abs(lead)

  let status: string
  let isComplete = false

  if (clinched) {
    isComplete = true
    status = holesRemaining === 0 ? `${absLead}UP` : `${absLead}&${holesRemaining}`
  } else if (holesRemaining === 0) {
    isComplete = true
    status = lead === 0 ? 'AS' : `${absLead}UP`
  } else {
    status = lead === 0 ? `AS thru ${holesPlayed}` : `${absLead}UP thru ${holesPlayed}`
  }

  const aPoints = lead > 0 ? 1 : lead === 0 && isComplete ? 0.5 : 0
  const bPoints = lead < 0 ? 1 : lead === 0 && isComplete ? 0.5 : 0

  return {
    players: [
      {
        trip_player_id: playerA,
        position: aPoints >= bPoints ? 1 : 2,
        points: aPoints,
        money: 0,
        details: { status, holes_played: holesPlayed, lead: lead > 0 ? lead : 0 },
      },
      {
        trip_player_id: playerB,
        position: bPoints >= aPoints ? 1 : 2,
        points: bPoints,
        money: 0,
        details: { status, holes_played: holesPlayed, lead: lead < 0 ? -lead : 0 },
      },
    ],
    holes: holeResults as unknown as Record<string, unknown>[],
    summary: `Match Play: ${status}`,
  }
}

function validateConfig() {
  return { valid: true, errors: [] }
}

function validatePlayers(count: number) {
  if (count !== 2) return { valid: false, error: 'Match play requires exactly 2 players' }
  return { valid: true }
}

export const matchPlayEngine: GameEngine = {
  key: 'match_play',
  compute,
  validateConfig,
  validatePlayers,
}
