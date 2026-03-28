'use client'

import { useState, useCallback, useEffect } from 'react'
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

interface TeeBox {
  tee_name: string
  course_rating: number
  slope_rating: number
  par_total: number
  total_yards: number
  holes: { par: number; yardage: number; handicap: number }[]
}

interface CourseDetail {
  id: number
  club_name: string
  course_name: string
  location: { city: string; state: string }
  tees: { male: TeeBox[]; female: TeeBox[] }
}

interface PlayerSlot {
  name: string
  handicap: string
  tee: string
  team: 'team_a' | 'team_b' | ''
}

interface Friend {
  userId: string
  displayName: string
  avatarUrl: string | null
  handicap: number | null
  hasActiveRound?: boolean
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

export default function QuickRoundClient({
  userName,
  userHandicap,
  userId,
  gameFormats,
}: {
  userName: string
  userHandicap: number | null
  userId: string
  gameFormats: GameFormat[]
}) {
  const router = useRouter()

  // Course search state
  const [courseQuery, setCourseQuery] = useState('')
  const [courseResults, setCourseResults] = useState<CourseResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<CourseResult | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  // Course detail / tee state
  const [courseDetail, setCourseDetail] = useState<CourseDetail | null>(null)
  const [teeGender, setTeeGender] = useState<'male' | 'female'>('male')
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Player state — use first name only for display
  const [players, setPlayers] = useState<PlayerSlot[]>([
    { name: userName.split(' ')[0] || userName, handicap: userHandicap != null ? String(userHandicap) : '', tee: '', team: '' },
  ])

  // Add-player picker
  const [showAddPicker, setShowAddPicker] = useState(false)
  const [friends, setFriends] = useState<Friend[]>([])
  const [friendsLoaded, setFriendsLoaded] = useState(false)
  const [loadingFriends, setLoadingFriends] = useState(false)

  // Game selection state: gameId -> buy-in amount
  const [selectedGames, setSelectedGames] = useState<Map<string, number>>(new Map())

  // Submit state
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Debounced search
  const searchTimeoutRef = useState<NodeJS.Timeout | null>(null)

  const availableTees = courseDetail?.tees?.[teeGender] || []

  // Load friends when picker opens
  useEffect(() => {
    if (!showAddPicker || friendsLoaded) return
    setLoadingFriends(true)
    fetch(`/api/friends?userId=${userId}&includeActiveRounds=true`)
      .then(r => r.ok ? r.json() : { friends: [] })
      .then(data => { setFriends(data.friends || []); setFriendsLoaded(true) })
      .catch(() => setFriendsLoaded(true))
      .finally(() => setLoadingFriends(false))
  }, [showAddPicker, friendsLoaded, userId])

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
    setCourseDetail(null)

    if (searchTimeoutRef[0]) clearTimeout(searchTimeoutRef[0])
    const timeout = setTimeout(() => searchCourses(value), 400)
    searchTimeoutRef[0] = timeout
  }

  async function selectCourse(course: CourseResult) {
    setSelectedCourse(course)
    setCourseQuery(course.course_name || course.club_name)
    setCourseResults([])
    setCourseDetail(null)
    setLoadingDetail(true)
    posthog.capture('course_selected', { course_name: course.course_name || course.club_name, source: 'search' })
    try {
      const res = await fetch(`/api/courses/lookup?id=${course.id}`)
      if (res.ok) {
        const detail: CourseDetail = await res.json()
        setCourseDetail(detail)
        const firstTee = detail.tees?.male?.[0]?.tee_name || ''
        setPlayers(prev => prev.map(p => ({ ...p, tee: firstTee })))
      }
    } finally {
      setLoadingDetail(false)
    }
  }

  function openAddPicker() {
    if (players.length >= 4) return
    setShowAddPicker(true)
  }

  function addFriendPlayer(friend: Friend) {
    setShowAddPicker(false)
    setPlayers(prev => [
      ...prev,
      {
        name: friend.displayName.split(' ')[0] || friend.displayName,
        handicap: friend.handicap != null ? String(friend.handicap) : '',
        tee: availableTees[0]?.tee_name || '',
        team: '',
      },
    ])
    posthog.capture('player_added', { player_count: players.length + 1, source: 'friend' })
  }

  function addManualPlayer() {
    setShowAddPicker(false)
    setPlayers(prev => [...prev, { name: '', handicap: '', tee: availableTees[0]?.tee_name || '', team: '' }])
    posthog.capture('player_added', { player_count: players.length + 1, source: 'manual' })
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

  const hasTeamGame = availableGames.some(g => selectedGames.has(g.id) && g.team_based)

  const teamACount = players.filter(p => p.team === 'team_a').length
  const teamBCount = players.filter(p => p.team === 'team_b').length

  const teamsValid = !hasTeamGame || (
    players.every(p => p.team === 'team_a' || p.team === 'team_b') &&
    players.some(p => p.team === 'team_a') &&
    players.some(p => p.team === 'team_b') &&
    teamACount <= 2 &&
    teamBCount <= 2
  )

  const teamAPlayers = players.filter(p => p.team === 'team_a').map(p => p.name || '?')
  const teamBPlayers = players.filter(p => p.team === 'team_b').map(p => p.name || '?')
  const teamALabel = teamAPlayers.length ? teamAPlayers.join(' & ') : 'Team A'
  const teamBLabel = teamBPlayers.length ? teamBPlayers.join(' & ') : 'Team B'

  // Games are gated behind all players having name + handicap (and tee if course loaded)
  const playersReady = players.every(p =>
    p.name.trim() !== '' &&
    p.handicap.trim() !== '' &&
    (availableTees.length === 0 || p.tee !== '')
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
    : ''

  const canSubmit =
    !!selectedCourse &&
    players.every(p => p.name.trim().length > 0) &&
    teamsValid &&
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
            teeName: p.tee || null,
            team: p.team || null,
          })),
          games: Array.from(selectedGames.entries()).map(([id, buyIn]) => {
            const fmt = gameFormats.find(g => g.id === id)
            return {
              formatId: id,
              buyIn,
              team_based: fmt?.team_based ?? false,
            }
          }),
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

  // Friends already assigned as players (to avoid duplicates in picker)
  const addedFriendIds = new Set(
    players.flatMap(p => friends.filter(f => f.displayName === p.name).map(f => f.userId))
  )

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <header className="bg-golf-800 px-4 py-4 text-white shadow-md">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Quick Round</h1>
            <p className="text-sm text-golf-200">Start scoring in seconds</p>
          </div>
          <Link
            href="/"
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
            <button onClick={() => setError(null)} className="ml-2 font-bold">×</button>
          </div>
        )}

        {/* Course Selection */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-bold text-gray-900">Course</h2>

          {selectedCourse ? (
            <div>
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
                  onClick={() => { setSelectedCourse(null); setCourseDetail(null); setCourseQuery('') }}
                  className="text-sm font-medium text-golf-700 hover:text-golf-900"
                >
                  Change
                </button>
              </div>

              {loadingDetail && (
                <p className="mt-2 text-xs text-gray-400">Loading tee data...</p>
              )}

              {courseDetail && (
                <div className="mt-3 space-y-2">
                  {(courseDetail.tees?.female?.length ?? 0) > 0 && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setTeeGender('male')}
                        className={`rounded-md px-3 py-1 text-xs font-medium ${teeGender === 'male' ? 'bg-golf-700 text-white' : 'border border-gray-300 bg-white text-gray-700'}`}
                      >
                        Men&apos;s Tees
                      </button>
                      <button
                        onClick={() => setTeeGender('female')}
                        className={`rounded-md px-3 py-1 text-xs font-medium ${teeGender === 'female' ? 'bg-golf-700 text-white' : 'border border-gray-300 bg-white text-gray-700'}`}
                      >
                        Women&apos;s Tees
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    {availableTees.map(tee => {
                      const allOnTee = players.length > 0 && players.every(p => p.tee === tee.tee_name)
                      return (
                        <button
                          key={tee.tee_name}
                          onClick={() => setPlayers(prev => prev.map(p => ({ ...p, tee: tee.tee_name })))}
                          className={`rounded-md p-2 text-left text-xs transition ${
                            allOnTee
                              ? 'border-2 border-golf-800 bg-golf-50'
                              : 'border border-gray-200 bg-white hover:border-golf-300 hover:bg-golf-50'
                          }`}
                        >
                          <p className="font-semibold text-gray-900">{tee.tee_name}</p>
                          <p className="text-gray-600">Slope {tee.slope_rating} · Rating {tee.course_rating}</p>
                          <p className="text-gray-600">{tee.total_yards?.toLocaleString()} yds · Par {tee.par_total}</p>
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-xs text-gray-400">
                    Tap a tee to apply to all players. Change individually below.
                  </p>
                </div>
              )}
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

              {courseResults.length > 0 && (
                <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                  {courseResults.map(course => (
                    <button
                      key={course.id}
                      onClick={() => selectCourse(course)}
                      className="w-full border-b border-gray-100 px-4 py-3 text-left last:border-0 hover:bg-golf-50"
                    >
                      <p className="font-medium text-gray-900">{course.course_name || course.club_name}</p>
                      <p className="text-sm text-gray-500">{course.location?.city}, {course.location?.state}</p>
                    </button>
                  ))}
                </div>
              )}

              {hasSearched && !searching && courseQuery.length >= 3 && courseResults.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-3">
                  No courses found. Try a different search.
                </p>
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
                onClick={openAddPicker}
                className="rounded-md bg-golf-100 px-3 py-1.5 text-sm font-medium text-golf-700 hover:bg-golf-200"
              >
                + Add Player
              </button>
            )}
          </div>

          <div className="space-y-3">
            {players.map((player, index) => (
              <div key={index} className="flex items-center gap-2">
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
                  {availableTees.length > 0 && (
                    <select
                      value={player.tee}
                      onChange={e => updatePlayer(index, 'tee', e.target.value)}
                      className="w-20 bg-transparent text-xs text-gray-600 outline-none"
                    >
                      {availableTees.map(t => (
                        <option key={t.tee_name} value={t.tee_name}>{t.tee_name}</option>
                      ))}
                    </select>
                  )}
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

        {/* Game Selection — gated until all player details are filled */}
        {availableGames.length > 0 && (
          <div className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm ${!playersReady ? 'opacity-60' : ''}`}>
            <h2 className="mb-1 text-lg font-bold text-gray-900">Games</h2>

            {!playersReady ? (
              <p className="text-xs text-gray-500">
                Enter each player&apos;s{availableTees.length > 0 ? ' handicap and tee' : ' handicap'} above to unlock game options.
              </p>
            ) : (
              <>
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
                          <div className="mt-1 space-y-1 px-1">
                            <div className="flex items-center gap-1">
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
                            <p className="text-xs text-gray-500 truncate">
                              {players.filter(p => p.name).map(p => p.name).join(' · ')}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Team assignment — shown when a team-based game is selected */}
                {hasTeamGame && (
                  <div className="mt-5 border-t border-gray-100 pt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-800">Teams</p>
                      <p className="text-xs text-gray-400">2v2 Best Ball: max 2 per team</p>
                    </div>

                    {/* Two-column roster */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Team A */}
                      <div className="rounded-xl border-2 border-golf-800 p-3 min-h-[80px]">
                        <p className="text-xs font-bold text-golf-800 mb-2 truncate">{teamALabel}</p>
                        {players.map((p, idx) => p.team === 'team_a' && (
                          <div key={idx} className="flex items-center justify-between py-0.5">
                            <span className="text-sm text-gray-800 font-medium truncate">{p.name || `Player ${idx + 1}`}</span>
                            <button
                              onClick={() => updatePlayer(idx, 'team', '')}
                              className="ml-1 shrink-0 text-gray-400 hover:text-red-400 text-xs leading-none"
                            >✕</button>
                          </div>
                        ))}
                        {teamACount === 0 && (
                          <p className="text-xs text-gray-400 italic">No players</p>
                        )}
                        {teamACount >= 2 && (
                          <p className="text-xs text-golf-600 font-medium mt-1">Full</p>
                        )}
                      </div>

                      {/* Team B */}
                      <div className="rounded-xl border-2 border-blue-500 p-3 min-h-[80px]">
                        <p className="text-xs font-bold text-blue-800 mb-2 truncate">{teamBLabel}</p>
                        {players.map((p, idx) => p.team === 'team_b' && (
                          <div key={idx} className="flex items-center justify-between py-0.5">
                            <span className="text-sm text-gray-800 font-medium truncate">{p.name || `Player ${idx + 1}`}</span>
                            <button
                              onClick={() => updatePlayer(idx, 'team', '')}
                              className="ml-1 shrink-0 text-gray-400 hover:text-red-400 text-xs leading-none"
                            >✕</button>
                          </div>
                        ))}
                        {teamBCount === 0 && (
                          <p className="text-xs text-gray-400 italic">No players</p>
                        )}
                        {teamBCount >= 2 && (
                          <p className="text-xs text-blue-600 font-medium mt-1">Full</p>
                        )}
                      </div>
                    </div>

                    {/* Unassigned players */}
                    {players.some(p => !p.team) && (
                      <div className="space-y-2">
                        <p className="text-xs text-gray-500">Assign to a team:</p>
                        {players.map((p, idx) => !p.team && (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="flex-1 text-sm font-medium text-gray-800 truncate">
                              {p.name || `Player ${idx + 1}`}
                            </span>
                            <button
                              onClick={() => updatePlayer(idx, 'team', 'team_a')}
                              disabled={teamACount >= 2}
                              className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                                teamACount >= 2
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'bg-golf-100 text-golf-800 hover:bg-golf-200'
                              }`}
                            >
                              Team A
                            </button>
                            <button
                              onClick={() => updatePlayer(idx, 'team', 'team_b')}
                              disabled={teamBCount >= 2}
                              className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                                teamBCount >= 2
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                              }`}
                            >
                              Team B
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {!teamsValid && (
                      <p className="text-xs text-amber-600 font-medium">
                        Assign each player to a team before starting.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
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

      {/* Add Player Picker — bottom sheet */}
      {showAddPicker && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setShowAddPicker(false)}
        >
          <div
            className="w-full max-w-lg rounded-t-2xl bg-white px-5 pt-5 pb-10 max-h-[72vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">Add Player</h3>
              <button
                onClick={() => setShowAddPicker(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >×</button>
            </div>

            {loadingFriends && (
              <div className="flex items-center justify-center py-6">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-golf-600 border-t-transparent" />
              </div>
            )}

            {!loadingFriends && friends.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">From Friends</p>
                <div className="space-y-2">
                  {friends
                    .filter(f => !addedFriendIds.has(f.userId))
                    .map(friend => (
                      <button
                        key={friend.userId}
                        onClick={() => !friend.hasActiveRound && addFriendPlayer(friend)}
                        disabled={friend.hasActiveRound}
                        className={`flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left ${
                          friend.hasActiveRound
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:bg-golf-50'
                        }`}
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-golf-200 overflow-hidden">
                          {friend.avatarUrl ? (
                            <img src={friend.avatarUrl} className="h-9 w-9 object-cover" alt="" />
                          ) : (
                            <span className="text-sm font-bold text-golf-800">
                              {friend.displayName[0]?.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900">{friend.displayName}</p>
                          {friend.hasActiveRound ? (
                            <p className="text-xs text-amber-600">Currently in a round</p>
                          ) : friend.handicap != null ? (
                            <p className="text-xs text-gray-500">Handicap {friend.handicap}</p>
                          ) : null}
                        </div>
                      </button>
                    ))}
                  {friends.every(f => addedFriendIds.has(f.userId)) && (
                    <p className="text-xs text-gray-400 text-center py-2">All friends already added</p>
                  )}
                </div>
              </div>
            )}

            {!loadingFriends && friends.length === 0 && friendsLoaded && (
              <div className="mb-4 rounded-lg bg-gray-50 px-4 py-3 text-xs text-gray-500">
                No friends yet.{' '}
                <Link href="/" className="text-golf-700 underline">Add friends</Link> to quickly add them to rounds.
              </div>
            )}

            <button
              onClick={addManualPlayer}
              className="w-full rounded-lg border border-dashed border-gray-300 py-3 text-sm text-gray-600 hover:border-golf-400 hover:bg-golf-50"
            >
              + Enter player manually
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
