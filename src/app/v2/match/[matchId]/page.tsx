'use client'

// READ-ONLY MATCH SCORECARD
// Linked from PointLeaderboard > Matches tab

import { use } from 'react'
import Link from 'next/link'
import ScorecardViewer from '@/components/v2/ScorecardViewer'
import MatchCard from '@/components/v2/MatchCard'
import { STUB_MATCHES, STUB_SCORECARD } from '@/lib/v2/stub-data'

export default function MatchScorecardPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = use(params)

  // STUB: find match by id
  const match = STUB_MATCHES.find(m => m.id === matchId) ?? STUB_MATCHES[0]

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <header className="bg-golf-800 px-4 pt-14 pb-6 text-white">
        <div className="mx-auto max-w-2xl">
          <Link
            href="/v2"
            className="mb-3 inline-flex items-center gap-1 text-sm text-golf-300 hover:text-white transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </Link>
          <h1 className="text-xl font-bold">Match Scorecard</h1>
          <p className="text-sm text-golf-200 mt-0.5">{match.courseName}</p>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-5 space-y-5">
        {/* Match summary card (read-only) */}
        <MatchCard match={match} readOnly />

        {/* Scorecard */}
        <ScorecardViewer scorecard={STUB_SCORECARD} />
      </div>
    </div>
  )
}
