import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

type TripWithRole = {
  id: string
  name: string
  location: string
  year: number
  status: string
  role: string
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    completed: 'bg-gray-100 text-gray-800',
    setup: 'bg-yellow-100 text-yellow-800',
  }

  const colorClass = colors[status] || 'bg-gray-100 text-gray-800'

  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${colorClass}`}
    >
      {status}
    </span>
  )
}

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    owner: 'bg-purple-100 text-purple-800',
    admin: 'bg-blue-100 text-blue-800',
    player: 'bg-gray-100 text-gray-600',
  }

  const colorClass = colors[role] || 'bg-gray-100 text-gray-600'

  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${colorClass}`}
    >
      {role}
    </span>
  )
}

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get trips where user is a member, joined with trip data
  const { data: memberships } = await supabase
    .from('trip_members')
    .select('role, trip:trips(id, name, location, year, status)')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trips: TripWithRole[] = (memberships || [])
    .filter((m: any) => m.trip != null)
    .map((m: any) => {
      const trip = Array.isArray(m.trip) ? m.trip[0] : m.trip
      return { ...trip, role: m.role }
    })
    .filter((t: TripWithRole) => t.id != null)
    .sort((a: TripWithRole, b: TripWithRole) => b.year - a.year)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Your Trips</h2>
        <Link
          href="/admin/trips/new"
          className="rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
        >
          New Trip
        </Link>
      </div>

      {trips.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-gray-500">
            No trips yet. Create your first golf trip to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((trip) => (
            <Link
              key={trip.id}
              href={`/admin/trips/${trip.id}`}
              className="block rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="mb-2 flex items-start justify-between">
                <h3 className="font-semibold text-gray-900">{trip.name}</h3>
                <div className="flex gap-1.5">
                  <RoleBadge role={trip.role} />
                  <StatusBadge status={trip.status} />
                </div>
              </div>
              <p className="text-sm text-gray-600">{trip.location}</p>
              <p className="mt-1 text-sm text-gray-400">{trip.year}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
