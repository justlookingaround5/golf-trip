'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function JoinByCodePage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [tripInfo, setTripInfo] = useState<{
    id: string
    name: string
    year: number
    location: string | null
    status: string
  } | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [joining, setJoining] = useState(false)
  const [success, setSuccess] = useState(false)

  async function lookupCode() {
    if (code.length !== 4) {
      setError('Enter a 4-character code')
      return
    }

    setLoading(true)
    setError('')
    setTripInfo(null)

    const res = await fetch(`/api/join/code?code=${encodeURIComponent(code)}`)
    const data = await res.json()

    setLoading(false)

    if (!res.ok) {
      setError(data.error || 'Trip not found')
      return
    }

    setTripInfo(data.trip)
  }

  async function joinTrip() {
    setJoining(true)
    setError('')

    const res = await fetch('/api/join/code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })

    const data = await res.json()
    setJoining(false)

    if (!res.ok) {
      if (res.status === 401) {
        // Not logged in — redirect to login with return URL
        router.push(`/admin/login?redirect_to=/join/code`)
        return
      }
      setError(data.error || 'Failed to join')
      return
    }

    setSuccess(true)
    setTimeout(() => {
      router.push(`/trip/${data.trip_id}`)
    }, 1500)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Join a Trip</h1>
        <p className="mb-6 text-gray-600">
          Enter the 4-character code shared by the trip organizer.
        </p>

        {success ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center">
            <p className="text-lg font-semibold text-green-800">
              You&apos;re in!
            </p>
            <p className="text-sm text-green-600">
              Redirecting to {tripInfo?.name}...
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label htmlFor="code" className="mb-1 block text-sm font-medium text-gray-700">
                Join Code
              </label>
              <input
                id="code"
                type="text"
                maxLength={4}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase())
                  setError('')
                  setTripInfo(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') lookupCode()
                }}
                placeholder="ABCD"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] uppercase focus:border-golf-500 focus:outline-none focus:ring-2 focus:ring-golf-500/20"
                autoFocus
              />
            </div>

            {error && (
              <p className="mb-4 text-sm text-red-600">{error}</p>
            )}

            {!tripInfo ? (
              <button
                onClick={lookupCode}
                disabled={loading || code.length !== 4}
                className="w-full rounded-lg bg-golf-600 px-4 py-2.5 font-medium text-white hover:bg-golf-700 disabled:opacity-50"
              >
                {loading ? 'Looking up...' : 'Find Trip'}
              </button>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <h2 className="text-lg font-semibold text-gray-900">{tripInfo.name}</h2>
                  <p className="text-sm text-gray-600">
                    {tripInfo.year}
                    {tripInfo.location ? ` - ${tripInfo.location}` : ''}
                  </p>
                </div>

                <button
                  onClick={joinTrip}
                  disabled={joining}
                  className="w-full rounded-lg bg-golf-600 px-4 py-2.5 font-medium text-white hover:bg-golf-700 disabled:opacity-50"
                >
                  {joining ? 'Joining...' : 'Join This Trip'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
