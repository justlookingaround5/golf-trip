import { createClient } from '@/lib/supabase/server'
import type { TripRole } from '@/lib/types'

async function checkTripMemberOrCreator(
  tripId: string
): Promise<{ userId: string; role: TripRole } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Check trip_members first
  const { data: member } = await supabase
    .from('trip_members')
    .select('role')
    .eq('trip_id', tripId)
    .eq('user_id', user.id)
    .single()

  if (member) {
    return { userId: user.id, role: member.role as TripRole }
  }

  // Fallback: check if user is the trip creator (handles trips created before role system)
  const { data: trip } = await supabase
    .from('trips')
    .select('created_by')
    .eq('id', tripId)
    .single()

  if (trip?.created_by === user.id) {
    // Auto-create the missing trip_members record
    await supabase.from('trip_members').upsert(
      { trip_id: tripId, user_id: user.id, role: 'owner' },
      { onConflict: 'trip_id,user_id' }
    )
    return { userId: user.id, role: 'owner' }
  }

  return null
}

export async function getUserTripRole(tripId: string): Promise<TripRole | null> {
  const result = await checkTripMemberOrCreator(tripId)
  return result?.role ?? null
}

export async function requireTripRole(
  tripId: string,
  allowedRoles: TripRole[]
): Promise<{ userId: string; role: TripRole } | null> {
  const result = await checkTripMemberOrCreator(tripId)

  if (!result || !allowedRoles.includes(result.role)) return null

  return result
}
