'use client'

import type { ScorecardV2, ScorecardPlayerV2 } from '@/lib/v2/types'

interface ScorecardViewerProps {
  scorecard: ScorecardV2
}

function ScoreCell({ gross, par }: { gross: number | null | undefined; par: number }) {
  if (gross == null) return <span className="text-xs text-gray-300">—</span>
  const diff = gross - par
  if (diff <= -2) return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full ring-2 ring-yellow-400 text-yellow-600 font-bold text-xs">{gross}</span>
  )
  if (diff === -1) return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full ring-2 ring-red-400 text-red-600 font-bold text-xs">{gross}</span>
  )
  if (diff === 0) return <span className="text-xs font-medium text-gray-700">{gross}</span>
  if (diff === 1) return (
    <span className="inline-flex h-7 w-7 items-center justify-center ring-1 ring-blue-400 text-blue-600 text-xs">{gross}</span>
  )
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center ring-2 ring-blue-500 text-blue-800 font-bold text-xs">{gross}</span>
  )
}

function SubtotalRow({
  label,
  players,
  start,
  end,
}: {
  label: string
  players: ScorecardPlayerV2[]
  start: number
  end: number
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-gray-100">
      <div className="w-16 shrink-0">
        <p className="text-xs font-bold text-gray-600">{label}</p>
      </div>
      <div className="flex-1 flex items-center">
        {players.map(({ player, holes }) => {
          const total = holes
            .filter(h => h.holeNumber >= start && h.holeNumber <= end)
            .reduce((s, h) => s + (h.gross ?? 0), 0)
          return (
            <div key={player.id} className="flex-1 text-center text-xs font-bold text-gray-700">
              {total || '—'}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ScorecardViewer({ scorecard }: ScorecardViewerProps) {
  const players = scorecard.players
  const allHoles = players[0]?.holes ?? []
  const frontHoles = allHoles.filter(h => h.holeNumber <= 9)
  const backHoles  = allHoles.filter(h => h.holeNumber > 9)
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

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Player name header */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-golf-800">
          <div className="w-16 shrink-0" />
          <div className="flex-1 flex items-center">
            {players.map(({ player }) => (
              <div key={player.id} className="flex-1 text-center text-[11px] font-semibold text-golf-200 truncate">
                {player.name.split(' ')[0]}
              </div>
            ))}
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {/* Front 9 */}
          {frontHoles.map((refHole, idx) => (
            <div
              key={refHole.holeId}
              className={`flex items-center gap-3 px-4 py-2 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
            >
              <div className="w-16 shrink-0">
                <p className="text-sm font-bold text-gray-900 leading-tight">{refHole.holeNumber}</p>
                <p className="text-[10px] text-gray-400 leading-tight">
                  Par {refHole.par}{refHole.handicapIndex != null ? ` · ${refHole.handicapIndex}` : ''}
                </p>
              </div>
              <div className="flex-1 flex items-center">
                {players.map(({ player, holes }) => {
                  const h = holes.find(x => x.holeNumber === refHole.holeNumber)
                  return (
                    <div key={player.id} className="flex-1 flex justify-center">
                      <ScoreCell gross={h?.gross} par={refHole.par} />
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Out subtotal */}
          {frontHoles.length > 0 && (
            <SubtotalRow label="Out" players={players} start={1} end={9} />
          )}

          {/* Back 9 */}
          {showBack && backHoles.map((refHole, idx) => (
            <div
              key={refHole.holeId}
              className={`flex items-center gap-3 px-4 py-2 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
            >
              <div className="w-16 shrink-0">
                <p className="text-sm font-bold text-gray-900 leading-tight">{refHole.holeNumber}</p>
                <p className="text-[10px] text-gray-400 leading-tight">
                  Par {refHole.par}{refHole.handicapIndex != null ? ` · ${refHole.handicapIndex}` : ''}
                </p>
              </div>
              <div className="flex-1 flex items-center">
                {players.map(({ player, holes }) => {
                  const h = holes.find(x => x.holeNumber === refHole.holeNumber)
                  return (
                    <div key={player.id} className="flex-1 flex justify-center">
                      <ScoreCell gross={h?.gross} par={refHole.par} />
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {/* In subtotal */}
          {showBack && (
            <SubtotalRow label="In" players={players} start={10} end={18} />
          )}

          {/* Total row */}
          <div className="flex items-center gap-3 px-4 py-2.5 bg-golf-800">
            <div className="w-16 shrink-0">
              <p className="text-xs font-bold text-white">Total</p>
            </div>
            <div className="flex-1 flex items-center">
              {players.map(({ player, grossTotal }) => (
                <div key={player.id} className="flex-1 text-center text-sm font-black text-white">
                  {grossTotal ?? '—'}
                </div>
              ))}
            </div>
          </div>
        </div>
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
