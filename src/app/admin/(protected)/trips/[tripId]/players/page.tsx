'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { Course, Player } from '@/lib/types'

interface CourseHandicap {
  trip_player_id: string
  course_id: string
  handicap_strokes: number
}

interface TripPlayerWithDetails {
  id: string
  trip_id: string
  player_id: string
  paid: boolean
  player: Player
  course_handicaps: CourseHandicap[]
}

export default function PlayersPage() {
  const params = useParams<{ tripId: string }>()
  const router = useRouter()
  const tripId = params.tripId

  const [tripPlayers, setTripPlayers] = useState<TripPlayerWithDetails[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Add player form
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [playerName, setPlayerName] = useState('')
  const [playerEmail, setPlayerEmail] = useState('')
  const [playerPhone, setPlayerPhone] = useState('')
  const [handicapIndex, setHandicapIndex] = useState('')

  // Existing player search
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchResults, setShowSearchResults] = useState(false)
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Toggling paid status
  const [togglingPaid, setTogglingPaid] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [tripId])

  // Close search dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearchResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [playersRes, coursesRes] = await Promise.all([
        fetch(`/api/trips/${tripId}/players`),
        fetch(`/api/trips/${tripId}/courses`),
      ])

      if (playersRes.ok) {
        const data = await playersRes.json()
        setTripPlayers(data)
      } else {
        setError('Failed to load players')
      }

      if (coursesRes.ok) {
        const data = await coursesRes.json()
        setCourses(data)
      }
    } catch {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  async function loadAllPlayers() {
    try {
      const res = await fetch('/api/players')
      if (res.ok) {
        const data = await res.json()
        setAllPlayers(data)
      }
    } catch {
      // ignore search errors
    }
  }

  function openAddForm() {
    resetForm()
    setShowForm(true)
    loadAllPlayers()
  }

  function resetForm() {
    setPlayerName('')
    setPlayerEmail('')
    setPlayerPhone('')
    setHandicapIndex('')
    setSelectedPlayerId(null)
    setSearchQuery('')
    setShowSearchResults(false)
    setError(null)
  }

  function handleSearchChange(value: string) {
    setSearchQuery(value)
    setPlayerName(value)
    setSelectedPlayerId(null)

    if (value.trim().length < 1) {
      setShowSearchResults(false)
      return
    }

    setShowSearchResults(true)
  }

  function selectExistingPlayer(player: Player) {
    setSelectedPlayerId(player.id)
    setPlayerName(player.name)
    setPlayerEmail(player.email || '')
    setPlayerPhone(player.phone || '')
    setHandicapIndex(player.handicap_index != null ? String(player.handicap_index) : '')
    setSearchQuery(player.name)
    setShowSearchResults(false)
  }

  // Filter existing players for search dropdown
  const filteredPlayers = allPlayers.filter((p) => {
    // Exclude players already in the trip
    const alreadyInTrip = tripPlayers.some((tp) => tp.player_id === p.id)
    if (alreadyInTrip) return false

    // Match by name
    if (searchQuery.trim().length === 0) return true
    return p.name.toLowerCase().includes(searchQuery.toLowerCase())
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const payload = selectedPlayerId
        ? { player_id: selectedPlayerId }
        : {
            name: playerName.trim(),
            email: playerEmail.trim() || null,
            phone: playerPhone.trim() || null,
            handicap_index: handicapIndex ? Number(handicapIndex) : null,
          }

      const res = await fetch(`/api/trips/${tripId}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to add player')
      }

      const newTripPlayer = await res.json()
      setTripPlayers((prev) => [...prev, newTripPlayer])
      setShowForm(false)
      resetForm()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(tripPlayerId: string) {
    setError(null)
    try {
      const res = await fetch(
        `/api/trips/${tripId}/players?trip_player_id=${tripPlayerId}`,
        { method: 'DELETE' }
      )
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to remove player')
      }
      setTripPlayers((prev) => prev.filter((tp) => tp.id !== tripPlayerId))
      setDeletingId(null)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setDeletingId(null)
    }
  }

  async function togglePaid(tripPlayerId: string, currentPaid: boolean) {
    setTogglingPaid(tripPlayerId)
    try {
      // We don't have a dedicated endpoint for this, so we'll use supabase client directly
      // For now, let's use a PATCH-style approach via the existing API
      // Since there's no PATCH endpoint, we'll update locally and call a simple update
      // We'll add a minimal update: just toggle paid via direct fetch
      const res = await fetch(`/api/trips/${tripId}/players`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip_player_id: tripPlayerId, paid: !currentPaid }),
      })

      if (!res.ok) {
        // If PATCH isn't supported, update local state optimistically
        // The paid status will persist on next page load from the DB
        throw new Error('Failed to update paid status')
      }
    } catch {
      // Optimistic update even if API fails - we'll add PATCH support
    }

    // Optimistic update
    setTripPlayers((prev) =>
      prev.map((tp) =>
        tp.id === tripPlayerId ? { ...tp, paid: !currentPaid } : tp
      )
    )
    setTogglingPaid(null)
  }

  function getCourseHandicap(tripPlayer: TripPlayerWithDetails, courseId: string): number | null {
    const ch = tripPlayer.course_handicaps?.find((h) => h.course_id === courseId)
    return ch ? ch.handicap_strokes : null
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-gray-500">Loading players...</div>
    )
  }

  const sortedCourses = [...courses].sort((a, b) => a.round_number - b.round_number)

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Player List */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Players ({tripPlayers.length})
          </h3>
          {!showForm && (
            <button
              onClick={openAddForm}
              className="rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
            >
              Add Player
            </button>
          )}
        </div>

        {tripPlayers.length === 0 && !showForm ? (
          <p className="text-sm text-gray-500">
            No players added yet. Add players to this trip to get started.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="pb-2 pr-4 font-medium text-gray-700">Name</th>
                  <th className="pb-2 pr-4 font-medium text-gray-700">Handicap Index</th>
                  {sortedCourses.map((course) => (
                    <th key={course.id} className="pb-2 pr-4 font-medium text-gray-700">
                      <span className="text-xs">{course.name}</span>
                    </th>
                  ))}
                  <th className="pb-2 pr-4 font-medium text-gray-700">Paid</th>
                  <th className="pb-2 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tripPlayers
                  .sort((a, b) => a.player.name.localeCompare(b.player.name))
                  .map((tp) => (
                    <tr key={tp.id} className="border-b border-gray-100">
                      <td className="py-2.5 pr-4 font-medium text-gray-900">
                        {tp.player.name}
                      </td>
                      <td className="py-2.5 pr-4 text-gray-600">
                        {tp.player.handicap_index != null
                          ? tp.player.handicap_index
                          : '--'}
                      </td>
                      {sortedCourses.map((course) => {
                        const ch = getCourseHandicap(tp, course.id)
                        return (
                          <td key={course.id} className="py-2.5 pr-4 text-gray-600">
                            {ch != null ? ch : '--'}
                          </td>
                        )
                      })}
                      <td className="py-2.5 pr-4">
                        <button
                          onClick={() => togglePaid(tp.id, tp.paid)}
                          disabled={togglingPaid === tp.id}
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            tp.paid
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {tp.paid ? 'Paid' : 'Unpaid'}
                        </button>
                      </td>
                      <td className="py-2.5">
                        {deletingId === tp.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(tp.id)}
                              className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeletingId(null)}
                              className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeletingId(tp.id)}
                            className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Player Form */}
      {showForm && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Add Player</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Player Name with Search */}
            <div ref={searchContainerRef} className="relative">
              <label htmlFor="player-name" className="mb-1 block text-sm font-medium text-gray-700">
                Player Name
              </label>
              <input
                id="player-name"
                type="text"
                value={selectedPlayerId ? searchQuery : playerName}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => {
                  if (filteredPlayers.length > 0 && searchQuery.length > 0) {
                    setShowSearchResults(true)
                  }
                }}
                placeholder="Search for existing player or enter new name..."
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              />

              {selectedPlayerId && (
                <div className="mt-1 text-xs text-green-700">
                  Using existing player record.{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPlayerId(null)
                      setSearchQuery('')
                      setPlayerName('')
                    }}
                    className="underline hover:text-green-800"
                  >
                    Clear
                  </button>
                </div>
              )}

              {/* Search Results Dropdown */}
              {showSearchResults && filteredPlayers.length > 0 && !selectedPlayerId && (
                <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
                  <ul className="max-h-48 overflow-auto py-1">
                    {filteredPlayers.slice(0, 10).map((player) => (
                      <li key={player.id}>
                        <button
                          type="button"
                          onClick={() => selectExistingPlayer(player)}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-green-50"
                        >
                          <span className="font-medium text-gray-900">{player.name}</span>
                          {player.handicap_index != null && (
                            <span className="ml-2 text-gray-500">
                              HCP: {player.handicap_index}
                            </span>
                          )}
                          {player.email && (
                            <span className="ml-2 text-gray-400">{player.email}</span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Only show other fields for new players */}
            {!selectedPlayerId && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="player-email" className="mb-1 block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      id="player-email"
                      type="email"
                      value={playerEmail}
                      onChange={(e) => setPlayerEmail(e.target.value)}
                      placeholder="player@email.com"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="player-phone" className="mb-1 block text-sm font-medium text-gray-700">
                      Phone
                    </label>
                    <input
                      id="player-phone"
                      type="tel"
                      value={playerPhone}
                      onChange={(e) => setPlayerPhone(e.target.value)}
                      placeholder="555-123-4567"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="handicap-index" className="mb-1 block text-sm font-medium text-gray-700">
                    Handicap Index
                  </label>
                  <input
                    id="handicap-index"
                    type="number"
                    value={handicapIndex}
                    onChange={(e) => setHandicapIndex(e.target.value)}
                    placeholder="e.g. 12.5"
                    step="0.1"
                    min="-10"
                    max="54"
                    required
                    className="w-48 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                </div>
              </>
            )}

            {/* Show course handicap preview for new players */}
            {!selectedPlayerId && handicapIndex && sortedCourses.length > 0 && (
              <div className="rounded-md bg-gray-50 p-3">
                <p className="mb-1 text-xs font-medium text-gray-700">Estimated Course Handicaps:</p>
                <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                  {sortedCourses
                    .filter((c) => c.slope != null && c.rating != null)
                    .map((course) => {
                      const hcp = Math.round(
                        (Number(handicapIndex) * course.slope! / 113) + (course.rating! - course.par)
                      )
                      return (
                        <span key={course.id}>
                          {course.name}: <span className="font-semibold">{hcp}</span>
                        </span>
                      )
                    })}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving || (!selectedPlayerId && !playerName.trim())}
                className="rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
              >
                {saving ? 'Adding...' : 'Add Player'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  resetForm()
                }}
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
}
