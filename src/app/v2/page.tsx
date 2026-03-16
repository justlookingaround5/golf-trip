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
import TeamScoresCard from '@/components/v2/TeamScoresCard'
import {
  ACTIVE_TRIP,
  ACTIVE_ROUND,
  STUB_MATCHES,
  STUB_FEED,
  STUB_FRIEND_ACTIVE_ROUNDS,
  STUB_TEAMS,
} from '@/lib/v2/stub-data'

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
        {hasActiveTrip && (
          <div>
            <h2 className="text-sm font-bold text-gray-700 mb-2">Active Trip</h2>
            <TeamScoresCard
              matches={STUB_MATCHES}
              tripId={ACTIVE_TRIP.id}
              tripName={ACTIVE_TRIP.name}
              teams={STUB_TEAMS}
              linkToFull
            />
          </div>
        )}

        {/* 2 · Active Round */}
        {hasActiveRound && (
          <div className="pt-3">
            <h2 className="text-sm font-bold text-gray-700 mb-2">Active Round</h2>
            <ActiveRoundCard />
          </div>
        )}

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
                    player={{ id: fr.userId, name: fr.userName, avatarUrl: fr.userAvatarUrl, handicap: null, location: null }}
                    href={`/v2/scorecard/${fr.roundId}`}
                    subLabel={`${fr.courseName} · ${fr.holesPlayed} holes`}
                    badge={
                      <div className="text-right">
                        <p className={`text-sm font-bold tabular-nums ${diff < 0 ? 'text-red-600' : diff > 0 ? 'text-blue-600' : 'text-gray-700'}`}>
                          {vsParStr}
                        </p>
                        <p className="text-[10px] text-gray-400">vs par</p>
                      </div>
                    }
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
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
