'use client'

import { useMemo } from 'react'
import type { Hole, Score, MatchPlayer, PlayerCourseHandicap } from '@/lib/types'
import { MATCH_FORMAT_LABELS } from '@/lib/types'
import type { MatchFormat } from '@/lib/types'
import { getStrokesPerHole } from '@/lib/handicap'
import { calculateMatchPlay, getHoleResults } from '@/lib/match-play'
import type { MatchPlayResult, HoleResult } from '@/lib/match-play'

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

function formatDiff(score: number, par: number): string {
  const diff = score - par
  if (diff === 0) return 'E'
  return diff > 0 ? `+${diff}` : `${diff}`
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

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-gray-200 bg-green-50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">{courseName}</h3>
            <p className="text-xs text-gray-500">
              {MATCH_FORMAT_LABELS[format]} &middot; Par {coursePar} &middot;{' '}
              {pointValue} pt{pointValue !== 1 ? 's' : ''}
            </p>
          </div>
          <StatusBadge status={status} />
        </div>
      </div>

      {/* Teams & Match Status */}
      <div className="border-b border-gray-200 px-4 py-3">
        <div className="mb-2 flex items-center justify-between text-sm">
          <div className="font-semibold text-gray-900">
            {teamAPlayers.map(playerName).join(' & ')}
          </div>
          <span className="mx-2 text-xs text-gray-400">vs</span>
          <div className="font-semibold text-gray-900">
            {teamBPlayers.map(playerName).join(' & ')}
          </div>
        </div>
        <div
          className={`rounded-lg px-3 py-2 text-center text-sm font-bold ${statusDisplay.color}`}
        >
          {statusDisplay.label}
        </div>
      </div>

      {/* Scorecard Table */}
      {scores.length > 0 && (
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
                    <tr className="border-b border-gray-200 bg-gray-50">
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
                      let ninePar = 0
                      let hasScores = false

                      return (
                        <tr
                          key={mp.trip_player_id}
                          className="border-b border-gray-100"
                        >
                          <td className="px-2 py-2 font-medium text-gray-900">
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
                              ninePar += h.par
                              hasScores = true
                            }
                            const diff =
                              gross !== undefined ? gross - h.par : undefined

                            return (
                              <td
                                key={h.id}
                                className={`px-1 py-2 text-center ${
                                  gross === undefined
                                    ? 'text-gray-300'
                                    : diff !== undefined && diff < 0
                                      ? 'font-semibold text-red-600'
                                      : diff !== undefined && diff > 0
                                        ? 'font-semibold text-blue-600'
                                        : 'text-gray-900'
                                }`}
                              >
                                {gross ?? '-'}
                              </td>
                            )
                          })}
                          <td className="px-2 py-2 text-center font-semibold text-gray-900">
                            {hasScores ? nineTotal : '-'}
                          </td>
                        </tr>
                      )
                    })}

                    {/* Match result row */}
                    <tr className="border-b border-gray-200 bg-green-50/50">
                      <td className="px-2 py-1 text-xs font-medium text-green-700">
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
                            className={`px-1 py-1 text-center text-xs font-bold ${
                              hr.winner === 'team_a'
                                ? 'text-green-700'
                                : hr.winner === 'team_b'
                                  ? 'text-red-600'
                                  : 'text-gray-400'
                            }`}
                          >
                            {hr.winner === 'team_a'
                              ? 'A'
                              : hr.winner === 'team_b'
                                ? 'B'
                                : '-'}
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
