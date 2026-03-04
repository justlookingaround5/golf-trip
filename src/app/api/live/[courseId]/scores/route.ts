import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { processScoreEvents } from '@/lib/score-processing'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface ScoreEntry {
  trip_player_id: string
  gross_score: number
  fairway_hit?: boolean | null
  gir?: boolean | null
  putts?: number | null
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params

  // Auth check
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { hole_id, scores } = body as {
    hole_id: string
    scores: ScoreEntry[]
  }

  if (!hole_id) {
    return NextResponse.json({ error: 'hole_id is required' }, { status: 400 })
  }
  if (!scores || !Array.isArray(scores) || scores.length === 0) {
    return NextResponse.json({ error: 'scores array is required' }, { status: 400 })
  }

  for (const entry of scores) {
    if (!entry.trip_player_id || typeof entry.gross_score !== 'number') {
      return NextResponse.json({ error: 'Each score must have trip_player_id and gross_score' }, { status: 400 })
    }
    if (entry.gross_score < 1 || entry.gross_score > 20) {
      return NextResponse.json({ error: 'gross_score must be between 1 and 20' }, { status: 400 })
    }
  }

  const db = getServiceClient()

  // 1. Upsert into round_scores (including optional stats)
  const roundScoreData = scores.map((entry) => ({
    course_id: courseId,
    trip_player_id: entry.trip_player_id,
    hole_id,
    gross_score: entry.gross_score,
    entered_by: user.id,
    updated_at: new Date().toISOString(),
    ...(entry.fairway_hit !== undefined && entry.fairway_hit !== null ? { fairway_hit: entry.fairway_hit } : {}),
    ...(entry.gir !== undefined && entry.gir !== null ? { gir: entry.gir } : {}),
    ...(entry.putts !== undefined && entry.putts !== null ? { putts: entry.putts } : {}),
  }))

  const { error: roundScoreError } = await db
    .from('round_scores')
    .upsert(roundScoreData, { onConflict: 'course_id,trip_player_id,hole_id' })

  if (roundScoreError) {
    return NextResponse.json({ error: roundScoreError.message }, { status: 500 })
  }

  // 2. Sync to scores table via synthetic round match
  const syntheticToken = `live_round_${courseId}`
  let { data: match } = await db
    .from('matches')
    .select('id, status')
    .eq('scorer_token', syntheticToken)
    .single()

  if (!match) {
    // Get course info for match creation
    const { data: course } = await db
      .from('courses')
      .select('id, trip_id')
      .eq('id', courseId)
      .single()

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Create synthetic match
    const { data: newMatch, error: matchError } = await db
      .from('matches')
      .insert({
        course_id: courseId,
        format: '1v1_stroke',
        point_value: 0,
        scorer_token: syntheticToken,
        status: 'in_progress',
      })
      .select('id, status')
      .single()

    if (matchError || !newMatch) {
      return NextResponse.json({ error: 'Failed to create round match' }, { status: 500 })
    }
    match = newMatch

    // Add all trip players to match
    const { data: tripPlayers } = await db
      .from('trip_players')
      .select('id')
      .eq('trip_id', course.trip_id)

    if (tripPlayers && tripPlayers.length > 0) {
      const matchPlayers = tripPlayers.map((tp, i) => ({
        match_id: newMatch.id,
        trip_player_id: tp.id,
        side: i % 2 === 0 ? 'team_a' : 'team_b',
      }))

      await db.from('match_players').insert(matchPlayers)
    }
  }

  // Upsert into scores table
  const scoreData = scores.map((entry) => ({
    match_id: match.id,
    trip_player_id: entry.trip_player_id,
    hole_id,
    gross_score: entry.gross_score,
    updated_at: new Date().toISOString(),
  }))

  const { error: scoreError } = await db
    .from('scores')
    .upsert(scoreData, { onConflict: 'match_id,trip_player_id,hole_id' })

  if (scoreError) {
    console.error('Failed to sync to scores table:', scoreError.message)
  }

  // 3. Return updated round_scores
  const { data: updatedScores } = await db
    .from('round_scores')
    .select('*')
    .eq('course_id', courseId)

  // 4. Fire-and-forget: process events + recompute games
  processScoreEvents(db, courseId, hole_id, scores).catch(
    (err) => console.error('Live score event processing error:', err)
  )

  return NextResponse.json({
    roundScores: updatedScores || [],
  })
}
