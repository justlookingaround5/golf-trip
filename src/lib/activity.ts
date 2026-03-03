import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ActivityEventType } from '@/lib/types'

const DEFAULT_ICONS: Record<ActivityEventType, string> = {
  score_posted: '📝', birdie: '🐦', eagle: '🦅', skin_won: '💰',
  game_result: '🏆', lead_change: '🔄', press: '⚡', side_bet_hit: '🎯',
  photo: '📸', round_started: '🏌️', round_finalized: '✅',
  player_joined: '👋', expense_added: '💵', custom: '📣',
}

/**
 * Post an event to the activity feed.
 * Call from API routes after scores, game results, etc.
 * Pass `client` when calling from unauthenticated contexts (e.g. scorer route with service role).
 */
export async function postActivity(params: {
  trip_id: string
  event_type: ActivityEventType
  title: string
  detail?: string
  icon?: string
  trip_player_id?: string
  course_id?: string
  hole_id?: string
  round_game_id?: string
  photo_url?: string
  metadata?: Record<string, unknown>
  client?: SupabaseClient
}) {
  const supabase = params.client ?? await createClient()

  const { error } = await supabase.from('activity_feed').insert({
    trip_id: params.trip_id,
    event_type: params.event_type,
    title: params.title,
    detail: params.detail || null,
    icon: params.icon || DEFAULT_ICONS[params.event_type] || '⛳',
    trip_player_id: params.trip_player_id || null,
    course_id: params.course_id || null,
    hole_id: params.hole_id || null,
    round_game_id: params.round_game_id || null,
    photo_url: params.photo_url || null,
    metadata: params.metadata || {},
  })

  if (error) {
    console.error('Failed to post activity:', error.message)
  }
}

/**
 * Auto-detect birdie/eagle events from a score submission.
 * Pass `client` when calling from unauthenticated contexts.
 */
export async function detectScoringEvents(params: {
  trip_id: string
  trip_player_id: string
  player_name: string
  course_id: string
  hole_number: number
  hole_id: string
  gross_score: number
  par: number
  net_score: number
  client?: SupabaseClient
}) {
  const diff = params.net_score - params.par

  if (diff <= -2) {
    await postActivity({
      trip_id: params.trip_id,
      event_type: 'eagle',
      title: `${params.player_name} made eagle on Hole ${params.hole_number}!`,
      detail: `${params.gross_score} on the par ${params.par}`,
      trip_player_id: params.trip_player_id,
      course_id: params.course_id,
      hole_id: params.hole_id,
      client: params.client,
    })
  } else if (diff === -1) {
    await postActivity({
      trip_id: params.trip_id,
      event_type: 'birdie',
      title: `${params.player_name} birdied Hole ${params.hole_number}`,
      detail: `${params.gross_score} on the par ${params.par}`,
      trip_player_id: params.trip_player_id,
      course_id: params.course_id,
      hole_id: params.hole_id,
      client: params.client,
    })
  }
}
