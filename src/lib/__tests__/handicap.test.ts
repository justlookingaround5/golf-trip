import { calculateCourseHandicap, getStrokesPerHole, netScore } from '../handicap'

// Helper to create 18 holes with handicap indices 1-18
function makeHoles(pars?: number[]) {
  return Array.from({ length: 18 }, (_, i) => ({
    hole_number: i + 1,
    handicap_index: i + 1, // hole 1 is hardest (index 1), hole 18 is easiest (index 18)
    par: pars ? pars[i] : 4,
  }))
}

describe('calculateCourseHandicap', () => {
  it('should calculate a standard course handicap', () => {
    // index 14.0, slope 130, rating 71.1, par 72
    // (14.0 * 130 / 113) + (71.1 - 72) = 16.106... - 0.9 = 15.206... => rounds to 15
    const result = calculateCourseHandicap(14.0, 130, 71.1, 72)
    expect(result).toBe(15)
  })

  it('should return 0 for a zero handicap index with matching rating and par', () => {
    const result = calculateCourseHandicap(0, 130, 72.0, 72)
    expect(result).toBe(0)
  })

  it('should return 0 for a zero handicap index even with different slope', () => {
    // (0 * 155 / 113) + (72 - 72) = 0
    const result = calculateCourseHandicap(0, 155, 72.0, 72)
    expect(result).toBe(0)
  })

  it('should handle a high slope course', () => {
    // index 10.0, slope 155, rating 74.5, par 72
    // (10.0 * 155 / 113) + (74.5 - 72) = 13.716... + 2.5 = 16.216... => 16
    const result = calculateCourseHandicap(10.0, 155, 74.5, 72)
    expect(result).toBe(16)
  })

  it('should handle a negative rating differential (easy course)', () => {
    // index 10.0, slope 110, rating 68.0, par 72
    // (10.0 * 110 / 113) + (68.0 - 72) = 9.734... - 4 = 5.734... => 6
    const result = calculateCourseHandicap(10.0, 110, 68.0, 72)
    expect(result).toBe(6)
  })

  it('should handle a low slope course', () => {
    // index 20.0, slope 100, rating 69.0, par 72
    // (20.0 * 100 / 113) + (69.0 - 72) = 17.699... - 3 = 14.699... => 15
    const result = calculateCourseHandicap(20.0, 100, 69.0, 72)
    expect(result).toBe(15)
  })

  it('should round correctly at the .5 boundary (rounds up)', () => {
    // We need (index * slope / 113) + (rating - par) = X.5
    // index 11.3, slope 113, rating 72, par 72
    // (11.3 * 113 / 113) + 0 = 11.3 => 11
    // Let's find something that gives .5 exactly:
    // index 10.0, slope 113, rating 72.5, par 72 => 10 + 0.5 = 10.5 => 11 (rounds up per Math.round)
    const result = calculateCourseHandicap(10.0, 113, 72.5, 72)
    expect(result).toBe(11)
  })
})

describe('getStrokesPerHole', () => {
  const holes = makeHoles()

  it('should allocate strokes to the 10 hardest holes for a 10 handicap', () => {
    const strokeMap = getStrokesPerHole(10, holes)

    // Holes with handicap_index 1-10 should get 1 stroke each
    for (let i = 1; i <= 10; i++) {
      expect(strokeMap.get(i)).toBe(1)
    }
    // Holes with handicap_index 11-18 should get 0 strokes
    for (let i = 11; i <= 18; i++) {
      expect(strokeMap.has(i)).toBe(false)
    }
  })

  it('should give one stroke on every hole for an 18 handicap', () => {
    const strokeMap = getStrokesPerHole(18, holes)

    for (let i = 1; i <= 18; i++) {
      expect(strokeMap.get(i)).toBe(1)
    }
  })

  it('should give 2 strokes on the 2 hardest holes and 1 on rest for a 20 handicap', () => {
    const strokeMap = getStrokesPerHole(20, holes)

    // Hardest 2 holes (handicap index 1 and 2) get 2 strokes
    expect(strokeMap.get(1)).toBe(2)
    expect(strokeMap.get(2)).toBe(2)
    // All other holes get 1 stroke
    for (let i = 3; i <= 18; i++) {
      expect(strokeMap.get(i)).toBe(1)
    }
  })

  it('should return an empty map for a 0 handicap', () => {
    const strokeMap = getStrokesPerHole(0, holes)
    expect(strokeMap.size).toBe(0)
  })

  it('should handle 36 handicap (2 strokes on every hole)', () => {
    const strokeMap = getStrokesPerHole(36, holes)

    for (let i = 1; i <= 18; i++) {
      expect(strokeMap.get(i)).toBe(2)
    }
  })

  it('should handle non-sequential handicap indices', () => {
    // Holes where handicap index doesn't match hole number
    const shuffledHoles = [
      { hole_number: 1, handicap_index: 7 },
      { hole_number: 2, handicap_index: 3 },
      { hole_number: 3, handicap_index: 15 },
      { hole_number: 4, handicap_index: 1 },
      { hole_number: 5, handicap_index: 11 },
      { hole_number: 6, handicap_index: 5 },
      { hole_number: 7, handicap_index: 13 },
      { hole_number: 8, handicap_index: 9 },
      { hole_number: 9, handicap_index: 17 },
      { hole_number: 10, handicap_index: 2 },
      { hole_number: 11, handicap_index: 8 },
      { hole_number: 12, handicap_index: 4 },
      { hole_number: 13, handicap_index: 16 },
      { hole_number: 14, handicap_index: 6 },
      { hole_number: 15, handicap_index: 10 },
      { hole_number: 16, handicap_index: 14 },
      { hole_number: 17, handicap_index: 12 },
      { hole_number: 18, handicap_index: 18 },
    ]

    const strokeMap = getStrokesPerHole(5, shuffledHoles)

    // The 5 hardest holes are handicap_index 1,2,3,4,5 => hole_numbers 4,10,2,12,6
    expect(strokeMap.get(4)).toBe(1)   // handicap_index 1
    expect(strokeMap.get(10)).toBe(1)  // handicap_index 2
    expect(strokeMap.get(2)).toBe(1)   // handicap_index 3
    expect(strokeMap.get(12)).toBe(1)  // handicap_index 4
    expect(strokeMap.get(6)).toBe(1)   // handicap_index 5

    // Remaining holes should have no strokes
    expect(strokeMap.has(1)).toBe(false)
    expect(strokeMap.has(3)).toBe(false)
    expect(strokeMap.has(5)).toBe(false)
    expect(strokeMap.size).toBe(5)
  })
})

describe('netScore', () => {
  it('should subtract strokes from gross score', () => {
    expect(netScore(5, 1)).toBe(4)
  })

  it('should return gross score when no strokes received', () => {
    expect(netScore(4, 0)).toBe(4)
  })

  it('should handle multiple strokes on a hole', () => {
    expect(netScore(6, 2)).toBe(4)
  })

  it('should handle high gross scores', () => {
    expect(netScore(9, 1)).toBe(8)
  })

  it('should handle par with a stroke', () => {
    expect(netScore(4, 1)).toBe(3)
  })
})
