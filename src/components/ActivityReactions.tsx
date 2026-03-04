'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ReactionEmoji } from '@/lib/types'

const EMOJI_SET: ReactionEmoji[] = ['🔥', '👏', '😂', '💀', '⛳', '💰']

interface ReactionCount {
  emoji: ReactionEmoji
  count: number
  hasReacted: boolean
}

interface ActivityReactionsProps {
  activityId: string
  currentUserId: string | null
  initialReactions: { emoji: ReactionEmoji; count: number; user_ids: string[] }[]
}

export default function ActivityReactions({
  activityId,
  currentUserId,
  initialReactions,
}: ActivityReactionsProps) {
  const [reactions, setReactions] = useState<ReactionCount[]>(() =>
    initialReactions.map(r => ({
      emoji: r.emoji,
      count: r.count,
      hasReacted: currentUserId ? r.user_ids.includes(currentUserId) : false,
    }))
  )
  const [showPicker, setShowPicker] = useState(false)

  const toggleReaction = useCallback(async (emoji: ReactionEmoji) => {
    if (!currentUserId) return
    const supabase = createClient()

    const existing = reactions.find(r => r.emoji === emoji)
    const wasReacted = existing?.hasReacted ?? false

    // Optimistic update
    setReactions(prev => {
      if (wasReacted) {
        return prev
          .map(r => r.emoji === emoji ? { ...r, count: r.count - 1, hasReacted: false } : r)
          .filter(r => r.count > 0)
      } else {
        const exists = prev.find(r => r.emoji === emoji)
        if (exists) {
          return prev.map(r => r.emoji === emoji ? { ...r, count: r.count + 1, hasReacted: true } : r)
        }
        return [...prev, { emoji, count: 1, hasReacted: true }]
      }
    })
    setShowPicker(false)

    if (wasReacted) {
      await supabase
        .from('activity_reactions')
        .delete()
        .eq('activity_id', activityId)
        .eq('user_id', currentUserId)
        .eq('emoji', emoji)
    } else {
      await supabase
        .from('activity_reactions')
        .insert({ activity_id: activityId, user_id: currentUserId, emoji })
    }
  }, [activityId, currentUserId, reactions])

  // Handle realtime updates
  const handleRealtimeReaction = useCallback((payload: { eventType: string; new?: { emoji: ReactionEmoji; user_id: string }; old?: { emoji: ReactionEmoji; user_id: string } }) => {
    if (payload.eventType === 'INSERT' && payload.new) {
      const { emoji, user_id } = payload.new
      if (user_id === currentUserId) return // Already optimistically updated
      setReactions(prev => {
        const exists = prev.find(r => r.emoji === emoji)
        if (exists) {
          return prev.map(r => r.emoji === emoji ? { ...r, count: r.count + 1 } : r)
        }
        return [...prev, { emoji, count: 1, hasReacted: false }]
      })
    } else if (payload.eventType === 'DELETE' && payload.old) {
      const { emoji, user_id } = payload.old
      if (user_id === currentUserId) return
      setReactions(prev =>
        prev
          .map(r => r.emoji === emoji ? { ...r, count: r.count - 1 } : r)
          .filter(r => r.count > 0)
      )
    }
  }, [currentUserId])

  // Expose handler for parent to wire up realtime
  ;(ActivityReactions as unknown as { handleRealtimeReaction: typeof handleRealtimeReaction }).handleRealtimeReaction = handleRealtimeReaction

  const unusedEmojis = EMOJI_SET.filter(e => !reactions.find(r => r.emoji === e))

  return (
    <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
      {reactions.map(r => (
        <button
          key={r.emoji}
          onClick={() => toggleReaction(r.emoji)}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors ${
            r.hasReacted
              ? 'bg-golf-100 border border-golf-400 text-golf-800'
              : 'bg-gray-100 border border-gray-200 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <span>{r.emoji}</span>
          <span className="font-medium">{r.count}</span>
        </button>
      ))}
      {currentUserId && (
        <div className="relative">
          <button
            onClick={() => setShowPicker(p => !p)}
            className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 border border-gray-200 text-gray-400 hover:bg-gray-200 text-xs"
          >
            +
          </button>
          {showPicker && unusedEmojis.length > 0 && (
            <div className="absolute bottom-full left-0 mb-1 flex gap-1 rounded-lg bg-white border border-gray-200 shadow-lg p-1.5 z-10">
              {unusedEmojis.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => toggleReaction(emoji)}
                  className="text-lg hover:scale-125 transition-transform p-0.5"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
