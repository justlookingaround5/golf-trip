'use client'

// FRIEND'S STATS PAGE
// Same format as /v2/stats but for a specific friend.
// Round rows link to /v2/profile/[userId]/round/[roundId] (read-only).

import { use, useState } from 'react'
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

// ─── Helpers ───────────────────────────────────────────────────────────────────

function avg(values: number[]): number | null {
  return values.length > 0
    ? Math.round(values.reduce((s, v) => s + v, 0) / values.length * 10) / 10
    : null
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function FriendStatsPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params)
  const router = useRouter()
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)

  const friend = STUB_FRIENDS.find(f => f.id === userId)
  const friendName = (friend?.name ?? 'Player').split(' ')[0]
  const friendStats = STUB_PLAYER_STATS.find(s => s.player.id === userId)

  const friendRounds = STUB_ALL_ROUNDS
    .filter(r => r.userId === userId)
    .sort((a, b) => b.date.localeCompare(a.date))

  const friendEarnings = STUB_EARNINGS.find(e => e.player.id === userId)

  const courses = Array.from(
    new Map(friendRounds.map(r => [r.courseId, r.courseName])).entries()
  ).map(([id, name]) => ({ id, name }))

  const filteredRounds = selectedCourseId
    ? friendRounds.filter(r => r.courseId === selectedCourseId)
    : friendRounds

  const filteredCompleted = filteredRounds.filter(r => r.grossTotal != null)

  const filteredHoleStats = selectedCourseId
    ? (STUB_USER_HOLE_STATS[selectedCourseId]?.[userId] ?? [])
    : Object.values(STUB_USER_HOLE_STATS).flatMap(c => c[userId] ?? [])

  // Scoring distribution
  const totalEagles  = filteredHoleStats.reduce((s, h) => s + h.eagles,  0)
  const totalBirdies = filteredHoleStats.reduce((s, h) => s + h.birdies, 0)
  const totalPars    = filteredHoleStats.reduce((s, h) => s + h.pars,    0)
  const totalBogeys  = filteredHoleStats.reduce((s, h) => s + h.bogeys,  0)
  const totalDoubles = filteredHoleStats.reduce((s, h) => s + h.doubles, 0)
  const totalScored  = totalEagles + totalBirdies + totalPars + totalBogeys + totalDoubles
  const scoringPct   = (n: number) => totalScored > 0 ? (n / totalScored) * 100 : 0

  // Career low (per course when filtered)
  const careerLow = filteredCompleted.length > 0
    ? Math.min(...filteredCompleted.map(r => r.grossTotal!))
    : null

  // Record and Earnings remain global
  const record = friendStats
    ? `${friendStats.matchRecord.wins}-${friendStats.matchRecord.losses}-${friendStats.matchRecord.ties}`
    : null
  const earnings = friendEarnings
    ? (friendEarnings.netEarnings >= 0 ? `+$${friendEarnings.netEarnings}` : `-$${Math.abs(friendEarnings.netEarnings)}`)
    : null
  const earningsHeaderColor = friendEarnings != null
    ? (friendEarnings.netEarnings >= 0 ? 'text-green-400' : 'text-red-400')
    : 'text-white'

  // GIR/FW/Putts: derive from hole stats when filtered, else use friendStats
  const girPct     = selectedCourseId ? avg(filteredHoleStats.map(h => h.girPct     ?? 0)) : friendStats?.girPct     ?? null
  const fairwayPct = selectedCourseId ? avg(filteredHoleStats.map(h => h.fairwayPct ?? 0)) : friendStats?.fairwayPct ?? null
  const puttsAvg   = selectedCourseId
    ? (filteredHoleStats.length > 0
        ? Math.round(filteredHoleStats.reduce((s, h) => s + (h.avgPutts ?? 0), 0) * 10) / 10
        : null)
    : friendStats?.puttsAvg ?? null

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
          </div>
          <div className="text-right text-sm text-golf-200 pt-8 shrink-0">
            <div>Record <span className="text-base font-bold text-white">{record ?? '—'}</span></div>
            <div>Earnings <span className={`text-base font-bold ${earningsHeaderColor}`}>{earnings ?? '—'}</span></div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg">
        <div className="mx-3 mt-3">
          {/* Filter pills */}
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            <button onClick={() => setSelectedCourseId(null)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                selectedCourseId === null ? 'bg-golf-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>All</button>
            {courses.map(c => (
              <button key={c.id} onClick={() => setSelectedCourseId(c.id)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  selectedCourseId === c.id ? 'bg-golf-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>{c.name}</button>
            ))}
          </div>

          {/* Row: Low, GIR%, FW%, Putts */}
          <div className="grid grid-cols-4 gap-2 mt-2">
            {[
              { label: 'Low',   value: careerLow  != null ? `${careerLow}`              : '—', color: 'text-gray-900' },
              { label: 'GIR%',  value: girPct     != null ? `${Math.round(girPct)}%`    : '—', color: 'text-gray-900' },
              { label: 'FW%',   value: fairwayPct != null ? `${Math.round(fairwayPct)}%`: '—', color: 'text-gray-900' },
              { label: 'Putts', value: puttsAvg   != null ? `${puttsAvg}`               : '—', color: 'text-gray-900' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl border border-gray-200 bg-white shadow-sm px-2 py-4 text-center">
                <p className={`text-xl font-black ${color}`}>{value}</p>
                <p className="text-xs font-semibold text-gray-500 mt-0.5 uppercase tracking-wider">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Scoring Distribution */}
        {filteredHoleStats.length > 0 && (
          <div className="mx-3 mt-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">Scoring Distribution</p>
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 space-y-2">
              <ScoringBar label="Eagles"  pct={scoringPct(totalEagles)}  color="bg-yellow-500" />
              <ScoringBar label="Birdies" pct={scoringPct(totalBirdies)} color="bg-red-500" />
              <ScoringBar label="Pars"    pct={scoringPct(totalPars)}    color="bg-gray-400" />
              <ScoringBar label="Bogeys"  pct={scoringPct(totalBogeys)}  color="bg-blue-500" />
              <ScoringBar label="Double+" pct={scoringPct(totalDoubles)} color="bg-blue-800" />
            </div>
          </div>
        )}

        {/* Round History */}
        <div className="mx-3 mt-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">Rounds</p>
          {filteredRounds.length > 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              {filteredRounds.map(r => <RoundRow key={r.id} round={r} userId={userId} />)}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-gray-400">No rounds yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}
