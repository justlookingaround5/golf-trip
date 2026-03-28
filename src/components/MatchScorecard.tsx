'use client'

import { useMemo, useState } from 'react'
import type { Hole, Score, MatchPlayer, PlayerCourseHandicap, RoundScore } from '@/lib/types'
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
  roundDate?: string
  coursePar: number
  format: MatchFormat
  pointValue: number
  status: 'pending' | 'in_progress' | 'completed'
  holes: Hole[]
  matchPlayers: MatchPlayer[]
  scores: Score[]
  courseHandicaps: PlayerCourseHandicap[]
  roundScores?: RoundScore[]
  hideFormat?: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function playerName(mp: MatchPlayer): string {
  return (mp.trip_player?.player?.name ?? 'Unknown').split(' ')[0]
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MatchScorecard({
  courseName,
  roundDate,
  coursePar,
  format,
  pointValue,
  status,
  holes,
  matchPlayers,
  scores,
  courseHandicaps,
  roundScores,
  hideFormat,
}: MatchScorecardProps) {
  const [infoHole, setInfoHole] = useState<number | null>(null)
  const [statsPlayerId, setStatsPlayerId] = useState<string | null>(null)

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

  // Running match status per hole
  const runningStatus = useMemo(() => {
    const map = new Map<number, {
      leader: 'team_a' | 'team_b' | 'tie'
      margin: number
      clinched: boolean
      label: string
      lead: number // positive = team_a leading
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
        if (hr.winner !== 'halved' || i === 0) {
          map.set(hole.hole_number, {
            leader: diff > 0 ? 'team_a' : 'team_b',
            margin: absLead,
            clinched: true,
            label,
            lead: diff,
          })
        }
        break
      }
      if (hr.winner !== 'halved' || i === 0) {
        const label = diff === 0 ? 'AS' : `${absLead}UP`
        map.set(hole.hole_number, {
          leader: diff > 0 ? 'team_a' : diff < 0 ? 'team_b' : 'tie',
          margin: absLead,
          clinched: false,
          label,
          lead: diff,
        })
      }
    }
    return map
  }, [sortedHoles, holeResultByNumber])

  // Match play data for the table
  const matchPlayData = useMemo(() => {
    return sortedHoles.map(hole => {
      const status = runningStatus.get(hole.hole_number)
      return { hole, status }
    })
  }, [sortedHoles, runningStatus])

  // Status display
  const statusDisplay = useMemo(() => {
    if (!matchResult || matchResult.holesPlayed === 0) {
      return { label: 'Not Started', color: 'bg-gray-100 text-gray-700' }
    }

    const teamANames = teamAPlayers.map(playerName).join(' & ')
    const teamBNames = teamBPlayers.map(playerName).join(' & ')

    if (matchResult.isComplete) {
      if (matchResult.leader === 'tie') {
        return { label: `Tied - ${matchResult.status}`, color: 'bg-green-100 text-green-800' }
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
        color: 'bg-yellow-100 text-yellow-800',
      }
    }

    const leaderNames = matchResult.leader === 'team_a' ? teamANames : teamBNames
    return {
      label: `${leaderNames} ${matchResult.status}`,
      color: 'bg-yellow-100 text-yellow-800',
    }
  }, [matchResult, teamAPlayers, teamBPlayers])

  // Vs-par for each player
  const playerVsPar = useMemo(() => {
    const map = new Map<string, number | null>()
    for (const mp of matchPlayers) {
      let gross = 0
      let par = 0
      let hasScores = false
      for (const hole of sortedHoles) {
        const holeScores = scoresByHoleAndPlayer.get(hole.id)
        const g = holeScores?.get(mp.trip_player_id)
        if (g !== undefined) {
          gross += g
          par += hole.par
          hasScores = true
        }
      }
      map.set(mp.trip_player_id, hasScores ? gross - par : null)
    }
    return map
  }, [matchPlayers, sortedHoles, scoresByHoleAndPlayer])

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-golf-50 dark:bg-golf-900/30 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{courseName}</h3>
            {roundDate && (
              <p className="text-xs text-gray-500 mt-0.5">
                {new Date(roundDate + 'T12:00:00').toLocaleDateString('en-US', {
                  weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                })}
              </p>
            )}
          </div>
          <span
            className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-sm font-medium ${statusDisplay.color}`}
          >
            {statusDisplay.label}
          </span>
        </div>
      </div>

      {/* Scorecard table */}
      {scores.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs border-collapse table-fixed">
            <colgroup>
              <col className="w-8" />
              <col className="w-7" />
              {teamAPlayers.map(mp => (
                <col key={`col-a-${mp.trip_player_id}`} style={{ width: `${(100 - 25) / (teamAPlayers.length + teamBPlayers.length)}%` }} />
              ))}
              <col className="w-10" />
              {teamBPlayers.map(mp => (
                <col key={`col-b-${mp.trip_player_id}`} style={{ width: `${(100 - 25) / (teamAPlayers.length + teamBPlayers.length)}%` }} />
              ))}
            </colgroup>
            <thead>
              <tr className="bg-gray-50">
                <th className="px-1 py-1.5 text-center text-[10px] font-semibold text-gray-500 border-b border-gray-200">Hole</th>
                <th className="px-1 py-1.5 text-center text-[10px] font-semibold text-gray-500 border-b border-gray-200">Par</th>
                {teamAPlayers.map(mp => {
                  const vsPar = playerVsPar.get(mp.trip_player_id)
                  const label = vsPar === null || vsPar === undefined ? '' : vsPar === 0 ? ' E' : vsPar > 0 ? ` +${vsPar}` : ` ${vsPar}`
                  return (
                    <th key={mp.trip_player_id} onClick={() => setStatsPlayerId(mp.trip_player_id)} className="px-1 py-1.5 text-center font-semibold text-blue-900 border-b border-l border-gray-200 cursor-pointer hover:bg-gray-50 truncate">
                      {playerName(mp)}
                      {label && <span className="font-normal text-gray-400">{label}</span>}
                    </th>
                  )
                })}
                <th className="px-1 py-1.5 text-center text-[10px] font-semibold text-gray-500 border-b border-l border-gray-200">Match</th>
                {teamBPlayers.map(mp => {
                  const vsPar = playerVsPar.get(mp.trip_player_id)
                  const label = vsPar === null || vsPar === undefined ? '' : vsPar === 0 ? ' E' : vsPar > 0 ? ` +${vsPar}` : ` ${vsPar}`
                  return (
                    <th key={mp.trip_player_id} onClick={() => setStatsPlayerId(mp.trip_player_id)} className="px-1 py-1.5 text-center font-semibold text-blue-900 border-b border-l border-gray-200 cursor-pointer hover:bg-gray-50 truncate">
                      {playerName(mp)}
                      {label && <span className="font-normal text-gray-400">{label}</span>}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Front', start: 1, end: 9 },
                { label: 'Back', start: 10, end: 18 },
              ].flatMap(nine => {
                const nineData = matchPlayData.filter(
                  d => d.hole.hole_number >= nine.start && d.hole.hole_number <= nine.end
                )
                if (nineData.length === 0) return []

                const holeRows = nineData.map(({ hole, status: holeStatus }) => {
                  return (
                    <tr key={hole.id} className="border-b border-gray-100">
                      <td
                        onClick={() => setInfoHole(hole.hole_number)}
                        className="w-8 px-1 py-2 text-center font-medium text-gray-700 cursor-pointer hover:bg-gray-50 active:bg-gray-100"
                      >
                        {hole.hole_number}
                      </td>
                      <td
                        onClick={() => setInfoHole(hole.hole_number)}
                        className="w-7 px-1 py-2 text-center text-gray-500 cursor-pointer hover:bg-gray-50 active:bg-gray-100"
                      >
                        {hole.par}
                      </td>
                      {/* Team A player scores */}
                      {teamAPlayers.map(mp => {
                        const holeScores = scoresByHoleAndPlayer.get(hole.id)
                        const gross = holeScores?.get(mp.trip_player_id)
                        const strokes = playerStrokesMap.get(mp.trip_player_id)?.get(hole.hole_number) ?? 0
                        return (
                          <td
                            key={mp.trip_player_id}
                            className="relative px-1 py-2 text-center border-l border-gray-200"
                          >
                            {strokes > 0 && <span className="absolute right-0.5 top-0 text-sm leading-none text-gray-500">*</span>}
                            {gross !== undefined ? scoreBadge(gross, hole.par) : <span className="text-gray-300">-</span>}
                          </td>
                        )
                      })}
                      {/* Running match play status */}
                      <td className="w-10 px-1 py-2 text-center font-semibold text-[11px] border-l border-gray-200">
                        {holeStatus && (
                          <span className="flex items-center justify-center gap-0.5 text-blue-900">
                            {holeStatus.lead > 0 && <span>&#9664;</span>}
                            <span>{holeStatus.label}</span>
                            {holeStatus.lead < 0 && <span>&#9654;</span>}
                          </span>
                        )}
                      </td>
                      {/* Team B player scores */}
                      {teamBPlayers.map(mp => {
                        const holeScores = scoresByHoleAndPlayer.get(hole.id)
                        const gross = holeScores?.get(mp.trip_player_id)
                        const strokes = playerStrokesMap.get(mp.trip_player_id)?.get(hole.hole_number) ?? 0
                        return (
                          <td
                            key={mp.trip_player_id}
                            className="relative px-1 py-2 text-center border-l border-gray-200"
                          >
                            {strokes > 0 && <span className="absolute right-0.5 top-0 text-sm leading-none text-gray-500">*</span>}
                            {gross !== undefined ? scoreBadge(gross, hole.par) : <span className="text-gray-300">-</span>}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })

                const parSum = nineData.reduce((s, d) => s + d.hole.par, 0)

                const subtotalRow = (
                  <tr key={`${nine.label}-sub`} className="border-b-2 border-gray-300 bg-gray-50 font-bold">
                    <td className="px-1 py-2 text-center text-gray-600 text-[10px]">{nine.label}</td>
                    <td className="px-1 py-2 text-center text-gray-600">{parSum}</td>
                    {teamAPlayers.map(mp => {
                      let grossSum = 0
                      const allScored = nineData.every(({ hole }) => {
                        const holeScores = scoresByHoleAndPlayer.get(hole.id)
                        const g = holeScores?.get(mp.trip_player_id)
                        if (g !== undefined) grossSum += g
                        return g !== undefined
                      })
                      return (
                        <td key={mp.trip_player_id} className="px-1 py-2 text-center border-l border-gray-200 text-blue-900">
                          {allScored ? grossSum : ''}
                        </td>
                      )
                    })}
                    <td className="px-1 py-2 text-center text-[10px] font-semibold border-l border-gray-200" />
                    {teamBPlayers.map(mp => {
                      let grossSum = 0
                      const allScored = nineData.every(({ hole }) => {
                        const holeScores = scoresByHoleAndPlayer.get(hole.id)
                        const g = holeScores?.get(mp.trip_player_id)
                        if (g !== undefined) grossSum += g
                        return g !== undefined
                      })
                      return (
                        <td key={mp.trip_player_id} className="px-1 py-2 text-center border-l border-gray-200 text-blue-900">
                          {allScored ? grossSum : ''}
                        </td>
                      )
                    })}
                  </tr>
                )

                return [...holeRows, subtotalRow]
              })}

              {/* Total row */}
              {sortedHoles.length > 0 && (
                <tr className="bg-gray-100 font-bold">
                  <td className="px-1 py-2 text-center text-gray-600 text-[10px]">Total</td>
                  <td className="px-1 py-2 text-center text-gray-600">{sortedHoles.reduce((s, h) => s + h.par, 0)}</td>
                  {teamAPlayers.map(mp => {
                    let grossSum = 0
                    const allScored = sortedHoles.every(h => {
                      const holeScores = scoresByHoleAndPlayer.get(h.id)
                      const g = holeScores?.get(mp.trip_player_id)
                      if (g !== undefined) grossSum += g
                      return g !== undefined
                    })
                    return (
                      <td key={mp.trip_player_id} className="px-1 py-2 text-center border-l border-gray-200 text-blue-900">
                        {allScored ? grossSum : ''}
                      </td>
                    )
                  })}
                  <td className="px-1 py-2 text-center text-[10px] font-semibold border-l border-gray-200" />
                  {teamBPlayers.map(mp => {
                    let grossSum = 0
                    const allScored = sortedHoles.every(h => {
                      const holeScores = scoresByHoleAndPlayer.get(h.id)
                      const g = holeScores?.get(mp.trip_player_id)
                      if (g !== undefined) grossSum += g
                      return g !== undefined
                    })
                    return (
                      <td key={mp.trip_player_id} className="px-1 py-2 text-center border-l border-gray-200 text-blue-900">
                        {allScored ? grossSum : ''}
                      </td>
                    )
                  })}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* No scores message */}
      {scores.length === 0 && (
        <div className="p-6 text-center text-sm text-gray-500">
          No scores recorded yet for this match.
        </div>
      )}

      {/* Hole info popup */}
      {infoHole !== null && (() => {
        const hole = sortedHoles.find(h => h.hole_number === infoHole)
        if (!hole) return null
        return (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={() => setInfoHole(null)}>
            <div className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-900">Hole {hole.hole_number}</h3>
                <button onClick={() => setInfoHole(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-gray-50 p-3 text-center">
                  <div className="text-xs text-gray-500 mb-1">Par</div>
                  <div className="text-2xl font-bold text-gray-800">{hole.par}</div>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 text-center">
                  <div className="text-xs text-gray-500 mb-1">Handicap</div>
                  <div className="text-2xl font-bold text-gray-800">{hole.handicap_index}</div>
                </div>
              </div>
              {hole.yardage && (() => {
                const entries = Object.entries(hole.yardage as Record<string, number>)
                  .sort(([, a], [, b]) => b - a)
                if (entries.length === 0) return null
                return (
                  <div className="mt-3 rounded-lg bg-gray-50 p-3">
                    <div className="text-xs text-gray-500 mb-2">Yardage</div>
                    <div className="grid grid-cols-3 gap-2">
                      {entries.map(([tee, yards]) => (
                        <div key={tee} className="text-center">
                          <div className="text-xs text-gray-500">{tee}</div>
                          <div className="font-semibold text-gray-800">{yards}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        )
      })()}

      {/* Player stats popup */}
      {statsPlayerId !== null && (() => {
        const mp = matchPlayers.find(m => m.trip_player_id === statsPlayerId)
        if (!mp) return null
        const name = mp.trip_player?.player?.name ?? 'Unknown'
        const rs = roundScores?.filter(s => s.trip_player_id === statsPlayerId) ?? []
        const holesPlayed = rs.length

        // Fairways: non-par-3 holes only
        const fairwayScores = rs.filter(s => {
          const hole = sortedHoles.find(h => h.id === s.hole_id)
          return hole && hole.par > 3 && s.fairway_hit !== null && s.fairway_hit !== undefined
        })
        const fairwaysHit = fairwayScores.filter(s => s.fairway_hit === true).length

        // GIR
        const girScores = rs.filter(s => s.gir !== null && s.gir !== undefined)
        const girHit = girScores.filter(s => s.gir === true).length

        // Putts
        const puttsScores = rs.filter(s => s.putts !== null && s.putts !== undefined)
        const totalPutts = puttsScores.reduce((sum, s) => sum + (s.putts ?? 0), 0)

        const ch = courseHandicaps.find(c => c.trip_player_id === statsPlayerId)

        return (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={() => setStatsPlayerId(null)}>
            <div className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900">{name}</h3>
                  <p className="text-xs text-gray-500">
                    {ch && <span>{ch.handicap_strokes} strokes</span>}
                  </p>
                </div>
                <button onClick={() => setStatsPlayerId(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
              </div>

              {holesPlayed === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No scores yet</p>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-gray-50 p-3 text-center">
                      <div className="text-xs text-gray-500 mb-1">Fairways</div>
                      {fairwayScores.length > 0 ? (
                        <>
                          <div className="text-xl font-bold text-gray-800">{fairwaysHit}/{fairwayScores.length}</div>
                          <div className="text-xs text-gray-400">{Math.round(fairwaysHit / fairwayScores.length * 100)}%</div>
                        </>
                      ) : (
                        <div className="text-sm text-gray-400">&mdash;</div>
                      )}
                    </div>
                    <div className="rounded-xl bg-gray-50 p-3 text-center">
                      <div className="text-xs text-gray-500 mb-1">GIR</div>
                      {girScores.length > 0 ? (
                        <>
                          <div className="text-xl font-bold text-gray-800">{girHit}/{girScores.length}</div>
                          <div className="text-xs text-gray-400">{Math.round(girHit / girScores.length * 100)}%</div>
                        </>
                      ) : (
                        <div className="text-sm text-gray-400">&mdash;</div>
                      )}
                    </div>
                    <div className="rounded-xl bg-gray-50 p-3 text-center">
                      <div className="text-xs text-gray-500 mb-1">Putts</div>
                      {puttsScores.length > 0 ? (
                        <>
                          <div className="text-xl font-bold text-gray-800">{totalPutts}</div>
                          <div className="text-xs text-gray-400">total</div>
                        </>
                      ) : (
                        <div className="text-sm text-gray-400">&mdash;</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------


