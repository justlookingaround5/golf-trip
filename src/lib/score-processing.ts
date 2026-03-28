import type { SupabaseClient } from '@supabase/supabase-js'
import { detectScoringEvents } from '@/lib/activity'
import { getEngine } from '@/lib/games'
import { getStrokesPerHole } from '@/lib/handicap'
import { calculateMatchPlay } from '@/lib/match-play'
import { postSystemMessage } from '@/lib/notifications'
import type { GameEngineInput } from '@/lib/types'

interface ScoreEntry {
  trip_player_id: string
  gross_score: number
}

/**
 * Non-blocking post-score processing:
 * 1. Detect birdie/eagle/bad-score events for the activity feed + chat
 * 2. Recompute any active round games for this course (with skins alerts)
 * 3. Auto-complete the match if match-play result is decided
 */
export async function processScoreEvents(
  db: SupabaseClient,
  courseId: string,
  holeId: string,
  scoreEntries: ScoreEntry[],
  matchId?: string
) {
  // Get hole info (par, number) and course's trip_id
  const [holeRes, courseRes] = await Promise.all([
    db.from('holes').select('id, hole_number, par, handicap_index').eq('id', holeId).single(),
    db.from('courses').select('id, trip_id').eq('id', courseId).single(),
  ])

  if (!holeRes.data || !courseRes.data) return
  const hole = holeRes.data
  const tripId = courseRes.data.trip_id

  // Get player names and handicap strokes for scoring event detection
  const tripPlayerIds = scoreEntries.map((s) => s.trip_player_id)
  const [playersRes, handicapsRes] = await Promise.all([
    db
      .from('trip_players')
      .select('id, player:players(name)')
      .in('id', tripPlayerIds),
    db
      .from('player_course_handicaps')
      .select('trip_player_id, handicap_strokes')
      .eq('course_id', courseId)
      .in('trip_player_id', tripPlayerIds),
  ])

  // Build lookup maps
  const playerNames = new Map<string, string>()
  for (const tp of playersRes.data || []) {
    const playerArr = tp.player as unknown as { name: string }[] | null
    const name = playerArr?.[0]?.name || 'Unknown'
    playerNames.set(tp.id, name)
  }

  const handicapStrokes = new Map<string, number>()
  for (const ch of handicapsRes.data || []) {
    handicapStrokes.set(ch.trip_player_id, ch.handicap_strokes)
  }

  // Get all holes for stroke allocation
  const { data: allHoles } = await db
    .from('holes')
    .select('hole_number, handicap_index')
    .eq('course_id', courseId)
    .order('hole_number')

  // Detect scoring events for each score entry
  for (const entry of scoreEntries) {
    const hcStrokes = handicapStrokes.get(entry.trip_player_id) ?? 0
    const strokesMap = getStrokesPerHole(hcStrokes, allHoles || [])
    const strokesOnHole = strokesMap.get(hole.hole_number) ?? 0
    const netScore = entry.gross_score - strokesOnHole
    const pName = playerNames.get(entry.trip_player_id) || 'Someone'

    await detectScoringEvents({
      trip_id: tripId,
      trip_player_id: entry.trip_player_id,
      player_name: pName,
      course_id: courseId,
      hole_number: hole.hole_number,
      hole_id: holeId,
      gross_score: entry.gross_score,
      par: hole.par,
      net_score: netScore,
      client: db,
    })

    // System chat messages for notable scoring events
    const netDiff = netScore - hole.par
    const grossDiff = entry.gross_score - hole.par

    if (netDiff <= -2) {
      postSystemMessage(db, tripId, `🦅 ${pName} made EAGLE on Hole ${hole.hole_number}! (${entry.gross_score} on par ${hole.par})`, 'eagle').catch(() => {})
    } else if (netDiff === -1) {
      postSystemMessage(db, tripId, `🐦 ${pName} birdied Hole ${hole.hole_number} (${entry.gross_score} on par ${hole.par})`, 'birdie').catch(() => {})
    } else if (grossDiff > 2) {
      // Worse than double bogey (gross score only — triple bogey or worse)
      const label = grossDiff === 3 ? 'triple bogey' : grossDiff === 4 ? 'quadruple bogey' : `+${grossDiff}`
      postSystemMessage(db, tripId, `😬 ${pName} made a ${label} on Hole ${hole.hole_number} (${entry.gross_score} on par ${hole.par})`, 'bad_score').catch(() => {})
    }
  }

  // Recompute active round games (detects new skins won on this hole)
  await recomputeRoundGames(db, courseId, tripId, hole.hole_number)

  // Auto-complete match play if all holes are done and result is decided
  if (matchId) {
    await checkAndCompleteMatch(db, matchId, tripId).catch(
      (err) => console.error('Match completion check failed:', err)
    )
  }
}

/**
 * Find all non-cancelled round games for a course and recompute via engine.
 * Posts a system chat message when a new skin is won on the submitted hole.
 */
export async function recomputeRoundGames(
  db: SupabaseClient,
  courseId: string,
  tripId?: string,
  submittedHoleNumber?: number
) {
  const { data: roundGames } = await db
    .from('round_games')
    .select(`
      *,
      game_format:game_formats(*),
      round_game_players(
        *,
        trip_player:trip_players(
          *,
          player:players(name)
        )
      )
    `)
    .eq('course_id', courseId)
    .neq('status', 'cancelled')

  if (!roundGames || roundGames.length === 0) return

  // Fetch holes once for all games
  const { data: holes } = await db
    .from('holes')
    .select('*')
    .eq('course_id', courseId)
    .order('hole_number')

  if (!holes || holes.length === 0) return
  const holeIds = holes.map((h: { id: string }) => h.id)

  for (const rg of roundGames) {
    const engineKey = rg.game_format?.engine_key
    if (!engineKey) continue

    const engine = getEngine(engineKey)
    if (!engine) continue

    const playerIds = rg.round_game_players.map(
      (rgp: { trip_player_id: string }) => rgp.trip_player_id
    )
    if (playerIds.length === 0) continue

    const isSkins = engineKey === 'skins'

    // For skins: fetch old results before computing so we can detect new wins
    const oldSkinsMap = new Map<string, number>() // trip_player_id → skins_won
    if (isSkins && tripId && submittedHoleNumber !== undefined) {
      const { data: oldResults } = await db
        .from('game_results')
        .select('trip_player_id, points')
        .eq('round_game_id', rg.id)
      for (const r of oldResults || []) {
        oldSkinsMap.set(r.trip_player_id, r.points)
      }
    }

    // Fetch scores and handicaps for this game's players
    const [scoresRes, handicapsRes] = await Promise.all([
      db.from('round_scores').select('trip_player_id, hole_id, gross_score').in('trip_player_id', playerIds).in('hole_id', holeIds),
      db.from('player_course_handicaps').select('*').in('trip_player_id', playerIds).eq('course_id', courseId),
    ])

    // Build player strokes maps
    const playerStrokes = new Map<string, Map<number, number>>()
    for (const ch of handicapsRes.data || []) {
      playerStrokes.set(ch.trip_player_id, getStrokesPerHole(ch.handicap_strokes, holes))
    }

    // Build engine input
    const mergedConfig = {
      ...rg.game_format.default_config,
      ...rg.config,
    }

    const engineInput: GameEngineInput = {
      scores: (scoresRes.data || []).map((s: { trip_player_id: string; hole_id: string; gross_score: number }) => ({
        trip_player_id: s.trip_player_id,
        hole_id: s.hole_id,
        gross_score: s.gross_score,
      })),
      players: rg.round_game_players.map(
        (rgp: { trip_player_id: string; side: string | null; metadata: Record<string, unknown> }) => ({
          trip_player_id: rgp.trip_player_id,
          side: rgp.side,
          metadata: rgp.metadata || {},
        })
      ),
      holes: holes.map((h: { id: string; hole_number: number; par: number; handicap_index: number }) => ({
        id: h.id,
        hole_number: h.hole_number,
        par: h.par,
        handicap_index: h.handicap_index,
      })),
      playerStrokes,
      config: mergedConfig,
    }

    // Run engine
    const result = engine.compute(engineInput)

    // Upsert results
    const resultRecords = result.players.map((pr) => ({
      round_game_id: rg.id,
      trip_player_id: pr.trip_player_id,
      position: pr.position,
      points: pr.points,
      money: pr.money,
      details: pr.details,
      computed_at: new Date().toISOString(),
    }))

    await db
      .from('game_results')
      .upsert(resultRecords, { onConflict: 'round_game_id,trip_player_id' })

    // Update game status to active if it was setup
    if (rg.status === 'setup') {
      await db.from('round_games').update({ status: 'active' }).eq('id', rg.id)
    }

    // --- Skins: detect newly-won skin on the submitted hole ---
    if (isSkins && tripId && submittedHoleNumber !== undefined) {
      const holeResult = (result.holes as unknown as Array<{
        hole_number: number
        winner_id: string | null
        carried: boolean
        skin_value: number
      }>).find(h => h.hole_number === submittedHoleNumber)

      if (holeResult?.winner_id && !holeResult.carried) {
        const winnerId = holeResult.winner_id
        const oldSkins = oldSkinsMap.get(winnerId) ?? 0
        const newSkins = result.players.find(p => p.trip_player_id === winnerId)?.points ?? 0

        if (newSkins > oldSkins) {
          // Find winner's name from round_game_players
          const rgp = rg.round_game_players.find(
            (p: { trip_player_id: string }) => p.trip_player_id === winnerId
          )
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const playerData = rgp?.trip_player?.player as any
          const winnerName = Array.isArray(playerData)
            ? playerData[0]?.name
            : playerData?.name || 'Someone'

          const skinCount = holeResult.skin_value
          const mode = (mergedConfig.mode === 'gross' ? 'gross' : 'net') as string
          const skinWord = skinCount === 1 ? 'skin' : 'skins'
          postSystemMessage(
            db,
            tripId,
            `💰 ${winnerName} won ${skinCount} ${skinWord} on Hole ${submittedHoleNumber} (${mode})!`,
            'skin_won'
          ).catch(() => {})
        }
      }
    }
  }
}

/**
 * Check if a match-play match is clinched and auto-complete it.
 * Posts a system chat message if the match just finished.
 */
export async function checkAndCompleteMatch(
  db: SupabaseClient,
  matchId: string,
  tripId: string
) {
  // Fetch match status and format
  const { data: match } = await db
    .from('matches')
    .select('id, status, format, course_id')
    .eq('id', matchId)
    .single()

  if (!match || match.status === 'completed') return

  // Only process match-play formats
  const matchPlayFormats = ['1v1_match', '2v2_best_ball', '2v2_alternate_shot']
  if (!matchPlayFormats.includes(match.format)) return

  // Fetch all required data in parallel
  const [playersRes, scoresRes, holesRes, handicapsRes] = await Promise.all([
    db.from('match_players').select('id, trip_player_id, side, trip_player:trip_players(player:players(name))').eq('match_id', matchId),
    db.from('scores').select('*').eq('match_id', matchId),
    db.from('holes').select('*').eq('course_id', match.course_id).order('hole_number'),
    db.from('player_course_handicaps').select('*').eq('course_id', match.course_id),
  ])

  const matchPlayers = playersRes.data || []
  const scores = scoresRes.data || []
  const holes = holesRes.data || []

  if (scores.length === 0 || holes.length === 0) return

  // Build strokes map for match play calculator (adjusted relative to low player)
  const rawMatchStrokes = matchPlayers.map(mp => {
    const ch = (handicapsRes.data || []).find(
      (c: { trip_player_id: string }) => c.trip_player_id === mp.trip_player_id
    )
    return { id: mp.trip_player_id, strokes: ch?.handicap_strokes ?? 0 }
  })
  const minMatchStrokes = rawMatchStrokes.length > 0 ? Math.min(...rawMatchStrokes.map(p => p.strokes)) : 0
  const playerStrokesMap = new Map<string, Map<number, number>>()
  for (const { id, strokes } of rawMatchStrokes) {
    playerStrokesMap.set(id, getStrokesPerHole(Math.max(0, strokes - minMatchStrokes), holes))
  }

  // Run match-play calculation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matchResult = calculateMatchPlay(scores as any, matchPlayers as any, holes, playerStrokesMap, match.format)

  if (!matchResult.isComplete) return

  // Determine winner side and result string
  const winnerSide = matchResult.leader === 'tie' ? 'tie'
    : matchResult.leader === 'team_a' ? 'team_a'
    : 'team_b'

  // Update match to completed
  await db.from('matches').update({
    status: 'completed',
    result: matchResult.status,
    winner_side: winnerSide,
  }).eq('id', matchId)

  // Build a descriptive message
  const teamA = matchPlayers.filter(mp => mp.side === 'team_a')
  const teamB = matchPlayers.filter(mp => mp.side === 'team_b')

  function playerLabel(mp: { trip_player?: unknown }) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = mp.trip_player as any
    const player = Array.isArray(p?.player) ? p.player[0] : p?.player
    return player?.name || 'Unknown'
  }

  const teamANames = teamA.map(playerLabel).join(' & ')
  const teamBNames = teamB.map(playerLabel).join(' & ')

  let message: string
  if (winnerSide === 'tie') {
    message = `🤝 Match finished tied — ${teamANames} vs ${teamBNames} (${matchResult.status})`
  } else {
    const winnerNames = winnerSide === 'team_a' ? teamANames : teamBNames
    const loserNames = winnerSide === 'team_a' ? teamBNames : teamANames
    message = `🏆 ${winnerNames} defeats ${loserNames} ${matchResult.status}!`
  }

  postSystemMessage(db, tripId, message, 'match_complete').catch(() => {})
}
