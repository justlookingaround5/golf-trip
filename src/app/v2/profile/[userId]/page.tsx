'use client'

// FRIEND PROFILE PAGE
// Shows: their Map (top 10 ratings) · Their Stats

import { use } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { STUB_FRIENDS, STUB_PINS, STUB_PLAYER_STATS, STUB_ALL_ROUNDS, STUB_EARNINGS } from '@/lib/v2/stub-data'

const CourseMapV2 = dynamic(() => import('@/components/v2/CourseMapV2'), { ssr: false })

export default function FriendProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params)

  // STUB: look up friend by id
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
        {/* Map */}
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-3">Map</h2>
          <CourseMapV2 pins={friendPins} />
        </div>

        {/* Stats */}
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-3">Stats</h2>

          {friendStats ? (
            <div className="space-y-3">
              {/* Match record */}
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

              {/* Key stats */}
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm divide-y divide-gray-100">
                {[
                  { label: 'Total points',  value: friendStats.points % 1 === 0 ? friendStats.points : friendStats.points.toFixed(1) },
                  { label: 'Gross avg',     value: friendStats.grossAvg?.toFixed(1) ?? '—' },
                  { label: 'Net avg',       value: friendStats.netAvg?.toFixed(1) ?? '—'   },
                  { label: 'Skins won',     value: friendStats.skinsWon                    },
                  { label: 'Fairway hit%',  value: friendStats.fairwayPct != null ? `${Math.round(friendStats.fairwayPct)}%` : '—' },
                  { label: 'GIR%',          value: friendStats.girPct != null ? `${Math.round(friendStats.girPct)}%` : '—'        },
                  { label: 'Putts/round',   value: friendStats.puttsAvg?.toFixed(1) ?? '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-gray-600">{label}</span>
                    <span className="text-sm font-bold text-gray-900">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
              <p className="text-sm text-gray-400">No stats available for {friend.name} yet.</p>
            </div>
          )}
        </div>

        {/* Earnings */}
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-3">Earnings</h2>
          {friendEarnings ? (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-900">Net total</span>
                <span className={`text-sm font-black ${friendEarnings.net >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {friendEarnings.net >= 0 ? '+' : '−'}${Math.abs(friendEarnings.net).toFixed(2)}
                </span>
              </div>
              {[
                { label: 'Match play', value: friendEarnings.matchPlay },
                { label: 'Skins',      value: friendEarnings.skins     },
                { label: 'Side bets',  value: friendEarnings.sideBets  },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-b-0">
                  <span className="text-sm text-gray-500">{label}</span>
                  <span className={`text-sm font-semibold ${value >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
              <p className="text-sm text-gray-400">No earnings data for {friend.name} yet.</p>
            </div>
          )}
        </div>

        {/* Recent Rounds */}
        {friendRounds.length > 0 && (
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-3">Recent Rounds</h2>
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              {friendRounds.map(r => {
                const vsPar = r.grossTotal != null ? r.grossTotal - r.par : null
                const vsParStr = vsPar == null ? null : vsPar === 0 ? 'E' : vsPar > 0 ? `+${vsPar}` : `${vsPar}`
                return (
                  <div key={r.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-b-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">{r.courseName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(r.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {r.tripName && ` · ${r.tripName}`}
                      </p>
                    </div>
                    {r.grossTotal != null && (
                      <div className="shrink-0 ml-3 text-right">
                        <p className="text-sm font-bold text-gray-900">{r.grossTotal}</p>
                        {vsParStr && (
                          <p className={`text-xs font-semibold ${vsPar! < 0 ? 'text-red-600' : vsPar! > 0 ? 'text-blue-600' : 'text-gray-500'}`}>
                            {vsParStr}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
