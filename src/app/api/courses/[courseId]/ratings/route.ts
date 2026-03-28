import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/courses/[courseId]/ratings — upsert a course rating
 * GET  /api/courses/[courseId]/ratings — get averages + user's own rating
 */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { tripId, overall, condition, layout, value } = body as {
    tripId?: string | null
    overall: number
    condition?: number | null
    layout?: number | null
    value?: number | null
  }

  if (!overall || overall < 1 || overall > 10) {
    return NextResponse.json({ error: 'overall rating must be between 1 and 10' }, { status: 400 })
  }

  const ratingData: Record<string, unknown> = {
    user_id: user.id,
    course_id: courseId,
    trip_id: tripId ?? null,
    overall_rating: overall,
    condition_rating: condition ?? null,
    layout_rating: layout ?? null,
    value_rating: value ?? null,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('course_ratings')
    .upsert(ratingData, { onConflict: 'user_id,course_id' })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ rating: data })
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get all ratings for this course
  const { data: ratings } = await supabase
    .from('course_ratings')
    .select('user_id, overall_rating, condition_rating, layout_rating, value_rating')
    .eq('course_id', courseId)

  const allRatings = ratings ?? []
  const count = allRatings.length

  const avg = (arr: (number | null)[]) => {
    const valid = arr.filter((v): v is number => v !== null)
    return valid.length > 0 ? Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10 : null
  }

  const averages = {
    avgOverall: avg(allRatings.map(r => r.overall_rating)),
    avgCondition: avg(allRatings.map(r => r.condition_rating)),
    avgLayout: avg(allRatings.map(r => r.layout_rating)),
    avgValue: avg(allRatings.map(r => r.value_rating)),
    totalRatings: count,
  }

  // User's own rating (if logged in)
  let userRating = null
  if (user) {
    const own = allRatings.find(r => r.user_id === user.id)
    if (own) {
      userRating = {
        overall: own.overall_rating,
        condition: own.condition_rating,
        layout: own.layout_rating,
        value: own.value_rating,
      }
    }
  }

  return NextResponse.json({ averages, userRating })
}
