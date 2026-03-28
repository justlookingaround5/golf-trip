'use client'

import { useMemo, useState } from 'react'
import type { ScorecardV2, ScorecardPlayerV2, HoleScoreV2 } from '@/lib/v2/types'

interface ScorecardViewerProps {
  scorecard: ScorecardV2
  hideHeader?: boolean
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

export default function ScorecardViewer({ scorecard, hideHeader }: ScorecardViewerProps) {
  const [infoHole, setInfoHole] = useState<number | null>(null)
  const [statsPlayerId, setStatsPlayerId] = useState<string | null>(null)

  const players = scorecard.players

  const sortedHoles = useMemo(
    () => [...(players[0]?.holes ?? [])].sort((a, b) => a.holeNumber - b.holeNumber),
    [players]
  )

  // Score lookup: holeNumber -> playerId -> gross
  const scoreLookup = useMemo(() => {
    const map = new Map<number, Map<string, number>>()
    for (const p of players) {
      for (const h of p.holes) {
        if (h.gross == null) continue
        if (!map.has(h.holeNumber)) map.set(h.holeNumber, new Map())
        map.get(h.holeNumber)!.set(p.player.id, h.gross)
      }
    }
    return map
  }, [players])

  // Vs-par per player
  const playerVsPar = useMemo(() => {
    const map = new Map<string, number | null>()
    for (const p of players) {
      let gross = 0
      let par = 0
      let hasScores = false
      for (const h of p.holes) {
        if (h.gross != null) {
          gross += h.gross
          par += h.par
          hasScores = true
        }
      }
      map.set(p.player.id, hasScores ? gross - par : null)
    }
    return map
  }, [players])

  // Hole data by number for popup
  const holeByNumber = useMemo(() => {
    const map = new Map<number, HoleScoreV2>()
    for (const h of sortedHoles) {
      map.set(h.holeNumber, h)
    }
    return map
  }, [sortedHoles])

  // Nine groupings
  const nines = useMemo(() => {
    const front = sortedHoles.filter(h => h.holeNumber <= 9)
    const back = sortedHoles.filter(h => h.holeNumber > 9)
    const result: { label: string; holes: HoleScoreV2[]; start: number; end: number }[] = []
    if (front.length > 0) result.push({ label: 'Front', holes: front, start: 1, end: 9 })
    if (back.length > 0) result.push({ label: 'Back', holes: back, start: 10, end: 18 })
    return result
  }, [sortedHoles])

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      {!hideHeader && (
        <div className="border-b border-gray-200 bg-golf-50 px-4 py-3">
          <h3 className="font-semibold text-gray-900">{scorecard.courseName}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {new Date(scorecard.date + 'T12:00:00').toLocaleDateString('en-US', {
              weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
            })}
          </p>
        </div>
      )}

      {/* Scorecard table */}
      {players.length > 0 && sortedHoles.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs border-collapse table-fixed">
            <colgroup>
              <col className="w-8" />
              <col className="w-7" />
              {players.map(p => (
                <col key={p.player.id} style={{ width: `${(100 - 25) / players.length}%` }} />
              ))}
            </colgroup>
            <thead>
              <tr className="bg-gray-50">
                <th className="px-1 py-1.5 text-center text-[10px] font-semibold text-gray-500 border-b border-gray-200">Hole</th>
                <th className="px-1 py-1.5 text-center text-[10px] font-semibold text-gray-500 border-b border-gray-200">Par</th>
                {players.map(p => {
                  const vsPar = playerVsPar.get(p.player.id)
                  const label = vsPar === null || vsPar === undefined ? '' : vsPar === 0 ? ' E' : vsPar > 0 ? ` +${vsPar}` : ` ${vsPar}`
                  return (
                    <th
                      key={p.player.id}
                      onClick={() => setStatsPlayerId(p.player.id)}
                      className="px-1 py-1.5 text-center font-semibold text-blue-900 border-b border-l border-gray-200 cursor-pointer hover:bg-gray-50 truncate"
                    >
                      {p.player.name.split(' ')[0]}
                      {label && <span className="font-normal text-gray-400">{label}</span>}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {nines.flatMap(nine => {
                const holeRows = nine.holes.map(hole => (
                  <tr key={hole.holeId} className="border-b border-gray-100">
                    <td
                      onClick={() => setInfoHole(hole.holeNumber)}
                      className="w-8 px-1 py-2 text-center font-medium text-gray-700 cursor-pointer hover:bg-gray-50 active:bg-gray-100"
                    >
                      {hole.holeNumber}
                    </td>
                    <td
                      onClick={() => setInfoHole(hole.holeNumber)}
                      className="w-7 px-1 py-2 text-center text-gray-500 cursor-pointer hover:bg-gray-50 active:bg-gray-100"
                    >
                      {hole.par}
                    </td>
                    {players.map(p => {
                      const gross = scoreLookup.get(hole.holeNumber)?.get(p.player.id)
                      return (
                        <td key={p.player.id} className="px-1 py-2 text-center border-l border-gray-200">
                          {gross !== undefined ? scoreBadge(gross, hole.par) : <span className="text-gray-300">-</span>}
                        </td>
                      )
                    })}
                  </tr>
                ))

                const parSum = nine.holes.reduce((s, h) => s + h.par, 0)

                const subtotalRow = (
                  <tr key={`${nine.label}-sub`} className="border-b-2 border-gray-300 bg-gray-50 font-bold">
                    <td className="px-1 py-2 text-center text-gray-600 text-[10px]">{nine.label}</td>
                    <td className="px-1 py-2 text-center text-gray-600">{parSum}</td>
                    {players.map(p => {
                      let grossSum = 0
                      const allScored = nine.holes.every(hole => {
                        const g = scoreLookup.get(hole.holeNumber)?.get(p.player.id)
                        if (g !== undefined) grossSum += g
                        return g !== undefined
                      })
                      return (
                        <td key={p.player.id} className="px-1 py-2 text-center border-l border-gray-200 text-blue-900">
                          {allScored ? grossSum : ''}
                        </td>
                      )
                    })}
                  </tr>
                )

                return [...holeRows, subtotalRow]
              })}

              {/* Total row */}
              <tr className="bg-gray-100 font-bold">
                <td className="px-1 py-2 text-center text-gray-600 text-[10px]">Total</td>
                <td className="px-1 py-2 text-center text-gray-600">{sortedHoles.reduce((s, h) => s + h.par, 0)}</td>
                {players.map(p => {
                  let grossSum = 0
                  const allScored = sortedHoles.every(hole => {
                    const g = scoreLookup.get(hole.holeNumber)?.get(p.player.id)
                    if (g !== undefined) grossSum += g
                    return g !== undefined
                  })
                  return (
                    <td key={p.player.id} className="px-1 py-2 text-center border-l border-gray-200 text-blue-900">
                      {allScored ? grossSum : ''}
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* No scores message */}
      {(players.length === 0 || sortedHoles.length === 0) && (
        <div className="p-6 text-center text-sm text-gray-500">
          No scores recorded yet.
        </div>
      )}

      {/* Hole info popup */}
      {infoHole !== null && (() => {
        const hole = holeByNumber.get(infoHole)
        if (!hole) return null
        return (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={() => setInfoHole(null)}>
            <div className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-900">Hole {hole.holeNumber}</h3>
                <button onClick={() => setInfoHole(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-gray-50 p-3 text-center">
                  <div className="text-xs text-gray-500 mb-1">Par</div>
                  <div className="text-2xl font-bold text-gray-800">{hole.par}</div>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 text-center">
                  <div className="text-xs text-gray-500 mb-1">Handicap</div>
                  <div className="text-2xl font-bold text-gray-800">{hole.handicapIndex ?? '—'}</div>
                </div>
              </div>
              {hole.yardage && (() => {
                const entries = Object.entries(hole.yardage)
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
        const p = players.find(pl => pl.player.id === statsPlayerId)
        if (!p) return null
        const name = p.player.name
        const holesPlayed = p.holes.filter(h => h.gross != null).length

        // Fairways: non-par-3 holes only
        const fairwayHoles = p.holes.filter(h => h.par > 3 && h.fairwayHit !== null && h.fairwayHit !== undefined)
        const fairwaysHit = fairwayHoles.filter(h => h.fairwayHit === true).length

        // GIR
        const girHoles = p.holes.filter(h => h.gir !== null && h.gir !== undefined)
        const girHit = girHoles.filter(h => h.gir === true).length

        // Putts
        const puttsHoles = p.holes.filter(h => h.putts !== null && h.putts !== undefined)
        const totalPutts = puttsHoles.reduce((sum, h) => sum + (h.putts ?? 0), 0)

        return (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={() => setStatsPlayerId(null)}>
            <div className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-gray-900">{name}</h3>
                <button onClick={() => setStatsPlayerId(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
              </div>

              {holesPlayed === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No scores yet</p>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-gray-50 p-3 text-center">
                      <div className="text-xs text-gray-500 mb-1">Fairways</div>
                      {fairwayHoles.length > 0 ? (
                        <>
                          <div className="text-xl font-bold text-gray-800">{fairwaysHit}/{fairwayHoles.length}</div>
                          <div className="text-xs text-gray-400">{Math.round(fairwaysHit / fairwayHoles.length * 100)}%</div>
                        </>
                      ) : (
                        <div className="text-sm text-gray-400">&mdash;</div>
                      )}
                    </div>
                    <div className="rounded-xl bg-gray-50 p-3 text-center">
                      <div className="text-xs text-gray-500 mb-1">GIR</div>
                      {girHoles.length > 0 ? (
                        <>
                          <div className="text-xl font-bold text-gray-800">{girHit}/{girHoles.length}</div>
                          <div className="text-xs text-gray-400">{Math.round(girHit / girHoles.length * 100)}%</div>
                        </>
                      ) : (
                        <div className="text-sm text-gray-400">&mdash;</div>
                      )}
                    </div>
                    <div className="rounded-xl bg-gray-50 p-3 text-center">
                      <div className="text-xs text-gray-500 mb-1">Putts</div>
                      {puttsHoles.length > 0 ? (
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
