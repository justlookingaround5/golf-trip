'use client'

// COURSE DETAIL PAGE
// Sections: Header · Photos · Your Stats · Scoring Distribution · Round History
//           · Hole-by-Hole · Friends' Ratings · Course Info

import { use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  STUB_COURSE_DETAILS,
  STUB_FRIEND_COURSE_RATINGS,
  STUB_USER_HOLE_STATS,
  STUB_ALL_ROUNDS,
  STUB_PINS,
} from '@/lib/v2/stub-data'
import type { RoundV2, UserHoleStatsV2, FriendCourseRatingV2 } from '@/lib/v2/types'

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

function HoleTable({ holes }: { holes: UserHoleStatsV2[] }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-3 py-2 text-left font-semibold text-gray-500">Hole</th>
              <th className="px-2 py-2 text-center font-semibold text-gray-500">Par</th>
              <th className="px-2 py-2 text-center font-semibold text-gray-500">Avg</th>
              <th className="px-2 py-2 text-center font-semibold text-gray-500">Best</th>
              <th className="px-2 py-2 text-center font-semibold text-gray-500">FW%</th>
              <th className="px-2 py-2 text-center font-semibold text-gray-500">GIR%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {holes.map(h => {
              const diff = h.avgGross - h.par
              const diffColor = diff >= 0.8 ? 'text-red-600 bg-red-50' : diff <= 0.1 ? 'text-green-700 bg-green-50' : 'text-gray-900'
              return (
                <tr key={h.holeNumber}>
                  <td className="px-3 py-2 font-bold text-gray-900">{h.holeNumber}</td>
                  <td className="px-2 py-2 text-center text-gray-600">{h.par}</td>
                  <td className={`px-2 py-2 text-center font-bold tabular-nums ${diffColor}`}>{h.avgGross.toFixed(1)}</td>
                  <td className="px-2 py-2 text-center tabular-nums text-gray-800">{h.bestGross}</td>
                  <td className="px-2 py-2 text-center tabular-nums text-gray-600">{h.fairwayPct != null ? `${h.fairwayPct}` : '—'}</td>
                  <td className="px-2 py-2 text-center tabular-nums text-gray-600">{h.girPct != null ? `${h.girPct}` : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Friend row ──────────────────────────────────────────────────────────────

function FriendRow({ fr }: { fr: FriendCourseRatingV2 }) {
  const inner = (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-golf-100 text-sm font-bold text-golf-700 shrink-0">
        {fr.player.name[0]?.toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900 truncate">{fr.player.name}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {fr.lastPlayed
            ? `Last played ${new Date(fr.lastPlayed + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
            : 'No date'}
          {fr.bestGross != null && <> · Best: {fr.bestGross}</>}
        </p>
      </div>
      {fr.rating != null && (
        <span className="shrink-0 ml-3 text-sm font-bold text-gray-900 tabular-nums">{fr.rating.toFixed(1)}</span>
      )}
      {fr.roundId && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-gray-300 shrink-0">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      )}
    </div>
  )

  if (fr.roundId) {
    return <Link href={`/v2/profile/${fr.player.id}/round/${fr.roundId}`}>{inner}</Link>
  }
  return <div>{inner}</div>
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function CourseDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params)
  const router = useRouter()

  const course = STUB_COURSE_DETAILS[courseId]
  const pin = STUB_PINS.find(p => p.courseId === courseId)
  const friendRatings = STUB_FRIEND_COURSE_RATINGS[courseId] ?? []
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
  const avgNet = completedRounds.filter(r => r.netTotal != null).length > 0
    ? completedRounds.filter(r => r.netTotal != null).reduce((s, r) => s + r.netTotal!, 0) / completedRounds.filter(r => r.netTotal != null).length
    : null

  // Aggregate FW% and GIR% from hole stats
  const fwHoles = holeStats.filter(h => h.fairwayPct != null)
  const avgFw = fwHoles.length > 0 ? Math.round(fwHoles.reduce((s, h) => s + h.fairwayPct!, 0) / fwHoles.length) : null
  const avgGir = holeStats.length > 0 ? Math.round(holeStats.reduce((s, h) => s + (h.girPct ?? 0), 0) / holeStats.length) : null

  // Scoring distribution from hole stats
  const eagles = holeStats.reduce((s, h) => s + Math.max(0, h.birdies - (h.avgGross < h.par ? 1 : 0)), 0) // approximate
  const birdies = holeStats.reduce((s, h) => s + h.birdies, 0)
  const pars = holeStats.reduce((s, h) => s + h.pars, 0)
  const bogeys = holeStats.reduce((s, h) => s + h.bogeys, 0)
  const doubles = holeStats.reduce((s, h) => s + h.doubles, 0)
  const maxScoring = Math.max(birdies, pars, bogeys, doubles, 1)

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
          <div className="flex items-center gap-4 mt-3">
            {avgUserRating != null && (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center bg-yellow-400 text-yellow-900 text-sm font-black rounded-lg px-2 py-0.5">
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
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-6 space-y-8">
        {/* 2 · Course Photos */}
        {course && course.photoUrls.length > 0 && (
          <Section title="Photos">
            <div className="overflow-x-auto flex gap-2 -mx-4 px-4 pb-2">
              {course.photoUrls.map((url, i) => (
                <div key={i} className="shrink-0 w-56 h-36 rounded-xl bg-gray-200 overflow-hidden border border-gray-100">
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                    Course Photo {i + 1}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* 3 · Your Stats at This Course */}
        {roundsPlayed > 0 && (
          <Section title="Your Stats at This Course">
            <div className="grid grid-cols-3 gap-3">
              <StatTile label="Rounds" value={String(roundsPlayed)} />
              <StatTile label="Best Gross" value={bestGross != null ? String(bestGross) : '—'} />
              <StatTile label="Avg Gross" value={avgGross != null ? avgGross.toFixed(1) : '—'} />
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <StatTile label="Avg Net" value={avgNet != null ? avgNet.toFixed(1) : '—'} />
              <StatTile label="FW%" value={avgFw != null ? `${avgFw}%` : '—'} />
              <StatTile label="GIR%" value={avgGir != null ? `${avgGir}%` : '—'} />
            </div>
          </Section>
        )}

        {/* 4 · Scoring Distribution */}
        {holeStats.length > 0 && (
          <Section title="Scoring Distribution">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 space-y-2">
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

        {/* 7 · Friends' Ratings & Scores */}
        <Section title="Friends' Ratings & Scores">
          {friendRatings.length > 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              {friendRatings.map(fr => <FriendRow key={fr.player.id} fr={fr} />)}
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-6 text-center">
              <p className="text-sm text-gray-400">None of your friends have played here yet</p>
            </div>
          )}
        </Section>

        {/* 8 · Course Info */}
        {course && (
          <Section title="Course Info">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden divide-y divide-gray-100">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-gray-600">Par</span>
                <span className="text-sm font-bold text-gray-900">{par}</span>
              </div>
              {course.slope != null && (
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-gray-600">Slope</span>
                  <span className="text-sm font-bold text-gray-900">{course.slope}</span>
                </div>
              )}
              {course.courseRating != null && (
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-gray-600">USGA Rating</span>
                  <span className="text-sm font-bold text-gray-900">{course.courseRating}</span>
                </div>
              )}
              {course.tees.length > 0 && (
                <div className="px-4 py-3">
                  <p className="text-sm text-gray-600 mb-2">Tees</p>
                  <div className="flex flex-wrap gap-2">
                    {course.tees.map(t => (
                      <span key={t.name} className="inline-flex items-center gap-1 text-xs font-semibold bg-gray-100 text-gray-700 rounded-full px-2.5 py-1">
                        {t.name} · {t.yardage.toLocaleString()} yds
                      </span>
                    ))}
                  </div>
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
              {course.phone && (
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-gray-600">Phone</span>
                  <a href={`tel:${course.phone}`} className="text-sm font-semibold text-golf-700">{course.phone}</a>
                </div>
              )}
              <div className="px-4 py-3">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${course.latitude},${course.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-golf-700 hover:underline"
                >
                  View on Google Maps
                </a>
              </div>
            </div>
          </Section>
        )}
      </div>
    </div>
  )
}
