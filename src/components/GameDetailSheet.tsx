'use client'

import { useEffect } from 'react'
import SimpleMarkdown from './SimpleMarkdown'

export interface GameDetail {
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

interface GameDetailSheetProps {
  game: GameDetail | null
  onClose: () => void
}

export default function GameDetailSheet({ game, onClose }: GameDetailSheetProps) {
  useEffect(() => {
    if (!game) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKey)
    }
  }, [game, onClose])

  if (!game) return null

  const scopeLabel = game.scope === 'foursome' ? 'Foursome' : game.scope === 'group' ? 'Group' : game.scope
  const scoringLabel = game.scoring_type
    ? game.scoring_type.charAt(0).toUpperCase() + game.scoring_type.slice(1).replace('_', ' ')
    : null

  const teamAPlayers = game.players.filter(p => p.side === 'team_a')
  const teamBPlayers = game.players.filter(p => p.side === 'team_b')
  const unassigned = game.players.filter(p => !p.side)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 transition-opacity"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative w-full max-w-lg rounded-t-2xl bg-white dark:bg-gray-800 shadow-xl animate-in slide-in-from-bottom duration-200 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{game.icon}</span>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{game.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-5 py-4 space-y-4">
          {/* Quick facts */}
          <div className="flex flex-wrap gap-2">
            {game.buy_in > 0 && (
              <span className="inline-flex items-center rounded-full bg-green-50 dark:bg-green-900/30 px-2.5 py-1 text-xs font-medium text-green-700 dark:text-green-400">
                ${game.buy_in} buy-in
              </span>
            )}
            {scopeLabel && (
              <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-blue-400">
                {scopeLabel}
              </span>
            )}
            {scoringLabel && (
              <span className="inline-flex items-center rounded-full bg-purple-50 dark:bg-purple-900/30 px-2.5 py-1 text-xs font-medium text-purple-700 dark:text-purple-400">
                {scoringLabel}
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
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Rules</h3>
              <SimpleMarkdown text={game.rules_summary} />
            </div>
          )}

          {/* Players */}
          {game.players.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                Players ({game.players.length})
              </h3>
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
      </div>
    </div>
  )
}
