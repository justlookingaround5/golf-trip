import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let { data: profile, error } = await supabase
    .from('player_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error && error.code === 'PGRST116') {
    // Profile doesn't exist — create it
    const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || ''
    const { data: newProfile, error: insertError } = await supabase
      .from('player_profiles')
      .insert({
        user_id: user.id,
        display_name: displayName,
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }
    profile = newProfile
  } else if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
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
  if (body.home_club_logo_url !== undefined) updates.home_club_logo_url = body.home_club_logo_url
  if (body.preferred_tee !== undefined) updates.preferred_tee = body.preferred_tee
  if (body.bio !== undefined) updates.bio = body.bio
  if (body.venmo_username !== undefined) updates.venmo_username = body.venmo_username
  if (body.cashapp_cashtag !== undefined) updates.cashapp_cashtag = body.cashapp_cashtag
  if (body.zelle_email !== undefined) updates.zelle_email = body.zelle_email

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
