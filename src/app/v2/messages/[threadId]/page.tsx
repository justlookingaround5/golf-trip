'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import TripChatV2 from '@/components/v2/TripChatV2'
import { STUB_THREADS, STUB_CHAT_MESSAGES, STUB_FRIENDS, ME } from '@/lib/v2/stub-data'

export default function ThreadPage({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = use(params)
  const router = useRouter()

  // STUB: look up thread by id, or fall back to friend name if navigating via userId
  const friend = STUB_FRIENDS.find(f => f.id === threadId)
  const thread = STUB_THREADS.find(t => t.id === threadId) ?? {
    id: threadId,
    type: 'dm' as const,
    name: friend?.name ?? 'Unknown',
    avatarUrl: friend?.avatarUrl ?? null,
    lastMessage: null,
    lastMessageAt: null,
    unreadCount: 0,
  }

  // STUB: all threads use the same sample messages
  const messages = STUB_CHAT_MESSAGES

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      <header className="bg-golf-800 px-4 pt-14 pb-4 text-white flex items-center gap-3">
        <button onClick={() => router.back()} className="text-golf-300 hover:text-white transition shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <Link
          href={
            thread.type === 'dm' && thread.friendUserId
              ? `/v2/profile/${thread.friendUserId}`
              : thread.type === 'trip' && thread.tripId
              ? `/v2/trip/${thread.tripId}/leaderboard`
              : '#'
          }
          className="flex-1 min-w-0 flex items-center gap-1"
        >
          <div className="min-w-0">
            <h1 className="text-lg font-bold leading-tight">{thread.name}</h1>
            <p className="text-xs text-golf-300">
              {thread.type === 'trip' ? 'Group chat' : 'Direct message'}
            </p>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-golf-400 shrink-0 ml-1">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      </header>

      {/* Chat — flex-1 so it fills the screen between header and nav */}
      <div className="flex-1 overflow-hidden pb-20">
        <TripChatV2
          threadName={thread.name}
          messages={messages}
          currentUserId={ME.id}
        />
      </div>
    </div>
  )
}
