import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { calculateCourseHandicap } from '@/lib/handicap'

// Service role client to read invites without RLS user context
function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET: Look up invite by token (public — needed before auth)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const serviceClient = getServiceClient()

  const { data: invite, error } = await serviceClient
    .from('trip_invites')
    .select('id, trip_id, player_id, email, status, created_at, accepted_at')
    .eq('token', token)
    .single()

  if (error || !invite) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  }

  // Get trip info
  const { data: trip } = await serviceClient
    .from('trips')
    .select('id, name, year, location')
    .eq('id', invite.trip_id)
    .single()

  return NextResponse.json({ invite, trip })
}

// POST: Accept invite (requires auth)
// Body: { handicap_index: number, ghin_number?: string | null }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = await createClient()

  // Require auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse body
  let body: { handicap_index?: number | null; ghin_number?: string | null } = {}
  try {
    body = await request.json()
  } catch {
    // body is optional for backwards compat
  }

  const serviceClient = getServiceClient()

  // Look up invite
  const { data: invite, error: inviteError } = await serviceClient
    .from('trip_invites')
    .select('*')
    .eq('token', token)
    .single()

  if (inviteError || !invite) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  }

  if (invite.status === 'accepted') {
    return NextResponse.json({ error: 'Invite already accepted', redirect: '/admin' }, { status: 400 })
  }

  if (invite.status === 'expired') {
    return NextResponse.json({ error: 'Invite has expired' }, { status: 400 })
  }

  // Validate handicap_index if provided
  const handicapIndex = body.handicap_index ?? null
  if (handicapIndex !== null && (handicapIndex < 0 || handicapIndex > 54)) {
    return NextResponse.json({ error: 'Handicap index must be between 0 and 54' }, { status: 400 })
  }

  // 1. Link the player record to this authenticated user and set handicap
  const playerUpdates: Record<string, unknown> = { user_id: user.id }
  if (handicapIndex !== null) {
    playerUpdates.handicap_index = handicapIndex
  }

  const { error: playerError } = await serviceClient
    .from('players')
    .update(playerUpdates)
    .eq('id', invite.player_id)

  if (playerError) {
    return NextResponse.json({ error: playerError.message }, { status: 500 })
  }

  // 2. Save GHIN number to player_profile if provided
  if (body.ghin_number) {
    await serviceClient
      .from('player_profiles')
      .update({ ghin_number: body.ghin_number, handicap_index: handicapIndex })
      .eq('user_id', user.id)
  }

  // 3. Create trip_members record (role: player)
  const { error: memberError } = await serviceClient
    .from('trip_members')
    .upsert(
      { trip_id: invite.trip_id, user_id: user.id, role: 'player' },
      { onConflict: 'trip_id,user_id' }
    )

  if (memberError) {
    return NextResponse.json({ error: `Failed to add as trip member: ${memberError.message}` }, { status: 500 })
  }

  // 4. Recalculate course handicaps for all courses in this trip
  if (handicapIndex !== null) {
    const { data: tripPlayer } = await serviceClient
      .from('trip_players')
      .select('id')
      .eq('trip_id', invite.trip_id)
      .eq('player_id', invite.player_id)
      .single()

    if (tripPlayer) {
      const { data: courses } = await serviceClient
        .from('courses')
        .select('id, slope, rating, par')
        .eq('trip_id', invite.trip_id)

      if (courses && courses.length > 0) {
        const validCourses = courses.filter(
          (c: { slope: number | null; rating: number | null }) => c.slope != null && c.rating != null
        )

        if (validCourses.length > 0) {
          const records = validCourses.map((c: { id: string; slope: number; rating: number; par: number }) => ({
            trip_player_id: tripPlayer.id,
            course_id: c.id,
            handicap_strokes: calculateCourseHandicap(handicapIndex, c.slope, c.rating, c.par),
          }))

          await serviceClient
            .from('player_course_handicaps')
            .upsert(records, { onConflict: 'trip_player_id,course_id' })
        }
      }
    }
  }

  // 5. Update invite status to accepted
  await serviceClient
    .from('trip_invites')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', invite.id)

  return NextResponse.json({ success: true, redirect: '/admin/profile' })
}
