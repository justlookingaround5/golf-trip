'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import type { MyProfileData } from '@/lib/v2/profile-data'
import type { TripV2, CoursePinV2 } from '@/lib/v2/types'

type HomeCourse = { name: string; latitude: number; longitude: number } | null

const CourseMapV2 = dynamic(() => import('@/components/v2/CourseMapV2'), { ssr: false })

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-base font-bold text-gray-900 mb-3">{title}</h2>
      {children}
    </div>
  )
}

function CourseRatings({ pins }: { pins: CoursePinV2[] }) {
  const byId = new Map<string, CoursePinV2>()
  for (const p of pins) {
    if (p.rating == null) continue
    const existing = byId.get(p.courseId)
    if (!existing || p.date > existing.date) byId.set(p.courseId, p)
  }
  const rated = [...byId.values()]
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 10)

  if (rated.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-6 text-center">
        <p className="text-sm text-gray-400">No course ratings yet. Rate a course after logging a round.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100 shadow-sm overflow-hidden">
      {rated.map((p, i) => (
        <div key={p.courseId} className="flex items-center gap-3 px-4 py-3">
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
        </div>
      ))}
    </div>
  )
}

function TripRow({ trip, past }: { trip: TripV2; past: boolean }) {
  const start = trip.startDate
    ? new Date(trip.startDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null
  const end = trip.endDate
    ? new Date(trip.endDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null
  const dateLabel = start && end ? `${start} – ${end}` : start ?? ''

  const inner = (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900 truncate">{trip.name}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {trip.location && <>{trip.location} · </>}
          {dateLabel}{dateLabel ? ' · ' : ''}{trip.playerCount} players
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
  return <Link href={`/trip/${trip.id}/leaderboard?from=profile`}>{inner}</Link>
}

export default function ProfileClient({ data }: { data: MyProfileData }) {
  const { me, friendCount, pins, upcomingTrips, pastTrips, homeCourse } = data

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="bg-golf-800 px-4 pt-14 pb-6 text-white">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-golf-600 text-2xl font-bold text-white ring-2 ring-white/30 shrink-0">
              {me.name[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold">
                {me.name}{me.handicap != null && <span className="font-normal text-golf-300"> ({me.handicap.toFixed(1)})</span>}
              </h1>
              {me.location && <p className="text-xs text-golf-300 mt-0.5">{me.location}</p>}
              <Link href="/stats" className="text-sm font-semibold text-golf-200 hover:text-white transition mt-0.5 inline-block">Stats</Link>
            </div>
            <Link href="/profile/friends" className="shrink-0 text-center hover:opacity-80 transition">
              <p className="text-2xl font-bold leading-none">{friendCount}</p>
              <p className="text-xs text-golf-300 mt-1">Friends</p>
            </Link>
            <Link href="/settings" className="shrink-0 ml-3 p-2 rounded-full hover:bg-golf-700/50 transition" aria-label="Settings">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-6 space-y-8">
        <Section title="Map">
          {pins.length > 0 ? (
            <CourseMapV2 pins={pins} homeCourse={homeCourse} />
          ) : (
            <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-6 text-center">
              <p className="text-sm text-gray-400">No courses played yet</p>
            </div>
          )}
        </Section>

        <Section title="Courses">
          <CourseRatings pins={pins} />
        </Section>

        <Section title="Trips">
          {upcomingTrips.length === 0 && pastTrips.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-6 text-center">
              <p className="text-sm text-gray-400">No trips yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingTrips.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1">Upcoming</p>
                  <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    {upcomingTrips.map(t => <TripRow key={t.id} trip={t} past={false} />)}
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1">Past</p>
                {pastTrips.length > 0 ? (
                  <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    {pastTrips.map(t => <TripRow key={t.id} trip={t} past={true} />)}
                  </div>
                ) : (
                  <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-6 text-center">
                    <p className="text-sm text-gray-400">No past trips yet</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}
