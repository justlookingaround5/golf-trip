'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface JoinClientProps {
  token: string
  invite: {
    status: string
  }
  trip: {
    name: string
    year: number
    location: string | null
  } | null
  isLoggedIn: boolean
}

export default function JoinClient({ token, invite, trip, isLoggedIn }: JoinClientProps) {
  const router = useRouter()
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Already accepted
  if (invite.status === 'accepted') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-md">
          <div className="mb-4 text-4xl">&#9989;</div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Already Joined</h1>
          <p className="mb-6 text-gray-600">
            You&apos;ve already accepted this invite
            {trip ? ` for ${trip.name}` : ''}.
          </p>
          <a
            href="/admin"
            className="inline-block rounded-md bg-golf-700 px-6 py-2.5 text-sm font-medium text-white hover:bg-golf-800"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    )
  }

  // Expired
  if (invite.status === 'expired') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-md">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Invite Expired</h1>
          <p className="text-gray-600">This invite has expired. Ask the trip organizer for a new one.</p>
        </div>
      </div>
    )
  }

  async function handleGoogleSignIn() {
    const supabase = createClient()
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect_to=/join/${token}`,
      },
    })
    if (oauthError) {
      setError(oauthError.message)
    }
  }

  async function handleJoin() {
    setJoining(true)
    setError(null)

    try {
      const res = await fetch(`/api/invite/${token}`, { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to join trip')
      }

      router.push(data.redirect || '/admin/profile')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setJoining(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <div className="mb-6 text-center">
          <div className="mb-4 text-4xl">&#9971;</div>
          <h1 className="mb-1 text-2xl font-bold text-gray-900">
            You&apos;re Invited!
          </h1>
          {trip && (
            <div className="mt-3 space-y-1">
              <p className="text-lg font-semibold text-golf-700">{trip.name}</p>
              {trip.location && (
                <p className="text-sm text-gray-600">{trip.location}</p>
              )}
              <p className="text-sm text-gray-500">{trip.year}</p>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {isLoggedIn ? (
          <button
            onClick={handleJoin}
            disabled={joining}
            className="w-full rounded-md bg-golf-700 px-4 py-3 text-sm font-medium text-white hover:bg-golf-800 disabled:opacity-50"
          >
            {joining ? 'Joining...' : 'Join This Trip'}
          </button>
        ) : (
          <div className="space-y-3">
            <button
              onClick={handleGoogleSignIn}
              className="flex w-full items-center justify-center gap-3 rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Sign Up with Google
            </button>
            <a
              href={`/admin/login?redirect_to=/join/${token}`}
              className="block w-full rounded-md border border-gray-300 px-4 py-2.5 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Sign In with Email
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
