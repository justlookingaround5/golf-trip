import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { calculateCourseHandicap } from '@/lib/handicap'
import { requireTripRole } from '@/lib/auth'
import { sendTripInviteEmail, sendTripAddedEmail } from '@/lib/email'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

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

  const access = await requireTripRole(tripId, ['owner', 'admin'])
  if (!access) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createClient()
  const body = await request.json()

  // Get trip info (needed for emails)
  const { data: trip } = await supabase
    .from('trips')
    .select('id, name, year, location')
    .eq('id', tripId)
    .single()

  // --- Mode 1: Add existing user by profile_user_id ---
  if (body.profile_user_id) {
    const serviceClient = getServiceClient()

    // Get the profile data
    const { data: profile, error: profileError } = await supabase
      .from('player_profiles')
      .select('user_id, display_name, handicap_index')
      .eq('user_id', body.profile_user_id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Find or create a players record for this user
    let playerId: string

    const { data: existingPlayer } = await supabase
      .from('players')
      .select('id')
      .eq('user_id', body.profile_user_id)
      .limit(1)
      .single()

    if (existingPlayer) {
      playerId = existingPlayer.id
    } else {
      const { data: newPlayer, error: createError } = await supabase
        .from('players')
        .insert({
          name: profile.display_name || 'Unknown',
          handicap_index: profile.handicap_index,
          user_id: body.profile_user_id,
        })
        .select()
        .single()

      if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 500 })
      }
      playerId = newPlayer.id
    }

    // Create trip_player + trip_member
    const tripPlayer = await createTripPlayerWithHandicaps(supabase, tripId, playerId)
    if ('error' in tripPlayer) {
      return NextResponse.json({ error: tripPlayer.error }, { status: 500 })
    }

    await serviceClient
      .from('trip_members')
      .upsert(
        { trip_id: tripId, user_id: body.profile_user_id, role: 'player' },
        { onConflict: 'trip_id,user_id' }
      )

    // Send "added" email (best effort — don't fail if email fails)
    if (body.email && trip) {
      try {
        await sendTripAddedEmail({
          to: body.email,
          playerName: profile.display_name || 'there',
          trip: { name: trip.name, year: trip.year, location: trip.location },
        })
      } catch {
        // Email failure is non-fatal
      }
    }

    return NextResponse.json(tripPlayer, { status: 201 })
  }

  // --- Mode 2: Invite new player by name + email ---
  if (body.name && body.email) {
    const { data: newPlayer, error: playerError } = await supabase
      .from('players')
      .insert({
        name: body.name.trim(),
        email: body.email.trim(),
      })
      .select()
      .single()

    if (playerError) {
      return NextResponse.json({ error: playerError.message }, { status: 500 })
    }

    // Create trip_player
    const tripPlayer = await createTripPlayerWithHandicaps(supabase, tripId, newPlayer.id)
    if ('error' in tripPlayer) {
      return NextResponse.json({ error: tripPlayer.error }, { status: 500 })
    }

    // Create invite record
    const { data: invite, error: inviteError } = await supabase
      .from('trip_invites')
      .insert({
        trip_id: tripId,
        player_id: newPlayer.id,
        email: body.email.trim(),
        invited_by: access.userId,
      })
      .select()
      .single()

    if (inviteError) {
      return NextResponse.json({ error: inviteError.message }, { status: 500 })
    }

    // Send invite email (best effort)
    if (trip) {
      try {
        await sendTripInviteEmail({
          to: body.email.trim(),
          playerName: body.name.trim(),
          trip: { name: trip.name, year: trip.year, location: trip.location },
          token: invite.token,
        })
      } catch {
        // Email failure is non-fatal
      }
    }

    return NextResponse.json({ ...tripPlayer, invite }, { status: 201 })
  }

  // --- Mode 3: Manual add (existing behavior — name only or with player_id) ---
  let playerId = body.player_id

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

  const tripPlayer = await createTripPlayerWithHandicaps(supabase, tripId, playerId)
  if ('error' in tripPlayer) {
    return NextResponse.json({ error: tripPlayer.error }, { status: 500 })
  }

  return NextResponse.json(tripPlayer, { status: 201 })
}

// Helper: create trip_player record and auto-calculate course handicaps
async function createTripPlayerWithHandicaps(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tripId: string,
  playerId: string
) {
  const { data: tripPlayer, error: tpError } = await supabase
    .from('trip_players')
    .insert({ trip_id: tripId, player_id: playerId })
    .select('*, player:players(*)')
    .single()

  if (tpError) {
    return { error: tpError.message }
  }

  const handicapIndex = tripPlayer.player?.handicap_index

  if (handicapIndex != null) {
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('id, slope, rating, par')
      .eq('trip_id', tripId)

    if (coursesError) {
      return { error: coursesError.message }
    }

    const courseHandicapRecords = courses
      .filter((c: { slope: number | null; rating: number | null }) => c.slope != null && c.rating != null)
      .map((c: { id: string; slope: number; rating: number; par: number }) => ({
        trip_player_id: tripPlayer.id,
        course_id: c.id,
        handicap_strokes: calculateCourseHandicap(handicapIndex, c.slope, c.rating, c.par),
      }))

    if (courseHandicapRecords.length > 0) {
      await supabase
        .from('player_course_handicaps')
        .insert(courseHandicapRecords)
    }

    const { data: handicaps } = await supabase
      .from('player_course_handicaps')
      .select('trip_player_id, course_id, handicap_strokes')
      .eq('trip_player_id', tripPlayer.id)

    return { ...tripPlayer, course_handicaps: handicaps || [] }
  }

  return { ...tripPlayer, course_handicaps: [] }
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
  const { tripId } = await params

  const access = await requireTripRole(tripId, ['owner', 'admin'])
  if (!access) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

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
