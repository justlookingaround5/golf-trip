import Link from 'next/link'
import { getRoundScorecard } from '@/lib/v2/scorecard-data'
import ScorecardViewer from '@/components/v2/ScorecardViewer'

export default async function FriendRoundScorecardPage({
  params,
}: {
  params: Promise<{ userId: string; roundId: string }>
}) {
  const { userId, roundId } = await params

  // roundId = courseId, single user
  const scorecard = await getRoundScorecard(roundId, userId)

  const courseName = scorecard?.courseName ?? 'Round'
  const playerName = scorecard?.players[0]?.player.name.split(' ')[0] ?? 'Player'
  const date = scorecard?.date
    ? new Date(scorecard.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="bg-golf-800 px-4 pt-14 pb-6 text-white">
        <div className="mx-auto max-w-lg">
          <Link
            href={`/profile/${userId}`}
            className="mb-3 inline-flex items-center gap-1 text-sm text-golf-300 hover:text-white transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            {playerName}&apos;s Stats
          </Link>
          <h1 className="text-xl font-bold">{courseName}</h1>
          {date && (
            <div className="flex items-center gap-3 text-sm text-golf-200 mt-0.5">
              <span>{date}</span>
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-5">
        {scorecard && scorecard.players.length > 0 ? (
          <ScorecardViewer scorecard={scorecard} />
        ) : (
          <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-6 text-center">
            <p className="text-sm text-gray-400">No scores recorded for this round</p>
          </div>
        )}
      </div>
    </div>
  )
}
