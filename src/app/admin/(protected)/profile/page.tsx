'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface Profile {
  display_name: string | null
  avatar_url: string | null
  ghin_number: string | null
  handicap_index: number | null
  home_club: string | null
  preferred_tee: string | null
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lookingUp, setLookingUp] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [displayName, setDisplayName] = useState('')
  const [ghinNumber, setGhinNumber] = useState('')
  const [ghinEmail, setGhinEmail] = useState('')
  const [ghinPassword, setGhinPassword] = useState('')
  const [showGhinLogin, setShowGhinLogin] = useState(false)
  const [handicapIndex, setHandicapIndex] = useState('')
  const [homeClub, setHomeClub] = useState('')
  const [preferredTee, setPreferredTee] = useState('')

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((data) => {
        setProfile(data)
        setDisplayName(data.display_name || '')
        setGhinNumber(data.ghin_number || '')
        setHandicapIndex(data.handicap_index != null ? String(data.handicap_index) : '')
        setHomeClub(data.home_club || '')
        setPreferredTee(data.preferred_tee || '')
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleGhinLookup() {
    if (!ghinNumber.trim() || !ghinEmail.trim() || !ghinPassword) return
    setLookingUp(true)
    setMessage(null)

    try {
      const res = await fetch('/api/ghin/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ghin_number: ghinNumber.trim(),
          email: ghinEmail.trim(),
          password: ghinPassword,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        setMessage({ type: 'error', text: err.error || 'GHIN lookup failed' })
        return
      }
      const data = await res.json()
      if (data.handicap_index != null) setHandicapIndex(String(data.handicap_index))
      if (data.home_club) setHomeClub(data.home_club)
      setGhinPassword('')
      setShowGhinLogin(false)
      setMessage({ type: 'success', text: 'GHIN data loaded successfully' })
    } catch {
      setMessage({ type: 'error', text: 'GHIN lookup failed' })
    } finally {
      setLookingUp(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName || null,
          ghin_number: ghinNumber || null,
          handicap_index: handicapIndex ? parseFloat(handicapIndex) : null,
          home_club: homeClub || null,
          preferred_tee: preferredTee || null,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        setMessage({ type: 'error', text: err.error || 'Failed to save' })
        return
      }

      const updated = await res.json()
      setProfile(updated)
      setMessage({ type: 'success', text: 'Profile saved' })
    } catch {
      setMessage({ type: 'error', text: 'Failed to save profile' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="text-gray-500">Loading profile...</div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg">
      <h2 className="mb-6 text-2xl font-bold text-gray-900">Your Profile</h2>

      {profile?.avatar_url && (
        <div className="mb-6 flex justify-center">
          <Image
            src={profile.avatar_url}
            alt="Profile photo"
            width={80}
            height={80}
            className="rounded-full"
          />
        </div>
      )}

      {message && (
        <div
          className={`mb-4 rounded-md p-3 text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label htmlFor="displayName" className="mb-1 block text-sm font-medium text-gray-700">
            Display Name
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          />
        </div>

        <div>
          <label htmlFor="ghinNumber" className="mb-1 block text-sm font-medium text-gray-700">
            GHIN Number
          </label>
          <div className="flex gap-2">
            <input
              id="ghinNumber"
              type="text"
              value={ghinNumber}
              onChange={(e) => setGhinNumber(e.target.value)}
              placeholder="e.g. 1234567"
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
            {!showGhinLogin && (
              <button
                type="button"
                onClick={() => setShowGhinLogin(true)}
                disabled={!ghinNumber.trim()}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Lookup
              </button>
            )}
          </div>

          {showGhinLogin && (
            <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 p-4 space-y-3">
              <p className="text-xs text-blue-700">
                Sign in with your GHIN account to auto-fill your handicap. Your credentials are not stored.
              </p>
              <div>
                <label htmlFor="ghinEmail" className="mb-1 block text-xs font-medium text-gray-700">
                  GHIN Email
                </label>
                <input
                  id="ghinEmail"
                  type="email"
                  value={ghinEmail}
                  onChange={(e) => setGhinEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="ghinPassword" className="mb-1 block text-xs font-medium text-gray-700">
                  GHIN Password
                </label>
                <input
                  id="ghinPassword"
                  type="password"
                  value={ghinPassword}
                  onChange={(e) => setGhinPassword(e.target.value)}
                  placeholder="Your GHIN password"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleGhinLookup}
                  disabled={lookingUp || !ghinEmail.trim() || !ghinPassword}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {lookingUp ? 'Looking up...' : 'Fetch Handicap'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowGhinLogin(false); setGhinPassword('') }}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="handicapIndex" className="mb-1 block text-sm font-medium text-gray-700">
            Handicap Index
          </label>
          <input
            id="handicapIndex"
            type="number"
            step="0.1"
            value={handicapIndex}
            onChange={(e) => setHandicapIndex(e.target.value)}
            placeholder="e.g. 12.3"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          />
        </div>

        <div>
          <label htmlFor="homeClub" className="mb-1 block text-sm font-medium text-gray-700">
            Home Club
          </label>
          <input
            id="homeClub"
            type="text"
            value={homeClub}
            onChange={(e) => setHomeClub(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          />
        </div>

        <div>
          <label htmlFor="preferredTee" className="mb-1 block text-sm font-medium text-gray-700">
            Preferred Tee
          </label>
          <input
            id="preferredTee"
            type="text"
            value={preferredTee}
            onChange={(e) => setPreferredTee(e.target.value)}
            placeholder="e.g. White, Blue, Gold"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-md bg-green-700 px-4 py-2 text-white font-medium hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  )
}
