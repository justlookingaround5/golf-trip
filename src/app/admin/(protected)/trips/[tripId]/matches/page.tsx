'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import type { Course, MatchFormat, Player } from '@/lib/types'
import { MATCH_FORMAT_LABELS } from '@/lib/types'

// ---- Local interfaces ----

interface TripPlayerBasic {
  id: string
  trip_id: string
  player_id: string
  paid: boolean
  player: Player
}

interface TeamWithPlayers {
  id: string
  trip_id: string
  name: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  team_players: any[]
}

interface MatchPlayerWithDetails {
  id: string
  match_id: string
  trip_player_id: string
  side: 'team_a' | 'team_b'
  trip_player?: {
    id: string
    player: {
      id: string
      name: string
      handicap_index: number | null
    }
  }
}

interface MatchWithPlayers {
  id: string
  course_id: string
  format: MatchFormat
  point_value: number
  scorer_email: string | null
  scorer_token: string
  status: 'pending' | 'in_progress' | 'completed'
  result: string | null
  winner_side: 'team_a' | 'team_b' | 'tie' | null
  created_at: string
  match_players: MatchPlayerWithDetails[]
}

// ---- Helpers ----

function getPlayersForSide(
  match: MatchWithPlayers,
  side: 'team_a' | 'team_b'
): MatchPlayerWithDetails[] {
  return match.match_players.filter((mp) => mp.side === side)
}

function playerName(mp: MatchPlayerWithDetails): string {
  return mp.trip_player?.player?.name || 'Unknown'
}

function formatSideNames(players: MatchPlayerWithDetails[]): string {
  return players.map(playerName).join(' & ')
}

function getMagicLinkUrl(scorerToken: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/score/${scorerToken}`
  }
  return `/score/${scorerToken}`
}

// How many players per side for a given format
function playersPerSide(format: MatchFormat): number {
  switch (format) {
    case '1v1_stroke':
    case '1v1_match':
      return 1
    case '2v2_best_ball':
    case '2v2_alternate_shot':
      return 2
  }
}

// ---- Component ----

export default function MatchesPage() {
  const params = useParams<{ tripId: string }>()
  const tripId = params.tripId

  const [courses, setCourses] = useState<Course[]>([])
  const [tripPlayers, setTripPlayers] = useState<TripPlayerBasic[]>([])
  const [teams, setTeams] = useState<TeamWithPlayers[]>([])
  const [matchesByCourse, setMatchesByCourse] = useState<
    Record<string, MatchWithPlayers[]>
  >({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create match form - which course is the form open for?
  const [formCourseId, setFormCourseId] = useState<string | null>(null)
  const [format, setFormat] = useState<MatchFormat>('2v2_best_ball')
  const [pointValue, setPointValue] = useState('1')
  const [scorerEmail, setScorerEmail] = useState('')
  const [teamAIds, setTeamAIds] = useState<string[]>([])
  const [teamBIds, setTeamBIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Copied link feedback
  const [copiedMatchId, setCopiedMatchId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [coursesRes, playersRes, teamsRes] = await Promise.all([
        fetch(`/api/trips/${tripId}/courses`),
        fetch(`/api/trips/${tripId}/players`),
        fetch(`/api/trips/${tripId}/teams`),
      ])

      let loadedCourses: Course[] = []
      if (coursesRes.ok) {
        loadedCourses = await coursesRes.json()
        setCourses(loadedCourses)
      } else {
        setError('Failed to load courses')
      }

      if (playersRes.ok) {
        const data = await playersRes.json()
        setTripPlayers(data)
      } else {
        setError('Failed to load players')
      }

      if (teamsRes.ok) {
        const data = await teamsRes.json()
        setTeams(data)
      }

      // Load matches for each course
      if (loadedCourses.length > 0) {
        await loadMatchesForCourses(loadedCourses)
      }
    } catch {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [tripId])

  async function loadMatchesForCourses(courseList: Course[]) {
    const matchMap: Record<string, MatchWithPlayers[]> = {}

    // Initialize empty arrays for each course
    for (const course of courseList) {
      matchMap[course.id] = []
    }

    // Fetch all matches for these courses in a single request
    const courseIds = courseList.map((c) => c.id)
    try {
      const res = await fetch(
        `/api/matches?course_ids=${courseIds.join(',')}`
      )
      if (res.ok) {
        const allMatches: MatchWithPlayers[] = await res.json()
        for (const match of allMatches) {
          if (!matchMap[match.course_id]) {
            matchMap[match.course_id] = []
          }
          matchMap[match.course_id].push(match)
        }
      }
    } catch {
      // Matches will just be empty on fetch failure
    }

    setMatchesByCourse(matchMap)
  }

  useEffect(() => {
    loadData()
  }, [loadData])

  function resetForm() {
    setFormat('2v2_best_ball')
    setPointValue('1')
    setScorerEmail('')
    setTeamAIds([])
    setTeamBIds([])
    setError(null)
  }

  function openForm(courseId: string) {
    resetForm()
    setFormCourseId(courseId)
  }

  function closeForm() {
    setFormCourseId(null)
    resetForm()
  }

  function togglePlayerOnSide(
    side: 'team_a' | 'team_b',
    tripPlayerId: string
  ) {
    const maxPerSide = playersPerSide(format)

    if (side === 'team_a') {
      // Remove from team_b if present
      setTeamBIds((prev) => prev.filter((id) => id !== tripPlayerId))

      setTeamAIds((prev) => {
        if (prev.includes(tripPlayerId)) {
          return prev.filter((id) => id !== tripPlayerId)
        }
        if (prev.length >= maxPerSide) return prev
        return [...prev, tripPlayerId]
      })
    } else {
      // Remove from team_a if present
      setTeamAIds((prev) => prev.filter((id) => id !== tripPlayerId))

      setTeamBIds((prev) => {
        if (prev.includes(tripPlayerId)) {
          return prev.filter((id) => id !== tripPlayerId)
        }
        if (prev.length >= maxPerSide) return prev
        return [...prev, tripPlayerId]
      })
    }
  }

  function getPlayerSide(
    tripPlayerId: string
  ): 'team_a' | 'team_b' | null {
    if (teamAIds.includes(tripPlayerId)) return 'team_a'
    if (teamBIds.includes(tripPlayerId)) return 'team_b'
    return null
  }

  async function handleCreateMatch(e: React.FormEvent) {
    e.preventDefault()
    if (!formCourseId) return

    const maxPerSide = playersPerSide(format)
    if (teamAIds.length !== maxPerSide || teamBIds.length !== maxPerSide) {
      setError(
        `Select exactly ${maxPerSide} player${maxPerSide > 1 ? 's' : ''} for each side`
      )
      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_id: formCourseId,
          format,
          point_value: Number(pointValue) || 1,
          scorer_email: scorerEmail.trim() || null,
          team_a_player_ids: teamAIds,
          team_b_player_ids: teamBIds,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create match')
      }

      const newMatch: MatchWithPlayers = await res.json()

      setMatchesByCourse((prev) => ({
        ...prev,
        [formCourseId]: [...(prev[formCourseId] || []), newMatch],
      }))

      closeForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteMatch(matchId: string, courseId: string) {
    setError(null)
    try {
      const res = await fetch(`/api/matches/${matchId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete match')
      }

      setMatchesByCourse((prev) => ({
        ...prev,
        [courseId]: (prev[courseId] || []).filter((m) => m.id !== matchId),
      }))
      setDeletingId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setDeletingId(null)
    }
  }

  function handleCopyLink(match: MatchWithPlayers) {
    const url = getMagicLinkUrl(match.scorer_token)
    navigator.clipboard.writeText(url).then(() => {
      setCopiedMatchId(match.id)
      setTimeout(() => setCopiedMatchId(null), 2000)
    })
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-gray-500">
        Loading matches...
      </div>
    )
  }

  const sortedCourses = [...courses].sort(
    (a, b) => a.round_number - b.round_number
  )

  if (courses.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-500">
          No courses added yet. Add courses first before configuring matches.
        </p>
      </div>
    )
  }

  if (tripPlayers.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-500">
          No players added yet. Add players first before configuring matches.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {sortedCourses.map((course) => {
        const courseMatches = matchesByCourse[course.id] || []
        const isFormOpen = formCourseId === course.id

        return (
          <div
            key={course.id}
            className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
          >
            {/* Course Header */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-golf-100 text-sm font-bold text-golf-800">
                  R{course.round_number}
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {course.name}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Par {course.par}
                    {course.round_date && (
                      <>
                        {' '}
                        &middot;{' '}
                        {new Date(
                          course.round_date + 'T00:00:00'
                        ).toLocaleDateString()}
                      </>
                    )}
                    {' '}&middot;{' '}
                    {courseMatches.length} match
                    {courseMatches.length !== 1 ? 'es' : ''}
                  </p>
                </div>
              </div>
              {!isFormOpen && (
                <button
                  onClick={() => openForm(course.id)}
                  className="rounded-md bg-golf-700 px-4 py-2 text-sm font-medium text-white hover:bg-golf-800"
                >
                  Create Match
                </button>
              )}
            </div>

            {/* Existing Matches */}
            {courseMatches.length > 0 && (
              <div className="mb-4 space-y-3">
                {courseMatches.map((match) => {
                  const teamA = getPlayersForSide(match, 'team_a')
                  const teamB = getPlayersForSide(match, 'team_b')
                  const magicLink = getMagicLinkUrl(match.scorer_token)

                  return (
                    <div
                      key={match.id}
                      className="rounded-md border border-gray-200 bg-gray-50 p-4"
                    >
                      <div className="mb-2 flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-golf-100 px-2.5 py-0.5 text-xs font-medium text-golf-800">
                              {MATCH_FORMAT_LABELS[match.format]}
                            </span>
                            <span className="text-xs text-gray-500">
                              {match.point_value} pt{match.point_value !== 1 ? 's' : ''}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                match.status === 'completed'
                                  ? 'bg-blue-100 text-blue-800'
                                  : match.status === 'in_progress'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {match.status === 'in_progress'
                                ? 'In Progress'
                                : match.status === 'completed'
                                  ? 'Completed'
                                  : 'Pending'}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center gap-2 text-sm">
                            <span className="font-medium text-gray-900">
                              {formatSideNames(teamA)}
                            </span>
                            <span className="text-gray-400">vs</span>
                            <span className="font-medium text-gray-900">
                              {formatSideNames(teamB)}
                            </span>
                          </div>
                          {match.winner_side && (
                            <p className="mt-1 text-xs text-golf-700">
                              Winner:{' '}
                              {match.winner_side === 'tie'
                                ? 'Tie'
                                : match.winner_side === 'team_a'
                                  ? formatSideNames(teamA)
                                  : formatSideNames(teamB)}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          {deletingId === match.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() =>
                                  handleDeleteMatch(match.id, course.id)
                                }
                                className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeletingId(null)}
                                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeletingId(match.id)}
                              className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Scorer Info & Magic Link */}
                      <div className="mt-3 rounded-md border border-gray-200 bg-white p-3">
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-gray-500">
                            {match.scorer_email ? (
                              <>
                                Scorer:{' '}
                                <span className="font-medium text-gray-700">
                                  {match.scorer_email}
                                </span>
                              </>
                            ) : (
                              <span className="text-gray-400">
                                No scorer email assigned
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => handleCopyLink(match)}
                            className="rounded-md border border-golf-300 bg-golf-50 px-3 py-1.5 text-xs font-medium text-golf-700 hover:bg-golf-100"
                          >
                            {copiedMatchId === match.id
                              ? 'Copied!'
                              : 'Copy Scorer Link'}
                          </button>
                        </div>
                        <div className="mt-1.5">
                          <code className="block truncate rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">
                            {magicLink}
                          </code>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {courseMatches.length === 0 && !isFormOpen && (
              <p className="mb-4 text-sm text-gray-500">
                No matches configured for this round yet.
              </p>
            )}

            {/* Create Match Form */}
            {isFormOpen && (
              <div className="rounded-md border border-golf-200 bg-golf-50 p-4">
                <h4 className="mb-3 text-sm font-semibold text-gray-900">
                  New Match
                </h4>

                <form onSubmit={handleCreateMatch} className="space-y-4">
                  {/* Format & Point Value */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor={`format-${course.id}`}
                        className="mb-1 block text-sm font-medium text-gray-700"
                      >
                        Format
                      </label>
                      <select
                        id={`format-${course.id}`}
                        value={format}
                        onChange={(e) => {
                          setFormat(e.target.value as MatchFormat)
                          // Reset player selections when format changes
                          setTeamAIds([])
                          setTeamBIds([])
                        }}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
                      >
                        {(
                          Object.entries(MATCH_FORMAT_LABELS) as [
                            MatchFormat,
                            string,
                          ][]
                        ).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor={`points-${course.id}`}
                        className="mb-1 block text-sm font-medium text-gray-700"
                      >
                        Point Value
                      </label>
                      <input
                        id={`points-${course.id}`}
                        type="number"
                        value={pointValue}
                        onChange={(e) => setPointValue(e.target.value)}
                        min="0.5"
                        max="100"
                        step="0.5"
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
                      />
                    </div>
                  </div>

                  {/* Scorer Email */}
                  <div>
                    <label
                      htmlFor={`scorer-${course.id}`}
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      Scorer Email{' '}
                      <span className="text-gray-400">(optional)</span>
                    </label>
                    <input
                      id={`scorer-${course.id}`}
                      type="email"
                      value={scorerEmail}
                      onChange={(e) => setScorerEmail(e.target.value)}
                      placeholder="scorer@email.com"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
                    />
                  </div>

                  {/* Player Selection */}
                  <PlayerSelection
                    tripPlayers={tripPlayers}
                    teams={teams}
                    courseMatches={courseMatches}
                    format={format}
                    teamAIds={teamAIds}
                    teamBIds={teamBIds}
                    getPlayerSide={getPlayerSide}
                    togglePlayerOnSide={togglePlayerOnSide}
                  />

                  {/* Form Actions */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={
                        saving ||
                        teamAIds.length !== playersPerSide(format) ||
                        teamBIds.length !== playersPerSide(format)
                      }
                      className="rounded-md bg-golf-700 px-4 py-2 text-sm font-medium text-white hover:bg-golf-800 disabled:opacity-50"
                    >
                      {saving ? 'Creating...' : 'Create Match'}
                    </button>
                    <button
                      type="button"
                      onClick={closeForm}
                      className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ---- Player Selection Sub-Component ----

function PlayerSelection({
  tripPlayers,
  teams,
  courseMatches,
  format,
  teamAIds,
  teamBIds,
  getPlayerSide,
  togglePlayerOnSide,
}: {
  tripPlayers: TripPlayerBasic[]
  teams: TeamWithPlayers[]
  courseMatches: MatchWithPlayers[]
  format: MatchFormat
  teamAIds: string[]
  teamBIds: string[]
  getPlayerSide: (id: string) => 'team_a' | 'team_b' | null
  togglePlayerOnSide: (side: 'team_a' | 'team_b', id: string) => void
}) {
  const maxPerSide = playersPerSide(format)
  const hasTeams = teams.length >= 2

  // Build map: trip_player_id → team info
  const playerTeamMap = new Map<string, { teamId: string; teamName: string }>()
  for (const team of teams) {
    for (const tp of team.team_players) {
      playerTeamMap.set(tp.trip_player_id, { teamId: team.id, teamName: team.name })
    }
  }

  // Collect trip_player_ids already in matches on this course
  const assignedPlayerIds = new Set<string>()
  for (const match of courseMatches) {
    for (const mp of match.match_players) {
      assignedPlayerIds.add(mp.trip_player_id)
    }
  }

  // When teams exist, lock each side to a specific team.
  // Determine which team is "Side A" and which is "Side B":
  // - If a player is already selected on side A, their team locks to side A
  // - Otherwise default to teams[0] = side A, teams[1] = side B
  let sideATeamId: string | null = null
  let sideBTeamId: string | null = null

  if (hasTeams) {
    // Check if any selected player determines the team mapping
    for (const id of teamAIds) {
      const t = playerTeamMap.get(id)
      if (t) { sideATeamId = t.teamId; break }
    }
    for (const id of teamBIds) {
      const t = playerTeamMap.get(id)
      if (t) { sideBTeamId = t.teamId; break }
    }

    // Default: first team → side A, second team → side B
    if (!sideATeamId && !sideBTeamId) {
      sideATeamId = teams[0].id
      sideBTeamId = teams[1].id
    } else if (sideATeamId && !sideBTeamId) {
      sideBTeamId = teams.find(t => t.id !== sideATeamId)?.id ?? null
    } else if (!sideATeamId && sideBTeamId) {
      sideATeamId = teams.find(t => t.id !== sideBTeamId)?.id ?? null
    }
  }

  const sideATeamName = hasTeams ? teams.find(t => t.id === sideATeamId)?.name : null
  const sideBTeamName = hasTeams ? teams.find(t => t.id === sideBTeamId)?.name : null

  // Filter players eligible for each side
  const sortedPlayers = [...tripPlayers].sort((a, b) =>
    a.player.name.localeCompare(b.player.name)
  )

  function isEligibleForSide(tp: TripPlayerBasic, side: 'team_a' | 'team_b'): boolean {
    // Already assigned in another match on this course
    if (assignedPlayerIds.has(tp.id)) return false
    // If teams exist, player must be on the correct team for this side
    if (hasTeams) {
      const playerTeam = playerTeamMap.get(tp.id)
      if (!playerTeam) return false
      if (side === 'team_a' && playerTeam.teamId !== sideATeamId) return false
      if (side === 'team_b' && playerTeam.teamId !== sideBTeamId) return false
    }
    return true
  }

  function renderPlayerButton(
    tp: TripPlayerBasic,
    side: 'team_a' | 'team_b'
  ) {
    const currentSide = getPlayerSide(tp.id)
    const isSelected = currentSide === side
    const isOnOtherSide = currentSide !== null && currentSide !== side
    const isAssigned = assignedPlayerIds.has(tp.id)
    const eligible = isEligibleForSide(tp, side)
    const disabled = isOnOtherSide || (isAssigned && !isSelected) || (!eligible && !isSelected)

    return (
      <button
        key={tp.id}
        type="button"
        onClick={() => togglePlayerOnSide(side, tp.id)}
        className={`flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm ${
          isSelected
            ? 'bg-golf-100 font-medium text-golf-900'
            : isAssigned
              ? 'text-gray-300 line-through'
              : disabled
                ? 'text-gray-300'
                : 'text-gray-700 hover:bg-gray-50'
        }`}
        disabled={disabled}
      >
        <span
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-xs ${
            isSelected
              ? 'border-golf-600 bg-golf-600 text-white'
              : 'border-gray-300'
          }`}
        >
          {isSelected && '\u2713'}
        </span>
        <span className="truncate">{tp.player.name}</span>
        {tp.player.handicap_index != null && (
          <span className="text-xs text-gray-400">
            ({tp.player.handicap_index})
          </span>
        )}
        {isAssigned && !isSelected && (
          <span className="ml-auto text-xs text-gray-400">in match</span>
        )}
      </button>
    )
  }

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        Select Players{' '}
        <span className="text-gray-400">
          ({maxPerSide} per side)
        </span>
      </label>

      {hasTeams && assignedPlayerIds.size > 0 && (
        <p className="mb-2 text-xs text-amber-600">
          Players already in a match for this round are greyed out.
        </p>
      )}
      {hasTeams && (
        <p className="mb-2 text-xs text-gray-500">
          Players are filtered by team. Opponents must be on different teams.
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {/* Side A Column */}
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase text-golf-800">
            {sideATeamName ?? 'Team A'} ({teamAIds.length}/{maxPerSide})
          </p>
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-gray-200 bg-white p-2">
            {sortedPlayers.map((tp) => renderPlayerButton(tp, 'team_a'))}
          </div>
        </div>

        {/* Side B Column */}
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase text-golf-800">
            {sideBTeamName ?? 'Team B'} ({teamBIds.length}/{maxPerSide})
          </p>
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-gray-200 bg-white p-2">
            {sortedPlayers.map((tp) => renderPlayerButton(tp, 'team_b'))}
          </div>
        </div>
      </div>
    </div>
  )
}
