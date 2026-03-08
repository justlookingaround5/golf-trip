'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import type { CoursePinData } from '@/components/CourseMap'

const CourseMap = dynamic(() => import('@/components/CourseMap'), { ssr: false })

interface RoundRow {
  courseId: string
  courseName: string
  roundNumber: number
  roundDate: string | null
  par: number
  gross: number | null
  net: number | null
  holesPlayed: number
}

interface MatchRow {
  matchId: string
  format: string
  result: string | null
  outcome: 'win' | 'loss' | 'tie' | 'pending'
  opponentNames: string
  courseName: string
  roundNumber: number
  roundDate: string | null
}

interface EarningsLine {
  label: string
  amount: number
}

interface EarningsByTrip {
  tripId: string
  tripName: string
  lines: EarningsLine[]
  total: number
}

interface PlayerProfileTabsProps {
  rounds: RoundRow[]
  matches: MatchRow[]
  earnings: EarningsByTrip[]
  careerTotal: number
  mapPins: CoursePinData[]
}

const FORMAT_LABELS: Record<string, string> = {
  '1v1_stroke': 'Stroke Play',
  '2v2_best_ball': 'Best Ball',
  '1v1_match': 'Match Play',
  '2v2_alternate_shot': 'Alt Shot',
}

export default function PlayerProfileTabs({ rounds, matches, earnings, careerTotal, mapPins }: PlayerProfileTabsProps) {
  const [tab, setTab] = useState<'scores' | 'matches' | 'earnings' | 'map'>('scores')

  return (
    <div>
      {/* Tab bar */}
      <div className="flex rounded-lg bg-gray-100 p-1 mb-5">
        {(['scores', 'matches', 'earnings', 'map'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all ${
              tab === t
                ? 'bg-white text-golf-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'scores' ? 'Scores' : t === 'matches' ? 'Matches' : t === 'earnings' ? 'Earnings' : 'Map'}
          </button>
        ))}
      </div>

      {tab === 'scores' && <ScoreHistory rounds={rounds} />}
      {tab === 'matches' && <MatchHistory matches={matches} />}
      {tab === 'earnings' && <EarningsTab earnings={earnings} careerTotal={careerTotal} />}
      {tab === 'map' && <CourseMap pins={mapPins} />}
    </div>
  )
}

function ScoreHistory({ rounds }: { rounds: RoundRow[] }) {
  if (rounds.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-500">
        No rounds played yet.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {rounds.map((r) => {
        const grossVsPar = r.gross != null ? r.gross - r.par : null
        const netVsPar = r.net != null ? r.net - r.par : null
        const partial = r.holesPlayed > 0 && r.holesPlayed < 18

        return (
          <div
            key={r.courseId}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-gray-900">{r.courseName}</p>
                <p className="text-xs text-gray-500">
                  Round {r.roundNumber}
                  {r.roundDate &&
                    ` · ${new Date(r.roundDate + 'T12:00:00').toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}`}
                  {partial && ` · ${r.holesPlayed} holes`}
                </p>
              </div>
              {grossVsPar != null && (
                <span
                  className={`text-sm font-bold ${
                    grossVsPar < 0
                      ? 'text-red-600'
                      : grossVsPar > 0
                        ? 'text-blue-600'
                        : 'text-gray-600'
                  }`}
                >
                  {grossVsPar === 0 ? 'E' : grossVsPar > 0 ? `+${grossVsPar}` : `${grossVsPar}`}
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <ScoreStat label="Gross" value={r.gross ?? '—'} />
              <ScoreStat label="Net" value={r.net ?? '—'} />
              <ScoreStat
                label="Net vs Par"
                value={
                  netVsPar == null
                    ? '—'
                    : netVsPar === 0
                      ? 'E'
                      : netVsPar > 0
                        ? `+${netVsPar}`
                        : `${netVsPar}`
                }
                valueClass={
                  netVsPar == null
                    ? 'text-gray-900'
                    : netVsPar < 0
                      ? 'text-red-600'
                      : netVsPar > 0
                        ? 'text-blue-600'
                        : 'text-gray-600'
                }
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ScoreStat({
  label,
  value,
  valueClass = 'text-gray-900',
}: {
  label: string
  value: string | number
  valueClass?: string
}) {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2 text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-lg font-bold ${valueClass}`}>{value}</p>
    </div>
  )
}

function MatchHistory({ matches }: { matches: MatchRow[] }) {
  if (matches.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-500">
        No matches played yet.
      </p>
    )
  }

  const wins = matches.filter((m) => m.outcome === 'win').length
  const losses = matches.filter((m) => m.outcome === 'loss').length
  const ties = matches.filter((m) => m.outcome === 'tie').length
  const played = wins + losses + ties

  return (
    <div className="space-y-3">
      {/* W/L/T summary */}
      {played > 0 && (
        <div className="flex gap-3">
          {[
            { label: 'W', count: wins, color: 'text-green-700 bg-green-50 border-green-200' },
            { label: 'L', count: losses, color: 'text-red-700 bg-red-50 border-red-200' },
            { label: 'T', count: ties, color: 'text-gray-600 bg-gray-50 border-gray-200' },
          ].map(({ label, count, color }) => (
            <div
              key={label}
              className={`flex-1 rounded-lg border px-3 py-2 text-center ${color}`}
            >
              <p className="text-2xl font-black">{count}</p>
              <p className="text-xs font-semibold">{label}</p>
            </div>
          ))}
        </div>
      )}

      {matches.map((m) => {
        const outcomeConfig = {
          win:     { dot: 'bg-green-500', text: 'W', textClass: 'text-green-700' },
          loss:    { dot: 'bg-red-500',   text: 'L', textClass: 'text-red-700' },
          tie:     { dot: 'bg-gray-400',  text: 'T', textClass: 'text-gray-600' },
          pending: { dot: 'bg-yellow-400',text: '—', textClass: 'text-gray-500' },
        }[m.outcome]

        return (
          <div
            key={m.matchId}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start gap-3">
              {/* Outcome indicator */}
              <div className="flex flex-col items-center pt-0.5">
                <span className={`h-3 w-3 rounded-full ${outcomeConfig.dot}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    vs {m.opponentNames}
                  </p>
                  <span className={`shrink-0 text-sm font-bold ${outcomeConfig.textClass}`}>
                    {outcomeConfig.text}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                  <span className="text-xs text-gray-500">
                    {FORMAT_LABELS[m.format] || m.format}
                  </span>
                  <span className="text-gray-300">·</span>
                  <span className="text-xs text-gray-500">
                    R{m.roundNumber} {m.courseName}
                  </span>
                  {m.roundDate && (
                    <>
                      <span className="text-gray-300">·</span>
                      <span className="text-xs text-gray-400">
                        {new Date(m.roundDate + 'T12:00:00').toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </>
                  )}
                </div>

                {m.result && (
                  <p className="mt-1 text-xs font-medium text-golf-700">{m.result}</p>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function EarningsTab({ earnings, careerTotal }: { earnings: EarningsByTrip[]; careerTotal: number }) {
  if (earnings.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-500">
        No earnings data yet.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {/* Career total */}
      <div className={`rounded-xl border px-5 py-4 text-center ${
        careerTotal >= 0
          ? 'border-green-200 bg-green-50'
          : 'border-red-200 bg-red-50'
      }`}>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Career Total</p>
        <p className={`text-3xl font-black ${careerTotal >= 0 ? 'text-green-700' : 'text-red-700'}`}>
          {formatMoney(careerTotal)}
        </p>
      </div>

      {/* Per-trip breakdown */}
      {earnings.map((trip) => (
        <div key={trip.tripId} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">{trip.tripName}</p>
            <span className={`text-sm font-bold ${trip.total >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {formatMoney(trip.total)}
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {trip.lines.map((line, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5">
                <p className="text-sm text-gray-700">{line.label}</p>
                <span className={`text-sm font-semibold ${line.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatMoney(line.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function formatMoney(amount: number): string {
  const abs = Math.abs(amount)
  const formatted = abs % 1 === 0 ? `$${abs}` : `$${abs.toFixed(2)}`
  return amount < 0 ? `-${formatted}` : `+${formatted}`
}
