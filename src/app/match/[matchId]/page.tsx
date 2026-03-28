import Link from 'next/link'
import { getMatchScorecard } from '@/lib/v2/match-data'
import ScorecardViewer from '@/components/v2/ScorecardViewer'

export default async function MatchScorecardPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params

  const data = await getMatchScorecard(matchId)

  if (!data) {
    return (
      <div className="min-h-screen bg-background pb-28">
        <header className="bg-golf-800 px-4 pt-14 pb-6 text-white">
          <div className="mx-auto max-w-2xl">
            <Link href="/" className="mb-3 inline-flex items-center gap-1 text-sm text-golf-300 hover:text-white transition">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Back
            </Link>
            <h1 className="text-xl font-bold">Match not found</h1>
          </div>
        </header>
      </div>
    )
  }

  const { match, scorecard } = data

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="bg-golf-800 px-4 pt-14 pb-6 text-white">
        <div className="mx-auto max-w-2xl">
          <Link href="/" className="mb-3 inline-flex items-center gap-1 text-sm text-golf-300 hover:text-white transition">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </Link>
          <h1 className="text-xl font-bold">Match Scorecard</h1>
          <p className="text-sm text-golf-200 mt-0.5">{match.courseName}</p>
          <p className="text-xs text-golf-300 mt-0.5">
            {match.formatLabel}
            {match.result && <> · {match.result}</>}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-5">
        {scorecard.players.length > 0 ? (
          <ScorecardViewer scorecard={scorecard} />
        ) : (
          <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-6 text-center">
            <p className="text-sm text-gray-400">No scores recorded yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
