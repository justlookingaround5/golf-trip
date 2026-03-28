import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/quick-round/active — check if user has any active round (quick or trip)
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ active: false })

  // Get the user's player record
  const { data: player } = await supabase
    .from('players')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (!player) return NextResponse.json({ active: false })

  // Find all active trips
  const { data: activeTrips } = await supabase
    .from('trips')
    .select('id')
    .eq('status', 'active')

  if (!activeTrips || activeTrips.length === 0) {
    return NextResponse.json({ active: false })
  }

  const activeTripIds = activeTrips.map(t => t.id)

  // Find user's trip_players across active trips
  const { data: tripPlayers } = await supabase
    .from('trip_players')
    .select('id, trip_id')
    .eq('player_id', player.id)
    .in('trip_id', activeTripIds)

  if (!tripPlayers || tripPlayers.length === 0) {
    return NextResponse.json({ active: false })
  }

  const tpIds = tripPlayers.map(tp => tp.id)
  const tpTripIds = [...new Set(tripPlayers.map(tp => tp.trip_id))]

  // Get courses for those active trips
  const { data: courses } = await supabase
    .from('courses')
    .select('id')
    .in('trip_id', tpTripIds)

  if (!courses || courses.length === 0) {
    return NextResponse.json({ active: false })
  }

  const courseIds = courses.map(c => c.id)

  // Check if user has any incomplete round (1-17 scores on any course)
  const { data: scores } = await supabase
    .from('round_scores')
    .select('course_id')
    .in('trip_player_id', tpIds)
    .in('course_id', courseIds)

  // Count scores per course
  const countByCourse = new Map<string, number>()
  for (const s of scores ?? []) {
    countByCourse.set(s.course_id, (countByCourse.get(s.course_id) ?? 0) + 1)
  }

  const hasActiveRound = [...countByCourse.values()].some(count => count > 0 && count < 18)

  return NextResponse.json({ active: hasActiveRound })
}
