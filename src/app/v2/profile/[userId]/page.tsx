'use client'

// FRIEND PROFILE PAGE
// Sections: Map · Course Ratings · Match Record · Earnings · Recent Rounds

import { use } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { STUB_FRIENDS, STUB_PINS, STUB_PLAYER_STATS, STUB_ALL_ROUNDS, STUB_EARNINGS } from '@/lib/v2/stub-data'

const CourseMapV2 = dynamic(() => import('@/components/v2/CourseMapV2'), { ssr: false })

export default function FriendProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params)

  const friend = STUB_FRIENDS.find(f => f.id === userId) ?? {
    id: userId,
    name: 'Player',
    avatarUrl: null,
    handicap: null,
  }

  // STUB: use same pins for all friends (top 10 by rating)
  const friendPins = [...STUB_PINS]
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 10)

  const friendStats = STUB_PLAYER_STATS.find(s => s.player.id === userId)
  const friendEarnings = STUB_EARNINGS.find(e => e.player.id === userId)
  const friendRounds = STUB_ALL_ROUNDS.slice(0, 3)

  // Course ratings sorted by rating desc
  const ratedPins = [...friendPins]
    .filter(p => p.rating != null)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <header className="bg-golf-800 px-4 pt-14 pb-8 text-white">
        <div className="mx-auto max-w-lg">
          <Link
            href="/v2/profile"
            className="mb-4 inline-flex items-center gap-1 text-sm text-golf-300 hover:text-white transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Friends
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-golf-600 text-2xl font-bold text-white ring-2 ring-white/30 shrink-0">
              {friend.name[0]?.toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold">{friend.name}</h1>
              <p className="text-sm text-golf-200 mt-0.5">
                {friend.handicap != null ? `HCP ${friend.handicap}` : 'No handicap'}
                {friendRounds.length > 0 && ` · ${friendRounds.length} rounds`}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-6 space-y-8">
        {/* 1 · Map */}
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-3">Map</h2>
          <CourseMapV2 pins={friendPins} />
        </div>

        {/* 2 · Course Ratings */}
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-3">Course Ratings</h2>
          {ratedPins.length > 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100 shadow-sm overflow-hidden">
              {ratedPins.map((p, i) => (
                <div key={p.courseId} className="flex items-center gap-3 px-4 py-3">
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
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-6 text-center">
              <p className="text-sm text-gray-400">No course ratings yet.</p>
            </div>
          )}
        </div>

        {/* 3 · Match Record */}
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-3">Match Record</h2>
          {friendStats ? (
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Wins',   val: friendStats.matchRecord.wins,   cls: 'text-green-700' },
                { label: 'Losses', val: friendStats.matchRecord.losses, cls: 'text-red-600'   },
                { label: 'Ties',   val: friendStats.matchRecord.ties,   cls: 'text-gray-600'  },
              ].map(({ label, val, cls }) => (
                <div key={label} className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-center shadow-sm">
                  <p className={`text-2xl font-black ${cls}`}>{val}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
              <p className="text-sm text-gray-400">No match data for {friend.name} yet.</p>
            </div>
          )}
        </div>

        {/* 4 · Earnings */}
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-3">Earnings</h2>
          {friendEarnings ? (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              {friendEarnings.breakdown.map(({ label, amount }) => (
                <div key={label} className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <span className="text-sm text-gray-500">{label}</span>
                  <span className={`text-sm font-semibold ${amount >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {amount >= 0 ? '+' : '−'}${Math.abs(amount).toFixed(2)}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm font-semibold text-gray-900">Net total</span>
                <span className={`text-sm font-black ${friendEarnings.netEarnings >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {friendEarnings.netEarnings >= 0 ? '+' : '−'}${Math.abs(friendEarnings.netEarnings).toFixed(2)}
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
              <p className="text-sm text-gray-400">No earnings data for {friend.name} yet.</p>
            </div>
          )}
        </div>

        {/* 5 · Recent Rounds */}
        {friendRounds.length > 0 && (
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-3">Recent Rounds</h2>
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              {friendRounds.map(r => {
                const vsPar = r.grossTotal != null ? r.grossTotal - r.par : null
                const vsParStr = vsPar == null ? null : vsPar === 0 ? 'E' : vsPar > 0 ? `+${vsPar}` : `${vsPar}`
                return (
                  <Link
                    key={r.id}
                    href={`/v2/profile/${userId}/round/${r.id}`}
                    className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 active:bg-gray-100 transition"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">{r.courseName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(r.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {r.tripName && ` · ${r.tripName}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      {r.grossTotal != null && (
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-900">{r.grossTotal}</p>
                          {vsParStr && (
                            <p className={`text-xs font-semibold ${vsPar! < 0 ? 'text-red-600' : vsPar! > 0 ? 'text-blue-600' : 'text-gray-500'}`}>
                              {vsParStr}
                            </p>
                          )}
                        </div>
                      )}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-gray-300">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
