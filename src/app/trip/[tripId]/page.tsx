import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Trip, Course, Score, Match, PlayerCourseHandicap, TripPlayer } from '@/lib/types'
import { calculateTeamStandings } from '@/lib/leaderboard'
import TripLandingClient from './trip-landing-client'

export default async function TripPublicPage({
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

  // Fetch teams with players
  const { data: teams } = await supabase
    .from('teams')
    .select(`
      id,
      trip_id,
      name,
      team_players (
        id,
        team_id,
        trip_player:trip_players (
          id,
          trip_id,
          player_id,
          paid,
          player:players (
            id,
            name,
            email,
            phone,
            handicap_index,
            created_at
          )
        )
      )
    `)
    .eq('trip_id', tripId)

  // Fetch courses with holes
  const { data: courses } = await supabase
    .from('courses')
    .select(`
      id,
      trip_id,
      name,
      slope,
      rating,
      par,
      round_number,
      round_date,
      created_at,
      holes (
        id,
        course_id,
        hole_number,
        par,
        handicap_index
      )
    `)
    .eq('trip_id', tripId)
    .order('round_number')

  // Fetch all matches with match_players
  const { data: matches } = await supabase
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
        side
      )
    `)
    .in('course_id', (courses ?? []).map((c) => c.id))

  // Fetch all scores for these matches
  const matchIds = (matches ?? []).map((m) => m.id)
  const { data: scores } = matchIds.length > 0
    ? await supabase
        .from('scores')
        .select('*')
        .in('match_id', matchIds)
    : { data: [] }

  // Fetch course handicaps
  const { data: courseHandicaps } = await supabase
    .from('player_course_handicaps')
    .select('*')
    .in('course_id', (courses ?? []).map((c) => c.id))

  // Reshape teams for the utility function
  const shapedTeams = (teams ?? []).map((t) => ({
    id: t.id as string,
    trip_id: t.trip_id as string,
    name: t.name as string,
    players: (t.team_players ?? [])
      .map((tp: { trip_player: unknown }) => tp.trip_player as TripPlayer)
      .filter(Boolean) as TripPlayer[],
  }))

  const teamStandings = calculateTeamStandings({
    teams: shapedTeams,
    matches: (matches ?? []) as Match[],
    courses: (courses ?? []) as Course[],
    scores: (scores ?? []) as Score[],
    courseHandicaps: (courseHandicaps ?? []) as PlayerCourseHandicap[],
  })

  // Count active/completed matches
  const activeMatches = (matches ?? []).filter(
    (m) => m.status === 'in_progress'
  ).length
  const completedMatches = (matches ?? []).filter(
    (m) => m.status === 'completed'
  ).length
  const totalMatches = (matches ?? []).length

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-green-800 px-4 py-6 text-white shadow-md">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-2xl font-bold">{(trip as Trip).name}</h1>
          <p className="mt-1 text-green-200">
            {(trip as Trip).location ?? 'Location TBD'} &middot; {(trip as Trip).year}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        {/* Team Standings */}
        <TripLandingClient
          tripId={tripId}
          initialTeamStandings={teamStandings}
        />

        {/* Match Summary */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Matches
          </h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-yellow-600">{activeMatches}</p>
              <p className="text-xs text-gray-500">In Progress</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">{completedMatches}</p>
              <p className="text-xs text-gray-500">Completed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-700">{totalMatches}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="grid grid-cols-2 gap-3">
          <NavLink href={`/trip/${tripId}/leaderboard`} label="Leaderboard" icon="🏆" />
          <NavLink href={`/trip/${tripId}/matches`} label="Matches" icon="⛳" />
          <NavLink href={`/trip/${tripId}/stats`} label="Stats & Awards" icon="📊" />
          <NavLink href={`/trip/${tripId}/settlement`} label="The Bank" icon="💰" />
          <NavLink href={`/trip/${tripId}/competition`} label="Ryder Cup" icon="🏅" />
          <NavLink href={`/trip/${tripId}/dashboard`} label="Dashboard" icon="📋" />
        </div>

        {/* Rounds */}
        {(courses ?? []).length > 0 && (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
              Rounds
            </h3>
            <div className="space-y-2">
              {(courses as Course[]).map((course) => (
                <div
                  key={course.id}
                  className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-gray-900">{course.name}</p>
                    <p className="text-xs text-gray-500">
                      Round {course.round_number}
                      {course.round_date && ` - ${course.round_date}`}
                    </p>
                  </div>
                  <p className="text-sm text-gray-500">Par {course.par}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function NavLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-4 text-sm font-semibold text-green-700 dark:text-green-400 shadow-sm transition hover:bg-green-50 dark:hover:bg-green-900/30"
    >
      <span>{icon}</span>
      {label}
    </Link>
  )
}
