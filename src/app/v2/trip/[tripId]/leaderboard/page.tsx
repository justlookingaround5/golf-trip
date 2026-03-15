'use client'

// TRIP LEADERBOARD PAGE
// Used for both active trip (linked from home) and past trips (linked from Profile).
// Shows team scores widget at top + full 4-tab leaderboard below.

import { use, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import PointLeaderboard from '@/components/v2/PointLeaderboard'
import TeamScoresCard from '@/components/v2/TeamScoresCard'
import {
  STUB_PAST_TRIPS,
  ACTIVE_TRIP,
  STUB_MATCHES,
  STUB_PLAYER_STATS,
  STUB_TRIP_ROUNDS,
  STUB_ROUND_SCORES,
  STUB_HOLE_STATS_BY_ROUND,
  STUB_SKINS_BY_ROUND,
  STUB_TRIP_EARNINGS,
  STUB_TEAMS,
} from '@/lib/v2/stub-data'

const backMap: Record<string, { href: string; label: string }> = {
  home:     { href: '/v2',                    label: 'Home'     },
  profile:  { href: '/v2/profile',            label: 'My Trips' },
  messages: { href: '/v2/messages?tab=trips', label: 'Messages' },
}

function TripLeaderboardContent({ tripId }: { tripId: string }) {
  const searchParams = useSearchParams()
  const from = searchParams.get('from') ?? ''
  const back = backMap[from] ?? { href: '/v2', label: 'Home' }

  const trip =
    STUB_PAST_TRIPS.find(t => t.id === tripId) ??
    (ACTIVE_TRIP.id === tripId ? ACTIVE_TRIP : null) ?? {
      id: tripId,
      name: 'Trip',
      location: null,
      startDate: null,
      endDate: null,
      status: 'completed' as const,
      playerCount: 0,
      players: [],
    }

  const dateRange = (() => {
    if (!trip.startDate && !trip.endDate) return null
    const start = trip.startDate
      ? new Date(trip.startDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : null
    const end = trip.endDate
      ? new Date(trip.endDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : null
    return [start, end].filter(Boolean).join(' – ')
  })()

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <header className="bg-golf-800 px-4 pt-14 pb-6 text-white">
        <div className="mx-auto max-w-lg">
          <Link
            href={back.href}
            className="mb-3 inline-flex items-center gap-1 text-sm text-golf-300 hover:text-white transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            {back.label}
          </Link>
          <h1 className="text-xl font-bold">{trip.name}</h1>
          <div className="flex items-center gap-3 text-sm text-golf-200 mt-0.5">
            {trip.location && <span>{trip.location}</span>}
            {dateRange && <><span>·</span><span>{dateRange}</span></>}
            {trip.playerCount > 0 && <><span>·</span><span>{trip.playerCount} players</span></>}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-5 space-y-4">
        {/* Team scores — no link since we're already on the leaderboard page */}
        <TeamScoresCard
          matches={STUB_MATCHES}
          tripId={trip.id}
          teams={STUB_TEAMS}
          showTeamDetail
        />

        {/* Full leaderboard widget */}
        <PointLeaderboard
          matches={STUB_MATCHES}
          rounds={STUB_TRIP_ROUNDS}
          players={trip.players}
          playerStats={STUB_PLAYER_STATS}
          roundScores={STUB_ROUND_SCORES}
          holeStatsByRound={STUB_HOLE_STATS_BY_ROUND}
          skinsByRound={STUB_SKINS_BY_ROUND}
          earnings={STUB_TRIP_EARNINGS}
          teams={STUB_TEAMS}
        />
      </div>
    </div>
  )
}

export default function TripLeaderboardPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = use(params)
  return (
    <Suspense>
      <TripLeaderboardContent tripId={tripId} />
    </Suspense>
  )
}
