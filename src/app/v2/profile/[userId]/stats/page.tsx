'use client'

// FRIEND'S STATS PAGE
// Same format as /v2/stats but for a specific friend.
// Round rows link to /v2/profile/[userId]/round/[roundId] (read-only).

import { use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { STUB_ALL_ROUNDS, STUB_PLAYER_STATS, STUB_FRIENDS, STUB_USER_HOLE_STATS, STUB_EARNINGS } from '@/lib/v2/stub-data'
import type { RoundV2 } from '@/lib/v2/types'

// ─── Scoring Distribution bar ──────────────────────────────────────────────────

function ScoringBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 text-xs font-semibold text-gray-600 text-right shrink-0">{label}</span>
      <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 text-xs font-bold text-gray-700 tabular-nums text-right">{pct.toFixed(0)}%</span>
    </div>
  )
}

// ─── Round row ─────────────────────────────────────────────────────────────────

function RoundRow({ round, userId }: { round: RoundV2; userId: string }) {
  const vsPar = round.grossTotal != null ? round.grossTotal - round.par : null
  const vsParStr = vsPar == null ? null : vsPar === 0 ? 'E' : vsPar > 0 ? `+${vsPar}` : `${vsPar}`

  return (
    <Link
      href={`/v2/profile/${userId}/round/${round.id}`}
      className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 active:bg-gray-100 transition"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900 truncate">{round.courseName}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {new Date(round.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          {round.tripName && <> · {round.tripName}</>}
          {round.isQuickRound && <> · Quick Round</>}
        </p>
      </div>
      <div className="shrink-0 ml-3 flex items-center gap-2">
        {round.grossTotal != null ? (
          <div className="text-right">
            <p className="text-sm font-bold text-gray-900 tabular-nums">{round.grossTotal}</p>
            {vsParStr && (
              <p className={`text-xs font-semibold tabular-nums ${
                vsPar! < 0 ? 'text-red-600' : vsPar! > 0 ? 'text-blue-600' : 'text-gray-500'
              }`}>
                {vsParStr}
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-400">In progress</p>
        )}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-gray-300 shrink-0">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </Link>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function FriendStatsPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params)
  const router = useRouter()

  const friend = STUB_FRIENDS.find(f => f.id === userId)
  const friendName = (friend?.name ?? 'Player').split(' ')[0]
  const friendStats = STUB_PLAYER_STATS.find(s => s.player.id === userId)

  const friendRounds = STUB_ALL_ROUNDS
    .filter(r => r.userId === userId)
    .sort((a, b) => b.date.localeCompare(a.date))
  const totalRounds = friendRounds.length
  const completedRounds = friendRounds.filter(r => r.grossTotal != null)

  const friendEarnings = STUB_EARNINGS.find(e => e.player.id === userId)

  const careerLow = completedRounds.length > 0
    ? Math.min(...completedRounds.map(r => r.grossTotal!))
    : null
  const record = friendStats
    ? `${friendStats.matchRecord.wins}-${friendStats.matchRecord.losses}-${friendStats.matchRecord.ties}`
    : null
  const earnings = friendEarnings
    ? (friendEarnings.netEarnings >= 0 ? `+$${friendEarnings.netEarnings}` : `-$${Math.abs(friendEarnings.netEarnings)}`)
    : null
  const earningsColor = friendEarnings != null
    ? (friendEarnings.netEarnings >= 0 ? 'text-green-600' : 'text-red-600')
    : 'text-gray-900'

  // Scoring distribution from hole stats across all courses
  const allHoleStats = Object.values(STUB_USER_HOLE_STATS)
    .flatMap(courseStats => courseStats[userId] ?? [])
  const totalEagles  = allHoleStats.reduce((s, h) => s + h.eagles,  0)
  const totalBirdies = allHoleStats.reduce((s, h) => s + h.birdies, 0)
  const totalPars    = allHoleStats.reduce((s, h) => s + h.pars,    0)
  const totalBogeys  = allHoleStats.reduce((s, h) => s + h.bogeys,  0)
  const totalDoubles = allHoleStats.reduce((s, h) => s + h.doubles, 0)
  const totalScored  = totalEagles + totalBirdies + totalPars + totalBogeys + totalDoubles
  const scoringPct   = (n: number) => totalScored > 0 ? (n / totalScored) * 100 : 0

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="bg-golf-800 px-4 pt-14 pb-6 text-white">
        <div className="mx-auto max-w-lg flex items-start justify-between">
          <div>
            <button
              onClick={() => router.back()}
              className="mb-3 inline-flex items-center gap-1 text-sm text-golf-300 hover:text-white transition"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              {friendName}
            </button>
            <h1 className="text-2xl font-bold">{friendName}&apos;s Stats</h1>
            <p className="mt-1 text-sm text-golf-200">{totalRounds} rounds</p>
          </div>
          {friendStats && (
            <div className="text-right text-sm text-golf-200 pt-8">
              <div>GIR% <span className="text-base font-bold text-white">{friendStats.girPct}%</span></div>
              <div>FW% <span className="text-base font-bold text-white">{friendStats.fairwayPct}%</span></div>
              <div>Putts <span className="text-base font-bold text-white">{friendStats.puttsAvg}</span></div>
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-lg">
        <div className="px-3 pt-3 space-y-4">
          {/* Low / Record / Earnings */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Low',      value: careerLow != null ? `${careerLow}` : '—', color: 'text-gray-900' },
              { label: 'Record',   value: record ?? '—',                             color: 'text-gray-900' },
              { label: 'Earnings', value: earnings ?? '—',                           color: earningsColor   },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl border border-gray-200 bg-white shadow-sm px-3 py-4 text-center">
                <p className={`text-2xl font-black ${color}`}>{value}</p>
                <p className="text-xs font-semibold text-gray-500 mt-0.5 uppercase tracking-wider">{label}</p>
              </div>
            ))}
          </div>

          {/* Scoring Distribution */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">Scoring Distribution</p>
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 space-y-2">
              {totalScored > 0 ? (
                <>
                  <ScoringBar label="Eagles"  pct={scoringPct(totalEagles)}  color="bg-yellow-500" />
                  <ScoringBar label="Birdies" pct={scoringPct(totalBirdies)} color="bg-red-500" />
                  <ScoringBar label="Pars"    pct={scoringPct(totalPars)}    color="bg-gray-400" />
                  <ScoringBar label="Bogeys"  pct={scoringPct(totalBogeys)}  color="bg-blue-500" />
                  <ScoringBar label="Double+" pct={scoringPct(totalDoubles)} color="bg-blue-800" />
                </>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">No data yet</p>
              )}
            </div>
          </div>

          {/* Round History */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">Rounds</p>
            {friendRounds.length > 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                {friendRounds.map(r => <RoundRow key={r.id} round={r} userId={userId} />)}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-gray-400">No rounds yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
