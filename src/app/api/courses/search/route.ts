import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchCourses } from '@/lib/golf-course-api'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const query = request.nextUrl.searchParams.get('q')

  if (!query || query.trim().length < 2) {
    return NextResponse.json([])
  }

  const results = await searchCourses(query.trim())
  return NextResponse.json(results)
}
