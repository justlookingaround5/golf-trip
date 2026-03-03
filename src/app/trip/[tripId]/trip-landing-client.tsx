'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import TeamStandings from '@/components/TeamStandings'
import type { TeamStanding } from '@/lib/leaderboard'

interface TripLandingClientProps {
  tripId: string
  initialTeamStandings: TeamStanding[]
}

export default function TripLandingClient({
  tripId,
  initialTeamStandings,
}: TripLandingClientProps) {
  const [teamStandings, setTeamStandings] = useState<TeamStanding[]>(initialTeamStandings)

  const refreshData = useCallback(async () => {
    try {
      const res = await fetch(`/api/trip/${tripId}/standings`)
      if (res.ok) {
        const data = await res.json()
        setTeamStandings(data.teamStandings)
      }
    } catch {
      // Silently fail on refresh - keep existing data
    }
  }, [tripId])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`trip-${tripId}-landing`)
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

  return <TeamStandings standings={teamStandings} />
}
