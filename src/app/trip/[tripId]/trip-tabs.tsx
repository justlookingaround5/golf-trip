'use client'

import Link from 'next/link'
import TeamScoresCard from '@/components/v2/TeamScoresCard'
import PlanningSection from './planning-section'
import RoundGamePills from '@/components/RoundGamePills'
import PointLeaderboard from '@/components/v2/PointLeaderboard'
import type { TripLeaderboardData } from '@/lib/v2/trip-leaderboard-data'

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
  activeMatches: number
  totalMatches: number
  completedMatches: number
  activityFeed: ActivityItem[]
  leaderboardData: TripLeaderboardData
}

// ── Main component ──────────────────────────────────────────────────────────

export default function TripTabs(props: TripTabsProps) {
  // Upcoming/setup trips show a different view
  if (props.tripStatus === 'setup') {
    return <UpcomingView {...props} />
  }

  const { leaderboardData } = props

  return (
    <div className="space-y-4">
      {/* Live scoring banner — show when there's a round today */}
      {props.todaysCourse && (
        <Link
          href={`/trip/${props.tripId}/live/${props.todaysCourse.id}`}
          className="flex items-center gap-3 rounded-xl bg-green-600 px-5 py-4 text-white shadow-md active:bg-green-700 transition"
        >
          <span className="text-2xl">⛳</span>
          <div>
            <p className="font-bold">Live Scoring Active</p>
            <p className="text-sm text-green-100">{props.todaysCourse.name}</p>
          </div>
          <svg className="ml-auto shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      )}

      {/* Team Standings */}
      {leaderboardData.teams.length > 1 && (
        <TeamScoresCard
          matches={leaderboardData.matches}
          tripId={props.tripId}
          teams={leaderboardData.teams}
          showTeamDetail
        />
      )}

      {/* V2 Point Leaderboard widget */}
      <PointLeaderboard
        matches={leaderboardData.matches}
        rounds={leaderboardData.rounds}
        players={leaderboardData.players}
        playerStats={leaderboardData.playerStats}
        roundScores={leaderboardData.roundScores}
        holeStatsByRound={leaderboardData.holeStatsByRound}
        skinsByRound={leaderboardData.skinsByRound}
        earnings={leaderboardData.earnings}
        teams={leaderboardData.teams}
      />
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

// ── Shared UI ────────────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">{title}</h3>
      {children}
    </div>
  )
}

