'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { Course } from '@/lib/types'
import type { GolfCourseSearchResult } from '@/lib/golf-course-api'

interface HoleInput {
  hole_number: number
  par: number
  handicap_index: number
}

function defaultHoles(): HoleInput[] {
  return Array.from({ length: 18 }, (_, i) => ({
    hole_number: i + 1,
    par: 4,
    handicap_index: i + 1,
  }))
}

export default function CoursesPage() {
  const params = useParams<{ tripId: string }>()
  const router = useRouter()
  const tripId = params.tripId

  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Course fields
  const [courseName, setCourseName] = useState('')
  const [roundNumber, setRoundNumber] = useState(1)
  const [roundDate, setRoundDate] = useState('')
  const [slope, setSlope] = useState<string>('')
  const [rating, setRating] = useState<string>('')
  const [holes, setHoles] = useState<HoleInput[]>(defaultHoles())

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<GolfCourseSearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Computed par total
  const totalPar = holes.reduce((sum, h) => sum + h.par, 0)

  useEffect(() => {
    async function loadCourses() {
      setLoading(true)
      try {
        // Fetch courses for this trip by fetching each course
        // We'll use the trip detail approach - get courses from Supabase via an API call
        const res = await fetch(`/api/trips/${tripId}/courses`)
        if (res.ok) {
          const data = await res.json()
          setCourses(data)
        } else {
          setError('Failed to load courses')
        }
      } catch {
        setError('Failed to load courses')
      } finally {
        setLoading(false)
      }
    }
    loadCourses()
  }, [tripId])

  // Close search dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearchResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounced search
  function handleSearchChange(value: string) {
    setSearchQuery(value)
    setCourseName(value)

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (value.trim().length < 2) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const res = await fetch(`/api/courses/search?q=${encodeURIComponent(value.trim())}`)
        if (res.ok) {
          const data = await res.json()
          setSearchResults(data)
          setShowSearchResults(data.length > 0)
        }
      } catch {
        // ignore search errors
      } finally {
        setSearchLoading(false)
      }
    }, 300)
  }

  // Select a search result and auto-fill from course detail API
  async function handleSelectSearchResult(result: GolfCourseSearchResult) {
    setShowSearchResults(false)
    setSearchQuery('')
    setCourseName(result.course_name || result.club_name)

    // Fetch full course detail to get tee box data (slope, rating, holes)
    try {
      const res = await fetch(`/api/courses/lookup?id=${encodeURIComponent(result.id)}`)
      if (res.ok) {
        const detail = await res.json()
        // Use the first male tee box as default (typically has the most data)
        const teeBox = detail.tees?.male?.[0]
        if (teeBox) {
          if (teeBox.slope_rating) setSlope(String(teeBox.slope_rating))
          if (teeBox.course_rating) setRating(String(teeBox.course_rating))
          if (teeBox.holes && teeBox.holes.length > 0) {
            setHoles(
              teeBox.holes.map((h: { par: number; handicap: number }, i: number) => ({
                hole_number: i + 1,
                par: h.par,
                handicap_index: h.handicap || (i + 1),
              }))
            )
          }
        }
      }
    } catch {
      // Detail fetch failed — user can fill manually
    }
  }

  function resetForm() {
    setCourseName('')
    setRoundNumber(courses.length + 1)
    setRoundDate('')
    setSlope('')
    setRating('')
    setHoles(defaultHoles())
    setEditingCourseId(null)
    setSearchQuery('')
    setSearchResults([])
    setShowSearchResults(false)
    setError(null)
  }

  function openAddForm() {
    resetForm()
    setRoundNumber(courses.length + 1)
    setShowForm(true)
  }

  function openEditForm(course: Course) {
    setCourseName(course.name)
    setRoundNumber(course.round_number)
    setRoundDate(course.round_date || '')
    setSlope(course.slope != null ? String(course.slope) : '')
    setRating(course.rating != null ? String(course.rating) : '')
    setEditingCourseId(course.id)
    setError(null)

    if (course.holes && course.holes.length > 0) {
      const sortedHoles = [...course.holes].sort((a, b) => a.hole_number - b.hole_number)
      setHoles(
        sortedHoles.map((h) => ({
          hole_number: h.hole_number,
          par: h.par,
          handicap_index: h.handicap_index,
        }))
      )
    } else {
      setHoles(defaultHoles())
    }

    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const payload = {
      trip_id: tripId,
      name: courseName.trim(),
      round_number: roundNumber,
      round_date: roundDate || null,
      slope: slope ? Number(slope) : null,
      rating: rating ? Number(rating) : null,
      par: totalPar,
      holes: holes.map((h) => ({
        hole_number: h.hole_number,
        par: h.par,
        handicap_index: h.handicap_index,
      })),
    }

    try {
      const url = editingCourseId
        ? `/api/courses/${editingCourseId}`
        : '/api/courses'
      const method = editingCourseId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save course')
      }

      const savedCourse = await res.json()

      if (editingCourseId) {
        setCourses((prev) =>
          prev.map((c) => (c.id === editingCourseId ? savedCourse : c))
        )
      } else {
        setCourses((prev) => [...prev, savedCourse])
      }

      setShowForm(false)
      resetForm()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(courseId: string) {
    setError(null)
    try {
      const res = await fetch(`/api/courses/${courseId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete course')
      }
      setCourses((prev) => prev.filter((c) => c.id !== courseId))
      setDeletingId(null)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setDeletingId(null)
    }
  }

  function updateHolePar(index: number, par: number) {
    setHoles((prev) => prev.map((h, i) => (i === index ? { ...h, par } : h)))
  }

  function updateHoleHandicap(index: number, handicap_index: number) {
    setHoles((prev) => prev.map((h, i) => (i === index ? { ...h, handicap_index } : h)))
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-gray-500">Loading courses...</div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Course List */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Courses ({courses.length})
          </h3>
          {!showForm && (
            <button
              onClick={openAddForm}
              className="rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
            >
              Add Course
            </button>
          )}
        </div>

        {courses.length === 0 && !showForm ? (
          <p className="text-sm text-gray-500">
            No courses added yet. Add courses for each round of the trip.
          </p>
        ) : (
          <div className="space-y-3">
            {[...courses]
              .sort((a, b) => a.round_number - b.round_number)
              .map((course) => (
                <div
                  key={course.id}
                  className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-4 py-3"
                >
                  <div className="flex items-center gap-4">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-800">
                      R{course.round_number}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">{course.name}</p>
                      <p className="text-xs text-gray-500">
                        Par {course.par}
                        {course.slope != null && <> &middot; Slope {course.slope}</>}
                        {course.rating != null && <> &middot; Rating {course.rating}</>}
                        {course.round_date && (
                          <> &middot; {new Date(course.round_date + 'T00:00:00').toLocaleDateString()}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditForm(course)}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                    >
                      Edit
                    </button>
                    {deletingId === course.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(course.id)}
                          className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeletingId(course.id)}
                        className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            {editingCourseId ? 'Edit Course' : 'Add Course'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Course Name with Search */}
            <div ref={searchContainerRef} className="relative">
              <label htmlFor="course-name" className="mb-1 block text-sm font-medium text-gray-700">
                Course Name
              </label>
              <input
                id="course-name"
                type="text"
                value={courseName}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => {
                  if (searchResults.length > 0) setShowSearchResults(true)
                }}
                placeholder="Search for a course or enter name manually..."
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
              {searchLoading && (
                <div className="absolute right-3 top-9 text-xs text-gray-400">
                  Searching...
                </div>
              )}

              {/* Search Results Dropdown */}
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
                  <ul className="max-h-60 overflow-auto py-1">
                    {searchResults.map((result) => (
                      <li key={result.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectSearchResult(result)}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-green-50"
                        >
                          <span className="font-medium text-gray-900">
                            {result.course_name || result.club_name}
                          </span>
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

            {/* Round Number, Round Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="round-number" className="mb-1 block text-sm font-medium text-gray-700">
                  Round Number
                </label>
                <select
                  id="round-number"
                  value={roundNumber}
                  onChange={(e) => setRoundNumber(Number(e.target.value))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                >
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      Round {n}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="round-date" className="mb-1 block text-sm font-medium text-gray-700">
                  Round Date
                </label>
                <input
                  id="round-date"
                  type="date"
                  value={roundDate}
                  onChange={(e) => setRoundDate(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
              </div>
            </div>

            {/* Slope, Rating */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="slope" className="mb-1 block text-sm font-medium text-gray-700">
                  Slope
                </label>
                <input
                  id="slope"
                  type="number"
                  value={slope}
                  onChange={(e) => setSlope(e.target.value)}
                  placeholder="e.g. 135"
                  min={55}
                  max={155}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
              </div>
              <div>
                <label htmlFor="rating" className="mb-1 block text-sm font-medium text-gray-700">
                  Rating
                </label>
                <input
                  id="rating"
                  type="number"
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  placeholder="e.g. 72.4"
                  step="0.1"
                  min={50}
                  max={90}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
              </div>
            </div>

            {/* Par total display */}
            <div className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">
              Total Par: <span className="font-semibold">{totalPar}</span>
            </div>

            {/* 18-Hole Grid */}
            <div>
              <h4 className="mb-2 text-sm font-medium text-gray-700">Hole Details</h4>

              {/* Front 9 */}
              <div className="mb-4">
                <p className="mb-1 text-xs font-semibold uppercase text-gray-500">Front 9</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-center text-xs">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="px-1 py-1 text-gray-500">Hole</th>
                        {holes.slice(0, 9).map((h) => (
                          <th key={h.hole_number} className="px-1 py-1 font-medium text-gray-700">
                            {h.hole_number}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-100">
                        <td className="px-1 py-1 text-gray-500">Par</td>
                        {holes.slice(0, 9).map((h, i) => (
                          <td key={h.hole_number} className="px-1 py-1">
                            <select
                              value={h.par}
                              onChange={(e) => updateHolePar(i, Number(e.target.value))}
                              className="w-12 rounded border border-gray-300 px-0.5 py-0.5 text-center text-xs focus:border-green-500 focus:outline-none"
                            >
                              <option value={3}>3</option>
                              <option value={4}>4</option>
                              <option value={5}>5</option>
                            </select>
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="px-1 py-1 text-gray-500">Hdcp</td>
                        {holes.slice(0, 9).map((h, i) => (
                          <td key={h.hole_number} className="px-1 py-1">
                            <select
                              value={h.handicap_index}
                              onChange={(e) => updateHoleHandicap(i, Number(e.target.value))}
                              className="w-12 rounded border border-gray-300 px-0.5 py-0.5 text-center text-xs focus:border-green-500 focus:outline-none"
                            >
                              {Array.from({ length: 18 }, (_, n) => (
                                <option key={n + 1} value={n + 1}>
                                  {n + 1}
                                </option>
                              ))}
                            </select>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Back 9 */}
              <div>
                <p className="mb-1 text-xs font-semibold uppercase text-gray-500">Back 9</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-center text-xs">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="px-1 py-1 text-gray-500">Hole</th>
                        {holes.slice(9, 18).map((h) => (
                          <th key={h.hole_number} className="px-1 py-1 font-medium text-gray-700">
                            {h.hole_number}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-100">
                        <td className="px-1 py-1 text-gray-500">Par</td>
                        {holes.slice(9, 18).map((h, i) => (
                          <td key={h.hole_number} className="px-1 py-1">
                            <select
                              value={h.par}
                              onChange={(e) => updateHolePar(i + 9, Number(e.target.value))}
                              className="w-12 rounded border border-gray-300 px-0.5 py-0.5 text-center text-xs focus:border-green-500 focus:outline-none"
                            >
                              <option value={3}>3</option>
                              <option value={4}>4</option>
                              <option value={5}>5</option>
                            </select>
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="px-1 py-1 text-gray-500">Hdcp</td>
                        {holes.slice(9, 18).map((h, i) => (
                          <td key={h.hole_number} className="px-1 py-1">
                            <select
                              value={h.handicap_index}
                              onChange={(e) => updateHoleHandicap(i + 9, Number(e.target.value))}
                              className="w-12 rounded border border-gray-300 px-0.5 py-0.5 text-center text-xs focus:border-green-500 focus:outline-none"
                            >
                              {Array.from({ length: 18 }, (_, n) => (
                                <option key={n + 1} value={n + 1}>
                                  {n + 1}
                                </option>
                              ))}
                            </select>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving || !courseName.trim()}
                className="rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
              >
                {saving
                  ? 'Saving...'
                  : editingCourseId
                    ? 'Update Course'
                    : 'Add Course'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  resetForm()
                }}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
