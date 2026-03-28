'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface CommentReaction {
  emoji: string
  count: number
}

interface Comment {
  id: string
  user_id: string
  content: string
  gif_url: string | null
  created_at: string
  display_name?: string
  reactions: CommentReaction[]
  totalReactions: number
}

interface RoundCommentsProps {
  roundKey: string
  currentUserId: string | null
  commentCount: number
  onOpenSheet: () => void
  onCountChange?: (count: number) => void
}

function formatTimeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'now'
  if (diffMin < 60) return `${diffMin}m`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h`
  return `${Math.floor(diffHr / 24)}d`
}

export default function RoundComments({
  roundKey,
  currentUserId,
  commentCount: initialCount,
  onOpenSheet,
  onCountChange,
}: RoundCommentsProps) {
  const [topComment, setTopComment] = useState<Comment | null>(null)
  const [count, setCount] = useState(initialCount)
  const [loaded, setLoaded] = useState(false)
  const onCountChangeRef = useRef(onCountChange)
  onCountChangeRef.current = onCountChange

  // Sync count to parent
  useEffect(() => {
    onCountChangeRef.current?.(count)
  }, [count])

  // Load comments and find the top one (most reactions, or first)
  useEffect(() => {
    let cancelled = false
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('round_comments')
        .select('id, user_id, content, gif_url, created_at, parent_id')
        .eq('round_key', roundKey)
        .order('created_at', { ascending: true })

      if (cancelled || !data || data.length === 0) {
        setCount(data?.length ?? 0)
        setLoaded(true)
        return
      }

      // Only consider top-level comments for preview
      const topLevel = data.filter(c => !c.parent_id)

      const userIds = [...new Set(data.map(c => c.user_id))]
      const { data: profiles } = userIds.length > 0
        ? await supabase
            .from('player_profiles')
            .select('user_id, display_name')
            .in('user_id', userIds)
        : { data: [] }

      if (cancelled) return

      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, p.display_name || 'Unknown'])
      )

      // Fetch comment reactions grouped by emoji
      const commentIds = topLevel.map(c => c.id)
      const { data: commentLikes } = commentIds.length > 0
        ? await supabase
            .from('round_comment_likes')
            .select('comment_id, emoji')
            .in('comment_id', commentIds)
        : { data: [] }

      if (cancelled) return

      // Build reactions per comment: { commentId -> { emoji -> count } }
      const reactionMap = new Map<string, Map<string, number>>()
      for (const cl of commentLikes ?? []) {
        if (!reactionMap.has(cl.comment_id)) reactionMap.set(cl.comment_id, new Map())
        const emojiMap = reactionMap.get(cl.comment_id)!
        emojiMap.set(cl.emoji, (emojiMap.get(cl.emoji) ?? 0) + 1)
      }

      const enriched: Comment[] = topLevel.map(c => {
        const emojiMap = reactionMap.get(c.id)
        const reactions: CommentReaction[] = emojiMap
          ? [...emojiMap.entries()].map(([emoji, count]) => ({ emoji, count }))
          : []
        const totalReactions = reactions.reduce((sum, r) => sum + r.count, 0)
        return {
          ...c,
          gif_url: c.gif_url ?? null,
          display_name: profileMap.get(c.user_id) || 'Unknown',
          reactions,
          totalReactions,
        }
      })

      // Pick the comment with the most reactions, or fall back to the first
      const sorted = [...enriched].sort((a, b) => b.totalReactions - a.totalReactions)
      setTopComment(sorted[0] ?? null)
      setCount(data.length)
      setLoaded(true)
    }
    load()
    return () => { cancelled = true }
  }, [roundKey, currentUserId])

  // Realtime subscription for count updates
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`round-comments-${roundKey}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'round_comments', filter: `round_key=eq.${roundKey}` },
        async (payload) => {
          const rec = payload.new as { id: string; user_id: string; content: string; gif_url: string | null; created_at: string; parent_id: string | null }
          setCount(prev => prev + 1)

          if (!rec.parent_id) {
            const { data: profile } = await supabase
              .from('player_profiles')
              .select('display_name')
              .eq('user_id', rec.user_id)
              .single()

            setTopComment(prev => {
              if (prev) return prev
              return {
                ...rec,
                gif_url: rec.gif_url ?? null,
                display_name: profile?.display_name || 'Unknown',
                reactions: [],
                totalReactions: 0,
              }
            })
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'round_comments', filter: `round_key=eq.${roundKey}` },
        (payload) => {
          const oldRec = payload.old as { id: string }
          if (!oldRec.id) return
          setCount(prev => Math.max(0, prev - 1))
          setTopComment(prev => prev?.id === oldRec.id ? null : prev)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [roundKey, currentUserId])

  if (!loaded || count === 0 || !topComment) return null

  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      <button onClick={onOpenSheet} className="w-full text-left">
        <div className="flex items-start gap-1">
          <div className="flex-1 min-w-0">
            {topComment.gif_url ? (
              <div>
                <span className="text-[13px] font-semibold text-gray-900">{topComment.display_name}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={topComment.gif_url} alt="GIF" className="mt-1 rounded-lg max-w-[200px] max-h-[150px]" loading="lazy" />
              </div>
            ) : (
              <div className="text-[13px] leading-snug">
                <span className="font-semibold text-gray-900">{topComment.display_name}</span>{' '}
                <span className="text-gray-700">{topComment.content}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className="text-[11px] text-gray-400">{formatTimeAgo(topComment.created_at)}</span>
              {topComment.reactions.map(r => (
                <span
                  key={r.emoji}
                  className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] bg-gray-100 border border-gray-200 text-gray-600"
                >
                  <span>{r.emoji}</span>
                  <span className="font-medium">{r.count}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </button>
    </div>
  )
}
