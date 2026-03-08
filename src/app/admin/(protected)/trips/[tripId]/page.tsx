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

  // Fetch courses for per-round game links and setup checklist
  const [{ data: courses }, { count: playerCount }, { count: teamCount }] =
    await Promise.all([
      supabase.from('courses').select('id, name, round_number, par').eq('trip_id', tripId).order('round_number'),
      supabase.from('trip_players').select('id', { count: 'exact', head: true }).eq('trip_id', tripId),
      supabase.from('teams').select('id', { count: 'exact', head: true }).eq('trip_id', tripId),
    ])

  return (
    <div className="space-y-6">
      <TripActions trip={typedTrip} />

      {/* Share Trip */}
      <ShareTrip tripId={typedTrip.id} />

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
        </dl>
      </div>

      <SetupChecklist
        tripId={typedTrip.id}
        courseCount={courses?.length ?? 0}
        playerCount={playerCount ?? 0}
        teamCount={teamCount ?? 0}
      />

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

function SetupChecklist({
  tripId,
  courseCount,
  playerCount,
  teamCount,
}: {
  tripId: string
  courseCount: number
  playerCount: number
  teamCount: number
}) {
  const steps = [
    {
      label: 'Courses',
      description: 'Add courses, tees, and round dates',
      href: `/admin/trips/${tripId}/courses`,
      done: courseCount > 0,
      count: courseCount,
      unit: 'course',
      locked: false,
    },
    {
      label: 'Players',
      description: 'Invite or manually add players',
      href: `/admin/trips/${tripId}/players`,
      done: playerCount > 0,
      count: playerCount,
      unit: 'player',
      locked: courseCount === 0,
    },
    {
      label: 'Teams',
      description: 'Create teams and assign players',
      href: `/admin/trips/${tripId}/teams`,
      done: teamCount > 0,
      count: teamCount,
      unit: 'team',
      locked: playerCount === 0,
    },
    {
      label: 'Matches',
      description: 'Set up matchups for each round',
      href: `/admin/trips/${tripId}/matches`,
      done: false,
      count: null,
      unit: 'match',
      locked: teamCount === 0,
    },
  ]

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">Setup</h3>
      <ol className="space-y-3">
        {steps.map((step, i) => (
          <li key={step.label} className="flex items-center gap-4">
            {/* Step indicator */}
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                step.done
                  ? 'bg-golf-700 text-white'
                  : step.locked
                    ? 'bg-gray-100 text-gray-300'
                    : 'bg-golf-100 text-golf-800'
              }`}
            >
              {step.done ? (
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                i + 1
              )}
            </div>

            {/* Step content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {step.locked ? (
                  <span className="text-sm font-medium text-gray-300">{step.label}</span>
                ) : (
                  <a
                    href={step.href}
                    className={`text-sm font-medium ${
                      step.done ? 'text-golf-700 hover:text-golf-800' : 'text-gray-900 hover:text-golf-700'
                    }`}
                  >
                    {step.label}
                  </a>
                )}
                {step.done && step.count !== null && (
                  <span className="text-xs text-gray-400">
                    {step.count} {step.unit}{step.count !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <p className={`text-xs ${step.locked ? 'text-gray-300' : 'text-gray-500'}`}>
                {step.description}
              </p>
            </div>

            {/* Action / status */}
            <div className="shrink-0">
              {step.locked ? (
                <span className="text-xs text-gray-300">Locked</span>
              ) : step.done ? (
                <a
                  href={step.href}
                  className="text-xs font-medium text-golf-700 hover:text-golf-800"
                >
                  Edit &rarr;
                </a>
              ) : (
                <a
                  href={step.href}
                  className="rounded-md bg-golf-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-golf-800"
                >
                  Start &rarr;
                </a>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
