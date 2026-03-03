import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateCourseHandicap } from '@/lib/handicap'

/**
 * GET /api/trips/[tripId]/rounds/[courseId]/tees
 *
 * Returns tee selections for all players on a specific course.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tripId: string; courseId: string }> }
) {
  const { tripId, courseId } = await params
  const supabase = await createClient()

  // Fetch trip players
  const { data: tripPlayers } = await supabase
    .from('trip_players')
    .select('id, player:players(id, name, handicap_index)')
    .eq('trip_id', tripId)

  const tripPlayerIds = (tripPlayers || []).map(tp => tp.id)

  if (tripPlayerIds.length === 0) {
    return NextResponse.json({ tees: [] })
  }

  // Fetch existing tee selections
  const { data: tees, error } = await supabase
    .from('player_round_tees')
    .select('*')
    .eq('course_id', courseId)
    .in('trip_player_id', tripPlayerIds)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    tees: tees || [],
    players: tripPlayers,
  })
}

/**
 * PUT /api/trips/[tripId]/rounds/[courseId]/tees
 *
 * Set or update tee selection for a player on a course.
 * Body: {
 *   trip_player_id: string,
 *   tee_name: string,
 *   tee_slope?: number,
 *   tee_rating?: number,
 *   tee_par?: number,
 *   handicap_index?: number  // player's GHIN index to compute course_handicap
 * }
 *
 * Auto-calculates course_handicap if slope, rating, par, and handicap_index provided.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; courseId: string }> }
) {
  const { tripId, courseId } = await params
  const supabase = await createClient()

  // Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await request.json()

  const {
    trip_player_id,
    tee_name,
    tee_slope,
    tee_rating,
    tee_par,
    handicap_index,
  } = body

  if (!trip_player_id || !tee_name) {
    return NextResponse.json(
      { error: 'trip_player_id and tee_name are required' },
      { status: 400 }
    )
  }

  // Validate trip_player belongs to this trip
  const { data: tripPlayer } = await supabase
    .from('trip_players')
    .select('id')
    .eq('id', trip_player_id)
    .eq('trip_id', tripId)
    .maybeSingle()

  if (!tripPlayer) {
    return NextResponse.json({ error: 'Invalid trip_player_id for this trip' }, { status: 400 })
  }

  // Auto-calculate course handicap if all needed values present
  let courseHandicap: number | null = null
  if (
    handicap_index != null &&
    tee_slope != null &&
    tee_rating != null &&
    tee_par != null
  ) {
    courseHandicap = calculateCourseHandicap(
      handicap_index,
      tee_slope,
      tee_rating,
      tee_par
    )
  }

  const record = {
    trip_player_id,
    course_id: courseId,
    tee_name,
    tee_slope: tee_slope ?? null,
    tee_rating: tee_rating ?? null,
    tee_par: tee_par ?? null,
    course_handicap: courseHandicap,
  }

  const { data, error } = await supabase
    .from('player_round_tees')
    .upsert(record, { onConflict: 'trip_player_id,course_id' })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ tee: data })
}
