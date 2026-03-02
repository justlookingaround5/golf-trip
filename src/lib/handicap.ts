/**
 * Calculate course handicap from index, slope, and rating.
 * Formula: (Handicap Index * Slope / 113) + (Course Rating - Par)
 * Rounded to nearest integer.
 */
export function calculateCourseHandicap(
  handicapIndex: number,
  slope: number,
  rating: number,
  par: number
): number {
  const raw = (handicapIndex * slope / 113) + (rating - par)
  return Math.round(raw)
}

/**
 * Determine which holes a player gets strokes on.
 * Returns a map of hole_number -> number of strokes on that hole.
 * Strokes are allocated based on hole handicap index (1 = hardest).
 */
export function getStrokesPerHole(
  courseHandicap: number,
  holes: { hole_number: number; handicap_index: number }[]
): Map<number, number> {
  const strokeMap = new Map<number, number>()
  const sorted = [...holes].sort((a, b) => a.handicap_index - b.handicap_index)

  let remaining = courseHandicap
  // First pass: 1 stroke per hole starting from hardest
  for (const hole of sorted) {
    if (remaining <= 0) break
    strokeMap.set(hole.hole_number, (strokeMap.get(hole.hole_number) || 0) + 1)
    remaining--
  }
  // Second pass if handicap > 18
  for (const hole of sorted) {
    if (remaining <= 0) break
    strokeMap.set(hole.hole_number, (strokeMap.get(hole.hole_number) || 0) + 1)
    remaining--
  }

  return strokeMap
}

/**
 * Calculate net score for a hole given gross score and strokes received.
 */
export function netScore(grossScore: number, strokesOnHole: number): number {
  return grossScore - strokesOnHole
}
