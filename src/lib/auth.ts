import { createClient } from '@/lib/supabase/server'
import type { TripRole } from '@/lib/types'

export async function getUserTripRole(tripId: string): Promise<TripRole | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: member } = await supabase
    .from('trip_members')
    .select('role')
    .eq('trip_id', tripId)
    .eq('user_id', user.id)
    .single()

  return (member?.role as TripRole) ?? null
}

export async function requireTripRole(
  tripId: string,
  allowedRoles: TripRole[]
): Promise<{ userId: string; role: TripRole } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: member } = await supabase
    .from('trip_members')
    .select('role')
    .eq('trip_id', tripId)
    .eq('user_id', user.id)
    .single()

  if (!member || !allowedRoles.includes(member.role as TripRole)) return null

  return { userId: user.id, role: member.role as TripRole }
}
