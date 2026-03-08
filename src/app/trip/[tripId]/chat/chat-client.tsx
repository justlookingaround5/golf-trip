'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Message {
  id: string
  user_id: string | null
  content: string
  created_at: string
  display_name: string
  avatar_url: string | null
  is_system?: boolean
  system_type?: string | null
}

interface ChatClientProps {
  tripId: string
  currentUserId: string
  initialMessages: Message[]
  currentUserProfile: { display_name: string; avatar_url: string | null }
}

export default function ChatClient({
  tripId,
  currentUserId,
  initialMessages,
  currentUserProfile,
}: ChatClientProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(initialMessages.length >= 50)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const profileCacheRef = useRef<Map<string, { display_name: string; avatar_url: string | null }>>(
    new Map()
  )

  // Seed profile cache
  useEffect(() => {
    for (const m of initialMessages) {
      if (m.user_id) {
        profileCacheRef.current.set(m.user_id, {
          display_name: m.display_name,
          avatar_url: m.avatar_url,
        })
      }
    }
    profileCacheRef.current.set(currentUserId, currentUserProfile)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`trip-${tripId}-chat`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'trip_messages', filter: `trip_id=eq.${tripId}` },
        async (payload) => {
          const msg = payload.new as { id: string; user_id: string | null; content: string; created_at: string; is_system?: boolean; system_type?: string | null }

          // System messages
          if (msg.is_system || !msg.user_id) {
            setMessages(prev => [...prev, {
              ...msg,
              user_id: null,
              is_system: true,
              system_type: msg.system_type ?? null,
              display_name: 'ForeLive',
              avatar_url: null,
            }])
            return
          }

          if (msg.user_id === currentUserId) return // Already optimistically added

          let profile = profileCacheRef.current.get(msg.user_id)
          if (!profile) {
            const { data } = await supabase
              .from('player_profiles')
              .select('display_name, avatar_url')
              .eq('user_id', msg.user_id)
              .single()
            profile = {
              display_name: data?.display_name || 'Unknown',
              avatar_url: data?.avatar_url || null,
            }
            profileCacheRef.current.set(msg.user_id, profile)
          }

          setMessages(prev => [...prev, {
            ...msg,
            display_name: profile!.display_name,
            avatar_url: profile!.avatar_url,
          }])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [tripId, currentUserId])

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || sending) return
    setSending(true)
    const content = newMessage.trim()
    setNewMessage('')

    // Optimistic add
    const tempId = crypto.randomUUID()
    setMessages(prev => [...prev, {
      id: tempId,
      user_id: currentUserId,
      content,
      created_at: new Date().toISOString(),
      display_name: currentUserProfile.display_name,
      avatar_url: currentUserProfile.avatar_url,
    }])

    const supabase = createClient()
    const { data } = await supabase
      .from('trip_messages')
      .insert({ trip_id: tripId, user_id: currentUserId, content })
      .select('id')
      .single()

    if (data) {
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: data.id } : m))
    }
    setSending(false)
  }, [newMessage, sending, tripId, currentUserId, currentUserProfile])

  const loadMore = async () => {
    if (loadingMore || !hasMore || messages.length === 0) return
    setLoadingMore(true)
    const supabase = createClient()
    const oldest = messages[0]

    const { data } = await supabase
      .from('trip_messages')
      .select('id, user_id, content, created_at, is_system, system_type')
      .eq('trip_id', tripId)
      .lt('created_at', oldest.created_at)
      .order('created_at', { ascending: false })
      .limit(50)

    if (data && data.length > 0) {
      // Fetch profiles for new authors
      const newUserIds = [...new Set(data.filter(m => m.user_id).map(m => m.user_id!))].filter(
        id => !profileCacheRef.current.has(id)
      )
      if (newUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('player_profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', newUserIds)
        for (const p of profiles || []) {
          profileCacheRef.current.set(p.user_id, {
            display_name: p.display_name || 'Unknown',
            avatar_url: p.avatar_url,
          })
        }
      }

      const enriched = data.reverse().map(m => ({
        ...m,
        is_system: m.is_system ?? false,
        system_type: m.system_type ?? null,
        display_name: m.is_system || !m.user_id
          ? 'ForeLive'
          : profileCacheRef.current.get(m.user_id!)?.display_name || 'Unknown',
        avatar_url: m.is_system || !m.user_id
          ? null
          : profileCacheRef.current.get(m.user_id!)?.avatar_url || null,
      }))

      setMessages(prev => [...enriched, ...prev])
      setHasMore(data.length >= 50)
    } else {
      setHasMore(false)
    }
    setLoadingMore(false)
  }

  return (
    <>
      {/* Messages container */}
      <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-2xl space-y-3">
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full text-center text-xs text-gray-500 hover:text-gray-700 py-2"
            >
              {loadingMore ? 'Loading...' : 'Load older messages'}
            </button>
          )}

          {messages.length === 0 && (
            <p className="text-center text-sm text-gray-500 py-12">
              No messages yet. Break the ice!
            </p>
          )}

          {messages.map(msg => {
            // System messages — centered pill with event-specific styling
            if (msg.is_system || !msg.user_id) {
              const systemStyles: Record<string, { bubble: string; text: string }> = {
                eagle:          { bubble: 'bg-golf-100 border border-golf-300',    text: 'text-golf-900' },
                birdie:         { bubble: 'bg-golf-50 border border-golf-200',     text: 'text-golf-800' },
                bad_score:      { bubble: 'bg-orange-50 border border-orange-200', text: 'text-orange-800' },
                skin_won:       { bubble: 'bg-yellow-50 border border-yellow-300', text: 'text-yellow-900' },
                match_complete: { bubble: 'bg-blue-50 border border-blue-200',     text: 'text-blue-900' },
              }
              const style = (msg.system_type && systemStyles[msg.system_type]) || { bubble: 'bg-gray-100', text: 'text-gray-600' }
              return (
                <div key={msg.id} className="flex justify-center">
                  <div className={`max-w-[85%] rounded-lg px-3 py-1.5 text-center ${style.bubble}`}>
                    <p className={`text-xs font-medium ${style.text}`}>{msg.content}</p>
                    <p className="text-[9px] text-gray-400 mt-0.5">{formatTime(msg.created_at)}</p>
                  </div>
                </div>
              )
            }

            const isOwn = msg.user_id === currentUserId
            return (
              <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] ${isOwn ? 'items-end' : 'items-start'}`}>
                  {!isOwn && (
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {msg.avatar_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={msg.avatar_url} alt="" className="h-4 w-4 rounded-full" />
                      ) : (
                        <div className="h-4 w-4 rounded-full bg-golf-200 flex items-center justify-center text-[8px] font-bold text-golf-800">
                          {msg.display_name[0]?.toUpperCase()}
                        </div>
                      )}
                      <span className="text-xs font-medium text-gray-500">{msg.display_name}</span>
                    </div>
                  )}
                  <div
                    className={`rounded-2xl px-3 py-2 text-sm ${
                      isOwn
                        ? 'bg-golf-700 text-white rounded-br-md'
                        : 'bg-white border border-gray-200 text-gray-900 rounded-bl-md'
                    }`}
                  >
                    {msg.content}
                  </div>
                  <p className={`text-[10px] text-gray-400 mt-0.5 ${isOwn ? 'text-right' : ''}`}>
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input bar */}
      <div className="border-t border-gray-200 bg-white px-4 py-3 shrink-0">
        <div className="mx-auto max-w-2xl flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Type a message..."
            maxLength={1000}
            className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm focus:border-golf-500 focus:outline-none"
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
            className="rounded-full bg-golf-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-golf-600"
          >
            Send
          </button>
        </div>
      </div>
    </>
  )
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHrs = diffMs / (1000 * 60 * 60)

  if (diffHrs < 24) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }
  if (diffHrs < 168) {
    return date.toLocaleDateString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}
