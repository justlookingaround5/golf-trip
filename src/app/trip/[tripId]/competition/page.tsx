import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import CompetitionClient from './competition-client'

export default async function CompetitionPage({
  params,
}: {
  params: Promise<{ tripId: string }>
}) {
  const { tripId } = await params
  const supabase = await createClient()

  const { data: trip } = await supabase
    .from('trips')
    .select('name')
    .eq('id', tripId)
    .single()

  if (!trip) notFound()

  // Fetch competition with teams
  const { data: competition } = await supabase
    .from('trip_competitions')
    .select(`
      id,
      name,
      format,
      team_a_id,
      team_b_id,
      win_points,
      tie_points,
      loss_points,
      status
    `)
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!competition) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-golf-800 px-4 py-6 text-white shadow-md">
          <div className="mx-auto max-w-2xl">
            <Link
              href={`/trip/${tripId}`}
              className="mb-1 inline-block text-sm text-golf-300 hover:text-white"
            >
              &larr; Back to {trip.name}
            </Link>
            <h1 className="text-2xl font-bold">Team Competition</h1>
          </div>
        </header>
        <div className="mx-auto max-w-2xl px-4 py-12 text-center text-gray-500">
          No team competition set up yet.
        </div>
      </div>
    )
  }

  // Fetch both teams with players
  const { data: teams } = await supabase
    .from('teams')
    .select(`
      id,
      name,
      color,
      abbreviation,
      captain_trip_player_id,
      team_players (
        trip_player:trip_players (
          id,
          player:players (name)
        )
      )
    `)
    .in('id', [competition.team_a_id, competition.team_b_id])

  const teamA = teams?.find((t) => t.id === competition.team_a_id)
  const teamB = teams?.find((t) => t.id === competition.team_b_id)

  // Fetch sessions with matches
  const { data: sessions } = await supabase
    .from('competition_sessions')
    .select(`
      id,
      name,
      session_type,
      course_id,
      session_order,
      status
    `)
    .eq('competition_id', competition.id)
    .order('session_order')

  const sessionIds = (sessions ?? []).map((s) => s.id)
  const { data: matches } = sessionIds.length > 0
    ? await supabase
        .from('competition_matches')
        .select(`
          id,
          session_id,
          team_a_player_1,
          team_a_player_2,
          team_b_player_1,
          team_b_player_2,
          result,
          winner,
          points_team_a,
          points_team_b,
          match_order,
          status
        `)
        .in('session_id', sessionIds)
        .order('match_order')
    : { data: [] }

  // Fetch player names for all referenced players
  const playerIds = new Set<string>()
  for (const m of matches ?? []) {
    playerIds.add(m.team_a_player_1)
    if (m.team_a_player_2) playerIds.add(m.team_a_player_2)
    playerIds.add(m.team_b_player_1)
    if (m.team_b_player_2) playerIds.add(m.team_b_player_2)
  }

  const playerNames = new Map<string, string>()
  if (playerIds.size > 0) {
    const { data: players } = await supabase
      .from('trip_players')
      .select('id, player:players(name)')
      .in('id', Array.from(playerIds))

    for (const tp of players ?? []) {
      const player = Array.isArray(tp.player) ? tp.player[0] : tp.player
      if (player) playerNames.set(tp.id, ((player as { name: string }).name).split(' ')[0])
    }
  }

  // Calculate totals
  let totalTeamA = 0
  let totalTeamB = 0
  for (const m of matches ?? []) {
    if (m.status === 'completed') {
      totalTeamA += Number(m.points_team_a)
      totalTeamB += Number(m.points_team_b)
    }
  }

  function getTeamPlayers(team: typeof teamA): string[] {
    if (!team?.team_players) return []
    return (team.team_players as unknown as { trip_player: { id: string; player: { name: string } | { name: string }[] } | { id: string; player: { name: string } | { name: string }[] }[] }[])
      .map((tp) => {
        const tripPlayer = Array.isArray(tp.trip_player) ? tp.trip_player[0] : tp.trip_player
        if (!tripPlayer) return null
        const p = Array.isArray(tripPlayer.player)
          ? tripPlayer.player[0]
          : tripPlayer.player
        return ((p as { name: string } | null)?.name ?? 'Unknown').split(' ')[0]
      })
      .filter(Boolean) as string[]
  }

  const sessionsWithMatches = (sessions ?? []).map((s) => ({
    ...s,
    matches: (matches ?? [])
      .filter((m) => m.session_id === s.id)
      .map((m) => ({
        ...m,
        team_a_player_1_name: playerNames.get(m.team_a_player_1) ?? 'TBD',
        team_a_player_2_name: m.team_a_player_2 ? (playerNames.get(m.team_a_player_2) ?? null) : null,
        team_b_player_1_name: playerNames.get(m.team_b_player_1) ?? 'TBD',
        team_b_player_2_name: m.team_b_player_2 ? (playerNames.get(m.team_b_player_2) ?? null) : null,
      })),
  }))

  return (
    <CompetitionClient
      tripId={tripId}
      tripName={trip.name}
      competitionName={competition.name}
      status={competition.status}
      teamA={{
        name: teamA?.name ?? 'Team A',
        color: (teamA as { color?: string })?.color ?? '#16a34a',
        abbreviation: (teamA as { abbreviation?: string })?.abbreviation ?? 'A',
        players: getTeamPlayers(teamA),
        totalPoints: totalTeamA,
      }}
      teamB={{
        name: teamB?.name ?? 'Team B',
        color: (teamB as { color?: string })?.color ?? '#dc2626',
        abbreviation: (teamB as { abbreviation?: string })?.abbreviation ?? 'B',
        players: getTeamPlayers(teamB),
        totalPoints: totalTeamB,
      }}
      sessions={sessionsWithMatches}
    />
  )
}
