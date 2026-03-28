'use client'

import React, { useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { UserStatsData } from '@/lib/v2/stats-data'
import type { RoundV2, ScorecardV2, HoleScoreV2 } from '@/lib/v2/types'

function avg(values: number[]): number | null {
  return values.length > 0
    ? Math.round(values.reduce((s, v) => s + v, 0) / values.length * 10) / 10
    : null
}

function ScoringBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 text-xs font-semibold text-gray-600 text-right shrink-0">{label}</span>
      <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-xs font-bold text-gray-700 tabular-nums text-right">{Math.round(pct)}%</span>
    </div>
  )
}

function scoreBadge(gross: number, par: number) {
  const diff = gross - par
  if (diff <= -2) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-red-600 text-red-600 font-semibold">
        <span className="inline-flex items-center justify-center w-[14px] h-[14px] rounded-full border border-red-600 text-[10px]">{gross}</span>
      </span>
    )
  }
  if (diff === -1) {
    return (
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-red-600 text-red-600 font-semibold text-xs">{gross}</span>
    )
  }
  if (diff === 0) {
    return <span className="text-xs text-gray-700">{gross}</span>
  }
  if (diff === 1) {
    return (
      <span className="inline-flex items-center justify-center w-5 h-5 border border-blue-500 text-blue-600 text-xs">{gross}</span>
    )
  }
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 border border-blue-500 text-blue-600">
      <span className="inline-flex items-center justify-center w-[14px] h-[14px] border border-blue-500 text-[10px]">{gross}</span>
    </span>
  )
}

function InlineScorecard({ scorecard, userId }: { scorecard: ScorecardV2; userId: string }) {
  const player = scorecard.players.find(p => p.player.id === userId) ?? scorecard.players[0]
  const holes = useMemo(
    () => [...(player?.holes ?? [])].sort((a, b) => a.holeNumber - b.holeNumber),
    [player]
  )

  if (!player || holes.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-4">No scores recorded</p>
  }

  const front = holes.filter(h => h.holeNumber <= 9)
  const back = holes.filter(h => h.holeNumber > 9)
  const nines: { label: string; holes: HoleScoreV2[] }[] = []
  if (front.length > 0) nines.push({ label: 'Out', holes: front })
  if (back.length > 0) nines.push({ label: 'In', holes: back })

  return (
    <div className="overflow-x-auto">
      <table className="text-xs border-collapse">
        <tbody>
          {/* Hole number row */}
          <tr className="bg-gray-50">
            <td className="sticky left-0 z-10 bg-gray-50 px-2 py-1.5 text-[10px] font-semibold text-gray-500 border-b border-gray-200">Hole</td>
            {nines.map(nine => (
              <React.Fragment key={nine.label}>
                {nine.holes.map(h => (
                  <td key={h.holeId} className="px-2 py-1.5 text-center font-medium text-gray-600 border-b border-gray-200 min-w-[28px]">
                    {h.holeNumber}
                  </td>
                ))}
                <td className="px-2 py-1.5 text-center font-bold text-gray-600 border-b border-l border-gray-300 bg-gray-100 min-w-[32px]">
                  {nine.label}
                </td>
              </React.Fragment>
            ))}
            {nines.length === 2 && (
              <td className="px-2 py-1.5 text-center font-bold text-gray-600 border-b border-l border-gray-300 bg-gray-100 min-w-[32px]">
                Tot
              </td>
            )}
          </tr>
          {/* Par row */}
          <tr>
            <td className="sticky left-0 z-10 bg-white px-2 py-1.5 text-[10px] font-semibold text-gray-500 border-b border-gray-200">Par</td>
            {nines.map(nine => (
              <React.Fragment key={nine.label}>
                {nine.holes.map(h => (
                  <td key={h.holeId} className="px-2 py-1.5 text-center text-gray-500 border-b border-gray-200">
                    {h.par}
                  </td>
                ))}
                <td className="px-2 py-1.5 text-center font-bold text-gray-600 border-b border-l border-gray-300 bg-gray-50">
                  {nine.holes.reduce((s, h) => s + h.par, 0)}
                </td>
              </React.Fragment>
            ))}
            {nines.length === 2 && (
              <td className="px-2 py-1.5 text-center font-bold text-gray-600 border-b border-l border-gray-300 bg-gray-50">
                {holes.reduce((s, h) => s + h.par, 0)}
              </td>
            )}
          </tr>
          {/* Score row */}
          <tr>
            <td className="sticky left-0 z-10 bg-white px-2 py-2 text-[10px] font-semibold text-gray-500">Score</td>
            {nines.map(nine => {
              let nineGross = 0
              let nineAll = true
              return (
                <React.Fragment key={nine.label}>
                  {nine.holes.map(h => {
                    if (h.gross != null) nineGross += h.gross; else nineAll = false
                    return (
                      <td key={h.holeId} className="px-2 py-2 text-center">
                        {h.gross != null ? scoreBadge(h.gross, h.par) : <span className="text-gray-300">-</span>}
                      </td>
                    )
                  })}
                  <td className="px-2 py-2 text-center font-bold text-blue-900 border-l border-gray-300 bg-gray-50">
                    {nineAll ? nineGross : ''}
                  </td>
                </React.Fragment>
              )
            })}
            {nines.length === 2 && (() => {
              const total = holes.every(h => h.gross != null) ? holes.reduce((s, h) => s + h.gross!, 0) : null
              return (
                <td className="px-2 py-2 text-center font-bold text-blue-900 border-l border-gray-300 bg-gray-50">
                  {total ?? ''}
                </td>
              )
            })()}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function RoundRow({ round, expanded, scorecard, loading, onToggle, userId }: {
  round: RoundV2
  expanded: boolean
  scorecard: ScorecardV2 | null
  loading: boolean
  onToggle: () => void
  userId: string
}) {
  const isComplete = round.holesPlayed >= round.totalHoles
  const vsPar = isComplete && round.grossTotal != null ? round.grossTotal - round.par : null
  const vsParStr = vsPar == null ? null : vsPar === 0 ? 'E' : vsPar > 0 ? `+${vsPar}` : `${vsPar}`

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 truncate">{round.courseName}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(round.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            {round.tripName && <> · {round.tripName}</>}
          </p>
        </div>
        <div className="shrink-0 ml-3 flex items-center gap-2">
          {isComplete && round.grossTotal != null ? (
            <p className="text-sm font-bold text-gray-900 tabular-nums">
              {round.grossTotal}
              {vsParStr && (
                <span className={`ml-1 text-xs font-semibold tabular-nums ${
                  vsPar! < 0 ? 'text-red-600' : vsPar! > 0 ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  ({vsParStr})
                </span>
              )}
            </p>
          ) : (
            <p className="text-xs text-gray-400">In progress</p>
          )}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className={`text-gray-300 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>
      {expanded && (
        <div className="border-t border-gray-100">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-golf-800" />
            </div>
          ) : scorecard ? (
            <InlineScorecard scorecard={scorecard} userId={userId} />
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">Could not load scorecard</p>
          )}
        </div>
      )}
    </div>
  )
}

interface StatsClientProps {
  data: UserStatsData
  isOwnProfile?: boolean
  backLabel?: string
  backHref?: string
}

export default function StatsClient({ data, isOwnProfile, backLabel, backHref }: StatsClientProps) {
  const router = useRouter()
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [expandedRoundId, setExpandedRoundId] = useState<string | null>(null)
  const [scorecardCache, setScorecardCache] = useState<Record<string, ScorecardV2>>({})
  const [loadingRoundId, setLoadingRoundId] = useState<string | null>(null)

  const toggleRound = useCallback(async (round: RoundV2) => {
    if (expandedRoundId === round.id) {
      setExpandedRoundId(null)
      return
    }
    setExpandedRoundId(round.id)
    if (scorecardCache[round.courseId]) return
    setLoadingRoundId(round.id)
    try {
      const res = await fetch(`/api/scorecard/${round.courseId}`)
      if (res.ok) {
        const data: ScorecardV2 = await res.json()
        setScorecardCache(prev => ({ ...prev, [round.courseId]: data }))
      }
    } finally {
      setLoadingRoundId(null)
    }
  }, [expandedRoundId, scorecardCache])

  const { userId, userName, rounds, holeStatsByCourse, matchRecord, netEarnings } = data
  const firstName = userName.split(' ')[0]

  const completedRounds = rounds.filter(r => r.holesPlayed >= r.totalHoles)
  const courses = Array.from(
    new Map(completedRounds.map(r => [r.courseId, r.courseName])).entries()
  ).map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const filteredRounds = selectedCourseId
    ? rounds.filter(r => r.courseId === selectedCourseId)
    : rounds

  const filteredCompleted = filteredRounds.filter(r => r.holesPlayed >= r.totalHoles)

  const filteredHoleStats = selectedCourseId
    ? (holeStatsByCourse[selectedCourseId] ?? [])
    : Object.values(holeStatsByCourse).flat()

  // Scoring distribution
  const totalEagles  = filteredHoleStats.reduce((s, h) => s + h.eagles,  0)
  const totalBirdies = filteredHoleStats.reduce((s, h) => s + h.birdies, 0)
  const totalPars    = filteredHoleStats.reduce((s, h) => s + h.pars,    0)
  const totalBogeys  = filteredHoleStats.reduce((s, h) => s + h.bogeys,  0)
  const totalDoubles = filteredHoleStats.reduce((s, h) => s + h.doubles, 0)
  const totalScores  = totalEagles + totalBirdies + totalPars + totalBogeys + totalDoubles
  const scoringPct   = (n: number) => totalScores > 0 ? (n / totalScores) * 100 : 0

  const careerLow = filteredCompleted.length > 0
    ? Math.min(...filteredCompleted.map(r => r.grossTotal!))
    : null

  const record = `${matchRecord.wins}-${matchRecord.losses}-${matchRecord.ties}`
  const earnings = netEarnings != null
    ? (netEarnings >= 0 ? `+$${Math.round(netEarnings)}` : `-$${Math.round(Math.abs(netEarnings))}`)
    : '—'
  const earningsHeaderColor = netEarnings != null
    ? (netEarnings >= 0 ? 'text-green-400' : 'text-red-400')
    : 'text-white'

  const girPct = selectedCourseId ? avg(filteredHoleStats.map(h => h.girPct ?? 0)) : avg(filteredHoleStats.map(h => h.girPct ?? 0))
  const fairwayPct = selectedCourseId ? avg(filteredHoleStats.map(h => h.fairwayPct ?? 0)) : avg(filteredHoleStats.map(h => h.fairwayPct ?? 0))
  const completedWithPutts = filteredCompleted.filter(r => r.totalPutts != null)
  const puttsAvg = completedWithPutts.length > 0
    ? Math.round(completedWithPutts.reduce((s, r) => s + r.totalPutts!, 0) / completedWithPutts.length * 10) / 10
    : null


  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="bg-golf-800 px-4 pt-14 pb-6 text-white">
        <div className="mx-auto max-w-lg flex items-start justify-between">
          <div>
            {isOwnProfile ? (
              <Link
                href="/profile"
                className="mb-3 inline-flex items-center gap-1 text-sm text-golf-300 hover:text-white transition"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Profile
              </Link>
            ) : (
              <button
                onClick={() => router.back()}
                className="mb-3 inline-flex items-center gap-1 text-sm text-golf-300 hover:text-white transition"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                {backLabel ?? firstName}
              </button>
            )}
            <h1 className="text-2xl font-bold">{isOwnProfile ? 'My Stats' : `${firstName}'s Stats`}</h1>
          </div>
          <div className="text-right text-sm text-golf-200 pt-8 shrink-0">
            <div>Record <span className="text-base font-bold text-white">{record}</span></div>
            <div>Earnings <span className={`text-base font-bold ${earningsHeaderColor}`}>{earnings}</span></div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg">
        <div className="mx-3 mt-3">
          <button
            onClick={() => setSheetOpen(true)}
            className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200 transition"
          >
            {selectedCourseId && <span className="w-1.5 h-1.5 rounded-full bg-golf-800" />}
            {selectedCourseId ? courses.find(c => c.id === selectedCourseId)?.name ?? 'All Courses' : 'All Courses'}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          <div className="grid grid-cols-4 gap-2 mt-2">
            {[
              { label: 'Low',   value: careerLow   != null ? `${careerLow}`                    : '—' },
              { label: 'GIR%',  value: girPct      != null ? `${Math.round(girPct)}%`           : '—' },
              { label: 'FW%',   value: fairwayPct  != null ? `${Math.round(fairwayPct)}%`       : '—' },
              { label: 'Putts', value: puttsAvg    != null ? `${puttsAvg}`                      : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl border border-gray-200 bg-white shadow-sm px-2 py-4 text-center">
                <p className="text-xl font-black text-gray-900">{value}</p>
                <p className="text-xs font-semibold text-gray-500 mt-0.5 uppercase tracking-wider">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {filteredHoleStats.length > 0 && (
          <div className="mx-3 mt-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">Scoring Distribution</p>
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 space-y-2">
              <ScoringBar label="Eagles"  pct={scoringPct(totalEagles)}  color="bg-yellow-500" />
              <ScoringBar label="Birdies" pct={scoringPct(totalBirdies)} color="bg-red-500" />
              <ScoringBar label="Pars"    pct={scoringPct(totalPars)}    color="bg-gray-400" />
              <ScoringBar label="Bogeys"  pct={scoringPct(totalBogeys)}  color="bg-blue-500" />
              <ScoringBar label="Double+" pct={scoringPct(totalDoubles)} color="bg-blue-800" />
            </div>
          </div>
        )}

        <div className="mx-3 mt-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">Rounds ({filteredCompleted.length})</p>
          {filteredCompleted.length > 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {filteredCompleted.map(r => (
                <RoundRow
                  key={r.id}
                  round={r}
                  expanded={expandedRoundId === r.id}
                  scorecard={scorecardCache[r.courseId] ?? null}
                  loading={loadingRoundId === r.id}
                  onToggle={() => toggleRound(r)}
                  userId={userId}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-6 text-center">
              <p className="text-sm text-gray-400">Play a round to see your stats</p>
            </div>
          )}
        </div>
      </div>

      {sheetOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[60]" onClick={() => setSheetOpen(false)} />
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 pointer-events-none">
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden pointer-events-auto">
              <div className="overflow-y-auto max-h-72 divide-y divide-gray-100 [scrollbar-gutter:stable]">
                <button
                  onClick={() => { setSelectedCourseId(null); setSheetOpen(false) }}
                  className={`w-full text-left px-4 py-3 text-sm font-semibold flex items-center gap-2 ${
                    selectedCourseId === null ? 'text-golf-800' : 'text-gray-700'
                  }`}
                >
                  {selectedCourseId === null && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="shrink-0">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                  All Courses
                </button>
                {Object.entries(
                  courses.reduce<Record<string, typeof courses>>((acc, c) => {
                    const letter = c.name[0].toUpperCase()
                    ;(acc[letter] ??= []).push(c)
                    return acc
                  }, {})
                ).map(([letter, group]) => (
                  <div key={letter}>
                    <div className="sticky top-0 bg-white pl-4 pr-4 py-1">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{letter}</span>
                    </div>
                    {group.map(c => (
                      <button
                        key={c.id}
                        onClick={() => { setSelectedCourseId(c.id); setSheetOpen(false) }}
                        className={`w-full text-left px-4 py-3 text-sm flex items-center gap-2 border-b border-gray-100 last:border-b-0 ${
                          selectedCourseId === c.id ? 'font-semibold text-golf-800' : 'text-gray-700'
                        }`}
                      >
                        {selectedCourseId === c.id && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="shrink-0">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                        {c.name}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
