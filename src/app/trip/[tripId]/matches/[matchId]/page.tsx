import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Trip, Hole, Score, MatchPlayer, PlayerCourseHandicap } from '@/lib/types'
import type { MatchFormat } from '@/lib/types'
import MatchDetailClient from './match-detail-client'

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ tripId: string; matchId: string }>
}) {
  const { tripId, matchId } = await params
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

  // Fetch match with match_players
  const { data: match, error: matchError } = await supabase
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
            name,
            email,
            phone,
            handicap_index,
            created_at
          )
        )
      )
    `)
    .eq('id', matchId)
    .single()

  if (matchError || !match) {
    notFound()
  }

  // Fetch course with holes
  const { data: course } = await supabase
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
    .eq('id', match.course_id)
    .single()

  if (!course) {
    notFound()
  }

  // Fetch scores for this match
  const { data: scores } = await supabase
    .from('scores')
    .select('*')
    .eq('match_id', matchId)

  // Fetch course handicaps for the players in this match
  const tripPlayerIds = (match.match_players ?? []).map(
    (mp: { trip_player_id: string }) => mp.trip_player_id
  )
  const { data: courseHandicaps } = tripPlayerIds.length > 0
    ? await supabase
        .from('player_course_handicaps')
        .select('*')
        .eq('course_id', match.course_id)
        .in('trip_player_id', tripPlayerIds)
    : { data: [] }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-golf-800 px-4 py-4 text-white shadow-md">
        <div className="mx-auto max-w-2xl">
          <Link
            href={`/trip/${tripId}/matches`}
            className="mb-1 inline-block text-sm text-golf-300 hover:text-gold"
          >
            &larr; All Matches
          </Link>
          <h1 className="text-xl font-bold">{course.name}</h1>
          <p className="text-sm text-golf-200">
            {(trip as Trip).name} &middot; Round {course.round_number}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6">
        <MatchDetailClient
          matchId={matchId}
          courseName={course.name}
          coursePar={course.par}
          format={match.format as MatchFormat}
          pointValue={match.point_value}
          initialStatus={match.status as 'pending' | 'in_progress' | 'completed'}
          holes={(course.holes ?? []) as Hole[]}
          matchPlayers={(match.match_players ?? []) as unknown as MatchPlayer[]}
          initialScores={(scores ?? []) as Score[]}
          courseHandicaps={(courseHandicaps ?? []) as PlayerCourseHandicap[]}
        />
      </div>
    </div>
  )
}
