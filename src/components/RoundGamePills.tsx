'use client'

import { useState } from 'react'
import GameDetailSheet, { type GameDetail } from './GameDetailSheet'

export interface RoundGame {
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

interface RoundGamePillsProps {
  games: RoundGame[]
}

export default function RoundGamePills({ games }: RoundGamePillsProps) {
  const [selectedGame, setSelectedGame] = useState<GameDetail | null>(null)

  return (
    <>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {games.map((game, i) => (
          <button
            key={i}
            onClick={() => setSelectedGame(game)}
            className="inline-flex items-center gap-1 rounded-full bg-golf-50 border border-golf-200 px-2.5 py-0.5 text-xs font-medium text-golf-800 hover:bg-golf-100 active:bg-golf-200 transition-colors cursor-pointer"
          >
            {game.icon} {game.name}
            {game.buy_in > 0 && ` · $${game.buy_in}`}
          </button>
        ))}
      </div>

      <GameDetailSheet
        game={selectedGame}
        onClose={() => setSelectedGame(null)}
      />
    </>
  )
}
