'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface CourseResult {
  place_id: number
  name: string
  lat: string
  lon: string
  address: {
    leisure?: string
    town?: string
    city?: string
    county?: string
    state?: string
  }
}

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  // Profile fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [location, setLocation] = useState('')
  const [locationSelected, setLocationSelected] = useState(false)
  const [homeClub, setHomeClub] = useState('')
  const [homeClubSelected, setHomeClubSelected] = useState(false)
  const [homeClubLat, setHomeClubLat] = useState<number | null>(null)
  const [homeClubLon, setHomeClubLon] = useState<number | null>(null)
  const [homeClubLogoUrl, setHomeClubLogoUrl] = useState('')

  // Location suggestions state
  const [locationQuery, setLocationQuery] = useState('')
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([])
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false)
  const locationTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const locationContainerRef = useRef<HTMLDivElement>(null)

  // Course search state
  const [courseQuery, setCourseQuery] = useState('')
  const [courseResults, setCourseResults] = useState<CourseResult[]>([])
  const [courseSearchLoading, setCourseSearchLoading] = useState(false)
  const [showCourseResults, setShowCourseResults] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const courseSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const courseContainerRef = useRef<HTMLDivElement>(null)

  // Load profile on mount
  useEffect(() => {
    fetch('/api/profile')
      .then((r) => {
        if (r.status === 401) {
          router.push('/admin/login')
          return null
        }
        return r.json()
      })
      .then((data) => {
        if (!data) return
        const name = data.display_name || ''
        const spaceIdx = name.indexOf(' ')
        if (spaceIdx > 0) {
          setFirstName(name.slice(0, spaceIdx))
          setLastName(name.slice(spaceIdx + 1))
        } else {
          setFirstName(name)
        }
        if (data.location) {
          setLocation(data.location)
          setLocationQuery(data.location)
          setLocationSelected(true)
        }
        if (data.home_club) {
          setHomeClub(data.home_club)
          setCourseQuery(data.home_club)
          setHomeClubSelected(true)
        }
        if (data.home_club_latitude) setHomeClubLat(data.home_club_latitude)
        if (data.home_club_longitude) setHomeClubLon(data.home_club_longitude)
        if (data.home_club_logo_url) setHomeClubLogoUrl(data.home_club_logo_url)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [router])

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (courseContainerRef.current && !courseContainerRef.current.contains(e.target as Node)) {
        setShowCourseResults(false)
      }
      if (locationContainerRef.current && !locationContainerRef.current.contains(e.target as Node)) {
        setShowLocationSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Location search (Open-Meteo geocoding)
  const searchLocations = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setLocationSuggestions([])
      setShowLocationSuggestions(false)
      return
    }
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=5&language=en&format=json&country_code=US`
      )
      if (res.ok) {
        const data = await res.json()
        const results: string[] = (data.results || []).map(
          (r: { name: string; admin1: string }) => `${r.name}, ${r.admin1}`
        )
        const unique = [...new Set(results)]
        setLocationSuggestions(unique)
        setShowLocationSuggestions(unique.length > 0)
      }
    } catch {
      // ignore
    }
  }, [])

  function handleLocationChange(value: string) {
    setLocationQuery(value)
    setLocation('')
    setLocationSelected(false)
    if (locationTimeout.current) clearTimeout(locationTimeout.current)
    locationTimeout.current = setTimeout(() => searchLocations(value), 300)
  }

  function handleSelectLocation(suggestion: string) {
    setLocation(suggestion)
    setLocationQuery(suggestion)
    setLocationSelected(true)
    setShowLocationSuggestions(false)
  }

  function handleClearLocation() {
    setLocation('')
    setLocationQuery('')
    setLocationSelected(false)
    setLocationSuggestions([])
  }

  // Course search (OSM Nominatim)
  const searchCourses = useCallback(async (query: string) => {
    if (query.trim().length < 3) {
      setCourseResults([])
      setShowCourseResults(false)
      return
    }
    setCourseSearchLoading(true)
    setHasSearched(true)
    try {
      const searchQuery = query.trim().toLowerCase().includes('golf')
        ? query.trim()
        : `golf ${query.trim()}`
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=8&countrycodes=us&addressdetails=1&extratags=1`
      )
      if (res.ok) {
        const data = await res.json()
        const golfResults: CourseResult[] = data.filter(
          (r: { type?: string; class?: string; name?: string }) =>
            r.type === 'golf_course' ||
            r.class === 'leisure' ||
            (r.name && r.name.toLowerCase().includes('golf'))
        )
        setCourseResults(golfResults)
        setShowCourseResults(golfResults.length > 0)
      }
    } catch {
      // ignore
    } finally {
      setCourseSearchLoading(false)
    }
  }, [])

  function handleCourseSearchChange(value: string) {
    setCourseQuery(value)
    setHomeClub('')
    setHomeClubSelected(false)
    setHasSearched(false)
    if (courseSearchTimeout.current) clearTimeout(courseSearchTimeout.current)
    courseSearchTimeout.current = setTimeout(() => searchCourses(value), 400)
  }

  function handleSelectCourse(result: CourseResult) {
    const courseName = result.name
    setHomeClub(courseName)
    setCourseQuery(courseName)
    setHomeClubSelected(true)
    setShowCourseResults(false)

    const lat = parseFloat(result.lat)
    const lon = parseFloat(result.lon)
    if (!isNaN(lat) && !isNaN(lon)) {
      setHomeClubLat(lat)
      setHomeClubLon(lon)
    }

    const domain = courseName
      .toLowerCase()
      .replace(/golf\s*(club|course|links|resort|&\s*country\s*club|cc)?/gi, '')
      .replace(/country\s*club/gi, '')
      .replace(/[^a-z0-9]/g, '')
    if (domain.length > 2) {
      setHomeClubLogoUrl(`https://logo.clearbit.com/${domain}golf.com`)
    }

    // Save course immediately
    saveCourse(courseName, lat, lon, domain.length > 2 ? `https://logo.clearbit.com/${domain}golf.com` : homeClubLogoUrl)
  }

  function handleClearCourse() {
    setHomeClub('')
    setCourseQuery('')
    setHomeClubSelected(false)
    setHomeClubLogoUrl('')
    setHomeClubLat(null)
    setHomeClubLon(null)
    setCourseResults([])
    // Save cleared course
    fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        home_club: null,
        home_club_latitude: null,
        home_club_longitude: null,
        home_club_logo_url: null,
      }),
    })
  }

  async function saveCourse(name: string, lat: number, lon: number, logoUrl: string) {
    await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        home_club: name,
        home_club_latitude: isNaN(lat) ? null : lat,
        home_club_longitude: isNaN(lon) ? null : lon,
        home_club_logo_url: logoUrl || null,
      }),
    })
    flashSave()
  }

  async function handleSaveProfile() {
    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: [firstName.trim(), lastName.trim()].filter(Boolean).join(' '),
          location: location.trim() || null,
        }),
      })
      if (res.ok) {
        flashSave()
      }
    } finally {
      setSaving(false)
    }
  }

  function flashSave() {
    setSaveMessage('Saved!')
    setTimeout(() => setSaveMessage(null), 2000)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-golf-700 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <header className="bg-golf-800 px-4 pt-14 pb-6 text-white">
        <div className="mx-auto max-w-lg">
          <Link href="/profile" className="inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white mb-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Profile
          </Link>
          <h1 className="text-xl font-bold">Settings</h1>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-6 space-y-4">
        {/* Save confirmation */}
        {saveMessage && (
          <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm font-medium text-green-700 text-center">
            {saveMessage}
          </div>
        )}

        {/* Profile Section */}
        <Section label="Profile">
          <div className="px-4 py-3.5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="firstName" className="mb-1 block text-xs font-medium text-gray-500">
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="mb-1 block text-xs font-medium text-gray-500">
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
                />
              </div>
            </div>

            {/* Location */}
            <div ref={locationContainerRef} className="relative">
              <label htmlFor="location" className="mb-1 block text-xs font-medium text-gray-500">
                Location
              </label>
              {locationSelected ? (
                <div className="flex items-center gap-2 rounded-md border border-gray-300 bg-gray-50 px-3 py-2">
                  <span className="flex-1 text-sm text-gray-900">{location}</span>
                  <button
                    type="button"
                    onClick={handleClearLocation}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                    </svg>
                  </button>
                </div>
              ) : (
                <input
                  id="location"
                  type="text"
                  value={locationQuery}
                  onChange={(e) => handleLocationChange(e.target.value)}
                  onFocus={() => {
                    if (locationSuggestions.length > 0) setShowLocationSuggestions(true)
                  }}
                  placeholder="Search for your city..."
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
                />
              )}
              {showLocationSuggestions && locationSuggestions.length > 0 && !locationSelected && (
                <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
                  <ul className="max-h-48 overflow-auto py-1">
                    {locationSuggestions.map((suggestion) => (
                      <li key={suggestion}>
                        <button
                          type="button"
                          onClick={() => handleSelectLocation(suggestion)}
                          className="w-full px-4 py-2 text-left text-sm text-gray-900 hover:bg-golf-50 border-b border-gray-100 last:border-0"
                        >
                          {suggestion}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Home Course */}
            <div ref={courseContainerRef} className="relative">
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Home Course
              </label>
              {homeClubSelected ? (
                <div className="flex items-center gap-3 rounded-md border border-gray-300 bg-gray-50 px-3 py-2.5">
                  {homeClubLogoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={homeClubLogoUrl}
                      alt=""
                      className="h-6 w-6 rounded-full object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  )}
                  <span className="flex-1 text-sm font-medium text-gray-900">{homeClub}</span>
                  <button
                    type="button"
                    onClick={handleClearCourse}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                    </svg>
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={courseQuery}
                    onChange={(e) => handleCourseSearchChange(e.target.value)}
                    onFocus={() => {
                      if (courseResults.length > 0) setShowCourseResults(true)
                    }}
                    placeholder="Search for your home course..."
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
                  />
                  {courseSearchLoading && (
                    <div className="absolute right-3 top-7 text-xs text-gray-400">
                      Searching...
                    </div>
                  )}
                </>
              )}

              {showCourseResults && courseResults.length > 0 && !homeClubSelected && (
                <div className="absolute z-10 mt-1 w-full rounded-md border border-golf-300 bg-white shadow-lg ring-1 ring-golf-200">
                  <div className="px-3 py-1.5 text-xs font-medium text-golf-700 bg-golf-50 border-b border-golf-200">
                    Select your home course
                  </div>
                  <ul className="max-h-48 overflow-auto py-1">
                    {courseResults.map((result) => {
                      const city = result.address?.city || result.address?.town || ''
                      const state = result.address?.state || ''
                      return (
                        <li key={result.place_id}>
                          <button
                            type="button"
                            onClick={() => handleSelectCourse(result)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-golf-50 border-b border-gray-100 last:border-0"
                          >
                            <div className="font-medium text-gray-900">{result.name}</div>
                            {(city || state) && (
                              <div className="text-xs text-gray-500">
                                {[city, state].filter(Boolean).join(', ')}
                              </div>
                            )}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}

              {hasSearched && !courseSearchLoading && !homeClubSelected && courseQuery.trim().length >= 3 && courseResults.length === 0 && (
                <p className="mt-1 text-xs text-gray-500">
                  No courses found. Try a different search term.
                </p>
              )}
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="w-full rounded-md bg-golf-700 px-4 py-2 text-sm font-medium text-white hover:bg-golf-800 disabled:opacity-50 transition"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </Section>

        {/* Other Settings */}
        <Section label="Preferences">
          <SettingRow label="Notification preferences" icon="🔔" />
          <SettingRow label="Default round format" icon="🏌️" />
          <SettingRow label="Privacy" icon="🔒" />
          <SettingRow label="Currency" icon="💰" />
        </Section>

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className="w-full rounded-xl border border-red-200 bg-white py-3.5 text-sm font-semibold text-red-600 hover:bg-red-50 shadow-sm transition active:scale-95"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <p className="px-4 pt-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
        {label}
      </p>
      <div className="divide-y divide-gray-100">{children}</div>
    </div>
  )
}

function SettingRow({ label, icon }: { label: string; icon: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition">
      <span className="text-lg w-6 text-center shrink-0">{icon}</span>
      <span className="flex-1 text-sm font-medium text-gray-900">{label}</span>
      <span className="text-xs text-gray-400">Coming soon</span>
    </div>
  )
}
