'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { Player } from '@/lib/types'

interface TeamPlayer {
  team_id: string
  trip_player_id: string
  trip_player: {
    id: string
    paid: boolean
    player: {
      id: string
      name: string
      handicap_index: number | null
    }
  }
}

interface TeamWithPlayers {
  id: string
  trip_id: string
  name: string
  team_players: TeamPlayer[]
}

interface TripPlayerBasic {
  id: string
  trip_id: string
  player_id: string
  paid: boolean
  player: Player
}

export default function TeamsPage() {
  const params = useParams<{ tripId: string }>()
  const router = useRouter()
  const tripId = params.tripId

  const [teams, setTeams] = useState<TeamWithPlayers[]>([])
  const [tripPlayers, setTripPlayers] = useState<TripPlayerBasic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create/Edit team form
  const [showForm, setShowForm] = useState(false)
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null)
  const [teamName, setTeamName] = useState('')
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [tripId])

  async function loadData() {
    setLoading(true)
    try {
      const [teamsRes, playersRes] = await Promise.all([
        fetch(`/api/trips/${tripId}/teams`),
        fetch(`/api/trips/${tripId}/players`),
      ])

      if (teamsRes.ok) {
        const data = await teamsRes.json()
        setTeams(data)
      } else {
        setError('Failed to load teams')
      }

      if (playersRes.ok) {
        const data = await playersRes.json()
        setTripPlayers(data)
      }
    } catch {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  // Get all trip_player IDs that are assigned to any team
  const assignedPlayerIds = new Set(
    teams.flatMap((t) => t.team_players.map((tp) => tp.trip_player_id))
  )

  // Players not assigned to any team
  const unassignedPlayers = tripPlayers.filter(
    (tp) => !assignedPlayerIds.has(tp.id)
  )

  function resetForm() {
    setTeamName('')
    setSelectedPlayerIds([])
    setEditingTeamId(null)
    setError(null)
  }

  function openCreateForm() {
    resetForm()
    setShowForm(true)
  }

  function openEditForm(team: TeamWithPlayers) {
    setTeamName(team.name)
    setSelectedPlayerIds(team.team_players.map((tp) => tp.trip_player_id))
    setEditingTeamId(team.id)
    setShowForm(true)
  }

  function togglePlayerSelection(tripPlayerId: string) {
    setSelectedPlayerIds((prev) =>
      prev.includes(tripPlayerId)
        ? prev.filter((id) => id !== tripPlayerId)
        : [...prev, tripPlayerId]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      if (editingTeamId) {
        // Update team
        const res = await fetch(`/api/trips/${tripId}/teams`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            team_id: editingTeamId,
            name: teamName.trim(),
            player_ids: selectedPlayerIds,
          }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to update team')
        }

        const updatedTeam = await res.json()
        setTeams((prev) =>
          prev.map((t) => (t.id === editingTeamId ? updatedTeam : t))
        )
      } else {
        // Create team
        const res = await fetch(`/api/trips/${tripId}/teams`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: teamName.trim(),
            player_ids: selectedPlayerIds,
          }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to create team')
        }

        const newTeam = await res.json()
        setTeams((prev) => [...prev, newTeam])
      }

      setShowForm(false)
      resetForm()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(teamId: string) {
    setError(null)
    try {
      const res = await fetch(
        `/api/trips/${tripId}/teams?team_id=${teamId}`,
        { method: 'DELETE' }
      )
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete team')
      }
      setTeams((prev) => prev.filter((t) => t.id !== teamId))
      setDeletingId(null)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setDeletingId(null)
    }
  }

  // Find player name from trip_player_id
  function getPlayerName(tripPlayerId: string): string {
    const tp = tripPlayers.find((p) => p.id === tripPlayerId)
    return tp?.player?.name || 'Unknown'
  }

  function getPlayerHandicap(tripPlayerId: string): number | null {
    const tp = tripPlayers.find((p) => p.id === tripPlayerId)
    return tp?.player?.handicap_index ?? null
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-gray-500">Loading teams...</div>
    )
  }

  if (tripPlayers.length === 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <h3 className="mb-2 font-semibold text-amber-900">Players Required</h3>
        <p className="mb-4 text-sm text-amber-800">
          Add players to the trip before creating teams.
        </p>
        <a
          href={`/admin/trips/${tripId}/players`}
          className="inline-flex items-center rounded-md bg-golf-700 px-4 py-2 text-sm font-medium text-white hover:bg-golf-800"
        >
          Go to Players &rarr;
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Teams List */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Teams ({teams.length})
          </h3>
          {!showForm && (
            <button
              onClick={openCreateForm}
              className="rounded-md bg-golf-700 px-4 py-2 text-sm font-medium text-white hover:bg-golf-800"
            >
              Create Team
            </button>
          )}
        </div>

        {teams.length === 0 && !showForm ? (
          <p className="text-sm text-gray-500">
            No teams created yet. Create teams and assign players.
          </p>
        ) : (
          <div className="space-y-4">
            {teams.map((team) => (
              <div
                key={team.id}
                className="rounded-md border border-gray-200 bg-gray-50 p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="font-semibold text-gray-900">{team.name}</h4>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditForm(team)}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                    >
                      Edit
                    </button>
                    {deletingId === team.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(team.id)}
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
                        onClick={() => setDeletingId(team.id)}
                        className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                {team.team_players.length === 0 ? (
                  <p className="text-xs text-gray-500">No players assigned</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {team.team_players.map((tp) => (
                      <span
                        key={tp.trip_player_id}
                        className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-sm"
                      >
                        {tp.trip_player?.player?.name || getPlayerName(tp.trip_player_id)}
                        {(tp.trip_player?.player?.handicap_index != null) && (
                          <span className="text-gray-400">
                            ({tp.trip_player.player.handicap_index})
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Team Form */}
      {showForm && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            {editingTeamId ? 'Edit Team' : 'Create Team'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="team-name" className="mb-1 block text-sm font-medium text-gray-700">
                Team Name
              </label>
              <input
                id="team-name"
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder='e.g. "Team Tall"'
                required
                className="w-64 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Assign Players
              </label>
              {tripPlayers.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No players in this trip yet. Add players first.
                </p>
              ) : (
                <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-gray-200 bg-gray-50 p-3">
                  {tripPlayers
                    .sort((a, b) => a.player.name.localeCompare(b.player.name))
                    .map((tp) => {
                      const isSelected = selectedPlayerIds.includes(tp.id)
                      // Check if this player is assigned to another team (not the one being edited)
                      const assignedToOtherTeam = teams.some(
                        (t) =>
                          t.id !== editingTeamId &&
                          t.team_players.some((p) => p.trip_player_id === tp.id)
                      )

                      return (
                        <label
                          key={tp.id}
                          className={`flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm ${
                            isSelected ? 'bg-golf-50' : 'hover:bg-white'
                          } ${assignedToOtherTeam ? 'opacity-50' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => togglePlayerSelection(tp.id)}
                            disabled={assignedToOtherTeam}
                            className="h-4 w-4 rounded border-gray-300 text-golf-600 focus:ring-golf-500"
                          />
                          <span className="font-medium text-gray-900">
                            {tp.player.name}
                          </span>
                          {tp.player.handicap_index != null && (
                            <span className="text-gray-400">
                              HCP: {tp.player.handicap_index}
                            </span>
                          )}
                          {assignedToOtherTeam && (
                            <span className="text-xs text-orange-600">
                              (assigned to{' '}
                              {teams.find(
                                (t) =>
                                  t.id !== editingTeamId &&
                                  t.team_players.some((p) => p.trip_player_id === tp.id)
                              )?.name || 'another team'}
                              )
                            </span>
                          )}
                        </label>
                      )
                    })}
                </div>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {selectedPlayerIds.length} player{selectedPlayerIds.length !== 1 ? 's' : ''} selected
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving || !teamName.trim()}
                className="rounded-md bg-golf-700 px-4 py-2 text-sm font-medium text-white hover:bg-golf-800 disabled:opacity-50"
              >
                {saving
                  ? 'Saving...'
                  : editingTeamId
                    ? 'Update Team'
                    : 'Create Team'}
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

      {/* Unassigned Players */}
      {unassignedPlayers.length > 0 && !showForm && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-6 shadow-sm">
          <h3 className="mb-3 text-lg font-semibold text-orange-900">
            Unassigned Players ({unassignedPlayers.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {unassignedPlayers
              .sort((a, b) => a.player.name.localeCompare(b.player.name))
              .map((tp) => (
                <span
                  key={tp.id}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-sm"
                >
                  {tp.player.name}
                  {tp.player.handicap_index != null && (
                    <span className="text-gray-400">({tp.player.handicap_index})</span>
                  )}
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
