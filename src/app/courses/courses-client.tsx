'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { CourseListItem } from '@/lib/v2/courses-data'

const STATE_NAMES: Record<string, string> = {
  AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',
  CO:'Colorado',CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',
  HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',
  KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',
  MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',
  MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',
  NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',
  OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',
  SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',
  VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',
}

export default function CoursesClient({ courses }: { courses: CourseListItem[] }) {
  const [search, setSearch] = useState('')
  const [selectedState, setSelectedState] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  // Unique state abbreviations that have courses
  const stateAbbrevs = useMemo(() => {
    const set = new Set<string>()
    for (const c of courses) {
      if (c.state) set.add(c.state)
    }
    return [...set].sort()
  }, [courses])

  // All 50 states for the sheet, sorted alphabetically
  const allStates = useMemo(() => {
    return Object.entries(STATE_NAMES)
      .map(([abbr, name]) => ({ abbr, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [])

  // Attach original rank (1-based) before filtering
  const ranked = useMemo(() => courses.map((c, i) => ({ ...c, rank: i + 1 })), [courses])

  const filtered = useMemo(() => {
    let list = ranked
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(c => c.courseName.toLowerCase().includes(q))
    }
    if (selectedState) {
      list = list.filter(c => c.state === selectedState)
    }
    return list
  }, [ranked, search, selectedState])

  const selectedLabel = selectedState
    ? (STATE_NAMES[selectedState] || selectedState)
    : 'All States'

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="bg-golf-800 px-4 pt-14 pb-6 text-white">
        <div className="mx-auto max-w-lg">
          <h1 className="text-xl font-bold">Courses</h1>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-4 space-y-4">
        {/* Search + state filter trigger */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search courses..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
            />
          </div>
          {allStates.length >= 1 && (
            <button
              onClick={() => setSheetOpen(true)}
              className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-200 transition shrink-0"
            >
              {selectedState && <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />}
              {selectedLabel}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          )}
        </div>

        {/* Course list */}
        {filtered.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-8 text-center">
            <p className="text-sm text-gray-400">
              {courses.length === 0
                ? 'No courses have been rated yet. Rate a course after playing a round!'
                : 'No courses match your search.'}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100 shadow-sm overflow-hidden">
            {filtered.map((course, i) => (
              <Link
                key={course.courseId}
                href={`/course/${course.courseId}?from=courses`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition"
              >
                <span className="shrink-0 w-5 text-xs font-bold text-gray-400 tabular-nums text-right">{selectedState ? i + 1 : course.rank}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">{course.courseName}</p>
                  {course.location && (
                    <p className="text-xs text-gray-400 mt-0.5">{course.location}</p>
                  )}
                </div>
                {course.overallRating != null && (
                  <span className="shrink-0 ml-3 text-sm font-bold text-gray-900 tabular-nums">
                    {course.overallRating.toFixed(1)}
                  </span>
                )}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-gray-300 shrink-0">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* State filter sheet — matches map component pattern */}
      {sheetOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[60]" onClick={() => setSheetOpen(false)} />
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 pointer-events-none">
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden pointer-events-auto">
              <div className="overflow-y-auto max-h-72 divide-y divide-gray-100 [scrollbar-gutter:stable]">
                <button
                  onClick={() => { setSelectedState(null); setSheetOpen(false) }}
                  className={`w-full text-left px-4 py-3 text-sm font-semibold flex items-center gap-2 ${
                    selectedState === null ? 'text-blue-700' : 'text-gray-700'
                  }`}
                >
                  {selectedState === null && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="shrink-0">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                  All States
                </button>
                {Object.entries(
                  allStates.reduce<Record<string, { abbr: string; name: string }[]>>((acc, s) => {
                    const letter = s.name[0].toUpperCase()
                    ;(acc[letter] ??= []).push(s)
                    return acc
                  }, {})
                ).map(([letter, group]) => (
                  <div key={letter}>
                    <div className="sticky top-0 bg-white pl-4 pr-4 py-1">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{letter}</span>
                    </div>
                    {group.map(s => (
                      <button
                        key={s.abbr}
                        onClick={() => { setSelectedState(s.abbr); setSheetOpen(false) }}
                        className={`w-full text-left px-4 py-3 text-sm flex items-center gap-2 border-b border-gray-100 last:border-b-0 ${
                          selectedState === s.abbr ? 'font-semibold text-blue-700' : 'text-gray-700'
                        }`}
                      >
                        {selectedState === s.abbr && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="shrink-0">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                        {s.name}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
