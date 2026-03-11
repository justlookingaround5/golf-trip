'use client'

// PAST TRIP LEADERBOARD PAGE
// Identical structure to the active-trip leaderboard on Home,
// but with readOnly=true so match cards are not tappable links.
// Linked from Profile > My Trips > Past trips.

import { use } from 'react'
import Link from 'next/link'
import PointLeaderboard from '@/components/v2/PointLeaderboard'
import {
  STUB_PAST_TRIPS,
  STUB_MATCHES,
  STUB_PLAYER_STATS,
  STUB_HOLE_STATS,
  STUB_EARNINGS,
} from '@/lib/v2/stub-data'

export default function TripLeaderboardPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = use(params)

  // STUB: look up past trip by id
  const trip = STUB_PAST_TRIPS.find(t => t.id === tripId) ?? {
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
            href="/v2/profile"
            className="mb-3 inline-flex items-center gap-1 text-sm text-golf-300 hover:text-white transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            My Trips
          </Link>
          <h1 className="text-xl font-bold">{trip.name}</h1>
          <div className="flex items-center gap-3 text-sm text-golf-200 mt-0.5">
            {trip.location && <span>{trip.location}</span>}
            {dateRange && <><span>·</span><span>{dateRange}</span></>}
            {trip.playerCount > 0 && <><span>·</span><span>{trip.playerCount} players</span></>}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-5">
        <PointLeaderboard
          tripId={trip.id}
          tripName={trip.name}
          readOnly={true}
          matches={STUB_MATCHES}
          playerStats={STUB_PLAYER_STATS}
          holeStats={STUB_HOLE_STATS}
          earnings={STUB_EARNINGS}
        />
      </div>
    </div>
  )
}
