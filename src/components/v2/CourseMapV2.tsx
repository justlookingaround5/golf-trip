'use client'

// Reuses react-simple-maps (already installed) with pin markers per the v2 spec.
// Pins include a rating field; popup shows course, date, score, trip, and stars.

import { useState, useMemo, useRef, useCallback } from 'react'
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps'
import { geoContains, geoAlbersUsa, geoPath as d3GeoPath } from 'd3-geo'
import type { CoursePinV2 } from '@/lib/v2/types'

const GEO_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json'

// Base map dimensions used by react-simple-maps with geoAlbersUsa at scale 900
const MAP_WIDTH = 800
const MAP_HEIGHT = 600
const BASE_SCALE = 900
const PADDING = 0.85 // 15% padding around state bounds

interface CourseMapV2Props {
  pins: CoursePinV2[]
  homeCourse?: { name: string; latitude: number; longitude: number } | null
}

// Classic map pin SVG path (teardrop with cutout for inner circle)
// Origin at the pin tip (bottom), pin extends upward
const PIN_PATH = 'M0,0 C-1,-6 -7,-10 -7,-16 A7,7,0,1,1,7,-16 C7,-10 1,-6 0,0z'

// 5-point star path centered at origin, radius ~10
const STAR_PATH = 'M0,-10 L2.9,-3.1 10,-3.1 4.5,2.4 6.9,9.5 0,5.2 -6.9,9.5 -4.5,2.4 -10,-3.1 -2.9,-3.1Z'

export default function CourseMapV2({ pins, homeCourse }: CourseMapV2Props) {
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [selectedState, setSelectedState] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [geoData, setGeoData] = useState<any[]>([])
  const geoDataRef = useRef<any[]>([])

  // Stable callback for capturing geo data — avoids the pendingRef/useEffect dance
  const captureGeoData = useCallback((geographies: any[]) => {
    if (geoDataRef.current.length === 0 && geographies.length > 0) {
      geoDataRef.current = geographies
      queueMicrotask(() => setGeoData(geographies))
    }
  }, [])

  // Deduplicate pins by courseId (show one marker per course)
  const uniquePins = useMemo(() => {
    const map = new Map<string, CoursePinV2>()
    for (const pin of pins) {
      if (!map.has(pin.courseId)) map.set(pin.courseId, pin)
    }
    return map
  }, [pins])

  // Map each pin to its state using geoContains
  const pinStateMap = useMemo(() => {
    const map = new Map<string, string>()
    if (geoData.length === 0) return map
    for (const pin of uniquePins.values()) {
      for (const geo of geoData) {
        if (geoContains(geo, [pin.longitude, pin.latitude])) {
          map.set(pin.courseId, geo.properties.name)
          break
        }
      }
    }
    return map
  }, [geoData, uniquePins])

  // Determine which state the home course is in
  const homeCourseState = useMemo(() => {
    if (!homeCourse || geoData.length === 0) return null
    for (const geo of geoData) {
      if (geoContains(geo, [homeCourse.longitude, homeCourse.latitude])) {
        return geo.properties.name as string
      }
    }
    return null
  }, [homeCourse, geoData])

  const showHomeCourse = homeCourse && (!selectedState || selectedState === homeCourseState)

  // All 50 US state names from geo data (excludes DC, territories, etc.)
  const allStates = useMemo(() => {
    const exclude = new Set(['District of Columbia', 'Puerto Rico', 'United States Virgin Islands', 'American Samoa', 'Guam', 'Commonwealth of the Northern Mariana Islands'])
    return geoData.map(g => g.properties.name as string).filter(n => !exclude.has(n)).sort()
  }, [geoData])

  // Zoom config for selected state — uses geoPath.bounds() for proper fit
  const defaultCenter: [number, number] = [-96, 38]
  const zoomConfig = useMemo(() => {
    if (!selectedState || geoData.length === 0) {
      return { center: defaultCenter, zoom: 1 }
    }
    const geo = geoData.find(g => g.properties.name === selectedState)
    if (!geo) return { center: defaultCenter, zoom: 1 }

    const proj = geoAlbersUsa().scale(BASE_SCALE).translate([MAP_WIDTH / 2, MAP_HEIGHT / 2])
    const pathGen = d3GeoPath().projection(proj)
    const bounds = pathGen.bounds(geo)
    if (!bounds || !isFinite(bounds[0][0])) return { center: defaultCenter, zoom: 1 }

    const [[x0, y0], [x1, y1]] = bounds
    const bboxW = x1 - x0
    const bboxH = y1 - y0
    if (bboxW <= 0 || bboxH <= 0) return { center: defaultCenter, zoom: 1 }

    const zoom = Math.min(MAP_WIDTH / bboxW, MAP_HEIGHT / bboxH) * PADDING
    const bboxCenterX = (x0 + x1) / 2
    const bboxCenterY = (y0 + y1) / 2
    const center = proj.invert?.([bboxCenterX, bboxCenterY])
    if (!center || !isFinite(center[0]) || !isFinite(center[1])) return { center: defaultCenter, zoom: 1 }

    return { center: center as [number, number], zoom }
  }, [selectedState, geoData])

  // Filter visible pins (exclude home course pin to avoid overlap with star)
  const filteredPins = useMemo(() => {
    let all = [...uniquePins.values()]
    if (homeCourse) {
      all = all.filter(pin =>
        !(Math.abs(pin.latitude - homeCourse.latitude) < 0.001 && Math.abs(pin.longitude - homeCourse.longitude) < 0.001)
      )
    }
    if (!selectedState) return all
    return all.filter(pin => pinStateMap.get(pin.courseId) === selectedState)
  }, [uniquePins, selectedState, pinStateMap, homeCourse])

  // Separate overlapping pins so each is clickable.
  // Pins within a threshold are fanned out in a circle around their centroid.
  const visiblePins = useMemo(() => {
    const zoom = zoomConfig.zoom
    // Threshold in degrees — closer pins get separated. Scales with zoom so
    // at higher zoom we still catch clusters that look overlapping on screen.
    const threshold = 0.8 / zoom
    // Offset radius in degrees — how far apart to fan pins
    const offsetRadius = 0.5 / zoom

    // Group pins into clusters by proximity
    const assigned = new Set<number>()
    const clusters: number[][] = []
    for (let i = 0; i < filteredPins.length; i++) {
      if (assigned.has(i)) continue
      const cluster = [i]
      assigned.add(i)
      for (let j = i + 1; j < filteredPins.length; j++) {
        if (assigned.has(j)) continue
        const dLat = filteredPins[i].latitude - filteredPins[j].latitude
        const dLng = filteredPins[i].longitude - filteredPins[j].longitude
        if (Math.sqrt(dLat * dLat + dLng * dLng) < threshold) {
          cluster.push(j)
          assigned.add(j)
        }
      }
      clusters.push(cluster)
    }

    // For single-pin clusters keep original coords; for multi-pin clusters fan out
    return filteredPins.map((pin, idx) => {
      const cluster = clusters.find(c => c.includes(idx))!
      if (cluster.length <= 1) return pin

      const posInCluster = cluster.indexOf(idx)
      const angle = (2 * Math.PI * posInCluster) / cluster.length - Math.PI / 2
      return {
        ...pin,
        latitude: pin.latitude + Math.sin(angle) * offsetRadius,
        longitude: pin.longitude + Math.cos(angle) * offsetRadius,
      }
    })
  }, [filteredPins, zoomConfig.zoom])

  if (pins.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-8 text-center">
        <span className="text-3xl">🗺️</span>
        <p className="mt-2 text-sm text-gray-500">No rounds logged yet.</p>
      </div>
    )
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

  const allStatesSet = new Set(pinStateMap.values())

  const handleStateSelect = (stateName: string | null) => {
    setSelectedState(stateName)
    setSelectedCourseId(null)
  }

  // Pin scale factor: inversely proportional to zoom with mild growth
  const pinScale = (zoom: number, isCourseSelected: boolean) => {
    const base = (1 / zoom) * (1 + zoom * 0.05)
    return isCourseSelected ? base * 1.2 : base
  }

  const currentZoom = zoomConfig.zoom

  return (
    <div className="space-y-3">
      {/* State filter trigger — pulled up into the section title row */}
      {allStates.length >= 1 && (
        <div className="-mt-[2.125rem] mb-1 flex justify-end">
          <button
            onClick={() => setSheetOpen(true)}
            className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200 transition"
          >
            {selectedState && <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />}
            {selectedState ?? 'All States'}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <ComposableMap
          projection="geoAlbersUsa"
          style={{ width: '100%', height: 'auto' }}
          projectionConfig={{ scale: 900 }}
        >
          <ZoomableGroup
            center={zoomConfig.center}
            zoom={zoomConfig.zoom}
            minZoom={zoomConfig.zoom}
            maxZoom={zoomConfig.zoom}
            onMoveEnd={() => {}}
          >
            <Geographies geography={GEO_URL}>
              {({ geographies }) => {
                captureGeoData(geographies)
                // When a state is selected, only render that state
                const geos = selectedState
                  ? geographies.filter(geo => geo.properties.name === selectedState)
                  : geographies
                return geos.map(geo => {
                  const stateName = geo.properties.name
                  const hasCourses = allStatesSet.has(stateName)
                  const isSelected = selectedState === stateName
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill="#E5E7EB"
                      stroke="#D1D5DB"
                      strokeWidth={0.5 / zoomConfig.zoom}
                      style={{
                        default: { outline: 'none' },
                        hover: { outline: 'none' },
                        pressed: { outline: 'none' },
                      }}
                    />
                  )
                })
              }}
            </Geographies>

            {showHomeCourse && (
              <Marker coordinates={[homeCourse.longitude, homeCourse.latitude]}>
                <g
                  transform={`scale(${pinScale(currentZoom, false)})`}
                  style={{ pointerEvents: 'none' }}
                >
                  <path
                    d={STAR_PATH}
                    fill="#EAB308"
                    stroke="white"
                    strokeWidth={1.5}
                  />
                </g>
                {!selectedState && (
                  <text
                    textAnchor="middle"
                    y={-14 / currentZoom}
                    style={{
                      fontSize: `${18 / currentZoom}px`,
                      fontWeight: 600,
                      fill: '#1f2937',
                      stroke: 'white',
                      strokeWidth: 3 / currentZoom,
                      paintOrder: 'stroke',
                      pointerEvents: 'none',
                    }}
                  >
                    {homeCourse.name}
                  </text>
                )}
              </Marker>
            )}

            {visiblePins.map(pin => {
              const isCourseSelected = selectedCourseId === pin.courseId
              const scale = pinScale(currentZoom, isCourseSelected)
              return (
                <Marker
                  key={pin.courseId}
                  coordinates={[pin.longitude, pin.latitude]}
                  onClick={() => setSelectedCourseId(isCourseSelected ? null : pin.courseId)}
                >
                  <g
                    transform={`scale(${scale})`}
                    style={{ cursor: 'pointer', transition: 'transform 0.15s' }}
                  >
                    <path
                      d={PIN_PATH}
                      fill={isCourseSelected ? '#b91c1c' : '#ef4444'}
                      stroke="white"
                      strokeWidth={1.5}
                    />
                    <circle
                      cx={0}
                      cy={-16}
                      r={3}
                      fill="white"
                      opacity={0.9}
                    />
                  </g>
                </Marker>
              )
            })}
          </ZoomableGroup>
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
        {selectedState
          ? <>{visiblePins.length} course{visiblePins.length !== 1 ? 's' : ''} played in {selectedState}{visiblePins.length > 0 && <>&ensp;·&ensp;tap a pin for details</>}</>
          : <>{uniquePins.size} course{uniquePins.size !== 1 ? 's' : ''} played&ensp;·&ensp;tap a pin for details</>
        }
      </p>

      {/* State filter sheet */}
      {sheetOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[60]" onClick={() => setSheetOpen(false)} />
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 pointer-events-none">
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden pointer-events-auto">
              <div className="overflow-y-auto max-h-72 divide-y divide-gray-100 [scrollbar-gutter:stable]">
                <button
                  onClick={() => { handleStateSelect(null); setSheetOpen(false) }}
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
                  allStates.reduce<Record<string, string[]>>((acc, s) => {
                    const letter = s[0].toUpperCase()
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
                        key={s}
                        onClick={() => { handleStateSelect(s); setSheetOpen(false) }}
                        className={`w-full text-left px-4 py-3 text-sm flex items-center gap-2 border-b border-gray-100 last:border-b-0 ${
                          selectedState === s ? 'font-semibold text-blue-700' : 'text-gray-700'
                        }`}
                      >
                        {selectedState === s && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="shrink-0">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                        {s}
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
