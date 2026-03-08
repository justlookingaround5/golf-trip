'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Trip } from '@/lib/types'

const STATUS_FLOW: Record<string, string> = {
  setup: 'active',
  active: 'completed',
}

const STATUS_ACTION_LABELS: Record<string, string> = {
  setup: 'Activate Trip',
  active: 'Complete Trip',
}

export default function TripActions({ trip }: { trip: Trip }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(trip.name)
  const [year, setYear] = useState(trip.year)
  const [location, setLocation] = useState(trip.location || '')
  const [matchBuyIn, setMatchBuyIn] = useState(trip.match_buy_in)
  const [skinsBuyIn, setSkinsBuyIn] = useState(trip.skins_buy_in)
  const [skinsMode, setSkinsMode] = useState<'gross' | 'net'>(trip.skins_mode === 'gross' ? 'gross' : 'net')
  const [handicapMode, setHandicapMode] = useState(trip.handicap_mode || 'static')

  async function handleStatusChange() {
    const nextStatus = STATUS_FLOW[trip.status]
    if (!nextStatus) return

    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/trips/${trip.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update status')
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/trips/${trip.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          year,
          location: location || null,
          match_buy_in: matchBuyIn,
          skins_buy_in: skinsBuyIn,
          skins_mode: skinsMode,
          handicap_mode: handicapMode,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update trip')
      }
      setEditing(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/trips/${trip.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete trip')
      }
      router.push('/admin')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setDeleting(false)
    }
  }

  if (editing) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Edit Trip</h3>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <div className="space-y-4">
          <div>
            <label htmlFor="edit-name" className="mb-1 block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              id="edit-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-year" className="mb-1 block text-sm font-medium text-gray-700">
                Year
              </label>
              <input
                id="edit-year"
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
              />
            </div>
            <div>
              <label htmlFor="edit-location" className="mb-1 block text-sm font-medium text-gray-700">
                Location
              </label>
              <input
                id="edit-location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="edit-handicapMode" className="mb-1 block text-sm font-medium text-gray-700">
              Handicap Mode
            </label>
            <select
              id="edit-handicapMode"
              value={handicapMode}
              onChange={(e) => setHandicapMode(e.target.value as 'static' | 'dynamic')}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
            >
              <option value="static">Static (manual entry)</option>
              <option value="dynamic">Dynamic (GHIN sync — coming soon)</option>
            </select>
            <p className="mt-1 text-xs text-gray-400">
              Static: players enter handicap manually. Dynamic: auto-syncs from GHIN (not yet available).
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="edit-matchBuyIn" className="mb-1 block text-sm font-medium text-gray-700">
                Match Buy-in ($)
              </label>
              <input
                id="edit-matchBuyIn"
                type="number"
                value={matchBuyIn}
                onChange={(e) => setMatchBuyIn(Number(e.target.value))}
                min={0}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
              />
            </div>
            <div>
              <label htmlFor="edit-skinsBuyIn" className="mb-1 block text-sm font-medium text-gray-700">
                Skins Buy-in ($)
              </label>
              <input
                id="edit-skinsBuyIn"
                type="number"
                value={skinsBuyIn}
                onChange={(e) => setSkinsBuyIn(Number(e.target.value))}
                min={0}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
              />
            </div>
            <div>
              <label htmlFor="edit-skinsMode" className="mb-1 block text-sm font-medium text-gray-700">
                Skins Mode
              </label>
              <select
                id="edit-skinsMode"
                value={skinsMode}
                onChange={(e) => setSkinsMode(e.target.value as 'gross' | 'net')}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
              >
                <option value="gross">Gross</option>
                <option value="net">Net</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-golf-700 px-4 py-2 text-sm font-medium text-white hover:bg-golf-800 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={() => {
                setEditing(false)
                setName(trip.name)
                setYear(trip.year)
                setLocation(trip.location || '')
                setMatchBuyIn(trip.match_buy_in)
                setSkinsBuyIn(trip.skins_buy_in)
                setSkinsMode(trip.skins_mode === 'gross' ? 'gross' : 'net')
                setHandicapMode(trip.handicap_mode || 'static')
              }}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setEditing(true)}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Edit Trip
        </button>

        {STATUS_FLOW[trip.status] && (
          <button
            onClick={handleStatusChange}
            disabled={saving}
            className="rounded-md bg-golf-700 px-4 py-2 text-sm font-medium text-white hover:bg-golf-800 disabled:opacity-50"
          >
            {saving ? 'Updating...' : STATUS_ACTION_LABELS[trip.status]}
          </button>
        )}

        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Delete Trip
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-red-600">Are you sure?</span>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Yes, Delete'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              No
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
