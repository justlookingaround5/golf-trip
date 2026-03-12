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
type SortDir = 'desc' | 'asc'

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

function sortRows<T>(
  rows: T[],
  sortCol: string | null,
  sortDir: SortDir,
  getVal: (row: T, col: string) => number | string | null,
): T[] {
  if (!sortCol) return rows
  return [...rows].sort((a, b) => {
    const av = getVal(a, sortCol)
    const bv = getVal(b, sortCol)
    if (av == null && bv == null) return 0
    if (av == null) return 1
    if (bv == null) return -1
    if (typeof av === 'string' && typeof bv === 'string') {
      return sortDir === 'desc' ? bv.localeCompare(av) : av.localeCompare(bv)
    }
    return sortDir === 'desc'
      ? (bv as number) - (av as number)
      : (av as number) - (bv as number)
  })
}

// Table cell classes
const TH      = 'px-2 py-2 text-center text-[10px] font-bold text-white uppercase tracking-wide whitespace-nowrap'
const TH_LEFT = 'sticky left-0 px-3 py-2 text-left text-[10px] font-bold text-white uppercase tracking-wide bg-golf-800'
const TD      = 'px-2 py-1.5 text-center text-xs text-gray-700 whitespace-nowrap'

function tdLeft(bg: string) {
  return `sticky left-0 px-3 py-1.5 text-xs font-semibold text-gray-900 whitespace-nowrap ${bg}`
}

interface SortProps {
  sortCol: string | null
  sortDir: SortDir
  onSort: (col: string) => void
}

function thSort(col: string, sortCol: string | null, base = TH) {
  const active = sortCol === col
  return `${base} cursor-pointer select-none ${active ? 'bg-golf-700' : 'hover:bg-golf-700'} transition-colors`
}

function SortArrow({ col, sortCol, sortDir }: { col: string; sortCol: string | null; sortDir: SortDir }) {
  if (sortCol !== col) return null
  return <span className="ml-0.5">{sortDir === 'desc' ? '↓' : '↑'}</span>
}

// ─── Scorecard score cell (mirrors ScorecardViewer conventions) ───────────────

function SkinScore({ score, par }: { score: number | null; par: number }) {
  if (score == null) return null
  const diff = score - par
  if (diff <= -2) return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full ring-2 ring-yellow-400 text-yellow-600 font-bold text-xs">{score}</span>
  )
  if (diff === -1) return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full ring-2 ring-red-400 text-red-600 font-bold text-xs">{score}</span>
  )
  if (diff === 0) return <span className="text-xs font-medium text-gray-700">{score}</span>
  if (diff === 1) return (
    <span className="inline-flex h-7 w-7 items-center justify-center ring-1 ring-blue-400 text-blue-600 text-xs">{score}</span>
  )
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center ring-2 ring-blue-500 text-blue-800 font-bold text-xs">{score}</span>
  )
}

// ─── Match Leaderboard ────────────────────────────────────────────────────────

function parseTeeTime(t: string | null): number {
  if (!t) return Infinity
  const [time, period] = t.split(' ')
  const [h, m] = time.split(':').map(Number)
  let hours = h
  if (period === 'PM' && h !== 12) hours += 12
  if (period === 'AM' && h === 12) hours = 0
  return hours * 60 + m
}

function MatchLeaderboard({ matches, roundFilter }: { matches: MatchV2[]; roundFilter: number }) {
  const filtered = [...matches.filter(m => m.roundNumber === roundFilter)]
    .sort((a, b) => parseTeeTime(a.teeTime) - parseTeeTime(b.teeTime))
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
  rounds, roundScores, players, scoreType, sortCol, sortDir, onSort,
}: {
  rounds: TripRoundV2[]
  roundScores: TripRoundScoreV2[]
  players: PlayerV2[]
  scoreType: 'gross' | 'net'
} & SortProps) {
  type Row = { player: PlayerV2; scores: (number | null)[]; diff: number | null }

  const baseRows: Row[] = players.map(p => {
    let totalScore = 0, totalPar = 0
    const scores = rounds.map(r => {
      const s = roundScores.find(rs => rs.playerId === p.id && rs.roundNumber === r.roundNumber)
      const val = scoreType === 'gross' ? s?.grossScore ?? null : s?.netScore ?? null
      if (val != null) { totalScore += val; totalPar += r.par }
      return val
    })
    const diff = totalPar > 0 ? totalScore - totalPar : null
    return { player: p, scores, diff }
  })

  // Default order: ascending by diff (best first)
  const defaultSorted = [...baseRows].sort((a, b) => {
    if (a.diff == null && b.diff == null) return 0
    if (a.diff == null) return 1
    if (b.diff == null) return -1
    return a.diff - b.diff
  })

  const rows = sortCol
    ? sortRows(defaultSorted, sortCol, sortDir, (row, col) => {
        if (col === 'diff') return row.diff
        const rdIdx = rounds.findIndex(r => `rd_${r.roundNumber}` === col)
        if (rdIdx >= 0) return row.scores[rdIdx]
        return null
      })
    : defaultSorted

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="bg-golf-800">
            <th className={TH_LEFT}>Player</th>
            {rounds.map(r => (
              <th
                key={r.roundNumber}
                className={thSort(`rd_${r.roundNumber}`, sortCol)}
                onClick={() => onSort(`rd_${r.roundNumber}`)}
              >
                {r.courseName.length > 12 ? r.courseName.substring(0, 12) + '…' : r.courseName}
                <SortArrow col={`rd_${r.roundNumber}`} sortCol={sortCol} sortDir={sortDir} />
              </th>
            ))}
            <th className={thSort('diff', sortCol)} onClick={() => onSort('diff')}>
              +/-<SortArrow col="diff" sortCol={sortCol} sortDir={sortDir} />
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(({ player, scores, diff }, i) => {
            const bg = i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
            return (
              <tr key={player.id} className={bg}>
                <td className={tdLeft(bg)}>{player.name}</td>
                {scores.map((s, j) => {
                  const roundPar = rounds[j]?.par ?? 0
                  const underPar = s != null && s < roundPar
                  return (
                    <td key={j} className={`${TD} ${underPar ? 'text-red-600 font-semibold' : ''}`}>
                      {s ?? '—'}
                    </td>
                  )
                })}
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

function PlayerStatsView({ stats, sortCol, sortDir, onSort }: { stats: PlayerLeaderboardStats[] } & SortProps) {
  const baseRows = [...stats].sort((a, b) => b.points - a.points)

  const rows = sortCol
    ? sortRows(baseRows, sortCol, sortDir, (row, col) => {
        switch (col) {
          case 'wlt':   return row.matchRecord.wins
          case 'pts':   return row.points
          case 'skins': return row.skinsWon
          case 'fw':    return row.fairwayPct
          case 'gir':   return row.girPct
          case 'putts': return row.puttsAvg
          default:      return null
        }
      })
    : baseRows

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="bg-golf-800">
            <th className={TH_LEFT}>Player</th>
            <th className={thSort('wlt', sortCol)} onClick={() => onSort('wlt')}>
              W-L-T<SortArrow col="wlt" sortCol={sortCol} sortDir={sortDir} />
            </th>
            <th className={thSort('skins', sortCol)} onClick={() => onSort('skins')}>
              Skins<SortArrow col="skins" sortCol={sortCol} sortDir={sortDir} />
            </th>
            <th className={thSort('fw', sortCol)} onClick={() => onSort('fw')}>
              FW%<SortArrow col="fw" sortCol={sortCol} sortDir={sortDir} />
            </th>
            <th className={thSort('gir', sortCol)} onClick={() => onSort('gir')}>
              GIR%<SortArrow col="gir" sortCol={sortCol} sortDir={sortDir} />
            </th>
            <th className={thSort('putts', sortCol)} onClick={() => onSort('putts')}>
              Putts<SortArrow col="putts" sortCol={sortCol} sortDir={sortDir} />
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(({ player, matchRecord: r, points, skinsWon, fairwayPct, girPct, puttsAvg }, i) => {
            const bg = i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
            return (
              <tr key={player.id} className={bg}>
                <td className={tdLeft(bg)}>{player.name}</td>
                <td className={TD}>{r.wins}-{r.losses}-{r.ties}</td>
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

function HoleStatsView({ holeStats, sortCol, sortDir, onSort }: { holeStats: HoleLeaderboardStats[] } & SortProps) {
  if (holeStats.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400">No hole stats for this round.</p>
  }

  // Compute diff = avgNet - par for each hole
  type HoleRow = HoleLeaderboardStats & { diff: number }
  const baseRows: HoleRow[] = holeStats.map(h => ({
    ...h,
    diff: parseFloat((h.avgNet - h.par).toFixed(1)),
  }))

  // Color scale: centered on 0; green for negative, red for positive
  const posDiffs = baseRows.map(r => r.diff).filter(d => d > 0)
  const negDiffs = baseRows.map(r => r.diff).filter(d => d < 0)
  const maxDiff = posDiffs.length > 0 ? Math.max(...posDiffs) : 0.01
  const minDiff = negDiffs.length > 0 ? Math.min(...negDiffs) : -0.01

  function diffBg(diff: number): string {
    if (diff === 0) return 'transparent'
    if (diff > 0) {
      const alpha = Math.min(diff / maxDiff, 1) * 0.55
      return `rgba(239, 68, 68, ${alpha.toFixed(2)})`
    }
    const alpha = Math.min(Math.abs(diff) / Math.abs(minDiff), 1) * 0.55
    return `rgba(34, 197, 94, ${alpha.toFixed(2)})`
  }

  const rows = sortCol
    ? sortRows(baseRows, sortCol, sortDir, (row, col) => {
        switch (col) {
          case 'hole':      return row.holeNumber
          case 'par':       return row.par
          case 'avg_gross': return row.avgGross
          case 'avg_net':   return row.avgNet
          case 'diff':      return row.diff
          case 'fw':        return row.fairwayPct
          case 'gir':       return row.girPct
          case 'putts':     return row.avgPutts
          default:          return null
        }
      })
    : baseRows

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="bg-golf-800">
            <th className={thSort('hole', sortCol)} onClick={() => onSort('hole')}>
              Hole<SortArrow col="hole" sortCol={sortCol} sortDir={sortDir} />
            </th>
            <th className={thSort('par', sortCol)} onClick={() => onSort('par')}>
              Par<SortArrow col="par" sortCol={sortCol} sortDir={sortDir} />
            </th>
            <th className={thSort('avg_gross', sortCol)} onClick={() => onSort('avg_gross')}>
              Avg Gross<SortArrow col="avg_gross" sortCol={sortCol} sortDir={sortDir} />
            </th>
            <th className={thSort('avg_net', sortCol)} onClick={() => onSort('avg_net')}>
              Avg Net<SortArrow col="avg_net" sortCol={sortCol} sortDir={sortDir} />
            </th>
            <th className={thSort('diff', sortCol)} onClick={() => onSort('diff')}>
              Diff<SortArrow col="diff" sortCol={sortCol} sortDir={sortDir} />
            </th>
            <th className={thSort('fw', sortCol)} onClick={() => onSort('fw')}>
              FW%<SortArrow col="fw" sortCol={sortCol} sortDir={sortDir} />
            </th>
            <th className={thSort('gir', sortCol)} onClick={() => onSort('gir')}>
              GIR%<SortArrow col="gir" sortCol={sortCol} sortDir={sortDir} />
            </th>
            <th className={thSort('putts', sortCol)} onClick={() => onSort('putts')}>
              Putts<SortArrow col="putts" sortCol={sortCol} sortDir={sortDir} />
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((h, i) => {
            const rowBg = i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
            return (
              <tr key={h.holeNumber} className={rowBg}>
                <td className={`${TD} font-bold text-gray-900`}>{h.holeNumber}</td>
                <td className={TD}>{h.par}</td>
                <td className={TD}>{fmt1(h.avgGross)}</td>
                <td className={TD}>{fmt1(h.avgNet)}</td>
                <td
                  className={`${TD} font-semibold`}
                  style={{ backgroundColor: diffBg(h.diff) }}
                >
                  {h.diff > 0 ? `+${h.diff.toFixed(1)}` : h.diff.toFixed(1)}
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

function SkinsView({ skins, sortCol, sortDir, onSort }: { skins: SkinResultV2[] } & SortProps) {
  if (skins.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400">No skins data for this round.</p>
  }

  const rows = sortCol
    ? sortRows(skins, sortCol, sortDir, (row, col) => {
        switch (col) {
          case 'hole':   return row.holeNumber
          case 'par':    return row.par
          case 'player': return row.winnerName
          case 'gross':  return row.grossScore
          case 'net':    return row.netScore
          default:       return null
        }
      })
    : skins

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="bg-golf-800">
            <th className={thSort('hole', sortCol)} onClick={() => onSort('hole')}>
              Hole<SortArrow col="hole" sortCol={sortCol} sortDir={sortDir} />
            </th>
            <th className={thSort('par', sortCol)} onClick={() => onSort('par')}>
              Par<SortArrow col="par" sortCol={sortCol} sortDir={sortDir} />
            </th>
            <th className={thSort('player', sortCol)} onClick={() => onSort('player')}>
              Player<SortArrow col="player" sortCol={sortCol} sortDir={sortDir} />
            </th>
            <th className={thSort('gross', sortCol)} onClick={() => onSort('gross')}>
              Gross<SortArrow col="gross" sortCol={sortCol} sortDir={sortDir} />
            </th>
            <th className={thSort('net', sortCol)} onClick={() => onSort('net')}>
              Net<SortArrow col="net" sortCol={sortCol} sortDir={sortDir} />
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((s, i) => {
            const bg = i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
            return (
              <tr key={s.holeNumber} className={bg}>
                <td className={`${TD} font-bold text-gray-900`}>{s.holeNumber}</td>
                <td className={TD}>{s.par}</td>
                <td className={`${TD} ${s.winnerName ? 'font-semibold text-golf-700' : 'text-gray-300'}`}>
                  {s.winnerName ?? ''}
                </td>
                <td className={TD}><SkinScore score={s.grossScore} par={s.par} /></td>
                <td className={TD}><SkinScore score={s.netScore} par={s.par} /></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Earnings ─────────────────────────────────────────────────────────────────

function EarningsView({ earnings, sortCol, sortDir, onSort }: { earnings: TripEarningsRow[] } & SortProps) {
  const baseRows = [...earnings].sort((a, b) => b.netTotal - a.netTotal)

  const rows = sortCol
    ? sortRows(baseRows, sortCol, sortDir, (row, col) => {
        switch (col) {
          case 'team':      return row.team
          case 'matches':   return row.matches
          case 'skins':     return row.skins
          case 'net_total': return row.netTotal
          default:          return null
        }
      })
    : baseRows

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="bg-golf-800">
            <th className={TH_LEFT}>Player</th>
            <th className={thSort('team', sortCol)} onClick={() => onSort('team')}>
              Team<SortArrow col="team" sortCol={sortCol} sortDir={sortDir} />
            </th>
            <th className={thSort('matches', sortCol)} onClick={() => onSort('matches')}>
              Matches<SortArrow col="matches" sortCol={sortCol} sortDir={sortDir} />
            </th>
            <th className={thSort('skins', sortCol)} onClick={() => onSort('skins')}>
              Skins<SortArrow col="skins" sortCol={sortCol} sortDir={sortDir} />
            </th>
            <th className={thSort('net_total', sortCol)} onClick={() => onSort('net_total')}>
              Net Total<SortArrow col="net_total" sortCol={sortCol} sortDir={sortDir} />
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(({ player, team, matches, skins, netTotal }, i) => {
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
  const [sortCol,     setSortCol]     = useState<string | null>(null)
  const [sortDir,     setSortDir]     = useState<SortDir>('desc')

  const needsRoundFilter = view === 'matches' || view === 'hole_stats' || view === 'skins'
  const needsScoreFilter = view === 'individual'

  function handleViewChange(v: View) {
    setView(v)
    setRoundFilter(defaultRound)
    setSortCol(null)
    setSortDir('desc')
  }

  function handleSort(col: string) {
    if (sortCol === col) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    } else {
      setSortCol(col)
      setSortDir('desc')
    }
  }

  const sortProps: SortProps = { sortCol, sortDir, onSort: handleSort }

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
          <Chevron className="text-white" />
        </div>

        {/* Right-side filter */}
        {needsRoundFilter && rounds.length > 0 && (
          <div className="flex items-center gap-1">
            <select
              value={roundFilter}
              onChange={e => setRoundFilter(Number(e.target.value))}
              className="bg-transparent text-xs font-semibold text-white appearance-none cursor-pointer focus:outline-none"
            >
              {rounds.map(r => (
                <option key={r.roundNumber} value={r.roundNumber} className="text-gray-900 bg-white font-normal">
                  Rd {r.roundNumber}
                </option>
              ))}
            </select>
            <Chevron className="text-white" />
          </div>
        )}

        {needsScoreFilter && (
          <div className="flex items-center gap-1">
            <select
              value={scoreType}
              onChange={e => setScoreType(e.target.value as 'gross' | 'net')}
              className="bg-transparent text-xs font-semibold text-white appearance-none cursor-pointer focus:outline-none"
            >
              <option value="gross" className="text-gray-900 bg-white font-normal">Gross</option>
              <option value="net"   className="text-gray-900 bg-white font-normal">Net</option>
            </select>
            <Chevron className="text-white" />
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
          {...sortProps}
        />
      )}
      {view === 'player_stats' && <PlayerStatsView stats={playerStats} {...sortProps} />}
      {view === 'hole_stats'   && <HoleStatsView   holeStats={holeStatsByRound[roundFilter] ?? []} {...sortProps} />}
      {view === 'skins'        && <SkinsView        skins={skinsByRound[roundFilter] ?? []} {...sortProps} />}
      {view === 'earnings'     && <EarningsView     earnings={earnings} {...sortProps} />}
    </div>
  )
}
