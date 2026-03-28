'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Message {
  id: string
  user_id: string
  content: string
  created_at: string
  display_name: string
  avatar_url: string | null
}

interface DmChatClientProps {
  friendUserId: string
  currentUserId: string
  initialMessages: Message[]
  currentUserProfile: { display_name: string; avatar_url: string | null }
  friendName: string
  friendAvatarUrl: string | null
}

export default function DmChatClient({
  friendUserId,
  currentUserId,
  initialMessages,
  currentUserProfile,
  friendName,
  friendAvatarUrl,
}: DmChatClientProps) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(initialMessages.length >= 50)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`dm-${[currentUserId, friendUserId].sort().join('-')}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `or(and(sender_id.eq.${currentUserId},receiver_id.eq.${friendUserId}),and(sender_id.eq.${friendUserId},receiver_id.eq.${currentUserId}))`,
        },
        (payload) => {
          const msg = payload.new as { id: string; sender_id: string; receiver_id: string; content: string; created_at: string }

          if (msg.sender_id === currentUserId) return // Already optimistically added

          setMessages(prev => [...prev, {
            id: msg.id,
            user_id: msg.sender_id,
            content: msg.content,
            created_at: msg.created_at,
            display_name: friendName,
            avatar_url: friendAvatarUrl,
          }])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [currentUserId, friendUserId, friendName, friendAvatarUrl])

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
      .from('direct_messages')
      .insert({ sender_id: currentUserId, receiver_id: friendUserId, content })
      .select('id')
      .single()

    if (data) {
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: data.id } : m))
    }
    setSending(false)
  }, [newMessage, sending, currentUserId, friendUserId, currentUserProfile])

  const loadMore = async () => {
    if (loadingMore || !hasMore || messages.length === 0) return
    setLoadingMore(true)
    const supabase = createClient()
    const oldest = messages[0]

    const { data } = await supabase
      .from('direct_messages')
      .select('id, sender_id, receiver_id, content, created_at')
      .or(
        `and(sender_id.eq.${currentUserId},receiver_id.eq.${friendUserId}),and(sender_id.eq.${friendUserId},receiver_id.eq.${currentUserId})`
      )
      .lt('created_at', oldest.created_at)
      .order('created_at', { ascending: false })
      .limit(50)

    if (data && data.length > 0) {
      const enriched = data.reverse().map(m => ({
        id: m.id,
        user_id: m.sender_id,
        content: m.content,
        created_at: m.created_at,
        display_name: m.sender_id === currentUserId
          ? currentUserProfile.display_name
          : friendName,
        avatar_url: m.sender_id === currentUserId
          ? currentUserProfile.avatar_url
          : friendAvatarUrl,
      }))

      setMessages(prev => [...enriched, ...prev])
      setHasMore(data.length >= 50)
    } else {
      setHasMore(false)
    }
    setLoadingMore(false)
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <header className="bg-golf-800 px-4 pt-14 pb-4 text-white">
        <div className="mx-auto max-w-lg flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-golf-300 hover:text-white transition shrink-0"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          {friendAvatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={friendAvatarUrl} alt="" className="h-8 w-8 rounded-full" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-golf-600 text-sm font-bold text-white">
              {friendName[0]?.toUpperCase()}
            </div>
          )}
          <h1 className="text-lg font-bold leading-tight">{friendName}</h1>
        </div>
      </header>

      {/* Messages container */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-lg space-y-3">
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
              No messages yet. Say hello!
            </p>
          )}

          {messages.map(msg => {
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
        <div className="mx-auto max-w-lg flex gap-2">
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
    </div>
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
