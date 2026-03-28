import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCourseDetail } from '@/lib/golf-course-api'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get course and its golf_course_api_id
  const { data: course } = await supabase
    .from('courses')
    .select('id, golf_course_api_id')
    .eq('id', courseId)
    .single()

  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  if (!course.golf_course_api_id) {
    return NextResponse.json({ error: 'No golf_course_api_id set for this course' }, { status: 400 })
  }

  // Fetch from GolfCourseAPI
  const detail = await getCourseDetail(course.golf_course_api_id)
  if (!detail) {
    return NextResponse.json({ error: 'Failed to fetch course data from API' }, { status: 502 })
  }

  // Get holes for this course
  const { data: holes } = await supabase
    .from('holes')
    .select('id, hole_number')
    .eq('course_id', courseId)
    .order('hole_number')

  if (!holes || holes.length === 0) {
    return NextResponse.json({ error: 'No holes found' }, { status: 404 })
  }

  const db = getServiceClient()

  // Cache course-level detail: address, website, tee boxes
  const teeBoxes = (detail.tees.male || []).map(t => ({
    tee_name: t.tee_name,
    slope_rating: t.slope_rating,
    course_rating: t.course_rating,
    total_yards: t.total_yards,
    par_total: t.par_total,
  }))

  const loc = detail.location
  const addressParts = [loc?.address, loc?.city, loc?.state].filter(Boolean)
  const address = addressParts.length > 0 ? addressParts.join(', ') : null

  await db
    .from('courses')
    .update({
      tee_boxes: teeBoxes,
      address,
      // website not in API response, leave null
    })
    .eq('id', courseId)

  // Build yardage per hole from all male tees
  let updated = 0
  for (const hole of holes) {
    const yardage: Record<string, number> = {}

    for (const tee of detail.tees.male || []) {
      const teeHole = tee.holes?.[hole.hole_number - 1]
      if (teeHole?.yardage) {
        yardage[tee.tee_name] = teeHole.yardage
      }
    }

    if (Object.keys(yardage).length > 0) {
      await db
        .from('holes')
        .update({ yardage })
        .eq('id', hole.id)
      updated++
    }
  }

  return NextResponse.json({ updated, totalHoles: holes.length })
}
