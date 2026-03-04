'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewTripPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [year, setYear] = useState(new Date().getFullYear())
  const [location, setLocation] = useState('')
  const [matchBuyIn, setMatchBuyIn] = useState(100)
  const [skinsBuyIn, setSkinsBuyIn] = useState(10)
  const [skinsMode, setSkinsMode] = useState<'gross' | 'net' | 'both'>('net')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          year,
          location: location || null,
          match_buy_in: matchBuyIn,
          skins_buy_in: skinsBuyIn,
          skins_mode: skinsMode,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create trip')
      }

      const trip = await res.json()
      router.push(`/admin/trips/${trip.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="mb-6 text-2xl font-bold text-gray-900">Create New Trip</h2>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
            Trip Name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='e.g., "2025 St. George"'
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
          />
        </div>

        <div>
          <label htmlFor="year" className="mb-1 block text-sm font-medium text-gray-700">
            Year <span className="text-red-500">*</span>
          </label>
          <input
            id="year"
            type="number"
            required
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            min={2000}
            max={2100}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
          />
        </div>

        <div>
          <label htmlFor="location" className="mb-1 block text-sm font-medium text-gray-700">
            Location
          </label>
          <input
            id="location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder='e.g., "St. George, Utah"'
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="matchBuyIn" className="mb-1 block text-sm font-medium text-gray-700">
              Match Buy-in ($)
            </label>
            <input
              id="matchBuyIn"
              type="number"
              value={matchBuyIn}
              onChange={(e) => setMatchBuyIn(Number(e.target.value))}
              min={0}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
            />
          </div>

          <div>
            <label htmlFor="skinsBuyIn" className="mb-1 block text-sm font-medium text-gray-700">
              Skins Buy-in ($)
            </label>
            <input
              id="skinsBuyIn"
              type="number"
              value={skinsBuyIn}
              onChange={(e) => setSkinsBuyIn(Number(e.target.value))}
              min={0}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
            />
          </div>
        </div>

        <div>
          <label htmlFor="skinsMode" className="mb-1 block text-sm font-medium text-gray-700">
            Skins Mode
          </label>
          <select
            id="skinsMode"
            value={skinsMode}
            onChange={(e) => setSkinsMode(e.target.value as 'gross' | 'net' | 'both')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
          >
            <option value="gross">Gross</option>
            <option value="net">Net</option>
            <option value="both">Both</option>
          </select>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-golf-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-golf-800 focus:outline-none focus:ring-2 focus:ring-golf-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Trip'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin')}
            className="rounded-md border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
