import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { postActivity } from '@/lib/activity'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tripId: string; courseId: string }> }
) {
  const { courseId } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('round_rsvps')
    .select('*, trip_player:trip_players(id, player:players(name))')
    .eq('course_id', courseId)
  return NextResponse.json(data || [])
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; courseId: string }> }
) {
  const { tripId, courseId } = await params
  const supabase = await createClient()
  const body = await request.json()
  const { trip_player_id, status, preferred_tee, preferred_time, note } = body

  if (!trip_player_id || !status) {
    return NextResponse.json({ error: 'trip_player_id and status required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('round_rsvps')
    .upsert({
      course_id: courseId,
      trip_player_id,
      status,
      preferred_tee: preferred_tee || null,
      preferred_time: preferred_time || 'any',
      note: note || null,
      responded_at: new Date().toISOString(),
    }, { onConflict: 'course_id,trip_player_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Activity feed post
  const emoji = status === 'confirmed' ? '✅' : status === 'declined' ? '❌' : '🤔'
  const { data: tp } = await supabase
    .from('trip_players')
    .select('player:players(name)')
    .eq('id', trip_player_id)
    .single()
  const name = (Array.isArray(tp?.player) ? tp?.player[0] : tp?.player)?.name || 'Someone'

  await postActivity({
    trip_id: tripId,
    event_type: 'custom',
    title: `${emoji} ${name} is ${status} for the round`,
    detail: preferred_tee ? `Playing from ${preferred_tee} tees` : undefined,
    trip_player_id,
    course_id: courseId,
    icon: emoji,
  })

  return NextResponse.json(data)
}
