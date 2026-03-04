import type { SupabaseClient } from '@supabase/supabase-js'

export interface ActiveRound {
  tripId: string
  courseId: string
  courseName: string
}

/**
 * Find today's active round for the current user (for Live Scoring nav link).
 */
export async function getActiveRound(
  supabase: SupabaseClient,
  userId: string
): Promise<ActiveRound | null> {
  const today = new Date().toISOString().split('T')[0]

  const { data: tripMemberships } = await supabase
    .from('trip_members')
    .select('trip_id')
    .eq('user_id', userId)

  const tripIds = (tripMemberships || []).map(m => m.trip_id)
  if (tripIds.length === 0) return null

  const { data: todayCourses } = await supabase
    .from('courses')
    .select('id, trip_id, name')
    .in('trip_id', tripIds)
    .eq('round_date', today)
    .limit(1)

  if (todayCourses && todayCourses.length > 0) {
    return {
      tripId: todayCourses[0].trip_id,
      courseId: todayCourses[0].id,
      courseName: todayCourses[0].name,
    }
  }

  return null
}
