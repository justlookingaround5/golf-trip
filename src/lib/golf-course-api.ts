const API_BASE = 'https://golfcourseapi.com/api/v1'

export interface GolfCourseSearchResult {
  id: string
  club_name: string
  course_name: string
  city: string
  state: string
  country: string
}

export interface GolfCourseHole {
  hole_number: number
  par: number
  handicap: number
  yardage?: number
}

export interface GolfCourseDetail {
  id: string
  club_name: string
  course_name: string
  city: string
  state: string
  slope?: number
  rating?: number
  par?: number
  holes: GolfCourseHole[]
}

export async function searchCourses(query: string): Promise<GolfCourseSearchResult[]> {
  const apiKey = process.env.GOLF_COURSE_API_KEY
  if (!apiKey || apiKey === 'your-golf-course-api-key') {
    // Return empty if no API key configured
    return []
  }
  try {
    const res = await fetch(`${API_BASE}/courses?search=${encodeURIComponent(query)}`, {
      headers: { 'Authorization': `Key ${apiKey}` },
      next: { revalidate: 3600 } // cache for 1 hour
    })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : data.courses || []
  } catch {
    return []
  }
}

export async function getCourseDetail(courseId: string): Promise<GolfCourseDetail | null> {
  const apiKey = process.env.GOLF_COURSE_API_KEY
  if (!apiKey || apiKey === 'your-golf-course-api-key') return null
  try {
    const res = await fetch(`${API_BASE}/courses/${courseId}`, {
      headers: { 'Authorization': `Key ${apiKey}` },
      next: { revalidate: 3600 }
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}
