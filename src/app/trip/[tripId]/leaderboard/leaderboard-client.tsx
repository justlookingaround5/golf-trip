'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Leaderboard from '@/components/Leaderboard'
import type { PlayerStanding, MatchPlayRecord } from '@/lib/leaderboard'

interface LeaderboardClientProps {
  tripId: string
  initialGrossStandings: PlayerStanding[]
  initialNetStandings: PlayerStanding[]
  initialMatchPlayRecords: MatchPlayRecord[]
}

export default function LeaderboardClient({
  tripId,
  initialGrossStandings,
  initialNetStandings,
  initialMatchPlayRecords,
}: LeaderboardClientProps) {
  const [grossStandings, setGrossStandings] =
    useState<PlayerStanding[]>(initialGrossStandings)
  const [netStandings, setNetStandings] =
    useState<PlayerStanding[]>(initialNetStandings)
  const [matchPlayRecords, setMatchPlayRecords] =
    useState<MatchPlayRecord[]>(initialMatchPlayRecords)

  const refreshData = useCallback(async () => {
    try {
      const res = await fetch(`/api/trip/${tripId}/standings`)
      if (res.ok) {
        const data = await res.json()
        setGrossStandings(data.grossStandings)
        setNetStandings(data.netStandings)
        setMatchPlayRecords(data.matchPlayRecords)
      }
    } catch {
      // Silently fail on refresh
    }
  }, [tripId])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`trip-${tripId}-leaderboard`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scores' },
        () => {
          refreshData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tripId, refreshData])

  return (
    <Leaderboard
      grossStandings={grossStandings}
      netStandings={netStandings}
      matchPlayRecords={matchPlayRecords}
    />
  )
}
