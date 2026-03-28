import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { processScoreEvents } from '@/lib/score-processing'

// Service role client bypasses RLS — scorer is not a Supabase user
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
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  // 1. Validate the scorer token
  const { data: match, error: matchError } = await getServiceClient()
    .from('matches')
    .select('id, status, course_id')
    .eq('scorer_token', token)
    .single()

  if (matchError || !match) {
    return NextResponse.json(
      { error: 'Invalid scorer token' },
      { status: 404 }
    )
  }

  // 2. Parse request body
  const body = await request.json()
  const { hole_id, scores } = body as {
    hole_id: string
    scores: ScoreEntry[]
  }

  if (!hole_id) {
    return NextResponse.json(
      { error: 'hole_id is required' },
      { status: 400 }
    )
  }

  if (!scores || !Array.isArray(scores) || scores.length === 0) {
    return NextResponse.json(
      { error: 'scores array is required' },
      { status: 400 }
    )
  }

  // Validate each score entry
  for (const entry of scores) {
    if (!entry.trip_player_id || typeof entry.gross_score !== 'number') {
      return NextResponse.json(
        { error: 'Each score must have trip_player_id and gross_score' },
        { status: 400 }
      )
    }
    if (entry.gross_score < 1 || entry.gross_score > 20) {
      return NextResponse.json(
        { error: 'gross_score must be between 1 and 20' },
        { status: 400 }
      )
    }
  }

  // 3. Upsert scores for each player on this hole
  const upsertData = scores.map((entry: ScoreEntry) => ({
    match_id: match.id,
    trip_player_id: entry.trip_player_id,
    hole_id,
    gross_score: entry.gross_score,
    fairway_hit: entry.fairway_hit ?? null,
    gir: entry.gir ?? null,
    putts: entry.putts ?? null,
    updated_at: new Date().toISOString(),
  }))

  const { error: upsertError } = await getServiceClient()
    .from('scores')
    .upsert(upsertData, {
      onConflict: 'match_id,trip_player_id,hole_id',
    })

  // 3b. Dual-write to round_scores so game engines and trip stats see scorer-entered scores
  await getServiceClient()
    .from('round_scores')
    .upsert(scores.map((entry: ScoreEntry) => ({
      course_id: match.course_id,
      trip_player_id: entry.trip_player_id,
      hole_id,
      gross_score: entry.gross_score,
      updated_at: new Date().toISOString(),
      ...(entry.fairway_hit != null ? { fairway_hit: entry.fairway_hit } : {}),
      ...(entry.gir != null ? { gir: entry.gir } : {}),
      ...(entry.putts != null ? { putts: entry.putts } : {}),
    })), { onConflict: 'course_id,trip_player_id,hole_id' })

  if (upsertError) {
    return NextResponse.json(
      { error: upsertError.message },
      { status: 500 }
    )
  }

  // 4. If match is pending, update to in_progress
  if (match.status === 'pending') {
    await getServiceClient()
      .from('matches')
      .update({ status: 'in_progress' })
      .eq('id', match.id)
  }

  // 5. Return updated scores for this match
  const { data: updatedScores, error: fetchError } = await getServiceClient()
    .from('scores')
    .select('*')
    .eq('match_id', match.id)

  if (fetchError) {
    return NextResponse.json(
      { error: 'Scores saved but failed to fetch updated scores' },
      { status: 500 }
    )
  }

  // 6. Fire-and-forget: activity feed events + game engine recomputation + match completion
  const db = getServiceClient()
  processScoreEvents(db, match.course_id, hole_id, scores, match.id).catch(
    (err) => console.error('Score event processing error:', err)
  )

  return NextResponse.json({
    scores: updatedScores || [],
    matchStatus: match.status === 'pending' ? 'in_progress' : match.status,
  })
}
