import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireTripRole } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { searchParams } = new URL(request.url)
  const courseIdsParam = searchParams.get('course_ids')

  if (!courseIdsParam) {
    return NextResponse.json(
      { error: 'course_ids query parameter is required' },
      { status: 400 }
    )
  }

  const courseIds = courseIdsParam.split(',').filter(Boolean)

  if (courseIds.length === 0) {
    return NextResponse.json([])
  }

  // Fetch all matches for the given course IDs
  const { data: matches, error } = await supabase
    .from('matches')
    .select('*')
    .in('course_id', courseIds)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!matches || matches.length === 0) {
    return NextResponse.json([])
  }

  // Fetch match_players for all matches
  const matchIds = matches.map((m: { id: string }) => m.id)

  const { data: matchPlayers, error: mpError } = await supabase
    .from('match_players')
    .select(
      'id, match_id, trip_player_id, side, trip_player:trip_players(id, player:players(id, name, handicap_index))'
    )
    .in('match_id', matchIds)

  if (mpError) {
    return NextResponse.json({ error: mpError.message }, { status: 500 })
  }

  // Attach match_players to each match
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = matches.map((match: any) => ({
    ...match,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    match_players: (matchPlayers || []).filter((mp: any) => mp.match_id === match.id),
  }))

  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const body = await request.json()

  // Validate required fields
  if (!body.course_id) {
    return NextResponse.json(
      { error: 'course_id is required' },
      { status: 400 }
    )
  }

  if (!body.format) {
    return NextResponse.json(
      { error: 'format is required' },
      { status: 400 }
    )
  }

  if (!body.team_a_player_ids || body.team_a_player_ids.length === 0) {
    return NextResponse.json(
      { error: 'At least one player on Team A is required' },
      { status: 400 }
    )
  }

  if (!body.team_b_player_ids || body.team_b_player_ids.length === 0) {
    return NextResponse.json(
      { error: 'At least one player on Team B is required' },
      { status: 400 }
    )
  }

  // Look up trip_id from course to check role
  const { data: course } = await supabase
    .from('courses')
    .select('trip_id')
    .eq('id', body.course_id)
    .single()

  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  const access = await requireTripRole(course.trip_id, ['owner', 'admin'])
  if (!access) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Create the match
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .insert({
      course_id: body.course_id,
      format: body.format,
      point_value: body.point_value ?? 1,
      scorer_email: body.scorer_email || null,
    })
    .select()
    .single()

  if (matchError) {
    return NextResponse.json({ error: matchError.message }, { status: 500 })
  }

  // Insert match_players for team_a
  const teamARecords = (body.team_a_player_ids as string[]).map(
    (tripPlayerId: string) => ({
      match_id: match.id,
      trip_player_id: tripPlayerId,
      side: 'team_a' as const,
    })
  )

  // Insert match_players for team_b
  const teamBRecords = (body.team_b_player_ids as string[]).map(
    (tripPlayerId: string) => ({
      match_id: match.id,
      trip_player_id: tripPlayerId,
      side: 'team_b' as const,
    })
  )

  const { error: playersError } = await supabase
    .from('match_players')
    .insert([...teamARecords, ...teamBRecords])

  if (playersError) {
    // Clean up the match if players insertion fails
    await supabase.from('matches').delete().eq('id', match.id)
    return NextResponse.json({ error: playersError.message }, { status: 500 })
  }

  // Fetch the complete match with players
  const { data: matchPlayers } = await supabase
    .from('match_players')
    .select(
      'id, match_id, trip_player_id, side, trip_player:trip_players(id, player:players(id, name, handicap_index))'
    )
    .eq('match_id', match.id)

  return NextResponse.json(
    { ...match, match_players: matchPlayers || [] },
    { status: 201 }
  )
}
