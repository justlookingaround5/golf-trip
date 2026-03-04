import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET all polls (course votes + date polls) for a trip
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params
  const supabase = await createClient()

  const [courseVotesRes, datePollsRes] = await Promise.all([
    supabase
      .from('course_votes')
      .select('id, course_name, proposed_by, created_at, course_vote_responses(id, user_id, vote)')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false }),
    supabase
      .from('date_polls')
      .select('id, date_option, proposed_by, created_at, date_poll_responses(id, user_id, available)')
      .eq('trip_id', tripId)
      .order('date_option', { ascending: true }),
  ])

  return NextResponse.json({
    course_votes: courseVotesRes.data || [],
    date_polls: datePollsRes.data || [],
  })
}

// POST to create a new course vote or date poll
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  if (body.type === 'course_vote') {
    if (!body.course_name?.trim()) {
      return NextResponse.json({ error: 'Course name required' }, { status: 400 })
    }
    const { data, error } = await supabase
      .from('course_votes')
      .insert({ trip_id: tripId, course_name: body.course_name.trim(), proposed_by: user.id })
      .select('id, course_name, proposed_by, created_at')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  }

  if (body.type === 'date_poll') {
    if (!body.date_option) {
      return NextResponse.json({ error: 'Date required' }, { status: 400 })
    }
    const { data, error } = await supabase
      .from('date_polls')
      .insert({ trip_id: tripId, date_option: body.date_option, proposed_by: user.id })
      .select('id, date_option, proposed_by, created_at')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  }

  // Vote on a course
  if (body.type === 'course_vote_response') {
    const { error } = await supabase
      .from('course_vote_responses')
      .upsert(
        { course_vote_id: body.course_vote_id, user_id: user.id, vote: body.vote },
        { onConflict: 'course_vote_id,user_id' }
      )

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // Respond to a date poll
  if (body.type === 'date_poll_response') {
    const { error } = await supabase
      .from('date_poll_responses')
      .upsert(
        { date_poll_id: body.date_poll_id, user_id: user.id, available: body.available },
        { onConflict: 'date_poll_id,user_id' }
      )

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}
