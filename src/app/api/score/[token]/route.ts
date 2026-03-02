import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service role client bypasses RLS — scorer is not a Supabase user
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  // 1. Look up the match by scorer_token
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('*')
    .eq('scorer_token', token)
    .single()

  if (matchError || !match) {
    return NextResponse.json(
      { error: 'Invalid scorer token' },
      { status: 404 }
    )
  }

  // 2. Get the course + holes
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('*')
    .eq('id', match.course_id)
    .single()

  if (courseError || !course) {
    return NextResponse.json(
      { error: 'Course not found' },
      { status: 404 }
    )
  }

  const { data: holes, error: holesError } = await supabase
    .from('holes')
    .select('*')
    .eq('course_id', course.id)
    .order('hole_number', { ascending: true })

  if (holesError) {
    return NextResponse.json(
      { error: 'Failed to load holes' },
      { status: 500 }
    )
  }

  // 3. Get match players with trip_player -> player details
  const { data: matchPlayers, error: mpError } = await supabase
    .from('match_players')
    .select(
      'id, match_id, trip_player_id, side, trip_player:trip_players(id, player_id, player:players(id, name, handicap_index))'
    )
    .eq('match_id', match.id)

  if (mpError) {
    return NextResponse.json(
      { error: 'Failed to load match players' },
      { status: 500 }
    )
  }

  // 4. Get existing scores for this match
  const { data: scores, error: scoresError } = await supabase
    .from('scores')
    .select('*')
    .eq('match_id', match.id)

  if (scoresError) {
    return NextResponse.json(
      { error: 'Failed to load scores' },
      { status: 500 }
    )
  }

  // 5. Get player course handicaps for each player in this match
  const tripPlayerIds = (matchPlayers || []).map(
    (mp: { trip_player_id: string }) => mp.trip_player_id
  )

  const { data: courseHandicaps, error: chError } = await supabase
    .from('player_course_handicaps')
    .select('*')
    .eq('course_id', course.id)
    .in('trip_player_id', tripPlayerIds)

  if (chError) {
    return NextResponse.json(
      { error: 'Failed to load handicaps' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    match,
    course,
    holes: holes || [],
    matchPlayers: matchPlayers || [],
    scores: scores || [],
    courseHandicaps: courseHandicaps || [],
  })
}
