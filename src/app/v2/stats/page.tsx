'use client'

// STATS PAGE
// Header with career stats · GIR/FW/Putts boxes · Round list

import Link from 'next/link'
import { STUB_ALL_ROUNDS, STUB_PLAYER_STATS, STUB_EARNINGS, ME } from '@/lib/v2/stub-data'
import type { RoundV2 } from '@/lib/v2/types'

// ─── Round row ────────────────────────────────────────────────────────────────

function RoundRow({ round }: { round: RoundV2 }) {
  const vsPar = round.grossTotal != null ? round.grossTotal - round.par : null
  const vsParStr = vsPar == null ? null : vsPar === 0 ? 'E' : vsPar > 0 ? `+${vsPar}` : `${vsPar}`

  return (
    <Link
      href={`/v2/round/${round.id}`}
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StatsPage() {
  const totalRounds = STUB_ALL_ROUNDS.length
  const completedRounds = STUB_ALL_ROUNDS.filter(r => r.grossTotal != null)
  const me = STUB_PLAYER_STATS.find(s => s.player.id === ME.id)
  const meEarnings = STUB_EARNINGS.find(e => e.player.id === ME.id)

  const careerLow = completedRounds.length > 0
    ? Math.min(...completedRounds.map(r => r.grossTotal!))
    : null
  const record = me ? `${me.matchRecord.wins}-${me.matchRecord.losses}-${me.matchRecord.ties}` : null
  const earnings = meEarnings
    ? (meEarnings.netEarnings >= 0 ? `+$${meEarnings.netEarnings}` : `-$${Math.abs(meEarnings.netEarnings)}`)
    : null

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="bg-golf-800 px-4 pt-14 pb-6 text-white">
        <div className="mx-auto max-w-lg flex items-start justify-between">
          <div>
            <Link
              href="/v2/profile"
              className="mb-3 inline-flex items-center gap-1 text-sm text-golf-300 hover:text-white transition"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Profile
            </Link>
            <h1 className="text-2xl font-bold">My Stats</h1>
            <p className="mt-1 text-sm text-golf-200">{totalRounds} rounds</p>
          </div>
          <div className="text-right text-sm text-golf-200 pt-8">
            {careerLow != null && (
              <div>Low <span className="font-bold text-white">{careerLow}</span></div>
            )}
            {record != null && (
              <div><span className="font-bold text-white">{record}</span></div>
            )}
            {earnings != null && (
              <div><span className="font-bold text-white">{earnings}</span></div>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg">
        {/* Stat boxes */}
        {me && (
          <div className="grid grid-cols-3 gap-3 mx-3 mt-3">
            {[
              { label: 'GIR%', value: `${me.girPct}%` },
              { label: 'FW%', value: `${me.fairwayPct}%` },
              { label: 'Putts', value: `${me.puttsAvg}` },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl border border-gray-200 bg-white shadow-sm px-3 py-4 text-center">
                <p className="text-2xl font-black text-gray-900">{value}</p>
                <p className="text-xs font-semibold text-gray-500 mt-0.5 uppercase tracking-wider">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Round list */}
        <div className="bg-white mt-3 mx-3 rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {STUB_ALL_ROUNDS.map(r => <RoundRow key={r.id} round={r} />)}
        </div>
      </div>
    </div>
  )
}
