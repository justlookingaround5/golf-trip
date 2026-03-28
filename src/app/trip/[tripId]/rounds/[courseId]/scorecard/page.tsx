import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'

export default async function RoundScorecardPage({
  params,
}: {
  params: Promise<{ tripId: string; courseId: string }>
}) {
  const { tripId, courseId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const [{ data: course }, { data: trip }] = await Promise.all([
    supabase.from('courses').select('id, name, par, round_number, round_date').eq('id', courseId).single(),
    supabase.from('trips').select('name').eq('id', tripId).single(),
  ])

  if (!course || !trip) notFound()

  // Fetch holes ordered
  const { data: holes } = await supabase
    .from('holes')
    .select('id, hole_number, par, handicap_index')
    .eq('course_id', courseId)
    .order('hole_number')

  if (!holes || holes.length === 0) notFound()

  // Fetch trip players with player names and display names
  const { data: tripPlayers } = await supabase
    .from('trip_players')
    .select('id, player:players(id, name, user_id)')
    .eq('trip_id', tripId)

  // Resolve display names from player_profiles
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerUserIds = (tripPlayers || [])
    .map((tp) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = Array.isArray(tp.player) ? tp.player[0] : tp.player as any
      return p?.user_id as string | undefined
    })
    .filter(Boolean) as string[]

  const displayNameMap = new Map<string, string>()
  if (playerUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from('player_profiles')
      .select('user_id, display_name')
      .in('user_id', playerUserIds)
    for (const p of profiles || []) {
      if (p.display_name) displayNameMap.set(p.user_id, p.display_name)
    }
  }

  // Build player list
  const players = (tripPlayers || []).map((tp) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = Array.isArray(tp.player) ? tp.player[0] : tp.player as any
    const userId = p?.user_id as string | undefined
    const fallbackName = (p?.name as string) || 'Unknown'
    const displayName = ((userId ? displayNameMap.get(userId) : undefined) || fallbackName).split(' ')[0]
    return { tripPlayerId: tp.id, displayName }
  })

  // Fetch all round_scores for this course
  const { data: roundScores } = await supabase
    .from('round_scores')
    .select('trip_player_id, hole_id, gross_score, fairway_hit, gir, putts')
    .eq('course_id', courseId)

  // Build score lookup: tripPlayerId → holeId → score
  const scoreMap = new Map<string, Map<string, { gross: number; fairway: boolean | null; gir: boolean | null; putts: number | null }>>()
  for (const s of roundScores || []) {
    if (!scoreMap.has(s.trip_player_id)) scoreMap.set(s.trip_player_id, new Map())
    scoreMap.get(s.trip_player_id)!.set(s.hole_id, {
      gross: s.gross_score,
      fairway: s.fairway_hit,
      gir: s.gir,
      putts: s.putts,
    })
  }

  // Compute totals
  const frontHoles = holes.filter((h) => h.hole_number <= 9)
  const backHoles = holes.filter((h) => h.hole_number > 9)
  const frontPar = frontHoles.reduce((s, h) => s + h.par, 0)
  const backPar = backHoles.reduce((s, h) => s + h.par, 0)

  const playerTotals = players.map(({ tripPlayerId, displayName }) => {
    const pScores = scoreMap.get(tripPlayerId) ?? new Map()
    let frontGross = 0
    let backGross = 0
    let hasFront = false
    let hasBack = false

    for (const h of holes) {
      const s = pScores.get(h.id)
      if (!s) continue
      if (h.hole_number <= 9) { frontGross += s.gross; hasFront = true }
      else { backGross += s.gross; hasBack = true }
    }

    return {
      tripPlayerId,
      displayName,
      frontGross: hasFront ? frontGross : null,
      backGross: hasBack ? backGross : null,
      totalGross: hasFront || hasBack ? frontGross + backGross : null,
    }
  })

  const roundDate = course.round_date
    ? new Date(course.round_date + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric',
      })
    : null

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <header className="bg-golf-800 px-4 py-6 text-white">
        <div className="mx-auto max-w-2xl">
          <Link
            href={`/profile/${user.id}`}
            className="mb-3 inline-flex items-center gap-1 text-sm text-golf-300 hover:text-white"
          >
            &larr; Profile
          </Link>
          <h1 className="text-xl font-bold">{course.name}</h1>
          <p className="text-sm text-golf-200 mt-0.5">
            {trip.name} · Round {course.round_number}
            {roundDate && ` · ${roundDate}`}
          </p>
          <p className="text-sm text-golf-300 mt-0.5">Par {course.par}</p>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-2 py-5">
        {/* Scrollable scorecard */}
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="bg-golf-800 text-white">
                <th className="sticky left-0 z-10 bg-golf-800 px-3 py-2 text-left font-semibold min-w-[90px]">
                  Hole
                </th>
                {holes.map((h) => (
                  <th key={h.id} className="px-2 py-2 text-center font-semibold w-8">
                    {h.hole_number}
                  </th>
                ))}
                {frontHoles.length > 0 && (
                  <th className="px-2 py-2 text-center font-semibold w-10 bg-golf-900">Out</th>
                )}
                {backHoles.length > 0 && (
                  <th className="px-2 py-2 text-center font-semibold w-10 bg-golf-900">In</th>
                )}
                <th className="px-2 py-2 text-center font-semibold w-10 bg-golf-900">Tot</th>
              </tr>
              {/* Par row */}
              <tr className="bg-gray-100 text-gray-600">
                <td className="sticky left-0 z-10 bg-gray-100 px-3 py-1.5 font-semibold">Par</td>
                {holes.map((h) => (
                  <td key={h.id} className="px-2 py-1.5 text-center font-medium">{h.par}</td>
                ))}
                {frontHoles.length > 0 && (
                  <td className="px-2 py-1.5 text-center font-semibold bg-gray-200">{frontPar}</td>
                )}
                {backHoles.length > 0 && (
                  <td className="px-2 py-1.5 text-center font-semibold bg-gray-200">{backPar}</td>
                )}
                <td className="px-2 py-1.5 text-center font-semibold bg-gray-200">{frontPar + backPar}</td>
              </tr>
            </thead>
            <tbody>
              {players.map(({ tripPlayerId, displayName }, idx) => {
                const pScores = scoreMap.get(tripPlayerId) ?? new Map()
                const totals = playerTotals[idx]
                return (
                  <tr key={tripPlayerId} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className={`sticky left-0 z-10 px-3 py-2 font-semibold text-gray-900 truncate max-w-[90px] ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      {displayName}
                    </td>
                    {holes.map((h) => {
                      const s = pScores.get(h.id)
                      if (!s) {
                        return <td key={h.id} className="px-2 py-2 text-center text-gray-300">—</td>
                      }
                      const diff = s.gross - h.par
                      let cellClass = 'text-gray-900'
                      let borderClass = ''
                      if (diff <= -2) { cellClass = 'text-yellow-600 font-bold'; borderClass = 'ring-2 ring-yellow-400 rounded-full' }
                      else if (diff === -1) { cellClass = 'text-red-600 font-bold'; borderClass = 'ring-2 ring-red-400 rounded-full' }
                      else if (diff === 1) { cellClass = 'text-blue-600'; borderClass = 'ring-1 ring-blue-400' }
                      else if (diff >= 2) { cellClass = 'text-blue-800'; borderClass = 'ring-2 ring-blue-500' }
                      return (
                        <td key={h.id} className="px-2 py-2 text-center">
                          <span className={`inline-flex items-center justify-center h-6 w-6 text-xs font-semibold ${cellClass} ${borderClass}`}>
                            {s.gross}
                          </span>
                        </td>
                      )
                    })}
                    <td className="px-2 py-2 text-center font-semibold text-gray-700 bg-gray-100">
                      {totals.frontGross ?? '—'}
                    </td>
                    <td className="px-2 py-2 text-center font-semibold text-gray-700 bg-gray-100">
                      {totals.backGross ?? '—'}
                    </td>
                    <td className="px-2 py-2 text-center font-bold text-gray-900 bg-gray-100">
                      {totals.totalGross ?? '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Score legend */}
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-500 px-1">
          <span className="flex items-center gap-1.5">
            <span className="inline-flex h-5 w-5 items-center justify-center ring-2 ring-yellow-400 rounded-full text-yellow-600 font-bold text-[10px]">3</span>
            Eagle or better
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-flex h-5 w-5 items-center justify-center ring-2 ring-red-400 rounded-full text-red-600 font-bold text-[10px]">3</span>
            Birdie
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-flex h-5 w-5 items-center justify-center ring-1 ring-blue-400 text-blue-600 text-[10px]">5</span>
            Bogey
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-flex h-5 w-5 items-center justify-center ring-2 ring-blue-500 text-blue-800 font-bold text-[10px]">6</span>
            Double+
          </span>
        </div>
      </div>
    </div>
  )
}
