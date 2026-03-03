import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Trip } from '@/lib/types'

export default async function Home() {
  const supabase = await createClient()

  const { data: trips } = await supabase
    .from('trips')
    .select('id, name, year, location, status')
    .in('status', ['active', 'completed'])
    .order('year', { ascending: false })
    .limit(10)

  const activeTrips = (trips as Trip[] | null)?.filter(t => t.status === 'active') ?? []
  const completedTrips = (trips as Trip[] | null)?.filter(t => t.status === 'completed') ?? []

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-golf-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16 text-center">
          <div className="text-4xl sm:text-5xl font-bold tracking-tight mb-2">
            Golf Trip Tracker
          </div>
          <p className="text-golf-200 text-lg mt-3">
            Scores, matches, and payouts for your golf trip
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-10">
        {/* Active Trips */}
        {activeTrips.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-golf-900 mb-4">
              Active Trips
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {activeTrips.map(trip => (
                <Link
                  key={trip.id}
                  href={`/trip/${trip.id}`}
                  className="block border border-golf-200 rounded-lg p-5 hover:border-golf-600 hover:shadow-md transition-all bg-white"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg text-golf-900">
                        {trip.name}
                      </h3>
                      {trip.location && (
                        <p className="text-sm text-gray-500 mt-1">{trip.location}</p>
                      )}
                    </div>
                    <span className="text-xs font-medium bg-golf-100 text-golf-800 px-2 py-1 rounded-full">
                      {trip.year}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center text-sm text-golf-700 font-medium">
                    View leaderboard &rarr;
                  </div>
                </Link>
              ))}
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
              {completedTrips.map(trip => (
                <Link
                  key={trip.id}
                  href={`/trip/${trip.id}`}
                  className="block border border-gray-200 rounded-lg p-5 hover:border-golf-600 hover:shadow-md transition-all bg-white"
                >
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
                  <div className="mt-3 flex items-center text-sm text-gray-500 font-medium">
                    View results &rarr;
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* No trips */}
        {activeTrips.length === 0 && completedTrips.length === 0 && (
          <section className="text-center py-16">
            <div className="text-5xl mb-4">&#9971;</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              No trips yet
            </h2>
            <p className="text-gray-500 mb-6">
              Get started by creating a trip in the admin area.
            </p>
            <Link
              href="/admin/login"
              className="inline-block bg-golf-700 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-golf-800 transition-colors"
            >
              Go to Admin
            </Link>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <span>Golf Trip Tracker</span>
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
