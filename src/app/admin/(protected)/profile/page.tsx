'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'

interface Profile {
  display_name: string | null
  avatar_url: string | null
  ghin_number: string | null
  handicap_index: number | null
  home_club: string | null
  home_club_logo_url: string | null
  preferred_tee: string | null
}

interface ClubSearchResult {
  id: number
  club_name: string
  course_name: string
  location: {
    city: string
    state: string
  }
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
  const [homeClubLogoUrl, setHomeClubLogoUrl] = useState('')
  const [preferredTee, setPreferredTee] = useState('')

  // Club search state
  const [clubSearchQuery, setClubSearchQuery] = useState('')
  const [clubSearchResults, setClubSearchResults] = useState<ClubSearchResult[]>([])
  const [clubSearchLoading, setClubSearchLoading] = useState(false)
  const [showClubResults, setShowClubResults] = useState(false)
  const clubSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clubContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setMessage({ type: 'error', text: data.error })
          return
        }
        setProfile(data)
        setDisplayName(data.display_name || '')
        setGhinNumber(data.ghin_number || '')
        setHandicapIndex(data.handicap_index != null ? String(data.handicap_index) : '')
        setHomeClub(data.home_club || '')
        setHomeClubLogoUrl(data.home_club_logo_url || '')
        setPreferredTee(data.preferred_tee || '')
      })
      .catch(() => setMessage({ type: 'error', text: 'Failed to load profile' }))
      .finally(() => setLoading(false))
  }, [])

  // Close club search dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (clubContainerRef.current && !clubContainerRef.current.contains(e.target as Node)) {
        setShowClubResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleClubSearchChange(value: string) {
    setClubSearchQuery(value)
    setHomeClub(value)

    if (clubSearchTimeout.current) clearTimeout(clubSearchTimeout.current)

    if (value.trim().length < 2) {
      setClubSearchResults([])
      setShowClubResults(false)
      return
    }

    clubSearchTimeout.current = setTimeout(async () => {
      setClubSearchLoading(true)
      try {
        const res = await fetch(`/api/courses/search?q=${encodeURIComponent(value.trim())}`)
        if (res.ok) {
          const data = await res.json()
          // Deduplicate by club_name
          const seen = new Set<string>()
          const unique = data.filter((r: ClubSearchResult) => {
            const key = r.club_name.toLowerCase()
            if (seen.has(key)) return false
            seen.add(key)
            return true
          })
          setClubSearchResults(unique)
          setShowClubResults(unique.length > 0)
        }
      } catch {
        // ignore search errors
      } finally {
        setClubSearchLoading(false)
      }
    }, 300)
  }

  function handleSelectClub(result: ClubSearchResult) {
    setShowClubResults(false)
    setClubSearchQuery('')
    setHomeClub(result.club_name)

    // Try to find a logo using Google's favicon service
    // Guess the domain from the club name (e.g., "Hawkshead" → "hawkshead.com")
    const domain = result.club_name
      .toLowerCase()
      .replace(/golf\s*(club|course|links|resort|&\s*country\s*club|cc)?/gi, '')
      .replace(/country\s*club/gi, '')
      .replace(/[^a-z0-9]/g, '')
    if (domain.length > 2) {
      // Try common golf club domain patterns
      const logoUrl = `https://logo.clearbit.com/${domain}golf.com`
      setHomeClubLogoUrl(logoUrl)
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
          home_club_logo_url: homeClubLogoUrl || null,
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

      {/* Avatar + Club Logo */}
      <div className="mb-6 flex items-center justify-center gap-4">
        {profile?.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt="Profile photo"
            width={80}
            height={80}
            className="rounded-full"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-2xl font-bold text-green-800">
            {displayName?.[0]?.toUpperCase() || '?'}
          </div>
        )}
        {homeClubLogoUrl && (
          <div className="flex flex-col items-center gap-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={homeClubLogoUrl}
              alt={homeClub || 'Club logo'}
              width={48}
              height={48}
              className="h-12 w-12 rounded-lg object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
            <span className="text-xs text-gray-500">{homeClub}</span>
          </div>
        )}
      </div>

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

        {/* Home Club with Search */}
        <div ref={clubContainerRef} className="relative">
          <label htmlFor="homeClub" className="mb-1 block text-sm font-medium text-gray-700">
            Home Club
          </label>
          <input
            id="homeClub"
            type="text"
            value={homeClub}
            onChange={(e) => handleClubSearchChange(e.target.value)}
            onFocus={() => {
              if (clubSearchResults.length > 0) setShowClubResults(true)
            }}
            placeholder="Search for your club..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          />
          {clubSearchLoading && (
            <div className="absolute right-3 top-9 text-xs text-gray-400">
              Searching...
            </div>
          )}

          {showClubResults && clubSearchResults.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-md border border-green-300 bg-white shadow-lg ring-1 ring-green-200">
              <div className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border-b border-green-200">
                Select your home club
              </div>
              <ul className="max-h-48 overflow-auto py-1">
                {clubSearchResults.map((result) => (
                  <li key={result.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectClub(result)}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-green-50 border-b border-gray-100 last:border-0"
                    >
                      <span className="font-medium text-gray-900">{result.club_name}</span>
                      <span className="ml-2 text-gray-500">
                        {result.location?.city}, {result.location?.state}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Club Logo URL (hidden but editable for manual override) */}
        {homeClub && (
          <div>
            <label htmlFor="clubLogoUrl" className="mb-1 block text-sm font-medium text-gray-700">
              Club Logo URL <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              id="clubLogoUrl"
              type="url"
              value={homeClubLogoUrl}
              onChange={(e) => setHomeClubLogoUrl(e.target.value)}
              placeholder="Paste a URL to your club's logo"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Tip: right-click your club&apos;s logo on their website and &quot;Copy image address&quot;
            </p>
          </div>
        )}

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
