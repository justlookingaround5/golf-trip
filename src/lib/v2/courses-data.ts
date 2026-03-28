import { createClient } from '@/lib/supabase/server'

export interface CourseListItem {
  courseId: string
  courseName: string
  location: string | null
  state: string | null
  overallRating: number | null
  conditionRating: number | null
  layoutRating: number | null
  valueRating: number | null
  totalRatings: number
  latitude: number | null
  longitude: number | null
}

function extractState(location: string | null): string | null {
  if (!location) return null
  const parts = location.split(',')
  const last = parts[parts.length - 1]?.trim()
  // State may be "CA 93953" (with zip) — take first word
  const stateToken = last?.split(/\s+/)[0]
  return stateToken && stateToken.length === 2 ? stateToken.toUpperCase() : null
}

/** Turn a full address into "City, ST" for display in the list */
function shortLocation(address: string): string {
  // e.g. "3150 17 Mile Dr, Pebble Beach, CA 93953"
  const parts = address.split(',').map(p => p.trim())
  if (parts.length >= 2) {
    const city = parts[parts.length - 2]
    const stateZip = parts[parts.length - 1]
    const state = stateZip.split(/\s+/)[0]
    if (state && state.length === 2) return `${city}, ${state.toUpperCase()}`
    return city
  }
  return address
}

export async function getPublicCourseRatings(): Promise<CourseListItem[]> {
  const supabase = await createClient()

  const { data: ratings } = await supabase
    .from('course_ratings')
    .select('course_id, overall_rating, condition_rating, layout_rating, value_rating')

  if (!ratings || ratings.length === 0) return []

  // Get unique course IDs
  const courseIds = [...new Set(ratings.map(r => r.course_id))]

  const { data: courses } = await supabase
    .from('courses')
    .select('id, name, trip_id, golf_course_api_id, latitude, longitude, address')
    .in('id', courseIds)

  if (!courses || courses.length === 0) return []

  // Get trips for location
  const tripIds = [...new Set(courses.map(c => c.trip_id))]
  const { data: trips } = await supabase
    .from('trips')
    .select('id, location')
    .in('id', tripIds)

  const tripMap = new Map((trips ?? []).map(t => [t.id, t.location]))

  // Build course lookup: prefer golf_course_api_id as grouping key, fallback to name
  const courseMap = new Map(courses.map(c => [c.id, c]))

  // Group ratings by course identity
  const grouped = new Map<string, {
    representativeId: string
    courseName: string
    location: string | null
    latitude: number | null
    longitude: number | null
    ratings: typeof ratings
  }>()

  for (const r of ratings) {
    const course = courseMap.get(r.course_id)
    if (!course) continue

    const key = course.golf_course_api_id || course.name
    const existing = grouped.get(key)

    if (existing) {
      existing.ratings.push(r)
    } else {
      grouped.set(key, {
        representativeId: course.id,
        courseName: course.name,
        location: course.address ? shortLocation(course.address) : tripMap.get(course.trip_id) ?? null,
        latitude: course.latitude ?? null,
        longitude: course.longitude ?? null,
        ratings: [r],
      })
    }
  }

  const avg = (arr: (number | null)[]) => {
    const valid = arr.filter((v): v is number => v !== null)
    return valid.length > 0 ? Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10 : null
  }

  const result: CourseListItem[] = []
  for (const [key, g] of grouped) {
    result.push({
      courseId: g.representativeId,
      courseName: g.courseName,
      location: g.location,
      state: extractState(g.location),
      overallRating: avg(g.ratings.map(r => r.overall_rating)),
      conditionRating: avg(g.ratings.map(r => r.condition_rating)),
      layoutRating: avg(g.ratings.map(r => r.layout_rating)),
      valueRating: avg(g.ratings.map(r => r.value_rating)),
      totalRatings: g.ratings.length,
      latitude: g.latitude,
      longitude: g.longitude,
    })
  }

  // Sort by overall rating desc, nulls last — top 100
  result.sort((a, b) => (b.overallRating ?? -1) - (a.overallRating ?? -1))

  return result.slice(0, 100)
}
