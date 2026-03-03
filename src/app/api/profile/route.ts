import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile, error } = await supabase
    .from('player_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }

  return NextResponse.json(profile)
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  const updates: Record<string, unknown> = {}
  if (body.display_name !== undefined) updates.display_name = body.display_name
  if (body.ghin_number !== undefined) updates.ghin_number = body.ghin_number
  if (body.handicap_index !== undefined) updates.handicap_index = body.handicap_index
  if (body.home_club !== undefined) updates.home_club = body.home_club
  if (body.preferred_tee !== undefined) updates.preferred_tee = body.preferred_tee

  const { data: profile, error } = await supabase
    .from('player_profiles')
    .update(updates)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(profile)
}
