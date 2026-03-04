import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Post a system message to the trip chat.
 * System messages have is_system=true and null user_id.
 */
export async function postSystemMessage(
  db: SupabaseClient,
  tripId: string,
  content: string
) {
  const { error } = await db.from('trip_messages').insert({
    trip_id: tripId,
    user_id: null,
    content,
    is_system: true,
  })

  if (error) {
    console.error('Failed to post system message:', error.message)
  }
}
