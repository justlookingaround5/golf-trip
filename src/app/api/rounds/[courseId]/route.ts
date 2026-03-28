import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { recomputeTripStatsAndAwards } from '@/lib/recompute-trip-stats'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * POST /api/rounds/[courseId] — End round early (finalize with current scores)
 * DELETE /api/rounds/[courseId] — Delete round entirely (and trip if quick round)
 */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify user is in this trip
  const { data: course } = await supabase
    .from('courses')
    .select('id, trip_id, trips!inner(id, is_quick_round, created_by)')
    .eq('id', courseId)
    .single()

  if (!course) {
    return NextResponse.json({ error: 'Round not found' }, { status: 404 })
  }

  const trip = Array.isArray(course.trips) ? course.trips[0] : course.trips
  const { data: membership } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', course.trip_id)
    .eq('user_id', user.id)
    .single()

  if (!membership && trip.created_by !== user.id) {
    return NextResponse.json({ error: 'Not authorized for this round' }, { status: 403 })
  }

  // Finalize any active round games
  await supabase
    .from('round_games')
    .update({ status: 'finalized' })
    .eq('course_id', courseId)
    .eq('status', 'active')

  // Update trip status to completed if it's a quick round
  if (trip.is_quick_round) {
    await supabase
      .from('trips')
      .update({ status: 'completed' })
      .eq('id', course.trip_id)
  }

  return NextResponse.json({ success: true, action: 'ended' })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify user owns this round
  const { data: course } = await supabase
    .from('courses')
    .select('id, trip_id, trips!inner(id, is_quick_round, created_by)')
    .eq('id', courseId)
    .single()

  if (!course) {
    return NextResponse.json({ error: 'Round not found' }, { status: 404 })
  }

  const trip = Array.isArray(course.trips) ? course.trips[0] : course.trips

  // Only the creator can delete
  if (trip.created_by !== user.id) {
    return NextResponse.json({ error: 'Only the round creator can delete it' }, { status: 403 })
  }

  const tripId = course.trip_id
  const isQuickRound = trip.is_quick_round
  const db = getServiceClient()

  // 1. Delete activity_feed rows for this course (before cascade sets course_id to NULL)
  await db.from('activity_feed').delete().eq('course_id', courseId)

  // 2. Delete settlement_ledger entries linked to this course's game results
  const { data: roundGames } = await db
    .from('round_games')
    .select('id')
    .eq('course_id', courseId)

  if (roundGames && roundGames.length > 0) {
    const gameIds = roundGames.map(rg => rg.id)
    // game_results reference round_games; settlement_ledger references game_results via source_id
    const { data: gameResults } = await db
      .from('game_results')
      .select('id')
      .in('round_game_id', gameIds)

    if (gameResults && gameResults.length > 0) {
      const resultIds = gameResults.map(gr => gr.id)
      await db
        .from('settlement_ledger')
        .delete()
        .in('source_id', resultIds)
        .eq('source_type', 'game_result')
    }
  }

  // 3. Delete the course (cascade deletes holes, round_scores, round_games, etc.)
  const { error: deleteError } = await supabase
    .from('courses')
    .delete()
    .eq('id', courseId)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  // If quick round, delete the entire trip too (it only had one course)
  if (isQuickRound) {
    await supabase.from('trip_players').delete().eq('trip_id', tripId)
    await supabase.from('trip_members').delete().eq('trip_id', tripId)
    await supabase.from('trips').delete().eq('id', tripId)
  } else {
    // 4. Recompute trip_stats and trip_awards from remaining rounds
    try {
      await recomputeTripStatsAndAwards(db, tripId)
    } catch (err) {
      console.error('Failed to recompute trip stats after deletion:', err)
    }
  }

  return NextResponse.json({ success: true, action: 'deleted', isQuickRound })
}
