'use client'

import type { TeamStanding } from '@/lib/leaderboard'

interface TeamStandingsProps {
  standings: TeamStanding[]
}

export default function TeamStandings({ standings }: TeamStandingsProps) {
  if (standings.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
        No team results yet.
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 bg-green-50 px-4 py-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-green-800">
          Team Standings
        </h3>
      </div>
      <div className="divide-y divide-gray-100">
        {standings.map((team, index) => (
          <div
            key={team.teamId}
            className={`flex items-center justify-between px-4 py-4 ${
              index === 0 ? 'bg-green-50/50' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                  index === 0
                    ? 'bg-green-700 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {index + 1}
              </span>
              <div>
                <p className="font-semibold text-gray-900">{team.teamName}</p>
                <p className="text-xs text-gray-500">
                  {team.wins}W - {team.losses}L - {team.ties}T
                  {team.matchesPlayed > 0 && (
                    <span className="ml-1">
                      ({team.matchesPlayed} match{team.matchesPlayed !== 1 ? 'es' : ''})
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-700">
                {team.points % 1 === 0 ? team.points : team.points.toFixed(1)}
              </p>
              <p className="text-xs text-gray-500">pts</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
