'use client'

import { useState } from 'react'
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps'

const GEO_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json'

export interface CoursePinData {
  courseId: string
  courseName: string
  tripName: string
  roundDate: string | null
  gross: number | null
  net: number | null
  par: number
  latitude: number
  longitude: number
}

export default function CourseMap({ pins }: { pins: CoursePinData[] }) {
  const [selected, setSelected] = useState<CoursePinData | null>(null)

  if (pins.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-8 text-center">
        <span className="text-3xl">⛳</span>
        <p className="mt-2 text-sm text-gray-500">No course location data yet.</p>
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
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#F3F4F6"
                  stroke="#D1D5DB"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: 'none' },
                    hover: { outline: 'none', fill: '#E5E7EB' },
                    pressed: { outline: 'none' },
                  }}
                />
              ))
            }
          </Geographies>

          {pins.map((pin) => {
            const isSelected = selected?.courseId === pin.courseId
            return (
              <Marker
                key={pin.courseId}
                coordinates={[pin.longitude, pin.latitude]}
                onClick={() => setSelected(isSelected ? null : pin)}
              >
                <circle
                  r={isSelected ? 9 : 7}
                  fill={isSelected ? '#15803d' : '#22c55e'}
                  stroke="white"
                  strokeWidth={2}
                  style={{ cursor: 'pointer', transition: 'r 0.15s, fill 0.15s' }}
                />
              </Marker>
            )
          })}
        </ComposableMap>
      </div>

      {/* Selected pin detail card */}
      {selected && (
        <div className="rounded-xl border border-golf-200 bg-golf-50 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-gray-900">{selected.courseName}</p>
              <p className="text-xs text-gray-500">{selected.tripName}</p>
              {selected.roundDate && (
                <p className="text-xs text-gray-400">
                  {new Date(selected.roundDate + 'T12:00:00').toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              )}
            </div>
            <button
              onClick={() => setSelected(null)}
              className="shrink-0 text-gray-400 hover:text-gray-600 text-lg leading-none"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {(selected.gross != null || selected.net != null) && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              <ScoreTile label="Gross" value={selected.gross ?? '—'} />
              <ScoreTile label="Net" value={selected.net ?? '—'} />
              {selected.gross != null && (
                <ScoreTile
                  label="vs Par"
                  value={(() => {
                    const d = selected.gross - selected.par
                    return d === 0 ? 'E' : d > 0 ? `+${d}` : `${d}`
                  })()}
                  valueClass={
                    selected.gross - selected.par < 0
                      ? 'text-red-600'
                      : selected.gross - selected.par > 0
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
        {pins.length} course{pins.length !== 1 ? 's' : ''} played · tap a pin for details
      </p>
    </div>
  )
}

function ScoreTile({
  label,
  value,
  valueClass = 'text-gray-900',
}: {
  label: string
  value: string | number
  valueClass?: string
}) {
  return (
    <div className="rounded-lg bg-white border border-golf-100 px-2 py-2 text-center">
      <p className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-base font-bold ${valueClass}`}>{value}</p>
    </div>
  )
}
