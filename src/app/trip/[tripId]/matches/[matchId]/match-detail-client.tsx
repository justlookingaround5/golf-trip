'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import MatchScorecard from '@/components/MatchScorecard'
import type { Hole, Score, MatchPlayer, PlayerCourseHandicap } from '@/lib/types'
import type { MatchFormat } from '@/lib/types'

interface MatchDetailClientProps {
  matchId: string
  courseName: string
  coursePar: number
  format: MatchFormat
  pointValue: number
  initialStatus: 'pending' | 'in_progress' | 'completed'
  holes: Hole[]
  matchPlayers: MatchPlayer[]
  initialScores: Score[]
  courseHandicaps: PlayerCourseHandicap[]
}

export default function MatchDetailClient({
  matchId,
  courseName,
  coursePar,
  format,
  pointValue,
  initialStatus,
  holes,
  matchPlayers,
  initialScores,
  courseHandicaps,
}: MatchDetailClientProps) {
  const [scores, setScores] = useState<Score[]>(initialScores)
  const [status, setStatus] = useState(initialStatus)

  const refreshScores = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('scores')
        .select('*')
        .eq('match_id', matchId)

      if (data) {
        setScores(data as Score[])
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
  }, [matchId])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`match-${matchId}-scores`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scores',
          filter: `match_id=eq.${matchId}`,
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
      coursePar={coursePar}
      format={format}
      pointValue={pointValue}
      status={status}
      holes={holes}
      matchPlayers={matchPlayers}
      scores={scores}
      courseHandicaps={courseHandicaps}
    />
  )
}
