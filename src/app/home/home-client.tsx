'use client'

import { useState } from 'react'
import Link from 'next/link'
import BottomNav from '@/components/BottomNav'
import PendingInvites from './components/PendingInvites'

type Tab = 'plan' | 'play' | 'review'

type TripWithRole = {
  id: string
  name: string
  location: string | null
  year: number
  status: string
  role: string
  group_id: string | null
}

interface UpcomingRound {
  trip_id: string
  trip_name: string
  course_name: string
  course_id: string
  round_date: string
}

interface HomeClientProps {
  defaultTab: Tab
  // Plan
  trips: TripWithRole[]
  pendingInvites: { id: string; token: string; trip_name: string }[]
  isNewUser: boolean
  // Play
  upcomingRounds: UpcomingRound[]
  hasRoundToday: boolean
  // Review
  totalRounds: number
  totalWinnings: number
  bestGross: number | null
  tripsCount: number
  balances: { player_name: string; amount: number }[]
}

export default function HomeClient(props: HomeClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>(props.defaultTab)

  if (props.isNewUser) {
    return (
      <>
        <NewUserOnboarding />
        <div className="pb-20" />
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </>
    )
  }

  return (
    <>
      <PendingInvites invites={props.pendingInvites} />
      {props.pendingInvites.length > 0 && <div className="mb-4" />}

      {activeTab === 'plan' && <PlanSection {...props} />}
      {activeTab === 'play' && <PlaySection {...props} />}
      {activeTab === 'review' && <ReviewSection {...props} />}

      <div className="pb-20" />
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </>
  )
}

// ---------------------------------------------------------------------------
// PLAN — trips as tappable cards + floating action button
// ---------------------------------------------------------------------------

function PlanSection({ trips }: HomeClientProps) {
  const [showActions, setShowActions] = useState(false)

  return (
    <div className="space-y-3">
      {trips.length > 0 ? (
        trips.map(trip => <TripCard key={trip.id} trip={trip} />)
      ) : (
        <div className="rounded-lg border-2 border-dashed border-gray-200 bg-white p-8 text-center">
          <p className="text-sm text-gray-500">No trips yet. Tap + to get started.</p>
        </div>
      )}

      {/* FAB */}
      <div className="fixed bottom-20 right-4 z-40">
        {showActions && (
          <div className="mb-2 flex flex-col gap-2 items-end">
            <Link
              href="/admin/trips/new"
              className="rounded-full bg-golf-700 px-4 py-2 text-sm font-medium text-white shadow-lg hover:bg-golf-800"
            >
              New Trip
            </Link>
            <Link
              href="/join/code"
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-golf-700 shadow-lg border border-gray-200 hover:bg-gray-50"
            >
              Join with Code
            </Link>
          </div>
        )}
        <button
          onClick={() => setShowActions(!showActions)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-golf-700 text-white shadow-lg hover:bg-golf-800 transition-transform active:scale-95"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" className={`transition-transform origin-center ${showActions ? 'rotate-45' : ''}`} />
            <line x1="5" y1="12" x2="19" y2="12" className={`transition-transform origin-center ${showActions ? 'rotate-45' : ''}`} />
          </svg>
        </button>
      </div>
    </div>
  )
}

function TripCard({ trip }: { trip: TripWithRole }) {
  const statusColors: Record<string, string> = {
    active: 'border-l-green-500',
    completed: 'border-l-gray-400',
    setup: 'border-l-yellow-500',
  }

  return (
    <Link
      href={`/trip/${trip.id}`}
      className={`block rounded-lg border border-gray-200 border-l-4 ${statusColors[trip.status] || 'border-l-gray-300'} bg-white p-4 shadow-sm active:bg-gray-50 transition`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-gray-900">{trip.name}</p>
          <p className="text-sm text-gray-500">
            {trip.location || 'Location TBD'}
            {trip.year ? ` · ${trip.year}` : ''}
          </p>
        </div>
        <span className="text-gray-300">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </span>
      </div>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// PLAY — dead simple: one big button or upcoming round
// ---------------------------------------------------------------------------

function PlaySection({ upcomingRounds }: HomeClientProps) {
  const today = new Date().toISOString().split('T')[0]
  const todaysRound = upcomingRounds.find(r => r.round_date === today)
  const futureRounds = upcomingRounds.filter(r => r.round_date !== today)

  return (
    <div className="space-y-4">
      {/* Today's round — big CTA */}
      {todaysRound ? (
        <Link
          href={`/trip/${todaysRound.trip_id}/live/${todaysRound.course_id}`}
          className="flex flex-col items-center justify-center gap-1 rounded-xl bg-green-600 py-8 text-white shadow-lg active:bg-green-700 transition"
        >
          <span className="text-4xl">&#9971;</span>
          <span className="text-xl font-bold">Go Score</span>
          <span className="text-sm text-green-100">{todaysRound.course_name}</span>
        </Link>
      ) : (
        <Link
          href="/quick-round"
          className="flex flex-col items-center justify-center gap-1 rounded-xl bg-green-600 py-8 text-white shadow-lg active:bg-green-700 transition"
        >
          <span className="text-4xl">&#9971;</span>
          <span className="text-xl font-bold">Quick Round</span>
          <span className="text-sm text-green-100">Score a round right now</span>
        </Link>
      )}

      {/* Next upcoming rounds */}
      {futureRounds.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 px-1">Coming Up</p>
          {futureRounds.map((round, i) => (
            <Link
              key={`${round.trip_id}-${round.course_id}-${i}`}
              href={`/trip/${round.trip_id}`}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 active:bg-gray-50 transition"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{round.course_name}</p>
                <p className="text-xs text-gray-500">{round.trip_name}</p>
              </div>
              <span className="rounded-full bg-golf-100 px-2.5 py-0.5 text-xs font-medium text-golf-800">
                {formatCountdown(round.round_date)}
              </span>
            </Link>
          ))}
        </div>
      )}

      {!todaysRound && futureRounds.length === 0 && (
        <p className="text-center text-sm text-gray-400 py-4">
          No upcoming rounds scheduled.
        </p>
      )}
    </div>
  )
}

function formatCountdown(dateStr: string): string {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T00:00:00')
  const days = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (days === 1) return 'Tomorrow'
  return `${days} days`
}

// ---------------------------------------------------------------------------
// REVIEW — compact stats + balances, no activity feed
// ---------------------------------------------------------------------------

function ReviewSection({ totalRounds, totalWinnings, bestGross, tripsCount, balances }: HomeClientProps) {
  const youOwe = balances.filter(b => b.amount < 0)
  const owedToYou = balances.filter(b => b.amount > 0)

  return (
    <div className="space-y-4">
      {/* Compact stat grid */}
      <div className="grid grid-cols-4 gap-2">
        <StatCell label="Trips" value={tripsCount.toString()} />
        <StatCell label="Rounds" value={totalRounds.toString()} />
        <StatCell
          label="Winnings"
          value={totalWinnings >= 0 ? `+$${totalWinnings.toFixed(0)}` : `-$${Math.abs(totalWinnings).toFixed(0)}`}
          color={totalWinnings >= 0 ? 'text-green-600' : 'text-red-600'}
        />
        <StatCell label="Best" value={bestGross ? bestGross.toString() : '--'} />
      </div>

      {/* Balances */}
      {balances.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Balances</p>
          </div>
          <ul className="divide-y divide-gray-100">
            {owedToYou.map(b => (
              <li key={b.player_name} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-sm text-gray-700">{b.player_name}</span>
                <span className="text-sm font-semibold text-green-600">+${b.amount.toFixed(0)}</span>
              </li>
            ))}
            {youOwe.map(b => (
              <li key={b.player_name} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-sm text-gray-700">{b.player_name}</span>
                <span className="text-sm font-semibold text-red-600">-${Math.abs(b.amount).toFixed(0)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {totalRounds === 0 && balances.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-200 bg-white p-8 text-center">
          <p className="text-sm text-gray-500">Play some rounds to see your stats here.</p>
        </div>
      )}
    </div>
  )
}

function StatCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 text-center shadow-sm">
      <p className={`text-lg font-bold ${color || 'text-gray-900'}`}>{value}</p>
      <p className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// New user
// ---------------------------------------------------------------------------

function NewUserOnboarding() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <svg width="48" height="48" viewBox="0 0 28 28" fill="none" className="mb-4">
        <circle cx="14" cy="14" r="13" stroke="#1a3260" strokeWidth="2" fill="none" />
        <line x1="10" y1="6" x2="10" y2="22" stroke="#1a3260" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M10 6 L20 10 L10 14 Z" fill="#1a3260" />
        <circle cx="10" cy="22" r="1.5" fill="#1a3260" />
      </svg>
      <h2 className="mb-2 text-xl font-bold text-gray-900">Welcome to ForeLive</h2>
      <p className="mb-8 text-sm text-gray-500 max-w-xs">Score rounds, track stats, and settle bets with your golf crew.</p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link
          href="/admin/trips/new"
          className="rounded-lg bg-golf-700 py-3 text-center text-sm font-semibold text-white hover:bg-golf-800"
        >
          Create a Trip
        </Link>
        <Link
          href="/join/code"
          className="rounded-lg border border-gray-300 py-3 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Join with Code
        </Link>
      </div>
    </div>
  )
}
