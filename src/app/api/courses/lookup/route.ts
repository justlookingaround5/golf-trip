import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCourseDetail } from '@/lib/golf-course-api'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const courseId = request.nextUrl.searchParams.get('id')

  if (!courseId) {
    return NextResponse.json({ error: 'id query parameter is required' }, { status: 400 })
  }

  const detail = await getCourseDetail(courseId)

  if (!detail) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  return NextResponse.json(detail)
}
