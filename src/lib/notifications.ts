import type { SupabaseClient } from '@supabase/supabase-js'

export type SystemMessageType =
  | 'birdie'
  | 'eagle'
  | 'bad_score'
  | 'skin_won'
  | 'match_complete'

/**
 * Post a system message to the trip chat.
 * System messages have is_system=true and null user_id.
 * Pass system_type to enable event-specific styling in the chat UI.
 */
export async function postSystemMessage(
  db: SupabaseClient,
  tripId: string,
  content: string,
  systemType?: SystemMessageType
) {
  const { error } = await db.from('trip_messages').insert({
    trip_id: tripId,
    user_id: null,
    content,
    is_system: true,
    system_type: systemType ?? null,
  })

  if (error) {
    console.error('Failed to post system message:', error.message)
  }
}
