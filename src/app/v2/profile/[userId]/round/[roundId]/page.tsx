'use client'

// FRIEND'S READ-ONLY ROUND SCORECARD
// Linked from Friend Profile > Recent Rounds.

import { use } from 'react'
import Link from 'next/link'
import ScorecardViewer from '@/components/v2/ScorecardViewer'
import { STUB_FRIENDS, STUB_ALL_ROUNDS, STUB_SCORECARD } from '@/lib/v2/stub-data'
import type { ScorecardV2 } from '@/lib/v2/types'

export default function FriendRoundScorecardPage({
  params,
}: {
  params: Promise<{ userId: string; roundId: string }>
}) {
  const { userId, roundId } = use(params)

  const friend = STUB_FRIENDS.find(f => f.id === userId) ?? { id: userId, name: 'Player', avatarUrl: null, handicap: null }
  const round = STUB_ALL_ROUNDS.find(r => r.id === roundId) ?? STUB_ALL_ROUNDS[0]

  // STUB: show only this friend's holes from the shared scorecard
  const friendPlayer = STUB_SCORECARD.players.find(p => p.player.id === userId)
  const scorecard: ScorecardV2 = {
    courseId:    round.courseId,
    courseName:  round.courseName,
    date:        round.date,
    par:         round.par,
    roundNumber: null,
    players: friendPlayer
      ? [{ ...friendPlayer, grossTotal: round.grossTotal, netTotal: round.netTotal }]
      : [],
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <header className="bg-golf-800 px-4 pt-14 pb-6 text-white">
        <div className="mx-auto max-w-lg">
          <Link
            href={`/v2/profile/${userId}`}
            className="mb-3 inline-flex items-center gap-1 text-sm text-golf-300 hover:text-white transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            {friend.name}
          </Link>
          <h1 className="text-xl font-bold">{round.courseName}</h1>
          <div className="flex items-center gap-3 text-sm text-golf-200 mt-0.5">
            <span>
              {new Date(round.date + 'T12:00:00').toLocaleDateString('en-US', {
                month: 'long', day: 'numeric', year: 'numeric',
              })}
            </span>
            {round.tripName && <><span>·</span><span>{round.tripName}</span></>}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-5">
        <ScorecardViewer scorecard={scorecard} />
      </div>
    </div>
  )
}
