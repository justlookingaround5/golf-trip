import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getRoundScorecard } from '@/lib/v2/scorecard-data'
import ScorecardViewer from '@/components/v2/ScorecardViewer'
import MatchDetailClient from '@/app/trip/[tripId]/matches/[matchId]/match-detail-client'
import type { Hole, Score, MatchPlayer, PlayerCourseHandicap, RoundScore, MatchFormat } from '@/lib/types'

export default async function GroupScorecardPage({ params, searchParams }: { params: Promise<{ roundId: string }>; searchParams: Promise<{ userId?: string }> }) {
  const { roundId } = await params
  const { userId } = await searchParams

  // roundId = courseId, optionally filtered to a user's group
  const scorecard = await getRoundScorecard(roundId, userId)

  const courseName = scorecard?.courseName ?? 'Scorecard'
  const date = scorecard?.date
    ? new Date(scorecard.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  // If the friend is in a match, fetch match data for MatchDetailClient
  let matchContent: React.ReactNode = null
  if (scorecard?.matchId) {
    const supabase = await createClient()
    const matchId = scorecard.matchId

    // Fetch match with match_players
    const { data: match } = await supabase
      .from('matches')
      .select(`
        id,
        course_id,
        format,
        point_value,
        status,
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

    if (match) {
      // Fetch holes with yardage
      const { data: holesData } = await supabase
        .from('holes')
        .select('id, course_id, hole_number, par, handicap_index, yardage')
        .eq('course_id', match.course_id)
        .order('hole_number')

      const tripPlayerIds = (match.match_players ?? []).map(
        (mp: { trip_player_id: string }) => mp.trip_player_id
      )

      // Fetch round_scores
      const { data: roundScores } = tripPlayerIds.length > 0
        ? await supabase
            .from('round_scores')
            .select('id, course_id, trip_player_id, hole_id, gross_score, fairway_hit, gir, putts, created_at, updated_at')
            .eq('course_id', match.course_id)
            .in('trip_player_id', tripPlayerIds)
        : { data: [] }
      const scores = (roundScores || []).map(s => ({ ...s, match_id: matchId }))

      // Fetch course handicaps
      const { data: courseHandicaps } = tripPlayerIds.length > 0
        ? await supabase
            .from('player_course_handicaps')
            .select('*')
            .eq('course_id', match.course_id)
            .in('trip_player_id', tripPlayerIds)
        : { data: [] }

      matchContent = (
        <MatchDetailClient
          matchId={matchId}
          courseId={match.course_id}
          tripPlayerIds={tripPlayerIds}
          courseName={courseName}
          roundDate={scorecard.date}
          coursePar={scorecard.par}
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
      )
    }
  }

  return (
    <div className="min-h-screen bg-background pb-44">
      <header className="bg-golf-800 px-4 py-4 text-white shadow-md">
        <div className="mx-auto max-w-2xl">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-golf-300 hover:text-white transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Home
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-5">
        {matchContent ? (
          matchContent
        ) : scorecard && scorecard.players.length > 0 ? (
          <ScorecardViewer scorecard={scorecard} />
        ) : (
          <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-6 text-center">
            <p className="text-sm text-gray-400">No scores recorded yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
