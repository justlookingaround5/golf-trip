'use client'

import React from 'react'

export interface HoleMapData {
  source: 'osm' | 'generated'
  holePath: [number, number][]
  tees: [number, number][][]
  fairways: [number, number][][]
  greens: [number, number][][]
  bunkers: [number, number][][]
  water: [number, number][][]
}

interface HoleDiagramProps {
  par: number
  yardage?: number
  holeNumber: number
  mapData?: HoleMapData | null
}

function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
}

function projectCoordinates(
  allCoords: [number, number][],
  padding: number = 15
) {
  const svgWidth = 200
  const svgHeight = 280

  let minLat = Infinity, maxLat = -Infinity
  let minLng = Infinity, maxLng = -Infinity

  for (const [lat, lng] of allCoords) {
    if (lat < minLat) minLat = lat
    if (lat > maxLat) maxLat = lat
    if (lng < minLng) minLng = lng
    if (lng > maxLng) maxLng = lng
  }

  const latRange = maxLat - minLat || 0.0001
  const lngRange = maxLng - minLng || 0.0001

  const drawWidth = svgWidth - padding * 2
  const drawHeight = svgHeight - padding * 2

  const scaleX = drawWidth / lngRange
  const scaleY = drawHeight / latRange
  const scale = Math.min(scaleX, scaleY)

  const offsetX = padding + (drawWidth - lngRange * scale) / 2
  const offsetY = padding + (drawHeight - latRange * scale) / 2

  return (coord: [number, number]): [number, number] => {
    const [lat, lng] = coord
    const x = (lng - minLng) * scale + offsetX
    const y = (maxLat - lat) * scale + offsetY
    return [x, y]
  }
}

function renderOSMHole(mapData: HoleMapData) {
  const allCoords: [number, number][] = []

  for (const coord of mapData.holePath) allCoords.push(coord)
  for (const poly of mapData.tees) for (const c of poly) allCoords.push(c)
  for (const poly of mapData.fairways) for (const c of poly) allCoords.push(c)
  for (const poly of mapData.greens) for (const c of poly) allCoords.push(c)
  for (const poly of mapData.bunkers) for (const c of poly) allCoords.push(c)
  for (const poly of mapData.water) for (const c of poly) allCoords.push(c)

  if (allCoords.length === 0) return null

  const project = projectCoordinates(allCoords)

  const toPoints = (poly: [number, number][]) =>
    poly.map((c) => project(c).join(',')).join(' ')

  const projectedPath = mapData.holePath.map((c) => project(c))
  const pinPoint =
    projectedPath.length > 0 ? projectedPath[projectedPath.length - 1] : null

  const pathD =
    projectedPath.length > 1
      ? projectedPath
          .map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`))
          .join(' ')
      : ''

  return (
    <svg viewBox="0 0 200 280" className="w-full h-auto">
      <rect x="0" y="0" width="200" height="280" fill="#2d5016" />
      {mapData.fairways.map((poly, i) => (
        <polygon key={`fw-${i}`} points={toPoints(poly)} fill="#4a7c59" />
      ))}
      {mapData.greens.map((poly, i) => (
        <polygon key={`gr-${i}`} points={toPoints(poly)} fill="#5cb85c" />
      ))}
      {mapData.tees.map((poly, i) => (
        <polygon key={`tee-${i}`} points={toPoints(poly)} fill="#3d6b4f" />
      ))}
      {mapData.bunkers.map((poly, i) => (
        <polygon key={`bk-${i}`} points={toPoints(poly)} fill="#e8d5a3" />
      ))}
      {mapData.water.map((poly, i) => (
        <polygon
          key={`wt-${i}`}
          points={toPoints(poly)}
          fill="#4a90c4"
          opacity={0.8}
        />
      ))}
      {pathD && (
        <path
          d={pathD}
          fill="none"
          stroke="white"
          strokeWidth={1}
          strokeDasharray="3 2"
          opacity={0.6}
        />
      )}
      {pinPoint && <circle cx={pinPoint[0]} cy={pinPoint[1]} r={3} fill="red" />}
    </svg>
  )
}

function renderGeneratedHole(par: number, holeNumber: number) {
  const rand = seededRandom(holeNumber * 13)
  const waterRand = seededRandom(holeNumber * 7)

  let teeY: number, greenY: number, fairwayWidth: number
  let greenRx: number, greenRy: number

  if (par <= 3) {
    teeY = 250
    greenY = 60
    fairwayWidth = 40
    greenRx = 15
    greenRy = 15
  } else if (par === 4) {
    teeY = 260
    greenY = 40
    fairwayWidth = 45
    greenRx = 18
    greenRy = 14
  } else {
    teeY = 265
    greenY = 30
    fairwayWidth = 50
    greenRx = 20
    greenRy = 16
  }

  const centerX = 100
  const totalLen = teeY - greenY

  // Generate control points for the center line
  const numPoints = par <= 3 ? 3 : par === 4 ? 4 : 5
  const points: [number, number][] = []
  points.push([centerX, teeY])

  for (let i = 1; i < numPoints - 1; i++) {
    const t = i / (numPoints - 1)
    const y = teeY - totalLen * t
    let xOffset = 0

    if (par === 4) {
      // Slight dogleg
      const dir = holeNumber % 2 === 0 ? 1 : -1
      xOffset = dir * (20 + rand() * 15) * Math.sin(t * Math.PI)
    } else if (par >= 5) {
      // S-curve
      const dir = holeNumber % 2 === 0 ? 1 : -1
      xOffset = dir * (25 + rand() * 15) * Math.sin(t * Math.PI * 2)
    } else {
      // Par 3 - very slight variation
      xOffset = (rand() - 0.5) * 10
    }

    points.push([centerX + xOffset, y])
  }

  points.push([centerX + (par >= 4 ? (holeNumber % 2 === 0 ? 8 : -8) : 0), greenY])

  const greenCenter = points[points.length - 1]

  // Build fairway path from control points
  const halfW = fairwayWidth / 2
  const leftEdge: string[] = []
  const rightEdge: string[] = []

  for (let i = 0; i < points.length; i++) {
    const [px, py] = points[i]
    // Narrow at tee and green, wider in middle
    const t = i / (points.length - 1)
    const widthMult = Math.sin(t * Math.PI) * 0.4 + 0.6
    const w = halfW * widthMult

    leftEdge.push(`${px - w},${py}`)
    rightEdge.push(`${px + w},${py}`)
  }

  rightEdge.reverse()
  const fairwayD = `M${leftEdge.join(' L')} L${rightEdge.join(' L')} Z`

  // Bunkers near green
  const numBunkers = 1 + Math.floor(rand() * 3)
  const bunkers: { cx: number; cy: number; rx: number; ry: number }[] = []
  for (let i = 0; i < numBunkers; i++) {
    const angle = rand() * Math.PI * 2
    const dist = greenRx + 5 + rand() * 12
    bunkers.push({
      cx: greenCenter[0] + Math.cos(angle) * dist,
      cy: greenCenter[1] + Math.sin(angle) * dist * 0.7,
      rx: 5 + rand() * 6,
      ry: 4 + rand() * 4,
    })
  }

  // Water hazard
  const hasWater = waterRand() > 0.7
  let waterHazard: { cx: number; cy: number; rx: number; ry: number } | null = null
  if (hasWater) {
    const midIdx = Math.floor(points.length / 2)
    const [mx, my] = points[midIdx]
    const side = rand() > 0.5 ? 1 : -1
    waterHazard = {
      cx: mx + side * (fairwayWidth / 2 + 10 + rand() * 10),
      cy: my + (rand() - 0.5) * 20,
      rx: 12 + rand() * 10,
      ry: 8 + rand() * 6,
    }
  }

  return (
    <svg viewBox="0 0 200 280" className="w-full h-auto">
      <rect x="0" y="0" width="200" height="280" fill="#2d5016" />
      {/* Fairway */}
      <path d={fairwayD} fill="#4a7c59" />
      {/* Tee box */}
      <rect
        x={centerX - 8}
        y={teeY - 4}
        width={16}
        height={8}
        rx={2}
        fill="#3d6b4f"
      />
      {/* Bunkers */}
      {bunkers.map((b, i) => (
        <ellipse
          key={`bunker-${i}`}
          cx={b.cx}
          cy={b.cy}
          rx={b.rx}
          ry={b.ry}
          fill="#e8d5a3"
        />
      ))}
      {/* Water */}
      {waterHazard && (
        <ellipse
          cx={waterHazard.cx}
          cy={waterHazard.cy}
          rx={waterHazard.rx}
          ry={waterHazard.ry}
          fill="#4a90c4"
          opacity={0.7}
        />
      )}
      {/* Green */}
      <ellipse
        cx={greenCenter[0]}
        cy={greenCenter[1]}
        rx={greenRx}
        ry={greenRy}
        fill="#5cb85c"
      />
      {/* Pin */}
      <circle cx={greenCenter[0]} cy={greenCenter[1]} r={2.5} fill="red" />
      {/* Hole number */}
      <text
        x={100}
        y={16}
        textAnchor="middle"
        fill="white"
        fontSize={10}
        fontFamily="sans-serif"
      >
        {holeNumber}
      </text>
    </svg>
  )
}

export default function HoleDiagram({
  par,
  holeNumber,
  mapData,
}: HoleDiagramProps) {
  const hasOSMData =
    mapData &&
    mapData.source === 'osm' &&
    (mapData.fairways.length > 0 ||
      mapData.greens.length > 0 ||
      mapData.tees.length > 0 ||
      mapData.bunkers.length > 0 ||
      mapData.water.length > 0)

  return (
    <div className="mx-auto" style={{ maxWidth: 200 }}>
      <div className="shadow-sm border border-gray-200 rounded-xl overflow-hidden">
        {hasOSMData ? renderOSMHole(mapData!) : renderGeneratedHole(par, holeNumber)}
      </div>
    </div>
  )
}
