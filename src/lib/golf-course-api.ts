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
  }
  tees: {
    male: GolfCourseTeeBox[]
    female: GolfCourseTeeBox[]
  }
}

export async function searchCourses(query: string): Promise<GolfCourseSearchResult[]> {
  const apiKey = process.env.GOLF_COURSE_API_KEY
  if (!apiKey || apiKey === 'your-golf-course-api-key') {
    return []
  }
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
