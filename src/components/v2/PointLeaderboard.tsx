'use client'

import { useState } from 'react'
import MatchCard from './MatchCard'
import type {
  MatchV2,
  PlayerLeaderboardStats,
  HoleLeaderboardStats,
  PlayerV2,
  TripRoundV2,
  SkinResultV2,
  TripRoundScoreV2,
  TripEarningsRow,
} from '@/lib/v2/types'

type View = 'matches' | 'individual' | 'player_stats' | 'hole_stats' | 'skins' | 'earnings'

const VIEWS: { key: View; label: string }[] = [
  { key: 'matches',      label: 'Match Leaderboard'      },
  { key: 'individual',   label: 'Individual Leaderboard' },
  { key: 'player_stats', label: 'Player Stats'           },
  { key: 'hole_stats',   label: 'Hole Stats'             },
  { key: 'skins',        label: 'Skins'                  },
  { key: 'earnings',     label: 'Earnings'               },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt1(n: number | null): string {
  if (n == null) return '—'
  return n.toFixed(1)
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

function diffStr(diff: number | null): string {
  if (diff == null) return '—'
  if (diff === 0) return 'E'
  return diff > 0 ? `+${diff}` : `${diff}`
}

// Table cell classes
const TH      = 'px-2 py-2 text-center text-[10px] font-bold text-white uppercase tracking-wide whitespace-nowrap'
const TH_LEFT = 'sticky left-0 px-3 py-2 text-left text-[10px] font-bold text-white uppercase tracking-wide bg-golf-800'
const TD      = 'px-2 py-1.5 text-center text-xs text-gray-700 whitespace-nowrap'

function tdLeft(bg: string) {
  return `sticky left-0 px-3 py-1.5 text-xs font-semibold text-gray-900 whitespace-nowrap ${bg}`
}

// ─── Match Leaderboard ────────────────────────────────────────────────────────

function MatchLeaderboard({ matches, roundFilter }: { matches: MatchV2[]; roundFilter: number }) {
  const filtered = matches.filter(m => m.roundNumber === roundFilter)
  if (filtered.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400">No matches for this round.</p>
  }
  return (
    <div className="space-y-2 p-3">
      {filtered.map(m => <MatchCard key={m.id} match={m} />)}
    </div>
  )
}

// ─── Individual Leaderboard ───────────────────────────────────────────────────

function IndividualLeaderboard({
  rounds, roundScores, players, scoreType,
}: {
  rounds: TripRoundV2[]
  roundScores: TripRoundScoreV2[]
  players: PlayerV2[]
  scoreType: 'gross' | 'net'
}) {
  const rows = players.map(p => {
    let totalScore = 0, totalPar = 0
    const scores = rounds.map(r => {
      const s = roundScores.find(rs => rs.playerId === p.id && rs.roundNumber === r.roundNumber)
      const val = scoreType === 'gross' ? s?.grossScore ?? null : s?.netScore ?? null
      if (val != null) { totalScore += val; totalPar += r.par }
      return val
    })
    const diff = totalPar > 0 ? totalScore - totalPar : null
    return { player: p, scores, diff }
  }).sort((a, b) => {
    if (a.diff == null && b.diff == null) return 0
    if (a.diff == null) return 1
    if (b.diff == null) return -1
    return a.diff - b.diff
  })

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="bg-golf-800">
            <th className={TH_LEFT}>Player</th>
            {rounds.map(r => (
              <th key={r.roundNumber} className={TH}>
                {r.courseName.length > 12 ? r.courseName.substring(0, 12) + '…' : r.courseName}
              </th>
            ))}
            <th className={TH}>+/-</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(({ player, scores, diff }, i) => {
            const bg = i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
            return (
              <tr key={player.id} className={bg}>
                <td className={tdLeft(bg)}>{player.name}</td>
                {scores.map((s, j) => (
                  <td key={j} className={TD}>{s ?? '—'}</td>
                ))}
                <td className={`${TD} font-bold ${
                  diff == null ? 'text-gray-400' :
                  diff < 0    ? 'text-red-600'  :
                  diff > 0    ? 'text-blue-600' : 'text-gray-700'
                }`}>{diffStr(diff)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Player Stats ─────────────────────────────────────────────────────────────

function PlayerStatsView({ stats }: { stats: PlayerLeaderboardStats[] }) {
  const sorted = [...stats].sort((a, b) => b.points - a.points)
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="bg-golf-800">
            <th className={TH_LEFT}>Player</th>
            <th className={TH}>W-L-T</th>
            <th className={TH}>Pts</th>
            <th className={TH}>Skins</th>
            <th className={TH}>FW%</th>
            <th className={TH}>GIR%</th>
            <th className={TH}>Putts</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sorted.map(({ player, matchRecord: r, points, skinsWon, fairwayPct, girPct, puttsAvg }, i) => {
            const bg = i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
            return (
              <tr key={player.id} className={bg}>
                <td className={tdLeft(bg)}>{player.name}</td>
                <td className={TD}>{r.wins}-{r.losses}-{r.ties}</td>
                <td className={`${TD} font-bold text-golf-700`}>
                  {points % 1 === 0 ? points : points.toFixed(1)}
                </td>
                <td className={TD}>{skinsWon}</td>
                <td className={TD}>{pct(fairwayPct)}</td>
                <td className={TD}>{pct(girPct)}</td>
                <td className={TD}>{fmt1(puttsAvg)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Hole Stats ───────────────────────────────────────────────────────────────

function HoleStatsView({ holeStats }: { holeStats: HoleLeaderboardStats[] }) {
  if (holeStats.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400">No hole stats for this round.</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="bg-golf-800">
            <th className={TH}>Hole</th>
            <th className={TH}>Par</th>
            <th className={TH}>Avg Gross</th>
            <th className={TH}>Avg Net</th>
            <th className={TH}>Diff</th>
            <th className={TH}>FW%</th>
            <th className={TH}>GIR%</th>
            <th className={TH}>Putts</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {holeStats.map((h, i) => {
            const diff = parseFloat((h.avgGross - h.par).toFixed(1))
            const bg = i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
            return (
              <tr key={h.holeNumber} className={bg}>
                <td className={`${TD} font-bold text-gray-900`}>{h.holeNumber}</td>
                <td className={TD}>{h.par}</td>
                <td className={TD}>{fmt1(h.avgGross)}</td>
                <td className={TD}>{fmt1(h.avgNet)}</td>
                <td className={`${TD} font-semibold ${
                  diff > 0 ? 'text-blue-600' : diff < 0 ? 'text-red-600' : 'text-gray-700'
                }`}>
                  {diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)}
                </td>
                <td className={TD}>{pct(h.fairwayPct)}</td>
                <td className={TD}>{pct(h.girPct)}</td>
                <td className={TD}>{fmt1(h.avgPutts)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Skins ────────────────────────────────────────────────────────────────────

function SkinsView({ skins }: { skins: SkinResultV2[] }) {
  if (skins.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400">No skins data for this round.</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="bg-golf-800">
            <th className={TH}>Hole</th>
            <th className={TH}>Par</th>
            <th className={TH}>Player</th>
            <th className={TH}>Gross</th>
            <th className={TH}>Net</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {skins.map((s, i) => {
            const bg = i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
            return (
              <tr key={s.holeNumber} className={bg}>
                <td className={`${TD} font-bold text-gray-900`}>{s.holeNumber}</td>
                <td className={TD}>{s.par}</td>
                <td className={`${TD} ${s.winnerName ? 'font-semibold text-golf-700' : 'text-gray-300'}`}>
                  {s.winnerName ?? ''}
                </td>
                <td className={TD}>{s.grossScore ?? ''}</td>
                <td className={TD}>{s.netScore ?? ''}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Earnings ─────────────────────────────────────────────────────────────────

function EarningsView({ earnings }: { earnings: TripEarningsRow[] }) {
  const sorted = [...earnings].sort((a, b) => b.netTotal - a.netTotal)
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="bg-golf-800">
            <th className={TH_LEFT}>Player</th>
            <th className={TH}>Team</th>
            <th className={TH}>Matches</th>
            <th className={TH}>Skins</th>
            <th className={TH}>Net Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sorted.map(({ player, team, matches, skins, netTotal }, i) => {
            const bg = i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
            return (
              <tr key={player.id} className={bg}>
                <td className={tdLeft(bg)}>{player.name}</td>
                <td className={`${TD} font-semibold ${team    >= 0 ? 'text-green-600' : 'text-red-600'}`}>{money(team)}</td>
                <td className={`${TD} font-semibold ${matches >= 0 ? 'text-green-600' : 'text-red-600'}`}>{money(matches)}</td>
                <td className={`${TD} font-semibold ${skins   >= 0 ? 'text-green-600' : 'text-red-600'}`}>{money(skins)}</td>
                <td className={`${TD} font-black   ${netTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>{money(netTotal)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Chevron icon ─────────────────────────────────────────────────────────────

function Chevron({ className = '' }: { className?: string }) {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" className={`pointer-events-none shrink-0 ${className}`}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface PointLeaderboardProps {
  matches: MatchV2[]
  rounds: TripRoundV2[]
  players: PlayerV2[]
  playerStats: PlayerLeaderboardStats[]
  roundScores: TripRoundScoreV2[]
  holeStatsByRound: Record<number, HoleLeaderboardStats[]>
  skinsByRound: Record<number, SkinResultV2[]>
  earnings: TripEarningsRow[]
}

export default function PointLeaderboard({
  matches, rounds, players, playerStats, roundScores,
  holeStatsByRound, skinsByRound, earnings,
}: PointLeaderboardProps) {
  const defaultRound = rounds[0]?.roundNumber ?? 1
  const [view,        setView]        = useState<View>('matches')
  const [roundFilter, setRoundFilter] = useState<number>(defaultRound)
  const [scoreType,   setScoreType]   = useState<'gross' | 'net'>('gross')

  const needsRoundFilter = view === 'matches' || view === 'hole_stats' || view === 'skins'
  const needsScoreFilter = view === 'individual'

  function handleViewChange(v: View) {
    setView(v)
    setRoundFilter(defaultRound)
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between bg-golf-800 px-4 py-3">
        {/* View selector acts as the widget title */}
        <div className="flex items-center gap-1">
          <select
            value={view}
            onChange={e => handleViewChange(e.target.value as View)}
            className="bg-transparent text-sm font-bold text-white appearance-none cursor-pointer focus:outline-none"
          >
            {VIEWS.map(v => (
              <option key={v.key} value={v.key} className="text-gray-900 bg-white font-normal">
                {v.label}
              </option>
            ))}
          </select>
          <Chevron className="text-golf-300" />
        </div>

        {/* Right-side filter */}
        {needsRoundFilter && rounds.length > 0 && (
          <div className="flex items-center gap-1">
            <select
              value={roundFilter}
              onChange={e => setRoundFilter(Number(e.target.value))}
              className="bg-transparent text-xs font-semibold text-golf-300 appearance-none cursor-pointer focus:outline-none"
            >
              {rounds.map(r => (
                <option key={r.roundNumber} value={r.roundNumber} className="text-gray-900 bg-white font-normal">
                  Rd {r.roundNumber}
                </option>
              ))}
            </select>
            <Chevron className="text-golf-300" />
          </div>
        )}

        {needsScoreFilter && (
          <div className="flex items-center gap-1">
            <select
              value={scoreType}
              onChange={e => setScoreType(e.target.value as 'gross' | 'net')}
              className="bg-transparent text-xs font-semibold text-golf-300 appearance-none cursor-pointer focus:outline-none"
            >
              <option value="gross" className="text-gray-900 bg-white font-normal">Gross</option>
              <option value="net"   className="text-gray-900 bg-white font-normal">Net</option>
            </select>
            <Chevron className="text-golf-300" />
          </div>
        )}
      </div>

      {/* Content */}
      {view === 'matches' && (
        <MatchLeaderboard matches={matches} roundFilter={roundFilter} />
      )}
      {view === 'individual' && (
        <IndividualLeaderboard
          rounds={rounds} roundScores={roundScores}
          players={players} scoreType={scoreType}
        />
      )}
      {view === 'player_stats' && <PlayerStatsView stats={playerStats} />}
      {view === 'hole_stats'   && <HoleStatsView   holeStats={holeStatsByRound[roundFilter] ?? []} />}
      {view === 'skins'        && <SkinsView        skins={skinsByRound[roundFilter] ?? []} />}
      {view === 'earnings'     && <EarningsView     earnings={earnings} />}
    </div>
  )
}
