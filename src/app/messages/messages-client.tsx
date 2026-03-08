'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Trip {
  id: string
  name: string
  status: string
}

interface Friend {
  userId: string
  displayName: string
  avatarUrl: string | null
}

interface MessagesClientProps {
  trips: Trip[]
  friends: Friend[]
}

type MsgTab = 'friends' | 'trips'

export default function MessagesClient({ trips, friends }: MessagesClientProps) {
  const [tab, setTab] = useState<MsgTab>('friends')

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-golf-900 px-4 pt-14 pb-4 text-white">
        <h1 className="text-xl font-bold">Messages</h1>
      </header>

      <div className="mx-auto max-w-lg">
        {/* Tab bar */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          {(['friends', 'trips'] as MsgTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${
                tab === t
                  ? 'border-golf-700 text-golf-700 dark:border-golf-400 dark:text-golf-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {t === 'friends' ? 'Friends' : 'Trips'}
            </button>
          ))}
        </div>

        <div className="px-4 py-4 space-y-2">
          {tab === 'friends' && (
            <>
              {friends.length === 0 ? (
                <EmptyState
                  icon="👥"
                  title="No friends yet"
                  sub="Add friends from any player profile."
                />
              ) : (
                friends.map((f) => (
                  <Link
                    key={f.userId}
                    href={`/profile/${f.userId}`}
                    className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm hover:border-golf-300 active:bg-gray-50 transition"
                  >
                    {f.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={f.avatarUrl} alt="" className="h-11 w-11 rounded-full object-cover" />
                    ) : (
                      <div className="h-11 w-11 rounded-full bg-golf-100 flex items-center justify-center text-base font-bold text-golf-800">
                        {f.displayName[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{f.displayName}</p>
                      <p className="text-xs text-gray-400">Tap to view profile</p>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-gray-300 shrink-0">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </Link>
                ))
              )}
            </>
          )}

          {tab === 'trips' && (
            <>
              {trips.length === 0 ? (
                <EmptyState icon="✈️" title="No trips yet" sub="Join or create a trip to chat." />
              ) : (
                trips.map((t) => (
                  <Link
                    key={t.id}
                    href={`/trip/${t.id}/chat`}
                    className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm hover:border-golf-300 active:bg-gray-50 transition"
                  >
                    <div className="h-11 w-11 rounded-full bg-golf-900 flex items-center justify-center text-xl">
                      ✈️
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{t.name}</p>
                      <p className="text-xs text-gray-400">Group chat</p>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-gray-300 shrink-0">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </Link>
                ))
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function EmptyState({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-10 text-center mt-4">
      <div className="text-4xl mb-3">{icon}</div>
      <p className="font-semibold text-gray-700">{title}</p>
      <p className="text-sm text-gray-400 mt-1">{sub}</p>
    </div>
  )
}
