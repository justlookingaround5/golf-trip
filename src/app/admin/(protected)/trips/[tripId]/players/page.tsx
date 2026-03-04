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

interface ProfileResult {
  user_id: string
  display_name: string | null
  avatar_url: string | null
  handicap_index: number | null
  email: string | null
}

type AddTab = 'search' | 'invite' | 'manual'

export default function PlayersPage() {
  const params = useParams<{ tripId: string }>()
  const router = useRouter()
  const tripId = params.tripId

  const [tripPlayers, setTripPlayers] = useState<TripPlayerWithDetails[]>([])
  const [invites, setInvites] = useState<TripInvite[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Add player panel
  const [showForm, setShowForm] = useState(false)
  const [activeTab, setActiveTab] = useState<AddTab>('search')
  const [saving, setSaving] = useState(false)

  // Tab 1: Search Users
  const [profileQuery, setProfileQuery] = useState('')
  const [profileResults, setProfileResults] = useState<ProfileResult[]>([])
  const [searchingProfiles, setSearchingProfiles] = useState(false)

  // Tab 2: Invite by Email
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')

  // Tab 3: Manual Add
  const [manualName, setManualName] = useState('')
  const [manualEmail, setManualEmail] = useState('')
  const [manualPhone, setManualPhone] = useState('')
  const [manualHandicap, setManualHandicap] = useState('')

  // Existing player search (for manual tab)
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  // Delete / toggle
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingPaid, setTogglingPaid] = useState<string | null>(null)
  const [resendingInvite, setResendingInvite] = useState<string | null>(null)

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

      // Load invites for this trip
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
      if (res.ok) {
        const data = await res.json()
        setInvites(data)
      }
    } catch {
      // Non-critical
    }
  }

  // --- Tab 1: Profile Search ---
  async function searchProfiles(query: string) {
    setProfileQuery(query)
    if (query.trim().length < 2) {
      setProfileResults([])
      return
    }

    setSearchingProfiles(true)
    try {
      const res = await fetch(
        `/api/profiles/search?q=${encodeURIComponent(query)}&trip_id=${tripId}`
      )
      if (res.ok) {
        const data = await res.json()
        setProfileResults(data)
      }
    } catch {
      // ignore
    } finally {
      setSearchingProfiles(false)
    }
  }

  async function addFromProfile(profile: ProfileResult) {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/trips/${tripId}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_user_id: profile.user_id,
          email: profile.email,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to add player')
      }

      const newTripPlayer = await res.json()
      setTripPlayers((prev) => [...prev, newTripPlayer])
      setProfileQuery('')
      setProfileResults([])
      setShowForm(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  // --- Tab 2: Invite ---
  async function handleInviteSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/trips/${tripId}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: inviteName.trim(),
          email: inviteEmail.trim(),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to send invite')
      }

      const result = await res.json()
      setTripPlayers((prev) => [...prev, result])
      if (result.invite) {
        setInvites((prev) => [...prev, result.invite])
      }
      setInviteName('')
      setInviteEmail('')
      setShowForm(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  // --- Tab 3: Manual Add ---
  async function loadAllPlayers() {
    try {
      const res = await fetch('/api/players')
      if (res.ok) {
        const data = await res.json()
        setAllPlayers(data)
      }
    } catch {
      // ignore
    }
  }

  function handleManualSearchChange(value: string) {
    setManualName(value)
    setSelectedPlayerId(null)
    if (value.trim().length < 1) {
      setShowSearchResults(false)
      return
    }
    setShowSearchResults(true)
  }

  function selectExistingPlayer(player: Player) {
    setSelectedPlayerId(player.id)
    setManualName(player.name)
    setManualEmail(player.email || '')
    setManualPhone(player.phone || '')
    setManualHandicap(player.handicap_index != null ? String(player.handicap_index) : '')
    setShowSearchResults(false)
  }

  const filteredPlayers = allPlayers.filter((p) => {
    const alreadyInTrip = tripPlayers.some((tp) => tp.player_id === p.id)
    if (alreadyInTrip) return false
    if (manualName.trim().length === 0) return true
    return p.name.toLowerCase().includes(manualName.toLowerCase())
  })

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const payload = selectedPlayerId
        ? { player_id: selectedPlayerId }
        : {
            name: manualName.trim(),
            email: manualEmail.trim() || null,
            phone: manualPhone.trim() || null,
            handicap_index: manualHandicap ? Number(manualHandicap) : null,
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
      resetManualForm()
      setShowForm(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  function resetManualForm() {
    setManualName('')
    setManualEmail('')
    setManualPhone('')
    setManualHandicap('')
    setSelectedPlayerId(null)
    setShowSearchResults(false)
  }

  // --- Resend Invite ---
  async function handleResendInvite(playerId: string) {
    const invite = invites.find((i) => i.player_id === playerId && i.status === 'pending')
    if (!invite) return

    setResendingInvite(playerId)
    try {
      const player = tripPlayers.find((tp) => tp.player_id === playerId)?.player
      const res = await fetch(`/api/trips/${tripId}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: player?.name || '',
          email: invite.email,
        }),
      })

      if (!res.ok) {
        // If player already exists, just re-trigger the invite email
        // For now we'll show a simple success
      }

      // Reload invites
      await loadInvites()
    } catch {
      // ignore
    } finally {
      setResendingInvite(null)
    }
  }

  // --- Common actions ---
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
      const res = await fetch(`/api/trips/${tripId}/players`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip_player_id: tripPlayerId, paid: !currentPaid }),
      })
      if (!res.ok) {
        throw new Error('Failed to update paid status')
      }
    } catch {
      // Optimistic update even if API fails
    }

    setTripPlayers((prev) =>
      prev.map((tp) =>
        tp.id === tripPlayerId ? { ...tp, paid: !currentPaid } : tp
      )
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
    return (
      <div className="py-12 text-center text-sm text-gray-500">Loading players...</div>
    )
  }

  const sortedCourses = [...courses].sort((a, b) => a.round_number - b.round_number)

  const tabs: { key: AddTab; label: string }[] = [
    { key: 'search', label: 'Search Users' },
    { key: 'invite', label: 'Invite by Email' },
    { key: 'manual', label: 'Add Manually' },
  ]

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
                setActiveTab('search')
                setError(null)
                loadAllPlayers()
              }}
              className="rounded-md bg-golf-700 px-4 py-2 text-sm font-medium text-white hover:bg-golf-800"
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

      {/* Add Player Panel */}
      {showForm && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Add Player</h3>
            <button
              onClick={() => {
                setShowForm(false)
                setError(null)
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>

          {/* Tabs */}
          <div className="mb-4 flex border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm font-medium -mb-px ${
                  activeTab === tab.key
                    ? 'border-b-2 border-golf-700 text-golf-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Search Users */}
          {activeTab === 'search' && (
            <div>
              <div className="mb-3">
                <label htmlFor="profile-search" className="mb-1 block text-sm font-medium text-gray-700">
                  Search by Name
                </label>
                <input
                  id="profile-search"
                  type="text"
                  value={profileQuery}
                  onChange={(e) => searchProfiles(e.target.value)}
                  placeholder="Type a name to search..."
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
                />
              </div>

              {searchingProfiles && (
                <p className="text-sm text-gray-500">Searching...</p>
              )}

              {profileResults.length > 0 && (
                <div className="space-y-2">
                  {profileResults.map((profile) => (
                    <div
                      key={profile.user_id}
                      className="flex items-center justify-between rounded-md border border-gray-200 p-3 hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        {profile.avatar_url ? (
                          <img
                            src={profile.avatar_url}
                            alt=""
                            className="h-8 w-8 rounded-full"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-golf-100 text-sm font-medium text-golf-800">
                            {(profile.display_name || '?')[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {profile.display_name || 'Unnamed'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {profile.handicap_index != null
                              ? `HCP: ${profile.handicap_index}`
                              : 'No handicap'}
                            {profile.email && ` · ${profile.email}`}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => addFromProfile(profile)}
                        disabled={saving}
                        className="rounded-md bg-golf-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-golf-800 disabled:opacity-50"
                      >
                        {saving ? 'Adding...' : 'Add'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {profileQuery.length >= 2 && !searchingProfiles && profileResults.length === 0 && (
                <p className="text-sm text-gray-500">
                  No users found. Try the &ldquo;Invite by Email&rdquo; tab to invite someone new.
                </p>
              )}
            </div>
          )}

          {/* Tab 2: Invite by Email */}
          {activeTab === 'invite' && (
            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div>
                <label htmlFor="invite-name" className="mb-1 block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  id="invite-name"
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Player's name"
                  required
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
                />
              </div>
              <div>
                <label htmlFor="invite-email" className="mb-1 block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="player@email.com"
                  required
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
                />
              </div>
              <p className="text-xs text-gray-500">
                They&apos;ll receive an email with a link to sign up and join this trip.
              </p>
              <button
                type="submit"
                disabled={saving || !inviteName.trim() || !inviteEmail.trim()}
                className="rounded-md bg-golf-700 px-4 py-2 text-sm font-medium text-white hover:bg-golf-800 disabled:opacity-50"
              >
                {saving ? 'Sending...' : 'Send Invite'}
              </button>
            </form>
          )}

          {/* Tab 3: Add Manually */}
          {activeTab === 'manual' && (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div ref={searchContainerRef} className="relative">
                <label htmlFor="manual-name" className="mb-1 block text-sm font-medium text-gray-700">
                  Player Name
                </label>
                <input
                  id="manual-name"
                  type="text"
                  value={manualName}
                  onChange={(e) => handleManualSearchChange(e.target.value)}
                  onFocus={() => {
                    if (filteredPlayers.length > 0 && manualName.length > 0) {
                      setShowSearchResults(true)
                    }
                  }}
                  placeholder="Search existing or enter new name..."
                  required
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
                />

                {selectedPlayerId && (
                  <div className="mt-1 text-xs text-golf-700">
                    Using existing player record.{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPlayerId(null)
                        setManualName('')
                      }}
                      className="underline hover:text-golf-800"
                    >
                      Clear
                    </button>
                  </div>
                )}

                {showSearchResults && filteredPlayers.length > 0 && !selectedPlayerId && (
                  <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
                    <ul className="max-h-48 overflow-auto py-1">
                      {filteredPlayers.slice(0, 10).map((player) => (
                        <li key={player.id}>
                          <button
                            type="button"
                            onClick={() => selectExistingPlayer(player)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-golf-50"
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

              {!selectedPlayerId && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="manual-email" className="mb-1 block text-sm font-medium text-gray-700">
                        Email
                      </label>
                      <input
                        id="manual-email"
                        type="email"
                        value={manualEmail}
                        onChange={(e) => setManualEmail(e.target.value)}
                        placeholder="player@email.com"
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="manual-phone" className="mb-1 block text-sm font-medium text-gray-700">
                        Phone
                      </label>
                      <input
                        id="manual-phone"
                        type="tel"
                        value={manualPhone}
                        onChange={(e) => setManualPhone(e.target.value)}
                        placeholder="555-123-4567"
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="manual-handicap" className="mb-1 block text-sm font-medium text-gray-700">
                      Handicap Index
                    </label>
                    <input
                      id="manual-handicap"
                      type="number"
                      value={manualHandicap}
                      onChange={(e) => setManualHandicap(e.target.value)}
                      placeholder="e.g. 12.5 (optional)"
                      step="0.1"
                      min="-10"
                      max="54"
                      className="w-48 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
                    />
                  </div>
                </>
              )}

              {!selectedPlayerId && manualHandicap && sortedCourses.length > 0 && (
                <div className="rounded-md bg-gray-50 p-3">
                  <p className="mb-1 text-xs font-medium text-gray-700">Estimated Course Handicaps:</p>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                    {sortedCourses
                      .filter((c) => c.slope != null && c.rating != null)
                      .map((course) => {
                        const hcp = Math.round(
                          (Number(manualHandicap) * course.slope! / 113) + (course.rating! - course.par)
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

              <button
                type="submit"
                disabled={saving || (!selectedPlayerId && !manualName.trim())}
                className="rounded-md bg-golf-700 px-4 py-2 text-sm font-medium text-white hover:bg-golf-800 disabled:opacity-50"
              >
                {saving ? 'Adding...' : 'Add Player'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
