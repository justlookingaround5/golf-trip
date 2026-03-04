'use client'

import { useState } from 'react'
import type { PlayerStanding, MatchPlayRecord } from '@/lib/leaderboard'

interface LeaderboardProps {
  grossStandings: PlayerStanding[]
  netStandings: PlayerStanding[]
  matchPlayRecords: MatchPlayRecord[]
}

type Tab = 'gross' | 'net' | 'match_play'

function formatRelativeToPar(score: number, par: number): string {
  const diff = score - par
  if (diff === 0) return 'E'
  return diff > 0 ? `+${diff}` : `${diff}`
}

function relativeColor(score: number, par: number): string {
  const diff = score - par
  if (diff < 0) return 'text-red-600'
  if (diff > 0) return 'text-blue-600'
  return 'text-gray-900 dark:text-gray-100'
}

export default function Leaderboard({
  grossStandings,
  netStandings,
  matchPlayRecords,
}: LeaderboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('gross')

  const tabs: { key: Tab; label: string }[] = [
    { key: 'gross', label: 'Gross' },
    { key: 'net', label: 'Net' },
    { key: 'match_play', label: 'Match Play' },
  ]

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-4 py-3 text-center text-sm font-medium transition ${
              activeTab === tab.key
                ? 'border-b-2 border-golf-700 text-golf-700'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-0">
        {activeTab === 'gross' && (
          <StandingsTable standings={grossStandings} scoreType="gross" />
        )}
        {activeTab === 'net' && (
          <StandingsTable standings={netStandings} scoreType="net" />
        )}
        {activeTab === 'match_play' && (
          <MatchPlayTable records={matchPlayRecords} />
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Standings table (gross or net)
// ---------------------------------------------------------------------------

function StandingsTable({
  standings,
  scoreType,
}: {
  standings: PlayerStanding[]
  scoreType: 'gross' | 'net'
}) {
  if (standings.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-gray-500">
        No scores recorded yet.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
            <th className="px-4 py-3 font-medium">#</th>
            <th className="px-4 py-3 font-medium">Player</th>
            {standings[0]?.roundScores.length > 0 &&
              standings[0].roundScores.map((rs) => (
                <th
                  key={rs.courseId}
                  className="hidden px-4 py-3 text-center font-medium sm:table-cell"
                >
                  R{rs.roundNumber}
                </th>
              ))}
            <th className="px-4 py-3 text-center font-medium">Total</th>
            <th className="px-4 py-3 text-center font-medium">+/-</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {standings.map((player, index) => {
            const total = scoreType === 'gross' ? player.totalGross : player.totalNet
            const par = player.totalPar

            return (
              <tr
                key={player.tripPlayerId}
                className={index === 0 ? 'bg-golf-50/50' : ''}
              >
                <td className="px-4 py-3 font-medium text-gray-500">
                  {index + 1}
                </td>
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                  {player.playerName}
                </td>
                {player.roundScores.map((rs) => {
                  const roundScore = scoreType === 'gross' ? rs.gross : rs.net
                  return (
                    <td
                      key={rs.courseId}
                      className={`hidden px-4 py-3 text-center sm:table-cell ${relativeColor(
                        roundScore,
                        rs.par
                      )}`}
                    >
                      {roundScore}
                    </td>
                  )
                })}
                <td className="px-4 py-3 text-center font-semibold text-gray-900 dark:text-white">
                  {total}
                </td>
                <td
                  className={`px-4 py-3 text-center font-bold ${relativeColor(
                    total,
                    par
                  )}`}
                >
                  {formatRelativeToPar(total, par)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Match play records table
// ---------------------------------------------------------------------------

function MatchPlayTable({ records }: { records: MatchPlayRecord[] }) {
  if (records.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-gray-500">
        No completed matches yet.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
            <th className="px-4 py-3 font-medium">#</th>
            <th className="px-4 py-3 font-medium">Player</th>
            <th className="px-4 py-3 text-center font-medium">W</th>
            <th className="px-4 py-3 text-center font-medium">L</th>
            <th className="px-4 py-3 text-center font-medium">T</th>
            <th className="px-4 py-3 text-center font-medium">Pts</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {records.map((record, index) => (
            <tr
              key={record.tripPlayerId}
              className={index === 0 ? 'bg-golf-50/50' : ''}
            >
              <td className="px-4 py-3 font-medium text-gray-500">
                {index + 1}
              </td>
              <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                {record.playerName}
              </td>
              <td className="px-4 py-3 text-center font-semibold text-green-700">
                {record.wins}
              </td>
              <td className="px-4 py-3 text-center font-semibold text-red-600">
                {record.losses}
              </td>
              <td className="px-4 py-3 text-center font-semibold text-gray-500">
                {record.ties}
              </td>
              <td className="px-4 py-3 text-center font-bold text-green-700">
                {record.points % 1 === 0
                  ? record.points
                  : record.points.toFixed(1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
