'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  tripId: string
  players: { tripPlayerId: string; name: string }[]
}

export default function HeadToHeadPicker({ tripId, players }: Props) {
  const [playerA, setPlayerA] = useState('')
  const [playerB, setPlayerB] = useState('')
  const router = useRouter()

  const canCompare = playerA && playerB && playerA !== playerB

  return (
    <div className="rounded-xl bg-white border border-gray-200 p-6 shadow-sm space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Player 1</label>
        <select
          value={playerA}
          onChange={e => setPlayerA(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-golf-500 focus:outline-none"
        >
          <option value="">Select a player</option>
          {players.map(p => (
            <option key={p.tripPlayerId} value={p.tripPlayerId} disabled={p.tripPlayerId === playerB}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="text-center text-lg font-bold text-gray-400">vs</div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Player 2</label>
        <select
          value={playerB}
          onChange={e => setPlayerB(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-golf-500 focus:outline-none"
        >
          <option value="">Select a player</option>
          {players.map(p => (
            <option key={p.tripPlayerId} value={p.tripPlayerId} disabled={p.tripPlayerId === playerA}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={() => {
          if (canCompare) {
            router.push(`/trip/${tripId}/head-to-head/${playerA}/${playerB}`)
          }
        }}
        disabled={!canCompare}
        className="w-full rounded-md bg-golf-700 py-3 text-sm font-bold text-white disabled:opacity-50 hover:bg-golf-600 transition-colors"
      >
        Compare
      </button>
    </div>
  )
}
