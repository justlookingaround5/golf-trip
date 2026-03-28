'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
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

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-golf-700 border-t-transparent" />
      </div>
    }>
      <OnboardingForm />
    </Suspense>
  )
}

function OnboardingForm() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Profile fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [location, setLocation] = useState('')
  const [locationSelected, setLocationSelected] = useState(false)
  const [homeClub, setHomeClub] = useState('')
  const [homeClubSelected, setHomeClubSelected] = useState(false)
  const [ghinNumber, setGhinNumber] = useState('')
  const [homeClubLogoUrl, setHomeClubLogoUrl] = useState('')
  const [homeClubLat, setHomeClubLat] = useState<number | null>(null)
  const [homeClubLon, setHomeClubLon] = useState<number | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

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
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auth guard + pre-fill
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
        if (data.onboarding_completed) {
          router.push('/')
          return
        }
        const name = data.display_name || ''
        const spaceIdx = name.indexOf(' ')
        if (spaceIdx > 0) {
          setFirstName(name.slice(0, spaceIdx))
          setLastName(name.slice(spaceIdx + 1))
        } else {
          setFirstName(name)
        }
        setAvatarUrl(data.avatar_url || null)
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
        setGhinNumber(data.ghin_number || '')
        setHomeClubLogoUrl(data.home_club_logo_url || '')
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load profile')
        setLoading(false)
      })
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

  function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB')
      return
    }

    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  // Location suggestions using the Open-Meteo geocoding API
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
    // If user edits after selecting, clear the selection
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

  // Course search using OSM Nominatim (free, no API key needed)
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
        // Filter to golf-related results
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
      // ignore search errors
    } finally {
      setCourseSearchLoading(false)
    }
  }, [])

  function handleCourseSearchChange(value: string) {
    setCourseQuery(value)
    // If user edits after selecting, clear the selection
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

    // Save coordinates from Nominatim result
    const lat = parseFloat(result.lat)
    const lon = parseFloat(result.lon)
    if (!isNaN(lat) && !isNaN(lon)) {
      setHomeClubLat(lat)
      setHomeClubLon(lon)
    }

    // Auto-fill location from the course if user hasn't set one yet
    const city = result.address?.city || result.address?.town || ''
    const state = result.address?.state || ''
    if (!locationSelected && city && state) {
      const loc = `${city}, ${state}`
      setLocation(loc)
      setLocationQuery(loc)
      setLocationSelected(true)
    }

    const domain = courseName
      .toLowerCase()
      .replace(/golf\s*(club|course|links|resort|&\s*country\s*club|cc)?/gi, '')
      .replace(/country\s*club/gi, '')
      .replace(/[^a-z0-9]/g, '')
    if (domain.length > 2) {
      setHomeClubLogoUrl(`https://logo.clearbit.com/${domain}golf.com`)
    }
  }

  function handleClearCourse() {
    setHomeClub('')
    setCourseQuery('')
    setHomeClubSelected(false)
    setHomeClubLogoUrl('')
    setCourseResults([])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!firstName.trim() || !lastName.trim()) {
      setError('First and last name are required')
      return
    }

    setSubmitting(true)

    try {
      let newAvatarUrl = avatarUrl

      // Upload avatar if selected
      if (avatarFile) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/admin/login')
          return
        }

        const ext = avatarFile.name.split('.').pop() || 'jpg'
        const path = `${user.id}/${Date.now()}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, avatarFile, {
            contentType: avatarFile.type,
            upsert: false,
          })

        if (uploadError) {
          setError('Failed to upload avatar: ' + uploadError.message)
          setSubmitting(false)
          return
        }

        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(path)

        newAvatarUrl = urlData.publicUrl
      }

      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: [firstName.trim(), lastName.trim()].filter(Boolean).join(' '),
          location: location.trim() || null,
          home_club: homeClub || null,
          ghin_number: ghinNumber.trim() || null,
          home_club_logo_url: homeClubLogoUrl || null,
          home_club_latitude: homeClubLat,
          home_club_longitude: homeClubLon,
          avatar_url: newAvatarUrl,
          onboarding_completed: true,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        setError(err.error || 'Failed to save profile')
        setSubmitting(false)
        return
      }

      router.push('/')
    } catch {
      setError('Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-golf-700 border-t-transparent" />
      </div>
    )
  }

  const displayedAvatar = avatarPreview || avatarUrl

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12 pb-24 sm:py-16 sm:pb-32">
      <div className="mx-auto w-full max-w-lg rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-2 text-center text-2xl font-bold text-gray-900">
          Welcome to ForeLive!
        </h1>
        <p className="mb-6 text-center text-sm text-gray-600">
          Let&apos;s set up your profile.
        </p>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Profile Photo */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative h-24 w-24 overflow-hidden rounded-full border-2 border-dashed border-gray-300 hover:border-golf-500 focus:outline-none focus:ring-2 focus:ring-golf-500 focus:ring-offset-2"
            >
              {displayedAvatar ? (
                <Image
                  src={displayedAvatar}
                  alt="Profile photo"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-golf-50 text-2xl font-bold text-golf-700">
                  {firstName?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white" className="h-6 w-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
                </svg>
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              onChange={handleAvatarSelect}
              className="hidden"
            />
            <p className="mt-2 text-xs text-gray-500">Click to upload a photo</p>
          </div>

          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="firstName" className="mb-1 block text-sm font-medium text-gray-700">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                placeholder="First"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="mb-1 block text-sm font-medium text-gray-700">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                placeholder="Last"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
              />
            </div>
          </div>

          {/* Location — selection only */}
          <div ref={locationContainerRef} className="relative">
            <label htmlFor="location" className="mb-1 block text-sm font-medium text-gray-700">
              Location
            </label>
            {locationSelected ? (
              <div className="flex items-center gap-2 rounded-md border border-gray-300 bg-gray-50 px-3 py-2">
                <span className="flex-1 text-gray-900">{location}</span>
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
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
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

          {/* GHIN Number */}
          <div>
            <label htmlFor="ghinNumber" className="mb-1 block text-sm font-medium text-gray-700">
              GHIN Number
            </label>
            <input
              id="ghinNumber"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={ghinNumber}
              onChange={(e) => setGhinNumber(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g. 1234567"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Your GHIN number is found on your USGA golf card or at ghin.com
            </p>
          </div>

          {/* Home Course — selection only */}
          <div ref={courseContainerRef} className="relative">
            <label htmlFor="homeClub" className="mb-1 block text-sm font-medium text-gray-700">
              Home Course
            </label>
            {homeClubSelected ? (
              <div className="flex items-center gap-2 rounded-md border border-gray-300 bg-gray-50 px-3 py-2">
                <span className="flex-1 text-gray-900">{homeClub}</span>
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
              <input
                id="homeClub"
                type="text"
                value={courseQuery}
                onChange={(e) => handleCourseSearchChange(e.target.value)}
                onFocus={() => {
                  if (courseResults.length > 0) setShowCourseResults(true)
                }}
                placeholder="Search for your course..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
              />
            )}
            {courseSearchLoading && !homeClubSelected && (
              <div className="absolute right-3 top-9 text-xs text-gray-400">
                Searching...
              </div>
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
                          <div className="font-medium text-gray-900">
                            {result.name}
                          </div>
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
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-golf-700 px-4 py-2.5 text-white font-medium hover:bg-golf-800 focus:outline-none focus:ring-2 focus:ring-golf-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Setting up...' : 'Get Started'}
          </button>
        </form>
      </div>
    </div>
  )
}
