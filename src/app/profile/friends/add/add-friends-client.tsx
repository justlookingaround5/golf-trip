'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface SearchResult {
  userId: string
  displayName: string
  avatarUrl: string | null
  handicap: number | null
  location: string | null
  friendship: { id: string; status: string; isRequester: boolean } | null
}

interface PendingRequestRow {
  friendshipId: string
  userId: string
  displayName: string
  avatarUrl: string | null
  handicap: number | null
  location: string | null
}

export default function AddFriendsClient() {
  const router = useRouter()
  const [findQuery, setFindQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())
  const [cancelledIds, setCancelledIds] = useState<Set<string>>(new Set())
  const [friendshipIdMap, setFriendshipIdMap] = useState<Map<string, string>>(new Map())
  const [incomingRequests, setIncomingRequests] = useState<PendingRequestRow[]>([])
  const [outgoingRequests, setOutgoingRequests] = useState<PendingRequestRow[]>([])
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set())
  const [declinedIds, setDeclinedIds] = useState<Set<string>>(new Set())
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const findInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/friends/pending')
      .then(res => res.ok ? res.json() : { incoming: [], outgoing: [] })
      .then(data => {
        setIncomingRequests(data.incoming ?? [])
        setOutgoingRequests(data.outgoing ?? [])
      })
      .catch(() => {})
  }, [])

  const fetchSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSearchResults([])
      setSearchLoading(false)
      return
    }
    setSearchLoading(true)
    try {
      const res = await fetch(`/api/friends/search?q=${encodeURIComponent(q)}`)
      if (res.ok) {
        const data = await res.json()
        setSearchResults(data.results ?? [])
      }
    } catch {
      // ignore
    } finally {
      setSearchLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q = findQuery.trim()
    if (q.length < 2) {
      setSearchResults([])
      return
    }
    debounceRef.current = setTimeout(() => fetchSearch(q), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [findQuery, fetchSearch])

  useEffect(() => {
    findInputRef.current?.focus()
  }, [])

  const handleAcceptRequest = async (friendshipId: string, userId: string) => {
    setAcceptedIds(prev => new Set(prev).add(userId))
    try {
      const res = await fetch(`/api/friends/${friendshipId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' }),
      })
      if (!res.ok) {
        setAcceptedIds(prev => { const next = new Set(prev); next.delete(userId); return next })
      } else {
        router.refresh()
      }
    } catch {
      setAcceptedIds(prev => { const next = new Set(prev); next.delete(userId); return next })
    }
  }

  const handleDeclineRequest = async (friendshipId: string, userId: string) => {
    setDeclinedIds(prev => new Set(prev).add(userId))
    try {
      const res = await fetch(`/api/friends/${friendshipId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'decline' }),
      })
      if (!res.ok) setDeclinedIds(prev => { const next = new Set(prev); next.delete(userId); return next })
    } catch {
      setDeclinedIds(prev => { const next = new Set(prev); next.delete(userId); return next })
    }
  }

  const handleAddFriend = async (userId: string) => {
    setPendingIds(prev => new Set(prev).add(userId))
    setCancelledIds(prev => { const next = new Set(prev); next.delete(userId); return next })
    try {
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addresseeUserId: userId }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.id) {
          setFriendshipIdMap(prev => new Map(prev).set(userId, data.id))
          const match = searchResults.find(r => r.userId === userId)
          if (match) {
            setOutgoingRequests(prev => [...prev, {
              friendshipId: data.id,
              userId,
              displayName: match.displayName,
              avatarUrl: match.avatarUrl,
              handicap: match.handicap,
              location: match.location,
            }])
          }
        }
      } else if (res.status !== 409) {
        setPendingIds(prev => { const next = new Set(prev); next.delete(userId); return next })
      }
    } catch {
      setPendingIds(prev => { const next = new Set(prev); next.delete(userId); return next })
    }
  }

  const handleCancelRequest = async (userId: string, friendshipId: string) => {
    setCancelledIds(prev => new Set(prev).add(userId))
    setPendingIds(prev => { const next = new Set(prev); next.delete(userId); return next })
    try {
      const res = await fetch(`/api/friends/${friendshipId}`, { method: 'DELETE' })
      if (!res.ok) {
        setCancelledIds(prev => { const next = new Set(prev); next.delete(userId); return next })
        setPendingIds(prev => new Set(prev).add(userId))
      }
    } catch {
      setCancelledIds(prev => { const next = new Set(prev); next.delete(userId); return next })
      setPendingIds(prev => new Set(prev).add(userId))
    }
  }

  const visibleIncoming = incomingRequests.filter(r => !acceptedIds.has(r.userId) && !declinedIds.has(r.userId))
  const visibleOutgoing = outgoingRequests.filter(r => !cancelledIds.has(r.userId))

  const pendingUserIds = new Set([
    ...visibleIncoming.map(r => r.userId),
    ...visibleOutgoing.map(r => r.userId),
  ])

  const visibleResults = searchResults.filter(r => {
    if (r.friendship?.status === 'accepted') return false
    if (pendingUserIds.has(r.userId)) return false
    return true
  })

  const sorted = [...visibleResults].sort((a, b) => a.displayName.localeCompare(b.displayName))

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
            Friends
          </button>
          <h1 className="text-xl font-bold">Add Friends</h1>
        </div>
      </header>

      {(visibleIncoming.length > 0 || visibleOutgoing.length > 0) && (
        <div className="mx-auto max-w-lg px-4 pt-4 space-y-3">
          {visibleIncoming.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1">Pending Requests</p>
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                {visibleIncoming.map(r => (
                  <div
                    key={r.friendshipId}
                    className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-golf-600 text-sm font-bold text-white shrink-0">
                      {r.displayName[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {r.displayName}
                        {r.handicap != null && <span className="font-normal text-gray-400"> ({r.handicap})</span>}
                      </p>
                      {r.location && (
                        <p className="text-xs text-gray-400 truncate">{r.location}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleAcceptRequest(r.friendshipId, r.userId)}
                      className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition bg-golf-600 text-white hover:bg-golf-700 active:bg-golf-800"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleDeclineRequest(r.friendshipId, r.userId)}
                      className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500"
                    >
                      Decline
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {visibleOutgoing.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1">Sent Requests</p>
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                {visibleOutgoing.map(r => (
                  <div
                    key={r.friendshipId}
                    className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-golf-600 text-sm font-bold text-white shrink-0">
                      {r.displayName[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {r.displayName}
                        {r.handicap != null && <span className="font-normal text-gray-400"> ({r.handicap})</span>}
                      </p>
                      {r.location && (
                        <p className="text-xs text-gray-400 truncate">{r.location}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleCancelRequest(r.userId, r.friendshipId)}
                      className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500"
                    >
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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
            ref={findInputRef}
            type="text"
            placeholder="Search by name..."
            value={findQuery}
            onChange={e => setFindQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-golf-400"
          />
        </div>

        {findQuery.trim().length < 2 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-400">Search for friends by name</p>
          </div>
        ) : searchLoading && sorted.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-400">Searching...</p>
          </div>
        ) : sorted.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-400">No users found</p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {sorted.map(r => {
              const wasCancelled = cancelledIds.has(r.userId)
              const isPending = !wasCancelled && (pendingIds.has(r.userId) || r.friendship?.status === 'pending')
              const friendshipId = friendshipIdMap.get(r.userId) || r.friendship?.id
              return (
                <div
                  key={r.userId}
                  className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-golf-600 text-sm font-bold text-white shrink-0">
                    {r.displayName[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {r.displayName}
                      {r.handicap != null && <span className="font-normal text-gray-400"> ({r.handicap})</span>}
                    </p>
                    {r.location && (
                      <p className="text-xs text-gray-400 truncate">{r.location}</p>
                    )}
                  </div>
                  {isPending ? (
                    <button
                      onClick={() => friendshipId && handleCancelRequest(r.userId, friendshipId)}
                      className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500"
                    >
                      Pending
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAddFriend(r.userId)}
                      className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition bg-golf-600 text-white hover:bg-golf-700 active:bg-golf-800"
                    >
                      Add
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
