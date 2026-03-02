import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateCourseHandicap } from '@/lib/handicap'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params
  const supabase = await createClient()

  // Get all trip players with their player details
  const { data: tripPlayers, error } = await supabase
    .from('trip_players')
    .select('*, player:players(*)')
    .eq('trip_id', tripId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Get course handicaps for each trip player
  const tripPlayerIds = tripPlayers.map((tp: { id: string }) => tp.id)

  let courseHandicaps: { trip_player_id: string; course_id: string; handicap_strokes: number }[] = []
  if (tripPlayerIds.length > 0) {
    const { data: handicaps, error: hError } = await supabase
      .from('player_course_handicaps')
      .select('trip_player_id, course_id, handicap_strokes')
      .in('trip_player_id', tripPlayerIds)

    if (hError) {
      return NextResponse.json({ error: hError.message }, { status: 500 })
    }

    courseHandicaps = handicaps || []
  }

  // Attach course handicaps to each trip player
  const result = tripPlayers.map((tp: { id: string }) => ({
    ...tp,
    course_handicaps: courseHandicaps.filter((ch) => ch.trip_player_id === tp.id),
  }))

  return NextResponse.json(result)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params
  const supabase = await createClient()

  const body = await request.json()

  let playerId = body.player_id

  // If no existing player_id, create a new player
  if (!playerId) {
    if (!body.name) {
      return NextResponse.json(
        { error: 'Player name is required' },
        { status: 400 }
      )
    }

    const { data: newPlayer, error: playerError } = await supabase
      .from('players')
      .insert({
        name: body.name,
        email: body.email || null,
        phone: body.phone || null,
        handicap_index: body.handicap_index ?? null,
      })
      .select()
      .single()

    if (playerError) {
      return NextResponse.json({ error: playerError.message }, { status: 500 })
    }

    playerId = newPlayer.id
  }

  // Create trip_player record
  const { data: tripPlayer, error: tpError } = await supabase
    .from('trip_players')
    .insert({
      trip_id: tripId,
      player_id: playerId,
    })
    .select('*, player:players(*)')
    .single()

  if (tpError) {
    return NextResponse.json({ error: tpError.message }, { status: 500 })
  }

  // Get the player's handicap index
  const handicapIndex = tripPlayer.player?.handicap_index

  // Auto-calculate course handicaps if the player has a handicap index
  if (handicapIndex != null) {
    // Get all courses for this trip
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('id, slope, rating, par')
      .eq('trip_id', tripId)

    if (coursesError) {
      return NextResponse.json({ error: coursesError.message }, { status: 500 })
    }

    // Calculate and insert course handicaps
    const courseHandicapRecords = courses
      .filter((c: { slope: number | null; rating: number | null }) => c.slope != null && c.rating != null)
      .map((c: { id: string; slope: number; rating: number; par: number }) => ({
        trip_player_id: tripPlayer.id,
        course_id: c.id,
        handicap_strokes: calculateCourseHandicap(handicapIndex, c.slope, c.rating, c.par),
      }))

    if (courseHandicapRecords.length > 0) {
      const { error: insertError } = await supabase
        .from('player_course_handicaps')
        .insert(courseHandicapRecords)

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
    }

    // Fetch the inserted course handicaps to return
    const { data: handicaps } = await supabase
      .from('player_course_handicaps')
      .select('trip_player_id, course_id, handicap_strokes')
      .eq('trip_player_id', tripPlayer.id)

    return NextResponse.json(
      { ...tripPlayer, course_handicaps: handicaps || [] },
      { status: 201 }
    )
  }

  return NextResponse.json(
    { ...tripPlayer, course_handicaps: [] },
    { status: 201 }
  )
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  await params
  const supabase = await createClient()

  const body = await request.json()

  if (!body.trip_player_id) {
    return NextResponse.json(
      { error: 'trip_player_id is required' },
      { status: 400 }
    )
  }

  const updates: Record<string, unknown> = {}
  if (body.paid !== undefined) updates.paid = body.paid

  const { data: tripPlayer, error } = await supabase
    .from('trip_players')
    .update(updates)
    .eq('id', body.trip_player_id)
    .select('*, player:players(*)')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(tripPlayer)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  await params
  const supabase = await createClient()

  const { searchParams } = new URL(request.url)
  const tripPlayerId = searchParams.get('trip_player_id')

  if (!tripPlayerId) {
    return NextResponse.json(
      { error: 'trip_player_id query parameter is required' },
      { status: 400 }
    )
  }

  // Delete course handicaps first (FK constraint)
  await supabase
    .from('player_course_handicaps')
    .delete()
    .eq('trip_player_id', tripPlayerId)

  // Delete team_player records
  await supabase
    .from('team_players')
    .delete()
    .eq('trip_player_id', tripPlayerId)

  // Delete trip_player
  const { error } = await supabase
    .from('trip_players')
    .delete()
    .eq('id', tripPlayerId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
