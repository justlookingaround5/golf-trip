'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
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
  const profileHref = thread.type === 'dm' && thread.friendUserId
    ? `/profile/${thread.friendUserId}`
    : thread.type === 'trip' && thread.tripId
    ? `/trip/${thread.tripId}?from=messages`
    : null

  return (
    <div className="relative border-b border-gray-100 last:border-b-0">
      {/* Base link covers the entire card */}
      <Link href={`/messages/${thread.id}`} className="absolute inset-0" aria-label={`Open chat with ${thread.name}`} />

      <div className="relative flex items-center gap-3 px-4 py-3 pointer-events-none">
        {/* Avatar — links to profile for DMs, otherwise just decorative (base link handles it) */}
        {profileHref ? (
          <Link href={profileHref} className="relative z-10 shrink-0 pointer-events-auto">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full text-white font-bold text-base ${
              thread.type === 'trip' ? 'bg-golf-900' : 'bg-golf-600'
            }`}>
              {thread.type === 'trip' ? '✈️' : initial}
            </div>
          </Link>
        ) : (
          <div className="shrink-0">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full text-white font-bold text-base ${
              thread.type === 'trip' ? 'bg-golf-900' : 'bg-golf-600'
            }`}>
              {thread.type === 'trip' ? '✈️' : initial}
            </div>
          </div>
        )}

        <div className="flex flex-1 min-w-0 items-center gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              {profileHref ? (
                <Link href={profileHref} className="relative z-10 font-semibold text-gray-900 text-sm truncate hover:underline pointer-events-auto">
                  {thread.name}
                </Link>
              ) : (
                <p className="font-semibold text-gray-900 text-sm truncate">{thread.name}</p>
              )}
              <span className="text-xs text-gray-400 shrink-0">{relativeTime(thread.lastMessageAt)}</span>
            </div>
            <p className={`text-xs truncate mt-0.5 ${thread.unreadCount > 0 ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
              {thread.lastMessage ?? 'No messages yet'}
            </p>
          </div>

          {thread.unreadCount > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-golf-700 text-[10px] font-bold text-white px-1 shrink-0">
              {thread.unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function MessagesContent({ threads }: { threads: MessageThread[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tab: Tab = searchParams.get('tab') === 'trips' ? 'trips' : 'friends'

  const friendThreads = threads.filter(t => t.type === 'dm')
  const tripThreads   = threads.filter(t => t.type === 'trip')
  const shown = tab === 'friends' ? friendThreads : tripThreads

  const friendUnread = friendThreads.reduce((s, t) => s + t.unreadCount, 0)
  const tripUnread   = tripThreads.reduce((s, t) => s + t.unreadCount, 0)

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="bg-golf-800 px-4 pt-14 pb-4 text-white">
        <div className="mx-auto max-w-lg">
          <h1 className="text-xl font-bold">Messages</h1>
        </div>
      </header>

      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-lg flex">
        {([
          { key: 'friends', label: 'Friends', badge: friendUnread },
          { key: 'trips',   label: 'Trips',   badge: tripUnread   },
        ] as { key: Tab; label: string; badge: number }[]).map(({ key, label, badge }) => (
          <button
            key={key}
            onClick={() => router.push(`/messages?tab=${key}`)}
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
      </div>

      <div className="mx-auto max-w-lg">
        {shown.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-3xl mb-3">{tab === 'friends' ? '💬' : '✈️'}</p>
            <p className="text-sm text-gray-500">
              {tab === 'friends'
                ? 'No conversations yet'
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

export default function MessagesClient({ threads }: { threads: MessageThread[] }) {
  return (
    <Suspense>
      <MessagesContent threads={threads} />
    </Suspense>
  )
}
