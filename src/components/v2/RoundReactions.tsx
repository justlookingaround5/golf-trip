'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ReactionEmoji } from '@/lib/types'

const EMOJI_SET: ReactionEmoji[] = ['🔥', '😂', '💀', '⛳', '💰', '🏆', '🎯', '😤']

interface ReactionCount {
  emoji: ReactionEmoji
  count: number
  hasReacted: boolean
}

interface RoundReactionsProps {
  roundKey: string
  currentUserId: string | null
  initialReactions: { emoji: string; count: number; user_ids: string[] }[]
}

export default function RoundReactions({
  roundKey,
  currentUserId,
  initialReactions,
}: RoundReactionsProps) {
  const [reactions, setReactions] = useState<ReactionCount[]>(() =>
    initialReactions.map(r => ({
      emoji: r.emoji as ReactionEmoji,
      count: r.count,
      hasReacted: currentUserId ? r.user_ids.includes(currentUserId) : false,
    }))
  )
  const [showPicker, setShowPicker] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showPicker) return
    const handleClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showPicker])

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
        .from('round_likes')
        .delete()
        .eq('round_key', roundKey)
        .eq('user_id', currentUserId)
        .eq('emoji', emoji)
    } else {
      await supabase
        .from('round_likes')
        .insert({ round_key: roundKey, user_id: currentUserId, emoji })
    }
  }, [roundKey, currentUserId, reactions])

  const unusedEmojis = EMOJI_SET.filter(e => !reactions.find(r => r.emoji === e))

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
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
        <div className="relative" ref={pickerRef}>
          <button
            onClick={() => setShowPicker(p => !p)}
            className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 border border-gray-200 text-gray-400 hover:bg-gray-200 text-xs"
          >
            +
          </button>
          {showPicker && unusedEmojis.length > 0 && (
            <div className="absolute bottom-full left-0 mb-1.5 flex gap-1 rounded-lg bg-white border border-gray-200 shadow-lg p-1.5 z-10">
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
