'use client'

import { useState } from 'react'
import Link from 'next/link'
import BottomNav from '@/components/BottomNav'
import GroupsSection from './components/GroupsSection'
import UpcomingRounds from './components/UpcomingRounds'
import PersonalStats from './components/PersonalStats'
import OutstandingBalances from './components/OutstandingBalances'
import RecentActivity from './components/RecentActivity'
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

type GroupWithRole = {
  id: string
  name: string
  description: string | null
  role: string
}

type GroupMemberInfo = {
  user_id: string
  role: string
  display_name: string | null
}

interface HomeClientProps {
  defaultTab: Tab
  displayName: string
  // Plan
  groups: GroupWithRole[]
  trips: TripWithRole[]
  groupMembersMap: Record<string, GroupMemberInfo[]>
  userId: string
  pendingInvites: { id: string; token: string; trip_name: string }[]
  isNewUser: boolean
  // Play
  upcomingRounds: {
    trip_id: string
    trip_name: string
    course_name: string
    course_id: string
    round_date: string
  }[]
  hasRoundToday: boolean
  // Review
  totalRounds: number
  totalWinnings: number
  bestGross: number | null
  tripsCount: number
  balances: { player_name: string; amount: number }[]
  recentActivity: {
    id: string
    money: number
    points: number
    game_name: string | null
    computed_at: string
  }[]
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
      {/* Pending invites - always visible */}
      <PendingInvites invites={props.pendingInvites} />
      {props.pendingInvites.length > 0 && <div className="mb-4" />}

      {/* Tab Content */}
      {activeTab === 'plan' && <PlanSection {...props} />}
      {activeTab === 'play' && <PlaySection {...props} />}
      {activeTab === 'review' && <ReviewSection {...props} />}

      {/* Bottom padding for nav */}
      <div className="pb-20" />

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </>
  )
}

function PlanSection({ groups, trips, groupMembersMap, userId }: HomeClientProps) {
  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/admin/trips/new"
          className="flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-4 text-sm font-semibold text-golf-700 shadow-sm hover:bg-golf-50 transition"
        >
          New Trip
        </Link>
        <Link
          href="/join/code"
          className="flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-4 text-sm font-semibold text-golf-700 shadow-sm hover:bg-golf-50 transition"
        >
          Join with Code
        </Link>
      </div>

      {/* Groups + Trips */}
      <GroupsSection
        groups={groups}
        trips={trips}
        groupMembersMap={groupMembersMap}
        userId={userId}
      />
    </div>
  )
}

function PlaySection({ upcomingRounds, hasRoundToday }: HomeClientProps) {
  return (
    <div className="space-y-6">
      {/* Quick Round */}
      <Link
        href="/quick-round"
        className="flex items-center justify-center gap-2 rounded-xl bg-green-600 py-5 text-lg font-bold text-white shadow-lg active:bg-green-700 transition"
      >
        <span className="text-2xl">&#9971;</span>
        Quick Round
      </Link>

      {/* Upcoming Rounds */}
      <UpcomingRounds rounds={upcomingRounds} />

      {/* Empty state */}
      {upcomingRounds.length === 0 && !hasRoundToday && (
        <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-8 text-center">
          <p className="text-sm text-gray-500">
            No upcoming rounds. Create a trip and schedule some rounds to get started.
          </p>
        </div>
      )}
    </div>
  )
}

function ReviewSection({ totalRounds, totalWinnings, bestGross, tripsCount, balances, recentActivity }: HomeClientProps) {
  return (
    <div className="space-y-6">
      <PersonalStats
        totalRounds={totalRounds}
        totalWinnings={totalWinnings}
        bestGross={bestGross}
        tripsCount={tripsCount}
      />
      <OutstandingBalances balances={balances} />
      <RecentActivity activity={recentActivity} />
    </div>
  )
}

function NewUserOnboarding() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-10 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-golf-100">
        <svg width="32" height="32" viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="14" r="13" stroke="#1a3260" strokeWidth="2" fill="none" />
          <line x1="10" y1="6" x2="10" y2="22" stroke="#1a3260" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M10 6 L20 10 L10 14 Z" fill="#1a3260" />
          <circle cx="10" cy="22" r="1.5" fill="#1a3260" />
        </svg>
      </div>
      <h2 className="mb-2 text-xl font-bold text-gray-900">Welcome to ForeLive!</h2>
      <p className="mb-6 text-gray-500">Get started by creating your first golf trip or joining one with a code.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/quick-round"
          className="rounded-md bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700"
        >
          Quick Round
        </Link>
        <Link
          href="/admin/trips/new"
          className="rounded-md bg-golf-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-golf-800"
        >
          Create a Trip
        </Link>
        <Link
          href="/join/code"
          className="rounded-md border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Join with Code
        </Link>
      </div>
    </div>
  )
}
