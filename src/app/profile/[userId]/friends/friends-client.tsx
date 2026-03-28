'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { PlayerV2 } from '@/lib/v2/types'

export default function FriendsClient({ friends, friendName, isOwnProfile }: { friends: PlayerV2[]; friendName: string; isOwnProfile: boolean }) {
  const router = useRouter()
  const [query, setQuery] = useState('')

  const sorted = [...friends].sort((a, b) => a.name.localeCompare(b.name))
  const filtered = query.trim()
    ? sorted.filter(f => f.name.toLowerCase().includes(query.trim().toLowerCase()))
    : sorted

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="bg-golf-800 px-4 pt-14 pb-6 text-white">
        <div className="mx-auto max-w-lg">
          <button
            onClick={() => router.back()}
            className="mb-3 inline-flex items-center gap-1 text-sm text-golf-300 hover:text-white transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            {friendName}
          </button>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Friends</h1>
            {isOwnProfile && (
              <button
                onClick={() => router.push('/profile/friends/add')}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-golf-700 transition"
                aria-label="Add friend"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="22" y1="11" x2="16" y2="11" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-4 space-y-3">
        <div className="relative">
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          >
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search friends..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-golf-400"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            {friends.length === 0 ? (
              <p className="text-sm text-gray-400">No friends yet</p>
            ) : (
              <p className="text-sm text-gray-400">No friends match &ldquo;{query}&rdquo;</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {(() => {
              const groups: { letter: string; items: typeof filtered }[] = []
              for (const f of filtered) {
                const letter = (f.name[0] ?? '').toUpperCase()
                const last = groups[groups.length - 1]
                if (last && last.letter === letter) {
                  last.items.push(f)
                } else {
                  groups.push({ letter, items: [f] })
                }
              }
              return groups.map(g => (
                <div key={g.letter}>
                  <p className="text-sm font-bold text-gray-500 mb-1 px-1">{g.letter}</p>
                  <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    {g.items.map(f => (
                      <Link
                        key={f.id}
                        href={`/profile/${f.id}`}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition border-b border-gray-100 last:border-b-0"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-golf-600 text-sm font-bold text-white shrink-0">
                          {f.name[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900">
                            {f.name}{f.handicap != null && <span className="font-normal text-gray-400"> ({f.handicap})</span>}
                          </p>
                          {f.location && (
                            <p className="text-xs text-gray-400 truncate">{f.location}</p>
                          )}
                        </div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-gray-300 shrink-0">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </Link>
                    ))}
                  </div>
                </div>
              ))
            })()}
          </div>
        )}
      </div>
    </div>
  )
}
