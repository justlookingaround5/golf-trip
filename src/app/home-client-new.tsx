'use client'

import { useState } from 'react'
import Link from 'next/link'

type TripStatus = 'active' | 'setup' | 'completed'

interface Trip {
  id: string
  name: string
  location: string | null
  year: number
  status: TripStatus
  role: string
}

interface ActiveRound {
  tripId: string
  tripName: string
  courseId: string
  courseName: string
  courseDate: string
  isQuickRound: boolean
}

interface HomeClientProps {
  trips: Trip[]
  activeRounds: ActiveRound[]
  pendingInvites: { id: string; token: string; tripName: string }[]
}

type TripTab = 'active' | 'upcoming' | 'past'

export default function HomeClient({ trips, activeRounds, pendingInvites }: HomeClientProps) {
  const [tripTab, setTripTab] = useState<TripTab>(() => {
    if (trips.some((t) => t.status === 'active')) return 'active'
    if (trips.some((t) => t.status === 'setup')) return 'upcoming'
    return 'past'
  })

  // Exclude trips that already have a live round card shown above
  const activeRoundTripIds = new Set(activeRounds.map((r) => r.tripId))
  const activeTrips = trips.filter((t) => t.status === 'active' && !activeRoundTripIds.has(t.id))
  const upcomingTrips = trips.filter((t) => t.status === 'setup')
  const pastTrips = trips.filter((t) => t.status === 'completed')

  const tabTrips =
    tripTab === 'active' ? activeTrips : tripTab === 'upcoming' ? upcomingTrips : pastTrips

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-golf-900 px-4 pt-14 pb-6 text-center">
        <div className="text-3xl font-bold tracking-tight">
          <span className="text-gold">Fore</span>
          <span className="text-white">Live</span>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-4 space-y-5">
        {/* Pending invites */}
        {pendingInvites.length > 0 && (
          <div className="space-y-2">
            {pendingInvites.map((inv) => (
              <Link
                key={inv.id}
                href={`/join/${inv.token}`}
                className="flex items-center justify-between rounded-xl bg-gold-light border border-gold/30 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">Trip invite</p>
                  <p className="text-xs text-gray-600">{inv.tripName}</p>
                </div>
                <span className="rounded-full bg-gold text-golf-950 text-xs font-bold px-3 py-1">
                  Accept
                </span>
              </Link>
            ))}
          </div>
        )}

        {/* Active round cards */}
        {activeRounds.map((round) => (
          <Link
            key={round.courseId}
            href={`/trip/${round.tripId}/live/${round.courseId}`}
            className="flex flex-col items-center gap-2 rounded-xl bg-green-600 py-7 text-white shadow-lg active:bg-green-700 transition"
          >
            <span className="text-4xl">&#9971;</span>
            <span className="text-xl font-bold">Live Scoring</span>
            <span className="text-sm text-green-100">{round.courseName}</span>
            <span className="text-xs text-green-200 mt-0.5">
              {round.isQuickRound ? 'Quick Round' : round.tripName}
            </span>
          </Link>
        ))}

        {/* My Trips */}
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-3">My Trips</h2>

          {/* Tab bar */}
          <div className="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1 mb-3">
            {(
              [
                { key: 'active', label: `Active${activeTrips.length > 0 ? ` (${activeTrips.length})` : ''}` },
                { key: 'upcoming', label: `Upcoming${upcomingTrips.length > 0 ? ` (${upcomingTrips.length})` : ''}` },
                { key: 'past', label: 'Past' },
              ] as { key: TripTab; label: string }[]
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTripTab(key)}
                className={`flex-1 rounded-md py-2 text-xs font-semibold transition-all ${
                  tripTab === key
                    ? 'bg-white dark:bg-gray-700 text-golf-700 dark:text-golf-400 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Trip list */}
          <div className="space-y-2">
            {tabTrips.length > 0 ? (
              tabTrips.map((trip) => <TripCard key={trip.id} trip={trip} />)
            ) : (
              <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-8 text-center">
                <p className="text-sm text-gray-400">
                  {tripTab === 'active'
                    ? 'No active trips right now.'
                    : tripTab === 'upcoming'
                      ? 'No upcoming trips. Create one below.'
                      : 'No past trips yet.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Start a Round — primary action, full width */}
        {activeRounds.length === 0 && (
          <Link
            href="/quick-round"
            className="flex items-center justify-center gap-3 w-full rounded-xl bg-golf-800 py-4 text-white font-semibold shadow-md hover:bg-golf-700 active:scale-95 transition"
          >
            <span className="text-xl">⛳</span>
            Start a Round
          </Link>
        )}

        {/* Trip management */}
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/admin/trips/new"
            className="flex flex-col items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-2 py-4 text-center shadow-sm hover:border-golf-400 hover:shadow-md transition active:scale-95"
          >
            <span className="text-2xl">✈️</span>
            <span className="text-xs font-semibold text-gray-700">Create a Trip</span>
          </Link>
          <Link
            href="/join"
            className="flex flex-col items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-2 py-4 text-center shadow-sm hover:border-golf-400 hover:shadow-md transition active:scale-95"
          >
            <span className="text-2xl">🔑</span>
            <span className="text-xs font-semibold text-gray-700">Join a Trip</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

function TripCard({ trip }: { trip: Trip }) {
  const accent: Record<string, string> = {
    active: 'border-l-green-500',
    setup: 'border-l-amber-400',
    completed: 'border-l-gray-300',
  }
  const badge: Record<string, { label: string; cls: string }> = {
    active: { label: 'Active', cls: 'bg-green-100 text-green-800' },
    setup: { label: 'Upcoming', cls: 'bg-amber-100 text-amber-800' },
    completed: { label: 'Past', cls: 'bg-gray-100 text-gray-600' },
  }
  const b = badge[trip.status] ?? badge.completed

  return (
    <Link
      href={`/trip/${trip.id}`}
      className={`flex items-center justify-between rounded-xl border border-gray-200 border-l-4 ${accent[trip.status] ?? 'border-l-gray-300'} bg-white px-4 py-3 shadow-sm active:bg-gray-50 transition`}
    >
      <div className="min-w-0">
        <p className="font-semibold text-gray-900 truncate">{trip.name}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {trip.location || 'Location TBD'}
          {trip.year ? ` · ${trip.year}` : ''}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-3">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${b.cls}`}>
          {b.label}
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-gray-300">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </Link>
  )
}
