'use client'

import { useState } from 'react'
import SimpleMarkdown from '@/components/SimpleMarkdown'

interface GameData {
  id: string
  course_id: string
  buy_in: number
  status: string
  name: string
  icon: string
  description: string | null
  rules_summary: string | null
  scoring_type: string | null
  scope: string | null
  team_based: boolean
  players: { name: string; side: string | null }[]
}

interface CourseData {
  id: string
  name: string
  round_number: number
  round_date: string | null
}

interface GamesClientProps {
  courses: CourseData[]
  games: GameData[]
}

export default function GamesClient({ courses, games }: GamesClientProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (games.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center">
        <span className="text-4xl">🎯</span>
        <p className="mt-3 text-sm text-gray-500">No games set up for this trip yet.</p>
      </div>
    )
  }

  // Group games by course
  const gamesByCourse: Record<string, GameData[]> = {}
  for (const g of games) {
    if (!gamesByCourse[g.course_id]) gamesByCourse[g.course_id] = []
    gamesByCourse[g.course_id].push(g)
  }

  return (
    <div className="space-y-6">
      {courses
        .filter((c) => (gamesByCourse[c.id] ?? []).length > 0)
        .map((course) => (
          <div key={course.id}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
              Round {course.round_number} &mdash; {course.name}
              {course.round_date && (
                <span className="ml-2 font-normal normal-case">{course.round_date}</span>
              )}
            </h2>
            <div className="space-y-2">
              {gamesByCourse[course.id].map((game) => {
                const isExpanded = expandedId === game.id
                return (
                  <GameCard
                    key={game.id}
                    game={game}
                    isExpanded={isExpanded}
                    onToggle={() => setExpandedId(isExpanded ? null : game.id)}
                  />
                )
              })}
            </div>
          </div>
        ))}
    </div>
  )
}

function GameCard({
  game,
  isExpanded,
  onToggle,
}: {
  game: GameData
  isExpanded: boolean
  onToggle: () => void
}) {
  const statusColors: Record<string, string> = {
    setup: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    finalized: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  }

  const teamAPlayers = game.players.filter((p) => p.side === 'team_a')
  const teamBPlayers = game.players.filter((p) => p.side === 'team_b')
  const unassigned = game.players.filter((p) => !p.side)

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
      {/* Collapsed header — always visible */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
      >
        <span className="text-xl shrink-0">{game.icon}</span>
        <div className="flex-1 min-w-0">
          <span className="font-medium text-gray-900 dark:text-gray-100">{game.name}</span>
          {game.buy_in > 0 && (
            <span className="ml-2 text-sm text-gray-500">${game.buy_in}</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {game.players.length > 0 && (
            <span className="text-xs text-gray-400">{game.players.length}p</span>
          )}
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[game.status] || statusColors.setup}`}>
            {game.status}
          </span>
          <svg
            className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-4 space-y-4">
          {/* Quick facts */}
          <div className="flex flex-wrap gap-2">
            {game.scope && (
              <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-blue-400">
                {game.scope === 'foursome' ? 'Foursome' : 'Group'}
              </span>
            )}
            {game.scoring_type && (
              <span className="inline-flex items-center rounded-full bg-purple-50 dark:bg-purple-900/30 px-2.5 py-1 text-xs font-medium text-purple-700 dark:text-purple-400">
                {game.scoring_type.charAt(0).toUpperCase() + game.scoring_type.slice(1).replace('_', ' ')}
              </span>
            )}
            {game.team_based && (
              <span className="inline-flex items-center rounded-full bg-orange-50 dark:bg-orange-900/30 px-2.5 py-1 text-xs font-medium text-orange-700 dark:text-orange-400">
                Team Game
              </span>
            )}
          </div>

          {/* Description */}
          {game.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400">{game.description}</p>
          )}

          {/* Rules */}
          {game.rules_summary && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Rules</h4>
              <SimpleMarkdown text={game.rules_summary} />
            </div>
          )}

          {/* Players */}
          {game.players.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                Players ({game.players.length})
              </h4>
              {game.team_based && (teamAPlayers.length > 0 || teamBPlayers.length > 0) ? (
                <div className="space-y-2">
                  {teamAPlayers.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Team A</p>
                      <div className="flex flex-wrap gap-1.5">
                        {teamAPlayers.map((p, i) => (
                          <span key={i} className="rounded-full bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 text-xs font-medium text-blue-800 dark:text-blue-300">
                            {p.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {teamBPlayers.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Team B</p>
                      <div className="flex flex-wrap gap-1.5">
                        {teamBPlayers.map((p, i) => (
                          <span key={i} className="rounded-full bg-red-50 dark:bg-red-900/30 px-2.5 py-1 text-xs font-medium text-red-800 dark:text-red-300">
                            {p.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {unassigned.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {unassigned.map((p, i) => (
                        <span key={i} className="rounded-full bg-gray-100 dark:bg-gray-700 px-2.5 py-1 text-xs font-medium text-gray-700 dark:text-gray-300">
                          {p.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {game.players.map((p, i) => (
                    <span key={i} className="rounded-full bg-gray-100 dark:bg-gray-700 px-2.5 py-1 text-xs font-medium text-gray-700 dark:text-gray-300">
                      {p.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
