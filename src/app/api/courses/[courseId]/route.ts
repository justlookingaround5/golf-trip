import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params
  const supabase = await createClient()

  const { data: course, error } = await supabase
    .from('courses')
    .select('*, holes(*)')
    .eq('id', courseId)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }

  return NextResponse.json(course)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  // Update the course
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .update({
      ...(body.name !== undefined && { name: body.name }),
      ...(body.slope !== undefined && { slope: body.slope }),
      ...(body.rating !== undefined && { rating: body.rating }),
      ...(body.par !== undefined && { par: body.par }),
      ...(body.round_number !== undefined && { round_number: body.round_number }),
      ...(body.round_date !== undefined && { round_date: body.round_date }),
    })
    .eq('id', courseId)
    .select()
    .single()

  if (courseError) {
    return NextResponse.json({ error: courseError.message }, { status: 500 })
  }

  // Update holes if provided
  if (body.holes && Array.isArray(body.holes)) {
    // Delete existing holes and re-create
    const { error: deleteHolesError } = await supabase.from('holes').delete().eq('course_id', courseId)
    if (deleteHolesError) {
      return NextResponse.json({ error: `Failed to clear holes: ${deleteHolesError.message}` }, { status: 500 })
    }

    if (body.holes.length > 0) {
      const holesData = body.holes.map((hole: { hole_number: number; par: number; handicap_index: number }) => ({
        course_id: courseId,
        hole_number: hole.hole_number,
        par: hole.par,
        handicap_index: hole.handicap_index,
      }))

      const { error: holesError } = await supabase
        .from('holes')
        .insert(holesData)

      if (holesError) {
        return NextResponse.json({ error: holesError.message }, { status: 500 })
      }
    }
  }

  // Fetch the updated course with holes
  const { data: courseWithHoles } = await supabase
    .from('courses')
    .select('*, holes(*)')
    .eq('id', course.id)
    .single()

  return NextResponse.json(courseWithHoles)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Delete holes first (cascade may handle this, but be explicit)
  await supabase.from('holes').delete().eq('course_id', courseId)

  const { error } = await supabase
    .from('courses')
    .delete()
    .eq('id', courseId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
