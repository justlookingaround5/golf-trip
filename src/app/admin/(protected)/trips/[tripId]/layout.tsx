import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import TripSetupNav from './trip-setup-nav'

export default async function TripDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ tripId: string }>
}) {
  const { tripId } = await params
  const supabase = await createClient()

  const { data: trip } = await supabase
    .from('trips')
    .select('id, name, year')
    .eq('id', tripId)
    .single()

  if (!trip) {
    notFound()
  }

  const [{ count: courseCount }, { count: playerCount }, { count: teamCount }] =
    await Promise.all([
      supabase.from('courses').select('id', { count: 'exact', head: true }).eq('trip_id', tripId),
      supabase.from('trip_players').select('id', { count: 'exact', head: true }).eq('trip_id', tripId),
      supabase.from('teams').select('id', { count: 'exact', head: true }).eq('trip_id', tripId),
    ])

  const setupState = {
    hasCourses: (courseCount ?? 0) > 0,
    hasPlayers: (playerCount ?? 0) > 0,
    hasTeams: (teamCount ?? 0) > 0,
  }

  return (
    <div>
      <div className="mb-6">
        <div className="mb-1 text-sm text-gray-500">
          <Link href="/admin" className="hover:text-golf-700 hover:underline">
            Trips
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-700">{trip.name}</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
          {trip.name} <span className="text-lg font-normal text-gray-500">({trip.year})</span>
        </h2>
      </div>

      <TripSetupNav tripId={tripId} setupState={setupState} />

      {children}
    </div>
  )
}
