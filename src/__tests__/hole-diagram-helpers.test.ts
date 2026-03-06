/**
 * Tests for HoleDiagram helper functions.
 * The seededRandom and projectCoordinates are internal to the component,
 * so we recreate the logic here to test determinism and correctness.
 */

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

describe('seededRandom', () => {
  it('produces deterministic output for same seed', () => {
    const r1 = seededRandom(42)
    const r2 = seededRandom(42)
    for (let i = 0; i < 10; i++) {
      expect(r1()).toBe(r2())
    }
  })

  it('produces different output for different seeds', () => {
    const r1 = seededRandom(1)
    const r2 = seededRandom(2)
    expect(r1()).not.toBe(r2())
  })

  it('returns values between 0 and 1', () => {
    const rand = seededRandom(7)
    for (let i = 0; i < 100; i++) {
      const val = rand()
      expect(val).toBeGreaterThan(0)
      expect(val).toBeLessThan(1)
    }
  })

  it('same hole number always generates same diagram', () => {
    // Hole 5, par 4 - the generated diagram should be identical each render
    const rand1 = seededRandom(5 * 13)
    const rand2 = seededRandom(5 * 13)
    const seq1 = Array.from({ length: 20 }, () => rand1())
    const seq2 = Array.from({ length: 20 }, () => rand2())
    expect(seq1).toEqual(seq2)
  })
})

describe('projectCoordinates', () => {
  it('projects coordinates into SVG space', () => {
    const coords: [number, number][] = [
      [42.0, -85.0],
      [42.01, -85.01],
    ]
    const project = projectCoordinates(coords)
    const [x1, y1] = project(coords[0])
    const [x2, y2] = project(coords[1])

    // All points should be within SVG bounds
    expect(x1).toBeGreaterThanOrEqual(0)
    expect(x1).toBeLessThanOrEqual(200)
    expect(y1).toBeGreaterThanOrEqual(0)
    expect(y1).toBeLessThanOrEqual(280)
    expect(x2).toBeGreaterThanOrEqual(0)
    expect(x2).toBeLessThanOrEqual(200)
    expect(y2).toBeGreaterThanOrEqual(0)
    expect(y2).toBeLessThanOrEqual(280)
  })

  it('higher latitude maps to lower y (north is up)', () => {
    const coords: [number, number][] = [
      [42.0, -85.0],   // south
      [42.01, -85.0],  // north
    ]
    const project = projectCoordinates(coords)
    const [, ySouth] = project(coords[0])
    const [, yNorth] = project(coords[1])
    expect(yNorth).toBeLessThan(ySouth)
  })

  it('higher longitude maps to higher x (east is right)', () => {
    const coords: [number, number][] = [
      [42.0, -85.01],  // west
      [42.0, -85.0],   // east
    ]
    const project = projectCoordinates(coords)
    const [xWest] = project(coords[0])
    const [xEast] = project(coords[1])
    expect(xEast).toBeGreaterThan(xWest)
  })

  it('handles single-point input without crashing', () => {
    const coords: [number, number][] = [[42.0, -85.0]]
    const project = projectCoordinates(coords)
    const [x, y] = project(coords[0])
    expect(typeof x).toBe('number')
    expect(typeof y).toBe('number')
    expect(isNaN(x)).toBe(false)
    expect(isNaN(y)).toBe(false)
  })
})
