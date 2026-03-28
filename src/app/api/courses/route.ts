import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireTripRole } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const body = await request.json()

  if (!body.trip_id || !body.name || !body.round_number) {
    return NextResponse.json(
      { error: 'trip_id, name, and round_number are required' },
      { status: 400 }
    )
  }

  const access = await requireTripRole(body.trip_id, ['owner', 'admin'])
  if (!access) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Create the course
  const insertData: Record<string, unknown> = {
    trip_id: body.trip_id,
    name: body.name,
    slope: body.slope ?? null,
    rating: body.rating ?? null,
    par: body.par ?? 72,
    round_number: body.round_number,
    round_date: body.round_date ?? null,
  }
  if (body.golf_course_api_id) insertData.golf_course_api_id = body.golf_course_api_id
  if (body.tee_boxes) insertData.tee_boxes = body.tee_boxes

  const { data: course, error: courseError } = await supabase
    .from('courses')
    .insert(insertData)
    .select()
    .single()

  if (courseError) {
    return NextResponse.json({ error: courseError.message }, { status: 500 })
  }

  // Create holes if provided
  if (body.holes && Array.isArray(body.holes) && body.holes.length > 0) {
    const holesData = body.holes.map((hole: { hole_number: number; par: number; handicap_index: number }) => ({
      course_id: course.id,
      hole_number: hole.hole_number,
      par: hole.par,
      handicap_index: hole.handicap_index,
    }))

    const { error: holesError } = await supabase
      .from('holes')
      .insert(holesData)

    if (holesError) {
      // Clean up the course if holes insertion fails
      await supabase.from('courses').delete().eq('id', course.id)
      return NextResponse.json({ error: holesError.message }, { status: 500 })
    }
  }

  // Fetch the course with holes to return
  const { data: courseWithHoles } = await supabase
    .from('courses')
    .select('*, holes(*)')
    .eq('id', course.id)
    .single()

  return NextResponse.json(courseWithHoles, { status: 201 })
}
