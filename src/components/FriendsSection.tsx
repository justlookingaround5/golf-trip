'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'

export interface FriendProfile {
  userId: string
  displayName: string
  avatarUrl: string | null
}

export interface PendingItem {
  friendshipId: string
  user: FriendProfile
}

export interface ViewerFriendship {
  friendshipId: string
  status: 'pending' | 'accepted' | 'declined'
  isRequester: boolean
}

interface SearchResult {
  userId: string
  displayName: string
  avatarUrl: string | null
  friendship: { id: string; status: string; isRequester: boolean } | null
}

interface FriendsSectionProps {
  currentUserId: string | null
  profileUserId: string | null
  isOwnProfile: boolean
  friends: FriendProfile[]
  pendingIncoming: PendingItem[]
  pendingOutgoing: PendingItem[]
  suggestions: FriendProfile[]
  viewerFriendship: ViewerFriendship | null
}

export default function FriendsSection({
  currentUserId,
  profileUserId,
  isOwnProfile,
  friends: initialFriends,
  pendingIncoming: initialIncoming,
  pendingOutgoing: initialOutgoing,
  suggestions: initialSuggestions,
  viewerFriendship: initialViewerFriendship,
}: FriendsSectionProps) {
  const [friends, setFriends] = useState(initialFriends)
  const [pendingIncoming, setPendingIncoming] = useState(initialIncoming)
  const [pendingOutgoing, setPendingOutgoing] = useState(initialOutgoing)
  const [suggestions, setSuggestions] = useState(initialSuggestions)
  const [viewerFriendship, setViewerFriendship] = useState(initialViewerFriendship)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())
  const searchInputRef = useRef<HTMLInputElement>(null)

  const addLoading = (id: string) => setLoadingIds((prev) => new Set([...prev, id]))
  const removeLoading = (id: string) =>
    setLoadingIds((prev) => { const s = new Set(prev); s.delete(id); return s })

  // ── Actions ────────────────────────────────────────────────────────────────

  const sendRequest = async (targetUserId: string) => {
    addLoading(targetUserId)
    const res = await fetch('/api/friends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addresseeUserId: targetUserId }),
    })
    if (res.ok) {
      const data = await res.json()
      const newItem: PendingItem = {
        friendshipId: data.id,
        user: { userId: targetUserId, displayName: '', avatarUrl: null },
      }
      // Remove from suggestions
      setSuggestions((prev) => prev.filter((s) => s.userId !== targetUserId))
      // Update search results
      setSearchResults((prev) =>
        prev.map((r) =>
          r.userId === targetUserId
            ? { ...r, friendship: { id: data.id, status: 'pending', isRequester: true } }
            : r
        )
      )
      // If viewing own profile and target is self's profile viewer — update outgoing
      setPendingOutgoing((prev) => [
        ...prev,
        { friendshipId: data.id, user: { userId: targetUserId, displayName: '', avatarUrl: null } },
      ])
      // If viewing someone else's profile and this is the action button
      if (!isOwnProfile && targetUserId === profileUserId) {
        setViewerFriendship({ friendshipId: data.id, status: 'pending', isRequester: true })
      }
    }
    removeLoading(targetUserId)
  }

  const acceptRequest = async (item: PendingItem) => {
    addLoading(item.friendshipId)
    const res = await fetch(`/api/friends/${item.friendshipId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'accept' }),
    })
    if (res.ok) {
      setPendingIncoming((prev) => prev.filter((p) => p.friendshipId !== item.friendshipId))
      setFriends((prev) => [...prev, item.user])
    }
    removeLoading(item.friendshipId)
  }

  const declineRequest = async (item: PendingItem) => {
    addLoading(item.friendshipId)
    const res = await fetch(`/api/friends/${item.friendshipId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'decline' }),
    })
    if (res.ok) {
      setPendingIncoming((prev) => prev.filter((p) => p.friendshipId !== item.friendshipId))
    }
    removeLoading(item.friendshipId)
  }

  const removeFriendship = async (friendshipId: string, userId: string) => {
    addLoading(friendshipId)
    const res = await fetch(`/api/friends/${friendshipId}`, { method: 'DELETE' })
    if (res.ok) {
      setFriends((prev) => prev.filter((f) => f.userId !== userId))
      setPendingOutgoing((prev) => prev.filter((p) => p.friendshipId !== friendshipId))
      setViewerFriendship(null)
    }
    removeLoading(friendshipId)
  }

  const handleSearch = async () => {
    if (!searchQuery.trim() || searching) return
    setSearching(true)
    const res = await fetch(`/api/friends/search?q=${encodeURIComponent(searchQuery)}`)
    if (res.ok) {
      const data = await res.json()
      setSearchResults(data.results || [])
    }
    setSearching(false)
  }

  // ── Render helpers ─────────────────────────────────────────────────────────

  const Avatar = ({ profile }: { profile: FriendProfile }) => (
    profile.avatarUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={profile.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
    ) : (
      <div className="h-10 w-10 rounded-full bg-golf-100 flex items-center justify-center text-sm font-bold text-golf-800">
        {profile.displayName[0]?.toUpperCase() || '?'}
      </div>
    )
  )

  const FriendRow = ({ profile, friendshipId }: { profile: FriendProfile; friendshipId?: string }) => (
    <div className="flex items-center justify-between gap-3">
      <Link href={`/profile/${profile.userId}`} className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition">
        <Avatar profile={profile} />
        <span className="text-sm font-medium text-gray-900 truncate">{profile.displayName.split(' ')[0]}</span>
      </Link>
      {isOwnProfile && currentUserId && friendshipId && (
        <button
          onClick={() => removeFriendship(friendshipId, profile.userId)}
          disabled={loadingIds.has(friendshipId)}
          className="shrink-0 text-xs text-gray-400 hover:text-red-500 transition disabled:opacity-40"
        >
          Remove
        </button>
      )}
    </div>
  )

  // ── Viewer friendship action button (when viewing someone else's profile) ──
  const ViewerActionButton = () => {
    if (!currentUserId || !profileUserId || isOwnProfile) return null

    if (!viewerFriendship) {
      return (
        <button
          onClick={() => sendRequest(profileUserId)}
          disabled={loadingIds.has(profileUserId)}
          className="rounded-full bg-golf-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-golf-600 disabled:opacity-50 transition"
        >
          {loadingIds.has(profileUserId) ? '…' : 'Add Friend'}
        </button>
      )
    }

    if (viewerFriendship.status === 'accepted') {
      return (
        <button
          onClick={() => removeFriendship(viewerFriendship.friendshipId, profileUserId)}
          disabled={loadingIds.has(viewerFriendship.friendshipId)}
          className="rounded-full border border-gray-300 px-4 py-1.5 text-sm font-semibold text-gray-600 hover:border-red-400 hover:text-red-600 disabled:opacity-50 transition"
        >
          Friends ✓
        </button>
      )
    }

    if (viewerFriendship.status === 'pending' && viewerFriendship.isRequester) {
      return (
        <button
          onClick={() => removeFriendship(viewerFriendship.friendshipId, profileUserId)}
          disabled={loadingIds.has(viewerFriendship.friendshipId)}
          className="rounded-full border border-gray-300 px-4 py-1.5 text-sm font-semibold text-gray-500 disabled:opacity-50 transition"
        >
          Pending…
        </button>
      )
    }

    if (viewerFriendship.status === 'pending' && !viewerFriendship.isRequester) {
      // They sent us a request — find it in incoming
      const item = pendingIncoming.find((p) => p.friendshipId === viewerFriendship.friendshipId)
      if (item) {
        return (
          <div className="flex gap-2">
            <button
              onClick={() => acceptRequest(item)}
              disabled={loadingIds.has(item.friendshipId)}
              className="rounded-full bg-golf-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-golf-600 disabled:opacity-50 transition"
            >
              Accept
            </button>
            <button
              onClick={() => declineRequest(item)}
              disabled={loadingIds.has(item.friendshipId)}
              className="rounded-full border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-600 disabled:opacity-50 transition"
            >
              Decline
            </button>
          </div>
        )
      }
    }

    return null
  }

  // ── Build friend ID lookup (to pass to FriendRow) ─────────────────────────
  // We need to know the friendshipId for the "Remove" action on friends list
  // Since server passes friends as FriendProfile[], we track removals by userId match
  // For accepted friends, friendshipId is not passed directly — we load from API on remove
  // Simplification: expose a delete-by-userId endpoint, or just refetch.
  // Here: we fetch the friendship on demand (optimistic: show loading, then remove)
  const removeFriendByUserId = async (friendUserId: string) => {
    addLoading(friendUserId)
    // Find the friendship ID dynamically
    const res = await fetch(`/api/friends?userId=${currentUserId}`)
    removeLoading(friendUserId)
    // For simplicity, just reload — or maintain a local map of userId→friendshipId
    // This is called rarely so a page reload is acceptable
    window.location.reload()
  }

  // ── Main render ────────────────────────────────────────────────────────────

  const hasFriendContent =
    friends.length > 0 ||
    pendingIncoming.length > 0 ||
    pendingOutgoing.length > 0 ||
    suggestions.length > 0

  return (
    <div className="space-y-5">
      {/* Section header with action button for other profiles */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Friends</h2>
        <ViewerActionButton />
      </div>

      {/* Incoming friend requests (own profile only) */}
      {isOwnProfile && pendingIncoming.length > 0 && (
        <div className="rounded-xl border border-golf-200 bg-golf-50 p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-golf-700">
            {pendingIncoming.length} Friend Request{pendingIncoming.length !== 1 ? 's' : ''}
          </p>
          {pendingIncoming.map((item) => (
            <div key={item.friendshipId} className="flex items-center justify-between gap-3">
              <Link href={`/profile/${item.user.userId}`} className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition">
                <Avatar profile={item.user} />
                <span className="text-sm font-medium text-gray-900 truncate">{item.user.displayName.split(' ')[0]}</span>
              </Link>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => acceptRequest(item)}
                  disabled={loadingIds.has(item.friendshipId)}
                  className="rounded-full bg-golf-700 px-3 py-1 text-xs font-semibold text-white hover:bg-golf-600 disabled:opacity-50 transition"
                >
                  Accept
                </button>
                <button
                  onClick={() => declineRequest(item)}
                  disabled={loadingIds.has(item.friendshipId)}
                  className="rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-600 disabled:opacity-50 transition"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Friends list */}
      {friends.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 space-y-3">
          {friends.map((friend) => (
            <FriendRow
              key={friend.userId}
              profile={friend}
            />
          ))}
        </div>
      )}

      {/* Suggested friends (own profile only) */}
      {isOwnProfile && suggestions.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            People You May Know
          </p>
          {suggestions.map((s) => (
            <div key={s.userId} className="flex items-center justify-between gap-3">
              <Link href={`/profile/${s.userId}`} className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition">
                <Avatar profile={s} />
                <span className="text-sm font-medium text-gray-900 truncate">{s.displayName.split(' ')[0]}</span>
              </Link>
              <button
                onClick={() => sendRequest(s.userId)}
                disabled={loadingIds.has(s.userId)}
                className="shrink-0 rounded-full border border-golf-300 px-3 py-1 text-xs font-semibold text-golf-700 hover:bg-golf-50 disabled:opacity-50 transition"
              >
                {loadingIds.has(s.userId) ? '…' : 'Add'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pending outgoing (own profile) */}
      {isOwnProfile && pendingOutgoing.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Requests Sent
          </p>
          {pendingOutgoing.map((item) => (
            <div key={item.friendshipId} className="flex items-center justify-between gap-3">
              <Link href={`/profile/${item.user.userId}`} className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition">
                <Avatar profile={item.user} />
                <span className="text-sm font-medium text-gray-900 truncate">{item.user.displayName.split(' ')[0]}</span>
              </Link>
              <button
                onClick={() => removeFriendship(item.friendshipId, item.user.userId)}
                disabled={loadingIds.has(item.friendshipId)}
                className="shrink-0 text-xs text-gray-400 hover:text-red-500 disabled:opacity-40 transition"
              >
                Cancel
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search for new friends (own profile only) */}
      {isOwnProfile && currentUserId && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Find Friends
          </p>
          <div className="flex gap-2">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by name…"
              className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm focus:border-golf-500 focus:outline-none"
            />
            <button
              onClick={handleSearch}
              disabled={searching || !searchQuery.trim()}
              className="rounded-full bg-golf-700 px-4 py-2 text-sm font-semibold text-white hover:bg-golf-600 disabled:opacity-50 transition"
            >
              {searching ? '…' : 'Search'}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-3 pt-1">
              {searchResults.map((r) => (
                <div key={r.userId} className="flex items-center justify-between gap-3">
                  <Link href={`/profile/${r.userId}`} className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition">
                    {r.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-golf-100 flex items-center justify-center text-sm font-bold text-golf-800">
                        {r.displayName[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <span className="text-sm font-medium text-gray-900 truncate">{r.displayName.split(' ')[0]}</span>
                  </Link>
                  <SearchResultAction result={r} onSend={sendRequest} loadingIds={loadingIds} />
                </div>
              ))}
            </div>
          )}

          {searchResults.length === 0 && searchQuery && !searching && (
            <p className="text-center text-xs text-gray-400 pt-1">No results. Try a different name.</p>
          )}
        </div>
      )}

      {/* Empty state */}
      {!hasFriendContent && !isOwnProfile && (
        <p className="text-center text-sm text-gray-400 py-4">No friends yet.</p>
      )}

      {isOwnProfile && !hasFriendContent && (
        <p className="text-center text-sm text-gray-400 py-2">
          Search above to find friends, or play a trip round to get suggestions.
        </p>
      )}
    </div>
  )
}

function SearchResultAction({
  result,
  onSend,
  loadingIds,
}: {
  result: SearchResult
  onSend: (userId: string) => void
  loadingIds: Set<string>
}) {
  const f = result.friendship
  if (!f) {
    return (
      <button
        onClick={() => onSend(result.userId)}
        disabled={loadingIds.has(result.userId)}
        className="shrink-0 rounded-full border border-golf-300 px-3 py-1 text-xs font-semibold text-golf-700 hover:bg-golf-50 disabled:opacity-50 transition"
      >
        {loadingIds.has(result.userId) ? '…' : 'Add'}
      </button>
    )
  }
  if (f.status === 'accepted') {
    return <span className="shrink-0 text-xs font-semibold text-green-600">Friends ✓</span>
  }
  if (f.status === 'pending' && f.isRequester) {
    return <span className="shrink-0 text-xs text-gray-400">Pending…</span>
  }
  if (f.status === 'pending' && !f.isRequester) {
    return <span className="shrink-0 text-xs text-golf-600 font-semibold">Respond ↑</span>
  }
  return null
}
