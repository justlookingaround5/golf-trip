'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import GifPicker from '@/components/GifPicker'
import type { ReactionEmoji } from '@/lib/types'

const EMOJI_SET: ReactionEmoji[] = ['🔥', '😂', '💀', '⛳', '💰', '🏆', '🎯', '😤']

interface CommentReaction {
  emoji: ReactionEmoji
  count: number
  hasReacted: boolean
}

interface Comment {
  id: string
  user_id: string
  content: string
  gif_url: string | null
  created_at: string
  parent_id: string | null
  display_name?: string
  reactions: CommentReaction[]
}

interface CommentSheetProps {
  roundKey: string
  currentUserId: string | null
  onClose: () => void
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

export default function CommentSheet({ roundKey, currentUserId, onClose }: CommentSheetProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showGifPicker, setShowGifPicker] = useState(false)
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null)
  const [pickerCommentId, setPickerCommentId] = useState<string | null>(null)
  const [sortedTopIds, setSortedTopIds] = useState<string[] | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Escape to close + body scroll lock
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (pickerCommentId) {
          setPickerCommentId(null)
        } else if (replyingTo) {
          setReplyingTo(null)
        } else {
          onClose()
        }
      }
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKey)
    }
  }, [onClose, replyingTo, pickerCommentId])

  // Load comments
  useEffect(() => {
    let cancelled = false
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('round_comments')
        .select('id, user_id, content, gif_url, created_at, parent_id')
        .eq('round_key', roundKey)
        .order('created_at', { ascending: true })

      if (cancelled || !data) return

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

      const commentIds = data.map(c => c.id)
      const { data: commentLikes } = commentIds.length > 0
        ? await supabase
            .from('round_comment_likes')
            .select('comment_id, user_id, emoji')
            .in('comment_id', commentIds)
        : { data: [] }

      if (cancelled) return

      // Build reactions per comment: { commentId -> { emoji -> { count, userIds } } }
      const reactionMap = new Map<string, Map<string, { count: number; hasReacted: boolean }>>()
      for (const cl of commentLikes ?? []) {
        if (!reactionMap.has(cl.comment_id)) reactionMap.set(cl.comment_id, new Map())
        const emojiMap = reactionMap.get(cl.comment_id)!
        const existing = emojiMap.get(cl.emoji) ?? { count: 0, hasReacted: false }
        existing.count++
        if (cl.user_id === currentUserId) existing.hasReacted = true
        emojiMap.set(cl.emoji, existing)
      }

      setComments(data.map(c => {
        const emojiMap = reactionMap.get(c.id)
        const reactions: CommentReaction[] = emojiMap
          ? [...emojiMap.entries()].map(([emoji, { count, hasReacted }]) => ({
              emoji: emoji as ReactionEmoji, count, hasReacted,
            }))
          : []
        return {
          ...c,
          gif_url: c.gif_url ?? null,
          parent_id: c.parent_id ?? null,
          display_name: profileMap.get(c.user_id) || 'Unknown',
          reactions,
        }
      }))
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [roundKey, currentUserId])

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`comment-sheet-${roundKey}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'round_comments', filter: `round_key=eq.${roundKey}` },
        async (payload) => {
          const rec = payload.new as { id: string; user_id: string; content: string; gif_url: string | null; created_at: string; parent_id: string | null }
          if (rec.user_id === currentUserId) return

          const { data: profile } = await supabase
            .from('player_profiles')
            .select('display_name')
            .eq('user_id', rec.user_id)
            .single()

          const comment: Comment = {
            ...rec,
            gif_url: rec.gif_url ?? null,
            parent_id: rec.parent_id ?? null,
            display_name: profile?.display_name || 'Unknown',
            reactions: [],
          }

          setComments(prev => [...prev, comment])
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'round_comments', filter: `round_key=eq.${roundKey}` },
        (payload) => {
          const oldRec = payload.old as { id: string }
          if (!oldRec.id) return
          setComments(prev => prev.filter(c => c.id !== oldRec.id))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [roundKey, currentUserId])

  const submitComment = useCallback(async () => {
    if (!currentUserId || !newComment.trim() || submitting) return
    setSubmitting(true)
    const supabase = createClient()
    const content = newComment.trim()
    const parentId = replyingTo?.id ?? null

    const { data: profile } = await supabase
      .from('player_profiles')
      .select('display_name')
      .eq('user_id', currentUserId)
      .single()

    const tempId = crypto.randomUUID()
    const tempComment: Comment = {
      id: tempId,
      user_id: currentUserId,
      content,
      gif_url: null,
      created_at: new Date().toISOString(),
      parent_id: parentId,
      display_name: profile?.display_name || 'You',
      reactions: [],
    }

    setComments(prev => [...prev, tempComment])
    setNewComment('')
    setReplyingTo(null)

    const insertData: { round_key: string; user_id: string; content: string; parent_id?: string } = {
      round_key: roundKey, user_id: currentUserId, content,
    }
    if (parentId) insertData.parent_id = parentId

    const { data, error } = await supabase
      .from('round_comments')
      .insert(insertData)
      .select('id')
      .single()

    if (error) {
      console.error('Failed to insert comment:', JSON.stringify(error), error.message, error.code, error.details)
      setComments(prev => prev.filter(c => c.id !== tempId))
    } else if (data) {
      setComments(prev => prev.map(c => c.id === tempId ? { ...c, id: data.id } : c))
    }
    setSubmitting(false)
  }, [currentUserId, newComment, submitting, roundKey, replyingTo])

  const handleGifSelect = useCallback(async (gifUrl: string) => {
    if (!currentUserId) return
    setShowGifPicker(false)
    const parentId = replyingTo?.id ?? null

    const supabase = createClient()
    const { data: profile } = await supabase
      .from('player_profiles')
      .select('display_name')
      .eq('user_id', currentUserId)
      .single()

    const tempId = crypto.randomUUID()
    const tempComment: Comment = {
      id: tempId,
      user_id: currentUserId,
      content: '[GIF]',
      gif_url: gifUrl,
      created_at: new Date().toISOString(),
      parent_id: parentId,
      display_name: profile?.display_name || 'You',
      reactions: [],
    }

    setComments(prev => [...prev, tempComment])
    setReplyingTo(null)

    const insertData: { round_key: string; user_id: string; content: string; gif_url: string; parent_id?: string } = {
      round_key: roundKey, user_id: currentUserId, content: '[GIF]', gif_url: gifUrl,
    }
    if (parentId) insertData.parent_id = parentId

    const { data } = await supabase
      .from('round_comments')
      .insert(insertData)
      .select('id')
      .single()

    if (data) {
      setComments(prev => prev.map(c => c.id === tempId ? { ...c, id: data.id } : c))
    }
  }, [currentUserId, roundKey, replyingTo])

  const commentsRef = useRef(comments)
  commentsRef.current = comments

  const toggleCommentReaction = useCallback(async (commentId: string, emoji: ReactionEmoji) => {
    if (!currentUserId) return

    const comment = commentsRef.current.find(c => c.id === commentId)
    const wasReacted = comment?.reactions.find(r => r.emoji === emoji)?.hasReacted ?? false

    setComments(prev => prev.map(c => {
      if (c.id !== commentId) return c
      const existing = c.reactions.find(r => r.emoji === emoji)
      let newReactions: CommentReaction[]
      if (wasReacted) {
        newReactions = c.reactions
          .map(r => r.emoji === emoji ? { ...r, count: r.count - 1, hasReacted: false } : r)
          .filter(r => r.count > 0)
      } else if (existing) {
        newReactions = c.reactions.map(r => r.emoji === emoji ? { ...r, count: r.count + 1, hasReacted: true } : r)
      } else {
        newReactions = [...c.reactions, { emoji, count: 1, hasReacted: true }]
      }
      return { ...c, reactions: newReactions }
    }))
    setPickerCommentId(null)

    const supabase = createClient()
    if (wasReacted) {
      await supabase
        .from('round_comment_likes')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', currentUserId)
        .eq('emoji', emoji)
    } else {
      await supabase
        .from('round_comment_likes')
        .insert({ comment_id: commentId, user_id: currentUserId, emoji })
    }
  }, [currentUserId])

  const deleteComment = useCallback(async (commentId: string) => {
    setComments(prev => prev.filter(c => c.id !== commentId && c.parent_id !== commentId))
    const supabase = createClient()
    await supabase.from('round_comments').delete().eq('id', commentId)
  }, [])

  const handleReply = useCallback((comment: Comment) => {
    setReplyingTo({ id: comment.id, name: comment.display_name ?? 'Unknown' })
    inputRef.current?.focus()
  }, [])

  // Sort by most reactions on initial load, then keep stable order while sheet is open
  const topLevelUnsorted = comments.filter(c => !c.parent_id)

  // Set initial sort order once comments load
  useEffect(() => {
    if (!loading && sortedTopIds === null && topLevelUnsorted.length > 0) {
      const sorted = [...topLevelUnsorted].sort((a, b) => {
        const aTotal = a.reactions.reduce((sum, r) => sum + r.count, 0)
        const bTotal = b.reactions.reduce((sum, r) => sum + r.count, 0)
        if (bTotal !== aTotal) return bTotal - aTotal
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      })
      setSortedTopIds(sorted.map(c => c.id))
    }
  }, [loading, sortedTopIds, topLevelUnsorted])

  // Use stable order, appending any new comments at the end
  const topLevel = sortedTopIds
    ? [
        ...sortedTopIds.map(id => topLevelUnsorted.find(c => c.id === id)).filter((c): c is Comment => !!c),
        ...topLevelUnsorted.filter(c => !sortedTopIds.includes(c.id)),
      ]
    : topLevelUnsorted
  const repliesByParent = new Map<string, Comment[]>()
  for (const c of comments) {
    if (c.parent_id) {
      const arr = repliesByParent.get(c.parent_id) ?? []
      arr.push(c)
      repliesByParent.set(c.parent_id, arr)
    }
  }

  const unusedEmojis = useCallback((commentId: string) => {
    const comment = comments.find(c => c.id === commentId)
    return EMOJI_SET.filter(e => !comment?.reactions.find(r => r.emoji === e))
  }, [comments])

  function renderComment(c: Comment, isReply: boolean) {
    return (
      <div key={c.id} className={`group ${isReply ? 'ml-6 mt-2' : ''}`}>
        <div className="flex items-start gap-1">
          <div className="flex-1 min-w-0">
            {c.gif_url ? (
              <div>
                <span className="text-[13px] font-semibold text-gray-900">{c.display_name}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.gif_url} alt="GIF" className="mt-1 rounded-lg max-w-[200px] max-h-[150px]" loading="lazy" />
              </div>
            ) : (
              <div className="text-[13px] leading-snug">
                <span className="font-semibold text-gray-900">{c.display_name}</span>{' '}
                <span className="text-gray-700">{c.content}</span>
              </div>
            )}
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] text-gray-400">{formatTimeAgo(c.created_at)}</span>
              {currentUserId && (
                <button
                  onClick={() => handleReply(c)}
                  className="text-[11px] font-semibold text-gray-400 hover:text-gray-600"
                >
                  Reply
                </button>
              )}
              {c.user_id === currentUserId && (
                <button
                  onClick={() => deleteComment(c.id)}
                  className="text-[11px] text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Delete
                </button>
              )}
            </div>
            {/* Emoji reaction pills */}
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              {c.reactions.map(r => (
                <button
                  key={r.emoji}
                  onClick={() => toggleCommentReaction(c.id, r.emoji)}
                  className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] transition-colors ${
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
                    onClick={() => setPickerCommentId(prev => prev === c.id ? null : c.id)}
                    className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 border border-gray-200 text-gray-400 hover:bg-gray-200 text-[10px]"
                  >
                    +
                  </button>
                  {pickerCommentId === c.id && unusedEmojis(c.id).length > 0 && (
                    <div className="absolute bottom-full left-0 mb-1 flex gap-1 rounded-lg bg-white border border-gray-200 shadow-lg p-1 z-10">
                      {unusedEmojis(c.id).map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => toggleCommentReaction(c.id, emoji)}
                          className="text-base hover:scale-125 transition-transform p-0.5"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 transition-opacity pointer-events-none" />

      {/* Sheet */}
      <div className="relative z-10 w-full max-w-lg rounded-t-2xl bg-white shadow-xl animate-in slide-in-from-bottom duration-200 min-h-[80vh] max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-lg font-bold text-gray-900">Comments ({comments.length})</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-8">Loading comments...</p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No comments yet. Be the first!</p>
          ) : (
            topLevel.map(c => (
              <div key={c.id}>
                {renderComment(c, false)}
                {(repliesByParent.get(c.id) ?? []).map(reply => renderComment(reply, true))}
              </div>
            ))
          )}
        </div>

        {/* Sticky input at bottom */}
        {currentUserId && (
          <div className="border-t border-gray-100 px-5 py-3">
            {replyingTo && (
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Replying to <span className="font-semibold text-gray-600">{replyingTo.name}</span></span>
                <button onClick={() => setReplyingTo(null)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
              </div>
            )}
            <div className="relative flex items-center gap-2">
              <button
                onClick={() => setShowGifPicker(prev => !prev)}
                className="text-[11px] font-bold text-gray-400 hover:text-gray-600 border border-gray-300 rounded px-1.5 py-0.5 shrink-0 transition"
              >
                GIF
              </button>
              <input
                ref={inputRef}
                type="text"
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitComment()}
                placeholder={replyingTo ? `Reply to ${replyingTo.name}...` : 'Add a comment...'}
                maxLength={500}
                className="flex-1 text-[13px] text-gray-700 placeholder-gray-400 bg-transparent border-none outline-none py-1"
                autoFocus
              />
              {newComment.trim() && (
                <button
                  onClick={submitComment}
                  disabled={submitting}
                  className="text-[13px] font-semibold text-blue-500 disabled:opacity-40"
                >
                  Post
                </button>
              )}
              {showGifPicker && (
                <GifPicker
                  onSelect={handleGifSelect}
                  onClose={() => setShowGifPicker(false)}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
