import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCourseDetail, searchCourses } from '@/lib/golf-course-api'

interface PlayerInput {
  name: string
  handicap?: number | null
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { courseName, courseApiId, latitude, longitude, players, games } = body as {
    courseName: string
    courseApiId?: number | null
    latitude?: number | null
    longitude?: number | null
    players: PlayerInput[]
    games?: { formatId: string; buyIn: number }[]
  }

  if (!courseName) {
    return NextResponse.json({ error: 'Course name is required' }, { status: 400 })
  }
  if (!players || players.length === 0 || players.length > 4) {
    return NextResponse.json({ error: '1-4 players required' }, { status: 400 })
  }

  // 1. Try to get real hole data from the golf course API
  let holeData: { hole_number: number; par: number; handicap_index: number; yardage?: Record<string, number> }[] = []
  let coursePar = 72
  let slope: number | null = null
  let rating: number | null = null
  let apiId: number | null = courseApiId ?? null

  if (apiId) {
    const detail = await getCourseDetail(apiId)
    if (detail?.tees?.male?.[0]) {
      const tee = detail.tees.male[0]
      coursePar = tee.par_total || 72
      slope = tee.slope_rating || null
      rating = tee.course_rating || null
      if (tee.holes && tee.holes.length > 0) {
        holeData = tee.holes.map((h, i) => ({
          hole_number: i + 1,
          par: h.par,
          handicap_index: h.handicap || (i + 1),
          yardage: Object.fromEntries(
            (detail.tees.male || []).map(t => [t.tee_name, t.holes[i]?.yardage || 0])
          ),
        }))
      }
    }
  }

  // Fallback: generic 18-hole par-72 course
  if (holeData.length === 0) {
    const defaultPars = [4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5]
    holeData = defaultPars.map((par, i) => ({
      hole_number: i + 1,
      par,
      handicap_index: i + 1,
    }))
    coursePar = 72
  }

  // 2. Create the trip
  const currentYear = new Date().getFullYear()
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .insert({
      name: `Quick Round - ${courseName}`,
      year: currentYear,
      status: 'active',
      is_quick_round: true,
      created_by: user.id,
      match_buy_in: 0,
      skins_buy_in: 0,
    })
    .select()
    .single()

  if (tripError) {
    return NextResponse.json({ error: tripError.message }, { status: 500 })
  }

  // 3. Create trip_members entry for the logged-in user
  await supabase.from('trip_members').upsert(
    { trip_id: trip.id, user_id: user.id, role: 'owner' },
    { onConflict: 'trip_id,user_id' }
  )

  // 4. Create course with holes
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .insert({
      trip_id: trip.id,
      name: courseName,
      slope,
      rating,
      par: coursePar,
      round_number: 1,
      round_date: new Date().toISOString().split('T')[0],
      golf_course_api_id: apiId,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
    })
    .select()
    .single()

  if (courseError) {
    return NextResponse.json({ error: courseError.message }, { status: 500 })
  }

  // 5. Create holes
  const holesInsert = holeData.map(h => ({
    course_id: course.id,
    hole_number: h.hole_number,
    par: h.par,
    handicap_index: h.handicap_index,
    yardage: h.yardage || {},
  }))

  const { error: holesError } = await supabase.from('holes').insert(holesInsert)
  if (holesError) {
    return NextResponse.json({ error: holesError.message }, { status: 500 })
  }

  // 6. Create players and trip_players
  // Get user's player profile to match first player
  const { data: userProfile } = await supabase
    .from('player_profiles')
    .select('display_name')
    .eq('user_id', user.id)
    .single()

  for (let i = 0; i < players.length; i++) {
    const playerInput = players[i]
    // First player is always the logged-in user
    const isCurrentUser = i === 0

    let playerId: string | null = null

    if (isCurrentUser) {
      // Find existing player record for this user
      const { data: existingPlayer } = await supabase
        .from('players')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (existingPlayer) {
        playerId = existingPlayer.id
      }
    }

    if (!playerId && !isCurrentUser) {
      // Try to find by exact name match (case-insensitive) for non-owner players
      const { data: existingByName } = await supabase
        .from('players')
        .select('id')
        .ilike('name', playerInput.name)
        .limit(1)
        .single()

      if (existingByName) {
        playerId = existingByName.id
      }
    }

    if (!playerId) {
      // Create a new player
      const insertData: Record<string, unknown> = {
        name: playerInput.name,
        handicap_index: playerInput.handicap ?? null,
      }
      if (isCurrentUser) {
        insertData.user_id = user.id
      }

      const { data: newPlayer, error: playerError } = await supabase
        .from('players')
        .insert(insertData)
        .select()
        .single()

      if (playerError) {
        return NextResponse.json({ error: playerError.message }, { status: 500 })
      }
      playerId = newPlayer.id
    }

    // Create trip_player
    const { data: tripPlayer, error: tpError } = await supabase
      .from('trip_players')
      .upsert(
        { trip_id: trip.id, player_id: playerId },
        { onConflict: 'trip_id,player_id' }
      )
      .select()
      .single()

    if (tpError) {
      return NextResponse.json({ error: tpError.message }, { status: 500 })
    }

    // Set course handicap if provided
    if (playerInput.handicap != null) {
      await supabase.from('player_course_handicaps').upsert(
        {
          trip_player_id: tripPlayer.id,
          course_id: course.id,
          handicap_strokes: playerInput.handicap,
        },
        { onConflict: 'trip_player_id,course_id' }
      )
    }
  }

  // 7. Create selected games with buy-ins
  if (games && games.length > 0) {
    const roundGames = games.map(g => ({
      trip_id: trip.id,
      course_id: course.id,
      game_format_id: g.formatId,
      buy_in: g.buyIn || 0,
      status: 'active',
      created_by: user.id,
    }))
    await supabase.from('round_games').insert(roundGames)
  }

  return NextResponse.json({ tripId: trip.id, courseId: course.id }, { status: 201 })
}
