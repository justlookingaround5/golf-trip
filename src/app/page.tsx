import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import HomeClient from './home-client-new'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/admin/login')

  // Fetch user's trips via membership
  const { data: memberships } = await supabase
    .from('trip_members')
    .select('role, trip:trips(id, name, location, year, status)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trips = (memberships || [])
    .filter((m: any) => m.trip != null)
    .map((m: any) => {
      const trip = Array.isArray(m.trip) ? m.trip[0] : m.trip
      return { ...trip, role: m.role }
    })
    .filter((t: any) => t.id != null)

  // Detect today's round across active trips
  const today = new Date().toISOString().split('T')[0]
  const activeTripIds = trips
    .filter((t: any) => t.status === 'active')
    .map((t: any) => t.id)

  let activeRound: {
    tripId: string
    tripName: string
    courseId: string
    courseName: string
    courseDate: string
  } | null = null

  if (activeTripIds.length > 0) {
    const { data: todayCourses } = await supabase
      .from('courses')
      .select('id, name, round_date, trip_id')
      .in('trip_id', activeTripIds)
      .eq('round_date', today)
      .limit(1)
      .maybeSingle()

    if (todayCourses) {
      const matchingTrip = trips.find((t: any) => t.id === todayCourses.trip_id)
      activeRound = {
        tripId: todayCourses.trip_id,
        tripName: matchingTrip?.name || 'Trip',
        courseId: todayCourses.id,
        courseName: todayCourses.name,
        courseDate: todayCourses.round_date || today,
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
