'use client'

// HOME TAB
// Sections (top → bottom):
//   1. Team Scores widget — compact points standings, links to full leaderboard
//   2. Active Round card — viewer's in-progress round
//   3. Friend Active Rounds
//   4. Feed

import Link from 'next/link'
import UserProfileCard from '@/components/v2/UserProfileCard'
import FeedItemCard from '@/components/v2/FeedItemCard'
import {
  ACTIVE_TRIP,
  ACTIVE_ROUND,
  STUB_PLAYER_STATS,
  STUB_FEED,
  STUB_FRIEND_ACTIVE_ROUNDS,
} from '@/lib/v2/stub-data'

// ─── Team Scores Widget ───────────────────────────────────────────────────────

function TeamScoresWidget() {
  const sorted = [...STUB_PLAYER_STATS].sort((a, b) => b.points - a.points)
  const isTwoTeam = sorted.length === 2

  return (
    <Link href={`/v2/trip/${ACTIVE_TRIP.id}/leaderboard`}>
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between bg-golf-800 px-4 py-3">
          <div>
            <p className="text-xs font-semibold text-golf-300 uppercase tracking-wider">Live Leaderboard</p>
            <p className="text-sm font-bold text-white">{ACTIVE_TRIP.name}</p>
          </div>
          <span className="text-xs font-semibold text-golf-300">Full view →</span>
        </div>

        {isTwoTeam ? (
          // Side-by-side for exactly 2 entries
          <div className="grid grid-cols-2 divide-x divide-gray-100">
            {sorted.map((s, i) => (
              <div key={s.player.id} className={`py-4 text-center ${i === 0 ? 'bg-white' : 'bg-white'}`}>
                <p className="text-3xl font-black text-golf-700 tabular-nums">
                  {s.points % 1 === 0 ? s.points : s.points.toFixed(1)}
                </p>
                <p className="text-xs text-gray-500 mt-1">{s.player.name}</p>
              </div>
            ))}
          </div>
        ) : (
          // Ranked list for 3+ entries
          <div className="divide-y divide-gray-100">
            {sorted.map((s, i) => (
              <div key={s.player.id} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 w-4 tabular-nums">{i + 1}</span>
                  <span className="text-sm font-semibold text-gray-900">{s.player.name}</span>
                </div>
                <span className="text-sm font-black text-golf-700 tabular-nums">
                  {s.points % 1 === 0 ? s.points : s.points.toFixed(1)} pts
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}

// ─── Active Round Card ────────────────────────────────────────────────────────

function ActiveRoundCard() {
  const r = ACTIVE_ROUND
  return (
    <Link
      href={`/trip/${r.tripId ?? ''}/live/${r.courseId}`}
      className="flex flex-col items-center gap-2 rounded-xl bg-green-600 py-7 text-white shadow-lg active:bg-green-700 transition"
    >
      <span className="text-4xl">&#9971;</span>
      <span className="text-xl font-bold">Continue Round</span>
      <span className="text-sm text-green-100">{r.courseName}</span>
      <div className="flex items-center gap-3 mt-1 text-xs text-green-200">
        <span>{r.holesPlayed} holes played</span>
        {r.tripName && <><span>·</span><span>{r.tripName}</span></>}
      </div>
    </Link>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomeV2() {
  // STUB: replace with real auth + active-round detection
  const hasActiveTrip  = true
  const hasActiveRound = true

  function handleMessage(userId: string) {
    // TODO: navigate to /v2/messages/dm-{userId}
    console.log('message', userId)
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <header className="bg-golf-900 px-4 pt-14 pb-6 text-center">
        <div className="text-3xl font-bold tracking-tight">
          <span className="text-gold">Fore</span>
          <span className="text-white">Live</span>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-4 space-y-5">
        {/* 1 · Team Scores (links to full leaderboard) */}
        {hasActiveTrip && <TeamScoresWidget />}

        {/* 2 · Active Round */}
        {hasActiveRound && <ActiveRoundCard />}

        {/* 3 · Friend Active Rounds */}
        {STUB_FRIEND_ACTIVE_ROUNDS.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-gray-700 mb-2">Friends Playing Now</h2>
            <div className="space-y-2">
              {STUB_FRIEND_ACTIVE_ROUNDS.map(fr => {
                const diff = fr.currentGross - fr.par
                const vsParStr = diff === 0 ? 'E' : diff > 0 ? `+${diff}` : `${diff}`
                return (
                  <UserProfileCard
                    key={fr.userId}
                    player={{ id: fr.userId, name: fr.userName, avatarUrl: fr.userAvatarUrl, handicap: null }}
                    subLabel={`${fr.courseName} · ${fr.holesPlayed} holes`}
                    badge={
                      <div className="text-right">
                        <p className={`text-sm font-bold tabular-nums ${diff < 0 ? 'text-red-600' : diff > 0 ? 'text-blue-600' : 'text-gray-700'}`}>
                          {vsParStr}
                        </p>
                        <p className="text-[10px] text-gray-400">vs par</p>
                      </div>
                    }
                    onMessage={() => handleMessage(fr.userId)}
                  />
                )
              })}
            </div>
          </div>
        )}

        {/* 4 · Feed */}
        <div>
          <h2 className="text-sm font-bold text-gray-700 mb-2">Recent Activity</h2>
          <div className="space-y-2">
            {STUB_FEED.map(item => (
              <FeedItemCard
                key={item.id}
                item={item}
                onMessage={() => handleMessage(item.userId)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
