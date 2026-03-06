export interface OsmHoleData {
  holeNumber: number
  par: number | null
  holePath: [number, number][]
  tees: [number, number][][]
  fairways: [number, number][][]
  greens: [number, number][][]
  bunkers: [number, number][][]
  water: [number, number][][]
}

interface OsmNode {
  type: 'node'
  id: number
  lat: number
  lon: number
}

interface OsmWay {
  type: 'way'
  id: number
  nodes: number[]
  tags?: Record<string, string>
}

type OsmElement = OsmNode | OsmWay

interface OverpassResponse {
  elements: OsmElement[]
}

function distance(a: [number, number], b: [number, number]): number {
  const dlat = a[0] - b[0]
  const dlng = a[1] - b[1]
  return Math.sqrt(dlat * dlat + dlng * dlng)
}

function centroid(coords: [number, number][]): [number, number] {
  let latSum = 0
  let lngSum = 0
  for (const [lat, lng] of coords) {
    latSum += lat
    lngSum += lng
  }
  return [latSum / coords.length, lngSum / coords.length]
}

function resolveNodes(
  nodeIds: number[],
  nodeLookup: Map<number, { lat: number; lng: number }>
): [number, number][] {
  const coords: [number, number][] = []
  for (const id of nodeIds) {
    const node = nodeLookup.get(id)
    if (node) {
      coords.push([node.lat, node.lng])
    }
  }
  return coords
}

function midpoint(path: [number, number][]): [number, number] {
  if (path.length === 0) return [0, 0]
  const midIdx = Math.floor(path.length / 2)
  return path[midIdx]
}

export async function fetchOsmGolfData(
  lat: number,
  lng: number
): Promise<OsmHoleData[] | null> {
  const query = `[out:json][timeout:15];(way["golf"](around:1500,${lat},${lng}););out body;>;out skel qt;`
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`

  let data: OverpassResponse
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    data = (await response.json()) as OverpassResponse
  } catch {
    return null
  }

  // Build node lookup
  const nodeLookup = new Map<number, { lat: number; lng: number }>()
  for (const el of data.elements) {
    if (el.type === 'node') {
      nodeLookup.set(el.id, { lat: el.lat, lng: el.lon })
    }
  }

  // Separate ways by golf tag
  const holeWays: OsmWay[] = []
  const greenWays: OsmWay[] = []
  const fairwayWays: OsmWay[] = []
  const bunkerWays: OsmWay[] = []
  const teeWays: OsmWay[] = []
  const waterWays: OsmWay[] = []

  for (const el of data.elements) {
    if (el.type !== 'way' || !el.tags?.golf) continue
    switch (el.tags.golf) {
      case 'hole':
        holeWays.push(el)
        break
      case 'green':
        greenWays.push(el)
        break
      case 'fairway':
        fairwayWays.push(el)
        break
      case 'bunker':
        bunkerWays.push(el)
        break
      case 'tee':
        teeWays.push(el)
        break
      case 'water_hazard':
      case 'lateral_water_hazard':
        waterWays.push(el)
        break
    }
  }

  if (holeWays.length === 0) return null

  // Build hole data
  const holes: OsmHoleData[] = holeWays.map((way) => {
    const holeNumber = way.tags?.ref ? parseInt(way.tags.ref, 10) : 0
    const par = way.tags?.par ? parseInt(way.tags.par, 10) : null
    const holePath = resolveNodes(way.nodes, nodeLookup)

    return {
      holeNumber,
      par,
      holePath,
      tees: [],
      fairways: [],
      greens: [],
      bunkers: [],
      water: [],
    }
  })

  // Helper: find closest hole by green end (last coord of path)
  function closestHoleByGreenEnd(point: [number, number]): OsmHoleData | null {
    let best: OsmHoleData | null = null
    let bestDist = Infinity
    for (const hole of holes) {
      if (hole.holePath.length === 0) continue
      const greenEnd = hole.holePath[hole.holePath.length - 1]
      const d = distance(point, greenEnd)
      if (d < bestDist) {
        bestDist = d
        best = hole
      }
    }
    return best
  }

  // Helper: find closest hole by path midpoint
  function closestHoleByMidpoint(point: [number, number]): OsmHoleData | null {
    let best: OsmHoleData | null = null
    let bestDist = Infinity
    for (const hole of holes) {
      if (hole.holePath.length === 0) continue
      const mid = midpoint(hole.holePath)
      const d = distance(point, mid)
      if (d < bestDist) {
        bestDist = d
        best = hole
      }
    }
    return best
  }

  // Assign polygon features to holes
  function assignPolygons(
    ways: OsmWay[],
    key: 'tees' | 'fairways' | 'greens' | 'bunkers',
  ) {
    for (const way of ways) {
      const coords = resolveNodes(way.nodes, nodeLookup)
      if (coords.length === 0) continue
      const center = centroid(coords)
      const hole = closestHoleByGreenEnd(center)
      if (hole) {
        hole[key].push(coords)
      }
    }
  }

  assignPolygons(teeWays, 'tees')
  assignPolygons(fairwayWays, 'fairways')
  assignPolygons(greenWays, 'greens')
  assignPolygons(bunkerWays, 'bunkers')

  // Water hazards: assign by path midpoint proximity
  for (const way of waterWays) {
    const coords = resolveNodes(way.nodes, nodeLookup)
    if (coords.length === 0) continue
    const center = centroid(coords)
    const hole = closestHoleByMidpoint(center)
    if (hole) {
      hole.water.push(coords)
    }
  }

  // Sort by hole number
  holes.sort((a, b) => a.holeNumber - b.holeNumber)

  return holes
}
