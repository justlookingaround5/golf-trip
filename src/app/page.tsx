import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import HomeClient from './home-client-new'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/admin/login')

  // Fetch user's trips via membership (all trips, including quick rounds)
  const { data: memberships } = await supabase
    .from('trip_members')
    .select('role, trip:trips(id, name, location, year, status, is_quick_round)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allTrips = (memberships || [])
    .filter((m: any) => m.trip != null)
    .map((m: any) => {
      const trip = Array.isArray(m.trip) ? m.trip[0] : m.trip
      return { ...trip, role: m.role }
    })
    .filter((t: any) => t.id != null)

  // "My Trips" excludes quick rounds
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trips = allTrips.filter((t: any) => !t.is_quick_round)

  // Active round detection uses ALL trips (including quick rounds)
  const today = new Date().toISOString().split('T')[0]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allActiveTripIds = allTrips
    .filter((t: any) => t.status === 'active')
    .map((t: any) => t.id)

  let activeRound: {
    tripId: string
    tripName: string
    courseId: string
    courseName: string
    courseDate: string
    isQuickRound: boolean
  } | null = null

  if (allActiveTripIds.length > 0) {
    const { data: todayCourses } = await supabase
      .from('courses')
      .select('id, name, round_date, trip_id')
      .in('trip_id', allActiveTripIds)
      .eq('round_date', today)
      .limit(1)
      .maybeSingle()

    if (todayCourses) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const matchingTrip = allTrips.find((t: any) => t.id === todayCourses.trip_id)
      activeRound = {
        tripId: todayCourses.trip_id,
        tripName: matchingTrip?.name || 'Trip',
        courseId: todayCourses.id,
        courseName: todayCourses.name,
        courseDate: todayCourses.round_date || today,
        isQuickRound: !!matchingTrip?.is_quick_round,
      }
    }
  }

  // Pending invites
  const userEmail = user.email
  let pendingInvites: { id: string; token: string; tripName: string }[] = []
  if (userEmail) {
    const { data: invites } = await supabase
      .from('trip_invites')
      .select('id, token, trip:trips(name)')
      .eq('email', userEmail)
      .eq('status', 'pending')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pendingInvites = (invites || []).map((inv: any) => ({
      id: inv.id,
      token: inv.token,
      tripName: Array.isArray(inv.trip) ? inv.trip[0]?.name : inv.trip?.name || 'Trip',
    }))
  }

  return (
    <HomeClient
      trips={trips}
      activeRound={activeRound}
      pendingInvites={pendingInvites}
    />
  )
}
