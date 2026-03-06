import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

  // Delete the course (cascade deletes holes, round_scores, round_games, etc.)
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
  }

  return NextResponse.json({ success: true, action: 'deleted', isQuickRound })
}
