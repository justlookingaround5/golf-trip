'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { UserProfileData } from '@/lib/v2/profile-data'
import type { TripV2 } from '@/lib/v2/types'

const CourseMapV2 = dynamic(() => import('@/components/v2/CourseMapV2'), { ssr: false })

function TripRow({ trip, past }: { trip: TripV2; past: boolean }) {
  const start = trip.startDate
    ? new Date(trip.startDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null
  const end = trip.endDate
    ? new Date(trip.endDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null
  const dateLabel = start && end ? `${start} – ${end}` : start ?? ''

  const inner = (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900 truncate">{trip.name}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {trip.location && <>{trip.location} · </>}
          {dateLabel}{dateLabel ? ' · ' : ''}{trip.playerCount} players
        </p>
      </div>
      {past && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-gray-300 shrink-0 ml-3">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      )}
    </div>
  )

  if (!past) return <div>{inner}</div>
  return <Link href={`/trip/${trip.id}/leaderboard?from=profile`}>{inner}</Link>
}

export default function FriendProfileClient({ data, userId }: { data: UserProfileData; userId: string }) {
  const router = useRouter()
  const { user: friend, currentUserId, friendCount, friendshipId, friendshipStatus, pins, upcomingTrips, pastTrips } = data
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [requestSent, setRequestSent] = useState(false)
  const [sending, setSending] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const isOtherUser = currentUserId && currentUserId !== userId

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
        setConfirmRemove(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  async function handleRemoveFriend() {
    if (!friendshipId) return
    setRemoving(true)
    try {
      const res = await fetch(`/api/friends/${friendshipId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to remove friend')
      router.push('/profile/friends')
    } catch {
      setRemoving(false)
    }
  }

  async function handleAddFriend() {
    setSending(true)
    try {
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addresseeUserId: userId }),
      })
      if (res.ok || res.status === 409) {
        setRequestSent(true)
        setMenuOpen(false)
      }
    } catch {
      // ignore
    } finally {
      setSending(false)
    }
  }

  const ratedById = new Map<string, typeof pins[0]>()
  for (const p of pins) {
    if (p.rating == null) continue
    const existing = ratedById.get(p.courseId)
    if (!existing || p.date > existing.date) ratedById.set(p.courseId, p)
  }
  const ratedPins = [...ratedById.values()]
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 10)

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="bg-golf-800 px-4 pt-14 pb-6 text-white">
        <div className="mx-auto max-w-lg">
          <button
            onClick={() => router.back()}
            className="mb-4 inline-flex items-center gap-1 text-sm text-golf-300 hover:text-white transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Friends
          </button>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-golf-600 text-2xl font-bold text-white ring-2 ring-white/30 shrink-0">
              {friend.name[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold">
                {friend.name}{friend.handicap != null && <span className="font-normal text-golf-300"> ({friend.handicap.toFixed(1)})</span>}
              </h1>
              {friend.location && <p className="text-xs text-golf-300 mt-0.5">{friend.location}</p>}
              <Link href={`/profile/${userId}/stats`} className="text-sm font-semibold text-golf-200 hover:text-white transition mt-0.5 inline-block">Stats</Link>
            </div>
            <Link href={`/profile/${userId}/friends`} className="shrink-0 text-center hover:opacity-80 transition">
              <p className="text-2xl font-bold leading-none">{friendCount}</p>
              <p className="text-xs text-golf-300 mt-1">Friends</p>
            </Link>
            {currentUserId && currentUserId !== userId && (
              <Link
                href={`/messages/dm-${[userId, currentUserId].sort().join('-')}`}
                className="shrink-0 ml-3 p-2 rounded-full hover:bg-golf-700/50 transition"
                aria-label="Message"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </Link>
            )}
            {isOtherUser && (
              <div className="relative shrink-0" ref={menuRef}>
                <button
                  onClick={() => { setMenuOpen(!menuOpen); setConfirmRemove(false) }}
                  className="p-2 rounded-full hover:bg-golf-700/50 transition"
                  aria-label="More options"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="5" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="12" cy="19" r="2" />
                  </svg>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-52 rounded-lg bg-white shadow-lg border border-gray-200 z-50 overflow-hidden">
                    {friendshipStatus === 'accepted' && friendshipId && (
                      !confirmRemove ? (
                        <button
                          onClick={() => setConfirmRemove(true)}
                          className="w-full text-left px-4 py-3 text-sm text-red-600 font-medium hover:bg-red-50 transition"
                        >
                          Remove Friend
                        </button>
                      ) : (
                        <div className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900 mb-2">Remove {friend.name}?</p>
                          <div className="flex gap-2">
                            <button
                              onClick={handleRemoveFriend}
                              disabled={removing}
                              className="flex-1 text-sm font-medium text-white bg-red-600 rounded-md py-1.5 hover:bg-red-700 disabled:opacity-50 transition"
                            >
                              {removing ? 'Removing…' : 'Remove'}
                            </button>
                            <button
                              onClick={() => { setConfirmRemove(false); setMenuOpen(false) }}
                              className="flex-1 text-sm font-medium text-gray-600 bg-gray-100 rounded-md py-1.5 hover:bg-gray-200 transition"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )
                    )}
                    {friendshipStatus === 'none' && !requestSent && (
                      <button
                        onClick={handleAddFriend}
                        disabled={sending}
                        className="w-full text-left px-4 py-3 text-sm text-golf-700 font-medium hover:bg-golf-50 transition disabled:opacity-50"
                      >
                        {sending ? 'Sending…' : 'Add Friend'}
                      </button>
                    )}
                    {(friendshipStatus === 'pending' || requestSent) && (
                      <div className="px-4 py-3 text-sm text-gray-400 font-medium">
                        Request Sent
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-6 space-y-8">
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-3">Map</h2>
          {pins.length > 0 ? (
            <CourseMapV2 pins={pins} />
          ) : (
            <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-6 text-center">
              <p className="text-sm text-gray-400">No courses played yet</p>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-base font-bold text-gray-900 mb-3">Courses</h2>
          {ratedPins.length > 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100 shadow-sm overflow-hidden">
              {ratedPins.map((p, i) => (
                <Link key={p.courseId} href={`/course/${p.courseId}`} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition">
                  <span className="shrink-0 w-5 text-xs font-bold text-gray-400 tabular-nums text-right">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{p.courseName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(p.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <span className="shrink-0 ml-3 text-sm font-bold text-gray-900 tabular-nums">
                    {(p.rating ?? 0).toFixed(1)}
                  </span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-gray-300 shrink-0">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-6 text-center">
              <p className="text-sm text-gray-400">No course ratings yet.</p>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-base font-bold text-gray-900 mb-3">Trips</h2>
          {upcomingTrips.length === 0 && pastTrips.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-6 text-center">
              <p className="text-sm text-gray-400">No trips yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingTrips.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1">Upcoming</p>
                  <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    {upcomingTrips.map(t => <TripRow key={t.id} trip={t} past={false} />)}
                  </div>
                </div>
              )}
              {pastTrips.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1">Past</p>
                  <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    {pastTrips.map(t => <TripRow key={t.id} trip={t} past={true} />)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
