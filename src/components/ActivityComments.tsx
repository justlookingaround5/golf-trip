'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Comment {
  id: string
  user_id: string
  content: string
  created_at: string
  display_name?: string
}

interface ActivityCommentsProps {
  activityId: string
  currentUserId: string | null
  commentCount: number
}

export default function ActivityComments({
  activityId,
  currentUserId,
  commentCount: initialCount,
}: ActivityCommentsProps) {
  const [expanded, setExpanded] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [count, setCount] = useState(initialCount)
  const [submitting, setSubmitting] = useState(false)

  const loadComments = useCallback(async () => {
    if (comments.length > 0) {
      setExpanded(true)
      return
    }
    setLoading(true)
    const supabase = createClient()

    const { data } = await supabase
      .from('activity_comments')
      .select('id, user_id, content, created_at')
      .eq('activity_id', activityId)
      .order('created_at', { ascending: true })

    if (data && data.length > 0) {
      // Batch fetch profiles
      const userIds = [...new Set(data.map(c => c.user_id))]
      const { data: profiles } = await supabase
        .from('player_profiles')
        .select('user_id, display_name')
        .in('user_id', userIds)

      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, p.display_name || 'Unknown'])
      )

      setComments(data.map(c => ({
        ...c,
        display_name: profileMap.get(c.user_id) || 'Unknown',
      })))
    }

    setLoading(false)
    setExpanded(true)
  }, [activityId, comments.length])

  const submitComment = async () => {
    if (!currentUserId || !newComment.trim() || submitting) return
    setSubmitting(true)
    const supabase = createClient()
    const content = newComment.trim()

    // Fetch own display name
    const { data: profile } = await supabase
      .from('player_profiles')
      .select('display_name')
      .eq('user_id', currentUserId)
      .single()

    // Optimistic add
    const tempId = crypto.randomUUID()
    const tempComment: Comment = {
      id: tempId,
      user_id: currentUserId,
      content,
      created_at: new Date().toISOString(),
      display_name: profile?.display_name || 'You',
    }
    setComments(prev => [...prev, tempComment])
    setCount(prev => prev + 1)
    setNewComment('')

    const { data } = await supabase
      .from('activity_comments')
      .insert({ activity_id: activityId, user_id: currentUserId, content })
      .select('id')
      .single()

    if (data) {
      setComments(prev => prev.map(c => c.id === tempId ? { ...c, id: data.id } : c))
    }
    setSubmitting(false)
  }

  // Handle realtime comment inserts from other users
  const handleRealtimeComment = useCallback(async (payload: { new?: { id: string; user_id: string; content: string; created_at: string } }) => {
    if (!payload.new) return
    if (payload.new.user_id === currentUserId) return // Already optimistically added

    const supabase = createClient()
    const { data: profile } = await supabase
      .from('player_profiles')
      .select('display_name')
      .eq('user_id', payload.new.user_id)
      .single()

    const comment: Comment = {
      ...payload.new,
      display_name: profile?.display_name || 'Unknown',
    }

    setComments(prev => [...prev, comment])
    setCount(prev => prev + 1)
  }, [currentUserId])

  ;(ActivityComments as unknown as { handleRealtimeComment: typeof handleRealtimeComment }).handleRealtimeComment = handleRealtimeComment

  if (!expanded) {
    if (count === 0 && !currentUserId) return null
    return (
      <button
        onClick={loadComments}
        className="text-xs text-gray-500 hover:text-gray-700 mt-1"
      >
        {count > 0 ? `💬 ${count} comment${count === 1 ? '' : 's'}` : '💬 Comment'}
      </button>
    )
  }

  return (
    <div className="mt-2 space-y-2">
      {loading ? (
        <p className="text-xs text-gray-400">Loading...</p>
      ) : (
        <>
          {comments.map(c => (
            <div key={c.id} className="text-xs">
              <span className="font-medium text-gray-900">{c.display_name}</span>{' '}
              <span className="text-gray-600">{c.content}</span>
              <span className="ml-1 text-gray-400">{formatTimeAgo(c.created_at)}</span>
            </div>
          ))}
          {currentUserId && (
            <div className="flex gap-1.5">
              <input
                type="text"
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitComment()}
                placeholder="Add a comment..."
                maxLength={500}
                className="flex-1 rounded-md border border-gray-200 px-2 py-1 text-xs focus:border-golf-500 focus:outline-none"
              />
              <button
                onClick={submitComment}
                disabled={!newComment.trim() || submitting}
                className="rounded-md bg-golf-700 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
              >
                Post
              </button>
            </div>
          )}
        </>
      )}
      <button
        onClick={() => setExpanded(false)}
        className="text-xs text-gray-400 hover:text-gray-600"
      >
        Hide
      </button>
    </div>
  )
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
