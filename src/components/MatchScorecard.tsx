'use client'

import { useMemo, useState } from 'react'
import type { Hole, Score, MatchPlayer, PlayerCourseHandicap } from '@/lib/types'
import { MATCH_FORMAT_LABELS } from '@/lib/types'
import type { MatchFormat } from '@/lib/types'
import { getStrokesPerHole } from '@/lib/handicap'
import { calculateMatchPlay, getHoleResults } from '@/lib/match-play'
import type { MatchPlayResult, HoleResult } from '@/lib/match-play'
import ScoreIndicator from '@/components/ScoreIndicator'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MatchScorecardProps {
  matchId: string
  courseName: string
  coursePar: number
  format: MatchFormat
  pointValue: number
  status: 'pending' | 'in_progress' | 'completed'
  holes: Hole[]
  matchPlayers: MatchPlayer[]
  scores: Score[]
  courseHandicaps: PlayerCourseHandicap[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function playerName(mp: MatchScorecardProps['matchPlayers'][number]): string {
  return mp.trip_player?.player?.name ?? 'Unknown'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MatchScorecard({
  courseName,
  coursePar,
  format,
  pointValue,
  status,
  holes,
  matchPlayers,
  scores,
  courseHandicaps,
}: MatchScorecardProps) {
  const [viewMode, setViewMode] = useState<'horizontal' | 'vertical'>('vertical')

  const sortedHoles = useMemo(
    () => [...holes].sort((a, b) => a.hole_number - b.hole_number),
    [holes]
  )

  const teamAPlayers = useMemo(
    () => matchPlayers.filter((mp) => mp.side === 'team_a'),
    [matchPlayers]
  )

  const teamBPlayers = useMemo(
    () => matchPlayers.filter((mp) => mp.side === 'team_b'),
    [matchPlayers]
  )

  // Build player strokes map — low handicap player gets 0, others receive the difference
  const playerStrokesMap = useMemo(() => {
    const rawStrokes = matchPlayers.map((mp) => ({
      id: mp.trip_player_id,
      strokes: courseHandicaps.find((c) => c.trip_player_id === mp.trip_player_id)?.handicap_strokes ?? 0,
    }))
    const minStrokes = rawStrokes.length > 0 ? Math.min(...rawStrokes.map((p) => p.strokes)) : 0
    const map = new Map<string, Map<number, number>>()
    for (const { id, strokes } of rawStrokes) {
      map.set(id, getStrokesPerHole(Math.max(0, strokes - minStrokes), holes))
    }
    return map
  }, [matchPlayers, courseHandicaps, holes])

  // Match play result
  const matchResult: MatchPlayResult | null = useMemo(() => {
    if (scores.length === 0) return null
    return calculateMatchPlay(scores, matchPlayers, holes, playerStrokesMap, format)
  }, [scores, matchPlayers, holes, playerStrokesMap, format])

  // Hole results
  const holeResults: HoleResult[] = useMemo(() => {
    if (scores.length === 0) return []
    return getHoleResults(scores, matchPlayers, holes, playerStrokesMap, format)
  }, [scores, matchPlayers, holes, playerStrokesMap, format])

  const holeResultByNumber = useMemo(() => {
    const map = new Map<number, HoleResult>()
    for (const hr of holeResults) {
      map.set(hr.holeNumber, hr)
    }
    return map
  }, [holeResults])

  // Build a lookup: holeId -> tripPlayerId -> score
  const scoresByHoleAndPlayer = useMemo(() => {
    const map = new Map<string, Map<string, number>>()
    for (const s of scores) {
      if (!map.has(s.hole_id)) {
        map.set(s.hole_id, new Map())
      }
      map.get(s.hole_id)!.set(s.trip_player_id, s.gross_score)
    }
    return map
  }, [scores])

  // Status display
  const statusDisplay = useMemo(() => {
    if (!matchResult || matchResult.holesPlayed === 0) {
      return { label: 'Not Started', color: 'bg-gray-100 text-gray-700' }
    }

    const teamANames = teamAPlayers.map(playerName).join(' & ')
    const teamBNames = teamBPlayers.map(playerName).join(' & ')

    if (matchResult.isComplete) {
      if (matchResult.leader === 'tie') {
        return { label: `Tied - ${matchResult.status}`, color: 'bg-yellow-100 text-yellow-800' }
      }
      const winnerNames = matchResult.leader === 'team_a' ? teamANames : teamBNames
      return {
        label: `${winnerNames} win ${matchResult.status}`,
        color: 'bg-green-100 text-green-800',
      }
    }

    if (matchResult.leader === 'tie') {
      return {
        label: `All Square thru ${matchResult.holesPlayed}`,
        color: 'bg-gray-100 text-gray-700',
      }
    }

    const leaderNames = matchResult.leader === 'team_a' ? teamANames : teamBNames
    return {
      label: `${leaderNames} ${matchResult.status}`,
      color: 'bg-green-100 text-green-800',
    }
  }, [matchResult, teamAPlayers, teamBPlayers])

  const frontNine = sortedHoles.filter((h) => h.hole_number <= 9)
  const backNine = sortedHoles.filter((h) => h.hole_number > 9)
  const allPlayers = [...teamAPlayers, ...teamBPlayers]

  // Running match status per hole — clinch-aware, standard labels
  const runningStatus = useMemo(() => {
    const map = new Map<number, {
      leader: 'team_a' | 'team_b' | 'tie'
      margin: number
      clinched: boolean
      label: string
    }>()
    const totalHoles = sortedHoles.length || 18
    let aUp = 0
    let bUp = 0
    for (let i = 0; i < sortedHoles.length; i++) {
      const hole = sortedHoles[i]
      const hr = holeResultByNumber.get(hole.hole_number)
      if (!hr) continue
      if (hr.winner === 'team_a') aUp++
      else if (hr.winner === 'team_b') bUp++
      const holesLeft = totalHoles - (i + 1)
      const diff = aUp - bUp
      const absLead = Math.abs(diff)
      if (absLead > holesLeft) {
        const label = holesLeft === 0 ? `${absLead}UP` : `${absLead}&${holesLeft}`
        map.set(hole.hole_number, {
          leader: diff > 0 ? 'team_a' : 'team_b',
          margin: absLead,
          clinched: true,
          label,
        })
        break
      }
      const label = diff === 0 ? 'AS' : diff > 0 ? `${absLead} UP` : `${absLead} DN`
      map.set(hole.hole_number, {
        leader: diff > 0 ? 'team_a' : diff < 0 ? 'team_b' : 'tie',
        margin: absLead,
        clinched: false,
        label,
      })
    }
    return map
  }, [sortedHoles, holeResultByNumber])

  const clinchHoleNumber = useMemo(() => {
    for (const [holeNum, s] of runningStatus) {
      if (s.clinched) return holeNum
    }
    return null
  }, [runningStatus])

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-golf-50 dark:bg-golf-900/30 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{courseName}</h3>
            <p className="text-xs text-gray-500">
              {MATCH_FORMAT_LABELS[format]} &middot; Par {coursePar} &middot;{' '}
              {pointValue} pt{pointValue !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <button
              onClick={() => setViewMode(viewMode === 'vertical' ? 'horizontal' : 'vertical')}
              className="rounded-md border border-gray-300 px-2 py-1 text-[10px] text-gray-500 hover:bg-gray-50"
            >
              {viewMode === 'vertical' ? '⟷' : '⟳'}
            </button>
            <StatusBadge status={status} />
          </div>
        </div>
      </div>

      {/* Teams & Match Status */}
      <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="mb-2 flex items-center justify-between text-sm">
          <div className="font-semibold text-gray-900 dark:text-white">
            {teamAPlayers.map(playerName).join(' & ')}
          </div>
          <span className="mx-2 text-xs text-gray-400">vs</span>
          <div className="font-semibold text-gray-900 dark:text-white">
            {teamBPlayers.map(playerName).join(' & ')}
          </div>
        </div>
        <div
          className={`rounded-lg px-3 py-2 text-center text-sm font-bold ${statusDisplay.color}`}
        >
          {statusDisplay.label}
        </div>
      </div>

      {/* Scorecard */}
      {scores.length > 0 && viewMode === 'vertical' && (
        <VerticalScorecard
          holes={sortedHoles}
          allPlayers={allPlayers}
          scoresByHoleAndPlayer={scoresByHoleAndPlayer}
          holeResultByNumber={holeResultByNumber}
          runningStatus={runningStatus}
          playerStrokesMap={playerStrokesMap}
          clinchHoleNumber={clinchHoleNumber}
        />
      )}

      {scores.length > 0 && viewMode === 'horizontal' && (
        <div className="overflow-x-auto">
          {[
            { label: 'Front 9', holes: frontNine },
            { label: 'Back 9', holes: backNine },
          ]
            .filter((nine) => nine.holes.length > 0)
            .map((nine) => (
              <div key={nine.label}>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                      <th className="px-2 py-2 text-left font-medium text-gray-500">
                        {nine.label}
                      </th>
                      {nine.holes.map((h) => (
                        <th
                          key={h.id}
                          className="w-10 px-1 py-2 text-center font-medium text-gray-500"
                        >
                          {h.hole_number}
                        </th>
                      ))}
                      <th className="w-12 px-2 py-2 text-center font-medium text-gray-500">
                        Out/In
                      </th>
                    </tr>
                    {/* Par row */}
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <td className="px-2 py-1 text-xs font-medium text-gray-400">
                        Par
                      </td>
                      {nine.holes.map((h) => (
                        <td
                          key={h.id}
                          className="px-1 py-1 text-center text-gray-400"
                        >
                          {h.par}
                        </td>
                      ))}
                      <td className="px-2 py-1 text-center font-medium text-gray-400">
                        {nine.holes.reduce((sum, h) => sum + h.par, 0)}
                      </td>
                    </tr>
                  </thead>
                  <tbody>
                    {allPlayers.map((mp) => {
                      const sideLabel = mp.side === 'team_a' ? 'A' : 'B'
                      let nineTotal = 0
                      let hasScores = false

                      return (
                        <tr
                          key={mp.trip_player_id}
                          className="border-b border-gray-100"
                        >
                          <td className="px-2 py-2 font-medium text-gray-900 dark:text-white">
                            <span className="text-xs text-gray-400">
                              [{sideLabel}]{' '}
                            </span>
                            {playerName(mp)}
                          </td>
                          {nine.holes.map((h) => {
                            const holeScores = scoresByHoleAndPlayer.get(h.id)
                            const gross = holeScores?.get(mp.trip_player_id)
                            if (gross !== undefined) {
                              nineTotal += gross
                              hasScores = true
                            }

                            const receivesStroke = (playerStrokesMap.get(mp.trip_player_id)?.get(h.hole_number) ?? 0) > 0
                            const afterClinch = clinchHoleNumber !== null && h.hole_number > clinchHoleNumber

                            return (
                              <td
                                key={h.id}
                                className={`relative px-1 py-2 text-center ${afterClinch ? 'opacity-30' : receivesStroke ? 'bg-golf-50 dark:bg-golf-900/20' : ''}`}
                              >
                                {receivesStroke && !afterClinch && (
                                  <span className="absolute right-0.5 top-0.5 text-[8px] leading-none text-golf-600 dark:text-golf-400">●</span>
                                )}
                                {gross !== undefined ? (
                                  <ScoreIndicator score={gross} par={h.par} size="xs" />
                                ) : (
                                  <span className="text-gray-300">-</span>
                                )}
                              </td>
                            )
                          })}
                          <td className="px-2 py-2 text-center font-semibold text-gray-900 dark:text-white">
                            {hasScores ? nineTotal : '-'}
                          </td>
                        </tr>
                      )
                    })}

                    {/* Hole result row */}
                    <tr className="border-b border-gray-100 bg-golf-50 dark:bg-golf-900/30">
                      <td className="px-2 py-1 text-xs font-medium text-golf-700">
                        Result
                      </td>
                      {nine.holes.map((h) => {
                        const hr = holeResultByNumber.get(h.hole_number)
                        const afterClinch = clinchHoleNumber !== null && h.hole_number > clinchHoleNumber
                        if (afterClinch) {
                          return <td key={h.id} className="px-1 py-1 text-center text-gray-200 dark:text-gray-700">—</td>
                        }
                        if (!hr) {
                          return <td key={h.id} className="px-1 py-1 text-center text-gray-300">·</td>
                        }
                        return (
                          <td key={h.id} className="px-1 py-1 text-center">
                            {hr.winner === 'team_a' ? (
                              <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
                            ) : hr.winner === 'team_b' ? (
                              <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-400" />
                            ) : (
                              <span className="inline-block h-2.5 w-2.5 rounded-full bg-gray-300" />
                            )}
                          </td>
                        )
                      })}
                      <td className="px-2 py-1 text-center text-xs text-gray-400">—</td>
                    </tr>

                    {/* Running standing row */}
                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-golf-50 dark:bg-golf-900/30">
                      <td className="px-2 py-1 text-xs font-medium text-golf-700">
                        Standing
                      </td>
                      {nine.holes.map((h) => {
                        const s = runningStatus.get(h.hole_number)
                        const afterClinch = clinchHoleNumber !== null && h.hole_number > clinchHoleNumber
                        if (afterClinch) {
                          return <td key={h.id} className="px-1 py-1 text-center text-gray-200 dark:text-gray-700">—</td>
                        }
                        if (!s) {
                          return <td key={h.id} className="px-1 py-1 text-center text-gray-300">·</td>
                        }
                        return (
                          <td key={h.id} className="px-1 py-1 text-center">
                            <span className={`text-[9px] font-bold leading-none ${
                              s.clinched
                                ? s.leader === 'team_a' ? 'text-green-700' : 'text-red-600'
                                : s.leader === 'team_a' ? 'text-green-700'
                                : s.leader === 'team_b' ? 'text-red-600'
                                : 'text-gray-500'
                            }`}>
                              {s.label}
                            </span>
                          </td>
                        )
                      })}
                      <td className="px-2 py-1 text-center text-xs text-gray-400">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}
        </div>
      )}

      {/* No scores message */}
      {scores.length === 0 && (
        <div className="p-6 text-center text-sm text-gray-500">
          No scores recorded yet for this match.
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Vertical Scorecard (mobile-first)
// ---------------------------------------------------------------------------

function VerticalScorecard({
  holes,
  allPlayers,
  scoresByHoleAndPlayer,
  holeResultByNumber,
  runningStatus,
  playerStrokesMap,
  clinchHoleNumber,
}: {
  holes: Hole[]
  allPlayers: MatchPlayer[]
  scoresByHoleAndPlayer: Map<string, Map<string, number>>
  holeResultByNumber: Map<number, HoleResult>
  runningStatus: Map<number, {
    leader: 'team_a' | 'team_b' | 'tie'
    margin: number
    clinched: boolean
    label: string
  }>
  playerStrokesMap: Map<string, Map<number, number>>
  clinchHoleNumber: number | null
}) {
  return (
    <div className="divide-y divide-gray-100">
      {holes.map((hole) => {
        const hr = holeResultByNumber.get(hole.hole_number)
        const status = runningStatus.get(hole.hole_number)
        const holeScores = scoresByHoleAndPlayer.get(hole.id)
        const hasAnyScore = holeScores && holeScores.size > 0
        const afterClinch = clinchHoleNumber !== null && hole.hole_number > clinchHoleNumber

        return (
          <div key={hole.id} className={`px-4 py-2 ${afterClinch ? 'opacity-40' : ''}`}>
            <div className="flex items-center gap-3">
              {/* Hole number + par */}
              <div className="w-12 shrink-0 text-center">
                <div className="text-sm font-bold text-gray-900">{hole.hole_number}</div>
                <div className="text-[10px] text-gray-400">Par {hole.par}</div>
              </div>

              {/* Player scores */}
              <div className="flex-1 flex items-center gap-4">
                {allPlayers.map((mp) => {
                  const gross = holeScores?.get(mp.trip_player_id)
                  const firstName = (playerName(mp).split(' ')[0] ?? '').slice(0, 6)
                  const receivesStroke = (playerStrokesMap.get(mp.trip_player_id)?.get(hole.hole_number) ?? 0) > 0

                  return (
                    <div key={mp.trip_player_id} className={`relative text-center min-w-[40px] rounded px-1 ${receivesStroke ? 'bg-golf-50 dark:bg-golf-900/20' : ''}`}>
                      <div className="text-[10px] text-gray-500 truncate">{firstName}</div>
                      {receivesStroke && (
                        <span className="absolute right-0.5 top-0.5 text-[8px] leading-none text-golf-600 dark:text-golf-400">●</span>
                      )}
                      {gross !== undefined ? (
                        <ScoreIndicator score={gross} par={hole.par} size="xs" />
                      ) : (
                        <span className="text-xs text-gray-300">-</span>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Hole result */}
              <div className="w-8 shrink-0 text-center">
                {hr && hole.hole_number <= (clinchHoleNumber ?? Infinity) ? (
                  hr.winner === 'team_a' ? (
                    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-green-100 text-[9px] font-bold text-green-700">W</span>
                  ) : hr.winner === 'team_b' ? (
                    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-100 text-[9px] font-bold text-red-600">L</span>
                  ) : (
                    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-gray-100 text-[9px] font-bold text-gray-500">H</span>
                  )
                ) : hasAnyScore && clinchHoleNumber === null ? (
                  <span className="text-[10px] text-gray-300">·</span>
                ) : null}
              </div>

              {/* Running standing */}
              <div className="w-14 shrink-0 text-right">
                {status && hole.hole_number <= (clinchHoleNumber ?? Infinity) ? (
                  <span className={`text-[10px] font-bold ${
                    status.clinched
                      ? status.leader === 'team_a' ? 'text-green-700' : 'text-red-600'
                      : status.leader === 'team_a' ? 'text-green-700'
                      : status.leader === 'team_b' ? 'text-red-600'
                      : 'text-gray-500'
                  }`}>
                    {status.label}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-600',
    in_progress: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
  }
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
        colors[status] ?? 'bg-gray-100 text-gray-600'
      }`}
    >
      {status.replace('_', ' ')}
    </span>
  )
}
