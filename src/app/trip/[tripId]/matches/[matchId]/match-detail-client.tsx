'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import MatchScorecard from '@/components/MatchScorecard'
import type { Hole, Score, MatchPlayer, PlayerCourseHandicap, RoundScore } from '@/lib/types'
import type { MatchFormat } from '@/lib/types'

interface MatchDetailClientProps {
  matchId: string
  courseId: string
  tripPlayerIds: string[]
  courseName: string
  roundDate?: string
  coursePar: number
  format: MatchFormat
  pointValue: number
  initialStatus: 'pending' | 'in_progress' | 'completed'
  holes: Hole[]
  matchPlayers: MatchPlayer[]
  initialScores: Score[]
  initialRoundScores: RoundScore[]
  courseHandicaps: PlayerCourseHandicap[]
  hideFormat?: boolean
}

export default function MatchDetailClient({
  matchId,
  courseId,
  tripPlayerIds,
  courseName,
  roundDate,
  coursePar,
  format,
  pointValue,
  initialStatus,
  holes,
  matchPlayers,
  initialScores,
  initialRoundScores,
  courseHandicaps,
  hideFormat,
}: MatchDetailClientProps) {
  const [scores, setScores] = useState<Score[]>(initialScores)
  const [roundScores, setRoundScores] = useState<RoundScore[]>(initialRoundScores)
  const [status, setStatus] = useState(initialStatus)

  const refreshScores = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('round_scores')
        .select('id, course_id, trip_player_id, hole_id, gross_score, fairway_hit, gir, putts, created_at, updated_at')
        .eq('course_id', courseId)
        .in('trip_player_id', tripPlayerIds)

      if (data) {
        setScores(data.map(s => ({ ...s, match_id: matchId })) as Score[])
        setRoundScores(data as RoundScore[])
      }

      // Also check match status
      const { data: matchData } = await supabase
        .from('matches')
        .select('status')
        .eq('id', matchId)
        .single()

      if (matchData) {
        setStatus(matchData.status as 'pending' | 'in_progress' | 'completed')
      }
    } catch {
      // Silently fail on refresh
    }
  }, [matchId, courseId, tripPlayerIds])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`match-${matchId}-scores`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'round_scores',
          filter: `course_id=eq.${courseId}`,
        },
        () => {
          refreshScores()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [matchId, refreshScores])

  return (
    <MatchScorecard
      matchId={matchId}
      courseName={courseName}
      roundDate={roundDate}
      coursePar={coursePar}
      format={format}
      pointValue={pointValue}
      status={status}
      holes={holes}
      matchPlayers={matchPlayers}
      scores={scores}
      roundScores={roundScores}
      courseHandicaps={courseHandicaps}
      hideFormat={hideFormat}
    />
  )
}
