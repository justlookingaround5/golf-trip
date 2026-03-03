import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // Require authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim()
  const tripId = searchParams.get('trip_id')

  if (!query || query.length < 1) {
    return NextResponse.json([])
  }

  // Search player_profiles by display_name
  const { data: profiles, error } = await supabase
    .from('player_profiles')
    .select('user_id, display_name, avatar_url, handicap_index')
    .ilike('display_name', `%${query}%`)
    .limit(10)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // If trip_id provided, exclude users already in the trip
  let results = profiles || []

  if (tripId && results.length > 0) {
    const userIds = results.map((p) => p.user_id)

    const { data: existingMembers } = await supabase
      .from('trip_members')
      .select('user_id')
      .eq('trip_id', tripId)
      .in('user_id', userIds)

    const existingUserIds = new Set((existingMembers || []).map((m) => m.user_id))
    results = results.filter((p) => !existingUserIds.has(p.user_id))
  }

  // Get emails from auth.users via player_profiles.user_id
  // Since we can't query auth.users directly with the anon key,
  // we'll check if the user has an email in the players table
  const userIds = results.map((p) => p.user_id)
  let emailMap: Record<string, string> = {}

  if (userIds.length > 0) {
    const { data: players } = await supabase
      .from('players')
      .select('user_id, email')
      .in('user_id', userIds)

    if (players) {
      emailMap = Object.fromEntries(
        players
          .filter((p) => p.user_id && p.email)
          .map((p) => [p.user_id, p.email])
      )
    }
  }

  const response = results.map((p) => ({
    user_id: p.user_id,
    display_name: p.display_name,
    avatar_url: p.avatar_url,
    handicap_index: p.handicap_index,
    email: emailMap[p.user_id] || null,
  }))

  return NextResponse.json(response)
}
