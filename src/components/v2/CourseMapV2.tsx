'use client'

// Reuses react-simple-maps (already installed) with red dots per the v2 spec.
// Pins include a rating field; popup shows course, date, score, trip, and stars.

import { useState } from 'react'
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps'
import type { CoursePinV2 } from '@/lib/v2/types'

const GEO_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json'

function Rating({ rating }: { rating: number | null }) {
  if (rating == null) return <span className="text-xs text-gray-400">Unrated</span>
  return (
    <span className="text-sm font-bold text-gray-900 tabular-nums">{rating.toFixed(1)}</span>
  )
}

interface CourseMapV2Props {
  pins: CoursePinV2[]
}

export default function CourseMapV2({ pins }: CourseMapV2Props) {
  const [selected, setSelected] = useState<CoursePinV2 | null>(null)

  if (pins.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-8 text-center">
        <span className="text-3xl">🗺️</span>
        <p className="mt-2 text-sm text-gray-500">No rounds logged yet.</p>
      </div>
    )
  }

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

          {pins.map(pin => {
            const isSelected = selected?.courseId === pin.courseId
            return (
              <Marker
                key={pin.courseId}
                coordinates={[pin.longitude, pin.latitude]}
                onClick={() => setSelected(isSelected ? null : pin)}
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
      {selected && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 truncate">{selected.courseName}</p>
              {selected.tripName && (
                <p className="text-xs text-gray-500">{selected.tripName}</p>
              )}
              <p className="text-xs text-gray-400">
                {new Date(selected.date + 'T12:00:00').toLocaleDateString('en-US', {
                  weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                })}
              </p>
              <div className="mt-1">
                <Rating rating={selected.rating} />
              </div>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="shrink-0 text-gray-400 hover:text-gray-600 text-lg leading-none"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {(selected.grossScore != null || selected.netScore != null) && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Tile label="Gross"  value={selected.grossScore ?? '—'} />
              <Tile label="Net"    value={selected.netScore ?? '—'} />
              {selected.grossScore != null && (
                <Tile
                  label="vs Par"
                  value={(() => {
                    const d = selected.grossScore - selected.par
                    return d === 0 ? 'E' : d > 0 ? `+${d}` : `${d}`
                  })()}
                  valueClass={
                    selected.grossScore - selected.par < 0
                      ? 'text-red-600'
                      : selected.grossScore - selected.par > 0
                        ? 'text-blue-600'
                        : 'text-gray-600'
                  }
                />
              )}
            </div>
          )}
        </div>
      )}

      <p className="text-center text-xs text-gray-400">
        {pins.length} course{pins.length !== 1 ? 's' : ''} played · tap a dot for details
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
