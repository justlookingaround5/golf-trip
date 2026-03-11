'use client'

// TRIP LEADERBOARD PAGE
// Used for both active trip (linked from home) and past trips (linked from Profile).
// Shows team/player standings at the top + full 4-tab leaderboard below.

import { use } from 'react'
import Link from 'next/link'
import PointLeaderboard from '@/components/v2/PointLeaderboard'
import {
  STUB_PAST_TRIPS,
  ACTIVE_TRIP,
  STUB_MATCHES,
  STUB_PLAYER_STATS,
  STUB_HOLE_STATS,
  STUB_EARNINGS,
} from '@/lib/v2/stub-data'
import type { PlayerLeaderboardStats } from '@/lib/v2/types'

// ─── Standings section ────────────────────────────────────────────────────────

function StandingsSection({ stats }: { stats: PlayerLeaderboardStats[] }) {
  const sorted = [...stats].sort((a, b) => b.points - a.points)
  const isTwoTeam = sorted.length === 2

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Standings</p>
      </div>

      {isTwoTeam ? (
        <div className="grid grid-cols-2 divide-x divide-gray-100">
          {sorted.map((s, i) => (
            <div key={s.player.id} className={`py-5 text-center ${i === 0 ? 'bg-white' : 'bg-white'}`}>
              <p className="text-4xl font-black text-golf-700 tabular-nums">
                {s.points % 1 === 0 ? s.points : s.points.toFixed(1)}
              </p>
              <p className="text-sm text-gray-500 mt-1">{s.player.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {s.matchRecord.wins}W–{s.matchRecord.losses}L–{s.matchRecord.ties}T
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {sorted.map((s, i) => (
            <div key={s.player.id} className="flex items-center gap-4 px-4 py-3">
              <span className="text-sm font-bold text-gray-400 w-5 tabular-nums shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{s.player.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {s.matchRecord.wins}W–{s.matchRecord.losses}L–{s.matchRecord.ties}T
                </p>
              </div>
              <span className="text-lg font-black text-golf-700 tabular-nums shrink-0">
                {s.points % 1 === 0 ? s.points : s.points.toFixed(1)}
                <span className="text-xs font-semibold text-gray-400 ml-1">pts</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TripLeaderboardPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = use(params)

  // Look up trip — check past trips first, then fall back to active trip
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

  const isActive = trip.status === 'active'

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
            href={isActive ? '/v2' : '/v2/profile'}
            className="mb-3 inline-flex items-center gap-1 text-sm text-golf-300 hover:text-white transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            {isActive ? 'Home' : 'My Trips'}
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
        {/* Standings */}
        <StandingsSection stats={STUB_PLAYER_STATS} />

        {/* Full 4-tab leaderboard */}
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
