'use client'

// FRIEND PROFILE PAGE
// Sections: Map · Course Ratings · Trips

import { use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { STUB_FRIENDS, STUB_PINS, STUB_PAST_TRIPS, STUB_UPCOMING_TRIPS } from '@/lib/v2/stub-data'
import type { TripV2 } from '@/lib/v2/types'

const CourseMapV2 = dynamic(() => import('@/components/v2/CourseMapV2'), { ssr: false })

// ─── Trip row ──────────────────────────────────────────────────────────────────

function TripRow({ trip, past }: { trip: TripV2; past: boolean }) {
  const start = trip.startDate
    ? new Date(trip.startDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null
  const end = trip.endDate
    ? new Date(trip.endDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null
  const dateLabel = start && end ? `${start} – ${end}` : start ?? '—'

  const inner = (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900 truncate">{trip.name}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {trip.location && <>{trip.location} · </>}
          {dateLabel} · {trip.playerCount} players
        </p>
      </div>
      {past && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-gray-300 shrink-0 ml-3">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      )}
    </div>
  )

  if (!past) return <div>{inner}</div>
  return <Link href={`/v2/trip/${trip.id}/leaderboard?from=profile`}>{inner}</Link>
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function FriendProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params)
  const router = useRouter()

  const friend = STUB_FRIENDS.find(f => f.id === userId) ?? {
    id: userId,
    name: 'Player',
    avatarUrl: null,
    handicap: null,
    location: null,
  }

  const friendPins = [...STUB_PINS]

  const ratedById = new Map<string, typeof STUB_PINS[0]>()
  for (const p of STUB_PINS) {
    if (p.rating == null) continue
    const existing = ratedById.get(p.courseId)
    if (!existing || p.date > existing.date) ratedById.set(p.courseId, p)
  }
  const ratedPins = [...ratedById.values()]
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 10)

  // Only trips this friend is a member of
  const friendUpcoming = STUB_UPCOMING_TRIPS.filter(t => t.players.some(p => p.id === userId))
  const friendPast = STUB_PAST_TRIPS.filter(t => t.players.some(p => p.id === userId))

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <header className="bg-golf-800 px-4 pt-14 pb-6 text-white">
        <div className="mx-auto max-w-lg">
          <button
            onClick={() => router.back()}
            className="mb-4 inline-flex items-center gap-1 text-sm text-golf-300 hover:text-white transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Friends
          </button>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-golf-600 text-2xl font-bold text-white ring-2 ring-white/30 shrink-0">
              {friend.name[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold">{friend.name}</h1>
              <p className="text-xs text-golf-300 mt-0.5">{friend.handicap != null ? `HCP ${friend.handicap.toFixed(1)}` : 'No handicap'}</p>
              <Link href={`/v2/profile/${userId}/stats`} className="text-sm font-semibold text-golf-200 hover:text-white transition mt-0.5 inline-block">Stats</Link>
            </div>
            <Link href={`/v2/profile/${userId}/friends`} className="shrink-0 text-center hover:opacity-80 transition">
              <p className="text-2xl font-bold leading-none">{friend.friendCount ?? '—'}</p>
              <p className="text-xs text-golf-300 mt-1">Friends</p>
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-6 space-y-8">
        {/* 1 · Map */}
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-3">Map</h2>
          <CourseMapV2 pins={friendPins} />
        </div>

        {/* 2 · Course Ratings */}
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-3">Course Ratings</h2>
          {ratedPins.length > 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100 shadow-sm overflow-hidden">
              {ratedPins.map((p, i) => (
                <Link key={p.courseId} href={`/v2/course/${p.courseId}`} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition">
                  <span className="shrink-0 w-5 text-xs font-bold text-gray-400 tabular-nums text-right">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{p.courseName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(p.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <span className="shrink-0 ml-3 text-sm font-bold text-gray-900 tabular-nums">
                    {(p.rating ?? 0).toFixed(1)}
                  </span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-gray-300 shrink-0">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-6 text-center">
              <p className="text-sm text-gray-400">No course ratings yet.</p>
            </div>
          )}
        </div>

        {/* 3 · Trips */}
        {(friendUpcoming.length > 0 || friendPast.length > 0) && (
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-3">Trips</h2>
            <div className="space-y-3">
              {friendUpcoming.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1">Upcoming</p>
                  <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    {friendUpcoming.map(t => <TripRow key={t.id} trip={t} past={false} />)}
                  </div>
                </div>
              )}
              {friendPast.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1">Past</p>
                  <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    {friendPast.map(t => <TripRow key={t.id} trip={t} past={true} />)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
