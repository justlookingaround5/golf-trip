'use client'

// FRIEND'S STATS PAGE
// Same format as /v2/stats but for a specific friend.
// Round rows link to /v2/profile/[userId]/round/[roundId] (read-only).

import { use, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { STUB_ALL_ROUNDS, STUB_PLAYER_STATS, STUB_EARNINGS, STUB_FRIENDS } from '@/lib/v2/stub-data'
import type { RoundV2 } from '@/lib/v2/types'

type Tab = 'rounds' | 'matches' | 'earnings'

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

// ─── Match Record ──────────────────────────────────────────────────────────────

function MatchRecord({ userId }: { userId: string }) {
  const stats = STUB_PLAYER_STATS.find(s => s.player.id === userId)
  if (!stats) return <p className="py-8 text-center text-sm text-gray-400">No match data yet.</p>

  const { wins, losses, ties } = stats.matchRecord
  const played = wins + losses + ties

  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Wins',   count: wins,   cls: 'border-green-200 bg-green-50 text-green-700' },
          { label: 'Losses', count: losses, cls: 'border-red-200 bg-red-50 text-red-700'       },
          { label: 'Ties',   count: ties,   cls: 'border-gray-200 bg-gray-50 text-gray-600'    },
        ].map(({ label, count, cls }) => (
          <div key={label} className={`rounded-xl border px-3 py-4 text-center ${cls}`}>
            <p className="text-3xl font-black">{count}</p>
            <p className="text-xs font-semibold mt-0.5">{label}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
        {[
          { label: 'Matches played', value: played },
          { label: 'Win rate',       value: played > 0 ? `${Math.round((wins / played) * 100)}%` : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-gray-600">{label}</span>
            <span className="text-sm font-bold text-gray-900">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Earnings ──────────────────────────────────────────────────────────────────

function Earnings({ userId }: { userId: string }) {
  const data = STUB_EARNINGS.find(e => e.player.id === userId)
  if (!data) return <p className="py-8 text-center text-sm text-gray-400">No earnings data yet.</p>

  const total = data.netEarnings

  return (
    <div className="space-y-4 p-4">
      <div className={`rounded-xl border px-5 py-5 text-center ${
        total >= 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
      }`}>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Career Total</p>
        <p className={`text-4xl font-black ${total >= 0 ? 'text-green-700' : 'text-red-700'}`}>
          {total >= 0 ? '+' : ''}${Math.abs(total)}
        </p>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Breakdown</p>
        </div>
        <div className="divide-y divide-gray-100">
          {data.breakdown.map(line => (
            <div key={line.label} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-gray-700">{line.label}</span>
              <span className={`text-sm font-bold ${line.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {line.amount >= 0 ? '+' : ''}${Math.abs(line.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function FriendStatsPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params)
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('rounds')

  const friend = STUB_FRIENDS.find(f => f.id === userId)
  const friendName = friend?.name ?? 'Player'

  const totalRounds = STUB_ALL_ROUNDS.length
  const avgGross = STUB_ALL_ROUNDS
    .filter(r => r.grossTotal != null)
    .reduce((s, r, _, arr) => s + (r.grossTotal! / arr.length), 0)

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="bg-golf-800 px-4 pt-14 pb-6 text-white">
        <div className="mx-auto max-w-lg">
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
          <div className="mt-1 flex items-center gap-4 text-sm text-golf-200">
            <span>{totalRounds} rounds</span>
            {avgGross > 0 && <span>Avg {avgGross.toFixed(1)}</span>}
          </div>
        </div>
      </header>

      {/* Tab bar */}
      <div className="sticky top-0 z-10 flex border-b border-gray-200 bg-white">
        {([
          { key: 'rounds',   label: 'Rounds'   },
          { key: 'matches',  label: 'Matches'  },
          { key: 'earnings', label: 'Earnings' },
        ] as { key: Tab; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              tab === key
                ? 'text-golf-700 border-b-2 border-golf-700'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mx-auto max-w-lg">
        {tab === 'rounds' && (
          <div className="bg-white mt-3 mx-3 rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {STUB_ALL_ROUNDS.map(r => <RoundRow key={r.id} round={r} userId={userId} />)}
          </div>
        )}
        {tab === 'matches'  && <MatchRecord userId={userId} />}
        {tab === 'earnings' && <Earnings userId={userId} />}
      </div>
    </div>
  )
}
