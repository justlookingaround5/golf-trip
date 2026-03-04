import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Trip, Course, Score, Match, PlayerCourseHandicap, TripPlayer } from '@/lib/types'
import { calculateTeamStandings } from '@/lib/leaderboard'
import TripLandingClient from './trip-landing-client'
import PlanningSection from './planning-section'

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

  // Fetch trip players with profiles for "Who's Going" section
  const { data: tripPlayers } = await supabase
    .from('trip_players')
    .select('id, player:players(id, name, handicap_index, user_id)')
    .eq('trip_id', tripId)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerUserIds = (tripPlayers || [])
    .map((tp: any) => {
      const player = Array.isArray(tp.player) ? tp.player[0] : tp.player
      return player?.user_id
    })
    .filter(Boolean)

  let profileMap = new Map<string, { display_name: string | null; avatar_url: string | null; bio: string | null }>()
  if (playerUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from('player_profiles')
      .select('user_id, display_name, avatar_url, bio')
      .in('user_id', playerUserIds)
    for (const p of profiles || []) {
      profileMap.set(p.user_id, { display_name: p.display_name, avatar_url: p.avatar_url, bio: p.bio ?? null })
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roster = (tripPlayers || []).map((tp: any) => {
    const player = Array.isArray(tp.player) ? tp.player[0] : tp.player
    const profile = player?.user_id ? profileMap.get(player.user_id) : null
    return {
      id: tp.id,
      name: profile?.display_name || player?.name || 'Unknown',
      avatar_url: profile?.avatar_url || null,
      handicap_index: player?.handicap_index ?? null,
      bio: profile?.bio || null,
    }
  })

  // Fetch recent activity feed
  const { data: activityFeed } = await supabase
    .from('activity_feed')
    .select('id, event_type, title, detail, icon, created_at')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false })
    .limit(8)

  // Compute countdown
  const firstRoundDate = (courses as Course[] ?? [])
    .filter(c => c.round_date)
    .sort((a, b) => (a.round_date! > b.round_date! ? 1 : -1))[0]?.round_date

  const today = new Date().toISOString().split('T')[0]
  const todaysCourse = (courses as Course[] ?? []).find(c => c.round_date === today)

  let daysUntilTrip: number | null = null
  if (firstRoundDate && firstRoundDate > today) {
    const diff = new Date(firstRoundDate).getTime() - new Date(today).getTime()
    daysUntilTrip = Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-golf-800 px-4 py-6 text-white shadow-md">
        <div className="mx-auto max-w-2xl">
          <Link
            href="/home"
            className="mb-2 inline-flex items-center gap-1 text-sm text-golf-300 hover:text-white transition-colors"
          >
            &larr; Home
          </Link>
          <h1 className="text-2xl font-bold">{(trip as Trip).name}</h1>
          <p className="mt-1 text-golf-200">
            {(trip as Trip).location ?? 'Location TBD'} &middot; {(trip as Trip).year}
          </p>
          {/* Countdown */}
          {daysUntilTrip !== null && daysUntilTrip > 0 && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-golf-700/60 px-4 py-1.5 text-sm font-medium">
              <span className="text-2xl font-bold text-white">{daysUntilTrip}</span>
              <span className="text-golf-200">{daysUntilTrip === 1 ? 'day' : 'days'} until tee time</span>
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        {/* Who's Going */}
        {roster.length > 0 && (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
              The Crew ({roster.length})
            </h3>
            <div className="flex flex-wrap gap-3">
              {roster.map((player) => (
                <div key={player.id} className="flex items-center gap-2 rounded-full bg-gray-50 dark:bg-gray-700 px-3 py-1.5">
                  {player.avatar_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={player.avatar_url} alt="" className="h-6 w-6 rounded-full" />
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-golf-100 text-xs font-bold text-golf-800">
                      {player.name[0]?.toUpperCase()}
                    </div>
                  )}
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{player.name}</span>
                    {player.handicap_index != null && (
                      <span className="ml-1 text-xs text-gray-500">({player.handicap_index})</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {(trip as Trip).join_code && (
              <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3">
                <span className="text-xs text-gray-500">Join code:</span>
                <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-sm font-bold tracking-widest text-gray-900">
                  {(trip as Trip).join_code}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Team Standings */}
        <TripLandingClient
          tripId={tripId}
          initialTeamStandings={teamStandings}
        />

        {/* Go Live Scoring */}
        {todaysCourse ? (
          <Link
            href={`/trip/${tripId}/live/${todaysCourse.id}`}
            className="flex items-center justify-center gap-2 rounded-xl bg-green-600 py-4 text-lg font-bold text-white shadow-lg active:bg-green-700"
          >
            Live Scoring — {todaysCourse.name}
          </Link>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <span className="text-xl">&#9971;</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Live Scoring</h3>
                <p className="text-sm text-gray-500">
                  Available when a round is scheduled for today.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Match Summary */}
        {totalMatches > 0 && (
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
        )}

        {/* Activity Feed */}
        {(activityFeed || []).length > 0 && (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
              Recent Activity
            </h3>
            <div className="space-y-3">
              {(activityFeed || []).map((item) => (
                <div key={item.id} className="flex items-start gap-3">
                  <span className="mt-0.5 text-lg">{item.icon || '...'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.title}</p>
                    {item.detail && (
                      <p className="text-xs text-gray-500 truncate">{item.detail}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-gray-400">
                    {formatRelativeTime(item.created_at)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Collaborative Planning */}
        {(trip as Trip).status === 'setup' && (
          <PlanningSection tripId={tripId} />
        )}

        {/* Navigation Links */}
        <div className="grid grid-cols-2 gap-3">
          <NavLink href={`/trip/${tripId}/leaderboard`} label="Leaderboard" />
          <NavLink href={`/trip/${tripId}/matches`} label="Matches" />
          <NavLink href={`/trip/${tripId}/stats`} label="Stats & Awards" />
          <NavLink href={`/trip/${tripId}/settlement`} label="The Bank" />
          <NavLink href={`/trip/${tripId}/competition`} label="Ryder Cup" />
          <NavLink href={`/trip/${tripId}/dashboard`} label="Dashboard" />
          <NavLink href={`/trip/${tripId}/head-to-head`} label="Head-to-Head" />
          <NavLink href={`/trip/${tripId}/chat`} label="Trash Talk" />
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

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-4 text-sm font-semibold text-golf-700 dark:text-golf-400 shadow-sm transition hover:bg-golf-50 dark:hover:bg-golf-900/30"
    >
      {label}
    </Link>
  )
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.floor((now - then) / 1000)

  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}
