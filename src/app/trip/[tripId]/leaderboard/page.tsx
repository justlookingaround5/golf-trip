import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Trip, Course, Score, Match, PlayerCourseHandicap, TripPlayer } from '@/lib/types'
import { calculateLeaderboard } from '@/lib/leaderboard'
import LeaderboardClient from './leaderboard-client'

export default async function LeaderboardPage({
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

  // Fetch trip players with player info
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
    ? await supabase.from('scores').select('*').in('match_id', matchIds)
    : { data: [] }

  // Fetch course handicaps
  const { data: courseHandicaps } = courseIds.length > 0
    ? await supabase
        .from('player_course_handicaps')
        .select('*')
        .in('course_id', courseIds)
    : { data: [] }

  const leaderboard = calculateLeaderboard({
    tripPlayers: (tripPlayers ?? []) as unknown as TripPlayer[],
    courses: (courses ?? []) as Course[],
    scores: (scores ?? []) as Score[],
    courseHandicaps: (courseHandicaps ?? []) as PlayerCourseHandicap[],
    matches: (matches ?? []) as Match[],
  })

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <header className="bg-golf-800 px-4 py-4 text-white shadow-md">
        <div className="mx-auto max-w-2xl">
          <Link
            href={`/trip/${tripId}`}
            className="mb-1 inline-block text-sm text-golf-300 hover:text-gold"
          >
            &larr; Back to {(trip as Trip).name}
          </Link>
          <h1 className="text-xl font-bold">Leaderboard</h1>
          <p className="text-sm text-golf-200">
            {(trip as Trip).name} &middot; {(trip as Trip).year}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6">
        <LeaderboardClient
          tripId={tripId}
          initialGrossStandings={leaderboard.grossStandings}
          initialNetStandings={leaderboard.netStandings}
          initialMatchPlayRecords={leaderboard.matchPlayRecords}
        />
      </div>
    </div>
  )
}
