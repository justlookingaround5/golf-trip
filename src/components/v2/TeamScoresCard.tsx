'use client'

import Link from 'next/link'
import type { MatchV2 } from '@/lib/v2/types'

interface TeamScoresCardProps {
  matches: MatchV2[]
  tripId: string
  tripName: string
  /** If true, wraps the card in a Link to the full leaderboard page */
  linkToFull?: boolean
}

function aggregateTeams(matches: MatchV2[]): { name: string; points: number }[] {
  const map = new Map<string, number>()
  for (const m of matches) {
    map.set(m.teamA.name, (map.get(m.teamA.name) ?? 0) + m.teamA.points)
    map.set(m.teamB.name, (map.get(m.teamB.name) ?? 0) + m.teamB.points)
  }
  return [...map.entries()]
    .map(([name, points]) => ({ name, points }))
    .sort((a, b) => b.points - a.points)
}

function pts(n: number) {
  return n % 1 === 0 ? String(n) : n.toFixed(1)
}

export default function TeamScoresCard({ matches, tripId, tripName, linkToFull }: TeamScoresCardProps) {
  const teams = aggregateTeams(matches)
  const isTwoTeam = teams.length === 2

  const card = (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between bg-golf-800 px-4 py-3">
        <div>
          <p className="text-xs font-semibold text-golf-300 uppercase tracking-wider">
            {linkToFull ? 'Live Leaderboard' : 'Team Standings'}
          </p>
          <p className="text-sm font-bold text-white">{tripName}</p>
        </div>
        {linkToFull && (
          <span className="text-xs font-semibold text-golf-300">Full view →</span>
        )}
      </div>

      {/* Scores */}
      {isTwoTeam ? (
        <div className="grid grid-cols-2 divide-x divide-gray-100">
          {teams.map(t => (
            <div key={t.name} className="py-4 text-center bg-white">
              <p className="text-3xl font-black text-golf-700 tabular-nums">{pts(t.points)}</p>
              <p className="text-xs text-gray-500 mt-1">{t.name}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {teams.map((t, i) => (
            <div key={t.name} className="flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-400 w-4 tabular-nums">{i + 1}</span>
                <span className="text-sm font-semibold text-gray-900">{t.name}</span>
              </div>
              <span className="text-sm font-black text-golf-700 tabular-nums">{pts(t.points)} pts</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  if (linkToFull) {
    return <Link href={`/v2/trip/${tripId}/leaderboard`}>{card}</Link>
  }
  return card
}
