import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Trip, Course } from '@/lib/types'
import { MATCH_FORMAT_LABELS } from '@/lib/types'
import type { MatchFormat } from '@/lib/types'

// Helper to extract player name from Supabase's nested join result
// Supabase may return trip_player as array or object depending on context
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getMatchPlayerName(mp: any): string {
  const tp = Array.isArray(mp.trip_player) ? mp.trip_player[0] : mp.trip_player
  if (!tp) return 'Unknown'
  const player = Array.isArray(tp.player) ? tp.player[0] : tp.player
  return player?.name ?? 'Unknown'
}

export default async function MatchesListPage({
  params,
}: {
  params: Promise<{ tripId: string }>
}) {
  const { tripId } = await params
  const supabase = await createClient()

  // Fetch trip
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .single()

  if (tripError || !trip) {
    notFound()
  }

  // Fetch courses
  const { data: courses } = await supabase
    .from('courses')
    .select('id, trip_id, name, slope, rating, par, round_number, round_date, created_at')
    .eq('trip_id', tripId)
    .order('round_number')

  const courseById = new Map((courses ?? []).map((c) => [c.id, c]))

  // Fetch all matches with match_players
  const courseIds = (courses ?? []).map((c) => c.id)
  const { data: matches } = courseIds.length > 0
    ? await supabase
        .from('matches')
        .select(`
          id,
          course_id,
          format,
          point_value,
          scorer_email,
          scorer_token,
          status,
          result,
          winner_side,
          created_at,
          match_players (
            id,
            match_id,
            trip_player_id,
            side,
            trip_player:trip_players (
              id,
              trip_id,
              player_id,
              paid,
              player:players (
                id,
                name
              )
            )
          )
        `)
        .in('course_id', courseIds)
        .order('created_at')
    : { data: [] }

  // Group matches by course/round
  const matchList = matches ?? []
  const matchesByCourse = new Map<string, typeof matchList>()
  for (const m of matchList) {
    if (!matchesByCourse.has(m.course_id)) {
      matchesByCourse.set(m.course_id, [])
    }
    matchesByCourse.get(m.course_id)!.push(m)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-golf-800 px-4 py-4 text-white shadow-md">
        <div className="mx-auto max-w-2xl">
          <Link
            href={`/trip/${tripId}`}
            className="mb-1 inline-block text-sm text-golf-300 hover:text-gold"
          >
            &larr; Back to {(trip as Trip).name}
          </Link>
          <h1 className="text-xl font-bold">Matches</h1>
          <p className="text-sm text-golf-200">
            {(trip as Trip).name} &middot; {(trip as Trip).year}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        {(courses ?? []).length === 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
            No rounds set up yet.
          </div>
        )}

        {(courses as Course[])?.map((course) => {
          const courseMatches = matchesByCourse.get(course.id) ?? []

          return (
            <div
              key={course.id}
              className="rounded-lg border border-gray-200 bg-white shadow-sm"
            >
              <div className="border-b border-gray-200 bg-golf-50 px-4 py-3">
                <h3 className="font-semibold text-gray-900">
                  Round {course.round_number}: {course.name}
                </h3>
                <p className="text-xs text-gray-500">
                  Par {course.par}
                  {course.round_date && ` - ${course.round_date}`}
                </p>
              </div>

              {courseMatches.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  No matches for this round.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {courseMatches.map((match) => {
                    const teamA = (match.match_players ?? []).filter(
                      (mp: { side: string }) => mp.side === 'team_a'
                    )
                    const teamB = (match.match_players ?? []).filter(
                      (mp: { side: string }) => mp.side === 'team_b'
                    )

                    const teamANames = teamA
                      .map((mp) => getMatchPlayerName(mp))
                      .join(' & ')
                    const teamBNames = teamB
                      .map((mp) => getMatchPlayerName(mp))
                      .join(' & ')

                    return (
                      <Link
                        key={match.id}
                        href={`/trip/${tripId}/matches/${match.id}`}
                        className="block px-4 py-4 transition hover:bg-gray-50"
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-semibold text-gray-900">
                                {teamANames}
                              </span>
                              <span className="text-xs text-gray-400">vs</span>
                              <span className="font-semibold text-gray-900">
                                {teamBNames}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-gray-500">
                              {MATCH_FORMAT_LABELS[match.format as MatchFormat]} &middot;{' '}
                              {match.point_value} pt{match.point_value !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <div className="ml-3 flex-shrink-0">
                            <MatchStatusBadge
                              status={match.status}
                              result={match.result}
                            />
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MatchStatusBadge({
  status,
  result,
}: {
  status: string
  result: string | null
}) {
  const colors: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-600',
    in_progress: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
  }

  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
        colors[status] ?? 'bg-gray-100 text-gray-600'
      }`}
    >
      {status === 'completed' && result ? result : status.replace('_', ' ')}
    </span>
  )
}
