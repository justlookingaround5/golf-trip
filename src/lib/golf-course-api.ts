const API_BASE = 'https://api.golfcourseapi.com/v1'

export interface GolfCourseSearchResult {
  id: number
  club_name: string
  course_name: string
  location: {
    address: string
    city: string
    state: string
    country: string
    latitude: number
    longitude: number
  }
}

export interface GolfCourseTeeBox {
  tee_name: string
  course_rating: number
  slope_rating: number
  par_total: number
  total_yards: number
  number_of_holes: number
  holes: { par: number; yardage: number; handicap: number }[]
}

export interface GolfCourseDetail {
  id: number
  club_name: string
  course_name: string
  location: {
    address: string
    city: string
    state: string
    country: string
    latitude: number
    longitude: number
  }
  tees: {
    male: GolfCourseTeeBox[]
    female: GolfCourseTeeBox[]
  }
}

async function searchCoursesRaw(query: string, apiKey: string): Promise<GolfCourseSearchResult[]> {
  try {
    const res = await fetch(`${API_BASE}/search?search_query=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Key ${apiKey}` },
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.courses || []
  } catch {
    return []
  }
}

export function buildSearchVariations(query: string): string[] {
  const variations: string[] = [query]
  const lower = query.toLowerCase()

  // "Country Club" <-> "CC"
  if (lower.includes('country club')) {
    variations.push(query.replace(/country\s+club/i, 'CC'))
  } else if (/\bcc\b/i.test(lower)) {
    variations.push(query.replace(/\bcc\b/i, 'Country Club'))
  }

  // "Golf Club" <-> "GC"
  if (lower.includes('golf club')) {
    variations.push(query.replace(/golf\s+club/i, 'GC'))
  } else if (/\bgc\b/i.test(lower)) {
    variations.push(query.replace(/\bgc\b/i, 'Golf Club'))
  }

  // "Golf Course" <-> "GC"
  if (lower.includes('golf course')) {
    variations.push(query.replace(/golf\s+course/i, 'GC'))
  }

  // Strip trailing suffixes entirely as a last resort (e.g. just "Egypt Valley")
  const stripped = query.replace(/\s+(country\s+club|golf\s+(club|course)|cc|gc)\s*$/i, '').trim()
  if (stripped.length >= 3 && stripped.toLowerCase() !== lower) {
    variations.push(stripped)
  }

  return [...new Set(variations)]
}

export async function searchCourses(query: string): Promise<GolfCourseSearchResult[]> {
  const apiKey = process.env.GOLF_COURSE_API_KEY
  if (!apiKey || apiKey === 'your-golf-course-api-key') {
    return []
  }

  const variations = buildSearchVariations(query)
  const allResults = await Promise.all(
    variations.map(v => searchCoursesRaw(v, apiKey))
  )

  // Deduplicate by course id, preserving order from first variation
  const seen = new Set<number>()
  const merged: GolfCourseSearchResult[] = []
  for (const results of allResults) {
    for (const course of results) {
      if (!seen.has(course.id)) {
        seen.add(course.id)
        merged.push(course)
      }
    }
  }
  return merged
}

export async function getCourseDetail(courseId: string | number): Promise<GolfCourseDetail | null> {
  const apiKey = process.env.GOLF_COURSE_API_KEY
  if (!apiKey || apiKey === 'your-golf-course-api-key') return null
  try {
    const res = await fetch(`${API_BASE}/courses/${courseId}`, {
      headers: { Authorization: `Key ${apiKey}` },
    })
    if (!res.ok) return null
    const data = await res.json()
    // API wraps response in { course: {...} }
    return data.course || data
  } catch {
    return null
  }
}
