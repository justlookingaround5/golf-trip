'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getStrokesPerHole } from '@/lib/handicap'
import type { ActivityFeedItem, RoundScore, SideBet, SideBetHit } from '@/lib/types'
import posthog from 'posthog-js'

interface HoleData {
  id: string
  course_id: string
  hole_number: number
  par: number
  handicap_index: number
  yardage?: Record<string, number>
}

interface CourseData {
  id: string
  trip_id: string
  name: string
  par: number
  round_number: number
  round_date: string | null
}

interface TripPlayerData {
  id: string
  trip_id: string
  player_id: string
  paid: boolean
  player: { id: string; name: string; handicap_index: number | null; user_id: string | null } | { id: string; name: string; handicap_index: number | null; user_id: string | null }[]
}

interface CourseHandicapData {
  id: string
  trip_player_id: string
  course_id: string
  handicap_strokes: number
}

interface RoundGameData {
  id: string
  course_id: string
  trip_id: string
  config: Record<string, unknown>
  buy_in: number
  status: string
  game_format?: { id: string; name: string; icon: string; engine_key: string; scoring_type: string } | null
  round_game_players: { id: string; trip_player_id: string; side: string | null; metadata: Record<string, unknown> }[]
}

interface GameResultData {
  id: string
  round_game_id: string
  trip_player_id: string
  position: number
  points: number
  money: number
  details: Record<string, unknown>
}

interface PlayerTeeData {
  trip_player_id: string
  tee_name: string
}

interface ApiResponse {
  course: CourseData
  holes: HoleData[]
  tripPlayers: TripPlayerData[]
  roundScores: RoundScore[]
  courseHandicaps: CourseHandicapData[]
  roundGames: RoundGameData[]
  gameResults: GameResultData[]
  sideBets: SideBet[]
  sideBetHits: SideBetHit[]
  activityFeed: ActivityFeedItem[]
  currentTripPlayerId: string | null
  playerTees: PlayerTeeData[]
  roundStats: Record<string, unknown>[]
  isQuickRound: boolean
}

function getPlayerName(tp: TripPlayerData): string {
  const player = Array.isArray(tp.player) ? tp.player[0] : tp.player
  return player?.name || 'Unknown'
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

export default function LiveScoringClient({
  tripId,
  courseId,
  courseName,
}: {
  tripId: string
  courseId: string
  courseName: string
}) {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [infoHole, setInfoHole] = useState<number | null>(null)
  const [editCell, setEditCell] = useState<{ holeNumber: number; tripPlayerId: string } | null>(null)
  const [cellScore, setCellScore] = useState(4)
  const [cellStats, setCellStats] = useState<{ fairway_hit: boolean | null; gir: boolean | null; putts: number | null }>({ fairway_hit: null, gir: null, putts: null })
  const [saving, setSaving] = useState(false)
  const [scoreCellViewMode, setScoreCellViewMode] = useState(false)
  const [editCellIsExisting, setEditCellIsExisting] = useState(false)

  // Round management state
  const router = useRouter()
  const [showRoundMenu, setShowRoundMenu] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'end' | 'delete' | null>(null)
  const [roundActionLoading, setRoundActionLoading] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [statsPlayerId, setStatsPlayerId] = useState<string | null>(null)

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowRoundMenu(false)
      }
    }
    if (showRoundMenu) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showRoundMenu])

  async function handleEndRound() {
    setRoundActionLoading(true)
    try {
      const res = await fetch(`/api/rounds/${courseId}`, { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to end round')
      }
      posthog.capture('round_ended', { course_name: courseName })
      router.push('/home')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end round')
      setRoundActionLoading(false)
      setConfirmAction(null)
    }
  }

  async function handleDeleteRound() {
    setRoundActionLoading(true)
    try {
      const res = await fetch(`/api/rounds/${courseId}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to delete round')
      }
      posthog.capture('round_deleted', { course_name: courseName })
      router.push('/home')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete round')
      setRoundActionLoading(false)
      setConfirmAction(null)
    }
  }

  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/live/${courseId}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to load')
      }
      const json: ApiResponse = await res.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [courseId])

  useEffect(() => { loadData() }, [loadData])

  // Realtime subscriptions
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`live-${courseId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'round_scores', filter: `course_id=eq.${courseId}` },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newScore = payload.new as RoundScore
            setData(prev => {
              if (!prev) return prev
              const filtered = prev.roundScores.filter(
                s => !(s.trip_player_id === newScore.trip_player_id && s.hole_id === newScore.hole_id)
              )
              return { ...prev, roundScores: [...filtered, newScore] }
            })
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_results' },
        () => {
          // Refresh game results on change
          loadData()
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_feed', filter: `course_id=eq.${courseId}` },
        (payload) => {
          setData(prev => {
            if (!prev) return prev
            return {
              ...prev,
              activityFeed: [payload.new as ActivityFeedItem, ...prev.activityFeed].slice(0, 30),
            }
          })
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'side_bet_hits', filter: `course_id=eq.${courseId}` },
        (payload) => {
          setData(prev => {
            if (!prev) return prev
            return {
              ...prev,
              sideBetHits: [...prev.sideBetHits, payload.new as SideBetHit],
            }
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [courseId, loadData])

  // Derived data
  const holes = useMemo(() => {
    if (!data) return []
    return [...data.holes].sort((a, b) => a.hole_number - b.hole_number)
  }, [data])

  const currentTripPlayerId = data?.currentTripPlayerId || null

  const playerNameMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const tp of data?.tripPlayers || []) {
      map.set(tp.id, getPlayerName(tp))
    }
    return map
  }, [data])

  const playerStrokesMap = useMemo(() => {
    if (!data) return new Map<string, Map<number, number>>()
    const map = new Map<string, Map<number, number>>()
    for (const ch of data.courseHandicaps) {
      map.set(ch.trip_player_id, getStrokesPerHole(ch.handicap_strokes, data.holes))
    }
    return map
  }, [data])


  // Completed holes (where current player has a score)
  const completedHoles = useMemo(() => {
    if (!data || !currentTripPlayerId) return new Set<number>()
    const set = new Set<number>()
    for (const hole of holes) {
      const hasScore = data.roundScores.some(
        s => s.hole_id === hole.id && s.trip_player_id === currentTripPlayerId
      )
      if (hasScore) set.add(hole.hole_number)
    }
    return set
  }, [data, holes, currentTripPlayerId])

  const nextUnscoredHole = useMemo(() => {
    for (const hole of holes) {
      if (!completedHoles.has(hole.hole_number)) return hole.hole_number
    }
    return null
  }, [holes, completedHoles])

  function openCell(holeNumber: number, tripPlayerId: string) {
    if (!data) return
    const hole = holes.find(h => h.hole_number === holeNumber)
    if (!hole) return
    const existing = data.roundScores.find(s => s.hole_id === hole.id && s.trip_player_id === tripPlayerId)
    setCellScore(existing?.gross_score ?? hole.par)
    setCellStats({
      fairway_hit: existing?.fairway_hit ?? null,
      gir: existing?.gir ?? null,
      putts: existing?.putts ?? null,
    })
    setEditCellIsExisting(!!existing)
    setScoreCellViewMode(!!existing)
    setEditCell({ holeNumber, tripPlayerId })
  }

  async function deleteCellScore() {
    if (!editCell || !data) return
    const hole = holes.find(h => h.hole_number === editCell.holeNumber)
    if (!hole) return

    setData(prev => {
      if (!prev) return prev
      return {
        ...prev,
        roundScores: prev.roundScores.filter(
          s => !(s.hole_id === hole.id && s.trip_player_id === editCell.tripPlayerId)
        ),
      }
    })
    setEditCell(null)

    try {
      await fetch(`/api/live/${courseId}/scores`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hole_id: hole.id, trip_player_id: editCell.tripPlayerId }),
      })
    } catch {
      setError('Failed to delete score.')
    }
  }

  async function saveCellScore() {
    if (!editCell || !data) return
    const hole = holes.find(h => h.hole_number === editCell.holeNumber)
    if (!hole) return

    const entry: Record<string, unknown> = { trip_player_id: editCell.tripPlayerId, gross_score: cellScore }
    if (cellStats.fairway_hit !== null) entry.fairway_hit = cellStats.fairway_hit
    if (cellStats.gir !== null) entry.gir = cellStats.gir
    if (cellStats.putts !== null) entry.putts = cellStats.putts

    const optimistic: RoundScore = {
      id: `optimistic-${editCell.tripPlayerId}-${hole.id}`,
      course_id: courseId,
      trip_player_id: editCell.tripPlayerId,
      hole_id: hole.id,
      gross_score: cellScore,
      entered_by: null,
      fairway_hit: (entry.fairway_hit as boolean) ?? null,
      gir: (entry.gir as boolean) ?? null,
      putts: (entry.putts as number) ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Capture previous score so we can restore it if the save fails
    const previousScore = data.roundScores.find(
      s => s.hole_id === hole.id && s.trip_player_id === editCell.tripPlayerId
    ) || null

    setData(prev => {
      if (!prev) return prev
      const others = prev.roundScores.filter(s => !(s.hole_id === hole.id && s.trip_player_id === editCell.tripPlayerId))
      return { ...prev, roundScores: [...others, optimistic] }
    })
    setEditCell(null)

    setSaving(true)
    try {
      const res = await fetch(`/api/live/${courseId}/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hole_id: hole.id, scores: [entry] }),
      })
      if (res.ok) {
        const result = await res.json()
        setData(prev => prev ? { ...prev, roundScores: result.roundScores } : prev)
        posthog.capture('score_saved', { hole_number: editCell.holeNumber, course_id: courseId })
      } else {
        // Restore the previous score so the cell doesn't go blank
        setData(prev => {
          if (!prev) return prev
          const withoutOptimistic = prev.roundScores.filter(s => !s.id.startsWith('optimistic-'))
          return {
            ...prev,
            roundScores: previousScore ? [...withoutOptimistic, previousScore] : withoutOptimistic,
          }
        })
        setError('Failed to save. Tap the cell to retry.')
      }
    } catch {
      setData(prev => {
        if (!prev) return prev
        const withoutOptimistic = prev.roundScores.filter(s => !s.id.startsWith('optimistic-'))
        return {
          ...prev,
          roundScores: previousScore ? [...withoutOptimistic, previousScore] : withoutOptimistic,
        }
      })
      setError('Connection lost. Score may not be saved.')
    } finally {
      setSaving(false)
    }
  }

  // Build leaderboard from round_scores
  const leaderboard = useMemo(() => {
    if (!data) return []
    return data.tripPlayers.map(tp => {
      const scores = data.roundScores.filter(s => s.trip_player_id === tp.id)
      const grossTotal = scores.reduce((sum, s) => sum + s.gross_score, 0)
      const holesPlayed = scores.length

      // Calculate net
      const strokesMap = playerStrokesMap.get(tp.id)
      let netTotal = grossTotal
      if (strokesMap) {
        netTotal = scores.reduce((sum, s) => {
          const hole = holes.find(h => h.id === s.hole_id)
          const strokes = hole ? (strokesMap.get(hole.hole_number) ?? 0) : 0
          return sum + (s.gross_score - strokes)
        }, 0)
      }

      // vs par for holes played
      const parForHolesPlayed = scores.reduce((sum, s) => {
        const hole = holes.find(h => h.id === s.hole_id)
        return sum + (hole?.par ?? 0)
      }, 0)

      return {
        tripPlayerId: tp.id,
        name: getPlayerName(tp),
        grossTotal,
        netTotal,
        holesPlayed,
        thru: holesPlayed === 0 ? '-' : `${holesPlayed}`,
        vsPar: grossTotal - parForHolesPlayed,
      }
    }).filter(e => e.holesPlayed > 0)
  }, [data, holes, playerStrokesMap])

  // Build games info
  const gamesInfo = useMemo(() => {
    if (!data) return []
    return data.roundGames.map(rg => {
      const results = data.gameResults
        .filter(gr => gr.round_game_id === rg.id)
        .map(gr => ({
          tripPlayerId: gr.trip_player_id,
          name: playerNameMap.get(gr.trip_player_id) || 'Unknown',
          points: gr.points,
          money: gr.money,
          position: gr.position,
        }))

      return {
        id: rg.id,
        name: rg.game_format?.name || 'Game',
        icon: rg.game_format?.icon || '🎯',
        buyIn: rg.buy_in,
        status: rg.status,
        results,
      }
    })
  }, [data, playerNameMap])

  // All players have a gross score on every hole → prompt to finish
  const allGrossScoresSaved = useMemo(() => {
    if (!data || holes.length === 0) return false
    return data.tripPlayers.every(tp =>
      holes.every(hole =>
        data.roundScores.some(s => s.hole_id === hole.id && s.trip_player_id === tp.id)
      )
    )
  }, [data, holes])

  // Build side bet hits with names
  const enrichedHits = useMemo(() => {
    if (!data) return []
    return data.sideBetHits.map(hit => ({
      ...hit,
      playerName: playerNameMap.get(hit.trip_player_id) || 'Player',
      holeNumber: holes.find(h => h.id === hit.hole_id)?.hole_number,
    }))
  }, [data, playerNameMap, holes])

  const activeTeeNames = useMemo(() => {
    const names = new Set<string>()
    for (const pt of data?.playerTees || []) {
      if (pt.tee_name) names.add(pt.tee_name)
    }
    return names
  }, [data])

  // Best Ball match play data
  const bestBallGame = useMemo(() =>
    data?.roundGames.find(rg => rg.game_format?.name === 'Best Ball') ?? null,
    [data])

  const teamAssignments = useMemo(() => {
    if (!bestBallGame) return { team_a: [] as string[], team_b: [] as string[] }
    return {
      team_a: bestBallGame.round_game_players
        .filter(rgp => rgp.side === 'team_a')
        .map(rgp => rgp.trip_player_id),
      team_b: bestBallGame.round_game_players
        .filter(rgp => rgp.side === 'team_b')
        .map(rgp => rgp.trip_player_id),
    }
  }, [bestBallGame])

  const bbTeamNames = useMemo(() => {
    const getName = (tpId: string) => {
      const tp = data?.tripPlayers.find(t => t.id === tpId)
      return tp ? getPlayerName(tp).split(' ')[0] : ''
    }
    const teamANames = teamAssignments.team_a.map(getName).filter(Boolean)
    const teamBNames = teamAssignments.team_b.map(getName).filter(Boolean)
    return {
      team_a: teamANames.length ? teamANames.join(' & ') : 'Team A',
      team_b: teamBNames.length ? teamBNames.join(' & ') : 'Team B',
    }
  }, [teamAssignments, data])

  const isBestBallMatchPlay = bestBallGame !== null &&
    teamAssignments.team_a.length > 0 &&
    teamAssignments.team_b.length > 0

  // Match play adjusted strokes: low player gets 0, others receive the difference
  const matchStrokesMap = useMemo(() => {
    if (!isBestBallMatchPlay || !data) return new Map<string, Map<number, number>>()
    const allPlayerIds = [...teamAssignments.team_a, ...teamAssignments.team_b]
    const minStrokes = Math.min(
      ...allPlayerIds.map(id => data.courseHandicaps.find(c => c.trip_player_id === id)?.handicap_strokes ?? 0)
    )
    const map = new Map<string, Map<number, number>>()
    for (const id of allPlayerIds) {
      const raw = data.courseHandicaps.find(c => c.trip_player_id === id)?.handicap_strokes ?? 0
      map.set(id, getStrokesPerHole(Math.max(0, raw - minStrokes), data.holes))
    }
    return map
  }, [isBestBallMatchPlay, data, teamAssignments])

  const matchPlayData = useMemo(() => {
    if (!isBestBallMatchPlay || !data) return null

    let aWins = 0
    let bWins = 0
    let firstResultSeen = false

    return holes.map(hole => {
      const getTeamBestNet = (teamIds: string[]): number | null => {
        const nets = teamIds.flatMap(tpId => {
          const score = data.roundScores.find(s => s.hole_id === hole.id && s.trip_player_id === tpId)
          if (!score) return []
          const strokes = matchStrokesMap.get(tpId)?.get(hole.hole_number) ?? 0
          return [score.gross_score - strokes]
        })
        return nets.length === 0 ? null : Math.min(...nets)
      }

      const allPlayersScored = [...teamAssignments.team_a, ...teamAssignments.team_b].every(
        tpId => data.roundScores.find(s => s.hole_id === hole.id && s.trip_player_id === tpId)
      )

      const aBest = getTeamBestNet(teamAssignments.team_a)
      const bBest = getTeamBestNet(teamAssignments.team_b)

      if (allPlayersScored && aBest !== null && bBest !== null) {
        if (aBest < bBest) aWins++
        else if (bBest < aBest) bWins++
      }

      const lead = aWins - bWins
      const hasResult = allPlayersScored && aBest !== null && bBest !== null
      const holeWasDecided = hasResult && aBest !== bBest
      const isFirstResult = hasResult && !firstResultSeen
      if (hasResult) firstResultSeen = true

      // Show only when the hole was won/lost, or on the very first scored hole (AS)
      const showStatus = holeWasDecided || isFirstResult

      const status = hasResult
        ? (lead === 0 ? 'AS' : `${Math.abs(lead)}UP`)
        : null

      return { hole, aBest, bBest, lead, status, showStatus }
    })
  }, [isBestBallMatchPlay, data, holes, teamAssignments, matchStrokesMap])

  // Loading
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-golf-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-golf-700 border-t-transparent" />
          <p className="text-lg font-medium text-golf-800">Loading live mode...</p>
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-red-50 p-4">
        <div className="rounded-xl bg-white p-8 text-center shadow-lg">
          <p className="mb-2 text-xl font-bold text-red-700">Error</p>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!data || !currentTripPlayerId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="rounded-xl bg-white p-8 text-center shadow-lg">
          <p className="mb-2 text-xl font-bold text-gray-700">Not in this trip</p>
          <p className="text-gray-500">You need to be a player in this trip to use live scoring.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Confirmation dialog */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900">
              {confirmAction === 'end' ? 'End Round Early?' : 'Delete Round?'}
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              {confirmAction === 'end'
                ? 'This will finalize the round with whatever scores have been entered. You can still view the scorecard afterward.'
                : 'This will permanently delete the round and all scores. This cannot be undone.'}
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                disabled={roundActionLoading}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction === 'end' ? handleEndRound : handleDeleteRound}
                disabled={roundActionLoading}
                className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50 ${
                  confirmAction === 'delete'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-golf-700 hover:bg-golf-800'
                }`}
              >
                {roundActionLoading ? 'Working...' : confirmAction === 'end' ? 'End Round' : 'Delete Round'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-20 bg-golf-800 px-4 py-3 text-white shadow-md">
        <div className="mx-auto max-w-lg flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">{courseName}</h1>
            <p className="text-sm text-golf-200">
              Live Scoring &middot; Par {data.course.par}
              {data.roundGames.length > 0 && (
                <span> &middot; {data.roundGames.map(rg => rg.game_format?.name || 'Game').join(' · ')}</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!data.isQuickRound && (
              <a
                href={`/trip/${tripId}`}
                className="rounded-md border border-golf-600 px-3 py-1.5 text-xs font-medium text-golf-200 hover:bg-golf-700"
              >
                Trip
              </a>
            )}
            {data.isQuickRound && (
              <a
                href="/home"
                className="rounded-md border border-golf-600 px-3 py-1.5 text-xs font-medium text-golf-200 hover:bg-golf-700"
              >
                Home
              </a>
            )}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowRoundMenu(!showRoundMenu)}
                className="rounded-md p-1.5 text-golf-200 hover:bg-golf-700"
                aria-label="Round options"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <circle cx="10" cy="4" r="1.5" />
                  <circle cx="10" cy="10" r="1.5" />
                  <circle cx="10" cy="16" r="1.5" />
                </svg>
              </button>
              {showRoundMenu && (
                <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  <button
                    onClick={() => { setShowRoundMenu(false); setConfirmAction('end') }}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    End Round Early
                  </button>
                  <button
                    onClick={() => { setShowRoundMenu(false); setConfirmAction('delete') }}
                    className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
                  >
                    Delete Round
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-4">
        {/* Error banner */}
        {error && (
          <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
            <button onClick={() => setError(null)} className="ml-2 font-bold">×</button>
          </div>
        )}

        {/* Scorecard */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Scorecard</h2>
          <div className="text-sm text-gray-500">
            {completedHoles.size}/{holes.length} holes
          </div>
        </div>

        {/* Best Ball match status banner */}
        {isBestBallMatchPlay && matchPlayData && (() => {
          const lastPlayed = [...matchPlayData].reverse().find(d => d.status !== null)
          if (!lastPlayed) return (
            <div className="mb-3 rounded-lg bg-gray-100 px-4 py-2.5 text-center text-sm text-gray-500">
              Match not started
            </div>
          )
          const { lead, status } = lastPlayed
          const holesPlayed = matchPlayData.filter(d => d.status !== null).length
          const holesRemaining = holes.length - holesPlayed
          if (lead === 0) return (
            <div className="mb-3 rounded-lg bg-gray-100 px-4 py-2.5 text-center">
              <span className="font-bold text-gray-700">All Square</span>
              <span className="ml-2 text-xs text-gray-400">thru {holesPlayed}</span>
            </div>
          )
          const leadingTeam = lead > 0 ? bbTeamNames.team_a : bbTeamNames.team_b
          const isMatchOver = Math.abs(lead) > holesRemaining
          return (
            <div className={`mb-3 rounded-lg px-4 py-2.5 text-center ${lead > 0 ? 'bg-golf-50' : 'bg-blue-50'}`}>
              <span className={`font-bold ${lead > 0 ? 'text-golf-800' : 'text-blue-700'}`}>
                {leadingTeam} {status}
              </span>
              {isMatchOver
                ? <span className="ml-2 text-xs text-gray-500">Match over</span>
                : <span className="ml-2 text-xs text-gray-400">thru {holesPlayed}</span>
              }
            </div>
          )
        })()}

        {/* Scorecard table — Best Ball match play layout */}
        {isBestBallMatchPlay && matchPlayData ? (
          <div className="-mx-4 overflow-x-auto">
            <table className="min-w-full text-xs border-collapse">
              <thead>
                {/* Player name headers */}
                <tr className="bg-gray-50">
                  <th className="w-8 px-1 py-1.5 text-center text-[10px] font-semibold text-gray-500 border-b border-gray-200">Hole</th>
                  <th className="w-7 px-1 py-1.5 text-center text-[10px] font-semibold text-gray-500 border-b border-gray-200">Par</th>
                  {teamAssignments.team_a.map(tpId => {
                    const tpScores = data.roundScores.filter(s => s.trip_player_id === tpId)
                    const gross = tpScores.reduce((sum, s) => sum + s.gross_score, 0)
                    const par = tpScores.reduce((sum, s) => {
                      const h = holes.find(hh => hh.id === s.hole_id)
                      return sum + (h?.par ?? 0)
                    }, 0)
                    const vsPar = tpScores.length > 0 ? gross - par : null
                    const label = vsPar === null ? '' : vsPar === 0 ? ' E' : vsPar > 0 ? ` +${vsPar}` : ` ${vsPar}`
                    return (
                      <th key={tpId} onClick={() => setStatsPlayerId(tpId)} className="px-1 py-1.5 text-center font-semibold text-golf-800 border-b border-l border-gray-200 cursor-pointer hover:bg-golf-50">
                        {(playerNameMap.get(tpId) || '—').split(' ')[0]}
                        {label && <span className="font-normal text-gray-400">{label}</span>}
                      </th>
                    )
                  })}
                  <th className="w-10 px-1 py-1.5 text-center text-[10px] font-semibold text-gray-500 border-b border-l border-gray-200">Match</th>
                  {teamAssignments.team_b.map(tpId => {
                    const tpScores = data.roundScores.filter(s => s.trip_player_id === tpId)
                    const gross = tpScores.reduce((sum, s) => sum + s.gross_score, 0)
                    const par = tpScores.reduce((sum, s) => {
                      const h = holes.find(hh => hh.id === s.hole_id)
                      return sum + (h?.par ?? 0)
                    }, 0)
                    const vsPar = tpScores.length > 0 ? gross - par : null
                    const label = vsPar === null ? '' : vsPar === 0 ? ' E' : vsPar > 0 ? ` +${vsPar}` : ` ${vsPar}`
                    return (
                      <th key={tpId} onClick={() => setStatsPlayerId(tpId)} className="px-1 py-1.5 text-center font-semibold text-blue-700 border-b border-l border-gray-200 cursor-pointer hover:bg-blue-50">
                        {(playerNameMap.get(tpId) || '—').split(' ')[0]}
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
                  const nineHoles = matchPlayData.filter(
                    d => d.hole.hole_number >= nine.start && d.hole.hole_number <= nine.end
                  )
                  if (nineHoles.length === 0) return []

                  const holeRows = nineHoles.map(({ hole, aBest, bBest, lead, status, showStatus }) => (
                    <tr key={hole.id} className="border-b border-gray-100">
                      {/* Hole number */}
                      <td
                        onClick={() => setInfoHole(hole.hole_number)}
                        className="w-8 px-1 py-2 text-center font-medium text-gray-700 cursor-pointer hover:bg-gray-50 active:bg-gray-100"
                      >
                        {hole.hole_number}
                      </td>
                      {/* Par */}
                      <td
                        onClick={() => setInfoHole(hole.hole_number)}
                        className="w-7 px-1 py-2 text-center text-gray-500 cursor-pointer hover:bg-gray-50 active:bg-gray-100"
                      >
                        {hole.par}
                      </td>
                      {/* Team A player scores */}
                      {teamAssignments.team_a.map(tpId => {
                        const score = data.roundScores.find(s => s.hole_id === hole.id && s.trip_player_id === tpId)
                        const gross = score?.gross_score
                        const strokes = matchStrokesMap.get(tpId)?.get(hole.hole_number) ?? 0
                        const net = gross !== undefined ? gross - strokes : undefined
                        const isTeamBest = net !== undefined && aBest !== null && net === aBest
                        return (
                          <td
                            key={tpId}
                            onClick={() => openCell(hole.hole_number, tpId)}
                            className={`relative px-1 py-2 text-center border-l border-gray-200 cursor-pointer active:bg-golf-100 ${isTeamBest ? 'bg-golf-100' : ''}`}
                          >
                            {strokes > 0 && <span className="absolute right-0.5 top-0 text-sm leading-none text-gray-500">*</span>}
                            {gross !== undefined && scoreBadge(gross, hole.par)}
                          </td>
                        )
                      })}
                      {/* Running match play status */}
                      <td className="w-10 px-1 py-2 text-center font-semibold text-[11px] border-l border-gray-200">
                        {status && showStatus && (
                          <span className={`flex items-center justify-center gap-0.5 ${lead > 0 ? 'text-golf-700' : lead < 0 ? 'text-blue-600' : 'text-gray-500'}`}>
                            {lead > 0 && <span>◀</span>}
                            <span>{status}</span>
                            {lead < 0 && <span>▶</span>}
                          </span>
                        )}
                      </td>
                      {/* Team B player scores */}
                      {teamAssignments.team_b.map(tpId => {
                        const score = data.roundScores.find(s => s.hole_id === hole.id && s.trip_player_id === tpId)
                        const gross = score?.gross_score
                        const strokes = matchStrokesMap.get(tpId)?.get(hole.hole_number) ?? 0
                        const net = gross !== undefined ? gross - strokes : undefined
                        const isTeamBest = net !== undefined && bBest !== null && net === bBest
                        return (
                          <td
                            key={tpId}
                            onClick={() => openCell(hole.hole_number, tpId)}
                            className={`relative px-1 py-2 text-center border-l border-gray-200 cursor-pointer active:bg-blue-100 ${isTeamBest ? 'bg-blue-100' : ''}`}
                          >
                            {strokes > 0 && <span className="absolute right-0.5 top-0 text-sm leading-none text-gray-500">*</span>}
                            {gross !== undefined && scoreBadge(gross, hole.par)}
                          </td>
                        )
                      })}
                    </tr>
                  ))

                  const parSum = nineHoles.reduce((s, d) => s + d.hole.par, 0)
                  const nineStatus = (() => {
                    const last = [...nineHoles].reverse().find(d => d.status !== null)
                    return last ?? null
                  })()

                  const subtotalRow = (
                    <tr key={`${nine.label}-sub`} className="border-b-2 border-gray-300 bg-gray-50 font-bold">
                      <td className="px-1 py-2 text-center text-gray-600 text-[10px]">{nine.label}</td>
                      <td className="px-1 py-2 text-center text-gray-600">{parSum}</td>
                      {teamAssignments.team_a.map(tpId => {
                        let grossSum = 0
                        const allScored = nineHoles.every(({ hole }) => {
                          const s = data.roundScores.find(sc => sc.hole_id === hole.id && sc.trip_player_id === tpId)
                          if (s) grossSum += s.gross_score
                          return !!s
                        })
                        return (
                          <td key={tpId} className="px-1 py-2 text-center border-l border-gray-200 text-golf-800">
                            {allScored ? grossSum : ''}
                          </td>
                        )
                      })}
                      <td className="px-1 py-2 text-center text-[10px] font-semibold border-l border-gray-200">
                        {nineStatus?.status && nineStatus.lead !== 0 && (
                          <span className={`flex items-center justify-center gap-0.5 ${nineStatus.lead > 0 ? 'text-golf-700' : 'text-blue-600'}`}>
                            {nineStatus.lead > 0 && <span>◀</span>}
                            <span>{nineStatus.status}</span>
                            {nineStatus.lead < 0 && <span>▶</span>}
                          </span>
                        )}
                      </td>
                      {teamAssignments.team_b.map(tpId => {
                        let grossSum = 0
                        const allScored = nineHoles.every(({ hole }) => {
                          const s = data.roundScores.find(sc => sc.hole_id === hole.id && sc.trip_player_id === tpId)
                          if (s) grossSum += s.gross_score
                          return !!s
                        })
                        return (
                          <td key={tpId} className="px-1 py-2 text-center border-l border-gray-200 text-blue-700">
                            {allScored ? grossSum : ''}
                          </td>
                        )
                      })}
                    </tr>
                  )

                  return [...holeRows, subtotalRow]
                })}

                {/* Total row */}
                {holes.length > 0 && (() => {
                  const finalStatus = [...matchPlayData].reverse().find(d => d.status !== null)
                  return (
                    <tr className="bg-gray-100 font-bold">
                      <td className="px-1 py-2 text-center text-gray-600 text-[10px]">Total</td>
                      <td className="px-1 py-2 text-center text-gray-600">{holes.reduce((s, h) => s + h.par, 0)}</td>
                      {teamAssignments.team_a.map(tpId => {
                        let grossSum = 0
                        const allScored = holes.every(h => {
                          const s = data.roundScores.find(sc => sc.hole_id === h.id && sc.trip_player_id === tpId)
                          if (s) grossSum += s.gross_score
                          return !!s
                        })
                        return (
                          <td key={tpId} className="px-1 py-2 text-center border-l border-gray-200 text-golf-800">
                            {allScored ? grossSum : ''}
                          </td>
                        )
                      })}
                      <td className="px-1 py-2 text-center text-[10px] font-semibold border-l border-gray-200">
                        {finalStatus?.status && finalStatus.lead !== 0 && (
                          <span className={`flex items-center justify-center gap-0.5 ${finalStatus.lead > 0 ? 'text-golf-700' : 'text-blue-600'}`}>
                            {finalStatus.lead > 0 && <span>◀</span>}
                            <span>{finalStatus.status}</span>
                            {finalStatus.lead < 0 && <span>▶</span>}
                          </span>
                        )}
                      </td>
                      {teamAssignments.team_b.map(tpId => {
                        let grossSum = 0
                        const allScored = holes.every(h => {
                          const s = data.roundScores.find(sc => sc.hole_id === h.id && sc.trip_player_id === tpId)
                          if (s) grossSum += s.gross_score
                          return !!s
                        })
                        return (
                          <td key={tpId} className="px-1 py-2 text-center border-l border-gray-200 text-blue-700">
                            {allScored ? grossSum : ''}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })()}
              </tbody>
            </table>
          </div>
        ) : (
        /* Flat scorecard — standard / non-Best Ball rounds */
        <div className="-mx-4 overflow-x-auto">
          <table className="min-w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="sticky left-0 z-10 bg-gray-100 w-9 px-1 py-2 text-center font-semibold text-gray-600 border-b border-gray-200">Hole</th>
                <th className="sticky left-9 z-10 bg-gray-100 w-9 px-1 py-2 text-center font-semibold text-gray-600 border-b border-l border-gray-200">Par</th>
                {data.tripPlayers.map(tp => {
                  const tpScores = data.roundScores.filter(s => s.trip_player_id === tp.id)
                  const grossTotal = tpScores.reduce((sum, s) => sum + s.gross_score, 0)
                  const parTotal = tpScores.reduce((sum, s) => {
                    const h = holes.find(hh => hh.id === s.hole_id)
                    return sum + (h?.par ?? 0)
                  }, 0)
                  const vsPar = tpScores.length > 0 ? grossTotal - parTotal : null
                  const vsParLabel = vsPar === null ? '' : vsPar === 0 ? ' E' : vsPar > 0 ? ` +${vsPar}` : ` ${vsPar}`
                  return (
                    <th key={tp.id} onClick={() => setStatsPlayerId(tp.id)} className="px-1 py-2 text-center font-semibold text-gray-600 border-b border-l border-gray-200 cursor-pointer hover:bg-gray-50">
                      {getPlayerName(tp).split(' ')[0]}{vsParLabel && <span className="font-normal text-gray-400">{vsParLabel}</span>}
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

                const holeRows = nineHoles.map(hole => (
                  <tr
                    key={hole.id}
                    className="border-b border-gray-100"
                  >
                    <td onClick={() => setInfoHole(hole.hole_number)} className="sticky left-0 z-10 bg-white w-9 px-1 py-2 text-center font-medium text-gray-700 cursor-pointer hover:bg-gray-50 active:bg-gray-100">{hole.hole_number}</td>
                    <td onClick={() => setInfoHole(hole.hole_number)} className="sticky left-9 z-10 bg-white w-9 px-1 py-2 text-center text-gray-500 border-l border-gray-200 cursor-pointer hover:bg-gray-50 active:bg-gray-100">{hole.par}</td>
                    {data.tripPlayers.map(tp => {
                      const score = data.roundScores.find(s => s.hole_id === hole.id && s.trip_player_id === tp.id)
                      const gross = score?.gross_score
                      const strokes = playerStrokesMap.get(tp.id)?.get(hole.hole_number) ?? 0
                      return (
                        <td key={tp.id} onClick={() => openCell(hole.hole_number, tp.id)} className="relative px-1 py-2 text-center border-l border-gray-200 cursor-pointer hover:bg-gray-50 active:bg-gray-100">
                          {strokes > 0 && <span className="absolute right-0.5 top-0 text-[10px] leading-none text-gray-500">*</span>}
                          {gross !== undefined && scoreBadge(gross, hole.par)}
                        </td>
                      )
                    })}
                  </tr>
                ))

                const parSum = nineHoles.reduce((s, h) => s + h.par, 0)
                const subtotalRow = (
                  <tr key={`${nine.label}-sub`} className="border-b-2 border-gray-300 bg-gray-50 font-bold">
                    <td className="sticky left-0 z-10 bg-gray-50 px-1 py-2 text-center text-gray-700">{nine.label}</td>
                    <td className="sticky left-9 z-10 bg-gray-50 px-1 py-2 text-center text-gray-600 border-l border-gray-200">{parSum}</td>
                    {data.tripPlayers.map(tp => {
                      let grossSum = 0
                      const allScored = nineHoles.every(h => {
                        const s = data.roundScores.find(sc => sc.hole_id === h.id && sc.trip_player_id === tp.id)
                        if (s) grossSum += s.gross_score
                        return !!s
                      })
                      return (
                        <td key={tp.id} className="px-1 py-2 text-center border-l border-gray-200">{allScored ? grossSum : ''}</td>
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
                  {data.tripPlayers.map(tp => {
                    let grossSum = 0
                    const allScored = holes.every(h => {
                      const s = data.roundScores.find(sc => sc.hole_id === h.id && sc.trip_player_id === tp.id)
                      if (s) grossSum += s.gross_score
                      return !!s
                    })
                    return (
                      <td key={tp.id} className="px-1 py-2 text-center border-l border-gray-200">{allScored ? grossSum : ''}</td>
                    )
                  })}
                </tr>
              )}
            </tbody>
          </table>
        </div>
        )}

        {/* All holes done */}
        {allGrossScoresSaved && (
          <div className="mt-4 rounded-xl bg-golf-700 p-6 text-center shadow-lg">
            <p className="text-lg font-bold text-white">All Holes Complete!</p>
            <p className="mt-1 text-sm text-golf-200">All scores are in. Ready to finish.</p>
            <button
              onClick={() => setConfirmAction('end')}
              className="mt-4 w-full rounded-xl bg-white py-3 text-sm font-bold text-golf-800 active:bg-golf-50"
            >
              End Round
            </button>
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
              {hole.yardage && (() => {
                const entries = Object.entries(hole.yardage)
                  .filter(([tee]) => activeTeeNames.size === 0 ? true : activeTeeNames.has(tee))
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

      {/* Cell edit popup */}
      {editCell !== null && (() => {
        const hole = holes.find(h => h.hole_number === editCell.holeNumber)
        if (!hole) return null
        const playerName = playerNameMap.get(editCell.tripPlayerId) || 'Player'
        const allStatsEntered =
          cellStats.putts !== null &&
          cellStats.gir !== null &&
          (hole.par <= 3 || cellStats.fairway_hit !== null)
        return (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditCell(null)}>
            <div className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900">{playerName}</h3>
                  <p className="text-xs text-gray-500">Hole {hole.hole_number} &middot; Par {hole.par}</p>
                </div>
                <button onClick={() => setEditCell(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
              </div>

              {scoreCellViewMode ? (
                <>
                  {/* View mode — tap Edit to modify or delete */}
                  <div className="mb-5 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Score</span>
                      <span className="font-bold text-gray-900">{cellScore}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Putts</span>
                      <span className="font-semibold text-gray-800">{cellStats.putts !== null ? cellStats.putts : '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">GIR</span>
                      <span className="font-semibold text-gray-800">{cellStats.gir !== null ? (cellStats.gir ? 'Yes' : 'No') : '—'}</span>
                    </div>
                    {hole.par > 3 && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Fairway</span>
                        <span className="font-semibold text-gray-800">{cellStats.fairway_hit !== null ? (cellStats.fairway_hit ? 'Yes' : 'No') : '—'}</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setScoreCellViewMode(false)}
                    className="w-full rounded-xl border border-gray-300 py-3 text-sm font-bold text-gray-700 active:bg-gray-50"
                  >
                    Edit Score
                  </button>
                </>
              ) : (
                <>
                  {/* Edit mode */}
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

                  <div className="mb-4 space-y-2">
                    {hole.par > 3 && (
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
                    disabled={saving || !allStatsEntered}
                    className="w-full rounded-xl bg-golf-700 py-3 text-sm font-bold text-white shadow active:bg-golf-800 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Score'}
                  </button>

                  {editCellIsExisting && (
                    <button
                      onClick={deleteCellScore}
                      className="mt-2 w-full rounded-xl border border-red-200 py-2.5 text-sm font-medium text-red-600 active:bg-red-50"
                    >
                      Delete Score
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )
      })()}

      {/* Player stats popup */}
      {statsPlayerId !== null && (() => {
        const tp = data.tripPlayers.find(t => t.id === statsPlayerId)
        if (!tp) return null
        const name = getPlayerName(tp)
        const scores = data.roundScores.filter(s => s.trip_player_id === statsPlayerId)
        const holesPlayed = scores.length

        // Fairways: non-par-3 holes only, where fairway_hit was recorded
        const fairwayScores = scores.filter(s => {
          const hole = holes.find(h => h.id === s.hole_id)
          return hole && hole.par > 3 && s.fairway_hit !== null
        })
        const fairwaysHit = fairwayScores.filter(s => s.fairway_hit === true).length

        // GIR: holes where gir was recorded
        const girScores = scores.filter(s => s.gir !== null)
        const girHit = girScores.filter(s => s.gir === true).length

        // Putts: holes where putts was recorded
        const puttsScores = scores.filter(s => s.putts !== null)
        const totalPutts = puttsScores.reduce((sum, s) => sum + (s.putts ?? 0), 0)

        const ch = data.courseHandicaps.find(c => c.trip_player_id === statsPlayerId)
        const tee = data.playerTees.find(t => t.trip_player_id === statsPlayerId)

        return (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={() => setStatsPlayerId(null)}>
            <div className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900">{name}</h3>
                  <p className="text-xs text-gray-500">
                    {holesPlayed} hole{holesPlayed !== 1 ? 's' : ''} played
                    {ch && <span> &middot; {ch.handicap_strokes} strokes</span>}
                    {tee && <span> &middot; {tee.tee_name}</span>}
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
                        <div className="text-sm text-gray-400">—</div>
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
                        <div className="text-sm text-gray-400">—</div>
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
                        <div className="text-sm text-gray-400">—</div>
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
