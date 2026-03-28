import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Trip, Hole, Score, MatchPlayer, PlayerCourseHandicap, RoundScore } from '@/lib/types'
import type { MatchFormat } from '@/lib/types'
import MatchDetailClient from './match-detail-client'

export default async function MatchDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string; matchId: string }>
  searchParams: Promise<{ rd?: string }>
}) {
  const { tripId, matchId } = await params
  const { rd } = await searchParams
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

  // Fetch course
  const { data: course } = await supabase
    .from('courses')
    .select('id, trip_id, name, slope, rating, par, round_number, round_date, created_at')
    .eq('id', match.course_id)
    .single()

  if (!course) {
    notFound()
  }

  // Fetch holes directly (nested selects can strip jsonb columns like yardage)
  const { data: holesData } = await supabase
    .from('holes')
    .select('id, course_id, hole_number, par, handicap_index, yardage')
    .eq('course_id', match.course_id)
    .order('hole_number')

  // Fetch scores from round_scores for the match's players and course
  const tripPlayerIds = (match.match_players ?? []).map(
    (mp: { trip_player_id: string }) => mp.trip_player_id
  )
  const { data: roundScores } = tripPlayerIds.length > 0
    ? await supabase
        .from('round_scores')
        .select('id, course_id, trip_player_id, hole_id, gross_score, fairway_hit, gir, putts, created_at, updated_at')
        .eq('course_id', match.course_id)
        .in('trip_player_id', tripPlayerIds)
    : { data: [] }
  const scores = (roundScores || []).map(s => ({ ...s, match_id: matchId }))

  // Fetch course handicaps for the players in this match
  const { data: courseHandicaps } = tripPlayerIds.length > 0
    ? await supabase
        .from('player_course_handicaps')
        .select('*')
        .eq('course_id', match.course_id)
        .in('trip_player_id', tripPlayerIds)
    : { data: [] }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <header className="bg-golf-800 px-4 py-4 text-white shadow-md">
        <div className="mx-auto max-w-2xl">
          <Link
            href={`/trip/${tripId}${rd ? `?rd=${rd}` : ''}`}
            className="inline-flex items-center gap-1 text-sm text-golf-300 hover:text-white transition-colors"
          >
            &larr; Leaderboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6">
        <MatchDetailClient
          matchId={matchId}
          courseId={match.course_id}
          tripPlayerIds={tripPlayerIds}
          courseName={course.name}
          roundDate={course.round_date}
          coursePar={course.par}
          format={match.format as MatchFormat}
          pointValue={match.point_value}
          initialStatus={match.status as 'pending' | 'in_progress' | 'completed'}
          holes={(holesData ?? []) as Hole[]}
          matchPlayers={(match.match_players ?? []) as unknown as MatchPlayer[]}
          initialScores={(scores ?? []) as Score[]}
          initialRoundScores={(roundScores ?? []) as RoundScore[]}
          courseHandicaps={(courseHandicaps ?? []) as PlayerCourseHandicap[]}
          hideFormat
        />
      </div>
    </div>
  )
}
