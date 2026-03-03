import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/trips/[tripId]/feed?limit=50&before=<iso_date>
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
  const before = searchParams.get('before')

  const supabase = await createClient()

  let query = supabase
    .from('activity_feed')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (before) {
    query = query.lt('created_at', before)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

/**
 * POST /api/trips/[tripId]/feed
 * Post a custom activity (admin announcement, photo, etc.)
 * Body: { title, detail?, icon?, photo_url?, event_type? }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await request.json()

  const { data, error } = await supabase
    .from('activity_feed')
    .insert({
      trip_id: tripId,
      event_type: body.event_type || 'custom',
      title: body.title,
      detail: body.detail || null,
      icon: body.icon || '📣',
      photo_url: body.photo_url || null,
      metadata: body.metadata || {},
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
