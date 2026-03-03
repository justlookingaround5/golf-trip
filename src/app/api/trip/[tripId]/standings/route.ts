import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { Course, Score, Match, PlayerCourseHandicap, TripPlayer } from '@/lib/types'
import { calculateTeamStandings, calculateLeaderboard } from '@/lib/leaderboard'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params
  const supabase = await createClient()

  // Fetch trip players
  const { data: tripPlayers } = await supabase
    .from('trip_players')
    .select(`
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
    `)
    .eq('trip_id', tripId)

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

  // Fetch matches with match_players
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
            side
          )
        `)
        .in('course_id', courseIds)
    : { data: [] }

  // Fetch scores
  const matchIds = (matches ?? []).map((m) => m.id)
  const { data: scores } = matchIds.length > 0
    ? await supabase
        .from('scores')
        .select('*')
        .in('match_id', matchIds)
    : { data: [] }

  // Fetch course handicaps
  const { data: courseHandicaps } = courseIds.length > 0
    ? await supabase
        .from('player_course_handicaps')
        .select('*')
        .in('course_id', courseIds)
    : { data: [] }

  // Reshape teams
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

  const leaderboard = calculateLeaderboard({
    tripPlayers: (tripPlayers ?? []) as unknown as TripPlayer[],
    courses: (courses ?? []) as Course[],
    scores: (scores ?? []) as Score[],
    courseHandicaps: (courseHandicaps ?? []) as PlayerCourseHandicap[],
    matches: (matches ?? []) as Match[],
  })

  return NextResponse.json({
    teamStandings,
    grossStandings: leaderboard.grossStandings,
    netStandings: leaderboard.netStandings,
    matchPlayRecords: leaderboard.matchPlayRecords,
  })
}
