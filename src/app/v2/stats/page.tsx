'use client'

// STATS PAGE
// Header with career stats · GIR/FW/Putts boxes · Round list

import { useState } from 'react'
import Link from 'next/link'
import { STUB_ALL_ROUNDS, STUB_PLAYER_STATS, STUB_EARNINGS, STUB_USER_HOLE_STATS, ME } from '@/lib/v2/stub-data'
import type { RoundV2 } from '@/lib/v2/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function avg(values: number[]): number | null {
  return values.length > 0
    ? Math.round(values.reduce((s, v) => s + v, 0) / values.length * 10) / 10
    : null
}

// ─── Scoring bar ──────────────────────────────────────────────────────────────

function ScoringBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 text-xs font-semibold text-gray-600 text-right shrink-0">{label}</span>
      <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-xs font-bold text-gray-700 tabular-nums text-right">{Math.round(pct)}%</span>
    </div>
  )
}

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
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)


  const myRounds = STUB_ALL_ROUNDS
    .filter(r => r.userId === ME.id)
    .sort((a, b) => b.date.localeCompare(a.date))

  const me = STUB_PLAYER_STATS.find(s => s.player.id === ME.id)
  const meEarnings = STUB_EARNINGS.find(e => e.player.id === ME.id)

  const courses = Array.from(
    new Map(myRounds.map(r => [r.courseId, r.courseName])).entries()
  ).map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const filteredRounds = selectedCourseId
    ? myRounds.filter(r => r.courseId === selectedCourseId)
    : myRounds

  const filteredCompleted = filteredRounds.filter(r => r.grossTotal != null)

  const filteredHoleStats = selectedCourseId
    ? (STUB_USER_HOLE_STATS[selectedCourseId]?.[ME.id] ?? [])
    : Object.values(STUB_USER_HOLE_STATS).flatMap(c => c[ME.id] ?? [])

  // Scoring distribution
  const totalEagles  = filteredHoleStats.reduce((s, h) => s + h.eagles,  0)
  const totalBirdies = filteredHoleStats.reduce((s, h) => s + h.birdies, 0)
  const totalPars    = filteredHoleStats.reduce((s, h) => s + h.pars,    0)
  const totalBogeys  = filteredHoleStats.reduce((s, h) => s + h.bogeys,  0)
  const totalDoubles = filteredHoleStats.reduce((s, h) => s + h.doubles, 0)
  const totalScores  = totalEagles + totalBirdies + totalPars + totalBogeys + totalDoubles
  const scoringPct   = (n: number) => totalScores > 0 ? (n / totalScores) * 100 : 0

  // Career low (per course when filtered)
  const careerLow = filteredCompleted.length > 0
    ? Math.min(...filteredCompleted.map(r => r.grossTotal!))
    : null

  // Record and Earnings remain global
  const record = me ? `${me.matchRecord.wins}-${me.matchRecord.losses}-${me.matchRecord.ties}` : null
  const earnings = meEarnings
    ? (meEarnings.netEarnings >= 0 ? `+$${meEarnings.netEarnings}` : `-$${Math.abs(meEarnings.netEarnings)}`)
    : null
  const earningsHeaderColor = meEarnings != null
    ? (meEarnings.netEarnings >= 0 ? 'text-green-400' : 'text-red-400')
    : 'text-white'

  // GIR/FW/Putts: derive from hole stats when filtered, else use STUB_PLAYER_STATS
  const girPct     = selectedCourseId ? avg(filteredHoleStats.map(h => h.girPct     ?? 0)) : me?.girPct     ?? null
  const fairwayPct = selectedCourseId ? avg(filteredHoleStats.map(h => h.fairwayPct ?? 0)) : me?.fairwayPct ?? null
  const puttsAvg   = selectedCourseId
    ? (filteredHoleStats.length > 0
        ? Math.round(filteredHoleStats.reduce((s, h) => s + (h.avgPutts ?? 0), 0) * 10) / 10
        : null)
    : me?.puttsAvg ?? null

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
          </div>
          <div className="text-right text-sm text-golf-200 pt-8 shrink-0">
            <div>Record <span className="text-base font-bold text-white">{record ?? '—'}</span></div>
            <div>Earnings <span className={`text-base font-bold ${earningsHeaderColor}`}>{earnings ?? '—'}</span></div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg">
        {/* Course filter + stats section */}
        <div className="mx-3 mt-3">
          {/* Course filter trigger */}
          <button
            onClick={() => setSheetOpen(true)}
            className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200 transition"
          >
            {selectedCourseId && <span className="w-1.5 h-1.5 rounded-full bg-golf-800" />}
            {selectedCourseId ? courses.find(c => c.id === selectedCourseId)?.name ?? 'All Courses' : 'All Courses'}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* Row: Low, GIR%, FW%, Putts */}
          <div className="grid grid-cols-4 gap-2 mt-2">
            {[
              { label: 'Low',   value: careerLow   != null ? `${careerLow}`                    : '—', color: 'text-gray-900' },
              { label: 'GIR%',  value: girPct      != null ? `${Math.round(girPct)}%`           : '—', color: 'text-gray-900' },
              { label: 'FW%',   value: fairwayPct  != null ? `${Math.round(fairwayPct)}%`       : '—', color: 'text-gray-900' },
              { label: 'Putts', value: puttsAvg    != null ? `${puttsAvg}`                      : '—', color: 'text-gray-900' },
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

        {/* Round list */}
        <div className="mx-3 mt-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">Rounds ({filteredRounds.length})</p>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {filteredRounds.map(r => <RoundRow key={r.id} round={r} />)}
          </div>
        </div>
      </div>

      {/* Course search bottom sheet */}
      {sheetOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-[60]"
            onClick={() => setSheetOpen(false)}
          />
          {/* Modal */}
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 pointer-events-none">
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden pointer-events-auto">
              <div className="overflow-y-auto max-h-72 divide-y divide-gray-100 [scrollbar-gutter:stable]">
                <button
                    onClick={() => { setSelectedCourseId(null); setSheetOpen(false) }}
                    className={`w-full text-left px-4 py-3 text-sm font-semibold flex items-center gap-2 ${
                      selectedCourseId === null ? 'text-golf-800' : 'text-gray-700'
                    }`}
                  >
                    {selectedCourseId === null && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="shrink-0">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                    All Courses
                  </button>
                {/* Grouped, sorted course list */}
                {Object.entries(
                  courses
                    .reduce<Record<string, typeof courses>>((acc, c) => {
                      const letter = c.name[0].toUpperCase()
                      ;(acc[letter] ??= []).push(c)
                      return acc
                    }, {})
                ).map(([letter, group]) => (
                  <div key={letter}>
                    <div className="sticky top-0 bg-white pl-4 pr-4 py-1">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{letter}</span>
                    </div>
                    {group.map(c => (
                      <button
                        key={c.id}
                        onClick={() => { setSelectedCourseId(c.id); setSheetOpen(false) }}
                        className={`w-full text-left px-4 py-3 text-sm flex items-center gap-2 border-b border-gray-100 last:border-b-0 ${
                          selectedCourseId === c.id ? 'font-semibold text-golf-800' : 'text-gray-700'
                        }`}
                      >
                        {selectedCourseId === c.id && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="shrink-0">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                        {c.name}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
