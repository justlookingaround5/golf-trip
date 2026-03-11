'use client'

// PROFILE TAB — My profile
// Sections: Map · Course Ratings · My Trips · Friends · Settings

import { useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  ME,
  STUB_PINS,
  STUB_FRIENDS,
  STUB_UPCOMING_TRIPS,
  STUB_PAST_TRIPS,
} from '@/lib/v2/stub-data'

// CourseMapV2 uses react-simple-maps, disable SSR
const CourseMapV2 = dynamic(() => import('@/components/v2/CourseMapV2'), { ssr: false })

// ─── Section wrappers ─────────────────────────────────────────────────────────

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  )
}

// ─── Course Ratings ───────────────────────────────────────────────────────────

function CourseRatings() {
  const rated = STUB_PINS
    .filter(p => p.rating != null)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))

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

// ─── My Trips ─────────────────────────────────────────────────────────────────

function TripRow({ trip, past }: { trip: (typeof STUB_PAST_TRIPS)[0]; past: boolean }) {
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

  if (!past) return <div key={trip.id}>{inner}</div>

  return (
    <Link key={trip.id} href={`/v2/trip/${trip.id}/leaderboard`}>
      {inner}
    </Link>
  )
}

function MyTrips() {
  return (
    <div className="space-y-3">
      {STUB_UPCOMING_TRIPS.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1">Upcoming</p>
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {STUB_UPCOMING_TRIPS.map(t => <TripRow key={t.id} trip={t} past={false} />)}
          </div>
        </div>
      )}
      {STUB_PAST_TRIPS.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1">Past</p>
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {STUB_PAST_TRIPS.map(t => <TripRow key={t.id} trip={t} past={true} />)}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Friends ──────────────────────────────────────────────────────────────────

function FriendsList() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {STUB_FRIENDS.map(f => (
        <Link
          key={f.id}
          href={`/v2/profile/${f.id}`}
          className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition border-b border-gray-100 last:border-b-0"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-golf-600 text-sm font-bold text-white shrink-0">
            {f.name[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">{f.name}</p>
            {f.handicap != null && (
              <p className="text-xs text-gray-400">HCP {f.handicap}</p>
            )}
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-gray-300 shrink-0">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <header className="bg-golf-800 px-4 pt-14 pb-8 text-white">
        <div className="mx-auto max-w-lg flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-golf-600 text-2xl font-bold text-white ring-2 ring-white/30 shrink-0">
            {ME.name[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold">{ME.name}</h1>
            <p className="text-sm text-golf-200 mt-0.5">
              {ME.handicap != null ? `HCP ${ME.handicap}` : 'No handicap set'}
            </p>
          </div>
          {/* Settings gear */}
          <Link
            href="/v2/settings"
            aria-label="Settings"
            className="shrink-0 text-golf-300 hover:text-white transition"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-6 space-y-8">
        <Section title="Map">
          <CourseMapV2 pins={STUB_PINS} />
        </Section>

        <Section title="Course Ratings">
          <CourseRatings />
        </Section>

        <Section title="My Trips">
          <MyTrips />
        </Section>

        <Section title="Friends">
          <FriendsList />
        </Section>
      </div>
    </div>
  )
}
