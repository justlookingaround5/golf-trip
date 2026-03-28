import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCourseDetail as getApiCourseDetail } from '@/lib/golf-course-api'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get all courses with a golf_course_api_id
  const { data: courses } = await supabase
    .from('courses')
    .select('id, golf_course_api_id')
    .not('golf_course_api_id', 'is', null)

  if (!courses || courses.length === 0) {
    return NextResponse.json({ message: 'No courses with API IDs found', updated: 0 })
  }

  let updated = 0
  const errors: string[] = []

  for (const c of courses) {
    try {
      const detail = await getApiCourseDetail(c.golf_course_api_id)
      if (!detail) continue

      const teeBoxes = (detail.tees?.male || []).map(t => ({
        tee_name: t.tee_name,
        slope_rating: t.slope_rating,
        course_rating: t.course_rating,
        total_yards: t.total_yards,
        par_total: t.par_total,
      }))

      const loc = detail.location
      const addressParts = [loc?.address, loc?.city, loc?.state].filter(Boolean)
      const address = addressParts.length > 0 ? addressParts.join(', ') : null

      const updates: Record<string, unknown> = {}
      if (teeBoxes.length > 0) updates.tee_boxes = teeBoxes
      if (address) updates.address = address

      if (Object.keys(updates).length > 0) {
        await supabase.from('courses').update(updates).eq('id', c.id)
        updated++
      }
    } catch (e) {
      errors.push(`Course ${c.id}: ${e instanceof Error ? e.message : 'unknown error'}`)
    }
  }

  return NextResponse.json({ updated, total: courses.length, errors })
}
