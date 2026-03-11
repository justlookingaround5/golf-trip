'use client'

import type { ScorecardV2, HoleScoreV2 } from '@/lib/v2/types'

interface ScorecardViewerProps {
  scorecard: ScorecardV2
}

function scoreCellStyle(gross: number, par: number) {
  const diff = gross - par
  if (diff <= -2) return { text: 'text-yellow-600 font-bold', ring: 'ring-2 ring-yellow-400 rounded-full' }
  if (diff === -1) return { text: 'text-red-600 font-bold',    ring: 'ring-2 ring-red-400 rounded-full'    }
  if (diff === 0)  return { text: 'text-gray-700',             ring: ''                                    }
  if (diff === 1)  return { text: 'text-blue-600',             ring: 'ring-1 ring-blue-400'               }
  return               { text: 'text-blue-800 font-bold',   ring: 'ring-2 ring-blue-500'               }
}

function subtotal(holes: HoleScoreV2[], start: number, end: number, field: 'gross' | 'par') {
  return holes
    .filter(h => h.holeNumber >= start && h.holeNumber <= end)
    .reduce((s, h) => s + (field === 'gross' ? (h.gross ?? 0) : h.par), 0)
}

export default function ScorecardViewer({ scorecard }: ScorecardViewerProps) {
  const holes = scorecard.players[0]?.holes ?? []
  const frontHoles = holes.filter(h => h.holeNumber <= 9)
  const backHoles  = holes.filter(h => h.holeNumber > 9)
  const frontPar   = frontHoles.reduce((s, h) => s + h.par, 0)
  const backPar    = backHoles.reduce((s, h) => s + h.par, 0)
  const showBack   = backHoles.length > 0

  return (
    <div className="space-y-3">
      {/* Meta */}
      <div className="px-1">
        <p className="text-sm font-bold text-gray-900">{scorecard.courseName}</p>
        <p className="text-xs text-gray-500">
          {scorecard.roundNumber ? `Round ${scorecard.roundNumber} · ` : ''}
          {new Date(scorecard.date + 'T12:00:00').toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
          })}
          {' · '}Par {scorecard.par}
        </p>
      </div>

      {/* Scrollable table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="bg-golf-800 text-white">
              <th className="sticky left-0 z-10 bg-golf-800 px-3 py-2 text-left font-semibold min-w-[76px]">
                Hole
              </th>
              {holes.map(h => (
                <th key={h.holeId} className="px-2 py-2 text-center font-semibold w-8">
                  {h.holeNumber}
                </th>
              ))}
              {frontHoles.length > 0 && <th className="px-2 py-2 text-center font-semibold w-10 bg-golf-900">Out</th>}
              {showBack  && <th className="px-2 py-2 text-center font-semibold w-10 bg-golf-900">In</th>}
              <th className="px-2 py-2 text-center font-semibold w-10 bg-golf-900">Tot</th>
            </tr>

            {/* Par row */}
            <tr className="bg-gray-100 text-gray-600">
              <td className="sticky left-0 z-10 bg-gray-100 px-3 py-1.5 font-semibold">Par</td>
              {holes.map(h => (
                <td key={h.holeId} className="px-2 py-1.5 text-center font-medium">{h.par}</td>
              ))}
              {frontHoles.length > 0 && <td className="px-2 py-1.5 text-center font-semibold bg-gray-200">{frontPar}</td>}
              {showBack  && <td className="px-2 py-1.5 text-center font-semibold bg-gray-200">{backPar}</td>}
              <td className="px-2 py-1.5 text-center font-semibold bg-gray-200">{frontPar + backPar}</td>
            </tr>

            {/* HCP row */}
            <tr className="bg-gray-50 text-gray-400">
              <td className="sticky left-0 z-10 bg-gray-50 px-3 py-1 font-medium text-[10px]">HCP</td>
              {holes.map(h => (
                <td key={h.holeId} className="px-2 py-1 text-center text-[10px]">
                  {h.handicapIndex ?? '—'}
                </td>
              ))}
              <td className="bg-gray-50" colSpan={showBack ? 3 : 2} />
            </tr>
          </thead>

          <tbody>
            {scorecard.players.map(({ player, holes: ph, grossTotal, netTotal }, idx) => {
              const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
              const frontGross = subtotal(ph, 1, 9, 'gross')
              const backGross  = subtotal(ph, 10, 18, 'gross')

              return (
                <tr key={player.id} className={rowBg}>
                  <td className={`sticky left-0 z-10 px-3 py-2 font-semibold text-gray-900 truncate max-w-[76px] ${rowBg}`}>
                    {player.name}
                  </td>
                  {ph.map(h => {
                    if (h.gross == null) {
                      return <td key={h.holeId} className="px-2 py-2 text-center text-gray-300">—</td>
                    }
                    const { text, ring } = scoreCellStyle(h.gross, h.par)
                    return (
                      <td key={h.holeId} className="px-2 py-2 text-center">
                        <span className={`inline-flex h-6 w-6 items-center justify-center font-semibold ${text} ${ring}`}>
                          {h.gross}
                        </span>
                      </td>
                    )
                  })}
                  {frontHoles.length > 0 && (
                    <td className="px-2 py-2 text-center font-semibold text-gray-700 bg-gray-100">
                      {frontGross || '—'}
                    </td>
                  )}
                  {showBack && (
                    <td className="px-2 py-2 text-center font-semibold text-gray-700 bg-gray-100">
                      {backGross || '—'}
                    </td>
                  )}
                  <td className="px-2 py-2 text-center font-bold text-gray-900 bg-gray-100">
                    {grossTotal ?? '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-500 px-1">
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
  )
}
