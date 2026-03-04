import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import LiveScoringClient from './live-scoring-client'

export default async function LiveGamePage({
  params,
}: {
  params: Promise<{ tripId: string; courseId: string }>
}) {
  const { tripId, courseId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  // Verify course belongs to trip
  const { data: course } = await supabase
    .from('courses')
    .select('id, name, par, round_number, round_date, trip_id')
    .eq('id', courseId)
    .eq('trip_id', tripId)
    .single()

  if (!course) {
    notFound()
  }

  return (
    <LiveScoringClient
      tripId={tripId}
      courseId={courseId}
      courseName={course.name}
    />
  )
}
