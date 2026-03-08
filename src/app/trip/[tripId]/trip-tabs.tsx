'use client'

import { useState } from 'react'
import Link from 'next/link'
import TeamStandings from '@/components/TeamStandings'
import type { TeamStanding } from '@/lib/leaderboard'
import PlanningSection from './planning-section'
import RoundGamePills from '@/components/RoundGamePills'

type Tab = 'plan' | 'play' | 'review'

interface EnrichedGame {
  name: string
  icon: string
  buy_in: number
  description: string | null
  rules_summary: string | null
  scoring_type: string | null
  scope: string | null
  team_based: boolean
  players: { name: string; side: string | null }[]
}

interface RosterPlayer {
  id: string
  name: string
  avatar_url: string | null
  handicap_index: number | null
  bio: string | null
}

interface CourseInfo {
  id: string
  name: string
  par: number
  round_number: number
  round_date: string | null
}

interface ActivityItem {
  id: string
  event_type: string
  title: string
  detail: string | null
  icon: string | null
  created_at: string
}

interface TripTabsProps {
  tripId: string
  defaultTab: Tab
  // Plan
  roster: RosterPlayer[]
  courses: CourseInfo[]
  gamesByCourse: Record<string, EnrichedGame[]>
  isAdmin: boolean
  // Play
  todaysCourse: CourseInfo | null
  teamStandings: TeamStanding[]
  activeMatches: number
  // Review
  totalMatches: number
  completedMatches: number
  activityFeed: ActivityItem[]
}

const TAB_CONFIG: { key: Tab; label: string }[] = [
  { key: 'plan', label: 'Plan' },
  { key: 'play', label: 'Play' },
  { key: 'review', label: 'Review' },
]

export default function TripTabs(props: TripTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>(props.defaultTab)

  return (
    <div>
      {/* Tab Bar */}
      <div className="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1 mb-6">
        {TAB_CONFIG.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 rounded-md py-2.5 text-sm font-semibold transition-all ${
              activeTab === key
                ? 'bg-white dark:bg-gray-700 text-golf-700 dark:text-golf-400 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'plan' && <PlanTab {...props} />}
      {activeTab === 'play' && <PlayTab {...props} />}
      {activeTab === 'review' && <ReviewTab {...props} />}
    </div>
  )
}

function PlanTab({ tripId, roster, courses, gamesByCourse, isAdmin }: TripTabsProps) {
  return (
    <div className="space-y-5">
      {/* The Crew */}
      {roster.length > 0 && (
        <Card title={`The Crew (${roster.length})`}>
          <div className="flex flex-wrap gap-3">
            {roster.map((player) => (
              <Link
                key={player.id}
                href={`/trip/${tripId}/players/${player.id}`}
                className="flex items-center gap-2 rounded-full bg-gray-50 dark:bg-gray-700 px-3 py-1.5 transition hover:bg-golf-50 dark:hover:bg-golf-900/30"
              >
                {player.avatar_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={player.avatar_url} alt="" className="h-6 w-6 rounded-full" />
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-golf-100 text-xs font-bold text-golf-800">
                    {player.name[0]?.toUpperCase()}
                  </div>
                )}
                <div>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{player.name}</span>
                  {player.handicap_index != null && (
                    <span className="ml-1 text-xs text-gray-500">({player.handicap_index})</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Rounds Schedule */}
      {courses.length > 0 && (
        <Card title="Rounds">
          <div className="space-y-2">
            {courses.map((course) => {
              const games = gamesByCourse[course.id] || []
              return (
                <div key={course.id} className="rounded-lg bg-gray-50 dark:bg-gray-700 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{course.name}</p>
                      <p className="text-xs text-gray-500">
                        Round {course.round_number}
                        {course.round_date && ` - ${course.round_date}`}
                      </p>
                    </div>
                    <p className="text-sm text-gray-500">Par {course.par}</p>
                  </div>
                  {games.length > 0 && <RoundGamePills games={games} />}
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Games Setup */}
      <Link
        href={`/trip/${tripId}/games`}
        className="flex items-center justify-center rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-4 text-sm font-medium text-golf-700 dark:text-golf-400 hover:bg-golf-50 dark:hover:bg-golf-900/30 transition"
      >
        Manage Games & Formats
      </Link>

      {/* Planning Section (admin only) */}
      {isAdmin && <PlanningSection tripId={tripId} />}
    </div>
  )
}

function PlayTab({ tripId, todaysCourse, teamStandings, activeMatches }: TripTabsProps) {
  return (
    <div className="space-y-5">
      {/* Live Scoring CTA */}
      {todaysCourse ? (
        <Link
          href={`/trip/${tripId}/live/${todaysCourse.id}`}
          className="flex flex-col items-center justify-center gap-2 rounded-xl bg-green-600 py-6 text-white shadow-lg active:bg-green-700 transition"
        >
          <span className="text-3xl">&#9971;</span>
          <span className="text-lg font-bold">Live Scoring</span>
          <span className="text-sm text-green-100">{todaysCourse.name}</span>
        </Link>
      ) : (
        <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center">
          <span className="text-4xl">&#9971;</span>
          <h3 className="mt-3 font-bold text-gray-900 dark:text-gray-100">No Round Today</h3>
          <p className="mt-1 text-sm text-gray-500">
            Live scoring appears here on game day.
          </p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <NavLink href={`/trip/${tripId}/leaderboard`} label="Leaderboard" />
        <NavLink href={`/trip/${tripId}/matches`} label={`Matches${activeMatches > 0 ? ` (${activeMatches} live)` : ''}`} />
      </div>

      {/* Team Standings */}
      {teamStandings.length > 0 && (
        <Card title="Team Standings">
          <TeamStandings standings={teamStandings} />
        </Card>
      )}
    </div>
  )
}

function ReviewTab({ tripId, totalMatches, completedMatches, activityFeed }: TripTabsProps) {
  return (
    <div className="space-y-5">
      {/* Key Links */}
      <div className="grid grid-cols-2 gap-3">
        <NavLink href={`/trip/${tripId}/leaderboard`} label="Leaderboard" />
        <NavLink href={`/trip/${tripId}/stats`} label="Stats & Awards" />
        <NavLink href={`/trip/${tripId}/settlement`} label="The Bank" />
        <NavLink href={`/trip/${tripId}/head-to-head`} label="Head-to-Head" />
      </div>

      {/* More */}
      <div className="flex gap-3">
        <NavLinkSmall href={`/trip/${tripId}/competition`} label="Ryder Cup" />
        <NavLinkSmall href={`/trip/${tripId}/dashboard`} label="Dashboard" />
        <NavLinkSmall href={`/trip/${tripId}/chat`} label="Trash Talk" />
      </div>

      {/* Match Summary */}
      {totalMatches > 0 && (
        <Card title="Matches">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-green-700">{completedMatches}</p>
              <p className="text-xs text-gray-500">Completed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">{totalMatches}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
          </div>
        </Card>
      )}

      {/* Activity Feed */}
      {activityFeed.length > 0 && (
        <Card title="Recent Activity">
          <div className="space-y-3">
            {activityFeed.map((item) => (
              <div key={item.id} className="flex items-start gap-3">
                <span className="mt-0.5 text-lg">{item.icon || '...'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.title}</p>
                  {item.detail && (
                    <p className="text-xs text-gray-500 truncate">{item.detail}</p>
                  )}
                </div>
                <span className="shrink-0 text-xs text-gray-400">
                  {formatRelativeTime(item.created_at)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

// Shared UI

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
        {title}
      </h3>
      {children}
    </div>
  )
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-4 text-sm font-semibold text-golf-700 dark:text-golf-400 shadow-sm transition hover:bg-golf-50 dark:hover:bg-golf-900/30"
    >
      {label}
    </Link>
  )
}

function NavLinkSmall({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex-1 flex items-center justify-center rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-xs font-medium text-gray-600 dark:text-gray-400 transition hover:bg-gray-50 dark:hover:bg-gray-700"
    >
      {label}
    </Link>
  )
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}
