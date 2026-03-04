import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Trip } from '@/lib/types'
import TripActions from './trip-actions'
import ShareTrip from './share-trip'

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ tripId: string }>
}) {
  const { tripId } = await params
  const supabase = await createClient()

  const { data: trip, error } = await supabase
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .single()

  if (error || !trip) {
    notFound()
  }

  const typedTrip = trip as Trip

  // Fetch courses for per-round game links
  const { data: courses } = await supabase
    .from('courses')
    .select('id, name, round_number, par')
    .eq('trip_id', tripId)
    .order('round_number')

  return (
    <div className="space-y-6">
      <TripActions trip={typedTrip} />

      {/* Share Trip */}
      <ShareTrip tripId={typedTrip.id} joinCode={typedTrip.join_code} />

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Trip Details</h3>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">Location</dt>
            <dd className="mt-1 text-sm text-gray-900">{typedTrip.location || 'Not set'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Status</dt>
            <dd className="mt-1">
              <StatusBadge status={typedTrip.status} />
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Match Buy-in</dt>
            <dd className="mt-1 text-sm text-gray-900">${typedTrip.match_buy_in}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Skins Buy-in</dt>
            <dd className="mt-1 text-sm text-gray-900">${typedTrip.skins_buy_in}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Skins Mode</dt>
            <dd className="mt-1 text-sm capitalize text-gray-900">{typedTrip.skins_mode}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Handicap Mode</dt>
            <dd className="mt-1 text-sm capitalize text-gray-900">{typedTrip.handicap_mode || 'static'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Public Viewer Link</dt>
            <dd className="mt-1 text-sm text-golf-700">
              /trip/{typedTrip.id}
            </dd>
          </div>
          {typedTrip.join_code && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Join Code</dt>
              <dd className="mt-1 flex items-center gap-2">
                <span className="inline-block rounded-md bg-gray-100 px-3 py-1 font-mono text-lg font-bold tracking-widest text-gray-900">
                  {typedTrip.join_code}
                </span>
                <span className="text-xs text-gray-500">Share this code so players can join at /join/code</span>
              </dd>
            </div>
          )}
        </dl>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Manage</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <ManageLink href={`/admin/trips/${typedTrip.id}/courses`} label="Courses" />
          <ManageLink href={`/admin/trips/${typedTrip.id}/players`} label="Players" />
          <ManageLink href={`/admin/trips/${typedTrip.id}/teams`} label="Teams" />
          <ManageLink href={`/admin/trips/${typedTrip.id}/matches`} label="Matches" />
        </div>
      </div>

      {/* Per-Round Game Setup */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Games by Round</h3>
        {courses && courses.length > 0 ? (
          <div className="space-y-2">
            {courses.map((course: { id: string; name: string; round_number: number; par: number }) => (
              <a
                key={course.id}
                href={`/admin/trips/${typedTrip.id}/rounds/${course.id}/games`}
                className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm transition hover:bg-golf-50 hover:text-golf-700"
              >
                <div>
                  <span className="font-medium text-gray-900">{course.name}</span>
                  <span className="ml-2 text-gray-500">R{course.round_number}</span>
                </div>
                <span className="text-gray-400">Set up games &rarr;</span>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Add courses first to set up games.</p>
        )}
      </div>
    </div>
  )
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

function ManageLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="flex items-center justify-center rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-golf-50 hover:text-golf-700"
    >
      {label}
    </a>
  )
}
