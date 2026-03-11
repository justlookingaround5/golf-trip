'use client'

import { useState } from 'react'
import Link from 'next/link'
import MatchCard from './MatchCard'
import type {
  MatchV2,
  PlayerLeaderboardStats,
  HoleLeaderboardStats,
  PlayerEarnings,
} from '@/lib/v2/types'

type Tab = 'matches' | 'players' | 'holes' | 'earnings'

interface PointLeaderboardProps {
  tripId: string
  tripName: string
  readOnly?: boolean
  matches: MatchV2[]
  playerStats: PlayerLeaderboardStats[]
  holeStats: HoleLeaderboardStats[]
  earnings: PlayerEarnings[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number | null, decimals = 1): string {
  if (n == null) return '—'
  return n.toFixed(decimals)
}

function pct(n: number | null): string {
  if (n == null) return '—'
  return `${Math.round(n)}%`
}

function money(n: number): string {
  const abs = Math.abs(n)
  const s = abs % 1 === 0 ? `$${abs}` : `$${abs.toFixed(2)}`
  return n >= 0 ? `+${s}` : `-${s}`
}

// ─── Sub-tables ───────────────────────────────────────────────────────────────

function MatchesTab({ matches, readOnly }: { matches: MatchV2[]; readOnly: boolean }) {
  if (matches.length === 0) {
    return <EmptyState text="No matches yet." />
  }
  return (
    <div className="space-y-2 p-3">
      {matches.map(m => (
        <MatchCard key={m.id} match={m} readOnly={readOnly} />
      ))}
    </div>
  )
}

function PlayerStatsTab({ stats }: { stats: PlayerLeaderboardStats[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="bg-gray-50 text-gray-500 border-b border-gray-100">
            <th className="sticky left-0 bg-gray-50 px-3 py-2 text-left font-semibold min-w-[70px]">Player</th>
            <th className="px-2 py-2 text-center font-semibold">Rec</th>
            <th className="px-2 py-2 text-center font-semibold">Pts</th>
            <th className="px-2 py-2 text-center font-semibold">Gross</th>
            <th className="px-2 py-2 text-center font-semibold">Net</th>
            <th className="px-2 py-2 text-center font-semibold">Skins</th>
            <th className="px-2 py-2 text-center font-semibold">FW%</th>
            <th className="px-2 py-2 text-center font-semibold">GIR%</th>
            <th className="px-2 py-2 text-center font-semibold">Putts</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {stats.map(({ player, matchRecord: r, points, grossAvg, netAvg, skinsWon, fairwayPct, girPct, puttsAvg }, i) => (
            <tr key={player.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className={`sticky left-0 px-3 py-2 font-semibold text-gray-900 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                {player.name}
              </td>
              <td className="px-2 py-2 text-center text-gray-600 whitespace-nowrap">
                {r.wins}-{r.losses}-{r.ties}
              </td>
              <td className="px-2 py-2 text-center font-bold text-golf-700">
                {points % 1 === 0 ? points : points.toFixed(1)}
              </td>
              <td className="px-2 py-2 text-center text-gray-700">{fmt(grossAvg)}</td>
              <td className="px-2 py-2 text-center text-gray-700">{fmt(netAvg)}</td>
              <td className="px-2 py-2 text-center text-gray-700">{skinsWon}</td>
              <td className="px-2 py-2 text-center text-gray-700">{pct(fairwayPct)}</td>
              <td className="px-2 py-2 text-center text-gray-700">{pct(girPct)}</td>
              <td className="px-2 py-2 text-center text-gray-700">{fmt(puttsAvg)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function HoleStatsTab({ stats }: { stats: HoleLeaderboardStats[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="bg-gray-50 text-gray-500 border-b border-gray-100">
            <th className="px-2 py-2 text-center font-semibold w-8">#</th>
            <th className="px-2 py-2 text-center font-semibold w-8">Par</th>
            <th className="px-2 py-2 text-center font-semibold">Gross</th>
            <th className="px-2 py-2 text-center font-semibold">Net</th>
            <th className="px-2 py-2 text-center font-semibold">Bir+</th>
            <th className="px-2 py-2 text-center font-semibold">Par</th>
            <th className="px-2 py-2 text-center font-semibold">Bog-</th>
            <th className="px-2 py-2 text-center font-semibold">FW%</th>
            <th className="px-2 py-2 text-center font-semibold">GIR%</th>
            <th className="px-2 py-2 text-center font-semibold">Putts</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {stats.map((h, i) => (
            <tr key={h.holeNumber} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="px-2 py-1.5 text-center font-bold text-gray-900">{h.holeNumber}</td>
              <td className="px-2 py-1.5 text-center text-gray-500">{h.par}</td>
              <td className="px-2 py-1.5 text-center text-gray-700">{fmt(h.avgGross)}</td>
              <td className="px-2 py-1.5 text-center text-gray-700">{fmt(h.avgNet)}</td>
              <td className="px-2 py-1.5 text-center text-red-600 font-semibold">{h.birdiesOrBetter}</td>
              <td className="px-2 py-1.5 text-center text-gray-600">{h.pars}</td>
              <td className="px-2 py-1.5 text-center text-blue-600 font-semibold">{h.bogeysOrWorse}</td>
              <td className="px-2 py-1.5 text-center text-gray-700">{pct(h.fairwayPct)}</td>
              <td className="px-2 py-1.5 text-center text-gray-700">{pct(h.girPct)}</td>
              <td className="px-2 py-1.5 text-center text-gray-700">{fmt(h.avgPutts)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EarningsTab({ earnings }: { earnings: PlayerEarnings[] }) {
  const sorted = [...earnings].sort((a, b) => b.netEarnings - a.netEarnings)
  return (
    <div className="divide-y divide-gray-100">
      {sorted.map(({ player, netEarnings, breakdown }) => (
        <div key={player.id} className="px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-900 text-sm">{player.name}</span>
            <span className={`font-black text-base ${netEarnings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {money(netEarnings)}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
            {breakdown.map(line => (
              <span key={line.label} className="text-xs text-gray-400">
                {line.label}: {money(line.amount)}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return <p className="py-8 text-center text-sm text-gray-400">{text}</p>
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PointLeaderboard({
  tripId,
  tripName,
  readOnly = false,
  matches,
  playerStats,
  holeStats,
  earnings,
}: PointLeaderboardProps) {
  const [tab, setTab] = useState<Tab>('matches')

  const TABS: { key: Tab; label: string }[] = [
    { key: 'matches',  label: 'Matches'  },
    { key: 'players',  label: 'Players'  },
    { key: 'holes',    label: 'Holes'    },
    { key: 'earnings', label: 'Earnings' },
  ]

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between bg-golf-800 px-4 py-3">
        <div>
          <p className="text-xs font-semibold text-golf-300 uppercase tracking-wider">
            {readOnly ? 'Trip Leaderboard' : 'Live Leaderboard'}
          </p>
          <p className="text-sm font-bold text-white">{tripName}</p>
        </div>
        {!readOnly && (
          <Link
            href={`/v2/trip/${tripId}/leaderboard`}
            className="text-xs font-semibold text-golf-300 hover:text-white transition"
          >
            Full view →
          </Link>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-gray-100 bg-gray-50">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
              tab === t.key
                ? 'text-golf-700 border-b-2 border-golf-700 bg-white'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'matches'  && <MatchesTab matches={matches} readOnly={readOnly} />}
      {tab === 'players'  && <PlayerStatsTab stats={playerStats} />}
      {tab === 'holes'    && <HoleStatsTab stats={holeStats} />}
      {tab === 'earnings' && <EarningsTab earnings={earnings} />}
    </div>
  )
}
