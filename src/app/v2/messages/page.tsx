'use client'

// MESSAGES TAB — Friends (1:1 DMs) and Trips (group chats)

import { useState } from 'react'
import Link from 'next/link'
import { STUB_THREADS } from '@/lib/v2/stub-data'
import type { MessageThread } from '@/lib/v2/types'

type Tab = 'friends' | 'trips'

function relativeTime(ts: string | null): string {
  if (!ts) return ''
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

function ThreadRow({ thread }: { thread: MessageThread }) {
  const initial = thread.name[0]?.toUpperCase() ?? '?'
  return (
    <Link
      href={`/v2/messages/${thread.id}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition border-b border-gray-100 last:border-b-0"
    >
      {/* Avatar */}
      {thread.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thread.avatarUrl} alt={thread.name} className="h-12 w-12 rounded-full object-cover shrink-0" />
      ) : (
        <div className={`flex h-12 w-12 items-center justify-center rounded-full text-white font-bold text-base shrink-0 ${
          thread.type === 'trip' ? 'bg-golf-900' : 'bg-golf-600'
        }`}>
          {thread.type === 'trip' ? '✈️' : initial}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-gray-900 text-sm truncate">{thread.name}</p>
          <span className="text-xs text-gray-400 shrink-0">{relativeTime(thread.lastMessageAt)}</span>
        </div>
        <p className={`text-xs truncate mt-0.5 ${thread.unreadCount > 0 ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
          {thread.lastMessage ?? 'No messages yet'}
        </p>
      </div>

      {/* Unread badge */}
      {thread.unreadCount > 0 && (
        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-golf-700 text-[10px] font-bold text-white px-1 shrink-0">
          {thread.unreadCount}
        </span>
      )}
    </Link>
  )
}

export default function MessagesPage() {
  const [tab, setTab] = useState<Tab>('friends')

  const friendThreads = STUB_THREADS.filter(t => t.type === 'dm')
  const tripThreads   = STUB_THREADS.filter(t => t.type === 'trip')
  const shown = tab === 'friends' ? friendThreads : tripThreads

  const friendUnread = friendThreads.reduce((s, t) => s + t.unreadCount, 0)
  const tripUnread   = tripThreads.reduce((s, t) => s + t.unreadCount, 0)

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <header className="bg-golf-800 px-4 pt-14 pb-6 text-white">
        <h1 className="text-2xl font-bold">Messages</h1>
      </header>

      {/* Tab bar */}
      <div className="sticky top-0 z-10 flex border-b border-gray-200 bg-white">
        {([
          { key: 'friends', label: 'Friends', badge: friendUnread },
          { key: 'trips',   label: 'Trips',   badge: tripUnread   },
        ] as { key: Tab; label: string; badge: number }[]).map(({ key, label, badge }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-semibold transition-colors ${
              tab === key
                ? 'text-golf-700 border-b-2 border-golf-700'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {label}
            {badge > 0 && (
              <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-golf-700 text-[9px] font-bold text-white px-1">
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Thread list */}
      <div className="mx-auto max-w-lg">
        {shown.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-3xl mb-3">{tab === 'friends' ? '💬' : '✈️'}</p>
            <p className="text-sm text-gray-500">
              {tab === 'friends'
                ? 'No direct messages yet. Add friends from your profile.'
                : 'No trip chats yet. Join or create a trip.'}
            </p>
          </div>
        ) : (
          <div className="bg-white mt-2 rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {shown.map(t => <ThreadRow key={t.id} thread={t} />)}
          </div>
        )}
      </div>
    </div>
  )
}
