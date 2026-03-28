'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { MatchV2, PlayerV2, TripTeamV2 } from '@/lib/v2/types'

interface TeamScoresCardProps {
  matches: MatchV2[]
  tripId: string
  tripName?: string
  teams?: TripTeamV2[]
  /** If true, wraps the card in a Link to the full leaderboard page */
  linkToFull?: boolean
  /** If true, tapping a team score shows a player breakdown pop-up */
  showTeamDetail?: boolean
}

function aggregateTeams(matches: MatchV2[], teams?: TripTeamV2[]): { name: string; points: number; color?: string }[] {
  const map = new Map<string, number>()
  for (const m of matches) {
    map.set(m.teamA.name, (map.get(m.teamA.name) ?? 0) + m.teamA.points)
    map.set(m.teamB.name, (map.get(m.teamB.name) ?? 0) + m.teamB.points)
  }
  const colorMap = new Map<string, string>()
  if (teams) {
    for (const t of teams) colorMap.set(t.name, t.color)
  }
  return [...map.entries()]
    .map(([name, points]) => ({ name, points, color: colorMap.get(name) }))
    .sort((a, b) => b.points - a.points)
}

function playerContributions(
  matches: MatchV2[],
  teamName: string,
): { player: PlayerV2; points: number }[] {
  const map = new Map<string, { player: PlayerV2; points: number }>()
  for (const m of matches) {
    const side =
      m.teamA.name === teamName ? m.teamA :
      m.teamB.name === teamName ? m.teamB : null
    if (!side) continue
    for (const p of side.players) {
      const cur = map.get(p.id)
      if (cur) cur.points += side.points
      else map.set(p.id, { player: p, points: side.points })
    }
  }
  return [...map.values()].sort((a, b) => b.points - a.points)
}

function pts(n: number) {
  return n % 1 === 0 ? String(n) : n.toFixed(1)
}

// ─── Team Detail Modal ────────────────────────────────────────────────────────

function TeamDetailModal({
  teamName,
  contributions,
  totalPoints,
  color,
  onClose,
}: {
  teamName: string
  contributions: { player: PlayerV2; points: number }[]
  totalPoints: number
  color?: string
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl bg-white pb-28 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-gray-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {color && <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />}
            <div>
              <p className="text-base font-bold text-gray-900">{teamName}</p>
              <p className="text-xs text-gray-400">{pts(totalPoints)} pts total</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition p-1"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Player list */}
        <div className="divide-y divide-gray-100 px-5 pt-1">
          {contributions.map(({ player, points: p }, i) => (
            <div key={player.id} className="flex items-center gap-3 py-3">
              <span className="text-xs font-bold text-gray-400 w-4 tabular-nums">{i + 1}</span>
              <div className="h-8 w-8 rounded-full bg-golf-100 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-golf-700">
                  {player.name.charAt(0)}
                </span>
              </div>
              <span className="flex-1 text-sm font-semibold text-gray-900">{player.name.split(' ')[0]}</span>
              <span className="text-sm font-black text-golf-700 tabular-nums">{pts(p)} pts</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TeamScoresCard({ matches, tripId, tripName, teams, linkToFull, showTeamDetail }: TeamScoresCardProps) {
  const aggregated = aggregateTeams(matches, teams)
  const isTwoTeam = aggregated.length === 2
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)

  function handleTeamClick(teamName: string) {
    if (showTeamDetail) setSelectedTeam(teamName)
  }

  const card = (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between bg-golf-800 px-4 py-3">
        <p className="text-sm font-bold text-white">
          {linkToFull ? (tripName ?? 'Live Leaderboard') : 'Team Standings'}
        </p>
        {linkToFull && (
          <span className="text-xs font-semibold text-white">Full view →</span>
        )}
      </div>

      {/* Scores */}
      {isTwoTeam ? (
        <div className="grid grid-cols-2 divide-x divide-gray-100">
          {aggregated.map(t => (
            <div
              key={t.name}
              className={`py-4 text-center bg-white ${showTeamDetail ? 'cursor-pointer active:bg-gray-50 transition' : ''}`}
              onClick={() => handleTeamClick(t.name)}
            >
              <p className="text-3xl font-black tabular-nums" style={t.color ? { color: t.color } : undefined}>{pts(t.points)}</p>
              <p className="text-sm text-gray-500 mt-1">{t.name}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {aggregated.map((t, i) => (
            <div
              key={t.name}
              className={`flex items-center justify-between px-4 py-3.5 ${showTeamDetail ? 'cursor-pointer active:bg-gray-50 transition' : ''}`}
              style={t.color ? { borderLeft: `4px solid ${t.color}` } : undefined}
              onClick={() => handleTeamClick(t.name)}
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-gray-400 w-4 tabular-nums">{i + 1}</span>
                <span className="text-base font-bold text-gray-900">{t.name}</span>
              </div>
              <span className="text-base font-bold text-golf-700 tabular-nums">{pts(t.points)} pts</span>
            </div>
          ))}
        </div>
      )}

      {/* Team detail modal */}
      {showTeamDetail && selectedTeam && (
        <TeamDetailModal
          teamName={selectedTeam}
          contributions={playerContributions(matches, selectedTeam)}
          totalPoints={aggregated.find(t => t.name === selectedTeam)?.points ?? 0}
          color={aggregated.find(t => t.name === selectedTeam)?.color}
          onClose={() => setSelectedTeam(null)}
        />
      )}
    </div>
  )

  if (linkToFull) {
    return <Link href={`/trip/${tripId}`}>{card}</Link>
  }
  return card
}
