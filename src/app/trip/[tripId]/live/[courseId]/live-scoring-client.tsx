'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getStrokesPerHole } from '@/lib/handicap'
import type { ActivityFeedItem, RoundScore, SideBet, SideBetHit } from '@/lib/types'
import HoleView from './components/HoleView'
import LiveDashboard from './components/LiveDashboard'
import StatsCard from './components/StatsCard'
import ScoreIndicator from '@/components/ScoreIndicator'
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

  const [activeHole, setActiveHole] = useState<number | null>(null)
  const [holeScores, setHoleScores] = useState<Record<string, number>>({})
  const [statsEnabled, setStatsEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`stats-enabled-${courseId}`) === 'true'
    }
    return false
  })
  const [touchedPlayers, setTouchedPlayers] = useState<Set<string>>(new Set())
  const [holeStats, setHoleStats] = useState<Record<string, { fairway_hit?: boolean | null; gir?: boolean | null; putts?: number | null }>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    localStorage.setItem(`stats-enabled-${courseId}`, String(statsEnabled))
  }, [statsEnabled, courseId])

  // Round management state
  const router = useRouter()
  const [showRoundMenu, setShowRoundMenu] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'end' | 'delete' | null>(null)
  const [roundActionLoading, setRoundActionLoading] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

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

  // Current player's tee
  const currentPlayerTee = useMemo(() => {
    if (!data || !currentTripPlayerId) return undefined
    const tee = data.playerTees.find(t => t.trip_player_id === currentTripPlayerId)
    return tee?.tee_name
  }, [data, currentTripPlayerId])

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

  // Open a hole for scoring
  function openHole(holeNumber: number) {
    if (!data || !currentTripPlayerId) return
    const hole = holes.find(h => h.hole_number === holeNumber)
    if (!hole) return

    const initial: Record<string, number> = {}
    const initialTouched = new Set<string>()

    // All trip players
    for (const tp of data.tripPlayers) {
      const existing = data.roundScores.find(
        s => s.hole_id === hole.id && s.trip_player_id === tp.id
      )
      if (existing) {
        initial[tp.id] = existing.gross_score
        initialTouched.add(tp.id)
      } else if (tp.id === currentTripPlayerId) {
        initial[tp.id] = hole.par
        initialTouched.add(tp.id)
      } else {
        // Partners default to par but are NOT marked as touched
        initial[tp.id] = hole.par
      }
    }

    // Load existing stats for current player
    const existingScore = data.roundScores.find(
      s => s.hole_id === hole.id && s.trip_player_id === currentTripPlayerId
    )
    setHoleStats({
      [currentTripPlayerId]: {
        fairway_hit: existingScore?.fairway_hit ?? null,
        gir: existingScore?.gir ?? null,
        putts: existingScore?.putts ?? null,
      }
    })

    setHoleScores(initial)
    setTouchedPlayers(initialTouched)
    setActiveHole(holeNumber)
  }

  function adjustScore(tripPlayerId: string, delta: number) {
    if (navigator.vibrate) navigator.vibrate(10)
    setTouchedPlayers(prev => new Set(prev).add(tripPlayerId))
    setHoleScores(prev => {
      const current = prev[tripPlayerId] ?? 4
      const next = Math.max(1, Math.min(20, current + delta))
      return { ...prev, [tripPlayerId]: next }
    })
  }

  function setScore(tripPlayerId: string, value: number) {
    if (navigator.vibrate) navigator.vibrate(10)
    setTouchedPlayers(prev => new Set(prev).add(tripPlayerId))
    setHoleScores(prev => ({ ...prev, [tripPlayerId]: value }))
  }

  function updateStats(stats: { fairway_hit?: boolean | null; gir?: boolean | null; putts?: number | null }) {
    if (!currentTripPlayerId) return
    setHoleStats(prev => ({
      ...prev,
      [currentTripPlayerId]: { ...prev[currentTripPlayerId], ...stats },
    }))
  }

  async function submitHoleScores() {
    if (navigator.vibrate) navigator.vibrate([20, 50, 20])
    if (!data || activeHole === null || !currentTripPlayerId) return
    const hole = holes.find(h => h.hole_number === activeHole)
    if (!hole) return

    // Build scores array — only include own score and partners whose scores were explicitly touched
    const scoresToSubmit = Object.entries(holeScores)
      .filter(([tpId]) => touchedPlayers.has(tpId))
      .map(([trip_player_id, gross_score]) => {
        const entry: Record<string, unknown> = { trip_player_id, gross_score }
        // Attach stats for own player
        if (trip_player_id === currentTripPlayerId) {
          const stats = holeStats[currentTripPlayerId]
          if (stats) {
            if (stats.fairway_hit !== null && stats.fairway_hit !== undefined) entry.fairway_hit = stats.fairway_hit
            if (stats.gir !== null && stats.gir !== undefined) entry.gir = stats.gir
            if (stats.putts !== null && stats.putts !== undefined) entry.putts = stats.putts
          }
        }
        return entry
      })

    // Optimistic update
    const optimisticScores: RoundScore[] = scoresToSubmit.map(s => ({
      id: `optimistic-${s.trip_player_id}-${hole.id}`,
      course_id: courseId,
      trip_player_id: s.trip_player_id as string,
      hole_id: hole.id,
      gross_score: s.gross_score as number,
      entered_by: null,
      fairway_hit: (s.fairway_hit as boolean) ?? null,
      gir: (s.gir as boolean) ?? null,
      putts: (s.putts as number) ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))

    setData(prev => {
      if (!prev) return prev
      const otherScores = prev.roundScores.filter(s => {
        const isThisHole = s.hole_id === hole.id
        const isSubmitted = scoresToSubmit.some(sub => sub.trip_player_id === s.trip_player_id)
        return !(isThisHole && isSubmitted)
      })
      return { ...prev, roundScores: [...otherScores, ...optimisticScores] }
    })

    // Auto-advance
    const currentHole = activeHole
    setActiveHole(null)
    setTimeout(() => {
      const updatedCompleted = new Set(completedHoles)
      updatedCompleted.add(currentHole)
      for (const h of holes) {
        if (!updatedCompleted.has(h.hole_number)) {
          openHole(h.hole_number)
          return
        }
      }
    }, 100)

    // Save in background
    setSaving(true)
    try {
      const res = await fetch(`/api/live/${courseId}/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hole_id: hole.id, scores: scoresToSubmit }),
      })

      if (res.ok) {
        const result = await res.json()
        setData(prev => {
          if (!prev) return prev
          return { ...prev, roundScores: result.roundScores }
        })
        posthog.capture('score_saved', { hole_number: currentHole, course_id: courseId })

        // Check if all holes are now scored
        const updatedCompleted = new Set(completedHoles)
        updatedCompleted.add(currentHole)
        if (updatedCompleted.size === holes.length && holes.length > 0) {
          posthog.capture('round_completed', { course_id: courseId, total_holes: holes.length })
        }
      } else {
        // Revert optimistic
        setData(prev => {
          if (!prev) return prev
          const reverted = prev.roundScores.filter(s => !s.id.startsWith('optimistic-'))
          return { ...prev, roundScores: reverted }
        })
        posthog.capture('score_save_failed', { hole_number: currentHole, type: 'api_error' })
        setError('Failed to save. Tap the hole to retry.')
      }
    } catch {
      posthog.capture('score_save_failed', { hole_number: currentHole, type: 'network_error' })
      setError('Connection lost. Score saved locally.')
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

  // Build side bet hits with names
  const enrichedHits = useMemo(() => {
    if (!data) return []
    return data.sideBetHits.map(hit => ({
      ...hit,
      playerName: playerNameMap.get(hit.trip_player_id) || 'Player',
      holeNumber: holes.find(h => h.id === hit.hole_id)?.hole_number,
    }))
  }, [data, playerNameMap, holes])

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

  const activeHoleData = activeHole
    ? holes.find(h => h.hole_number === activeHole)
    : null

  const ownPlayerName = playerNameMap.get(currentTripPlayerId) || 'You'


  const partners = data.tripPlayers
    .filter(tp => tp.id !== currentTripPlayerId)
    .map(tp => ({
      tripPlayerId: tp.id,
      name: getPlayerName(tp),
      strokes: playerStrokesMap.get(tp.id)?.get(activeHoleData?.hole_number ?? 0) ?? 0,
      score: holeScores[tp.id] ?? (activeHoleData?.par ?? 4),
      touched: touchedPlayers.has(tp.id),
    }))

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
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStatsEnabled(!statsEnabled)}
              className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                statsEnabled
                  ? 'bg-golf-500 text-white'
                  : 'border border-golf-600 text-golf-300 hover:bg-golf-700'
              }`}
            >
              {statsEnabled ? 'Stats ON' : 'Stats'}
            </button>
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

      {/* Active hole entry */}
      {activeHole !== null && activeHoleData && (
        <HoleView
          hole={activeHoleData}
          holes={holes}
          completedHoles={completedHoles}
          ownTripPlayerId={currentTripPlayerId}
          ownPlayerName={ownPlayerName}
          ownStrokes={playerStrokesMap.get(currentTripPlayerId)?.get(activeHoleData.hole_number) ?? 0}
          ownScore={holeScores[currentTripPlayerId] ?? activeHoleData.par}
          partners={partners}
          playerTee={currentPlayerTee}
          saving={saving}
          onAdjustScore={adjustScore}
          onSetScore={setScore}
          onSubmit={submitHoleScores}
          onNavigate={openHole}
          onClose={() => setActiveHole(null)}
          fairwayHit={holeStats[currentTripPlayerId]?.fairway_hit}
          girHit={holeStats[currentTripPlayerId]?.gir}
          puttsCount={holeStats[currentTripPlayerId]?.putts}
          onStatsChange={updateStats}
          statsEnabled={statsEnabled}
        />
      )}

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

        {/* Scorecard table */}
        <div className="-mx-4 overflow-x-auto">
          <table className="min-w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="sticky left-0 z-10 bg-gray-100 w-9 px-1 py-1.5 text-center font-semibold text-gray-600 border-b border-gray-200">Hole</th>
                <th className="sticky left-9 z-10 bg-gray-100 w-9 px-1 py-1.5 text-center font-semibold text-gray-600 border-b border-l border-gray-200">Par</th>
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
                    <th key={tp.id} className="px-1 py-1.5 text-center font-semibold text-gray-600 border-b border-l border-gray-200">
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
                    onClick={() => openHole(hole.hole_number)}
                    className="cursor-pointer hover:bg-gray-50 active:bg-gray-100 border-b border-gray-100"
                  >
                    <td className="sticky left-0 z-10 bg-white w-9 px-1 py-1.5 text-center font-medium text-gray-700">{hole.hole_number}</td>
                    <td className="sticky left-9 z-10 bg-white w-9 px-1 py-1.5 text-center text-gray-500 border-l border-gray-200">{hole.par}</td>
                    {data.tripPlayers.map(tp => {
                      const score = data.roundScores.find(s => s.hole_id === hole.id && s.trip_player_id === tp.id)
                      const gross = score?.gross_score
                      const strokes = playerStrokesMap.get(tp.id)?.get(hole.hole_number) ?? 0
                      const bg = gross !== undefined && gross >= hole.par + 2 ? 'bg-yellow-100' : strokes > 0 ? 'bg-yellow-50' : ''
                      const text = gross !== undefined && gross < hole.par ? 'text-red-600 font-semibold' : ''
                      return (
                        <td key={tp.id} className={`px-1 py-1.5 text-center border-l border-gray-200 ${bg} ${text}`}>{gross ?? ''}</td>
                      )
                    })}
                  </tr>
                ))

                const parSum = nineHoles.reduce((s, h) => s + h.par, 0)
                const subtotalRow = (
                  <tr key={`${nine.label}-sub`} className="border-b-2 border-gray-300 bg-gray-50 font-bold">
                    <td className="sticky left-0 z-10 bg-gray-50 px-1 py-1.5 text-center text-gray-700">{nine.label}</td>
                    <td className="sticky left-9 z-10 bg-gray-50 px-1 py-1.5 text-center text-gray-600 border-l border-gray-200">{parSum}</td>
                    {data.tripPlayers.map(tp => {
                      let grossSum = 0
                      const allScored = nineHoles.every(h => {
                        const s = data.roundScores.find(sc => sc.hole_id === h.id && sc.trip_player_id === tp.id)
                        if (s) grossSum += s.gross_score
                        return !!s
                      })
                      return (
                        <td key={tp.id} className="px-1 py-1.5 text-center border-l border-gray-200">{allScored ? grossSum : ''}</td>
                      )
                    })}
                  </tr>
                )

                return [...holeRows, subtotalRow]
              })}
              {/* Total row */}
              {holes.length > 0 && (
                <tr className="bg-gray-100 font-bold">
                  <td className="sticky left-0 z-10 bg-gray-100 px-1 py-1.5 text-center text-gray-700">Total</td>
                  <td className="sticky left-9 z-10 bg-gray-100 px-1 py-1.5 text-center text-gray-600 border-l border-gray-200">{holes.reduce((s, h) => s + h.par, 0)}</td>
                  {data.tripPlayers.map(tp => {
                    let grossSum = 0
                    const allScored = holes.every(h => {
                      const s = data.roundScores.find(sc => sc.hole_id === h.id && sc.trip_player_id === tp.id)
                      if (s) grossSum += s.gross_score
                      return !!s
                    })
                    return (
                      <td key={tp.id} className="px-1 py-1.5 text-center border-l border-gray-200">{allScored ? grossSum : ''}</td>
                    )
                  })}
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Quick start button */}
        {nextUnscoredHole && activeHole === null && (
          <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white p-4 shadow-lg z-10">
            <div className="mx-auto max-w-lg">
              <button
                onClick={() => openHole(nextUnscoredHole)}
                className="w-full rounded-xl bg-golf-700 py-4 text-lg font-bold text-white shadow-lg active:bg-golf-800"
              >
                Score Hole {nextUnscoredHole}
              </button>
            </div>
          </div>
        )}

        {/* All holes done */}
        {nextUnscoredHole === null && holes.length > 0 && activeHole === null && (
          <div className="rounded-xl bg-golf-100 p-6 text-center">
            <p className="text-lg font-bold text-golf-800">All holes scored!</p>
            <p className="mt-1 text-sm text-golf-600">Tap any hole to edit scores.</p>
          </div>
        )}

        {/* Spacer for fixed bottom button */}
        {nextUnscoredHole && <div className="h-24" />}
      </div>
    </div>
  )
}
