'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import posthog from 'posthog-js'

interface CourseResult {
  id: number
  club_name: string
  course_name: string
  location: {
    city: string
    state: string
    latitude?: number
    longitude?: number
  }
}

interface PlayerSlot {
  name: string
  handicap: string
}

interface GameFormat {
  id: string
  name: string
  description: string
  icon: string
  min_players: number
  max_players: number
  team_based: boolean
}

export default function QuickRoundClient({ userName, gameFormats }: { userName: string; gameFormats: GameFormat[] }) {
  const router = useRouter()

  // Course search state
  const [courseQuery, setCourseQuery] = useState('')
  const [courseResults, setCourseResults] = useState<CourseResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<CourseResult | null>(null)
  const [manualCourse, setManualCourse] = useState('')
  const [useManual, setUseManual] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  // Player state
  const [players, setPlayers] = useState<PlayerSlot[]>([
    { name: userName, handicap: '' },
  ])

  // Game selection state: gameId -> buy-in amount
  const [selectedGames, setSelectedGames] = useState<Map<string, number>>(new Map())

  // Submit state
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Debounced search
  const searchTimeoutRef = useState<NodeJS.Timeout | null>(null)

  const searchCourses = useCallback(
    async (query: string) => {
      if (query.length < 3) {
        setCourseResults([])
        return
      }
      setSearching(true)
      setHasSearched(true)
      try {
        const res = await fetch(`/api/courses/search?q=${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          setCourseResults(Array.isArray(data) ? data : data.courses || [])
        }
      } catch {
        // Silently fail — user can use manual entry
      } finally {
        setSearching(false)
      }
    },
    []
  )

  function handleCourseInput(value: string) {
    setCourseQuery(value)
    setSelectedCourse(null)
    setUseManual(false)

    if (searchTimeoutRef[0]) clearTimeout(searchTimeoutRef[0])
    const timeout = setTimeout(() => searchCourses(value), 400)
    searchTimeoutRef[0] = timeout
  }

  function selectCourse(course: CourseResult) {
    setSelectedCourse(course)
    setCourseQuery(course.course_name || course.club_name)
    setCourseResults([])
    setUseManual(false)
    posthog.capture('course_selected', { course_name: course.course_name || course.club_name, source: 'search' })
  }

  function useManualCourse() {
    setUseManual(true)
    setManualCourse(courseQuery)
    setCourseResults([])
    setSelectedCourse(null)
    posthog.capture('course_selected', { course_name: courseQuery, source: 'manual' })
  }

  function addPlayer() {
    if (players.length >= 4) return
    setPlayers([...players, { name: '', handicap: '' }])
    posthog.capture('player_added', { player_count: players.length + 1 })
  }

  function removePlayer(index: number) {
    if (players.length <= 1) return
    setPlayers(players.filter((_, i) => i !== index))
  }

  function updatePlayer(index: number, field: keyof PlayerSlot, value: string) {
    const updated = [...players]
    updated[index] = { ...updated[index], [field]: value }
    setPlayers(updated)
  }

  const availableGames = gameFormats.filter(
    g => players.length >= g.min_players && players.length <= g.max_players
  )

  function toggleGame(id: string) {
    setSelectedGames(prev => {
      const next = new Map(prev)
      if (next.has(id)) next.delete(id)
      else next.set(id, 0)
      return next
    })
  }

  function setGameBuyIn(id: string, amount: number) {
    setSelectedGames(prev => {
      const next = new Map(prev)
      next.set(id, amount)
      return next
    })
  }

  const courseName = selectedCourse
    ? selectedCourse.course_name || selectedCourse.club_name
    : useManual
      ? manualCourse
      : ''

  const canSubmit =
    courseName.trim().length > 0 &&
    players.every(p => p.name.trim().length > 0) &&
    !submitting

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/quick-round', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseName: courseName.trim(),
          courseApiId: selectedCourse?.id || null,
          latitude: selectedCourse?.location?.latitude || null,
          longitude: selectedCourse?.location?.longitude || null,
          players: players.map(p => ({
            name: p.name.trim(),
            handicap: p.handicap ? parseFloat(p.handicap) : null,
          })),
          games: Array.from(selectedGames.entries()).map(([id, buyIn]) => ({
            formatId: id,
            buyIn,
          })),
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to create round')
      }

      const { tripId, courseId } = await res.json()
      posthog.capture('quick_round_started', {
        course_name: courseName.trim(),
        player_count: players.length,
        game_count: selectedGames.size,
        used_api_course: !!selectedCourse,
      })
      router.push(`/trip/${tripId}/live/${courseId}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      posthog.capture('quick_round_error', { error: msg })
      setError(msg)
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-golf-800 px-4 py-4 text-white shadow-md">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Quick Round</h1>
            <p className="text-sm text-golf-200">Start scoring in seconds</p>
          </div>
          <Link
            href="/home"
            className="rounded-md border border-golf-600 px-3 py-1.5 text-xs font-medium text-golf-200 hover:bg-golf-700"
          >
            Cancel
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-6 space-y-6">
        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
            <button onClick={() => setError(null)} className="ml-2 font-bold">
              x
            </button>
          </div>
        )}

        {/* Course Selection */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-bold text-gray-900">Course</h2>

          {selectedCourse ? (
            <div className="flex items-center justify-between rounded-lg border-2 border-golf-500 bg-golf-50 p-3">
              <div>
                <p className="font-semibold text-gray-900">
                  {selectedCourse.course_name || selectedCourse.club_name}
                </p>
                <p className="text-sm text-gray-500">
                  {selectedCourse.location?.city}, {selectedCourse.location?.state}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedCourse(null)
                  setCourseQuery('')
                }}
                className="text-sm font-medium text-golf-700 hover:text-golf-900"
              >
                Change
              </button>
            </div>
          ) : useManual ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-lg border-2 border-golf-500 bg-golf-50 p-3">
                <input
                  type="text"
                  value={manualCourse}
                  onChange={e => setManualCourse(e.target.value)}
                  className="w-full bg-transparent font-semibold text-gray-900 outline-none"
                  placeholder="Course name"
                />
                <button
                  onClick={() => {
                    setUseManual(false)
                    setManualCourse('')
                    setCourseQuery('')
                  }}
                  className="ml-3 text-sm font-medium text-golf-700 hover:text-golf-900"
                >
                  Change
                </button>
              </div>
              <p className="text-xs text-gray-400">
                Using generic par-72 layout. You can still score all 18 holes.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <input
                  type="text"
                  value={courseQuery}
                  onChange={e => handleCourseInput(e.target.value)}
                  placeholder="Search for a course..."
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
                />
                {searching && (
                  <div className="absolute right-3 top-3.5">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-golf-600 border-t-transparent" />
                  </div>
                )}
              </div>

              {/* Search results */}
              {courseResults.length > 0 && (
                <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                  {courseResults.map(course => (
                    <button
                      key={course.id}
                      onClick={() => selectCourse(course)}
                      className="w-full border-b border-gray-100 px-4 py-3 text-left last:border-0 hover:bg-golf-50"
                    >
                      <p className="font-medium text-gray-900">
                        {course.course_name || course.club_name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {course.location?.city}, {course.location?.state}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              {/* Manual fallback */}
              {hasSearched && !searching && courseQuery.length >= 3 && courseResults.length === 0 && (
                <button
                  onClick={useManualCourse}
                  className="w-full rounded-lg border border-dashed border-gray-300 px-4 py-3 text-left text-sm text-gray-600 hover:border-golf-400 hover:bg-golf-50"
                >
                  Course not found? Use &ldquo;{courseQuery}&rdquo; as course name
                </button>
              )}

              {/* Always show manual option when there are results */}
              {courseResults.length > 0 && courseQuery.length >= 3 && (
                <button
                  onClick={useManualCourse}
                  className="w-full text-center text-xs text-gray-400 hover:text-golf-600"
                >
                  Or use &ldquo;{courseQuery}&rdquo; as a custom course name
                </button>
              )}
            </div>
          )}
        </div>

        {/* Player Entry */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Players</h2>
            {players.length < 4 && (
              <button
                onClick={addPlayer}
                className="rounded-md bg-golf-100 px-3 py-1.5 text-sm font-medium text-golf-700 hover:bg-golf-200"
              >
                + Add Player
              </button>
            )}
          </div>

          <div className="space-y-3">
            {players.map((player, index) => (
              <div
                key={index}
                className="flex items-center gap-2"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-golf-600 text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <input
                    type="text"
                    value={player.name}
                    onChange={e => updatePlayer(index, 'name', e.target.value)}
                    placeholder="Player name"
                    className="min-w-0 flex-1 bg-transparent text-gray-900 outline-none placeholder-gray-400"
                  />
                  <input
                    type="number"
                    value={player.handicap}
                    onChange={e => updatePlayer(index, 'handicap', e.target.value)}
                    placeholder="Hdcp"
                    className="w-16 bg-transparent text-right text-sm text-gray-600 outline-none placeholder-gray-400"
                    step="0.1"
                  />
                </div>
                {players.length > 1 && (
                  <button
                    onClick={() => removePlayer(index)}
                    className="shrink-0 rounded-md p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>

          {players.length < 4 && (
            <p className="mt-2 text-xs text-gray-400">
              {4 - players.length} more player{4 - players.length !== 1 ? 's' : ''} can be added
            </p>
          )}
        </div>

        {/* Game Selection */}
        {availableGames.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-1 text-lg font-bold text-gray-900">Games</h2>
            <p className="mb-3 text-xs text-gray-400">
              Optional — pick any games for {players.length} player{players.length !== 1 ? 's' : ''}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {availableGames.map(game => {
                const selected = selectedGames.has(game.id)
                return (
                  <div key={game.id} className="flex flex-col">
                    <button
                      onClick={() => toggleGame(game.id)}
                      className={`rounded-lg border px-3 py-3 text-left transition ${
                        selected
                          ? 'border-golf-500 bg-golf-50 ring-1 ring-golf-500'
                          : 'border-gray-200 hover:border-golf-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{game.icon}</span>
                        <span className={`text-sm font-medium ${selected ? 'text-golf-800' : 'text-gray-900'}`}>
                          {game.name}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500 line-clamp-2">{game.description}</p>
                    </button>
                    {selected && (
                      <div className="mt-1 flex items-center gap-1 px-1">
                        <span className="text-xs text-gray-500">$</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={selectedGames.get(game.id) || ''}
                          onChange={e => setGameBuyIn(game.id, parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="w-16 rounded border border-gray-200 px-2 py-1 text-xs text-gray-700 outline-none focus:border-golf-500"
                        />
                        <span className="text-xs text-gray-400">buy-in</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Tee Off Button */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`w-full rounded-xl py-4 text-lg font-bold shadow-lg transition-all ${
            canSubmit
              ? 'bg-golf-700 text-white active:bg-golf-800'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Setting up round...
            </span>
          ) : (
            'Tee Off'
          )}
        </button>
      </div>
    </div>
  )
}
