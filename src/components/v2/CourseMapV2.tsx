'use client'

// Reuses react-simple-maps (already installed) with red dots per the v2 spec.
// Pins include a rating field; popup shows course, date, score, trip, and stars.

import { useState } from 'react'
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps'
import type { CoursePinV2 } from '@/lib/v2/types'

const GEO_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json'

interface CourseMapV2Props {
  pins: CoursePinV2[]
}

export default function CourseMapV2({ pins }: CourseMapV2Props) {
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)

  if (pins.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-8 text-center">
        <span className="text-3xl">🗺️</span>
        <p className="mt-2 text-sm text-gray-500">No rounds logged yet.</p>
      </div>
    )
  }

  // Deduplicate pins by courseId (show one marker per course)
  const uniquePins = new Map<string, CoursePinV2>()
  for (const pin of pins) {
    if (!uniquePins.has(pin.courseId)) uniquePins.set(pin.courseId, pin)
  }

  // Aggregate data for selected course
  const selectedPin = selectedCourseId ? uniquePins.get(selectedCourseId) ?? null : null
  const courseAgg = selectedCourseId ? (() => {
    const coursePins = pins.filter(p => p.courseId === selectedCourseId)
    const grossScores = coursePins.map(p => p.grossScore).filter((s): s is number => s != null)
    const bestGross = grossScores.length > 0 ? Math.min(...grossScores) : null
    const bestPin = bestGross != null ? coursePins.find(p => p.grossScore === bestGross) : null
    const par = bestPin?.par ?? coursePins[0]?.par ?? 72
    const bestVsPar = bestGross != null ? bestGross - par : null
    const dates = coursePins.map(p => p.date).filter(Boolean)
    const mostRecentDate = dates.length > 0 ? [...dates].sort().at(-1)! : null
    return { bestGross, bestVsPar, par, roundCount: coursePins.length, mostRecentDate }
  })() : null

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <ComposableMap
          projection="geoAlbersUsa"
          style={{ width: '100%', height: 'auto' }}
          projectionConfig={{ scale: 900 }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map(geo => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#F3F4F6"
                  stroke="#D1D5DB"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: 'none' },
                    hover:   { outline: 'none', fill: '#E5E7EB' },
                    pressed: { outline: 'none' },
                  }}
                />
              ))
            }
          </Geographies>

          {[...uniquePins.values()].map(pin => {
            const isSelected = selectedCourseId === pin.courseId
            return (
              <Marker
                key={pin.courseId}
                coordinates={[pin.longitude, pin.latitude]}
                onClick={() => setSelectedCourseId(isSelected ? null : pin.courseId)}
              >
                <circle
                  r={isSelected ? 14 : 11}
                  fill={isSelected ? '#b91c1c' : '#ef4444'}
                  stroke="white"
                  strokeWidth={2}
                  style={{ cursor: 'pointer', transition: 'r 0.15s, fill 0.15s' }}
                />
              </Marker>
            )
          })}
        </ComposableMap>
      </div>

      {/* Selected pin popup */}
      {selectedPin && courseAgg && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 transition-colors">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-900 truncate">{selectedPin.courseName}</p>
              {selectedPin.tripName && (
                <p className="text-xs text-gray-500">{selectedPin.tripName}</p>
              )}
              {courseAgg.mostRecentDate && (
                <p className="text-xs text-gray-500 mt-0.5">
                  Last played {new Date(courseAgg.mostRecentDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              )}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setSelectedCourseId(null) }}
              className="shrink-0 text-gray-400 hover:text-gray-600 text-lg leading-none ml-1"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <Tile
              label="Rounds"
              value={courseAgg.roundCount}
            />
            <Tile
              label="Best Gross"
              value={courseAgg.bestGross ?? '—'}
            />
            <Tile
              label="vs Par"
              value={courseAgg.bestVsPar == null ? '—' : courseAgg.bestVsPar === 0 ? 'E' : courseAgg.bestVsPar > 0 ? `+${courseAgg.bestVsPar}` : `${courseAgg.bestVsPar}`}
              valueClass={
                courseAgg.bestVsPar == null ? 'text-gray-900'
                  : courseAgg.bestVsPar < 0 ? 'text-red-600'
                    : courseAgg.bestVsPar > 0 ? 'text-blue-600'
                      : 'text-gray-600'
              }
            />
          </div>
        </div>
      )}

      <p className="text-center text-xs text-gray-400">
        {uniquePins.size} course{uniquePins.size !== 1 ? 's' : ''} played · tap a dot for details
      </p>
    </div>
  )
}

function Tile({
  label,
  value,
  valueClass = 'text-gray-900',
}: {
  label: string
  value: string | number
  valueClass?: string
}) {
  return (
    <div className="rounded-lg bg-white border border-red-100 px-2 py-2 text-center">
      <p className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-base font-bold ${valueClass}`}>{value}</p>
    </div>
  )
}
