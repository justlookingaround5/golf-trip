import { createClient } from '@/lib/supabase/server'
import { getCourseDetail as getApiCourseDetail, searchCourses } from '@/lib/golf-course-api'
import type { CourseDetailV2 } from './types'

export async function getCourseDetail(courseId: string): Promise<CourseDetailV2 | null> {
  const supabase = await createClient()

  const COLS = 'id, name, par, slope, rating, trip_id, latitude, longitude, golf_course_api_id, address'
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(courseId)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let course: any = null

  if (isUuid) {
    const { data } = await supabase.from('courses').select(COLS).eq('id', courseId).maybeSingle()
    course = data
  }
  if (!course) {
    const apiId = parseInt(courseId, 10)
    if (!isNaN(apiId) && String(apiId) === courseId) {
      const { data } = await supabase.from('courses').select(COLS).eq('golf_course_api_id', apiId).limit(1).maybeSingle()
      course = data
    }
  }
  if (!course) {
    const { data } = await supabase.from('courses').select(COLS).eq('name', decodeURIComponent(courseId)).limit(1).maybeSingle()
    course = data
  }
  if (!course) return null

  // Fetch full course detail from the same Golf Course API used by round setup
  // If no golf_course_api_id, search by name first (same as admin course search)
  let apiId = course.golf_course_api_id
  if (!apiId) {
    // Search by full name first, then try stripped name (remove Golf Links/Resort/etc.)
    let searchResults = await searchCourses(course.name)
    if (searchResults.length === 0) {
      const simplified = course.name
        .replace(/\s+(golf\s*(links|resort|club|course)|country\s*club|cc|gc)\s*$/i, '')
        .trim()
      if (simplified.length >= 3 && simplified !== course.name) {
        searchResults = await searchCourses(simplified)
      }
    }
    if (searchResults.length > 0) {
      apiId = searchResults[0].id
      // Cache the API ID so future loads skip the search
      await supabase.from('courses').update({ golf_course_api_id: apiId }).eq('id', course.id)
    }
  }

  const apiDetail = apiId ? await getApiCourseDetail(apiId) : null

  // Build tees from API data (same source the admin tee selector uses)
  const tees: CourseDetailV2['tees'] = []
  if (apiDetail?.tees?.male) {
    for (const t of apiDetail.tees.male) {
      tees.push({
        name: t.tee_name,
        yardage: t.total_yards,
        slope: t.slope_rating,
        rating: t.course_rating,
        par: t.par_total,
      })
    }
  }

  // Use DB-cached address first, fall back to API, then trip location
  let location = course.address ?? ''
  if (!location && apiDetail?.location?.address) {
    let addr = apiDetail.location.address
    // Strip club name prefix if the address starts with it
    const clubName = apiDetail.club_name || apiDetail.course_name
    if (clubName && addr.toLowerCase().startsWith(clubName.toLowerCase())) {
      addr = addr.slice(clubName.length).replace(/^[,\s]+/, '')
    }
    location = addr.replace(/,\s*(United States|USA|US)\s*$/i, '').trim()
  } else if (!location && apiDetail?.location) {
    const loc = apiDetail.location
    const parts = [loc.city, loc.state].filter(Boolean)
    if (parts.length > 0) location = parts.join(', ')
  }
  if (!location) {
    const { data: trip } = await supabase.from('trips').select('location').eq('id', course.trip_id).maybeSingle()
    location = trip?.location ?? ''
  }

  // Community ratings
  const { data: ratings } = await supabase
    .from('course_ratings')
    .select('overall_rating, condition_rating, layout_rating, value_rating')
    .eq('course_id', course.id)

  const allRatings = ratings ?? []
  const totalRatings = allRatings.length

  const avg = (arr: (number | null)[]) => {
    const valid = arr.filter((v): v is number => v !== null)
    return valid.length > 0 ? Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10 : null
  }

  return {
    courseId: course.id,
    courseName: course.name,
    location,
    par: course.par ?? 72,
    slope: course.slope ?? null,
    courseRating: course.rating ? parseFloat(course.rating) : null,
    avgUserRating: avg(allRatings.map(r => r.overall_rating)),
    totalRatings,
    conditionRating: avg(allRatings.map(r => r.condition_rating)),
    layoutRating: avg(allRatings.map(r => r.layout_rating)),
    valueRating: avg(allRatings.map(r => r.value_rating)),
    tees,
    website: null,
    phone: null,
    photoUrls: [],
    latitude: course.latitude ?? 0,
    longitude: course.longitude ?? 0,
  }
}
