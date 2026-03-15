'use client'

// READ-ONLY ROUND SCORECARD (current user only)
// Linked from Stats > Rounds tab.

import { use } from 'react'
import { useRouter } from 'next/navigation'
import ScorecardViewer from '@/components/v2/ScorecardViewer'
import { STUB_ALL_ROUNDS, STUB_SCORECARD, ME } from '@/lib/v2/stub-data'
import type { ScorecardV2 } from '@/lib/v2/types'

export default function RoundScorecardPage({ params }: { params: Promise<{ roundId: string }> }) {
  const { roundId } = use(params)

  const router = useRouter()
  const round = STUB_ALL_ROUNDS.find(r => r.id === roundId) ?? STUB_ALL_ROUNDS[0]

  // STUB: show only the current user's holes from the shared scorecard
  const myPlayer = STUB_SCORECARD.players.find(p => p.player.id === ME.id)
  const scorecard: ScorecardV2 = {
    courseId:    round.courseId,
    courseName:  round.courseName,
    date:        round.date,
    par:         round.par,
    roundNumber: null,
    players: myPlayer
      ? [{ ...myPlayer, grossTotal: round.grossTotal, netTotal: round.netTotal }]
      : [],
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <header className="bg-golf-800 px-4 pt-14 pb-6 text-white">
        <div className="mx-auto max-w-lg">
          <button
            onClick={() => router.back()}
            className="mb-3 inline-flex items-center gap-1 text-sm text-golf-300 hover:text-white transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>
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
