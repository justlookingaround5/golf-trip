'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { MATCH_FORMAT_LABELS } from '@/lib/types'
import type { MatchFormat } from '@/lib/types'
import { calculateMatchPlay, getHoleResults } from '@/lib/match-play'
import { getStrokesPerHole } from '@/lib/handicap'

// ---------------------------------------------------------------------------
// Types matching API response
// ---------------------------------------------------------------------------

interface HoleData {
  id: string
  course_id: string
  hole_number: number
  par: number
  handicap_index: number
}

interface CourseData {
  id: string
  name: string
  par: number
  round_number: number
  round_date: string | null
}

interface PlayerInfo {
  id: string
  name: string
  handicap_index: number | null
}

interface TripPlayerInfo {
  id: string
  player_id: string
  player: PlayerInfo
}

interface MatchPlayerData {
  id: string
  match_id: string
  trip_player_id: string
  side: 'team_a' | 'team_b'
  trip_player?: TripPlayerInfo
}

interface MatchData {
  id: string
  course_id: string
  format: MatchFormat
  point_value: number
  scorer_email: string | null
  scorer_token: string
  status: 'pending' | 'in_progress' | 'completed'
  result: string | null
  winner_side: 'team_a' | 'team_b' | 'tie' | null
}

interface ScoreData {
  id: string
  match_id: string
  trip_player_id: string
  hole_id: string
  gross_score: number
  fairway_hit?: boolean | null
  gir?: boolean | null
  putts?: number | null
}

interface CourseHandicapData {
  id: string
  trip_player_id: string
  course_id: string
  handicap_strokes: number
}

interface ApiResponse {
  match: MatchData
  course: CourseData
  holes: HoleData[]
  matchPlayers: MatchPlayerData[]
  scores: ScoreData[]
  courseHandicaps: CourseHandicapData[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function playerName(mp: MatchPlayerData): string {
  return mp.trip_player?.player?.name || 'Unknown'
}

function sidePlayerNames(players: MatchPlayerData[]): string {
  return players.map(playerName).join(' & ')
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

export default function ScorerPage() {
  const params = useParams<{ token: string }>()
  const token = params.token

  // Data state
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // UI state
  const [infoHole, setInfoHole] = useState<number | null>(null)
  const [editCell, setEditCell] = useState<{ holeNumber: number; tripPlayerId: string } | null>(null)
  const [cellScore, setCellScore] = useState(4)
  const [cellStats, setCellStats] = useState<{ fairway_hit: boolean | null; gir: boolean | null; putts: number | null }>({ fairway_hit: null, gir: null, putts: null })
  const [saving, setSaving] = useState(false)

  // ------ Data loading ------

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/score/${token}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to load match')
      }
      const json: ApiResponse = await res.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ------ Derived data ------

  const holes = useMemo(() => {
    if (!data) return []
    return [...data.holes].sort((a, b) => a.hole_number - b.hole_number)
  }, [data])

  const teamAPlayers = useMemo(() => {
    if (!data) return []
    return data.matchPlayers.filter((mp) => mp.side === 'team_a')
  }, [data])

  const teamBPlayers = useMemo(() => {
    if (!data) return []
    return data.matchPlayers.filter((mp) => mp.side === 'team_b')
  }, [data])

  const allMatchPlayers = useMemo(
    () => [...teamAPlayers, ...teamBPlayers],
    [teamAPlayers, teamBPlayers]
  )

  // Build the playerStrokes map for match play calculator
  const playerStrokesMap = useMemo(() => {
    if (!data) return new Map<string, Map<number, number>>()
    const map = new Map<string, Map<number, number>>()
    for (const mp of data.matchPlayers) {
      const ch = data.courseHandicaps.find(
        (c) => c.trip_player_id === mp.trip_player_id
      )
      const handicapStrokes = ch?.handicap_strokes ?? 0
      const strokesMap = getStrokesPerHole(handicapStrokes, data.holes)
      map.set(mp.trip_player_id, strokesMap)
    }
    return map
  }, [data])

  // Calculate match play status
  const matchPlayResult = useMemo(() => {
    if (!data || data.scores.length === 0) return null
    return calculateMatchPlay(
      data.scores,
      data.matchPlayers,
      data.holes,
      playerStrokesMap,
      data.match.format
    )
  }, [data, playerStrokesMap])

  // Hole-by-hole match results indexed by hole number
  const holeResultsMap = useMemo(() => {
    if (!data) return new Map<number, { winner: 'team_a' | 'team_b' | 'halved' }>()
    const results = getHoleResults(data.scores, data.matchPlayers, data.holes, playerStrokesMap, data.match.format)
    return new Map(results.map(r => [r.holeNumber, r]))
  }, [data, playerStrokesMap])

  // Which holes are completed (have scores from all players)?
  const completedHoles = useMemo(() => {
    if (!data) return new Set<number>()
    const set = new Set<number>()
    const allPlayerIds = data.matchPlayers.map((mp) => mp.trip_player_id)
    for (const hole of holes) {
      const scoresForHole = data.scores.filter(
        (s) => s.hole_id === hole.id
      )
      const playersScored = new Set(scoresForHole.map((s) => s.trip_player_id))
      if (allPlayerIds.every((pid) => playersScored.has(pid))) {
        set.add(hole.hole_number)
      }
    }
    return set
  }, [data, holes])

  // ------ Cell score entry ------

  function openCell(holeNumber: number, tripPlayerId: string) {
    if (!data) return
    const hole = holes.find(h => h.hole_number === holeNumber)
    if (!hole) return
    const existing = data.scores.find(s => s.hole_id === hole.id && s.trip_player_id === tripPlayerId)
    setCellScore(existing?.gross_score ?? hole.par)
    setCellStats({
      fairway_hit: existing?.fairway_hit ?? null,
      gir: existing?.gir ?? null,
      putts: existing?.putts ?? null,
    })
    setEditCell({ holeNumber, tripPlayerId })
  }

  async function saveCellScore() {
    if (!editCell || !data) return
    const hole = holes.find(h => h.hole_number === editCell.holeNumber)
    if (!hole) return

    const entry = {
      trip_player_id: editCell.tripPlayerId,
      gross_score: cellScore,
      fairway_hit: cellStats.fairway_hit,
      gir: cellStats.gir,
      putts: cellStats.putts,
    }

    const optimistic: ScoreData = {
      id: `optimistic-${editCell.tripPlayerId}-${hole.id}`,
      match_id: data.match.id,
      trip_player_id: editCell.tripPlayerId,
      hole_id: hole.id,
      gross_score: cellScore,
      fairway_hit: cellStats.fairway_hit,
      gir: cellStats.gir,
      putts: cellStats.putts,
    }

    setData(prev => {
      if (!prev) return prev
      const others = prev.scores.filter(s => !(s.hole_id === hole.id && s.trip_player_id === editCell.tripPlayerId))
      return { ...prev, scores: [...others, optimistic] }
    })
    setEditCell(null)

    setSaving(true)
    try {
      const res = await fetch(`/api/score/${token}/holes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hole_id: hole.id, scores: [entry] }),
      })
      if (res.ok) {
        const result = await res.json()
        setData(prev => prev ? { ...prev, scores: result.scores } : prev)
        } else {
        setData(prev => {
          if (!prev) return prev
          return { ...prev, scores: prev.scores.filter(s => !s.id.startsWith('optimistic-')) }
        })
        setError('Failed to save. Tap the cell to retry.')
      }
    } catch {
      setError('Connection lost. Score may not be saved.')
    } finally {
      setSaving(false)
    }
  }

  // ------ Match status display ------

  function getStatusDisplay(): { label: string; color: string } {
    if (!data) return { label: '', color: '' }

    if (!matchPlayResult || matchPlayResult.holesPlayed === 0) {
      return {
        label: 'All Square - Not Started',
        color: 'bg-gray-100 text-gray-700',
      }
    }

    const teamANames = sidePlayerNames(teamAPlayers)
    const teamBNames = sidePlayerNames(teamBPlayers)

    if (matchPlayResult.isComplete) {
      if (matchPlayResult.leader === 'tie') {
        return {
          label: `Tied - ${matchPlayResult.status}`,
          color: 'bg-yellow-100 text-yellow-800',
        }
      }
      const winnerNames =
        matchPlayResult.leader === 'team_a' ? teamANames : teamBNames
      return {
        label: `${winnerNames} win ${matchPlayResult.status}`,
        color: 'bg-green-100 text-green-800',
      }
    }

    if (matchPlayResult.leader === 'tie') {
      return {
        label: `All Square thru ${matchPlayResult.holesPlayed}`,
        color: 'bg-gray-100 text-gray-700',
      }
    }

    const leaderNames =
      matchPlayResult.leader === 'team_a' ? teamANames : teamBNames
    return {
      label: `${leaderNames} ${matchPlayResult.status}`,
      color: 'bg-green-100 text-green-800',
    }
  }

  // ------ Render ------

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-golf-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-golf-700 border-t-transparent" />
          <p className="text-lg font-medium text-golf-800">
            Loading scorecard...
          </p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-red-50 p-4">
        <div className="rounded-xl bg-white p-8 text-center shadow-lg">
          <p className="mb-2 text-xl font-bold text-red-700">Error</p>
          <p className="text-gray-600">{error || 'Match not found'}</p>
        </div>
      </div>
    )
  }

  const statusDisplay = getStatusDisplay()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-golf-800 px-4 py-3 text-white shadow-md">
        <div className="mx-auto max-w-lg">
          <h1 className="text-lg font-bold">{data.course.name}</h1>
          <p className="text-sm text-golf-200">
            {MATCH_FORMAT_LABELS[data.match.format]} &middot; Par{' '}
            {data.course.par}
          </p>
        </div>
      </header>

      {/* Match Status Banner */}
      <div className="border-b border-golf-200 bg-golf-50 px-4 py-3">
        <div className="mx-auto max-w-lg">
          {/* Teams */}
          <div className="mb-2 flex items-center justify-between text-sm">
            <div className="font-semibold text-gray-900">
              {sidePlayerNames(teamAPlayers)}
            </div>
            <span className="mx-2 text-gray-400">vs</span>
            <div className="font-semibold text-gray-900">
              {sidePlayerNames(teamBPlayers)}
            </div>
          </div>
          {/* Status */}
          <div
            className={`rounded-lg px-3 py-2 text-center text-sm font-bold ${statusDisplay.color}`}
          >
            {statusDisplay.label}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-4">
        {/* Hole List */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Scorecard</h2>
          <div className="text-sm text-gray-500">
            {completedHoles.size}/{holes.length} holes
          </div>
        </div>

        {/* Scorecard table */}
        <div className="-mx-4 overflow-x-auto">
          <table className="min-w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="sticky left-0 z-10 bg-gray-100 w-9 px-1 py-2 text-center font-semibold text-gray-600 border-b border-gray-200">Hole</th>
                <th className="sticky left-9 z-10 bg-gray-100 w-9 px-1 py-2 text-center font-semibold text-gray-600 border-b border-l border-gray-200">Par</th>
                {teamAPlayers.map(mp => {
                  const mpScores = data.scores.filter(s => s.trip_player_id === mp.trip_player_id)
                  const grossTotal = mpScores.reduce((sum, s) => sum + s.gross_score, 0)
                  const parTotal = mpScores.reduce((sum, s) => {
                    const h = holes.find(hh => hh.id === s.hole_id)
                    return sum + (h?.par ?? 0)
                  }, 0)
                  const vsPar = mpScores.length > 0 ? grossTotal - parTotal : null
                  const vsParLabel = vsPar === null ? '' : vsPar === 0 ? ' E' : vsPar > 0 ? ` +${vsPar}` : ` ${vsPar}`
                  return (
                    <th key={mp.id} className="px-1 py-2 text-center font-semibold text-gray-600 border-b border-l border-gray-200">
                      {playerName(mp).split(' ')[0]}{vsParLabel && <span className="font-normal text-gray-400">{vsParLabel}</span>}
                    </th>
                  )
                })}
                <th className="px-1 py-2 text-center font-semibold text-gray-500 border-b border-l border-gray-200">vs</th>
                {teamBPlayers.map(mp => {
                  const mpScores = data.scores.filter(s => s.trip_player_id === mp.trip_player_id)
                  const grossTotal = mpScores.reduce((sum, s) => sum + s.gross_score, 0)
                  const parTotal = mpScores.reduce((sum, s) => {
                    const h = holes.find(hh => hh.id === s.hole_id)
                    return sum + (h?.par ?? 0)
                  }, 0)
                  const vsPar = mpScores.length > 0 ? grossTotal - parTotal : null
                  const vsParLabel = vsPar === null ? '' : vsPar === 0 ? ' E' : vsPar > 0 ? ` +${vsPar}` : ` ${vsPar}`
                  return (
                    <th key={mp.id} className="px-1 py-2 text-center font-semibold text-gray-600 border-b border-l border-gray-200">
                      {playerName(mp).split(' ')[0]}{vsParLabel && <span className="font-normal text-gray-400">{vsParLabel}</span>}
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
                const nineHoles = holes.filter(h => h.hole_number >= nine.start && h.hole_number <= nine.end)
                if (nineHoles.length === 0) return []

                const holeRows = nineHoles.map(hole => {
                  const holeResult = holeResultsMap.get(hole.hole_number)
                  const vsLabel = holeResult?.winner === 'team_a' ? '+1' : holeResult?.winner === 'team_b' ? '-1' : ''
                  const vsCls = holeResult?.winner === 'team_a'
                    ? 'bg-green-100 text-green-800'
                    : holeResult?.winner === 'team_b'
                      ? 'bg-red-100 text-red-700'
                      : ''

                  return (
                    <tr key={hole.id} className="border-b border-gray-100">
                      <td onClick={() => setInfoHole(hole.hole_number)} className="sticky left-0 z-10 bg-white w-9 px-1 py-2 text-center font-medium text-gray-700 cursor-pointer hover:bg-gray-50 active:bg-gray-100">{hole.hole_number}</td>
                      <td onClick={() => setInfoHole(hole.hole_number)} className="sticky left-9 z-10 bg-white w-9 px-1 py-2 text-center text-gray-500 border-l border-gray-200 cursor-pointer hover:bg-gray-50 active:bg-gray-100">{hole.par}</td>
                      {teamAPlayers.map(mp => {
                        const score = data.scores.find(s => s.hole_id === hole.id && s.trip_player_id === mp.trip_player_id)
                        const gross = score?.gross_score
                        const strokes = playerStrokesMap.get(mp.trip_player_id)?.get(hole.hole_number) ?? 0
                        return (
                          <td key={mp.id} onClick={() => openCell(hole.hole_number, mp.trip_player_id)} className="relative px-1 py-2 text-center border-l border-gray-200 cursor-pointer hover:bg-gray-50 active:bg-gray-100">
                            {strokes > 0 && <span className="absolute right-0.5 top-0 text-[8px] leading-none text-gray-400">*</span>}
                            {gross !== undefined && scoreBadge(gross, hole.par)}
                          </td>
                        )
                      })}
                      <td className={`px-1 py-2 text-center font-bold border-l border-gray-200 ${vsCls}`}>{vsLabel}</td>
                      {teamBPlayers.map(mp => {
                        const score = data.scores.find(s => s.hole_id === hole.id && s.trip_player_id === mp.trip_player_id)
                        const gross = score?.gross_score
                        const strokes = playerStrokesMap.get(mp.trip_player_id)?.get(hole.hole_number) ?? 0
                        return (
                          <td key={mp.id} onClick={() => openCell(hole.hole_number, mp.trip_player_id)} className="relative px-1 py-2 text-center border-l border-gray-200 cursor-pointer hover:bg-gray-50 active:bg-gray-100">
                            {strokes > 0 && <span className="absolute right-0.5 top-0 text-[8px] leading-none text-gray-400">*</span>}
                            {gross !== undefined && scoreBadge(gross, hole.par)}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })

                const parSum = nineHoles.reduce((s, h) => s + h.par, 0)
                const subtotalRow = (
                  <tr key={`${nine.label}-sub`} className="border-b-2 border-gray-300 bg-gray-50 font-bold">
                    <td className="sticky left-0 z-10 bg-gray-50 px-1 py-2 text-center text-gray-700">{nine.label}</td>
                    <td className="sticky left-9 z-10 bg-gray-50 px-1 py-2 text-center text-gray-600 border-l border-gray-200">{parSum}</td>
                    {teamAPlayers.map(mp => {
                      let grossSum = 0
                      const allScored = nineHoles.every(h => {
                        const s = data.scores.find(sc => sc.hole_id === h.id && sc.trip_player_id === mp.trip_player_id)
                        if (s) grossSum += s.gross_score
                        return !!s
                      })
                      return (
                        <td key={mp.id} className="px-1 py-2 text-center border-l border-gray-200">{allScored ? grossSum : ''}</td>
                      )
                    })}
                    <td className="border-l border-gray-200" />
                    {teamBPlayers.map(mp => {
                      let grossSum = 0
                      const allScored = nineHoles.every(h => {
                        const s = data.scores.find(sc => sc.hole_id === h.id && sc.trip_player_id === mp.trip_player_id)
                        if (s) grossSum += s.gross_score
                        return !!s
                      })
                      return (
                        <td key={mp.id} className="px-1 py-2 text-center border-l border-gray-200">{allScored ? grossSum : ''}</td>
                      )
                    })}
                  </tr>
                )

                return [...holeRows, subtotalRow]
              })}
              {/* Total row */}
              {holes.length > 0 && (
                <tr className="bg-gray-100 font-bold">
                  <td className="sticky left-0 z-10 bg-gray-100 px-1 py-2 text-center text-gray-700">Total</td>
                  <td className="sticky left-9 z-10 bg-gray-100 px-1 py-2 text-center text-gray-600 border-l border-gray-200">{holes.reduce((s, h) => s + h.par, 0)}</td>
                  {teamAPlayers.map(mp => {
                    let grossSum = 0
                    const allScored = holes.every(h => {
                      const s = data.scores.find(sc => sc.hole_id === h.id && sc.trip_player_id === mp.trip_player_id)
                      if (s) grossSum += s.gross_score
                      return !!s
                    })
                    return (
                      <td key={mp.id} className="px-1 py-2 text-center border-l border-gray-200">{allScored ? grossSum : ''}</td>
                    )
                  })}
                  <td className="border-l border-gray-200" />
                  {teamBPlayers.map(mp => {
                    let grossSum = 0
                    const allScored = holes.every(h => {
                      const s = data.scores.find(sc => sc.hole_id === h.id && sc.trip_player_id === mp.trip_player_id)
                      if (s) grossSum += s.gross_score
                      return !!s
                    })
                    return (
                      <td key={mp.id} className="px-1 py-2 text-center border-l border-gray-200">{allScored ? grossSum : ''}</td>
                    )
                  })}
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
            <button onClick={() => setError(null)} className="ml-2 font-bold">×</button>
          </div>
        )}
      </div>

      {/* Hole info popup */}
      {infoHole !== null && (() => {
        const hole = holes.find(h => h.hole_number === infoHole)
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
            </div>
          </div>
        )
      })()}

      {/* Cell edit popup */}
      {editCell !== null && (() => {
        const hole = holes.find(h => h.hole_number === editCell.holeNumber)
        if (!hole) return null
        const mp = allMatchPlayers.find(p => p.trip_player_id === editCell.tripPlayerId)
        const name = mp ? playerName(mp) : 'Player'
        return (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditCell(null)}>
            <div className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900">{name}</h3>
                  <p className="text-xs text-gray-500">Hole {hole.hole_number} &middot; Par {hole.par}</p>
                </div>
                <button onClick={() => setEditCell(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
              </div>

              {/* Score selector */}
              <div className="mb-4">
                <label className="text-xs font-medium text-gray-500 mb-2 block">Score</label>
                <div className="flex items-center gap-3 justify-center">
                  <button
                    onClick={() => setCellScore(s => Math.max(1, s - 1))}
                    className="w-10 h-10 rounded-full border-2 border-gray-300 text-xl font-bold text-gray-600 hover:border-golf-600 hover:text-golf-700"
                  >−</button>
                  <span className="text-3xl font-bold text-gray-900 w-10 text-center">{cellScore}</span>
                  <button
                    onClick={() => setCellScore(s => s + 1)}
                    className="w-10 h-10 rounded-full border-2 border-gray-300 text-xl font-bold text-gray-600 hover:border-golf-600 hover:text-golf-700"
                  >+</button>
                </div>
              </div>

              {/* Stats */}
              <div className="mb-4 space-y-2">
                {hole.par !== 3 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Fairway Hit</span>
                    <div className="flex gap-1">
                      {([true, false] as const).map(val => (
                        <button
                          key={String(val)}
                          onClick={() => setCellStats(s => ({ ...s, fairway_hit: s.fairway_hit === val ? null : val }))}
                          className={`px-3 py-1 rounded-full text-xs font-medium border transition ${cellStats.fairway_hit === val ? 'bg-golf-700 text-white border-golf-700' : 'bg-white text-gray-600 border-gray-300'}`}
                        >
                          {val ? 'Yes' : 'No'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">GIR</span>
                  <div className="flex gap-1">
                    {([true, false] as const).map(val => (
                      <button
                        key={String(val)}
                        onClick={() => setCellStats(s => ({ ...s, gir: s.gir === val ? null : val }))}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition ${cellStats.gir === val ? 'bg-golf-700 text-white border-golf-700' : 'bg-white text-gray-600 border-gray-300'}`}
                      >
                        {val ? 'Yes' : 'No'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Putts</span>
                  <div className="flex gap-1">
                    {[0, 1, 2, 3, 4].map(n => (
                      <button
                        key={n}
                        onClick={() => setCellStats(s => ({ ...s, putts: s.putts === n ? null : n }))}
                        className={`w-8 h-8 rounded-full text-xs font-medium border transition ${cellStats.putts === n ? 'bg-golf-700 text-white border-golf-700' : 'bg-white text-gray-600 border-gray-300'}`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={saveCellScore}
                disabled={saving}
                className="w-full rounded-xl bg-golf-700 py-3 text-sm font-bold text-white shadow active:bg-golf-800 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Score'}
              </button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
