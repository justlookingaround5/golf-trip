'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import TeamStandings from '@/components/TeamStandings'
import type { TeamStanding } from '@/lib/leaderboard'
import PlanningSection from './planning-section'
import RoundGamePills from '@/components/RoundGamePills'

// ── Types ──────────────────────────────────────────────────────────────────

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
  tripStatus: string // 'setup' | 'active' | 'completed'
  defaultTab: string
  // Shared
  roster: RosterPlayer[]
  courses: CourseInfo[]
  gamesByCourse: Record<string, EnrichedGame[]>
  isAdmin: boolean
  todaysCourse: CourseInfo | null
  teamStandings: TeamStanding[]
  activeMatches: number
  totalMatches: number
  completedMatches: number
  activityFeed: ActivityItem[]
}

// ── Main component ──────────────────────────────────────────────────────────

type InternalTab = 'points' | 'matches' | 'leaderboard' | 'stats' | 'skins' | 'money'

const INTERNAL_TABS: { key: InternalTab; label: string; emoji: string }[] = [
  { key: 'points', label: 'Points', emoji: '🏆' },
  { key: 'matches', label: 'Matches', emoji: '⚔️' },
  { key: 'leaderboard', label: 'Board', emoji: '📊' },
  { key: 'stats', label: 'Stats', emoji: '📈' },
  { key: 'skins', label: 'Skins', emoji: '💰' },
  { key: 'money', label: 'Money', emoji: '🏦' },
]

export default function TripTabs(props: TripTabsProps) {
  return (
    <Suspense fallback={<TripTabsInner {...props} initialTab="points" />}>
      <TripTabsWithSearchParams {...props} />
    </Suspense>
  )
}

function TripTabsWithSearchParams(props: TripTabsProps) {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab') as InternalTab | null
  const initialTab = tabParam && INTERNAL_TABS.find((t) => t.key === tabParam) ? tabParam : 'points'
  return <TripTabsInner {...props} initialTab={initialTab} />
}

function TripTabsInner(props: TripTabsProps & { initialTab: InternalTab }) {
  const { initialTab, ...rest } = props
  const [internalTab, setInternalTab] = useState<InternalTab>(initialTab)

  // Sync if initialTab changes (e.g. Suspense resolves with a URL param)
  useEffect(() => {
    setInternalTab(initialTab)
  }, [initialTab])

  // Upcoming/setup trips show a different view
  if (rest.tripStatus === 'setup') {
    return <UpcomingView {...rest} />
  }

  return (
    <div>
      {/* Live scoring banner — show when there's a round today */}
      {rest.todaysCourse && (
        <Link
          href={`/trip/${rest.tripId}/live/${rest.todaysCourse.id}`}
          className="mb-4 flex items-center gap-3 rounded-xl bg-green-600 px-5 py-4 text-white shadow-md active:bg-green-700 transition"
        >
          <span className="text-2xl">⛳</span>
          <div>
            <p className="font-bold">Live Scoring Active</p>
            <p className="text-sm text-green-100">{rest.todaysCourse.name}</p>
          </div>
          <svg className="ml-auto shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      )}

      {/* Internal tab bar */}
      <div className="flex overflow-x-auto scrollbar-hide gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-5">
        {INTERNAL_TABS.map(({ key, label, emoji }) => (
          <button
            key={key}
            onClick={() => setInternalTab(key)}
            className={`flex-shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              internalTab === key
                ? 'bg-white dark:bg-gray-700 text-golf-700 dark:text-golf-400 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <span className="text-base">{emoji}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {internalTab === 'points' && <PointsTab {...rest} />}
      {internalTab === 'matches' && <MatchesTab {...rest} />}
      {internalTab === 'leaderboard' && <LeaderboardTab {...rest} />}
      {internalTab === 'stats' && <StatsTab {...rest} />}
      {internalTab === 'skins' && <SkinsTab {...rest} />}
      {internalTab === 'money' && <MoneyTab {...rest} />}
    </div>
  )
}

// ── Upcoming (setup status) ────────────────────────────────────────────────

function UpcomingView({ tripId, roster, courses, gamesByCourse, isAdmin }: TripTabsProps) {
  return (
    <div className="space-y-5">
      {/* Setup checklist */}
      <Card title="Setup Checklist">
        <div className="space-y-2">
          <ChecklistRow done={courses.length > 0} label="Courses & dates" href={`/admin/trips/${tripId}/courses`} />
          <ChecklistRow done={roster.length > 0} label="Players invited" href={`/admin/trips/${tripId}/players`} locked={courses.length === 0} />
          <ChecklistRow done={false} label="Teams assigned" href={`/admin/trips/${tripId}/teams`} locked={roster.length === 0} />
          <ChecklistRow done={false} label="Matches created" href={`/admin/trips/${tripId}/matches`} locked={roster.length === 0} />
        </div>
      </Card>

      {/* The Crew */}
      {roster.length > 0 && (
        <Card title={`The Crew (${roster.length})`}>
          <div className="flex flex-wrap gap-2">
            {roster.map((player) => (
              <Link
                key={player.id}
                href={`/trip/${tripId}/players/${player.id}`}
                className="flex items-center gap-2 rounded-full bg-gray-50 dark:bg-gray-700 px-3 py-1.5 hover:bg-golf-50 transition"
              >
                {player.avatar_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={player.avatar_url} alt="" className="h-6 w-6 rounded-full" />
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-golf-100 text-xs font-bold text-golf-800">
                    {player.name[0]?.toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{player.name}</span>
                {player.handicap_index != null && (
                  <span className="text-xs text-gray-400">({player.handicap_index})</span>
                )}
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Rounds */}
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
                        {course.round_date && ` · ${course.round_date}`}
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

      <Link
        href={`/trip/${tripId}/games`}
        className="flex items-center justify-center rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-4 text-sm font-medium text-golf-700 dark:text-golf-400 hover:bg-golf-50 transition"
      >
        Manage Games & Formats
      </Link>

      {isAdmin && <PlanningSection tripId={tripId} />}
    </div>
  )
}

function ChecklistRow({
  done,
  label,
  href,
  locked = false,
}: {
  done: boolean
  label: string
  href: string
  locked?: boolean
}) {
  const content = (
    <div className={`flex items-center gap-3 ${locked ? 'opacity-40' : ''}`}>
      <div
        className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${
          done ? 'bg-green-500' : 'border-2 border-gray-300'
        }`}
      >
        {done && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>
      <span className={`text-sm ${done ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-gray-100'}`}>
        {label}
      </span>
      {!done && !locked && (
        <span className="ml-auto text-xs font-semibold text-golf-700">Set up →</span>
      )}
    </div>
  )

  if (done || locked) return <div className="py-1">{content}</div>

  return (
    <Link href={href} className="block py-1 hover:bg-golf-50 dark:hover:bg-golf-900/20 -mx-1 px-1 rounded transition">
      {content}
    </Link>
  )
}

// ── Points tab ──────────────────────────────────────────────────────────────

function PointsTab({ teamStandings, totalMatches, completedMatches }: TripTabsProps) {
  if (teamStandings.length === 0) {
    return (
      <EmptyTabState
        icon="🏆"
        title="No team standings yet"
        sub="Points will appear here once matches are played."
      />
    )
  }
  return (
    <div className="space-y-4">
      <Card title="Team Standings">
        <TeamStandings standings={teamStandings} />
      </Card>
      {totalMatches > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="Matches Played" value={completedMatches} />
          <StatTile label="Total Matches" value={totalMatches} />
        </div>
      )}
    </div>
  )
}

// ── Matches tab ──────────────────────────────────────────────────────────────

function MatchesTab({ tripId, totalMatches, completedMatches, activeMatches }: TripTabsProps) {
  return (
    <div className="space-y-4">
      {totalMatches > 0 ? (
        <>
          <div className="grid grid-cols-3 gap-2">
            <StatTile label="Live" value={activeMatches} accent="green" />
            <StatTile label="Done" value={completedMatches} />
            <StatTile label="Total" value={totalMatches} />
          </div>
          <Link
            href={`/trip/${tripId}/matches`}
            className="flex items-center justify-between rounded-xl border border-gray-200 bg-white dark:bg-gray-800 px-4 py-4 shadow-sm hover:border-golf-400 transition"
          >
            <span className="font-semibold text-gray-900 dark:text-gray-100">View All Matches</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-gray-400">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        </>
      ) : (
        <EmptyTabState icon="⚔️" title="No matches yet" sub="Matches will appear here once they're created." />
      )}
    </div>
  )
}

// ── Leaderboard tab ──────────────────────────────────────────────────────────

function LeaderboardTab({ tripId }: TripTabsProps) {
  return (
    <div className="space-y-3">
      <NavCard href={`/trip/${tripId}/leaderboard`} icon="📊" label="Full Leaderboard" sub="Gross, Net, and Match records" />
      <NavCard href={`/trip/${tripId}/head-to-head`} icon="🆚" label="Head-to-Head" sub="Player vs player comparison" />
      <NavCard href={`/trip/${tripId}/dashboard`} icon="📋" label="Dashboard" sub="Trip overview and totals" />
    </div>
  )
}

// ── Stats tab ────────────────────────────────────────────────────────────────

function StatsTab({ tripId }: TripTabsProps) {
  return (
    <div className="space-y-3">
      <NavCard href={`/trip/${tripId}/stats`} icon="📈" label="Player Stats & Awards" sub="Scoring averages, best rounds, achievements" />
      <NavCard href={`/trip/${tripId}/competition`} icon="🏌️" label="Ryder Cup" sub="Team competition standings" />
    </div>
  )
}

// ── Skins tab ────────────────────────────────────────────────────────────────

function SkinsTab({ tripId, courses }: TripTabsProps) {
  return (
    <div className="space-y-3">
      {courses.map((course) => (
        <NavCard
          key={course.id}
          href={`/trip/${tripId}/rounds/${course.id}/recap`}
          icon="💰"
          label={`${course.name} — Skins`}
          sub={`Round ${course.round_number}${course.round_date ? ` · ${course.round_date}` : ''}`}
        />
      ))}
      {courses.length === 0 && (
        <EmptyTabState icon="💰" title="No rounds yet" sub="Skins will appear once rounds are played." />
      )}
    </div>
  )
}

// ── Money tab ────────────────────────────────────────────────────────────────

function MoneyTab({ tripId }: TripTabsProps) {
  return (
    <div className="space-y-3">
      <NavCard href={`/trip/${tripId}/settlement`} icon="🏦" label="The Bank" sub="Payouts, winnings, and who owes what" />
    </div>
  )
}

// ── Shared UI ────────────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">{title}</h3>
      {children}
    </div>
  )
}

function StatTile({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent?: 'green'
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:bg-gray-800 p-4 text-center shadow-sm">
      <p className={`text-2xl font-black ${accent === 'green' ? 'text-green-600' : 'text-gray-900 dark:text-gray-100'}`}>
        {value}
      </p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}

function NavCard({
  href,
  icon,
  label,
  sub,
}: {
  href: string
  icon: string
  label: string
  sub: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-4 shadow-sm hover:border-golf-400 hover:shadow-md active:bg-gray-50 transition"
    >
      <span className="text-2xl">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 dark:text-gray-100">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5 truncate">{sub}</p>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-gray-300 shrink-0">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </Link>
  )
}

function EmptyTabState({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-10 text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <p className="font-semibold text-gray-700 dark:text-gray-300">{title}</p>
      <p className="text-sm text-gray-400 mt-1">{sub}</p>
    </div>
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

void formatRelativeTime // prevent unused warning — available for future activity feed use
