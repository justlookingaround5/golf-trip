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
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [displayName, setDisplayName] = useState('')
  const [ghinNumber, setGhinNumber] = useState('')
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
          <input
            id="ghinNumber"
            type="text"
            value={ghinNumber}
            onChange={(e) => setGhinNumber(e.target.value)}
            placeholder="e.g. 1234567"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          />
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
          <p className="mt-1 text-xs text-gray-500">
            Find your index at <a href="https://www.ghin.com" target="_blank" rel="noopener noreferrer" className="text-green-700 underline">ghin.com</a>
          </p>
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
