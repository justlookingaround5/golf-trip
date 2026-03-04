import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Trip } from '@/lib/types'

export default async function Home() {
  const supabase = await createClient()

  // Fetch current user (may be null for anonymous visitors)
  const { data: { user } } = await supabase.auth.getUser()

  const { data: trips } = await supabase
    .from('trips')
    .select('id, name, year, location, status')
    .in('status', ['setup', 'active', 'completed'])
    .order('year', { ascending: false })
    .limit(20)

  // Get trip IDs the user is a member of
  const memberTripIds = new Set<string>()
  if (user) {
    const tripIds = (trips ?? []).map(t => t.id)
    if (tripIds.length > 0) {
      const { data: memberships } = await supabase
        .from('trip_members')
        .select('trip_id')
        .eq('user_id', user.id)
        .in('trip_id', tripIds)
      for (const m of memberships ?? []) {
        memberTripIds.add(m.trip_id)
      }
    }
  }

  const upcomingTrips = (trips as Trip[] | null)?.filter(t => t.status === 'setup' || t.status === 'active') ?? []
  const completedTrips = (trips as Trip[] | null)?.filter(t => t.status === 'completed') ?? []

  const statusPill: Record<string, { label: string; className: string }> = {
    setup: { label: 'Setting Up', className: 'bg-amber-100 text-amber-800' },
    active: { label: 'Active', className: 'bg-green-100 text-green-800' },
    completed: { label: 'Completed', className: 'bg-gray-100 text-gray-600' },
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-golf-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16 text-center">
          <div className="text-4xl sm:text-5xl font-bold tracking-tight mb-2">
            <span className="text-gold">Fore</span>Live
          </div>
          <p className="text-golf-200 text-lg mt-3">
            Live scoring, games, and settlements for your golf trip
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/join"
              className="inline-block rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold text-golf-950 hover:bg-gold-dark transition-colors"
            >
              Join a Trip
            </Link>
            <Link
              href="/home"
              className="inline-block rounded-lg border border-golf-400 px-6 py-2.5 text-sm font-semibold text-golf-200 hover:bg-golf-800 transition-colors"
            >
              Go to My Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-10">
        {/* Upcoming / Active Trips */}
        {upcomingTrips.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-golf-900 mb-4">
              Upcoming Trips
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {upcomingTrips.map(trip => {
                const isMember = memberTripIds.has(trip.id)
                const pill = statusPill[trip.status] ?? statusPill.setup
                const card = (
                  <div className="flex flex-col h-full">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg text-golf-900">
                          {trip.name}
                        </h3>
                        {trip.location && (
                          <p className="text-sm text-gray-500 mt-1">{trip.location}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${pill.className}`}>
                          {pill.label}
                        </span>
                        <span className="text-xs font-medium bg-golf-100 text-golf-800 px-2 py-1 rounded-full">
                          {trip.year}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center text-sm font-medium">
                      {isMember ? (
                        <span className="text-golf-700">View trip &rarr;</span>
                      ) : (
                        <span className="text-gray-400">Sign in to view</span>
                      )}
                    </div>
                  </div>
                )

                return isMember ? (
                  <Link
                    key={trip.id}
                    href={`/trip/${trip.id}`}
                    className="block border border-golf-200 rounded-lg p-5 hover:border-golf-600 hover:shadow-md transition-all bg-white"
                  >
                    {card}
                  </Link>
                ) : (
                  <div
                    key={trip.id}
                    className="block border border-gray-200 rounded-lg p-5 bg-white opacity-75"
                  >
                    {card}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Completed Trips */}
        {completedTrips.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-golf-900 mb-4">
              Past Trips
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {completedTrips.map(trip => {
                const isMember = memberTripIds.has(trip.id)
                const card = (
                  <div className="flex flex-col h-full">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg text-gray-800">
                          {trip.name}
                        </h3>
                        {trip.location && (
                          <p className="text-sm text-gray-500 mt-1">{trip.location}</p>
                        )}
                      </div>
                      <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                        {trip.year}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center text-sm font-medium">
                      {isMember ? (
                        <span className="text-gray-500">View results &rarr;</span>
                      ) : (
                        <span className="text-gray-400">Sign in to view</span>
                      )}
                    </div>
                  </div>
                )

                return isMember ? (
                  <Link
                    key={trip.id}
                    href={`/trip/${trip.id}`}
                    className="block border border-gray-200 rounded-lg p-5 hover:border-golf-600 hover:shadow-md transition-all bg-white"
                  >
                    {card}
                  </Link>
                ) : (
                  <div
                    key={trip.id}
                    className="block border border-gray-200 rounded-lg p-5 bg-white opacity-75"
                  >
                    {card}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* No trips */}
        {upcomingTrips.length === 0 && completedTrips.length === 0 && (
          <section className="text-center py-16">
            <div className="text-5xl mb-4">&#9971;</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              No trips yet
            </h2>
            <p className="text-gray-500 mb-6">
              Set up your courses, players, and games.
            </p>
            <Link
              href="/admin/login"
              className="inline-block bg-golf-700 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-golf-800 transition-colors"
            >
              Plan Your Round
            </Link>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <span>ForeLive</span>
          <Link
            href="/admin/login"
            className="text-golf-700 hover:text-golf-900 font-medium transition-colors"
          >
            Admin Login
          </Link>
        </div>
      </footer>
    </div>
  )
}
