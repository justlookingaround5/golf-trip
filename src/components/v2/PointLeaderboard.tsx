'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type {
  MatchV2,
  PlayerLeaderboardStats,
  HoleLeaderboardStats,
  PlayerV2,
  TripRoundV2,
  SkinResultV2,
  TripRoundScoreV2,
  TripEarningsRow,
  TripTeamV2,
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

interface FilterProps {
  playerFilter: string | null
  onPlayerFilter: (id: string) => void
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
  if (score == null) return <span className="inline-flex h-7 w-7" />
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

function scoreDiffStr(diff: number | null): string {
  if (diff == null) return ''
  if (diff === 0) return '(E)'
  return diff > 0 ? `(+${diff})` : `(${diff})`
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  }
}

function teamBg(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function MatchLeaderboard({ matches, roundFilter, teams }: { matches: MatchV2[]; roundFilter: number; teams?: TripTeamV2[] }) {
  const router = useRouter()
  const filtered = [...matches.filter(m => m.roundNumber === roundFilter)]
    .sort((a, b) => parseTeeTime(a.teeTime) - parseTeeTime(b.teeTime))
  if (filtered.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400">No matches for this round.</p>
  }

  const colorMap = new Map<string, string>()
  if (teams) {
    for (const t of teams) colorMap.set(t.name, t.color)
  }

  // Group by course
  const courseGroups = new Map<string, MatchV2[]>()
  for (const m of filtered) {
    const list = courseGroups.get(m.courseName) ?? []
    list.push(m)
    courseGroups.set(m.courseName, list)
  }

  return (
    <div className="p-3 space-y-4">
      {[...courseGroups.entries()].map(([courseName, courseMatches]) => (
        <div key={courseName}>
          <div className="bg-emerald-50 rounded-t-lg px-3 py-2 text-center">
            <span className="text-sm font-bold text-gray-900">{courseName}</span>
          </div>
          <div className="space-y-2 mt-2">
            {courseMatches.map(m => {
              const aWins = m.teamA.points > m.teamB.points
              const bWins = m.teamB.points > m.teamA.points
              const tied = m.teamA.points === m.teamB.points
              const thruLabel = m.status === 'completed' ? 'FINAL'
                : m.thru != null ? `THRU ${m.thru}` : '—'
              const colorA = colorMap.get(m.teamA.name) ?? '#6b7280'
              const colorB = colorMap.get(m.teamB.name) ?? '#6b7280'

              // Determine background opacity per side
              const aAlpha = m.status === 'completed'
                ? (aWins ? 0.18 : 0.05)
                : tied ? 0.12 : (aWins ? 0.18 : 0.06)
              const bAlpha = m.status === 'completed'
                ? (bWins ? 0.18 : 0.05)
                : tied ? 0.12 : (bWins ? 0.18 : 0.06)

              return (
                <div
                  key={m.id}
                  className="flex rounded-lg overflow-hidden border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => router.push(`/v2/match/${m.id}`)}
                >
                  {/* Team A side */}
                  <div
                    className="flex-1 px-3 py-2.5 flex flex-col justify-center"
                    style={{ backgroundColor: teamBg(colorA, aAlpha) }}
                  >
                    {m.teamA.players.map(p => (
                      <span key={p.id} className={`text-xs leading-5 ${aWins ? 'font-bold text-gray-900' : 'font-medium text-gray-600'}`}>
                        {p.name}
                      </span>
                    ))}
                    <span className="text-[10px] text-gray-400 mt-0.5">{scoreDiffStr(m.teamAScoreDiff)}</span>
                  </div>

                  {/* Center: margin + thru */}
                  <div className="flex flex-col items-center justify-center px-2 py-2 bg-white min-w-[60px]">
                    {m.resultMargin ? (
                      <span className="text-xs font-black text-gray-900">{m.resultMargin}</span>
                    ) : tied ? (
                      <span className="text-[10px] font-bold text-gray-400">AS</span>
                    ) : (
                      <span className="text-[10px] font-bold text-gray-400">
                        {aWins ? `${m.teamA.name.split(' ').pop()}` : `${m.teamB.name.split(' ').pop()}`}
                      </span>
                    )}
                    <span className="text-[9px] text-gray-400 mt-0.5 uppercase tracking-wider">{thruLabel}</span>
                    <span className="text-[9px] text-gray-300 mt-0.5">{m.formatLabel}</span>
                  </div>

                  {/* Team B side */}
                  <div
                    className="flex-1 px-3 py-2.5 flex flex-col justify-center items-end text-right"
                    style={{ backgroundColor: teamBg(colorB, bAlpha) }}
                  >
                    {m.teamB.players.map(p => (
                      <span key={p.id} className={`text-xs leading-5 ${bWins ? 'font-bold text-gray-900' : 'font-medium text-gray-600'}`}>
                        {p.name}
                      </span>
                    ))}
                    <span className="text-[10px] text-gray-400 mt-0.5">{scoreDiffStr(m.teamBScoreDiff)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Individual Leaderboard ───────────────────────────────────────────────────

function IndividualLeaderboard({
  rounds, roundScores, players, scoreType, sortCol, sortDir, onSort, playerFilter, onPlayerFilter,
}: {
  rounds: TripRoundV2[]
  roundScores: TripRoundScoreV2[]
  players: PlayerV2[]
  scoreType: 'gross' | 'net'
} & SortProps & FilterProps) {
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

  const sorted = sortCol
    ? sortRows(defaultSorted, sortCol, sortDir, (row, col) => {
        if (col === 'player') return row.player.name
        if (col === 'diff') return row.diff
        const rdIdx = rounds.findIndex(r => `rd_${r.roundNumber}` === col)
        if (rdIdx >= 0) return row.scores[rdIdx]
        return null
      })
    : defaultSorted

  const rows = playerFilter ? sorted.filter(r => r.player.id === playerFilter) : sorted

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="bg-golf-800">
            <th
              className={`sticky left-0 px-3 py-2 text-left text-[10px] font-bold text-white uppercase tracking-wide cursor-pointer select-none transition-colors ${
                sortCol === 'player' ? 'bg-golf-700' : 'bg-golf-800 hover:bg-golf-700'
              }`}
              onClick={() => onSort('player')}
            >
              Player<SortArrow col="player" sortCol={sortCol} sortDir={sortDir} />
            </th>
            {rounds.map(r => (
              <th
                key={r.roundNumber}
                className={thSort(`rd_${r.roundNumber}`, sortCol)}
                onClick={() => onSort(`rd_${r.roundNumber}`)}
              >
                Rd {r.roundNumber}
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
            const isFiltered = playerFilter === player.id
            const bg = i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
            return (
              <tr key={player.id} className={bg}>
                <td
                  className={`${tdLeft(isFiltered ? 'bg-golf-50' : bg)} cursor-pointer ${isFiltered ? 'text-golf-800 font-bold' : ''}`}
                  onClick={() => onPlayerFilter(player.id)}
                >
                  {player.name}
                </td>
                {scores.map((s, j) => {
                  const roundPar = rounds[j]?.par ?? 0
                  const underPar = s != null && s < roundPar
                  return (
                    <td key={j} className={`${TD} ${isFiltered ? 'bg-golf-50' : ''} ${underPar ? 'text-red-600 font-semibold' : ''}`}>
                      {s ?? '—'}
                    </td>
                  )
                })}
                <td className={`${TD} font-bold ${isFiltered ? 'bg-golf-50' : ''} ${
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

function PlayerStatsView({ stats, sortCol, sortDir, onSort, playerFilter, onPlayerFilter }: { stats: PlayerLeaderboardStats[] } & SortProps & FilterProps) {
  const baseRows = [...stats].sort((a, b) => b.points - a.points)

  const sorted = sortCol
    ? sortRows(baseRows, sortCol, sortDir, (row, col) => {
        switch (col) {
          case 'player': return row.player.name
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

  const rows = playerFilter ? sorted.filter(r => r.player.id === playerFilter) : sorted

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="bg-golf-800">
            <th
              className={`sticky left-0 px-3 py-2 text-left text-[10px] font-bold text-white uppercase tracking-wide cursor-pointer select-none transition-colors ${
                sortCol === 'player' ? 'bg-golf-700' : 'bg-golf-800 hover:bg-golf-700'
              }`}
              onClick={() => onSort('player')}
            >
              Player<SortArrow col="player" sortCol={sortCol} sortDir={sortDir} />
            </th>
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
            const isFiltered = playerFilter === player.id
            const bg = i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
            return (
              <tr key={player.id} className={bg}>
                <td
                  className={`${tdLeft(isFiltered ? 'bg-golf-50' : bg)} cursor-pointer ${isFiltered ? 'text-golf-800 font-bold' : ''}`}
                  onClick={() => onPlayerFilter(player.id)}
                >
                  {player.name}
                </td>
                <td className={`${TD} ${isFiltered ? 'bg-golf-50' : ''}`}>{r.wins}-{r.losses}-{r.ties}</td>
                <td className={`${TD} ${isFiltered ? 'bg-golf-50' : ''}`}>{skinsWon}</td>
                <td className={`${TD} ${isFiltered ? 'bg-golf-50' : ''}`}>{pct(fairwayPct)}</td>
                <td className={`${TD} ${isFiltered ? 'bg-golf-50' : ''}`}>{pct(girPct)}</td>
                <td className={`${TD} ${isFiltered ? 'bg-golf-50' : ''}`}>{fmt1(puttsAvg)}</td>
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
          case 'hcp':       return row.handicapIndex
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
            <th className={thSort('hcp', sortCol)} onClick={() => onSort('hcp')}>
              HCP<SortArrow col="hcp" sortCol={sortCol} sortDir={sortDir} />
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
                <td className={`${TD} text-gray-400`}>{h.handicapIndex}</td>
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
                  {s.winnerName ?? <span className="inline-block h-5" />}
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

function EarningsView({ earnings, sortCol, sortDir, onSort, playerFilter, onPlayerFilter }: { earnings: TripEarningsRow[] } & SortProps & FilterProps) {
  const baseRows = [...earnings].sort((a, b) => b.netTotal - a.netTotal)

  const sorted = sortCol
    ? sortRows(baseRows, sortCol, sortDir, (row, col) => {
        switch (col) {
          case 'player':    return row.player.name
          case 'team':      return row.team
          case 'matches':   return row.matches
          case 'skins':     return row.skins
          case 'net_total': return row.netTotal
          default:          return null
        }
      })
    : baseRows

  const rows = playerFilter ? sorted.filter(r => r.player.id === playerFilter) : sorted

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="bg-golf-800">
            <th
              className={`sticky left-0 px-3 py-2 text-left text-[10px] font-bold text-white uppercase tracking-wide cursor-pointer select-none transition-colors ${
                sortCol === 'player' ? 'bg-golf-700' : 'bg-golf-800 hover:bg-golf-700'
              }`}
              onClick={() => onSort('player')}
            >
              Player<SortArrow col="player" sortCol={sortCol} sortDir={sortDir} />
            </th>
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
            const isFiltered = playerFilter === player.id
            const bg = i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
            return (
              <tr key={player.id} className={bg}>
                <td
                  className={`${tdLeft(isFiltered ? 'bg-golf-50' : bg)} cursor-pointer ${isFiltered ? 'text-golf-800 font-bold' : ''}`}
                  onClick={() => onPlayerFilter(player.id)}
                >
                  {player.name}
                </td>
                <td className={`${TD} font-semibold ${isFiltered ? 'bg-golf-50 ' : ''}${team    >= 0 ? 'text-green-600' : 'text-red-600'}`}>{money(team)}</td>
                <td className={`${TD} font-semibold ${isFiltered ? 'bg-golf-50 ' : ''}${matches >= 0 ? 'text-green-600' : 'text-red-600'}`}>{money(matches)}</td>
                <td className={`${TD} font-semibold ${isFiltered ? 'bg-golf-50 ' : ''}${skins   >= 0 ? 'text-green-600' : 'text-red-600'}`}>{money(skins)}</td>
                <td className={`${TD} font-black   ${isFiltered ? 'bg-golf-50 ' : ''}${netTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>{money(netTotal)}</td>
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
  teams?: TripTeamV2[]
}

export default function PointLeaderboard({
  matches, rounds, players, playerStats, roundScores,
  holeStatsByRound, skinsByRound, earnings, teams,
}: PointLeaderboardProps) {
  const defaultRound = rounds[0]?.roundNumber ?? 1
  const [view,         setView]         = useState<View>('matches')
  const [roundFilter,  setRoundFilter]  = useState<number>(defaultRound)
  const [scoreType,    setScoreType]    = useState<'gross' | 'net'>('gross')
  const [sortCol,      setSortCol]      = useState<string | null>(null)
  const [sortDir,      setSortDir]      = useState<SortDir>('desc')
  const [playerFilter, setPlayerFilter] = useState<string | null>(null)

  const needsRoundFilter = view === 'matches' || view === 'hole_stats' || view === 'skins'
  const needsScoreFilter = view === 'individual'

  function handleViewChange(v: View) {
    setView(v)
    setRoundFilter(defaultRound)
    setSortCol(null)
    setSortDir('desc')
    setPlayerFilter(null)
  }

  function handleSort(col: string) {
    if (sortCol === col) {
      if (sortDir === 'desc') {
        setSortDir('asc')
      } else {
        // asc → reset to original order
        setSortCol(null)
        setSortDir('desc')
      }
    } else {
      setSortCol(col)
      setSortDir('desc')
    }
  }

  function handlePlayerFilter(id: string) {
    setPlayerFilter(prev => prev === id ? null : id)
  }

  const sortProps: SortProps = { sortCol, sortDir, onSort: handleSort }
  const filterProps: FilterProps = { playerFilter, onPlayerFilter: handlePlayerFilter }

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
        <MatchLeaderboard matches={matches} roundFilter={roundFilter} teams={teams} />
      )}
      {view === 'individual' && (
        <IndividualLeaderboard
          rounds={rounds} roundScores={roundScores}
          players={players} scoreType={scoreType}
          {...sortProps} {...filterProps}
        />
      )}
      {view === 'player_stats' && <PlayerStatsView stats={playerStats} {...sortProps} {...filterProps} />}
      {view === 'hole_stats'   && <HoleStatsView   holeStats={holeStatsByRound[roundFilter] ?? []} {...sortProps} />}
      {view === 'skins'        && <SkinsView        skins={skinsByRound[roundFilter] ?? []} />}
      {view === 'earnings'     && <EarningsView     earnings={earnings} {...sortProps} {...filterProps} />}
    </div>
  )
}
