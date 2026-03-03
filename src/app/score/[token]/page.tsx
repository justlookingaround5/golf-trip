'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { MATCH_FORMAT_LABELS } from '@/lib/types'
import type { MatchFormat } from '@/lib/types'
import { calculateMatchPlay } from '@/lib/match-play'
import { getStrokesPerHole } from '@/lib/handicap'
import { useSwipe } from '@/hooks/useSwipe'
import DotsTracker from '@/components/DotsTracker'

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
  const [activeHole, setActiveHole] = useState<number | null>(null)
  const [holeScores, setHoleScores] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)
  const [matchStatus, setMatchStatus] = useState<string>('pending')
  const [dotsHits, setDotsHits] = useState<Record<string, Record<number, string[]>>>({})

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
      setMatchStatus(json.match.status)
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

  // Find the next unscored hole
  const nextUnscoredHole = useMemo(() => {
    for (const hole of holes) {
      if (!completedHoles.has(hole.hole_number)) {
        return hole.hole_number
      }
    }
    return null
  }, [holes, completedHoles])

  // ------ Hole score entry ------

  function openHole(holeNumber: number) {
    if (!data) return
    const hole = holes.find((h) => h.hole_number === holeNumber)
    if (!hole) return

    // Initialize scores — use existing scores or default to par
    const initial: Record<string, number> = {}
    for (const mp of allMatchPlayers) {
      const existing = data.scores.find(
        (s) => s.hole_id === hole.id && s.trip_player_id === mp.trip_player_id
      )
      initial[mp.trip_player_id] = existing?.gross_score ?? hole.par
    }
    setHoleScores(initial)
    setActiveHole(holeNumber)
  }

  function adjustScore(tripPlayerId: string, delta: number) {
    if (navigator.vibrate) navigator.vibrate(10)
    setHoleScores((prev) => {
      const current = prev[tripPlayerId] ?? 4
      const next = Math.max(1, Math.min(20, current + delta))
      return { ...prev, [tripPlayerId]: next }
    })
  }

  function setScore(tripPlayerId: string, value: number) {
    if (navigator.vibrate) navigator.vibrate(10)
    setHoleScores((prev) => ({ ...prev, [tripPlayerId]: value }))
  }

  async function submitHoleScores() {
    if (navigator.vibrate) navigator.vibrate([20, 50, 20])
    if (!data || activeHole === null) return
    const hole = holes.find((h) => h.hole_number === activeHole)
    if (!hole) return

    // ---- Optimistic update: mark hole complete immediately ----
    const optimisticScores = allMatchPlayers.map((mp) => ({
      id: `optimistic-${mp.trip_player_id}-${hole.id}`,
      match_id: data.match.id,
      trip_player_id: mp.trip_player_id,
      hole_id: hole.id,
      gross_score: holeScores[mp.trip_player_id] ?? hole.par,
    }))

    setData((prev) => {
      if (!prev) return prev
      const otherScores = prev.scores.filter((s) => s.hole_id !== hole.id)
      return { ...prev, scores: [...otherScores, ...optimisticScores] }
    })

    // Immediately advance to next hole
    const currentHole = activeHole
    setActiveHole(null)
    setTimeout(() => {
      const updatedCompletedHoles = new Set(completedHoles)
      updatedCompletedHoles.add(currentHole)
      for (const h of holes) {
        if (!updatedCompletedHoles.has(h.hole_number)) {
          openHole(h.hole_number)
          return
        }
      }
    }, 100)

    // ---- Then actually save in background ----
    setSaving(true)
    try {
      const scores = allMatchPlayers.map((mp) => ({
        trip_player_id: mp.trip_player_id,
        gross_score: holeScores[mp.trip_player_id] ?? hole.par,
      }))

      const res = await fetch(`/api/score/${token}/holes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hole_id: hole.id, scores }),
      })

      if (res.ok) {
        const result = await res.json()
        // Replace optimistic data with real data
        setData((prev) => {
          if (!prev) return prev
          return { ...prev, scores: result.scores }
        })
        if (result.matchStatus) setMatchStatus(result.matchStatus)
      } else {
        // Revert optimistic update on failure
        setData((prev) => {
          if (!prev) return prev
          const reverted = prev.scores.filter((s) => !s.id.startsWith('optimistic-'))
          return { ...prev, scores: reverted }
        })
        setError('Failed to save. Tap the hole to retry.')
      }
    } catch {
      setError('Connection lost. Score saved locally.')
      // Service worker will queue the retry
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
      <div className="flex min-h-screen items-center justify-center bg-green-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-green-700 border-t-transparent" />
          <p className="text-lg font-medium text-green-800">
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
  const activeHoleData = activeHole
    ? holes.find((h) => h.hole_number === activeHole)
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-green-800 px-4 py-3 text-white shadow-md">
        <div className="mx-auto max-w-lg">
          <h1 className="text-lg font-bold">{data.course.name}</h1>
          <p className="text-sm text-green-200">
            {MATCH_FORMAT_LABELS[data.match.format]} &middot; Par{' '}
            {data.course.par}
          </p>
        </div>
      </header>

      {/* Match Status Banner */}
      <div className="border-b border-green-200 bg-green-50 px-4 py-3">
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
        {/* Full-screen hole entry with swipe navigation */}
        <HoleEntryView
          activeHole={activeHole}
          activeHoleData={activeHoleData}
          holes={holes}
          completedHoles={completedHoles}
          teamAPlayers={teamAPlayers}
          teamBPlayers={teamBPlayers}
          allMatchPlayers={allMatchPlayers}
          playerStrokesMap={playerStrokesMap}
          holeScores={holeScores}
          saving={saving}
          error={error}
          openHole={openHole}
          adjustScore={adjustScore}
          setScore={setScore}
          submitHoleScores={submitHoleScores}
          onClose={() => setActiveHole(null)}
          dotsHits={dotsHits}
          onDotsUpdate={(playerId, holeNumber, dots) => {
            setDotsHits(prev => ({
              ...prev,
              [playerId]: { ...prev[playerId], [holeNumber]: dots },
            }))
          }}
        />

        {/* Hole List */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Scorecard</h2>
          <div className="text-sm text-gray-500">
            {completedHoles.size}/{holes.length} holes
          </div>
        </div>

        {/* Front 9 / Back 9 */}
        {[
          { label: 'Front 9', start: 1, end: 9 },
          { label: 'Back 9', start: 10, end: 18 },
        ].map((nine) => {
          const nineHoles = holes.filter(
            (h) =>
              h.hole_number >= nine.start && h.hole_number <= nine.end
          )
          if (nineHoles.length === 0) return null

          return (
            <div key={nine.label} className="mb-4">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
                {nine.label}
              </h3>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-3">
                {nineHoles.map((hole) => {
                  const isComplete = completedHoles.has(hole.hole_number)
                  const isActive = activeHole === hole.hole_number

                  // Get scores summary for this hole
                  const holeScoreData = data.scores.filter(
                    (s) => s.hole_id === hole.id
                  )

                  return (
                    <button
                      key={hole.id}
                      onClick={() => openHole(hole.hole_number)}
                      className={`relative rounded-xl border-2 p-3 text-left transition-all active:scale-95 ${
                        isActive
                          ? 'border-green-600 bg-green-50 shadow-md'
                          : isComplete
                            ? 'border-green-300 bg-green-50'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      {/* Completed checkmark */}
                      {isComplete && (
                        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-xs text-white">
                          &#10003;
                        </span>
                      )}

                      <div className="text-lg font-bold text-gray-900">
                        {hole.hole_number}
                      </div>
                      <div className="text-xs text-gray-500">
                        Par {hole.par}
                      </div>
                      <div className="text-xs text-gray-400">
                        Hdcp {hole.handicap_index}
                      </div>

                      {/* Show scores if completed */}
                      {isComplete && holeScoreData.length > 0 && (
                        <div className="mt-1 border-t border-green-200 pt-1">
                          {holeScoreData.map((s) => {
                            const mp = allMatchPlayers.find(
                              (m) =>
                                m.trip_player_id === s.trip_player_id
                            )
                            const firstName =
                              mp?.trip_player?.player?.name?.split(' ')[0] ??
                              '?'
                            const diff = s.gross_score - hole.par
                            const diffText =
                              diff === 0
                                ? 'E'
                                : diff > 0
                                  ? `+${diff}`
                                  : `${diff}`
                            return (
                              <div
                                key={s.id}
                                className="flex items-center justify-between text-xs"
                              >
                                <span className="truncate text-gray-600">
                                  {firstName}
                                </span>
                                <span
                                  className={`font-semibold ${
                                    diff < 0
                                      ? 'text-red-600'
                                      : diff > 0
                                        ? 'text-blue-600'
                                        : 'text-gray-700'
                                  }`}
                                >
                                  {s.gross_score} ({diffText})
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Quick start button */}
        {nextUnscoredHole && activeHole === null && (
          <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white p-4 shadow-lg">
            <div className="mx-auto max-w-lg">
              <button
                onClick={() => openHole(nextUnscoredHole)}
                className="w-full rounded-xl bg-green-700 py-4 text-lg font-bold text-white shadow-lg active:bg-green-800"
              >
                Score Hole {nextUnscoredHole}
              </button>
            </div>
          </div>
        )}

        {/* All holes done message */}
        {nextUnscoredHole === null && holes.length > 0 && activeHole === null && (
          <div className="rounded-xl bg-green-100 p-6 text-center">
            <p className="text-lg font-bold text-green-800">
              All holes scored!
            </p>
            <p className="mt-1 text-sm text-green-600">
              Tap any hole to edit scores.
            </p>
          </div>
        )}

        {/* Spacer for fixed bottom button */}
        {nextUnscoredHole && <div className="h-24" />}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// HoleEntryView — full-screen swipeable hole entry
// ---------------------------------------------------------------------------

function HoleEntryView({
  activeHole,
  activeHoleData,
  holes,
  completedHoles,
  teamAPlayers,
  teamBPlayers,
  allMatchPlayers,
  playerStrokesMap,
  holeScores,
  saving,
  error,
  openHole,
  adjustScore,
  setScore,
  submitHoleScores,
  onClose,
  dotsHits,
  onDotsUpdate,
}: {
  activeHole: number | null
  activeHoleData: HoleData | null | undefined
  holes: HoleData[]
  completedHoles: Set<number>
  teamAPlayers: MatchPlayerData[]
  teamBPlayers: MatchPlayerData[]
  allMatchPlayers: MatchPlayerData[]
  playerStrokesMap: Map<string, Map<number, number>>
  holeScores: Record<string, number>
  saving: boolean
  error: string | null
  openHole: (n: number) => void
  adjustScore: (id: string, d: number) => void
  setScore: (id: string, v: number) => void
  submitHoleScores: () => void
  onClose: () => void
  dotsHits: Record<string, Record<number, string[]>>
  onDotsUpdate: (playerId: string, holeNumber: number, dots: string[]) => void
}) {
  const swipeHandlers = useSwipe({
    onSwipeLeft: () => {
      if (activeHole !== null && activeHole < holes.length) {
        openHole(activeHole + 1)
      }
    },
    onSwipeRight: () => {
      if (activeHole !== null && activeHole > 1) {
        openHole(activeHole - 1)
      }
    },
  })

  if (activeHole === null || !activeHoleData) return null

  return (
    <div
      className="fixed inset-0 z-30 bg-white flex flex-col"
      {...swipeHandlers}
    >
      {/* Top bar with hole navigation */}
      <div className="flex items-center justify-between bg-green-800 px-4 py-2 text-white">
        <button
          onClick={() => activeHole > 1 && openHole(activeHole - 1)}
          disabled={activeHole <= 1}
          className="px-3 py-1 text-sm disabled:opacity-30"
        >
          &larr; Prev
        </button>
        <div className="text-center">
          <span className="text-lg font-bold">Hole {activeHoleData.hole_number}</span>
          <span className="ml-2 text-sm text-green-200">Par {activeHoleData.par}</span>
          <span className="ml-2 text-xs text-green-300">Hdcp {activeHoleData.handicap_index}</span>
        </div>
        <button
          onClick={() => activeHole < holes.length && openHole(activeHole + 1)}
          disabled={activeHole >= holes.length}
          className="px-3 py-1 text-sm disabled:opacity-30"
        >
          Next &rarr;
        </button>
      </div>

      {/* Hole dots */}
      <div className="flex justify-center gap-1 py-2 bg-green-700">
        {holes.map(h => (
          <button
            key={h.id}
            onClick={() => openHole(h.hole_number)}
            className={`h-2.5 w-2.5 rounded-full transition ${
              h.hole_number === activeHole
                ? 'bg-white scale-125'
                : completedHoles.has(h.hole_number)
                  ? 'bg-green-400'
                  : 'bg-green-900'
            }`}
          />
        ))}
      </div>

      {/* Score entry area — vertically centered */}
      <div className="flex-1 flex flex-col justify-center px-4 overflow-y-auto">
        <div className="space-y-3 max-w-lg mx-auto w-full">
          {/* Team A */}
          {teamAPlayers.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-green-700">
                Team A
              </p>
              {teamAPlayers.map((mp) => (
                <PlayerScoreRow
                  key={mp.trip_player_id}
                  name={playerName(mp)}
                  strokes={
                    playerStrokesMap.get(mp.trip_player_id)?.get(activeHoleData.hole_number) ?? 0
                  }
                  score={holeScores[mp.trip_player_id] ?? activeHoleData.par}
                  par={activeHoleData.par}
                  onAdjust={(d) => adjustScore(mp.trip_player_id, d)}
                  onSet={(v) => setScore(mp.trip_player_id, v)}
                />
              ))}
            </div>
          )}

          {/* Team B */}
          {teamBPlayers.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-green-700">
                Team B
              </p>
              {teamBPlayers.map((mp) => (
                <PlayerScoreRow
                  key={mp.trip_player_id}
                  name={playerName(mp)}
                  strokes={
                    playerStrokesMap.get(mp.trip_player_id)?.get(activeHoleData.hole_number) ?? 0
                  }
                  score={holeScores[mp.trip_player_id] ?? activeHoleData.par}
                  par={activeHoleData.par}
                  onAdjust={(d) => adjustScore(mp.trip_player_id, d)}
                  onSet={(v) => setScore(mp.trip_player_id, v)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dots Tracker (shown if players exist) */}
      {activeHoleData && allMatchPlayers.length > 0 && (
        <div className="px-4 max-w-lg mx-auto w-full">
          <DotsTracker
            holeNumber={activeHoleData.hole_number}
            par={activeHoleData.par}
            players={allMatchPlayers.map(mp => ({
              id: mp.trip_player_id,
              name: playerName(mp),
            }))}
            enabledDots={['greenie', 'sandy', 'barkie', 'polie', 'chippy', 'water', 'ob', 'three_putt']}
            onUpdate={onDotsUpdate}
            currentDots={dotsHits}
          />
        </div>
      )}

      {/* Bottom action */}
      <div className="px-4 pb-6 pt-2 max-w-lg mx-auto w-full">
        <button
          onClick={submitHoleScores}
          disabled={saving}
          className="w-full rounded-xl bg-green-700 py-4 text-lg font-bold text-white shadow-lg active:bg-green-800 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save & Next'}
        </button>
        <button
          onClick={onClose}
          className="w-full mt-2 py-2 text-sm text-gray-500"
        >
          Back to scorecard
        </button>
        {error && (
          <p className="mt-2 text-center text-sm text-red-600">{error}</p>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// PlayerScoreRow — big +/- buttons for mobile
// ---------------------------------------------------------------------------

function PlayerScoreRow({
  name,
  strokes,
  score,
  par,
  onAdjust,
  onSet,
}: {
  name: string
  strokes: number
  score: number
  par: number
  onAdjust: (delta: number) => void
  onSet: (value: number) => void
}) {
  // Common scores: par-1 through par+3
  const presets: number[] = []
  for (let i = Math.max(1, par - 1); i <= par + 3; i++) {
    presets.push(i)
  }

  return (
    <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-3">
      <div className="flex items-center justify-between mb-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{name}</p>
          {strokes > 0 && (
            <p className="text-xs text-green-600 dark:text-green-400">
              {strokes} stroke{strokes !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onAdjust(-1)}
            disabled={score <= 1}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30 text-2xl font-bold text-red-700 dark:text-red-400 active:bg-red-200 disabled:opacity-30"
            aria-label={`Decrease ${name} score`}
          >
            &minus;
          </button>
          <span className="w-10 text-center text-2xl font-bold text-gray-900 dark:text-white">
            {score}
          </span>
          <button
            type="button"
            onClick={() => onAdjust(1)}
            disabled={score >= 20}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30 text-2xl font-bold text-green-700 dark:text-green-400 active:bg-green-200 disabled:opacity-30"
            aria-label={`Increase ${name} score`}
          >
            +
          </button>
        </div>
      </div>
      {/* Quick presets */}
      <div className="flex justify-center gap-1.5">
        {presets.map(v => (
          <button
            key={v}
            onClick={() => onSet(v)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
              score === v
                ? 'bg-green-700 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  )
}
