import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Trip, Course, Score, Match, PlayerCourseHandicap, TripPlayer } from '@/lib/types'
import { calculateTeamStandings } from '@/lib/leaderboard'
import TripTabs from './trip-tabs'

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

  // Fetch games per round
  const courseIds = (courses ?? []).map((c) => c.id)
  const { data: roundGames } = courseIds.length > 0
    ? await supabase
        .from('round_games')
        .select(`
          id, course_id, buy_in, status,
          game_format:game_formats(name, icon, description, rules_summary, scoring_type, scope, team_based),
          round_game_players(id, side, trip_player:trip_players(id, player:players(name)))
        `)
        .in('course_id', courseIds)
        .neq('status', 'cancelled')
    : { data: [] }

  type EnrichedGame = {
    name: string; icon: string; buy_in: number
    description: string | null; rules_summary: string | null
    scoring_type: string | null; scope: string | null; team_based: boolean
    players: { name: string; side: string | null }[]
  }
  const gamesByCourse: Record<string, EnrichedGame[]> = {}
  for (const g of roundGames ?? []) {
    if (!gamesByCourse[g.course_id]) gamesByCourse[g.course_id] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fmt: any = Array.isArray(g.game_format) ? g.game_format[0] : g.game_format
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const players = ((g as any).round_game_players ?? []).map((rgp: any) => {
      const tp = Array.isArray(rgp.trip_player) ? rgp.trip_player[0] : rgp.trip_player
      const p = tp ? (Array.isArray(tp.player) ? tp.player[0] : tp.player) : null
      return { name: p?.name || 'Unknown', side: rgp.side as string | null }
    })
    gamesByCourse[g.course_id].push({
      name: fmt?.name || 'Game',
      icon: fmt?.icon || '🎯',
      buy_in: g.buy_in ?? 0,
      description: fmt?.description || null,
      rules_summary: fmt?.rules_summary || null,
      scoring_type: fmt?.scoring_type || null,
      scope: fmt?.scope || null,
      team_based: fmt?.team_based ?? false,
      players,
    })
  }

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

  // Fetch trip players with profiles for roster
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

  // Check if current user is trip admin/owner
  const { data: { user } } = await supabase.auth.getUser()
  let isAdmin = false
  if (user) {
    const { data: membership } = await supabase
      .from('trip_members')
      .select('role')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .single()
    isAdmin = membership?.role === 'owner' || membership?.role === 'admin'
  }

  // Compute countdown & detect today's course
  const today = new Date().toISOString().split('T')[0]
  const todaysCourse = (courses as Course[] ?? []).find(c => c.round_date === today) ?? null

  const firstRoundDate = (courses as Course[] ?? [])
    .filter(c => c.round_date)
    .sort((a, b) => (a.round_date! > b.round_date! ? 1 : -1))[0]?.round_date

  let daysUntilTrip: number | null = null
  if (firstRoundDate && firstRoundDate > today) {
    const diff = new Date(firstRoundDate).getTime() - new Date(today).getTime()
    daysUntilTrip = Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  // Auto-detect default tab
  const tripStatus = (trip as Trip).status
  let defaultTab: 'plan' | 'play' | 'review' = 'review'
  if (tripStatus === 'setup') {
    defaultTab = 'plan'
  } else if (todaysCourse) {
    defaultTab = 'play'
  }

  // Serialize courses for tabs (strip holes, not needed in tabs)
  const coursesForTabs = (courses as Course[] ?? []).map(c => ({
    id: c.id,
    name: c.name,
    par: c.par,
    round_number: c.round_number,
    round_date: c.round_date,
  }))

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
          {daysUntilTrip !== null && daysUntilTrip > 0 && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-golf-700/60 px-4 py-1.5 text-sm font-medium">
              <span className="text-2xl font-bold text-white">{daysUntilTrip}</span>
              <span className="text-golf-200">{daysUntilTrip === 1 ? 'day' : 'days'} until tee time</span>
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6">
        <TripTabs
          tripId={tripId}
          defaultTab={defaultTab}
          roster={roster}
          courses={coursesForTabs}
          gamesByCourse={gamesByCourse}
          isAdmin={isAdmin}
          todaysCourse={todaysCourse ? {
            id: todaysCourse.id,
            name: todaysCourse.name,
            par: todaysCourse.par,
            round_number: todaysCourse.round_number,
            round_date: todaysCourse.round_date,
          } : null}
          teamStandings={teamStandings}
          activeMatches={activeMatches}
          totalMatches={totalMatches}
          completedMatches={completedMatches}
          activityFeed={(activityFeed || []).map(item => ({
            id: item.id,
            event_type: item.event_type,
            title: item.title,
            detail: item.detail,
            icon: item.icon,
            created_at: item.created_at,
          }))}
        />
      </div>
    </div>
  )
}
