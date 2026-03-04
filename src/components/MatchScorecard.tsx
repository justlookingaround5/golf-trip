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

  // Build player strokes map
  const playerStrokesMap = useMemo(() => {
    const map = new Map<string, Map<number, number>>()
    for (const mp of matchPlayers) {
      const ch = courseHandicaps.find(
        (c) => c.trip_player_id === mp.trip_player_id
      )
      const handicapStrokes = ch?.handicap_strokes ?? 0
      const strokesMap = getStrokesPerHole(handicapStrokes, holes)
      map.set(mp.trip_player_id, strokesMap)
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

  // Running match status per hole
  const runningStatus = useMemo(() => {
    const map = new Map<number, { leader: string; margin: number }>()
    let aWins = 0
    let bWins = 0
    for (const hole of sortedHoles) {
      const hr = holeResultByNumber.get(hole.hole_number)
      if (hr) {
        if (hr.winner === 'team_a') aWins++
        else if (hr.winner === 'team_b') bWins++
      }
      const margin = Math.abs(aWins - bWins)
      const leader = aWins > bWins ? 'team_a' : bWins > aWins ? 'team_b' : 'tie'
      map.set(hole.hole_number, { leader, margin })
    }
    return map
  }, [sortedHoles, holeResultByNumber])

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

                            return (
                              <td
                                key={h.id}
                                className="px-1 py-2 text-center"
                              >
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

                    {/* Match result row */}
                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-golf-50 dark:bg-golf-900/30">
                      <td className="px-2 py-1 text-xs font-medium text-golf-700">
                        Result
                      </td>
                      {nine.holes.map((h) => {
                        const hr = holeResultByNumber.get(h.hole_number)
                        if (!hr) {
                          return (
                            <td
                              key={h.id}
                              className="px-1 py-1 text-center text-gray-300"
                            >
                              -
                            </td>
                          )
                        }
                        return (
                          <td
                            key={h.id}
                            className="px-1 py-1 text-center"
                          >
                            {hr.winner === 'team_a' ? (
                              <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
                            ) : hr.winner === 'team_b' ? (
                              <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        )
                      })}
                      <td className="px-2 py-1 text-center text-xs text-gray-400">
                        -
                      </td>
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
}: {
  holes: Hole[]
  allPlayers: MatchPlayer[]
  scoresByHoleAndPlayer: Map<string, Map<string, number>>
  holeResultByNumber: Map<number, HoleResult>
  runningStatus: Map<number, { leader: string; margin: number }>
}) {
  return (
    <div className="divide-y divide-gray-100">
      {holes.map((hole) => {
        const hr = holeResultByNumber.get(hole.hole_number)
        const status = runningStatus.get(hole.hole_number)
        const holeScores = scoresByHoleAndPlayer.get(hole.id)
        const hasAnyScore = holeScores && holeScores.size > 0

        return (
          <div key={hole.id} className="px-4 py-2">
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

                  return (
                    <div key={mp.trip_player_id} className="text-center min-w-[40px]">
                      <div className="text-[10px] text-gray-500 truncate">{firstName}</div>
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
                {hr ? (
                  hr.winner === 'team_a' ? (
                    <span className="inline-block h-3 w-3 rounded-full bg-green-500" />
                  ) : hr.winner === 'team_b' ? (
                    <span className="inline-block h-3 w-3 rounded-full bg-red-500" />
                  ) : (
                    <span className="inline-block h-3 w-3 rounded-full bg-gray-300" />
                  )
                ) : hasAnyScore ? (
                  <span className="text-[10px] text-gray-300">-</span>
                ) : null}
              </div>

              {/* Running status */}
              <div className="w-16 shrink-0 text-right">
                {status && hasAnyScore && (
                  <span className={`text-[10px] font-semibold ${
                    status.leader === 'team_a'
                      ? 'text-green-700'
                      : status.leader === 'team_b'
                        ? 'text-red-600'
                        : 'text-gray-500'
                  }`}>
                    {status.leader === 'tie'
                      ? 'AS'
                      : `${status.leader === 'team_a' ? 'A' : 'B'} ${status.margin}UP`}
                  </span>
                )}
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
