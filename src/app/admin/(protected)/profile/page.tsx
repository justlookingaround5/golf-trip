'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import InstallPrompt from '@/components/InstallPrompt'

interface Profile {
  display_name: string | null
  avatar_url: string | null
  ghin_number: string | null
  handicap_index: number | null
  home_club: string | null
  home_club_logo_url: string | null
  preferred_tee: string | null
  venmo_username: string | null
  cashapp_cashtag: string | null
  zelle_email: string | null
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
  const [saved, setSaved] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [displayName, setDisplayName] = useState('')
  const [ghinNumber, setGhinNumber] = useState('')
  const [handicapIndex, setHandicapIndex] = useState('')
  const [homeClub, setHomeClub] = useState('')
  const [homeClubLogoUrl, setHomeClubLogoUrl] = useState('')
  const [preferredTee, setPreferredTee] = useState('')
  const [venmoUsername, setVenmoUsername] = useState('')
  const [cashappCashtag, setCashappCashtag] = useState('')
  const [zelleEmail, setZelleEmail] = useState('')

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
        setVenmoUsername(data.venmo_username || '')
        setCashappCashtag(data.cashapp_cashtag || '')
        setZelleEmail(data.zelle_email || '')
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
          venmo_username: venmoUsername || null,
          cashapp_cashtag: cashappCashtag || null,
          zelle_email: zelleEmail || null,
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
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
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
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-golf-100 text-2xl font-bold text-golf-800">
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
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
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
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
            />
            {ghinNumber.trim().length > 0 && (
              <a
                href={`https://www.ghin.com/lookup?ghinNumber=${encodeURIComponent(ghinNumber.trim())}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 whitespace-nowrap"
              >
                Look Up
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5zm7.25-.75a.75.75 0 01.75-.75h3.5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0V6.31l-5.47 5.47a.75.75 0 01-1.06-1.06l5.47-5.47H12.25a.75.75 0 01-.75-.75z" clipRule="evenodd" />
                </svg>
              </a>
            )}
          </div>
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
            placeholder="Enter your index from GHIN"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
          />
          <a
            href="https://www.ghin.com"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
          >
            Look up your index on GHIN.com
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
              <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5zm7.25-.75a.75.75 0 01.75-.75h3.5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0V6.31l-5.47 5.47a.75.75 0 01-1.06-1.06l5.47-5.47H12.25a.75.75 0 01-.75-.75z" clipRule="evenodd" />
            </svg>
          </a>
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
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
          />
          {clubSearchLoading && (
            <div className="absolute right-3 top-9 text-xs text-gray-400">
              Searching...
            </div>
          )}

          {showClubResults && clubSearchResults.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-md border border-golf-300 bg-white shadow-lg ring-1 ring-golf-200">
              <div className="px-3 py-1.5 text-xs font-medium text-golf-700 bg-golf-50 border-b border-golf-200">
                Select your home club
              </div>
              <ul className="max-h-48 overflow-auto py-1">
                {clubSearchResults.map((result) => (
                  <li key={result.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectClub(result)}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-golf-50 border-b border-gray-100 last:border-0"
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
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
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
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
          />
        </div>

        {/* Payment Methods */}
        <div className="border-t border-gray-200 pt-4 mt-2">
          <h3 className="mb-3 text-sm font-semibold text-gray-900 uppercase tracking-wide">Payment Methods</h3>
          <p className="mb-3 text-xs text-gray-500">
            Add your payment handles so other players can pay you easily after a trip.
          </p>
          <div className="space-y-3">
            <div>
              <label htmlFor="venmoUsername" className="mb-1 block text-sm font-medium text-gray-700">
                Venmo Username
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-400">@</span>
                <input
                  id="venmoUsername"
                  type="text"
                  value={venmoUsername}
                  onChange={(e) => setVenmoUsername(e.target.value)}
                  placeholder="username"
                  className="w-full rounded-md border border-gray-300 pl-7 pr-3 py-2 text-gray-900 focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="cashappCashtag" className="mb-1 block text-sm font-medium text-gray-700">
                Cash App
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-400">$</span>
                <input
                  id="cashappCashtag"
                  type="text"
                  value={cashappCashtag}
                  onChange={(e) => setCashappCashtag(e.target.value)}
                  placeholder="cashtag"
                  className="w-full rounded-md border border-gray-300 pl-7 pr-3 py-2 text-gray-900 focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="zelleEmail" className="mb-1 block text-sm font-medium text-gray-700">
                Zelle Email
              </label>
              <input
                id="zelleEmail"
                type="email"
                value={zelleEmail}
                onChange={(e) => setZelleEmail(e.target.value)}
                placeholder="you@email.com"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-md bg-golf-700 px-4 py-2 text-white font-medium hover:bg-golf-800 focus:outline-none focus:ring-2 focus:ring-golf-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Profile'}
        </button>
      </form>

      <div className="mt-6">
        <InstallPrompt />
      </div>
    </div>
  )
}
