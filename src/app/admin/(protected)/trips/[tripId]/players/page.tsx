'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { Course, Player, TripInvite } from '@/lib/types'

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
  invite?: TripInvite
}

interface SuggestionPlayer {
  id: string
  name: string
  email: string | null
  handicap_index: number | null
  user_id: string | null
}

export default function PlayersPage() {
  const params = useParams<{ tripId: string }>()
  const router = useRouter()
  const tripId = params.tripId

  const [tripPlayers, setTripPlayers] = useState<TripPlayerWithDetails[]>([])
  const [invites, setInvites] = useState<TripInvite[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Add player form
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)

  // Autocomplete
  const [suggestions, setSuggestions] = useState<SuggestionPlayer[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [selectedSuggestion, setSelectedSuggestion] = useState<SuggestionPlayer | null>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  // Delete / toggle
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingPaid, setTogglingPaid] = useState<string | null>(null)
  const [resendingInvite, setResendingInvite] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [tripId])

  // Close suggestions on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch suggestions when name changes
  useEffect(() => {
    if (name.trim().length < 2 || selectedSuggestion) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    const timer = setTimeout(async () => {
      setLoadingSuggestions(true)
      try {
        const res = await fetch(
          `/api/trips/${tripId}/player-suggestions?q=${encodeURIComponent(name)}`
        )
        if (res.ok) {
          const data = await res.json()
          setSuggestions(data)
          setShowSuggestions(data.length > 0)
        }
      } catch {
        // ignore
      } finally {
        setLoadingSuggestions(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [name, tripId, selectedSuggestion])

  async function loadData() {
    setLoading(true)
    try {
      const [playersRes, coursesRes] = await Promise.all([
        fetch(`/api/trips/${tripId}/players`),
        fetch(`/api/trips/${tripId}/courses`),
      ])

      if (playersRes.ok) {
        setTripPlayers(await playersRes.json())
      } else {
        setError('Failed to load players')
      }

      if (coursesRes.ok) {
        setCourses(await coursesRes.json())
      }

      await loadInvites()
    } catch {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  async function loadInvites() {
    try {
      const res = await fetch(`/api/trips/${tripId}/invites`)
      if (res.ok) setInvites(await res.json())
    } catch {
      // Non-critical
    }
  }

  function selectSuggestion(s: SuggestionPlayer) {
    setSelectedSuggestion(s)
    setName(s.name)
    setEmail(s.email || '')
    setShowSuggestions(false)
    setSuggestions([])
  }

  function handleNameChange(value: string) {
    setName(value)
    setSelectedSuggestion(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !email.trim()) return

    setSaving(true)
    setError(null)

    try {
      const payload = selectedSuggestion?.user_id
        ? { profile_user_id: selectedSuggestion.user_id, email: email.trim() }
        : { name: name.trim(), email: email.trim() }

      const res = await fetch(`/api/trips/${tripId}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to add player')
      }

      const result = await res.json()
      setTripPlayers((prev) => [...prev, result])
      if (result.invite) setInvites((prev) => [...prev, result.invite])
      resetForm()
      setShowForm(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  function resetForm() {
    setName('')
    setEmail('')
    setSelectedSuggestion(null)
    setSuggestions([])
    setShowSuggestions(false)
  }

  async function handleResendInvite(playerId: string) {
    const invite = invites.find((i) => i.player_id === playerId && i.status === 'pending')
    if (!invite) return

    setResendingInvite(playerId)
    try {
      const player = tripPlayers.find((tp) => tp.player_id === playerId)?.player
      await fetch(`/api/trips/${tripId}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: player?.name || '', email: invite.email }),
      })
      await loadInvites()
    } catch {
      // ignore
    } finally {
      setResendingInvite(null)
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
      await fetch(`/api/trips/${tripId}/players`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip_player_id: tripPlayerId, paid: !currentPaid }),
      })
    } catch {
      // Optimistic update regardless
    }
    setTripPlayers((prev) =>
      prev.map((tp) => (tp.id === tripPlayerId ? { ...tp, paid: !currentPaid } : tp))
    )
    setTogglingPaid(null)
  }

  function getInviteStatus(playerId: string): 'invited' | 'joined' | null {
    const invite = invites.find((i) => i.player_id === playerId)
    if (!invite) return null
    if (invite.status === 'accepted') return 'joined'
    if (invite.status === 'pending') return 'invited'
    return null
  }

  function getCourseHandicap(tripPlayer: TripPlayerWithDetails, courseId: string): number | null {
    const ch = tripPlayer.course_handicaps?.find((h) => h.course_id === courseId)
    return ch ? ch.handicap_strokes : null
  }

  if (loading) {
    return <div className="py-12 text-center text-sm text-gray-500">Loading players...</div>
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
              onClick={() => {
                setShowForm(true)
                setError(null)
                setTimeout(() => nameInputRef.current?.focus(), 50)
              }}
              className="rounded-md bg-golf-700 px-4 py-2 text-sm font-medium text-white hover:bg-golf-800"
            >
              Invite Player
            </button>
          )}
        </div>

        {tripPlayers.length === 0 && !showForm ? (
          <p className="text-sm text-gray-500">
            No players added yet. Invite players by email to get started.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="pb-2 pr-4 font-medium text-gray-700">Name</th>
                  <th className="pb-2 pr-4 font-medium text-gray-700">Status</th>
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
                  .map((tp) => {
                    const inviteStatus = getInviteStatus(tp.player_id)
                    return (
                      <tr key={tp.id} className="border-b border-gray-100">
                        <td className="py-2.5 pr-4 font-medium text-gray-900">
                          {tp.player.name}
                        </td>
                        <td className="py-2.5 pr-4">
                          {inviteStatus === 'invited' && (
                            <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                              Invited
                            </span>
                          )}
                          {inviteStatus === 'joined' && (
                            <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                              Joined
                            </span>
                          )}
                          {!inviteStatus && tp.player.user_id && (
                            <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                              Member
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 pr-4 text-gray-600">
                          {tp.player.handicap_index != null ? tp.player.handicap_index : '--'}
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
                          <div className="flex items-center gap-1">
                            {inviteStatus === 'invited' && (
                              <button
                                onClick={() => handleResendInvite(tp.player_id)}
                                disabled={resendingInvite === tp.player_id}
                                className="rounded-md border border-yellow-300 px-2.5 py-1 text-xs font-medium text-yellow-700 hover:bg-yellow-50 disabled:opacity-50"
                              >
                                {resendingInvite === tp.player_id ? 'Sending...' : 'Resend'}
                              </button>
                            )}
                            {deletingId === tp.id ? (
                              <>
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
                              </>
                            ) : (
                              <button
                                onClick={() => setDeletingId(tp.id)}
                                className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite Player Panel */}
      {showForm && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Invite Player</h3>
            <button
              onClick={() => {
                setShowForm(false)
                setError(null)
                resetForm()
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name with autocomplete */}
            <div className="relative" ref={suggestionsRef}>
              <label htmlFor="invite-name" className="mb-1 block text-sm font-medium text-gray-700">
                Name
              </label>
              <input
                id="invite-name"
                ref={nameInputRef}
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true) }}
                placeholder="Player's name"
                required
                autoComplete="off"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
              />

              {/* Previous-trip suggestions */}
              {(showSuggestions || loadingSuggestions) && (
                <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
                  {loadingSuggestions ? (
                    <div className="px-4 py-2 text-sm text-gray-500">Searching...</div>
                  ) : (
                    <ul className="max-h-48 overflow-auto py-1">
                      {suggestions.map((s) => (
                        <li key={s.id}>
                          <button
                            type="button"
                            onClick={() => selectSuggestion(s)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-golf-50"
                          >
                            <span className="font-medium text-gray-900">{s.name}</span>
                            {s.email && (
                              <span className="ml-2 text-xs text-gray-400">{s.email}</span>
                            )}
                            {s.handicap_index != null && (
                              <span className="ml-2 text-xs text-gray-500">
                                HCP {s.handicap_index}
                              </span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {selectedSuggestion && (
                <p className="mt-1 text-xs text-golf-700">
                  From a previous trip.{' '}
                  <button
                    type="button"
                    onClick={() => { setSelectedSuggestion(null); setName(''); setEmail('') }}
                    className="underline hover:text-golf-800"
                  >
                    Clear
                  </button>
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="invite-email" className="mb-1 block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="player@email.com"
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
              />
            </div>

            <p className="text-xs text-gray-500">
              {selectedSuggestion?.user_id
                ? "They'll be added to this trip and notified by email."
                : "They'll receive an email with a link to sign up and join this trip."}
            </p>

            <button
              type="submit"
              disabled={saving || !name.trim() || !email.trim()}
              className="rounded-md bg-golf-700 px-4 py-2 text-sm font-medium text-white hover:bg-golf-800 disabled:opacity-50"
            >
              {saving
                ? 'Sending...'
                : selectedSuggestion?.user_id
                  ? 'Add Player'
                  : 'Send Invite'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
