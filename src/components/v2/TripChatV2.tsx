'use client'

// Reusable chat component for both 1:1 DMs and trip group chats.
// Automated system notifications display differently from user messages.
// STUB: replace send logic with Supabase realtime channel.

import { useState, useRef, useEffect } from 'react'
import type { ChatMessageV2 } from '@/lib/v2/types'

interface TripChatV2Props {
  threadName: string
  messages: ChatMessageV2[]
  currentUserId: string
  /** Called when user sends a message — stub: just appends locally */
  onSend?: (content: string) => void
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className="h-8 w-8 rounded-full object-cover shrink-0" />
  }
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-golf-600 text-xs font-bold text-white shrink-0">
      {name[0]?.toUpperCase()}
    </div>
  )
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export default function TripChatV2({
  threadName,
  messages: initialMessages,
  currentUserId,
  onSend,
}: TripChatV2Props) {
  const [messages, setMessages] = useState<ChatMessageV2[]>(initialMessages)
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSend() {
    const content = draft.trim()
    if (!content) return
    const newMsg: ChatMessageV2 = {
      id: `local-${Date.now()}`,
      senderId: currentUserId,
      senderName: 'You',
      senderAvatarUrl: null,
      content,
      timestamp: new Date().toISOString(),
      isSystem: false,
    }
    setMessages(prev => [...prev, newMsg])
    setDraft('')
    onSend?.(content)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map(msg => {
          const isMe = msg.senderId === currentUserId

          if (msg.isSystem) {
            return (
              <div key={msg.id} className="flex justify-center">
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500">
                  {msg.content}
                </span>
              </div>
            )
          }

          return (
            <div
              key={msg.id}
              className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {!isMe && <Avatar name={msg.senderName} url={msg.senderAvatarUrl} />}

              <div className={`max-w-[70%] space-y-0.5 ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                {!isMe && (
                  <p className="text-[10px] text-gray-400 px-1">{msg.senderName}</p>
                )}
                <div
                  className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                    isMe
                      ? 'bg-golf-800 text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
                <p className="text-[10px] text-gray-300 px-1">{formatTime(msg.timestamp)}</p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-gray-200 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2">
          <input
            type="text"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder={`Message ${threadName}…`}
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!draft.trim()}
            aria-label="Send"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-golf-800 text-white disabled:opacity-30 transition shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
