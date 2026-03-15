'use client'

// COURSE DETAIL PAGE
// Sections: Header · Your Stats · Scoring Distribution · Round History
//           · Hole-by-Hole · Course Info

import { use, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  STUB_COURSE_DETAILS,
  STUB_USER_HOLE_STATS,
  STUB_ALL_ROUNDS,
  STUB_PINS,
} from '@/lib/v2/stub-data'
import type { RoundV2, UserHoleStatsV2 } from '@/lib/v2/types'

// ─── Section wrapper ─────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-base font-bold text-gray-900 mb-3">{title}</h2>
      {children}
    </div>
  )
}

// ─── Stat tile ───────────────────────────────────────────────────────────────

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-4 text-center">
      <p className="text-2xl font-black text-gray-900 tabular-nums">{value}</p>
      <p className="text-xs font-semibold text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}

// ─── Round row (reuse pattern from stats) ────────────────────────────────────

function RoundRow({ round }: { round: RoundV2 }) {
  const vsPar = round.grossTotal != null ? round.grossTotal - round.par : null
  const vsParStr = vsPar == null ? null : vsPar === 0 ? 'E' : vsPar > 0 ? `+${vsPar}` : `${vsPar}`

  return (
    <Link
      href={`/v2/round/${round.id}`}
      className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 active:bg-gray-100 transition"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900 truncate">
          {new Date(round.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {round.tripName ?? 'Quick Round'}
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

// ─── Scoring Distribution bar ────────────────────────────────────────────────

function ScoringBar({ label, count, maxCount, color }: { label: string; count: number; maxCount: number; color: string }) {
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 text-xs font-semibold text-gray-600 text-right shrink-0">{label}</span>
      <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-6 text-xs font-bold text-gray-700 tabular-nums">{count}</span>
    </div>
  )
}

// ─── Hole-by-Hole table ─────────────────────────────────────────────────────

function BestScoreCell({ score, par }: { score: number; par: number }) {
  const diff = score - par
  if (diff <= -2) {
    // Eagle or better — double circle
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full ring-2 ring-yellow-400 text-yellow-600 font-bold text-xs">{score}</span>
    )
  }
  if (diff === -1) {
    // Birdie — red circle
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full ring-2 ring-red-400 text-red-600 font-bold text-xs">{score}</span>
    )
  }
  if (diff === 0) {
    return <span className="text-xs font-medium text-gray-700">{score}</span>
  }
  if (diff === 1) {
    // Bogey — blue square
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center ring-1 ring-blue-400 text-blue-600 text-xs">{score}</span>
    )
  }
  // Double bogey+ — bold blue square
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center ring-2 ring-blue-500 text-blue-800 font-bold text-xs">{score}</span>
  )
}

function HoleTable({ holes }: { holes: UserHoleStatsV2[] }) {
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  function handleSort(col: string) {
    if (sortCol === col) {
      if (sortDir === 'desc') {
        setSortDir('asc')
      } else {
        setSortCol(null)
        setSortDir('desc')
      }
    } else {
      setSortCol(col)
      setSortDir('desc')
    }
  }

  const sortedHoles = sortCol
    ? [...holes].sort((a, b) => {
        let av: number | null = null
        let bv: number | null = null
        switch (sortCol) {
          case 'hcp':   av = a.handicapIndex; bv = b.handicapIndex; break
          case 'avg':   av = a.avgGross;      bv = b.avgGross;      break
          case 'best':  av = a.bestGross;     bv = b.bestGross;     break
          case 'fw':    av = a.fairwayPct;    bv = b.fairwayPct;    break
          case 'gir':   av = a.girPct;        bv = b.girPct;        break
          case 'putts': av = a.avgPutts;      bv = b.avgPutts;      break
        }
        if (av == null && bv == null) return 0
        if (av == null) return 1
        if (bv == null) return -1
        return sortDir === 'desc' ? bv - av : av - bv
      })
    : holes

  function SortIndicator({ col }: { col: string }) {
    if (sortCol !== col) return null
    return <span className="ml-0.5">{sortDir === 'desc' ? '↓' : '↑'}</span>
  }

  const thSortable = 'px-2 py-2 text-center font-semibold text-gray-500 cursor-pointer select-none hover:bg-gray-100 transition-colors'

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-3 py-2 text-left font-semibold text-gray-500">Hole</th>
              <th className="px-2 py-2 text-center font-semibold text-gray-500">Par</th>
              <th className={thSortable} onClick={() => handleSort('hcp')}>HCP<SortIndicator col="hcp" /></th>
              <th className={thSortable} onClick={() => handleSort('best')}>Best<SortIndicator col="best" /></th>
              <th className={thSortable} onClick={() => handleSort('avg')}>Avg<SortIndicator col="avg" /></th>
              <th className={thSortable} onClick={() => handleSort('fw')}>FW%<SortIndicator col="fw" /></th>
              <th className={thSortable} onClick={() => handleSort('gir')}>GIR%<SortIndicator col="gir" /></th>
              <th className={thSortable} onClick={() => handleSort('putts')}>Avg Putts<SortIndicator col="putts" /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sortedHoles.map(h => (
              <tr key={h.holeNumber}>
                <td className="px-3 py-2 font-bold text-gray-900">{h.holeNumber}</td>
                <td className="px-2 py-2 text-center text-gray-600">{h.par}</td>
                <td className="px-2 py-2 text-center text-gray-400 tabular-nums">{h.handicapIndex}</td>
                <td className="px-2 py-2 text-center tabular-nums">
                  <BestScoreCell score={h.bestGross} par={h.par} />
                </td>
                <td className="px-2 py-2 text-center font-bold tabular-nums text-gray-700">
                  {h.avgGross.toFixed(1)}
                </td>
                <td className="px-2 py-2 text-center tabular-nums text-gray-600">{h.fairwayPct != null ? `${h.fairwayPct}%` : '—'}</td>
                <td className="px-2 py-2 text-center tabular-nums text-gray-600">{h.girPct != null ? `${h.girPct}%` : '—'}</td>
                <td className="px-2 py-2 text-center tabular-nums text-gray-600">{h.avgPutts != null ? h.avgPutts.toFixed(1) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Course Info (tee-selectable slope/rating) ──────────────────────────────

function CourseInfoSection({ course, location, par }: { course: import('@/lib/v2/types').CourseDetailV2; location: string; par: number }) {
  return (
    <Section title="Course Info">
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden divide-y divide-gray-100">
        {location && (
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-gray-600">Address</span>
            <span className="text-sm font-bold text-gray-900 text-right max-w-[60%]">{location}</span>
          </div>
        )}
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-gray-600">Par</span>
          <span className="text-sm font-bold text-gray-900">{par}</span>
        </div>
        {course.tees.length > 0 && (
          <div className="px-4 py-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase tracking-wide">
                  <th className="text-left font-semibold pb-2">Tee</th>
                  <th className="text-right font-semibold pb-2">Yardage</th>
                  <th className="text-right font-semibold pb-2">Slope</th>
                  <th className="text-right font-semibold pb-2">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[...course.tees]
                  .sort((a, b) => b.yardage - a.yardage)
                  .map(t => (
                    <tr key={t.name}>
                      <td className="py-2 font-semibold text-gray-900">{t.name}</td>
                      <td className="py-2 text-right text-gray-700 tabular-nums">{t.yardage.toLocaleString()}</td>
                      <td className="py-2 text-right text-gray-700 tabular-nums">{t.slope}</td>
                      <td className="py-2 text-right text-gray-700 tabular-nums">{t.rating.toFixed(1)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
        {course.website && (
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-gray-600">Website</span>
            <a href={course.website} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-golf-700 hover:underline">
              Visit
            </a>
          </div>
        )}
      </div>
    </Section>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function CourseDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params)
  const router = useRouter()

  const course = STUB_COURSE_DETAILS[courseId]
  const pin = STUB_PINS.find(p => p.courseId === courseId)
  const holeStats = STUB_USER_HOLE_STATS[courseId] ?? []
  const courseRounds = STUB_ALL_ROUNDS
    .filter(r => r.courseId === courseId)
    .sort((a, b) => b.date.localeCompare(a.date))

  // If no course detail found, show fallback from pin data
  const name = course?.courseName ?? pin?.courseName ?? 'Unknown Course'
  const location = course?.location ?? ''
  const par = course?.par ?? pin?.par ?? 72
  const avgUserRating = course?.avgUserRating ?? null
  const totalRatings = course?.totalRatings ?? 0
  const myRating = pin?.rating ?? null

  // Derive user stats from rounds
  const completedRounds = courseRounds.filter(r => r.grossTotal != null)
  const roundsPlayed = completedRounds.length
  const bestGross = completedRounds.length > 0 ? Math.min(...completedRounds.map(r => r.grossTotal!)) : null
  const avgGross = completedRounds.length > 0 ? completedRounds.reduce((s, r) => s + r.grossTotal!, 0) / completedRounds.length : null
  // Aggregate avg putts from hole stats
  const puttsHoles = holeStats.filter(h => h.avgPutts != null)
  const avgPutts = puttsHoles.length > 0 ? puttsHoles.reduce((s, h) => s + h.avgPutts!, 0) / puttsHoles.length : null

  // Aggregate FW% and GIR% from hole stats
  const fwHoles = holeStats.filter(h => h.fairwayPct != null)
  const avgFw = fwHoles.length > 0 ? Math.round(fwHoles.reduce((s, h) => s + h.fairwayPct!, 0) / fwHoles.length) : null
  const avgGir = holeStats.length > 0 ? Math.round(holeStats.reduce((s, h) => s + (h.girPct ?? 0), 0) / holeStats.length) : null

  // Scoring distribution from hole stats
  const eagles = holeStats.reduce((s, h) => s + h.eagles, 0)
  const birdies = holeStats.reduce((s, h) => s + h.birdies, 0)
  const pars = holeStats.reduce((s, h) => s + h.pars, 0)
  const bogeys = holeStats.reduce((s, h) => s + h.bogeys, 0)
  const doubles = holeStats.reduce((s, h) => s + h.doubles, 0)
  const maxScoring = Math.max(eagles, birdies, pars, bogeys, doubles, 1)

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <header className="bg-golf-800 px-4 pt-14 pb-6 text-white">
        <div className="mx-auto max-w-lg">
          <button
            onClick={() => router.back()}
            className="mb-3 inline-flex items-center gap-1 text-sm text-golf-300 hover:text-white transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Profile
          </button>
          <h1 className="text-2xl font-bold">{name}</h1>
          {location && <p className="text-sm text-golf-200 mt-0.5">{location}</p>}
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-4">
              {avgUserRating != null && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center bg-yellow-400 text-yellow-900 text-2xl font-black rounded-xl px-3 py-1.5">
                    {avgUserRating.toFixed(1)}
                  </span>
                  <span className="text-sm text-golf-200">{totalRatings} ratings</span>
                </div>
              )}
              {myRating != null ? (
                <span className="text-sm text-golf-200">Your rating: <span className="font-bold text-white">{myRating.toFixed(1)}</span></span>
              ) : (
                <span className="text-sm text-golf-300">Rate this course</span>
              )}
            </div>
            {(course?.conditionRating != null || course?.layoutRating != null || course?.valueRating != null) && (
              <div className="flex gap-3">
                {course?.conditionRating != null && (
                  <span className="text-xs bg-yellow-400/15 text-yellow-300 rounded-full px-2.5 py-0.5 font-semibold">
                    Condition {course.conditionRating.toFixed(1)}
                  </span>
                )}
                {course?.layoutRating != null && (
                  <span className="text-xs bg-yellow-400/15 text-yellow-300 rounded-full px-2.5 py-0.5 font-semibold">
                    Layout {course.layoutRating.toFixed(1)}
                  </span>
                )}
                {course?.valueRating != null && (
                  <span className="text-xs bg-yellow-400/15 text-yellow-300 rounded-full px-2.5 py-0.5 font-semibold">
                    Value {course.valueRating.toFixed(1)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-6 space-y-8">
        {/* Your Stats at This Course */}
        {roundsPlayed > 0 && (
          <Section title="Your Stats at This Course">
            <div className="grid grid-cols-3 gap-3">
              <StatTile label="Rounds" value={String(roundsPlayed)} />
              <StatTile label="Best Gross" value={bestGross != null ? String(bestGross) : '—'} />
              <StatTile label="Avg Gross" value={avgGross != null ? avgGross.toFixed(1) : '—'} />
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <StatTile label="FW%" value={avgFw != null ? `${avgFw}%` : '—'} />
              <StatTile label="GIR%" value={avgGir != null ? `${avgGir}%` : '—'} />
              <StatTile label="Avg Putts" value={avgPutts != null ? avgPutts.toFixed(1) : '—'} />
            </div>
          </Section>
        )}

        {/* Scoring Distribution */}
        {holeStats.length > 0 && (
          <Section title="Scoring Distribution">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 space-y-2">
              <ScoringBar label="Eagles" count={eagles} maxCount={maxScoring} color="bg-yellow-500" />
              <ScoringBar label="Birdies" count={birdies} maxCount={maxScoring} color="bg-red-500" />
              <ScoringBar label="Pars" count={pars} maxCount={maxScoring} color="bg-gray-400" />
              <ScoringBar label="Bogeys" count={bogeys} maxCount={maxScoring} color="bg-blue-500" />
              <ScoringBar label="Double+" count={doubles} maxCount={maxScoring} color="bg-blue-800" />
            </div>
          </Section>
        )}

        {/* 5 · Your Round History */}
        {courseRounds.length > 0 && (
          <Section title="Your Round History">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              {courseRounds.map(r => <RoundRow key={r.id} round={r} />)}
            </div>
          </Section>
        )}

        {/* 6 · Hole-by-Hole Breakdown */}
        {holeStats.length > 0 && (
          <Section title="Hole-by-Hole Breakdown">
            <HoleTable holes={holeStats} />
          </Section>
        )}

        {/* Course Info */}
        {course && (
          <CourseInfoSection course={course} location={location} par={par} />
        )}
      </div>
    </div>
  )
}
