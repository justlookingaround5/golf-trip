'use client'

// MY FRIENDS LIST
// Alphabetical order with search bar. Linked from Profile > Friends.

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { STUB_FRIENDS } from '@/lib/v2/stub-data'

export default function MyFriendsPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')

  const sorted = [...STUB_FRIENDS].sort((a, b) => a.name.localeCompare(b.name))
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
            Profile
          </button>
          <h1 className="text-xl font-bold">Friends ({STUB_FRIENDS.length})</h1>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-4 space-y-3">
        {/* Search bar */}
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

        {/* List */}
        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-400">No friends match &ldquo;{query}&rdquo;</p>
          </div>
        ) : query.trim() ? (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {filtered.map(f => (
              <Link
                key={f.id}
                href={`/v2/profile/${f.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition border-b border-gray-100 last:border-b-0"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-golf-600 text-sm font-bold text-white shrink-0">
                  {f.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{f.name}</p>
                  {f.handicap != null && (
                    <p className="text-xs text-gray-400">HCP {f.handicap.toFixed(1)}</p>
                  )}
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-gray-300 shrink-0">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {Object.entries(
              filtered.reduce<Record<string, typeof filtered>>((acc, f) => {
                const letter = f.name[0].toUpperCase()
                ;(acc[letter] ??= []).push(f)
                return acc
              }, {})
            ).map(([letter, members]) => (
              <div key={letter}>
                <div className="sticky top-0 z-10 bg-background px-1 py-1">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{letter}</span>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  {members.map(f => (
                    <Link
                      key={f.id}
                      href={`/v2/profile/${f.id}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-golf-600 text-sm font-bold text-white shrink-0">
                        {f.name[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{f.name}</p>
                        {f.handicap != null && (
                          <p className="text-xs text-gray-400">HCP {f.handicap.toFixed(1)}</p>
                        )}
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-gray-300 shrink-0">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
